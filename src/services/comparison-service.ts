/**
 * CRS比較サービス
 * 2つのCRSを様々な観点から比較
 */

import { COMPARISON, EPSG } from '../constants/index.js';
import { findCrsById, loadComparisons, loadTransformations } from '../data/loader.js';
import { NotFoundError } from '../errors/index.js';
import type {
	CompareCrsOutput,
	ComparisonAspect,
	ComparisonResult,
	CrsCharacteristics,
	CrsDetail,
	Purpose,
} from '../types/index.js';
import { normalizeCrsCode } from './transformation-service.js';

const ALL_ASPECTS: ComparisonAspect[] = [
	'datum',
	'projection',
	'area_of_use',
	'accuracy',
	'distortion',
	'compatibility',
	'use_cases',
];

const PURPOSE_NAMES: Record<Purpose, string> = {
	web_mapping: 'Web地図',
	distance_calculation: '距離計算',
	area_calculation: '面積計算',
	survey: '測量',
	navigation: 'ナビ',
	data_exchange: 'データ交換',
	data_storage: 'データ保存',
	visualization: '可視化',
};

/**
 * CRSからデータム名を推論
 */
function inferDatumName(crs: CrsDetail): string {
	// datumフィールドがあればそれを使用
	if (crs.datum?.name) {
		return crs.datum.name;
	}
	// CRS名からデータムを推論
	const name = crs.name.toLowerCase();
	const code = crs.code;

	if (name.includes('jgd2011') || code === EPSG.JGD2011) {
		return 'JGD2011';
	}
	if (name.includes('jgd2000') || code === EPSG.JGD2000) {
		return 'JGD2000';
	}
	if (name === 'tokyo' || code === EPSG.TOKYO_DATUM) {
		return 'Tokyo Datum';
	}
	if (name.includes('wgs') || code === EPSG.WGS84 || code === EPSG.WEB_MERCATOR) {
		return 'WGS84';
	}
	// 平面直角座標系はJGD2011ベース
	if (code.match(/EPSG:66(69|7[0-9]|8[0-7])/)) {
		return 'JGD2011';
	}
	return crs.name;
}

/**
 * 測地系を比較
 */
function compareDatum(crs1: CrsDetail, crs2: CrsDetail): ComparisonResult {
	const datum1 = inferDatumName(crs1);
	const datum2 = inferDatumName(crs2);

	let verdict: string;
	if (datum1 === datum2) {
		verdict = '同一の測地系を使用';
	} else if (
		(datum1.includes('WGS') && datum2.includes('JGD2011')) ||
		(datum1.includes('JGD2011') && datum2.includes('WGS'))
	) {
		verdict = '実用上同一（数cm以内の差）';
	} else if (datum1.includes('Tokyo') || datum2.includes('Tokyo')) {
		verdict = '旧測地系を含む。変換時に1-2mの誤差';
	} else if (
		(datum1.includes('JGD2000') && datum2.includes('JGD2011')) ||
		(datum1.includes('JGD2011') && datum2.includes('JGD2000'))
	) {
		verdict = 'JGD2000→JGD2011は地殻変動補正が必要';
	} else {
		verdict = '異なる測地系。変換が必要';
	}

	return {
		aspect: '測地系 (Datum)',
		crs1Value: datum1,
		crs2Value: datum2,
		verdict,
	};
}

/**
 * 投影法を比較
 */
function compareProjection(crs1: CrsDetail, crs2: CrsDetail): ComparisonResult {
	const proj1 = crs1.projection?.method || '地理座標系（投影なし）';
	const proj2 = crs2.projection?.method || '地理座標系（投影なし）';

	let verdict: string;
	if (crs1.type === 'geographic' && crs2.type === 'geographic') {
		verdict = '両方とも地理座標系。投影歪みなし';
	} else if (crs1.type === 'projected' && crs2.type === 'projected') {
		if (proj1 === proj2) {
			verdict = '同一の投影法。パラメータが異なる可能性あり';
		} else {
			verdict = '異なる投影法。歪み特性が異なる';
		}
	} else {
		verdict = '地理座標系と投影座標系の比較。用途に応じて使い分け';
	}

	return {
		aspect: '投影法 (Projection)',
		crs1Value: proj1,
		crs2Value: proj2,
		verdict,
	};
}

