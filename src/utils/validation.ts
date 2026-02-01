/**
 * CRS使用検証ユーティリティ
 */

import { EPSG, VALIDATION_SCORE } from '../constants/index.js';
import { findCrsById, loadRecommendations } from '../data/loader.js';
import { NotFoundError } from '../errors/index.js';
import { recommendCrs } from '../services/recommendation-service.js';
import type {
	BoundingBox,
	CrsDetail,
	LocationSpec,
	Purpose,
	RecommendedCrs,
	ValidateCrsUsageOutput,
	ValidationIssue,
	ValidationIssueCode,
} from '../types/index.js';
import { applyValidationRules } from './validation-rules.js';

/**
 * 平面直角座標系かどうかを判定
 */
export function isPlaneRectangularCS(code: string): boolean {
	const numericCode = Number.parseInt(code.replace(/^EPSG:/i, ''), 10);
	return numericCode >= EPSG.PLANE_RECT.RANGE_START && numericCode <= EPSG.PLANE_RECT.RANGE_END;
}

/**
 * 非推奨CRSかどうかを判定
 */
export async function isDeprecatedCrs(code: string): Promise<boolean> {
	const recommendations = await loadRecommendations();
	const normalizedCode = code.startsWith('EPSG:') ? code : `EPSG:${code}`;
	return recommendations.validationRules.deprecatedCrs.includes(normalizedCode);
}

/**
 * レガシー測地系かどうかを判定
 */
export async function isLegacyDatum(code: string): Promise<boolean> {
	const recommendations = await loadRecommendations();
	const normalizedCode = code.startsWith('EPSG:') ? code : `EPSG:${code}`;

	return recommendations.validationRules.legacyDatumPatterns.some((pattern) =>
		normalizedCode.startsWith(pattern)
	);
}

/**
 * 場所がCRSの適用範囲内かどうかを判定
 */
export function isLocationWithinArea(
	location: LocationSpec,
	areaOfUse: CrsDetail['areaOfUse']
): boolean {
	if (!areaOfUse?.boundingBox) return true; // バウンディングボックスがなければチェックしない

	const { north, south, east, west } = areaOfUse.boundingBox;

	// centerPointがあればそれで判定
	if (location.centerPoint) {
		const { lat, lng } = location.centerPoint;
		return lat >= south && lat <= north && lng >= west && lng <= east;
	}

	// boundingBoxがあればそれで判定（部分的に含まれていればOK）
	if (location.boundingBox) {
		const locBbox = location.boundingBox;
		// 完全に範囲外かどうかをチェック
		if (
			locBbox.south > north ||
			locBbox.north < south ||
			locBbox.west > east ||
			locBbox.east < west
		) {
			return false;
		}
		return true;
	}

	// 都道府県が指定されていて、areaOfUseにprefecturesがあれば判定
	if (location.prefecture && areaOfUse.prefectures) {
		return areaOfUse.prefectures.includes(location.prefecture);
	}

	return true; // 判定できない場合は範囲内と見なす
}

/**
 * バウンディングボックスが複数の平面直角座標系をまたぐかどうかを判定
 */
export function checkZoneSpan(bbox: BoundingBox): boolean {
	// 簡易的な判定：緯度または経度のスパンが3度以上なら複数系をまたぐ可能性
	const latSpan = bbox.north - bbox.south;
	const lngSpan = bbox.east - bbox.west;

	return latSpan > 3 || lngSpan > 3;
}

/**
 * 用途別検証ルールを適用
 */
async function validateForPurpose(
	crs: CrsDetail,
	purpose: Purpose,
	location: LocationSpec
): Promise<ValidationIssue[]> {
	const recommendations = await loadRecommendations();
	return applyValidationRules(purpose, { crs, location, recommendations });
}

/**
 * スコアを計算
 */
async function calculateValidationScore(issues: ValidationIssue[]): Promise<number> {
	const recommendations = await loadRecommendations();
	const weights = recommendations.validationRules.scoreWeights;

	let score = 100;

	for (const issue of issues) {
		const weightKey = issueCodeToWeightKey(issue.code);
		const weight = weights[weightKey] || 0;
		score += weight; // weightsは負の値
	}

	return Math.max(0, Math.min(100, score));
}

