/**
 * 変換経路系ハンドラー
 */

import { ValidationError } from '../../errors/index.js';
import { SuggestTransformationSchema } from '../../schemas/index.js';
import { getServices } from '../../services/registry.js';

export async function handleSuggestTransformation(args: unknown) {
	const result = SuggestTransformationSchema.safeParse(args);
	if (!result.success) {
		throw new ValidationError(result.error);
	}

	const { sourceCrs, targetCrs, location } = result.data;
	const services = getServices();
	return await services.suggestTransformation(sourceCrs, targetCrs, location);
}
