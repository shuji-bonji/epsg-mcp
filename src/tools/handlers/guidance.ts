/**
 * ガイダンス系ハンドラー（ベストプラクティス・トラブルシューティング）
 */

import { ValidationError } from '../../errors/index.js';
import { GetBestPracticesSchema, TroubleshootSchema } from '../../schemas/index.js';
import { getServices } from '../../services/registry.js';

export async function handleGetBestPractices(args: unknown) {
	const result = GetBestPracticesSchema.safeParse(args);
	if (!result.success) {
		throw new ValidationError(result.error);
	}

	const { topic, context } = result.data;
	const services = getServices();
	return await services.getBestPractices(topic, context);
}

export async function handleTroubleshoot(args: unknown) {
	const result = TroubleshootSchema.safeParse(args);
	if (!result.success) {
		throw new ValidationError(result.error);
	}

	const { symptom, context } = result.data;
	const services = getServices();
	return await services.troubleshoot(symptom, context);
}
