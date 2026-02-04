/**
 * CRS推奨サービス
 * 用途・場所に応じた最適なCRSを推奨
 */

import {
	EPSG,
	ERRORS,
	JAPAN_BOUNDS,
	RECOMMENDATION_WARNINGS,
	USAGE_NOTES,
	VALIDATION_SCORE,
	WIDE_AREA_THRESHOLD,
} from '../constants/index.js';
import { findCrsById, getZoneMapping, loadRecommendations } from '../data/loader.js';
import {
	arePacksLoaded,
	findCrsNameInPack,
	findPackForLocation,
	loadPacksFromEnv,
} from '../packs/pack-manager.js';
import type {
	CrsDetail,
	LocationSpec,
	MultiZonePrefecture,
	Purpose,
	RecommendCrsOutput,
	RecommendedCrs,
	Requirements,
} from '../types/index.js';
import { isJapanLocation, normalizeLocation } from '../utils/location-normalizer.js';
import { canUseUtmFallback, recommendWithUtmFallback } from './utm-service.js';

/**
 * 複数系をまたぐ都道府県かどうかを判定
 */
export function isMultiZonePrefecture(prefecture: string): boolean {
	return prefecture === '北海道' || prefecture === '沖縄県';
}

/**
 * 複数系をまたぐ都道府県から適切な系を選択
 */
export async function selectZoneForMultiZonePrefecture(
	location: LocationSpec
): Promise<string | null> {
	if (!location.prefecture) return null;

	const recommendations = await loadRecommendations();
	const prefConfig = recommendations.multiZonePrefectures[location.prefecture] as
		| MultiZonePrefecture
		| undefined;

	if (!prefConfig) return null;

	// 市が指定されていれば使用
	if (location.city && prefConfig.cities[location.city]) {
		return prefConfig.cities[location.city];
	}

	// 地域が指定されていれば使用
	if (location.region && prefConfig.subRegions[location.region]) {
		return prefConfig.subRegions[location.region];
	}

	// 緯度経度があれば計算
	if (location.centerPoint) {
		return determineZoneFromCoordinate(location.centerPoint, location.prefecture);
	}

	// デフォルト
	return prefConfig.default;
}

/**
 * 緯度経度から平面直角座標系の系を判定（北海道・沖縄用）
 */
function determineZoneFromCoordinate(
	point: { lat: number; lng: number },
	prefecture: string
): string {
	if (prefecture === '北海道') {
		// 経度で大まかに判定
		if (point.lng < JAPAN_BOUNDS.HOKKAIDO.ZONE_XI_XII_BOUNDARY) {
			return EPSG.PLANE_RECT.ZONE_XI; // 西部
		}
		if (point.lng < JAPAN_BOUNDS.HOKKAIDO.ZONE_XII_XIII_BOUNDARY) {
			return EPSG.PLANE_RECT.ZONE_XII; // 中部
		}
		return EPSG.PLANE_RECT.ZONE_XIII; // 東部
	}

	if (prefecture === '沖縄県') {
		// 経度で大まかに判定
		if (point.lng > JAPAN_BOUNDS.OKINAWA.ZONE_XVI_XVII_BOUNDARY) {
			return EPSG.PLANE_RECT.ZONE_XVII; // 大東
		}
		if (point.lng < JAPAN_BOUNDS.OKINAWA.ZONE_XV_XVI_BOUNDARY) {
			return EPSG.PLANE_RECT.ZONE_XVI; // 先島
		}
		return EPSG.PLANE_RECT.ZONE_XV; // 本島
	}

	return EPSG.PLANE_RECT.ZONE_IX; // デフォルト（東京周辺）
}

/**
 * 場所に応じた平面直角座標系を選択
 */
