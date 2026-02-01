/**
 * CRS使用検証ユーティリティ
 */

import { findCrsById, loadRecommendations } from '../data/loader.js';
import { NotFoundError } from '../errors/index.js';
import { recommendCrs, selectZoneForLocation } from '../services/recommendation-service.js';
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

/**
 * 平面直角座標系かどうかを判定
 */
export function isPlaneRectangularCS(code: string): boolean {
	const numericCode = Number.parseInt(code.replace(/^EPSG:/i, ''), 10);
	return numericCode >= 6669 && numericCode <= 6687;
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
 * 用途別検証ルール
 */
async function validateForPurpose(
	crs: CrsDetail,
	purpose: Purpose,
	location: LocationSpec
): Promise<ValidationIssue[]> {
	const issues: ValidationIssue[] = [];
	const recommendations = await loadRecommendations();

	switch (purpose) {
		case 'area_calculation':
			// Web Mercatorの面積歪み
			if (crs.code === 'EPSG:3857') {
				issues.push({
					severity: 'warning',
					code: 'AREA_DISTORTION',
					message: 'Web Mercator causes significant area distortion',
					recommendation: 'Use an equal-area or local projected CRS',
				});
			}
			// 地理座標系での面積計算
			if (crs.type === 'geographic') {
				issues.push({
					severity: 'info',
					code: 'GEOGRAPHIC_AREA',
					message: 'Geographic CRS requires spherical/ellipsoidal area calculation',
					recommendation: 'Use projected CRS or geodetic area formula',
				});
			}
			break;

		case 'distance_calculation':
			// 地理座標系での距離計算
			if (crs.type === 'geographic') {
				issues.push({
					severity: 'info',
					code: 'GEOGRAPHIC_DISTANCE',
					message: 'Geographic CRS requires geodetic distance calculation',
					recommendation: 'Use Haversine/Vincenty formula or a projected CRS',
				});
			}
			// Web Mercatorの距離歪み
			if (crs.code === 'EPSG:3857') {
				issues.push({
					severity: 'warning',
					code: 'DISTANCE_DISTORTION',
					message: 'Web Mercator distance varies significantly with latitude',
					recommendation: 'Use local projected CRS or geodetic calculation',
				});
			}
			// 系をまたぐ可能性
			if (isPlaneRectangularCS(crs.code) && location.boundingBox) {
				const spansMultipleZones = checkZoneSpan(location.boundingBox);
				if (spansMultipleZones) {
					issues.push({
						severity: 'warning',
						code: 'CROSS_ZONE_CALCULATION',
						message: 'Area spans multiple plane rectangular zones',
						recommendation: 'Use JGD2011 geographic (EPSG:6668) with geodetic calculation',
					});
				}
			}
			break;

		case 'survey': {
			const isJapan =
				location.country?.toLowerCase() === 'japan' ||
				location.country === '日本' ||
				!!location.prefecture;

			// 日本で平面直角座標系以外
			if (isJapan && !isPlaneRectangularCS(crs.code)) {
				issues.push({
					severity: 'warning',
					code: 'NOT_OFFICIAL_SURVEY_CRS',
					message: 'Not the official survey CRS for Japan',
					recommendation: 'Use Japan Plane Rectangular CS (EPSG:6669-6687)',
				});
			}

			// 正しい系かどうか
			if (isJapan && isPlaneRectangularCS(crs.code)) {
				const expectedZone = await selectZoneForLocation(location);
				if (expectedZone && expectedZone !== crs.code) {
					issues.push({
						severity: 'warning',
						code: 'ZONE_MISMATCH',
						message: `Expected ${expectedZone} for ${location.prefecture || 'this location'}, but ${crs.code} was specified`,
						recommendation: `Use ${expectedZone} for this location`,
					});
				}
			}

			// 非推奨測地系（Tokyo Datum）
			if (await isLegacyDatum(crs.code)) {
				issues.push({
					severity: 'error',
					code: 'LEGACY_DATUM',
					message: 'Tokyo Datum (old Japanese datum) should not be used for new surveys',
					recommendation: 'Use JGD2011-based CRS (EPSG:6668 or EPSG:6669-6687)',
				});
			}
			break;
		}

		case 'web_mapping':
			if (!recommendations.validationRules.webMappingCrs.includes(crs.code)) {
				issues.push({
					severity: 'info',
					code: 'NON_STANDARD_WEB_CRS',
					message: 'This CRS may not be natively supported by web mapping libraries',
					recommendation: 'Consider EPSG:3857 for display or EPSG:4326 for GeoJSON',
				});
			}
			break;

		case 'navigation':
			// GPS出力との整合性
			if (!recommendations.validationRules.navigationCrs.includes(crs.code)) {
				issues.push({
					severity: 'info',
					code: 'GPS_CONVERSION_NEEDED',
					message: 'GPS devices output WGS84 coordinates',
					recommendation: 'Consider using EPSG:4326 or EPSG:6668 (practically equivalent)',
				});
			}
			break;

		case 'data_storage':
			// 投影座標系での保存
			if (crs.type === 'projected') {
				issues.push({
					severity: 'info',
					code: 'PROJECTED_STORAGE',
					message: 'Projected CRS may limit future reprojection flexibility',
					recommendation: 'Consider storing in geographic CRS (EPSG:4326 or EPSG:6668)',
				});
			}
			// 非推奨CRSでの保存
			if (crs.deprecated) {
				issues.push({
					severity: 'warning',
					code: 'DEPRECATED_STORAGE',
					message: 'Storing data in deprecated CRS may cause future compatibility issues',
					recommendation: `Migrate to ${crs.supersededBy || 'a current CRS'}`,
				});
			}
			break;

		case 'data_exchange':
			// 非標準CRS
			if (!recommendations.validationRules.dataExchangeCrs.includes(crs.code)) {
				issues.push({
					severity: 'info',
					code: 'NON_STANDARD_EXCHANGE',
					message: 'EPSG:4326 is the most widely supported CRS for data exchange',
					recommendation: 'Consider converting to WGS84 for broader compatibility',
				});
			}
			// GeoJSON互換性
			if (crs.type === 'projected') {
				issues.push({
					severity: 'warning',
					code: 'GEOJSON_INCOMPATIBLE',
					message: 'GeoJSON specification requires WGS84 (EPSG:4326)',
					recommendation: 'Convert to EPSG:4326 for GeoJSON export',
				});
			}
			break;

		case 'visualization':
			// 基本的にweb_mappingと同じ
			if (!recommendations.validationRules.webMappingCrs.includes(crs.code)) {
				issues.push({
					severity: 'info',
					code: 'NON_STANDARD_WEB_CRS',
					message: 'This CRS may not be natively supported by visualization libraries',
					recommendation: 'Consider EPSG:3857 for web display',
				});
			}
			break;
	}

	return issues;
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
		score < 70 ? await findBetterAlternatives(purpose, location) : undefined;

	return {
		isValid: !issues.some((i) => i.severity === 'error'),
		score,
		issues,
		suggestions: generateSuggestions(issues),
		betterAlternatives,
	};
}
