/**
 * 推奨・検証関連型定義
 */

import type { DatumInfo, LocationSpec } from './crs.js';

export type Purpose =
	| 'web_mapping'
	| 'distance_calculation'
	| 'area_calculation'
	| 'survey'
	| 'navigation'
	| 'data_exchange'
	| 'data_storage'
	| 'visualization';

export interface Requirements {
	accuracy?: 'high' | 'medium' | 'low';
	distortionTolerance?: 'minimal' | 'moderate' | 'flexible';
	interoperability?: string[]; // ["GIS", "CAD", "Web"]
}

export interface RecommendedCrs {
	code: string;
	name: string;
	score: number;
	pros: string[];
	cons: string[];
	usageNotes?: string;
}

export interface RecommendationResult {
	primary: RecommendedCrs;
	alternatives: RecommendedCrs[];
	reasoning: string;
}

export interface RecommendCrsArgs {
	purpose: Purpose;
	location: LocationSpec;
	requirements?: Requirements;
}

export interface RecommendCrsOutput {
	primary: RecommendedCrs;
	alternatives: RecommendedCrs[];
	reasoning: string;
	warnings?: string[];
}

// 検証関連

export type ValidationIssueCode =
	| 'DEPRECATED_CRS'
	| 'LEGACY_DATUM'
	| 'AREA_MISMATCH'
	| 'AREA_DISTORTION'
	| 'DISTANCE_DISTORTION'
	| 'PRECISION_LOSS'
	| 'ZONE_MISMATCH'
	| 'CROSS_ZONE_CALCULATION'
	| 'DEPRECATED_STORAGE'
	| 'GEOJSON_INCOMPATIBLE'
	| 'NOT_OFFICIAL_SURVEY_CRS'
	| 'GEOGRAPHIC_AREA'
	| 'GEOGRAPHIC_DISTANCE'
	| 'BETTER_ALTERNATIVE'
	| 'GPS_CONVERSION_NEEDED'
	| 'PROJECTED_STORAGE'
	| 'NON_STANDARD_EXCHANGE'
	| 'NON_STANDARD_WEB_CRS';

export interface ValidationIssue {
	severity: 'error' | 'warning' | 'info';
	code: ValidationIssueCode;
	message: string;
	recommendation: string;
}

export interface ValidateCrsUsageArgs {
	crs: string;
	purpose: Purpose;
	location: LocationSpec;
}

export interface ValidateCrsUsageOutput {
	isValid: boolean;
	score: number; // 適合度 0-100
	issues: ValidationIssue[];
	suggestions: string[];
	betterAlternatives?: RecommendedCrs[];
}

// データ構造

export interface RecommendationRuleRegion {
	primary: string;
	alternatives?: string[];
	reasoning: string;
	pros?: string[];
	cons?: string[];
	warnings?: string[];
	codePattern?: string;
	fallback?: string;
	examples?: string[];
	requirements?: string[];
	note?: string;
	zoneSelection?: string;
}

export interface RecommendationRule {
	description: string;
	global?: RecommendationRuleRegion;
	japan?: RecommendationRuleRegion;
}

export interface MultiZonePrefecture {
	note: string;
	subRegions: Record<string, string>;
	cities: Record<string, string>;
	default: string;
}

export interface ValidationRulesConfig {
	deprecatedCrs: string[];
	legacyDatumPatterns: string[];
	webMappingCrs: string[];
	navigationCrs: string[];
	dataExchangeCrs: string[];
	planeRectangularRange: {
		start: number;
		end: number;
	};
	scoreWeights: Record<string, number>;
}

export interface RecommendationsData {
	version: string;
	rules: Record<Purpose, RecommendationRule>;
	multiZonePrefectures: Record<string, MultiZonePrefecture>;
	validationRules: ValidationRulesConfig;
}

// CRSデータ構造

export interface JapanCrsData {
	version: string;
	lastUpdated: string;
	datums: Record<string, DatumInfo & { history?: string; succeeds?: string }>;
	geographicCRS: Record<string, import('./crs.js').CrsDetail>;
	projectedCRS: Record<string, import('./crs.js').CrsDetail>;
	zoneMapping: Record<string, { zone: string; code: string; notes?: string }>;
}

export interface GlobalCrsData {
	version: string;
	geographicCRS: Record<string, import('./crs.js').CrsDetail>;
	projectedCRS: Record<string, import('./crs.js').CrsDetail>;
}
