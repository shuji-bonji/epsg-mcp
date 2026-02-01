/**
 * 検索関連型定義
 */

import type { CrsInfo, CrsType } from './crs.js';

export interface SearchResult {
	results: CrsInfo[];
	totalCount: number;
}

export interface RegionCrsList {
	region: string;
	crsList: CrsInfo[];
	recommendedFor: {
		general: string;
		survey: string;
		webMapping: string;
	};
}

export interface SearchCrsArgs {
	query: string;
	type?: CrsType;
	region?: string;
	limit?: number;
}

export interface GetCrsDetailArgs {
	code: string;
}

export interface ListCrsByRegionArgs {
	region: string;
	type?: CrsType;
	includeDeprecated?: boolean;
}
