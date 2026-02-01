/**
 * 変換経路提案サービス
 * CRS間の最適な変換経路をBFSで探索
 */

import {
	ACCURACY_PRIORITY,
	COMPLEXITY_THRESHOLD,
	TRANSFORMATION,
	WIDE_AREA_THRESHOLD,
} from '../constants/index.js';
import { loadTransformations } from '../data/loader.js';
import { NotFoundError } from '../errors/index.js';
import { MESSAGES } from '../messages/index.js';
import type {
	LocationSpec,
	SuggestTransformationOutput,
	TransformationComplexity,
	TransformationPath,
	TransformationRecord,
	TransformationStep,
	TransformationsData,
} from '../types/index.js';

interface TransformationSearchOptions {
	maxSteps?: number; // デフォルト: TRANSFORMATION.MAX_STEPS
	maxPaths?: number; // デフォルト: TRANSFORMATION.MAX_PATHS（早期終了用）
}

interface GraphEdge {
	to: string;
	record: TransformationRecord;
	isReverse: boolean;
}

// グラフキャッシュ（モジュールレベル）
let cachedGraph: Map<string, GraphEdge[]> | null = null;
let cachedDataVersion: string | null = null;

/**
 * EPSGコードを正規化（EPSG:プレフィックスを追加）
 */
export function normalizeCrsCode(code: string): string {
	const numericCode = code.replace(/^EPSG:/i, '').trim();
	return `EPSG:${numericCode}`;
}

/**
 * 変換グラフを構築（逆方向変換も含む）- キャッシュ付き
 */
function buildTransformationGraph(data: TransformationsData): Map<string, GraphEdge[]> {
	// キャッシュが有効ならそれを返す
	if (cachedGraph && cachedDataVersion === data.version) {
		return cachedGraph;
	}

	const graph = new Map<string, GraphEdge[]>();

	for (const t of data.transformations) {
		// 順方向
		if (!graph.has(t.from)) graph.set(t.from, []);
		graph.get(t.from)!.push({ to: t.to, record: t, isReverse: false });

		// 逆方向（reversible: true の場合）
		if (t.reversible) {
			if (!graph.has(t.to)) graph.set(t.to, []);
			graph.get(t.to)!.push({ to: t.from, record: t, isReverse: true });
		}
	}

	// キャッシュに保存
	cachedGraph = graph;
	cachedDataVersion = data.version;

	return graph;
}

/**
 * グラフキャッシュをクリア（テスト用）
 */
export function clearGraphCache(): void {
	cachedGraph = null;
	cachedDataVersion = null;
}

/**
 * 精度文字列から優先度を算出（低いほど高精度）
 */
function getAccuracyPriority(accuracy: string): number {
	if (accuracy.includes('実用上同一') || accuracy.includes('高精度')) return ACCURACY_PRIORITY.HIGH;
	if (accuracy.includes('cm')) return ACCURACY_PRIORITY.CENTIMETER;
	if (accuracy.includes('なし')) return ACCURACY_PRIORITY.NO_ERROR;
	if (accuracy.includes('1-2m') || accuracy.includes('数m')) return ACCURACY_PRIORITY.METER;
	return ACCURACY_PRIORITY.UNKNOWN;
}

/**
 * 複数ステップの精度を統合（最も悪い精度を採用）
 */
function calculateTotalAccuracy(steps: TransformationStep[]): string {
	if (steps.length === 0) return MESSAGES.accuracy.NO_TRANSFORMATION;
	if (steps.length === 1) return steps[0].accuracy;

	const accuracies = steps.map((s) => s.accuracy);
	const hasLargeError = accuracies.some(
		(a) => a.includes('1-2m') || a.includes('数m') || a.includes('以上')
	);
	const hasCmError = accuracies.some((a) => a.includes('cm'));
	const hasNoError = accuracies.some((a) => a.includes('なし') || a.includes('座標変換のみ'));

	if (hasLargeError) return MESSAGES.accuracy.CUMULATIVE_ERROR_WARNING;
	if (hasCmError) return MESSAGES.accuracy.CM_TO_M_RANGE;
	if (hasNoError) return accuracies[0];
	return MESSAGES.accuracy.UNKNOWN;
}

/**
 * 複雑度を決定
 */
function determineComplexity(stepCount: number): TransformationComplexity {
	if (stepCount <= COMPLEXITY_THRESHOLD.SIMPLE_MAX) return 'simple';
	if (stepCount <= COMPLEXITY_THRESHOLD.MODERATE_MAX) return 'moderate';
	return 'complex';
}

/**
 * 広域データかどうかを判定
 */
export function isWideArea(location: LocationSpec): boolean {
	if (location.boundingBox) {
		const { north, south, east, west } = location.boundingBox;
		const latSpan = north - south;
		const lngSpan = east - west;
		return (
			latSpan > WIDE_AREA_THRESHOLD.LAT_SPAN_DEGREES ||
			lngSpan > WIDE_AREA_THRESHOLD.LNG_SPAN_DEGREES
		);
	}
	return false;
}

/**
 * BFSで変換経路を探索（最大 maxSteps ステップ）
 * 最適化版: グラフキャッシュ、インデックスベースキュー、早期終了
 */
