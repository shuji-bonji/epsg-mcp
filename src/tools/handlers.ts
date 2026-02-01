/**
 * MCP ツールハンドラー
 */

import { NotFoundError, ValidationError } from '../errors/index.js';
import { GetCrsDetailSchema, ListCrsByRegionSchema, SearchCrsSchema } from '../schemas/index.js';
import { getCrsDetail, listCrsByRegion, searchCrs } from '../services/search-service.js';

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

export const toolHandlers: Record<string, (args: unknown) => Promise<unknown>> = {
	search_crs: handleSearchCrs,
	get_crs_detail: handleGetCrsDetail,
	list_crs_by_region: handleListCrsByRegion,
};
