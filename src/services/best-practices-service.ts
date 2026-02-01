/**
 * ベストプラクティスサービス
 * CRS利用のベストプラクティスを提供
 */

import { loadBestPractices } from '../data/loader.js';
import { NotFoundError } from '../errors/index.js';
import type { BestPracticeTopic, GetBestPracticesOutput } from '../types/index.js';

/**
 * 指定されたトピックのベストプラクティスを取得
 */
export async function getBestPractices(
	topic: BestPracticeTopic,
	_context?: string
): Promise<GetBestPracticesOutput> {
	const data = await loadBestPractices();
	const topicData = data.topics[topic];

	if (!topicData) {
		throw new NotFoundError('BestPractice', topic);
	}

	return {
		topic,
		description: topicData.description,
		practices: topicData.practices,
		commonMistakes: topicData.commonMistakes,
		relatedTopics: topicData.relatedTopics,
		references: topicData.references,
	};
}

/**
 * 利用可能なトピック一覧を取得
 */
export async function listBestPracticeTopics(): Promise<string[]> {
	const data = await loadBestPractices();
	return Object.keys(data.topics);
}
