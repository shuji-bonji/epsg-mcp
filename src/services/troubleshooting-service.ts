/**
 * トラブルシューティングサービス
 * 症状からCRS関連問題を診断・解決策を提案
 */

import { loadTroubleshooting } from '../data/loader.js';
import type {
	Cause,
	Solution,
	SymptomData,
	TroubleshootContext,
	TroubleshootingData,
	TroubleshootOutput,
} from '../types/index.js';

/**
 * キーワードを長さ順にソート（長いキーワードを優先）
 * より具体的なキーワードでマッチングするため
 */
function sortKeywordsByLength(keywords: string[]): string[] {
	return [...keywords].sort((a, b) => b.length - a.length);
}

/**
 * 症状テキストからマッチする症状カテゴリを特定
 * キーワードを長さ順にチェックし、より具体的なマッチを優先
 */
function matchSymptom(
	symptomText: string,
	data: TroubleshootingData
): { symptomId: string; symptomData: SymptomData; matchScore: number }[] {
	const matches: Map<string, number> = new Map();
	const normalizedText = symptomText.toLowerCase();

	// keywordMappingからマッチング（長いキーワードを優先）
	const sortedKeywords = sortKeywordsByLength(Object.keys(data.keywordMapping));

	for (const keyword of sortedKeywords) {
		if (normalizedText.includes(keyword.toLowerCase())) {
			const symptomIds = data.keywordMapping[keyword];
			for (const id of symptomIds) {
				// 長いキーワードでマッチするほど高スコア
				const score = (matches.get(id) || 0) + keyword.length;
				matches.set(id, score);
			}
		}
	}

	// 各症状の固有キーワードもチェック
	for (const [id, symptomData] of Object.entries(data.symptoms)) {
		const sortedSymptomKeywords = sortKeywordsByLength(symptomData.keywords);
		for (const keyword of sortedSymptomKeywords) {
			if (normalizedText.includes(keyword.toLowerCase())) {
				// 症状固有キーワードは高いウェイト
				const score = (matches.get(id) || 0) + keyword.length * 1.5;
				matches.set(id, score);
			}
		}
	}

	// スコア順にソートして結果を返す
	return Array.from(matches.entries())
		.sort((a, b) => b[1] - a[1])
		.map(([id, score]) => ({
			symptomId: id,
			symptomData: data.symptoms[id],
			matchScore: score,
		}));
}

/**
 * コンテキストに基づいて原因の可能性を調整
 */
function adjustCauseLikelihood(causes: Cause[], context?: TroubleshootContext): Cause[] {
	if (!context) return causes;

	return causes.map((cause) => {
		let adjustedLikelihood = cause.likelihood;

		// Tokyo Datum関連のコンテキスト
		if (context.sourceCrs?.includes('4301') || context.targetCrs?.includes('4301')) {
			if (cause.cause.includes('Tokyo Datum')) {
				adjustedLikelihood = 'high';
			}
		}

		// 変換エラーコンテキスト
		if (context.tool) {
			if (cause.cause.includes('変換パラメータ') && context.tool.toLowerCase().includes('qgis')) {
				adjustedLikelihood = adjustedLikelihood === 'low' ? 'medium' : adjustedLikelihood;
			}
		}

		// ずれの大きさに関するコンテキスト
		if (context.magnitude) {
			const magnitude = context.magnitude.toLowerCase();
			if (magnitude.includes('400') || magnitude.includes('数百')) {
				if (cause.cause.includes('測地系')) {
					adjustedLikelihood = 'high';
				}
			} else if (magnitude.includes('cm') || magnitude.includes('センチ')) {
				if (cause.cause.includes('WGS84') || cause.cause.includes('丸め')) {
					adjustedLikelihood = 'high';
				}
			}
		}

		// 地域に関するコンテキスト
		if (context.location) {
			const location = context.location.toLowerCase();
			if (location.includes('東北') && cause.cause.includes('地殻変動')) {
				adjustedLikelihood = 'high';
			}
		}

		return {
			...cause,
			likelihood: adjustedLikelihood,
		};
	});
}

/**
 * 原因を可能性順にソート
 */
