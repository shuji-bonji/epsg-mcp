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

export const BoundingBoxSchema = z
	.object({
		north: z.number().min(-90).max(90).describe('North latitude'),
		south: z.number().min(-90).max(90).describe('South latitude'),
		east: z.number().min(-180).max(180).describe('East longitude'),
		west: z.number().min(-180).max(180).describe('West longitude'),
	})
	.describe('Bounding box of target area');

export const SearchCrsSchema = z.object({
	query: z
		.string()
		.min(1, 'query is required')
		.describe('Search keyword (e.g., "JGD2011", "4326", "Tokyo", "plane rectangular")'),
	type: CrsTypeSchema.optional().describe(
		'Filter by CRS type (geographic: lat/lon, projected: x/y meters)'
	),
	region: z.string().optional().describe('Filter by region ("Japan" or "Global")'),
	limit: z
		.number()
		.min(1)
		.max(100)
		.optional()
		.default(10)
		.describe('Maximum number of results (default: 10, max: 100)'),
});

export const GetCrsDetailSchema = z.object({
	code: z
		.string()
		.min(1, 'EPSG code is required')
		.refine((val) => /^(EPSG:)?\d+$/.test(val), {
			message: 'Invalid EPSG code format. Use "EPSG:4326" or "4326"',
		})
		.describe('EPSG code (e.g., "EPSG:6677" or "6677")'),
});

export const ListCrsByRegionSchema = z.object({
	region: z.string().min(1, 'region is required').describe('Region name ("Japan" or "Global")'),
	type: CrsTypeSchema.optional().describe('Filter by CRS type'),
	includeDeprecated: z
		.boolean()
		.optional()
		.default(false)
		.describe('Include deprecated CRS (default: false)'),
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

export const CenterPointSchema = z
	.object({
		lat: z.number().min(-90).max(90).describe('Latitude'),
		lng: z.number().min(-180).max(180).describe('Longitude'),
	})
	.describe('Center coordinates');

export const LocationSchema = z
	.object({
		country: z.string().optional().describe('Country (e.g., "Japan", "US", "UK", or "Global")'),
		region: z
			.string()
			.optional()
			.describe('Region name (e.g., "Kanto", "Hokkaido", "Main Island", "Sakishima")'),
		// 行政区画（都道府県/州/県など）
		subdivision: z
			.string()
			.optional()
			.describe(
				'Administrative subdivision: prefecture, state, or county (e.g., "Tokyo", "California")'
			),
		// @deprecated: Use subdivision instead
		prefecture: z
			.string()
			.optional()
			.describe(
				'Prefecture name (e.g., "Tokyo", "Hokkaido", "Okinawa"). Deprecated: use subdivision'
			),
		// 複数系をまたぐ地域での判定用
		city: z
			.string()
			.optional()
			.describe(
				'City/municipality name (e.g., "Sapporo", "Naha") for multi-zone region disambiguation'
			),
		boundingBox: BoundingBoxSchema.optional(),
		centerPoint: CenterPointSchema.optional(),
	})
	.describe('Target location specification');

export const RequirementsSchema = z
	.object({
		accuracy: z.enum(['high', 'medium', 'low']).optional().describe('Accuracy requirement'),
		distortionTolerance: z
			.enum(['minimal', 'moderate', 'flexible'])
			.optional()
			.describe('Distortion tolerance'),
		interoperability: z
			.array(z.string())
			.optional()
			.describe('Interoperability requirements (e.g., "GIS", "CAD", "Web")'),
	})
	.describe('Additional requirements');

const PURPOSE_DESCRIPTION =
	'Intended use (web_mapping: web map display, distance_calculation: distance calc, area_calculation: area calc, survey: surveying, navigation: GPS/navigation, data_exchange: interoperability, data_storage: archival, visualization: display)';

export const RecommendCrsSchema = z.object({
	purpose: PurposeSchema.describe(PURPOSE_DESCRIPTION),
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
		})
		.describe('EPSG code to validate (e.g., "EPSG:3857" or "3857")'),
	purpose: PurposeSchema.describe(PURPOSE_DESCRIPTION),
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
	sourceCrs: EpsgCodeSchema.describe('Source EPSG code (e.g., "EPSG:4301" or "4301")'),
	targetCrs: EpsgCodeSchema.describe('Target EPSG code (e.g., "EPSG:6668" or "6668")'),
	location: LocationSchema.optional().describe(
		'Location of data being transformed (optional, for accuracy improvement)'
	),
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
	crs1: EpsgCodeSchema.describe('First EPSG code to compare (e.g., "EPSG:4326" or "4326")'),
	crs2: EpsgCodeSchema.describe('Second EPSG code to compare (e.g., "EPSG:6668" or "6668")'),
	aspects: z
		.array(ComparisonAspectSchema)
		.optional()
		.describe(
			'Comparison aspects (all if omitted). accuracy: precision, area_of_use: coverage, distortion: distortion properties, compatibility: interoperability, use_cases: suitability, datum: geodetic datum, projection: projection method'
		),
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
	topic: BestPracticeTopicSchema.describe(
		'Best practice topic. japan_survey: surveying in Japan, web_mapping: web map creation, data_exchange: interoperability, coordinate_storage: archival, mobile_gps: mobile GPS apps, cross_border: cross-border data, historical_data: legacy data, gis_integration: GIS system integration, precision_requirements: accuracy specs, projection_selection: choosing projections'
	),
	context: z
		.string()
		.max(500)
		.optional()
		.describe('Additional context information (optional, max 500 chars)'),
});

// ========================================
// Phase 4: トラブルシューティング
// ========================================

export const TroubleshootContextSchema = z
	.object({
		sourceCrs: z.string().optional().describe('Source CRS (e.g., "EPSG:4301")'),
		targetCrs: z.string().optional().describe('Target CRS (e.g., "EPSG:6668")'),
		location: z.string().optional().describe('Target region (e.g., "Tohoku region", "Tokyo")'),
		tool: z.string().optional().describe('Tool being used (e.g., "QGIS", "PostGIS")'),
		magnitude: z
			.string()
			.optional()
			.describe('Magnitude of shift (e.g., "400m", "few cm", "1-2m")'),
	})
	.describe('Problem context (optional)');

export const TroubleshootSchema = z.object({
	symptom: z
		.string()
		.min(2, '症状は2文字以上で記述してください')
		.max(500, '症状は500文字以内で記述してください')
		.describe(
			'Describe the problem (e.g., "coordinates shifted by 400m", "area calculation results are wrong", "data not displaying"). 2-500 characters.'
		),
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
