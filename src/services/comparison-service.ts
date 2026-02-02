/**
 * CRS比較サービス
 * 2つのCRSを様々な観点から比較
 */

import {
	ACCURACY_VERDICTS,
	AREA_VERDICTS,
	ASPECT_NAMES,
	COMPARISON,
	COMPATIBILITY_FORMATS,
	COMPATIBILITY_VERDICTS,
	DATUM_NAMES,
	DATUM_VERDICTS,
	DISTORTION_DEFAULTS,
	DISTORTION_VERDICTS,
	EPSG,
	ERRORS,
	PLACEHOLDERS,
	PROJECTION_VERDICTS,
	PURPOSE_NAMES,
	RECOMMENDATIONS,
	SCORE_SUMMARY,
	SUMMARIES,
	TRANSFORMATION_NOTES,
	USE_CASE_VERDICTS,
} from '../constants/index.js';
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
		return DATUM_NAMES.JGD2011;
	}
	if (name.includes('jgd2000') || code === EPSG.JGD2000) {
		return DATUM_NAMES.JGD2000;
	}
	if (name === 'tokyo' || code === EPSG.TOKYO_DATUM) {
		return DATUM_NAMES.TOKYO;
	}
	if (name.includes('wgs') || code === EPSG.WGS84 || code === EPSG.WEB_MERCATOR) {
		return DATUM_NAMES.WGS84;
	}
	// 平面直角座標系はJGD2011ベース
	if (code.match(/EPSG:66(69|7[0-9]|8[0-7])/)) {
		return DATUM_NAMES.JGD2011;
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
		verdict = DATUM_VERDICTS.SAME;
	} else if (
		(datum1.includes('WGS') && datum2.includes('JGD2011')) ||
		(datum1.includes('JGD2011') && datum2.includes('WGS'))
	) {
		verdict = DATUM_VERDICTS.PRACTICALLY_IDENTICAL;
	} else if (datum1.includes('Tokyo') || datum2.includes('Tokyo')) {
		verdict = DATUM_VERDICTS.LEGACY_DATUM;
	} else if (
		(datum1.includes('JGD2000') && datum2.includes('JGD2011')) ||
		(datum1.includes('JGD2011') && datum2.includes('JGD2000'))
	) {
		verdict = DATUM_VERDICTS.CRUSTAL_DEFORMATION;
	} else {
		verdict = DATUM_VERDICTS.DIFFERENT;
	}

	return {
		aspect: ASPECT_NAMES.datum,
		crs1Value: datum1,
		crs2Value: datum2,
		verdict,
	};
}

/**
 * 投影法を比較
 */
function compareProjection(crs1: CrsDetail, crs2: CrsDetail): ComparisonResult {
	const proj1 = crs1.projection?.method || PROJECTION_VERDICTS.NO_PROJECTION;
	const proj2 = crs2.projection?.method || PROJECTION_VERDICTS.NO_PROJECTION;

	let verdict: string;
	if (crs1.type === 'geographic' && crs2.type === 'geographic') {
		verdict = PROJECTION_VERDICTS.BOTH_GEOGRAPHIC;
	} else if (crs1.type === 'projected' && crs2.type === 'projected') {
		if (proj1 === proj2) {
			verdict = PROJECTION_VERDICTS.SAME_METHOD;
		} else {
			verdict = PROJECTION_VERDICTS.DIFFERENT_METHOD;
		}
	} else {
		verdict = PROJECTION_VERDICTS.GEOGRAPHIC_VS_PROJECTED;
	}

	return {
		aspect: ASPECT_NAMES.projection,
		crs1Value: proj1,
		crs2Value: proj2,
		verdict,
	};
}

/**
 * 適用範囲を比較
 */
function compareAreaOfUse(crs1: CrsDetail, crs2: CrsDetail): ComparisonResult {
	const area1 = crs1.areaOfUse?.description || PLACEHOLDERS.NA;
	const area2 = crs2.areaOfUse?.description || PLACEHOLDERS.NA;

	let verdict: string;
	if (area1 === area2) {
		verdict = AREA_VERDICTS.SAME;
	} else if (area1.includes('World') || area2.includes('World')) {
		verdict = AREA_VERDICTS.GLOBAL_VS_REGIONAL;
	} else if (area1.includes('Japan') && area2.includes('Japan')) {
		verdict = AREA_VERDICTS.BOTH_JAPAN;
	} else {
		verdict = AREA_VERDICTS.DIFFERENT;
	}

	return {
		aspect: ASPECT_NAMES.area_of_use,
		crs1Value: area1,
		crs2Value: area2,
		verdict,
	};
}

/**
 * 精度を比較
 */
function compareAccuracy(crs1: CrsDetail, crs2: CrsDetail): ComparisonResult {
	const acc1 = crs1.accuracy?.horizontal || crs1.accuracy?.notes || PLACEHOLDERS.NA;
	const acc2 = crs2.accuracy?.horizontal || crs2.accuracy?.notes || PLACEHOLDERS.NA;

	let verdict: string;
	if (acc1 === acc2) {
		verdict = ACCURACY_VERDICTS.SIMILAR;
	} else if (acc1.includes('cm') && acc2.includes('m')) {
		verdict = ACCURACY_VERDICTS.HIGHER(crs1.code);
	} else if (acc2.includes('cm') && acc1.includes('m')) {
		verdict = ACCURACY_VERDICTS.HIGHER(crs2.code);
	} else {
		verdict = ACCURACY_VERDICTS.DIFFERENT;
	}

	return {
		aspect: ASPECT_NAMES.accuracy,
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
		verdict = DISTORTION_VERDICTS.NO_PROJECTION;
	} else if (crs1.code === EPSG.WEB_MERCATOR || crs2.code === EPSG.WEB_MERCATOR) {
		verdict = DISTORTION_VERDICTS.WEB_MERCATOR;
	} else {
		verdict = DISTORTION_VERDICTS.DIFFERENT;
	}

	return {
		aspect: ASPECT_NAMES.distortion,
		crs1Value: dist1,
		crs2Value: dist2,
		verdict,
	};
}

