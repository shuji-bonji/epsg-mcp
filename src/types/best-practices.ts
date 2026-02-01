/**
 * ベストプラクティス関連型定義
 */

export const BEST_PRACTICE_TOPICS = [
	'japan_survey',
	'web_mapping',
	'data_exchange',
	'coordinate_storage',
	'mobile_gps',
	'cross_border',
	'historical_data',
	'gis_integration',
	'precision_requirements',
	'projection_selection',
] as const;

export type BestPracticeTopic = (typeof BEST_PRACTICE_TOPICS)[number];

export function isBestPracticeTopic(value: string): value is BestPracticeTopic {
	return BEST_PRACTICE_TOPICS.includes(value as BestPracticeTopic);
}

export type PracticePriority = 'must' | 'should' | 'may';

export interface Practice {
	title: string;
	description: string;
	example?: string;
	codeExample?: string;
	priority: PracticePriority;
	rationale: string;
}

export interface CommonMistake {
	mistake: string;
	consequence: string;
	solution: string;
}

export type ReferenceType = 'official' | 'article' | 'tool';

export interface Reference {
	title: string;
	url?: string;
	type: ReferenceType;
}

export interface GetBestPracticesArgs {
	topic: BestPracticeTopic;
	context?: string;
}

export interface GetBestPracticesOutput {
	topic: string;
	description: string;
	practices: Practice[];
	commonMistakes: CommonMistake[];
	relatedTopics: string[];
	references: Reference[];
}

// データ構造

export interface BestPracticeTopicData {
	description: string;
	practices: Practice[];
	commonMistakes: CommonMistake[];
	relatedTopics: string[];
	references: Reference[];
}

export interface BestPracticesData {
	version: string;
	topics: Record<BestPracticeTopic, BestPracticeTopicData>;
}
