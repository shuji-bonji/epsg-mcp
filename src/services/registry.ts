/**
 * サービスレジストリ
 * サービス層とハンドラー層の結合度を下げ、テスタビリティを向上
 */

import type { BestPracticeTopic } from '../types/best-practices.js';
import type { CompareCrsOutput, ComparisonAspect } from '../types/comparison.js';
import type { CrsDetail, CrsType, LocationSpec } from '../types/crs.js';
import type {
	GetBestPracticesOutput,
	TroubleshootContext,
	TroubleshootOutput,
} from '../types/index.js';
import type {
	Purpose,
	RecommendCrsOutput,
	Requirements,
	ValidateCrsUsageOutput,
} from '../types/recommendation.js';
import type { RegionCrsList, SearchResult } from '../types/search.js';
import type { SuggestTransformationOutput } from '../types/transformation.js';
import { validateCrsUsage } from '../utils/validation.js';
import { getBestPractices } from './best-practices-service.js';
import { compareCrs } from './comparison-service.js';
import { recommendCrs } from './recommendation-service.js';
import { getCrsDetail, listCrsByRegion, searchCrs } from './search-service.js';
import { suggestTransformation } from './transformation-service.js';
import { troubleshoot } from './troubleshooting-service.js';

/**
 * サービスインターフェース
 */
export interface ServiceRegistry {
	searchCrs: (
		query: string,
		options?: { type?: CrsType; region?: string; limit?: number }
	) => Promise<SearchResult>;

	getCrsDetail: (code: string) => Promise<CrsDetail | null>;

	listCrsByRegion: (
		region: string,
		options?: { type?: CrsType; includeDeprecated?: boolean }
	) => Promise<RegionCrsList>;

	recommendCrs: (
		purpose: Purpose,
		location: LocationSpec,
		requirements?: Requirements
	) => Promise<RecommendCrsOutput>;

	validateCrsUsage: (
		crs: string,
		purpose: Purpose,
		location: LocationSpec
	) => Promise<ValidateCrsUsageOutput>;

	suggestTransformation: (
		sourceCrs: string,
		targetCrs: string,
		location?: LocationSpec
	) => Promise<SuggestTransformationOutput>;

	compareCrs: (
		crs1: string,
		crs2: string,
		aspects?: ComparisonAspect[]
	) => Promise<CompareCrsOutput>;

	getBestPractices: (topic: BestPracticeTopic, context?: string) => Promise<GetBestPracticesOutput>;

	troubleshoot: (symptom: string, context?: TroubleshootContext) => Promise<TroubleshootOutput>;
}

/**
 * デフォルトサービス実装
 */
const defaultRegistry: ServiceRegistry = {
	searchCrs,
	getCrsDetail,
	listCrsByRegion,
	recommendCrs,
	validateCrsUsage,
	suggestTransformation,
	compareCrs,
	getBestPractices,
	troubleshoot,
};

let currentRegistry: ServiceRegistry = defaultRegistry;

/**
 * 現在のサービスレジストリを取得
 */
export function getServices(): ServiceRegistry {
	return currentRegistry;
}

/**
 * サービスレジストリを設定（テスト用）
 */
export function setServices(registry: ServiceRegistry): void {
	currentRegistry = registry;
}

/**
 * サービスレジストリをデフォルトにリセット
 */
export function resetServices(): void {
	currentRegistry = defaultRegistry;
}
