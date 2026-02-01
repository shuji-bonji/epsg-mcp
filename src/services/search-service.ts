/**
 * CRS検索サービス
 */

import { DEFAULTS, SEARCH_SCORE } from '../constants/index.js';
import { findCrsById, getCrsByRegion, loadGlobalCrs, loadJapanCrs } from '../data/loader.js';
import type { CrsDetail, CrsInfo, CrsType, RegionCrsList, SearchResult } from '../types/index.js';

const WORD_SPLIT_REGEX = /\s+/;

function calculateMatchScore(crs: CrsDetail, lowerQuery: string, queryWords: string[]): number {
	const lowerCode = crs.code.toLowerCase();
	const lowerName = crs.name.toLowerCase();
	const normalizedCode = lowerCode.replace('epsg:', '');

	if (normalizedCode === lowerQuery || lowerQuery === normalizedCode) {
		return SEARCH_SCORE.EXACT_CODE_MATCH;
	}

	if (lowerCode.includes(lowerQuery) || lowerQuery.includes(normalizedCode)) {
		return SEARCH_SCORE.PARTIAL_CODE_MATCH;
	}

	if (lowerName === lowerQuery) {
		return SEARCH_SCORE.EXACT_NAME_MATCH;
	}

	if (lowerName.includes(lowerQuery)) {
		return SEARCH_SCORE.NAME_CONTAINS;
	}

	const remarksLower = crs.remarks?.toLowerCase() || '';
	if (remarksLower.includes(lowerQuery)) {
		return SEARCH_SCORE.REMARKS_CONTAINS;
	}

	const prefecturesStr = crs.areaOfUse?.prefectures?.join(' ').toLowerCase() || '';
	if (prefecturesStr.includes(lowerQuery)) {
		return SEARCH_SCORE.PREFECTURE_MATCH;
	}

	if (queryWords.length > 0) {
		const searchableText = `${lowerName} ${remarksLower} ${prefecturesStr}`;
		const matchedWords = queryWords.filter((word) => searchableText.includes(word));
		if (matchedWords.length === queryWords.length) {
			return SEARCH_SCORE.ALL_WORDS_MATCH;
		}
		if (matchedWords.length > 0) {
			return (
				SEARCH_SCORE.PARTIAL_WORDS_BASE +
				(matchedWords.length / queryWords.length) * SEARCH_SCORE.PARTIAL_WORDS_MAX_BONUS
			);
		}
	}

	return 0;
}

export async function searchCrs(
	query: string,
	options: {
		type?: CrsType;
		region?: string;
		limit?: number;
	} = {}
): Promise<SearchResult> {
	const { type, region, limit = DEFAULTS.SEARCH_LIMIT } = options;
	const lowerQuery = query.toLowerCase().trim();
	const queryWords = lowerQuery
		.split(WORD_SPLIT_REGEX)
		.filter((w) => w.length >= DEFAULTS.MIN_WORD_LENGTH)
		.slice(0, DEFAULTS.MAX_QUERY_WORDS);

	const [japan, global] = await Promise.all([loadJapanCrs(), loadGlobalCrs()]);

	const allCrs: CrsDetail[] = [];

	const regionLower = region?.toLowerCase();
	if (!region || regionLower === 'japan') {
		allCrs.push(...Object.values(japan.geographicCRS));
		allCrs.push(...Object.values(japan.projectedCRS));
	}
	if (!region || regionLower === 'global') {
		allCrs.push(...Object.values(global.geographicCRS));
		allCrs.push(...Object.values(global.projectedCRS));
	}

	const scored: Array<{ crs: CrsDetail; score: number }> = [];

	for (const crs of allCrs) {
		if (type && crs.type !== type) continue;

		const score = calculateMatchScore(crs, lowerQuery, queryWords);
		if (score > 0) {
			scored.push({ crs, score });
		}
	}

	scored.sort((a, b) => b.score - a.score);

	const results: CrsInfo[] = scored.slice(0, limit).map(({ crs }) => ({
		code: crs.code,
		name: crs.name,
		type: crs.type,
		region: crs.areaOfUse?.description,
		deprecated: crs.deprecated,
		description: crs.remarks,
	}));

	return {
		results,
		totalCount: scored.length,
	};
}

export async function getCrsDetail(code: string): Promise<CrsDetail | null> {
	const crs = await findCrsById(code);
	return crs || null;
}

export async function listCrsByRegion(
	region: string,
	options: {
		type?: CrsType;
		includeDeprecated?: boolean;
	} = {}
): Promise<RegionCrsList> {
	const { type, includeDeprecated = false } = options;

	let crsList = await getCrsByRegion(region);

	if (type) {
		crsList = crsList.filter((crs) => crs.type === type);
	}
	if (!includeDeprecated) {
		crsList = crsList.filter((crs) => !crs.deprecated);
	}

	const regionLower = region.toLowerCase();
	const recommendedFor =
		regionLower === 'japan'
			? {
					general: 'EPSG:6668 (JGD2011)',
					survey: 'EPSG:6669-6687 (平面直角座標系 I-XIX)',
					webMapping: 'EPSG:3857 (Web Mercator)',
				}
			: {
					general: 'EPSG:4326 (WGS 84)',
					survey: 'UTM zones (EPSG:326xx)',
					webMapping: 'EPSG:3857 (Web Mercator)',
				};

	return {
		region,
		crsList,
		recommendedFor,
	};
}
