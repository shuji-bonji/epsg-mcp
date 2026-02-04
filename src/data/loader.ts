/**
 * CRSデータローダー
 * JSONファイルをメモリにロードし、高速検索用のインデックスを構築
 */

import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DataLoadError } from '../errors/index.js';
import { findCrsInPacks } from '../packs/pack-manager.js';
import type {
	BestPracticesData,
	ComparisonsData,
	CrsDetail,
	CrsInfo,
	GlobalCrsData,
	JapanCrsData,
	RecommendationsData,
	TransformationsData,
	TroubleshootingData,
} from '../types/index.js';
import { debug } from '../utils/logger.js';
import { findCrsBySqlite, isSqliteAvailable } from './sqlite-loader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const STATIC_DIR = join(__dirname, 'static');

/**
 * Get the current language setting
 * Default: 'en' (English) for international users
 * Set EPSG_LANG=ja for Japanese
 */
function getLanguage(): 'en' | 'ja' {
	const lang = process.env.EPSG_LANG?.toLowerCase();
	if (lang === 'ja' || lang === 'japanese') {
		return 'ja';
	}
	return 'en'; // Default to English
}

/**
 * Get the path for a localized file
 * English files are in 'en/' subdirectory
 * Japanese files are in the root (original location for backward compatibility)
 */
function getLocalizedPath(filename: string): string {
	const lang = getLanguage();
	if (lang === 'en') {
		return join('en', filename);
	}
	return filename; // Japanese files in root
}

let japanCrsData: JapanCrsData | null = null;
let globalCrsData: GlobalCrsData | null = null;
let recommendationsData: RecommendationsData | null = null;
let transformationsData: TransformationsData | null = null;
let comparisonsData: ComparisonsData | null = null;
let bestPracticesData: BestPracticesData | null = null;
let troubleshootingData: TroubleshootingData | null = null;

let crsIndex: Map<string, CrsDetail> | null = null;
let regionIndex: Map<string, CrsInfo[]> | null = null;
let nameTokenIndex: Map<string, Set<string>> | null = null; // token → EPSG codes

async function loadJsonFile<T>(filename: string): Promise<T> {
	const filepath = join(STATIC_DIR, filename);
	try {
		const content = await readFile(filepath, 'utf-8');
		return JSON.parse(content) as T;
	} catch (error) {
		throw new DataLoadError(filename, error instanceof Error ? error : undefined);
	}
}

export async function loadJapanCrs(): Promise<JapanCrsData> {
	if (!japanCrsData) {
		japanCrsData = await loadJsonFile<JapanCrsData>('japan-crs.json');
		debug('Loaded japan-crs.json');
	}
	return japanCrsData;
}

export async function loadGlobalCrs(): Promise<GlobalCrsData> {
	if (!globalCrsData) {
		globalCrsData = await loadJsonFile<GlobalCrsData>('global-crs.json');
		debug('Loaded global-crs.json');
	}
	return globalCrsData;
}

export async function loadRecommendations(): Promise<RecommendationsData> {
	if (!recommendationsData) {
		const localizedPath = getLocalizedPath('recommendations.json');
		recommendationsData = await loadJsonFile<RecommendationsData>(localizedPath);
		debug(`Loaded ${localizedPath}`);
	}
	return recommendationsData;
}

export async function loadTransformations(): Promise<TransformationsData> {
	if (!transformationsData) {
		transformationsData = await loadJsonFile<TransformationsData>('transformations.json');
		debug('Loaded transformations.json');
	}
	return transformationsData;
}

export async function loadComparisons(): Promise<ComparisonsData> {
	if (!comparisonsData) {
		comparisonsData = await loadJsonFile<ComparisonsData>('comparisons.json');
		debug('Loaded comparisons.json');
	}
	return comparisonsData;
}

export async function loadBestPractices(): Promise<BestPracticesData> {
	if (!bestPracticesData) {
		const localizedPath = getLocalizedPath('best-practices.json');
		bestPracticesData = await loadJsonFile<BestPracticesData>(localizedPath);
		debug(`Loaded ${localizedPath}`);
	}
	return bestPracticesData;
}

export async function loadTroubleshooting(): Promise<TroubleshootingData> {
	if (!troubleshootingData) {
		const localizedPath = getLocalizedPath('troubleshooting.json');
		troubleshootingData = await loadJsonFile<TroubleshootingData>(localizedPath);
		debug(`Loaded ${localizedPath}`);
	}
	return troubleshootingData;
}

function normalizeCode(code: string): string {
	return code.replace(/^EPSG:/i, '').trim();
}

function normalizeRegion(region: string): string {
	return region.toLowerCase();
}

/**
 * テキストをトークンに分割（検索インデックス用）
 */
function tokenize(text: string): string[] {
	return text
		.toLowerCase()
		.split(/[\s\-_/()（）]+/)
		.filter((t) => t.length > 1);
}

/**
 * CRSをトークンインデックスに追加
 */
