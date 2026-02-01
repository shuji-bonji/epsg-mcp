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
	prefecture: z.string().optional(),
	boundingBox: BoundingBoxSchema.optional(),
	centerPoint: z
		.object({
			lat: z.number().min(-90).max(90),
			lng: z.number().min(-180).max(180),
		})
		.optional(),
});

export const RecommendCrsSchema = z.object({
	purpose: PurposeSchema,
	location: LocationSchema,
	requirements: z
		.object({
			accuracy: z.enum(['high', 'medium', 'low']).optional(),
			interoperability: z.array(z.string()).optional(),
		})
		.optional(),
});

export type SearchCrsInput = z.infer<typeof SearchCrsSchema>;
export type GetCrsDetailInput = z.infer<typeof GetCrsDetailSchema>;
export type ListCrsByRegionInput = z.infer<typeof ListCrsByRegionSchema>;
export type RecommendCrsInput = z.infer<typeof RecommendCrsSchema>;