/**
 * IssueCodeをweight keyに変換
 */
function issueCodeToWeightKey(code: ValidationIssueCode): string {
	const mapping: Record<ValidationIssueCode, string> = {
		DEPRECATED_CRS: 'deprecated',
		LEGACY_DATUM: 'legacyDatum',
		AREA_MISMATCH: 'areaMismatch',
		AREA_DISTORTION: 'areaDistortion',
		DISTANCE_DISTORTION: 'distanceDistortion',
		PRECISION_LOSS: 'precisionLoss',
		ZONE_MISMATCH: 'zoneMismatch',
		CROSS_ZONE_CALCULATION: 'crossZone',
		DEPRECATED_STORAGE: 'deprecated',
		GEOJSON_INCOMPATIBLE: 'geojsonIncompatible',
		NOT_OFFICIAL_SURVEY_CRS: 'notOfficialSurvey',
		GEOGRAPHIC_AREA: 'geographicCalc',
		GEOGRAPHIC_DISTANCE: 'geographicCalc',
		BETTER_ALTERNATIVE: 'betterAlternative',
		GPS_CONVERSION_NEEDED: 'gpsConversionNeeded',
		PROJECTED_STORAGE: 'projectedStorage',
		NON_STANDARD_EXCHANGE: 'nonStandardExchange',
		NON_STANDARD_WEB_CRS: 'nonStandardWeb',
	};

	return mapping[code] || code.toLowerCase();
}

/**
 * 提案を生成
 */
function generateSuggestions(issues: ValidationIssue[]): string[] {
	const suggestions: string[] = [];
	const addedCodes = new Set<ValidationIssueCode>();

	for (const issue of issues) {
		if (addedCodes.has(issue.code)) continue;
		addedCodes.add(issue.code);

		if (issue.recommendation) {
			suggestions.push(issue.recommendation);
		}
	}

	return suggestions;
}

/**
 * より良い代替案を取得
 */
async function findBetterAlternatives(
	purpose: Purpose,
	location: LocationSpec
): Promise<RecommendedCrs[] | undefined> {
	try {
		const recommendation = await recommendCrs(purpose, location);
		return [recommendation.primary, ...recommendation.alternatives.slice(0, 2)];
	} catch {
		return undefined;
	}
}

/**
 * CRS使用の妥当性を検証
 */
export async function validateCrsUsage(
	crs: string,
	purpose: Purpose,
	location: LocationSpec
): Promise<ValidateCrsUsageOutput> {
	const issues: ValidationIssue[] = [];
	const crsDetail = await findCrsById(crs);

	if (!crsDetail) {
		throw new NotFoundError('CRS', crs);
	}

	// 1. 非推奨チェック
	if (crsDetail.deprecated) {
		issues.push({
			severity: 'error',
			code: 'DEPRECATED_CRS',
			message: `${crsDetail.code} is deprecated`,
			recommendation: crsDetail.supersededBy
				? `Use ${crsDetail.supersededBy} instead`
				: 'Consider using a newer CRS',
		});
	}

	// 2. 適用範囲チェック
	if (!isLocationWithinArea(location, crsDetail.areaOfUse)) {
		issues.push({
			severity: 'error',
			code: 'AREA_MISMATCH',
			message: `Location is outside the area of use for ${crsDetail.code}`,
			recommendation: 'Select a CRS appropriate for your location',
		});
	}

	// 3. 用途別チェック
	const purposeIssues = await validateForPurpose(crsDetail, purpose, location);
	issues.push(...purposeIssues);

	// 4. スコア計算
	const score = await calculateValidationScore(issues);

	// 5. 代替案提案
	const betterAlternatives =
		score < VALIDATION_SCORE.BETTER_ALTERNATIVES_THRESHOLD
			? await findBetterAlternatives(purpose, location)
			: undefined;

	return {
		isValid: !issues.some((i) => i.severity === 'error'),
		score,
		issues,
		suggestions: generateSuggestions(issues),
		betterAlternatives,
	};
}