function getDefaultDistortion(crs: CrsDetail): string {
	if (crs.type === 'geographic') {
		return DISTORTION_DEFAULTS.GEOGRAPHIC;
	}
	if (crs.code === EPSG.WEB_MERCATOR) {
		return DISTORTION_DEFAULTS.WEB_MERCATOR;
	}
	return DISTORTION_DEFAULTS.PROJECTED;
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
		verdict = COMPATIBILITY_VERDICTS.WGS84_WIDEST;
	} else if (crs1.code === EPSG.WEB_MERCATOR || crs2.code === EPSG.WEB_MERCATOR) {
		verdict = COMPATIBILITY_VERDICTS.WEB_MERCATOR_STANDARD;
	} else {
		verdict = COMPATIBILITY_VERDICTS.DIFFERENT;
	}

	return {
		aspect: ASPECT_NAMES.compatibility,
		crs1Value: comp1,
		crs2Value: comp2,
		verdict,
	};
}

function formatCompatibility(chars: CrsCharacteristics): string {
	const entries = Object.entries(chars.compatibility);
	const high = entries.filter(
		([, v]) => v.includes('高') || v.includes('最高') || v.toLowerCase().includes('high')
	);
	if (high.length === 0) return COMPATIBILITY_FORMATS.LIMITED;
	return COMPATIBILITY_FORMATS.HIGH_WITH(high.map(([k]) => k.toUpperCase()).join('/'));
}

function getDefaultCompatibility(crs: CrsDetail): string {
	if (crs.type === 'geographic') {
		return COMPATIBILITY_FORMATS.GIS_GPS;
	}
	return COMPATIBILITY_FORMATS.LIMITED;
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
		verdict = USE_CASE_VERDICTS.SIMILAR;
	} else {
		const parts: string[] = [];
		if (better1.length > 0) parts.push(USE_CASE_VERDICTS.BETTER_FOR(crs1.code, better1.join(', ')));
		if (better2.length > 0) parts.push(USE_CASE_VERDICTS.BETTER_FOR(crs2.code, better2.join(', ')));
		verdict = parts.join(' / ');
	}

	return {
		aspect: ASPECT_NAMES.use_cases,
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
	if (high.length === 0) return SCORE_SUMMARY.NONE;
	return SCORE_SUMMARY.HIGH_SUITABILITY(high.slice(0, COMPARISON.MAX_SUMMARY_ITEMS).join(', '));
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
			throw new Error(ERRORS.UNKNOWN_ASPECT(aspect));
	}
}

/**
 * サマリーを生成
 */
function generateSummary(crs1: CrsDetail, crs2: CrsDetail): string {
	// Generate summary based on specific patterns
	if (
		(crs1.code === EPSG.WGS84 && crs2.code === EPSG.JGD2011) ||
		(crs1.code === EPSG.JGD2011 && crs2.code === EPSG.WGS84)
	) {
		return SUMMARIES.WGS84_JGD2011;
	}

	if (
		(crs1.code === EPSG.WGS84 && crs2.code === EPSG.WEB_MERCATOR) ||
		(crs1.code === EPSG.WEB_MERCATOR && crs2.code === EPSG.WGS84)
	) {
		return SUMMARIES.WGS84_WEB_MERCATOR;
	}

	if (
		(crs1.code === EPSG.JGD2000 && crs2.code === EPSG.JGD2011) ||
		(crs1.code === EPSG.JGD2011 && crs2.code === EPSG.JGD2000)
	) {
		return SUMMARIES.JGD2000_JGD2011;
	}

	if (crs1.type !== crs2.type) {
		return SUMMARIES.GEOGRAPHIC_VS_PROJECTED;
	}

	return SUMMARIES.DEFAULT(crs1.name, crs2.name);
}

/**
 * 推奨を生成
 */
function generateRecommendation(crs1: CrsDetail, crs2: CrsDetail): string {
	// For deprecated CRS
	if (crs1.deprecated) {
		return RECOMMENDATIONS.DEPRECATED(crs1.code, crs1.supersededBy || crs2.code);
	}
	if (crs2.deprecated) {
		return RECOMMENDATIONS.DEPRECATED(crs2.code, crs2.supersededBy || crs1.code);
	}

	// Recommendations by use case
	if (crs1.type === 'geographic' && crs2.type === 'projected') {
		return RECOMMENDATIONS.GEOGRAPHIC_VS_PROJECTED;
	}

	if (crs1.type === 'projected' && crs2.type === 'geographic') {
		return RECOMMENDATIONS.GEOGRAPHIC_VS_PROJECTED;
	}

	return RECOMMENDATIONS.CHOOSE_BASED_ON_USE;
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
		return TRANSFORMATION_NOTES.METHOD_ACCURACY(direct.method, direct.accuracy);
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

	// CRS詳細とComparisonsを並列で取得（パフォーマンス最適化）
	const [detail1, detail2] = await Promise.all([findCrsById(code1), findCrsById(code2)]);

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
