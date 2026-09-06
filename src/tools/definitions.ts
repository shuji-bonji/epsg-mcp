/**
 * MCP Tool Definitions
 *
 * ツール名・説明・入力スキーマ（Zod）の一覧。
 * 入力スキーマは src/schemas/index.ts の Zod スキーマを唯一の定義源とし、
 * tools/list に返す JSON Schema は MCP SDK が Zod スキーマから生成する。
 */

import type { z } from 'zod';
import {
	CompareCrsSchema,
	GetBestPracticesSchema,
	GetCrsDetailSchema,
	ListCrsByRegionSchema,
	RecommendCrsSchema,
	SearchCrsSchema,
	SuggestTransformationSchema,
	TroubleshootSchema,
	ValidateCrsUsageSchema,
} from '../schemas/index.js';

export interface ToolDefinition {
	name: string;
	description: string;
	inputSchema: z.ZodObject;
}

export const tools: ToolDefinition[] = [
	{
		name: 'search_crs',
		description:
			'Search EPSG Coordinate Reference Systems (CRS) by keyword. Searchable by EPSG code, name, region name, or prefecture name. Covers Japanese JGD2011 CRS family, global WGS84, Web Mercator, and more.',
		inputSchema: SearchCrsSchema,
	},
	{
		name: 'get_crs_detail',
		description:
			'Get detailed information for a specific EPSG code. Includes datum, projection method, area of use, accuracy characteristics, and intended use cases.',
		inputSchema: GetCrsDetailSchema,
	},
	{
		name: 'list_crs_by_region',
		description:
			'Get available CRS list for a region with purpose-based recommendations. Japan includes Plane Rectangular CS (Zones I-XIX), Global includes WGS84 and UTM zones.',
		inputSchema: ListCrsByRegionSchema,
	},
	{
		name: 'recommend_crs',
		description:
			'Recommend the optimal CRS based on purpose and location. Supports web mapping, distance/area calculation, surveying, navigation, data exchange, etc. Full support for Japan Plane Rectangular CS (Zones I-XIX) including multi-zone regions like Hokkaido and Okinawa.',
		inputSchema: RecommendCrsSchema,
	},
	{
		name: 'validate_crs_usage',
		description:
			'Validate whether a CRS is appropriate for a specific purpose and location. Detects deprecated CRS usage, area/distance calculation distortion issues, inappropriate zone selection for surveying, and provides improvement suggestions.',
		inputSchema: ValidateCrsUsageSchema,
	},
	{
		name: 'suggest_transformation',
		description:
			'Suggest transformation paths between two CRS. Covers Tokyo Datum to JGD2011, WGS84 to Plane Rectangular CS, etc. Searches multi-step paths, provides accuracy info, and warns about cumulative errors.',
		inputSchema: SuggestTransformationSchema,
	},
	{
		name: 'compare_crs',
		description:
			'Compare two CRS from various perspectives. Compares datum, projection method, area of use, accuracy, distortion characteristics, compatibility, and use case suitability. Explains which is better suited for specific purposes.',
		inputSchema: CompareCrsSchema,
	},
	{
		name: 'get_best_practices',
		description:
			'Get CRS best practices for specific topics. Covers surveying in Japan, web mapping, data exchange, coordinate storage, mobile GPS, cross-border data, historical data, GIS integration, precision requirements, and projection selection. Provides recommended practices, common mistakes, and reference materials.',
		inputSchema: GetBestPracticesSchema,
	},
	{
		name: 'troubleshoot',
		description:
			'Troubleshoot CRS-related problems. Diagnoses coordinate shifts (cm, m, km scale), area/distance calculation errors, data not displaying, and transformation errors. Identifies causes, provides diagnostic steps, and solutions.',
		inputSchema: TroubleshootSchema,
	},
];