/**
 * 適用範囲を比較
 */
function compareAreaOfUse(crs1: CrsDetail, crs2: CrsDetail): ComparisonResult {
	const area1 = crs1.areaOfUse?.description || 'N/A';
	const area2 = crs2.areaOfUse?.description || 'N/A';

	let verdict: string;
	if (area1 === area2) {
		verdict = '同一の適用範囲';
	} else if (area1.includes('World') || area2.includes('World')) {
		verdict = 'グローバルCRSと地域限定CRSの比較';
	} else if (area1.includes('Japan') && area2.includes('Japan')) {
		verdict = '両方とも日本向け。適用地域が異なる可能性';
	} else {
		verdict = '適用範囲が異なる';
	}

	return {
		aspect: '適用範囲 (Area of Use)',
		crs1Value: area1,
		crs2Value: area2,
		verdict,
	};
}

/**
 * 精度を比較
 */
function compareAccuracy(crs1: CrsDetail, crs2: CrsDetail): ComparisonResult {
	const acc1 = crs1.accuracy?.horizontal || crs1.accuracy?.notes || 'N/A';
	const acc2 = crs2.accuracy?.horizontal || crs2.accuracy?.notes || 'N/A';

	let verdict: string;
	if (acc1 === acc2) {
		verdict = '同程度の精度';
	} else if (acc1.includes('cm') && acc2.includes('m')) {
		verdict = `${crs1.code}がより高精度`;
	} else if (acc2.includes('cm') && acc1.includes('m')) {
		verdict = `${crs2.code}がより高精度`;
	} else {
		verdict = '精度特性が異なる';
	}

	return {
		aspect: '精度 (Accuracy)',
		crs1Value: acc1,
		crs2Value: acc2,
		verdict,
	};
}

/**
 * 歪み特性を比較
 */
async function compareDistortion(crs1: CrsDetail, crs2: CrsDetail): Promise<ComparisonResult> {
	const comparisons = await loadComparisons();
	const chars1 = comparisons.crsCharacteristics[crs1.code];
	const chars2 = comparisons.crsCharacteristics[crs2.code];

	const dist1 = chars1?.distortion?.note || getDefaultDistortion(crs1);
	const dist2 = chars2?.distortion?.note || getDefaultDistortion(crs2);

	let verdict: string;
	if (crs1.type === 'geographic' && crs2.type === 'geographic') {
		verdict = '両方とも地理座標系。投影歪みなし';
	} else if (crs1.code === EPSG.WEB_MERCATOR || crs2.code === EPSG.WEB_MERCATOR) {
		verdict = 'Web Mercatorは面積・距離計算に大きな歪み';
	} else {
		verdict = '歪み特性が異なる';
	}

	return {
		aspect: '歪み特性 (Distortion)',
		crs1Value: dist1,
		crs2Value: dist2,
		verdict,
	};
}

function getDefaultDistortion(crs: CrsDetail): string {
	if (crs.type === 'geographic') {
		return '地理座標系（投影歪みなし）';
	}
	if (crs.code === EPSG.WEB_MERCATOR) {
		return '高緯度で面積歪み大';
	}
	return '投影座標系（限定範囲で高精度）';
}

/**
 * 互換性を比較
 */
async function compareCompatibility(crs1: CrsDetail, crs2: CrsDetail): Promise<ComparisonResult> {
	const comparisons = await loadComparisons();
	const chars1 = comparisons.crsCharacteristics[crs1.code];
	const chars2 = comparisons.crsCharacteristics[crs2.code];

	const comp1 = chars1 ? formatCompatibility(chars1) : getDefaultCompatibility(crs1);
	const comp2 = chars2 ? formatCompatibility(chars2) : getDefaultCompatibility(crs2);

	let verdict: string;
	if (crs1.code === EPSG.WGS84 || crs2.code === EPSG.WGS84) {
		verdict = 'WGS84は最も広く互換性がある';
	} else if (crs1.code === EPSG.WEB_MERCATOR || crs2.code === EPSG.WEB_MERCATOR) {
		verdict = 'Web MercatorはWeb地図ライブラリで標準';
	} else {
		verdict = '互換性が異なる';
	}

	return {
		aspect: '互換性 (Compatibility)',
		crs1Value: comp1,
		crs2Value: comp2,
		verdict,
	};
}

