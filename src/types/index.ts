/**
 * EPSG MCP 型定義
 */

// ========================================
// CRS 関連
// ========================================

export type CrsType = 'geographic' | 'projected' | 'compound' | 'vertical' | 'engineering';

export interface BoundingBox {
	north: number;
	south: number;
	east: number;
	west: number;
}

export interface EllipsoidInfo {
	name: string;
	code: string;
	semiMajorAxis: number;
	inverseFlattening: number;
}

export interface DatumInfo {
	code: string;
	name: string;
	type: 'geodetic' | 'vertical' | 'engineering';
	ellipsoid?: EllipsoidInfo;
	primeMeridian?: string;
	remarks?: string;
}

export interface ProjectionInfo {
	method: string;
	centralMeridian?: number;
	latitudeOfOrigin?: number;
	scaleFactor?: number;
	falseEasting?: number;
	falseNorthing?: number;
}

export interface AreaOfUse {
	description: string;
	boundingBox?: BoundingBox;
	prefectures?: string[];
}

export interface AccuracyInfo {
	horizontal?: string;
	vertical?: string;
	notes?: string;
}

export interface CrsInfo {
	code: string;
	name: string;
	type: CrsType;
	region?: string;
	description?: string;
	deprecated: boolean;
	supersededBy?: string;
}

export interface CrsDetail extends CrsInfo {
	datum?: DatumInfo;
	baseCRS?: string;
	projection?: ProjectionInfo;
	coordinateSystem?: string;
	areaOfUse: AreaOfUse;
	accuracy?: AccuracyInfo;
	remarks?: string;
	relatedCrs?: string[];
	useCases?: string[];
}

// ========================================
// 検索・推奨
// ========================================

export interface SearchResult {
	results: CrsInfo[];
	totalCount: number;
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

export interface RegionCrsList {
	region: string;
	crsList: CrsInfo[];
	recommendedFor: {
		general: string;
		survey: string;
		webMapping: string;
	};
}

// ========================================
// ツール引数
// ========================================

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

export type Purpose =
	| 'web_mapping'
	| 'distance_calculation'
	| 'area_calculation'
	| 'survey'
	| 'navigation'
	| 'data_exchange'
	| 'data_storage'
	| 'visualization';

export interface LocationSpec {
	country?: string;
	region?: string;
	prefecture?: string;
	city?: string; // 複数系をまたぐ地域での判定用（札幌市、那覇市など）
	boundingBox?: BoundingBox;
	centerPoint?: { lat: number; lng: number };
}

export interface Requirements {
	accuracy?: 'high' | 'medium' | 'low';
	distortionTolerance?: 'minimal' | 'moderate' | 'flexible';
	interoperability?: string[]; // ["GIS", "CAD", "Web"]
}

export interface RecommendCrsArgs {
	purpose: Purpose;
	location: LocationSpec;
	requirements?: Requirements;
}

// ========================================
// Phase 2: 推奨出力
// ========================================

export interface RecommendCrsOutput {
	primary: RecommendedCrs;
	alternatives: RecommendedCrs[];
	reasoning: string;
	warnings?: string[];
}

// ========================================
// Phase 2: 検証
// ========================================

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

// ========================================
// データ構造（静的JSON用）
// ========================================

export interface JapanCrsData {
	version: string;
	lastUpdated: string;
	datums: Record<string, DatumInfo & { history?: string; succeeds?: string }>;
	geographicCRS: Record<string, CrsDetail>;
	projectedCRS: Record<string, CrsDetail>;
	zoneMapping: Record<string, { zone: string; code: string; notes?: string }>;
}

export interface GlobalCrsData {
	version: string;
	geographicCRS: Record<string, CrsDetail>;
	projectedCRS: Record<string, CrsDetail>;
}

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
