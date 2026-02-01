/**
 * CRSデータローダー
 * JSONファイルをメモリにロードし、高速検索用のインデックスを構築
 */

import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DataLoadError } from '../errors/index.js';
import type {
	CrsDetail,
	CrsInfo,
	GlobalCrsData,
	JapanCrsData,
	RecommendationsData,
} from '../types/index.js';
import { debug } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const STATIC_DIR = join(__dirname, 'static');

let japanCrsData: JapanCrsData | null = null;
let globalCrsData: GlobalCrsData | null = null;
let recommendationsData: RecommendationsData | null = null;

let crsIndex: Map<string, CrsDetail> | null = null;
let regionIndex: Map<string, CrsInfo[]> | null = null;

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
		recommendationsData = await loadJsonFile<RecommendationsData>('recommendations.json');
		debug('Loaded recommendations.json');
	}
	return recommendationsData;
}

function normalizeCode(code: string): string {
	return code.replace(/^EPSG:/i, '').trim();
}

function normalizeRegion(region: string): string {
	return region.toLowerCase();
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

async function buildCrsIndex(): Promise<void> {
	if (crsIndex) return;

	crsIndex = new Map();
	regionIndex = new Map();

	const [japan, global] = await Promise.all([loadJapanCrs(), loadGlobalCrs()]);

	for (const crs of Object.values(japan.geographicCRS)) {
		crsIndex.set(normalizeCode(crs.code), crs);
		addToRegionIndex('Japan', crs);
	}
	for (const crs of Object.values(japan.projectedCRS)) {
		crsIndex.set(normalizeCode(crs.code), crs);
		addToRegionIndex('Japan', crs);
	}

	for (const crs of Object.values(global.geographicCRS)) {
		crsIndex.set(normalizeCode(crs.code), crs);
		addToRegionIndex('Global', crs);
	}
	for (const crs of Object.values(global.projectedCRS)) {
		crsIndex.set(normalizeCode(crs.code), crs);
		addToRegionIndex('Global', crs);
	}

	debug(`CRS index built: ${crsIndex.size} entries`);
}

export async function findCrsById(code: string): Promise<CrsDetail | undefined> {
	await buildCrsIndex();
	return crsIndex?.get(normalizeCode(code));
}

export async function getCrsByRegion(region: string): Promise<CrsInfo[]> {
	await buildCrsIndex();
	return regionIndex?.get(normalizeRegion(region)) || [];
}

export async function getAllCrs(): Promise<CrsDetail[]> {
	await buildCrsIndex();
	return crsIndex ? Array.from(crsIndex.values()) : [];
}

export async function getZoneMapping(): Promise<
	Record<string, { zone: string; code: string; notes?: string }>
> {
	const japan = await loadJapanCrs();
	return japan.zoneMapping;
}

export async function preloadAll(): Promise<void> {
	await Promise.all([loadJapanCrs(), loadGlobalCrs(), loadRecommendations()]);
	await buildCrsIndex();
}

export function clearCache(): void {
	japanCrsData = null;
	globalCrsData = null;
	recommendationsData = null;
	crsIndex = null;
	regionIndex = null;
	debug('Cache cleared');
}