function sortCausesByLikelihood(causes: Cause[]): Cause[] {
	const likelihoodOrder: Record<string, number> = {
		high: 1,
		medium: 2,
		low: 3,
	};

	return [...causes].sort((a, b) => likelihoodOrder[a.likelihood] - likelihoodOrder[b.likelihood]);
}

/**
 * 症状に対する解決策を取得
 */
function getSolutionsForCauses(symptomData: SymptomData, causes: Cause[]): Solution[] {
	const solutions: Solution[] = [];
	const highLikelihoodCauses = causes
		.filter((c) => c.likelihood === 'high' || c.likelihood === 'medium')
		.map((c) => c.cause);

	for (const solution of symptomData.solutions) {
		// 可能性の高い原因に対する解決策を優先
		if (highLikelihoodCauses.includes(solution.forCause)) {
			solutions.unshift(solution);
		} else {
			solutions.push(solution);
		}
	}

	return solutions;
}

/**
 * トラブルシューティングを実行
 */
export async function troubleshoot(
	symptom: string,
	context?: TroubleshootContext
): Promise<TroubleshootOutput> {
	const data = await loadTroubleshooting();

	// 症状をマッチング
	const matches = matchSymptom(symptom, data);

	if (matches.length === 0) {
		// マッチしない場合は汎用的な診断ガイダンスを返す
		return {
			matchedSymptom: '不明な症状',
			possibleCauses: [
				{
					likelihood: 'medium',
					cause: '詳細な診断が必要',
					description:
						'入力された症状から特定の問題を特定できませんでした。より具体的な情報を提供してください。',
					indicators: [
						'座標のずれがある場合：ずれの大きさ（cm、m、km）を記載',
						'表示の問題がある場合：エラーメッセージや挙動を記載',
						'変換エラーの場合：使用しているCRSコードを記載',
					],
				},
			],
			diagnosticSteps: [
				{
					step: 1,
					action: '問題の症状を具体的に記述する',
					expected: 'ずれの大きさ、エラーメッセージ、使用しているCRSなど',
					ifFailed: 'より詳細な情報で再度お問い合わせください',
				},
			],
			suggestedSolutions: [],
			relatedBestPractices: ['data_exchange', 'gis_integration'],
			confidence: 'low',
		};
	}

	// 最もマッチした症状を使用
	const bestMatch = matches[0];
	const { symptomData } = bestMatch;

	// コンテキストに基づいて原因の可能性を調整
	const adjustedCauses = adjustCauseLikelihood(symptomData.possibleCauses, context);
	const sortedCauses = sortCausesByLikelihood(adjustedCauses);

	// 解決策を取得
	const solutions = getSolutionsForCauses(symptomData, sortedCauses);

	// 信頼度を計算
	const confidence = calculateConfidence(bestMatch.matchScore, matches.length, context);

	return {
		matchedSymptom: symptomData.description,
		possibleCauses: sortedCauses,
		diagnosticSteps: symptomData.diagnosticSteps,
		suggestedSolutions: solutions,
		relatedBestPractices: symptomData.relatedBestPractices,
		confidence,
	};
}

/**
 * 診断の信頼度を計算
 */
function calculateConfidence(
	matchScore: number,
	totalMatches: number,
	context?: TroubleshootContext
): 'high' | 'medium' | 'low' {
	let score = 0;

	// マッチスコアに基づく評価
	if (matchScore >= 15) score += 2;
	else if (matchScore >= 8) score += 1;

	// 一意なマッチの場合は信頼度向上
	if (totalMatches === 1) score += 1;

	// コンテキストが提供されている場合は信頼度向上
	if (context) {
		if (context.sourceCrs || context.targetCrs) score += 1;
		if (context.magnitude) score += 1;
	}

	if (score >= 4) return 'high';
	if (score >= 2) return 'medium';
	return 'low';
}

/**
 * 利用可能な症状カテゴリ一覧を取得
 */
export async function listSymptomCategories(): Promise<Array<{ id: string; description: string }>> {
	const data = await loadTroubleshooting();
	return Object.entries(data.symptoms).map(([id, symptomData]) => ({
		id,
		description: symptomData.description,
	}));
}
