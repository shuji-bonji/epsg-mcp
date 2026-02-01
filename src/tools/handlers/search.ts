/**
 * 検索系ハンドラー
 */

import { NotFoundError, ValidationError } from '../../errors/index.js';
import { GetCrsDetailSchema, ListCrsByRegionSchema, SearchCrsSchema } from '../../schemas/index.js';
import { getServices } from '../../services/registry.js';

export async function handleSearchCrs(args: unknown) {
	const result = SearchCrsSchema.safeParse(args);
	if (!result.success) {
		throw new ValidationError(result.error);
	}

	const { query, type, region, limit } = result.data;
	const services = getServices();
	return await services.searchCrs(query, { type, region, limit });
}

export async function handleGetCrsDetail(args: unknown) {
	const result = GetCrsDetailSchema.safeParse(args);
	if (!result.success) {
		throw new ValidationError(result.error);
	}

	const { code } = result.data;
	const services = getServices();
	const detail = await services.getCrsDetail(code);

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
	const services = getServices();
	return await services.listCrsByRegion(region, { type, includeDeprecated });
}