export async function selectZoneForLocation(location: LocationSpec): Promise<string | null> {
	// 複数系またぐ地域の特別処理
	if (location.prefecture && isMultiZonePrefecture(location.prefecture)) {
		return selectZoneForMultiZonePrefecture(location);
	}

	// 都道府県からゾーンマッピングを取得
	if (location.prefecture) {
		const mapping = await getZoneMapping();
		const zoneInfo = mapping[location.prefecture];
		if (zoneInfo) {
			return zoneInfo.code;
		}
	}

	// 緯度経度から判定（日本国内と仮定）
	if (location.centerPoint) {
		// 簡易的な判定：主要な系のみ
		const { lat, lng } = location.centerPoint;

		// 北海道
		if (lat > JAPAN_BOUNDS.HOKKAIDO.LAT_THRESHOLD) {
			if (lng < JAPAN_BOUNDS.HOKKAIDO.ZONE_XI_XII_BOUNDARY) return EPSG.PLANE_RECT.ZONE_XI;
			if (lng < JAPAN_BOUNDS.HOKKAIDO.ZONE_XII_XIII_BOUNDARY) return EPSG.PLANE_RECT.ZONE_XII;
			return EPSG.PLANE_RECT.ZONE_XIII;
		}

		// 東北
		if (lat > JAPAN_BOUNDS.REGIONS.TOHOKU.SOUTH && lng > JAPAN_BOUNDS.REGIONS.TOHOKU.EAST) {
			return EPSG.PLANE_RECT.ZONE_X;
		}

		// 関東
		const kanto = JAPAN_BOUNDS.REGIONS.KANTO;
		if (lat > kanto.SOUTH && lat < kanto.NORTH && lng > kanto.WEST && lng < kanto.EAST) {
			return EPSG.PLANE_RECT.ZONE_IX;
		}

		// 中部
		const chubu = JAPAN_BOUNDS.REGIONS.CHUBU;
		if (lat > chubu.SOUTH && lat < chubu.NORTH && lng > chubu.WEST && lng < chubu.EAST) {
			return EPSG.PLANE_RECT.ZONE_VII;
		}

		// 近畿
		const kansai = JAPAN_BOUNDS.REGIONS.KANSAI;
		if (lat > kansai.SOUTH && lat < kansai.NORTH && lng > kansai.WEST && lng < kansai.EAST) {
			return EPSG.PLANE_RECT.ZONE_VI;
		}

		// デフォルト
		return EPSG.PLANE_RECT.ZONE_IX;
	}

	return null;
}

/**
 * CRS情報を取得してRecommendedCrsを構築
 * @param nameOverride - zoneMappingからの名前（findCrsById で見つからない場合のフォールバック）
 */
async function buildRecommendedCrs(
	code: string,
	score: number,
	pros: string[],
	cons: string[],
	usageNotes?: string,
	nameOverride?: string
): Promise<RecommendedCrs> {
	const crsDetail = await findCrsById(code);
	return {
		code,
		name: crsDetail?.name || nameOverride || code,
		score,
		pros,
		cons,
		usageNotes,
	};
}

/**
 * 要件に基づいてスコアを調整
 */
function adjustScoreForRequirements(
	baseScore: number,
	crsDetail: CrsDetail | undefined,
	requirements?: Requirements
): number {
	let score = baseScore;

	if (!requirements) return score;

	// 精度要件
	if (requirements.accuracy === 'high') {
		// 投影座標系を優先
		if (crsDetail?.type === 'projected') {
			score += VALIDATION_SCORE.HIGH_ACCURACY_BONUS;
		}
	}

	// 歪み許容度
	if (requirements.distortionTolerance === 'minimal') {
		// 平面直角座標系を優先
		const codeNum = parseInt(crsDetail?.code?.replace('EPSG:', '') || '0', 10);
		if (codeNum >= EPSG.PLANE_RECT.RANGE_START && codeNum <= EPSG.PLANE_RECT.RANGE_END) {
			score += VALIDATION_SCORE.MINIMAL_DISTORTION_BONUS;
		}
	}

	return Math.min(VALIDATION_SCORE.MAX, score);
}

/**
 * 用途・場所に応じた最適なCRSを推奨
 */
