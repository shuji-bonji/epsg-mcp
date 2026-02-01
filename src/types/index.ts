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
	boundingBox?: BoundingBox;
	centerPoint?: { lat: number; lng: number };
}

export interface RecommendCrsArgs {
	purpose: Purpose;
	location: LocationSpec;
	requirements?: {
		accuracy?: 'high' | 'medium' | 'low';
		interoperability?: string[];
	};
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

export interface RecommendationRule {
	description: string;
	global?: {
		primary: string;
		alternatives?: string[];
		reasoning: string;
		warnings?: string[];
	};
	japan?: {
		primary: string;
		codePattern?: string;
		alternatives?: string[];
		reasoning: string;
		requirements?: string[];
	};
}

export interface RecommendationsData {
	version: string;
	rules: Record<string, RecommendationRule>;
}