function formatCompatibility(chars: CrsCharacteristics): string {
	const entries = Object.entries(chars.compatibility);
	const high = entries.filter(([, v]) => v.includes('高') || v.includes('最高'));
	if (high.length === 0) return '限定的';
	return `${high.map(([k]) => k.toUpperCase()).join('/')}で高互換`;
}

function getDefaultCompatibility(crs: CrsDetail): string {
	if (crs.type === 'geographic') {
		return 'GIS/GPS互換';
	}
	return '限定的';
}

/**
 * 用途適性を比較
 */
async function compareUseCases(crs1: CrsDetail, crs2: CrsDetail): Promise<ComparisonResult> {
	const comparisons = await loadComparisons();
	const chars1 = comparisons.crsCharacteristics[crs1.code];
	const chars2 = comparisons.crsCharacteristics[crs2.code];

	const scores1 = chars1?.useCasesScore || {};
	const scores2 = chars2?.useCasesScore || {};

	const purposes = Object.keys(PURPOSE_NAMES) as Purpose[];

	const better1: string[] = []; // crs1が優位な用途
	const better2: string[] = []; // crs2が優位な用途

	for (const p of purposes) {
		const s1 = scores1[p] || 50;
		const s2 = scores2[p] || 50;
		const diff = s1 - s2;
		if (diff >= COMPARISON.SCORE_DIFFERENCE_THRESHOLD) {
			better1.push(`${PURPOSE_NAMES[p]}(+${diff})`);
		} else if (diff <= -COMPARISON.SCORE_DIFFERENCE_THRESHOLD) {
			better2.push(`${PURPOSE_NAMES[p]}(+${-diff})`);
		}
	}

	let verdict: string;
	if (better1.length === 0 && better2.length === 0) {
		verdict = '用途適性は同程度';
	} else {
		const parts: string[] = [];
		if (better1.length > 0) parts.push(`${crs1.code}優位: ${better1.join(', ')}`);
		if (better2.length > 0) parts.push(`${crs2.code}優位: ${better2.join(', ')}`);
		verdict = parts.join(' / ');
	}

	return {
		aspect: '用途適性 (Use Cases)',
		crs1Value: formatScoreSummary(scores1),
		crs2Value: formatScoreSummary(scores2),
		verdict,
	};
}

function formatScoreSummary(scores: Record<string, number>): string {
	const entries = Object.entries(scores) as Array<[Purpose, number]>;
	const high = entries
		.filter(([, v]) => v >= COMPARISON.HIGH_SUITABILITY_THRESHOLD)
		.map(([k]) => PURPOSE_NAMES[k as Purpose] || k);
	if (high.length === 0) return '特になし';
	return `高適性: ${high.slice(0, COMPARISON.MAX_SUMMARY_ITEMS).join(', ')}`;
}

/**
 * 各観点で比較を実行
 */
async function compareAspect(
	crs1: CrsDetail,
	crs2: CrsDetail,
	aspect: ComparisonAspect
): Promise<ComparisonResult> {
	switch (aspect) {
		case 'datum':
			return compareDatum(crs1, crs2);
		case 'projection':
			return compareProjection(crs1, crs2);
		case 'area_of_use':
			return compareAreaOfUse(crs1, crs2);
		case 'accuracy':
			return compareAccuracy(crs1, crs2);
		case 'distortion':
			return compareDistortion(crs1, crs2);
		case 'compatibility':
			return compareCompatibility(crs1, crs2);
		case 'use_cases':
			return compareUseCases(crs1, crs2);
		default:
			throw new Error(`Unknown comparison aspect: ${aspect}`);
	}
}

/**
 * サマリーを生成
 */