export async function recommendCrs(
	purpose: Purpose,
	location: LocationSpec,
	requirements?: Requirements
): Promise<RecommendCrsOutput> {
	// 0. パックがロードされていなければロード
	if (!arePacksLoaded()) {
		await loadPacksFromEnv();
	}

	// 1. LocationSpec 正規化
	const normalized = normalizeLocation(location);

	const recommendations = await loadRecommendations();
	const rule = recommendations.rules[purpose];

	if (!rule) {
		throw new Error(ERRORS.UNKNOWN_PURPOSE(purpose));
	}

	const isJapan = isJapanLocation(normalized);

	// 2. 日本以外の場合、Country Packを探す
	if (!isJapan) {
		const pack = findPackForLocation(normalized);
		if (pack) {
			// Country Packが見つかった場合、Packの推奨ロジックを使用
			const zone = await pack.selectZoneForLocation(normalized);
			if (zone) {
				const crsDetail = await findCrsById(zone);
				const score = adjustScoreForRequirements(
					VALIDATION_SCORE.PRIMARY_BASE,
					crsDetail,
					requirements
				);

				// zoneMappingから名前を取得（findCrsById で見つからない場合のフォールバック）
				const zoneName = await findCrsNameInPack(pack, zone);

				const primary = await buildRecommendedCrs(
					zone,
					score,
					['High accuracy', 'Legal basis', 'Public survey compliant'],
					['Zone selection required', 'Multiple zones for wide areas'],
					undefined,
					zoneName
				);
				return {
					primary,
					alternatives: [],
					reasoning: `Recommended by ${pack.metadata.name} for ${purpose}.`,
					warnings: [],
				};
			}
		}
		// Packがない場合はUTMフォールバック
		if (canUseUtmFallback(normalized)) {
			return recommendWithUtmFallback(purpose, normalized, requirements);
		}
	}

	const ruleRegion = isJapan && rule.japan ? rule.japan : rule.global;

	if (!ruleRegion) {
		throw new Error(ERRORS.NO_RECOMMENDATION_RULE(purpose, isJapan ? 'Japan' : 'Global'));
	}

	let primaryCode = ruleRegion.primary;
	const warnings: string[] = ruleRegion.warnings ? [...ruleRegion.warnings] : [];

	// 日本で平面直角座標系が推奨される場合、適切な系を選択
	if (
		isJapan &&
		(ruleRegion.codePattern === 'EPSG:6669-6687' ||
			primaryCode === '該当する平面直角座標系' ||
			primaryCode.includes('平面直角座標系'))
	) {
		// 正規化されたlocationを使用（英語都道府県名を日本語に変換済み）
		const zone = await selectZoneForLocation(normalized);
		if (zone) {
			primaryCode = zone;

			// 複数系またぐ地域の場合は警告
			if (normalized.prefecture && isMultiZonePrefecture(normalized.prefecture)) {
				const prefConfig = recommendations.multiZonePrefectures[normalized.prefecture];
				if (prefConfig) {
					warnings.push(prefConfig.note);
					if (!normalized.city && !normalized.region && !normalized.centerPoint) {
						warnings.push(RECOMMENDATION_WARNINGS.MULTI_ZONE_SPECIFY(normalized.prefecture));
					}
				}
			}
		} else {
			// Zone could not be determined
			primaryCode = EPSG.PLANE_RECT.ZONE_IX;
			warnings.push(RECOMMENDATION_WARNINGS.DEFAULT_ZONE_USED);
		}
	}

	// 距離・面積計算で広域の場合は警告
	if (
		(purpose === 'distance_calculation' || purpose === 'area_calculation') &&
		location.boundingBox
	) {
		const { north, south, east, west } = location.boundingBox;
		const latSpan = north - south;
		const lngSpan = east - west;

		if (
			latSpan > WIDE_AREA_THRESHOLD.LAT_SPAN_DEGREES ||
			lngSpan > WIDE_AREA_THRESHOLD.LNG_SPAN_DEGREES
		) {
			warnings.push(RECOMMENDATION_WARNINGS.WIDE_AREA_CALCULATION(EPSG.JGD2011));
			// フォールバックを提案
			if (ruleRegion.fallback) {
				primaryCode = ruleRegion.fallback;
			}
		}
	}

	// primaryを構築
	const primaryCrsDetail = await findCrsById(primaryCode);
	const primaryScore = adjustScoreForRequirements(
		VALIDATION_SCORE.PRIMARY_BASE,
		primaryCrsDetail,
		requirements
	);
	const primary = await buildRecommendedCrs(
		primaryCode,
		primaryScore,
		ruleRegion.pros || [],
		ruleRegion.cons || [],
		ruleRegion.note
	);

	// alternativesを構築（Promise.allで並列処理）
	const alternatives: RecommendedCrs[] = [];
	if (ruleRegion.alternatives) {
		// パターンマッチング以外のコードをフィルタリング
		const validAltCodes = ruleRegion.alternatives.filter(
			(altCode) => !(altCode.includes('-') && altCode.includes('EPSG:'))
		);

		// 並列でCRS詳細を取得
		const altDetails = await Promise.all(validAltCodes.map((code) => findCrsById(code)));

		// 並列でRecommendedCrsを構築
		const altPromises = validAltCodes.map(async (altCode, i) => {
			const altDetail = altDetails[i];
			const altScore = adjustScoreForRequirements(
				VALIDATION_SCORE.ALTERNATIVE_BASE,
				altDetail,
				requirements
			);
			return buildRecommendedCrs(altCode, altScore, [], [], undefined);
		});

		alternatives.push(...(await Promise.all(altPromises)));
	}

	// fallbackがあれば追加
	if (ruleRegion.fallback && ruleRegion.fallback !== primaryCode) {
		const fallbackDetail = await findCrsById(ruleRegion.fallback);
		const fallbackScore = adjustScoreForRequirements(
			VALIDATION_SCORE.FALLBACK,
			fallbackDetail,
			requirements
		);
		alternatives.push(
			await buildRecommendedCrs(
				ruleRegion.fallback,
				fallbackScore,
				[],
				[],
				USAGE_NOTES.FALLBACK_WIDE_AREA
			)
		);
	}

	return {
		primary,
		alternatives,
		reasoning: ruleRegion.reasoning,
		warnings: warnings.length > 0 ? warnings : undefined,
	};
}