function addToNameIndex(crs: CrsDetail): void {
	if (!nameTokenIndex) return;

	const code = normalizeCode(crs.code);
	const tokens = new Set<string>();

	// 名前のトークン
	for (const t of tokenize(crs.name)) {
		tokens.add(t);
	}

	// 備考のトークン
	if (crs.remarks) {
		for (const t of tokenize(crs.remarks)) {
			tokens.add(t);
		}
	}

	// 都道府県のトークン
	if (crs.areaOfUse?.prefectures) {
		for (const p of crs.areaOfUse.prefectures) {
			tokens.add(p.toLowerCase());
		}
	}

	// 各トークンからCRSコードへの逆引きマップを構築
	for (const token of tokens) {
		if (!nameTokenIndex.has(token)) {
			nameTokenIndex.set(token, new Set());
		}
		nameTokenIndex.get(token)!.add(code);
	}
}

function addToRegionIndex(region: string, crs: CrsDetail): void {
	if (!regionIndex) return;
	const normalizedRegion = normalizeRegion(region);
	const list = regionIndex.get(normalizedRegion) || [];
	list.push({
		code: crs.code,
		name: crs.name,
		type: crs.type,
		region,
		deprecated: crs.deprecated,
		description: crs.remarks,
	});
	regionIndex.set(normalizedRegion, list);
}

/**
 * CRSデータをインデックスに追加するヘルパー関数
 */
function indexCrsData(crsDict: Record<string, CrsDetail>, region: string): void {
	for (const crs of Object.values(crsDict)) {
		crsIndex?.set(normalizeCode(crs.code), crs);
		addToRegionIndex(region, crs);
		addToNameIndex(crs);
	}
}

async function buildCrsIndex(): Promise<void> {
	if (crsIndex) return;

	crsIndex = new Map();
	regionIndex = new Map();
	nameTokenIndex = new Map();

	const [japan, global] = await Promise.all([loadJapanCrs(), loadGlobalCrs()]);

	// 日本のCRSをインデックスに追加
	indexCrsData(japan.geographicCRS, 'Japan');
	indexCrsData(japan.projectedCRS, 'Japan');

	// グローバルのCRSをインデックスに追加
	indexCrsData(global.geographicCRS, 'Global');
	indexCrsData(global.projectedCRS, 'Global');

	debug(`CRS index built: ${crsIndex.size} entries, ${nameTokenIndex.size} tokens`);
}

export async function findCrsById(code: string): Promise<CrsDetail | undefined> {
	await buildCrsIndex();

	// First try in-memory index (static Japan/Global data)
	const cached = crsIndex?.get(normalizeCode(code));
	if (cached) {
		return cached;
	}

	// Try Country Packs (US, UK, etc.)
	const packResult = await findCrsInPacks(code);
	if (packResult) {
		return packResult.crs;
	}

	// Fallback to SQLite if available
	if (isSqliteAvailable()) {
		return findCrsBySqlite(code);
	}

	return undefined;
}

export async function getCrsByRegion(region: string): Promise<CrsInfo[]> {
	await buildCrsIndex();
	return regionIndex?.get(normalizeRegion(region)) || [];
}

export async function getAllCrs(): Promise<CrsDetail[]> {
	await buildCrsIndex();
	return crsIndex ? Array.from(crsIndex.values()) : [];
}

/**
 * トークンに一致するCRSコードを検索
 * 複数トークンの場合、すべてに一致するコードを返す
 */
export async function searchByTokens(tokens: string[]): Promise<string[]> {
	await buildCrsIndex();
	if (!nameTokenIndex || tokens.length === 0) return [];

	const lowerTokens = tokens.map((t) => t.toLowerCase());

	// 最初のトークンに一致するコードを取得
	const firstMatches = nameTokenIndex.get(lowerTokens[0]);
	if (!firstMatches) return [];

	// 1トークンのみの場合はそのまま返す
	if (lowerTokens.length === 1) {
		return Array.from(firstMatches);
	}

	// 複数トークンの場合、すべてのトークンに一致するコードのみを返す
	const result: string[] = [];
	for (const code of firstMatches) {
		let matchesAll = true;
		for (let i = 1; i < lowerTokens.length; i++) {
			const tokenMatches = nameTokenIndex.get(lowerTokens[i]);
			if (!tokenMatches || !tokenMatches.has(code)) {
				matchesAll = false;
				break;
			}
		}
		if (matchesAll) {
			result.push(code);
		}
	}

	return result;
}

export async function getZoneMapping(): Promise<
	Record<string, { zone: string; code: string; notes?: string }>
> {
	const japan = await loadJapanCrs();
	return japan.zoneMapping;
}

export async function preloadAll(): Promise<void> {
	await Promise.all([
		loadJapanCrs(),
		loadGlobalCrs(),
		loadRecommendations(),
		loadTransformations(),
		loadComparisons(),
		loadBestPractices(),
		loadTroubleshooting(),
	]);
	await buildCrsIndex();
}

export function clearCache(): void {
	japanCrsData = null;
	globalCrsData = null;
	recommendationsData = null;
	transformationsData = null;
	comparisonsData = null;
	bestPracticesData = null;
	troubleshootingData = null;
	crsIndex = null;
	regionIndex = null;
	nameTokenIndex = null;
	debug('Cache cleared');
}
