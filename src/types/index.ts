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

// ========================================
// Phase 3: 変換経路提案
// ========================================

export interface TransformationStep {
	from: string; // "EPSG:4301"
	to: string; // "EPSG:6668"
	method: string; // "Geocentric translation", "Helmert 7-parameter"
	accuracy: string; // "1-2m", "数cm"
	epsgCode?: string; // 変換操作のEPSGコード（例: "EPSG:15483"）
	notes?: string; // 特記事項
	isReverse?: boolean; // 逆方向変換か
}

export type TransformationComplexity = 'simple' | 'moderate' | 'complex';

export interface TransformationPath {
	steps: TransformationStep[];
	totalAccuracy: string; // "1m", "数cm" など
	complexity: TransformationComplexity;
	estimatedPrecisionLoss?: string; // 累積精度損失の説明
}

export interface SuggestTransformationArgs {
	sourceCrs: string; // "EPSG:4301", "4301"
	targetCrs: string; // "EPSG:6668", "6668"
	location?: LocationSpec; // 変換対象の位置（精度向上のため）
}

export interface SuggestTransformationOutput {
	directPath: TransformationPath | null; // 直接変換可能な場合
	viaPaths: TransformationPath[]; // 中間CRSを経由する変換
	recommended: TransformationPath; // 推奨される変換経路
	warnings: string[]; // 注意事項
}

// ========================================
// Phase 3: CRS比較
// ========================================

export type ComparisonAspect =
	| 'accuracy' // 精度
	| 'area_of_use' // 適用範囲
	| 'distortion' // 歪み特性
	| 'compatibility' // 互換性
	| 'use_cases' // 用途
	| 'datum' // 測地系
	| 'projection'; // 投影法

export interface ComparisonResult {
	aspect: string;
	crs1Value: string;
	crs2Value: string;
	verdict: string; // 判定・説明
}

export interface CompareCrsArgs {
	crs1: string; // "EPSG:4326", "4326"
	crs2: string; // "EPSG:6668", "6668"
	aspects?: ComparisonAspect[]; // 比較する観点（省略時は全て）
}

export interface CompareCrsOutput {
	comparison: ComparisonResult[];
	summary: string;
	recommendation: string;
	transformationNote?: string; // 変換に関する注記
}

// ========================================
// Phase 3: データ構造（静的JSON用）
// ========================================

export interface TransformationRecord {
	id: string;
	from: string;
	to: string;
	method: string;
	accuracy: string;
	reversible: boolean; // 逆方向変換可能か
	reverseNote?: string; // 逆方向特有の注記
	parameters?: Record<string, unknown>;
	description: string;
	notes?: string;
}

export interface CommonPath {
	description: string;
	steps: string[];
	totalAccuracy: string;
	notes?: string;
}

export interface DeprecationInfo {
	note: string;
	migrateTo: string;
}

export interface TransformationsData {
	version: string;
	transformations: TransformationRecord[];
	commonPaths: Record<string, CommonPath>;
	hubCrs: string[];
	deprecatedTransformations: Record<string, DeprecationInfo>;
}

export interface DistortionInfo {
	area: string;
	distance: string;
	shape: string;
	note?: string;
}

export interface CompatibilityInfo {
	gis: string;
	web: string;
	cad: string;
	gps: string;
}

export interface CrsCharacteristics {
	distortion: DistortionInfo;
	compatibility: CompatibilityInfo;
	useCasesScore: Record<Purpose, number>;
}

export interface ComparisonTemplate {
	summary: string;
	considerations: string[];
}

export interface ComparisonsData {
	version: string;
	crsCharacteristics: Record<string, CrsCharacteristics>;
	comparisonTemplates: Record<string, ComparisonTemplate>;
}

// ========================================
// Phase 4: ベストプラクティス
// ========================================

export const BEST_PRACTICE_TOPICS = [
	'japan_survey',
	'web_mapping',
	'data_exchange',
	'coordinate_storage',
	'mobile_gps',
	'cross_border',
	'historical_data',
	'gis_integration',
	'precision_requirements',
	'projection_selection',
] as const;

export type BestPracticeTopic = (typeof BEST_PRACTICE_TOPICS)[number];

export function isBestPracticeTopic(value: string): value is BestPracticeTopic {
	return BEST_PRACTICE_TOPICS.includes(value as BestPracticeTopic);
}

export type PracticePriority = 'must' | 'should' | 'may';

export interface Practice {
	title: string;
	description: string;
	example?: string;
	codeExample?: string;
	priority: PracticePriority;
	rationale: string;
}

export interface CommonMistake {
	mistake: string;
	consequence: string;
	solution: string;
}

export type ReferenceType = 'official' | 'article' | 'tool';

export interface Reference {
	title: string;
	url?: string;
	type: ReferenceType;
}

export interface GetBestPracticesArgs {
	topic: BestPracticeTopic;
	context?: string;
}

export interface GetBestPracticesOutput {
	topic: string;
	description: string;
	practices: Practice[];
	commonMistakes: CommonMistake[];
	relatedTopics: string[];
	references: Reference[];
}

// ========================================
// Phase 4: トラブルシューティング
// ========================================

export type CauseLikelihood = 'high' | 'medium' | 'low';

export interface Cause {
	likelihood: CauseLikelihood;
	cause: string;
	description: string;
	indicators: string[];
}

export interface DiagnosticStep {
	step: number;
	action: string;
	expected: string;
	ifFailed: string;
}

export interface Solution {
	forCause: string;
	steps: string[];
	prevention: string;
	tools?: string[];
}

export interface TroubleshootContext {
	sourceCrs?: string;
	targetCrs?: string;
	location?: string;
	tool?: string;
	magnitude?: string;
}

export interface TroubleshootArgs {
	symptom: string;
	context?: TroubleshootContext;
}

export interface TroubleshootOutput {
	matchedSymptom: string;
	possibleCauses: Cause[];
	diagnosticSteps: DiagnosticStep[];
	suggestedSolutions: Solution[];
	relatedBestPractices: string[];
	confidence: 'high' | 'medium' | 'low';
}

// ========================================
// Phase 4: データ構造（静的JSON用）
// ========================================

export interface BestPracticeTopicData {
	description: string;
	practices: Practice[];
	commonMistakes: CommonMistake[];
	relatedTopics: string[];
	references: Reference[];
}

export interface BestPracticesData {
	version: string;
	topics: Record<BestPracticeTopic, BestPracticeTopicData>;
}

export interface SymptomData {
	description: string;
	keywords: string[];
	possibleCauses: Cause[];
	diagnosticSteps: DiagnosticStep[];
	solutions: Solution[];
	relatedBestPractices: string[];
}

export interface TroubleshootingData {
	version: string;
	symptoms: Record<string, SymptomData>;
	keywordMapping: Record<string, string[]>;
}
