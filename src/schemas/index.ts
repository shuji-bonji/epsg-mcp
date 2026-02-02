/**
 * Zodスキーマ定義
 */

import { z } from 'zod';

export const CrsTypeSchema = z.enum([
	'geographic',
	'projected',
	'compound',
	'vertical',
	'engineering',
]);

export const BoundingBoxSchema = z.object({
	north: z.number().min(-90).max(90),
	south: z.number().min(-90).max(90),
	east: z.number().min(-180).max(180),
	west: z.number().min(-180).max(180),
});

export const SearchCrsSchema = z.object({
	query: z.string().min(1, 'query is required'),
	type: CrsTypeSchema.optional(),
	region: z.string().optional(),
	limit: z.number().min(1).max(100).optional().default(10),
});

export const GetCrsDetailSchema = z.object({
	code: z
		.string()
		.min(1, 'EPSG code is required')
		.refine((val) => /^(EPSG:)?\d+$/.test(val), {
			message: 'Invalid EPSG code format. Use "EPSG:4326" or "4326"',
		}),
});

export const ListCrsByRegionSchema = z.object({
	region: z.string().min(1, 'region is required'),
	type: CrsTypeSchema.optional(),
	includeDeprecated: z.boolean().optional().default(false),
});

export const PurposeSchema = z.enum([
	'web_mapping',
	'distance_calculation',
	'area_calculation',
	'survey',
	'navigation',
	'data_exchange',
	'data_storage',
	'visualization',
]);

export const LocationSchema = z.object({
	country: z.string().optional(),
	region: z.string().optional(),
	subdivision: z.string().optional(), // 行政区画（都道府県/州/県など）
	prefecture: z.string().optional(), // @deprecated: Use subdivision instead
	city: z.string().optional(), // 複数系をまたぐ地域での判定用
	boundingBox: BoundingBoxSchema.optional(),
	centerPoint: z
		.object({
			lat: z.number().min(-90).max(90),
			lng: z.number().min(-180).max(180),
		})
		.optional(),
});

export const RequirementsSchema = z.object({
	accuracy: z.enum(['high', 'medium', 'low']).optional(),
	distortionTolerance: z.enum(['minimal', 'moderate', 'flexible']).optional(),
	interoperability: z.array(z.string()).optional(),
});

export const RecommendCrsSchema = z.object({
	purpose: PurposeSchema,
	location: LocationSchema,
	requirements: RequirementsSchema.optional(),
});

export const ValidationIssueCodeSchema = z.enum([
	'DEPRECATED_CRS',
	'LEGACY_DATUM',
	'AREA_MISMATCH',
	'AREA_DISTORTION',
	'DISTANCE_DISTORTION',
	'PRECISION_LOSS',
	'ZONE_MISMATCH',
	'CROSS_ZONE_CALCULATION',
	'DEPRECATED_STORAGE',
	'GEOJSON_INCOMPATIBLE',
	'NOT_OFFICIAL_SURVEY_CRS',
	'GEOGRAPHIC_AREA',
	'GEOGRAPHIC_DISTANCE',
	'BETTER_ALTERNATIVE',
	'GPS_CONVERSION_NEEDED',
	'PROJECTED_STORAGE',
	'NON_STANDARD_EXCHANGE',
	'NON_STANDARD_WEB_CRS',
]);

export const ValidateCrsUsageSchema = z.object({
	crs: z
		.string()
		.min(1, 'EPSG code is required')
		.refine((val) => /^(EPSG:)?\d+$/.test(val), {
			message: 'Invalid EPSG code format. Use "EPSG:4326" or "4326"',
		}),
	purpose: PurposeSchema,
	location: LocationSchema,
});

// ========================================
// Phase 3: 変換経路提案
// ========================================

export const EpsgCodeSchema = z
	.string()
	.min(1, 'EPSG code is required')
	.refine((val) => /^(EPSG:)?\d+$/.test(val), {
		message: 'Invalid EPSG code format. Use "EPSG:4326" or "4326"',
	});

export const SuggestTransformationSchema = z.object({
	sourceCrs: EpsgCodeSchema,
	targetCrs: EpsgCodeSchema,
	location: LocationSchema.optional(),
});

// ========================================
// Phase 3: CRS比較
// ========================================

export const ComparisonAspectSchema = z.enum([
	'accuracy',
	'area_of_use',
	'distortion',
	'compatibility',
	'use_cases',
	'datum',
	'projection',
]);

export const CompareCrsSchema = z.object({
	crs1: EpsgCodeSchema,
	crs2: EpsgCodeSchema,
	aspects: z.array(ComparisonAspectSchema).optional(),
});

// ========================================
// Phase 4: ベストプラクティス
// ========================================

export const BestPracticeTopicSchema = z.enum([
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
]);

export const GetBestPracticesSchema = z.object({
	topic: BestPracticeTopicSchema,
	context: z.string().max(500).optional(),
});

// ========================================
// Phase 4: トラブルシューティング
// ========================================

export const TroubleshootContextSchema = z.object({
	sourceCrs: z.string().optional(),
	targetCrs: z.string().optional(),
	location: z.string().optional(),
	tool: z.string().optional(),
	magnitude: z.string().optional(),
});

export const TroubleshootSchema = z.object({
	symptom: z
		.string()
		.min(2, '症状は2文字以上で記述してください')
		.max(500, '症状は500文字以内で記述してください'),
	context: TroubleshootContextSchema.optional(),
});

export type SearchCrsInput = z.infer<typeof SearchCrsSchema>;
export type GetCrsDetailInput = z.infer<typeof GetCrsDetailSchema>;
export type ListCrsByRegionInput = z.infer<typeof ListCrsByRegionSchema>;
export type RecommendCrsInput = z.infer<typeof RecommendCrsSchema>;
export type ValidateCrsUsageInput = z.infer<typeof ValidateCrsUsageSchema>;
export type SuggestTransformationInput = z.infer<typeof SuggestTransformationSchema>;
export type CompareCrsInput = z.infer<typeof CompareCrsSchema>;
export type GetBestPracticesInput = z.infer<typeof GetBestPracticesSchema>;
export type TroubleshootInput = z.infer<typeof TroubleshootSchema>;
