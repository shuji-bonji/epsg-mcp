/**
 * 推奨・検証系ハンドラー
 */

import { ValidationError } from '../../errors/index.js';
import { RecommendCrsSchema, ValidateCrsUsageSchema } from '../../schemas/index.js';
import { getServices } from '../../services/registry.js';

export async function handleRecommendCrs(args: unknown) {
	const result = RecommendCrsSchema.safeParse(args);
	if (!result.success) {
		throw new ValidationError(result.error);
	}

	const { purpose, location, requirements } = result.data;
	const services = getServices();
	return await services.recommendCrs(purpose, location, requirements);
}

export async function handleValidateCrsUsage(args: unknown) {
	const result = ValidateCrsUsageSchema.safeParse(args);
	if (!result.success) {
		throw new ValidationError(result.error);
	}

	const { crs, purpose, location } = result.data;
	const services = getServices();
	return await services.validateCrsUsage(crs, purpose, location);
}
