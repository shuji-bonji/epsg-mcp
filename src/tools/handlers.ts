/**
 * MCP ツールハンドラー
 */

import { NotFoundError, ValidationError } from '../errors/index.js';
import {
	CompareCrsSchema,
	GetCrsDetailSchema,
	ListCrsByRegionSchema,
	RecommendCrsSchema,
	SearchCrsSchema,
	SuggestTransformationSchema,
	ValidateCrsUsageSchema,
} from '../schemas/index.js';
import { compareCrs } from '../services/comparison-service.js';
import { recommendCrs } from '../services/recommendation-service.js';
import { getCrsDetail, listCrsByRegion, searchCrs } from '../services/search-service.js';
import { suggestTransformation } from '../services/transformation-service.js';
import { validateCrsUsage } from '../utils/validation.js';

export async function handleSearchCrs(args: unknown) {
	const result = SearchCrsSchema.safeParse(args);
	if (!result.success) {
		throw new ValidationError(result.error);
	}

	const { query, type, region, limit } = result.data;
	return await searchCrs(query, { type, region, limit });
}

export async function handleGetCrsDetail(args: unknown) {
	const result = GetCrsDetailSchema.safeParse(args);
	if (!result.success) {
		throw new ValidationError(result.error);
	}

	const { code } = result.data;
	const detail = await getCrsDetail(code);

	if (!detail) {
		throw new NotFoundError('CRS', code);
	}

	return detail;
}

export async function handleListCrsByRegion(args: unknown) {
	const result = ListCrsByRegionSchema.safeParse(args);
	if (!result.success) {
		throw new ValidationError(result.error);
	}

	const { region, type, includeDeprecated } = result.data;
	return await listCrsByRegion(region, { type, includeDeprecated });
}

export async function handleRecommendCrs(args: unknown) {
	const result = RecommendCrsSchema.safeParse(args);
	if (!result.success) {
		throw new ValidationError(result.error);
	}

	const { purpose, location, requirements } = result.data;
	return await recommendCrs(purpose, location, requirements);
}

export async function handleValidateCrsUsage(args: unknown) {
	const result = ValidateCrsUsageSchema.safeParse(args);
	if (!result.success) {
		throw new ValidationError(result.error);
	}

	const { crs, purpose, location } = result.data;
	return await validateCrsUsage(crs, purpose, location);
}

export async function handleSuggestTransformation(args: unknown) {
	const result = SuggestTransformationSchema.safeParse(args);
	if (!result.success) {
		throw new ValidationError(result.error);
	}

	const { sourceCrs, targetCrs, location } = result.data;
	return await suggestTransformation(sourceCrs, targetCrs, location);
}

export async function handleCompareCrs(args: unknown) {
	const result = CompareCrsSchema.safeParse(args);
	if (!result.success) {
		throw new ValidationError(result.error);
	}

	const { crs1, crs2, aspects } = result.data;
	return await compareCrs(crs1, crs2, aspects);
}

export const toolHandlers: Record<string, (args: unknown) => Promise<unknown>> = {
	search_crs: handleSearchCrs,
	get_crs_detail: handleGetCrsDetail,
	list_crs_by_region: handleListCrsByRegion,
	recommend_crs: handleRecommendCrs,
	validate_crs_usage: handleValidateCrsUsage,
	suggest_transformation: handleSuggestTransformation,
	compare_crs: handleCompareCrs,
};