function generateSummary(crs1: CrsDetail, crs2: CrsDetail): string {
	// 特定のパターンに基づいてサマリーを生成
	if (
		(crs1.code === EPSG.WGS84 && crs2.code === EPSG.JGD2011) ||
		(crs1.code === EPSG.JGD2011 && crs2.code === EPSG.WGS84)
	) {
		return 'WGS84とJGD2011は実用上同一（数cm以内）。日本国内データはJGD2011推奨。';
	}

	if (
		(crs1.code === EPSG.WGS84 && crs2.code === EPSG.WEB_MERCATOR) ||
		(crs1.code === EPSG.WEB_MERCATOR && crs2.code === EPSG.WGS84)
	) {
		return '地理座標系とWeb Mercatorの比較。Web地図表示は3857、データ保存は4326推奨。';
	}

	if (
		(crs1.code === EPSG.JGD2000 && crs2.code === EPSG.JGD2011) ||
		(crs1.code === EPSG.JGD2011 && crs2.code === EPSG.JGD2000)
	) {
		return 'JGD2000からJGD2011への移行は2011年地震後の地殻変動補正のため必要。';
	}

	if (crs1.type !== crs2.type) {
		return '地理座標系と投影座標系の比較。用途に応じて使い分けが必要。';
	}

	return `${crs1.name}と${crs2.name}の比較。それぞれの特性を確認してください。`;
}

/**
 * 推奨を生成
 */
function generateRecommendation(crs1: CrsDetail, crs2: CrsDetail): string {
	// 非推奨CRSの場合
	if (crs1.deprecated) {
		return `${crs1.code}は非推奨です。${crs1.supersededBy || crs2.code}への移行を推奨します。`;
	}
	if (crs2.deprecated) {
		return `${crs2.code}は非推奨です。${crs2.supersededBy || crs1.code}への移行を推奨します。`;
	}

	// 用途による推奨
	if (crs1.type === 'geographic' && crs2.type === 'projected') {
		return '広域データの保存には地理座標系、局所的な計算には投影座標系を使用してください。';
	}

	if (crs1.type === 'projected' && crs2.type === 'geographic') {
		return '広域データの保存には地理座標系、局所的な計算には投影座標系を使用してください。';
	}

	return '用途と対象地域に応じて適切なCRSを選択してください。';
}

/**
 * 変換に関する注記を取得
 */
async function getTransformationNote(code1: string, code2: string): Promise<string | undefined> {
	const transformations = await loadTransformations();

	// 直接変換が存在するか
	const direct = transformations.transformations.find(
		(t) =>
			(t.from === code1 && t.to === code2) || (t.from === code2 && t.to === code1 && t.reversible)
	);

	if (direct) {
		return `変換方法: ${direct.method}。精度: ${direct.accuracy}`;
	}

	// 非推奨変換の警告
	if (transformations.deprecatedTransformations[code1]) {
		return transformations.deprecatedTransformations[code1].note;
	}
	if (transformations.deprecatedTransformations[code2]) {
		return transformations.deprecatedTransformations[code2].note;
	}

	return undefined;
}

/**
 * 2つのCRSを比較
 */
export async function compareCrs(
	crs1Input: string,
	crs2Input: string,
	aspects?: ComparisonAspect[]
): Promise<CompareCrsOutput> {
	const code1 = normalizeCrsCode(crs1Input);
	const code2 = normalizeCrsCode(crs2Input);

	// CRS詳細取得
	const detail1 = await findCrsById(code1);
	const detail2 = await findCrsById(code2);

	if (!detail1) {
		throw new NotFoundError('CRS', code1);
	}
	if (!detail2) {
		throw new NotFoundError('CRS', code2);
	}

	// 比較観点決定
	const targetAspects = aspects && aspects.length > 0 ? aspects : ALL_ASPECTS;

	// 各観点で比較
	const comparison: ComparisonResult[] = [];
	for (const aspect of targetAspects) {
		const result = await compareAspect(detail1, detail2, aspect);
		comparison.push(result);
	}

	// サマリー・推奨生成
	const summary = generateSummary(detail1, detail2);
	const recommendation = generateRecommendation(detail1, detail2);

	// 変換注記
	const transformationNote = await getTransformationNote(code1, code2);

	return {
		comparison,
		summary,
		recommendation,
		transformationNote,
	};
}