function findPaths(
	source: string,
	target: string,
	data: TransformationsData,
	options: TransformationSearchOptions = {}
): TransformationPath[] {
	const maxSteps = options.maxSteps ?? TRANSFORMATION.MAX_STEPS;
	const maxPaths = options.maxPaths ?? TRANSFORMATION.MAX_PATHS;
	const graph = buildTransformationGraph(data);
	const paths: TransformationPath[] = [];

	// 最短パス長を記録（早期終了用）
	let shortestPathLength = Number.POSITIVE_INFINITY;

	// BFS用のキュー: [現在のCRS, これまでのステップ, 訪問済みセット]
	// インデックスベースでshift()のO(n)を回避
	const queue: Array<[string, TransformationStep[], Set<string>]> = [
		[source, [], new Set([source])],
	];
	let queueIndex = 0;

	while (queueIndex < queue.length) {
		const [current, steps, visited] = queue[queueIndex++];

		// 最短パスより長くなったら探索終了（早期終了）
		if (steps.length >= shortestPathLength) continue;
		if (steps.length >= maxSteps) continue;

		const edges = graph.get(current) || [];
		for (const edge of edges) {
			// 既に訪問済みならスキップ
			if (visited.has(edge.to)) continue;

			const step: TransformationStep = {
				from: current,
				to: edge.to,
				method: edge.isReverse ? `${edge.record.method} (逆変換)` : edge.record.method,
				accuracy: edge.record.accuracy,
				epsgCode: edge.record.id,
				notes: edge.isReverse ? edge.record.reverseNote : edge.record.notes,
				isReverse: edge.isReverse,
			};

			// 目的地到達時のみ新配列を作成（最適化）
			if (edge.to === target) {
				const newSteps = [...steps, step];
				paths.push({
					steps: newSteps,
					totalAccuracy: calculateTotalAccuracy(newSteps),
					complexity: determineComplexity(newSteps.length),
					estimatedPrecisionLoss: newSteps.length > 1 ? '累積誤差に注意' : undefined,
				});

				// 最短パス長を更新
				if (newSteps.length < shortestPathLength) {
					shortestPathLength = newSteps.length;
				}

				// 十分なパスが見つかったら終了
				if (paths.length >= maxPaths) break;
			} else {
				// 探索を続行
				const newSteps = [...steps, step];
				const newVisited = new Set(visited);
				newVisited.add(edge.to);
				queue.push([edge.to, newSteps, newVisited]);
			}
		}

		// 十分なパスが見つかったら終了
		if (paths.length >= maxPaths) break;
	}

	// ステップ数、精度優先度でソート（短い経路、高精度を優先）
	return paths.sort((a, b) => {
		// まずステップ数で比較
		if (a.steps.length !== b.steps.length) {
			return a.steps.length - b.steps.length;
		}
		// 同じステップ数なら精度で比較
		const aPriority = Math.max(...a.steps.map((s) => getAccuracyPriority(s.accuracy)));
		const bPriority = Math.max(...b.steps.map((s) => getAccuracyPriority(s.accuracy)));
		return aPriority - bPriority;
	});
}

/**
 * 推奨パスを選択
 */
function selectRecommendedPath(
	directPath: TransformationPath | null,
	viaPaths: TransformationPath[]
): TransformationPath {
	// 直接パスがあれば最優先
	if (directPath) {
		return directPath;
	}

	// viaPathsから最適なものを選択
	if (viaPaths.length > 0) {
		return viaPaths[0]; // 既にソート済み
	}

	// パスが見つからない場合のフォールバック
	return {
		steps: [],
		totalAccuracy: '変換経路が見つかりません',
		complexity: 'complex',
	};
}

/**
 * 変換経路を提案
 */
export async function suggestTransformation(
	sourceCrs: string,
	targetCrs: string,
	location?: LocationSpec
): Promise<SuggestTransformationOutput> {
	const source = normalizeCrsCode(sourceCrs);
	const target = normalizeCrsCode(targetCrs);
	const warnings: string[] = [];

	// 同一CRSチェック
	if (source === target) {
		return {
			directPath: null,
			viaPaths: [],
			recommended: {
				steps: [],
				totalAccuracy: MESSAGES.transformation.NO_TRANSFORMATION_NEEDED,
				complexity: 'simple',
			},
			warnings: [MESSAGES.transformation.SAME_CRS],
		};
	}

	const transformData = await loadTransformations();

	// 非推奨チェック
	if (transformData.deprecatedTransformations[source]) {
		const info = transformData.deprecatedTransformations[source];
		warnings.push(MESSAGES.transformation.DEPRECATED_CRS(source, info.note, info.migrateTo));
	}

	// 全パスを探索
	const allPaths = findPaths(source, target, transformData, { maxSteps: 4 });

	// 直接パスとviaパスを分離
	const directPath = allPaths.find((p) => p.steps.length === 1) || null;
	const viaPaths = allPaths.filter((p) => p.steps.length > 1);

	// パスが見つからない場合
	if (allPaths.length === 0) {
		throw new NotFoundError(
			'Transformation',
			MESSAGES.transformation.NO_PATH_FOUND(source, target)
		);
	}

	// 推奨パスを決定
	const recommended = selectRecommendedPath(directPath, viaPaths);

	// 位置特有の警告
	if (location && isWideArea(location)) {
		warnings.push(MESSAGES.transformation.WIDE_AREA_WARNING);
	}

	// 複雑な経路の警告
	if (recommended.complexity === 'complex') {
		warnings.push(MESSAGES.transformation.COMPLEX_PATH_WARNING);
	}

	return {
		directPath,
		viaPaths,
		recommended,
		warnings,
	};
}
