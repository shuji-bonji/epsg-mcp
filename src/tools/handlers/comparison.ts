/**
 * CRS比較系ハンドラー
 */

import { ValidationError } from '../../errors/index.js';
import { CompareCrsSchema } from '../../schemas/index.js';
import { getServices } from '../../services/registry.js';

export async function handleCompareCrs(args: unknown) {
	const result = CompareCrsSchema.safeParse(args);
	if (!result.success) {
		throw new ValidationError(result.error);
	}

	const { crs1, crs2, aspects } = result.data;
	const services = getServices();
	return await services.compareCrs(crs1, crs2, aspects);
}
