/**
 * CRS推奨サービス
 * 用途・場所に応じた最適なCRSを推奨
 */

import { findCrsById, getZoneMapping, loadRecommendations } from '../data/loader.js';
import type {
	CrsDetail,
	LocationSpec,
	MultiZonePrefecture,
	Purpose,
	RecommendCrsOutput,
	RecommendedCrs,
	Requirements,
} from '../types/index.js';

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
		if (point.lng < 141.5) {
			return 'EPSG:6679'; // XI系（西部）
		}
		if (point.lng < 144.0) {
			return 'EPSG:6680'; // XII系（中部）
		}
		return 'EPSG:6681'; // XIII系（東部）
	}

	if (prefecture === '沖縄県') {
		// 経度で大まかに判定
		if (point.lng > 131.0) {
			return 'EPSG:6685'; // XVII系（大東）
		}
		if (point.lng < 126.5) {
			return 'EPSG:6684'; // XVI系（先島）
		}
		return 'EPSG:6683'; // XV系（本島）
	}

	return 'EPSG:6677'; // デフォルト（系IX）
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
		if (lat > 41.5) {
			if (lng < 141.5) return 'EPSG:6679';
			if (lng < 144.0) return 'EPSG:6680';
			return 'EPSG:6681';
		}

		// 東北
		if (lat > 37.0 && lng > 139.5) {
			return 'EPSG:6678'; // X系
		}

		// 関東
		if (lat > 34.5 && lat < 37.5 && lng > 138.5 && lng < 141.0) {
			return 'EPSG:6677'; // IX系
		}

		// 中部
		if (lat > 34.5 && lat < 37.5 && lng > 136.0 && lng < 139.0) {
			return 'EPSG:6675'; // VII系
		}

		// 近畿
		if (lat > 33.5 && lat < 36.0 && lng > 134.5 && lng < 137.0) {
			return 'EPSG:6674'; // VI系
		}

		// デフォルト
		return 'EPSG:6677';
	}

	return null;
}

/**
 * CRS情報を取得してRecommendedCrsを構築
 */
async function buildRecommendedCrs(
	code: string,
	score: number,
	pros: string[],
	cons: string[],
	usageNotes?: string
): Promise<RecommendedCrs> {
	const crsDetail = await findCrsById(code);
	return {
		code,
		name: crsDetail?.name || code,
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
			score += 5;
		}
	}

	// 歪み許容度
	if (requirements.distortionTolerance === 'minimal') {
		// 局所座標系を優先
		if (crsDetail?.code?.startsWith('EPSG:66')) {
			score += 5;
		}
	}

	return Math.min(100, score);
}

/**
 * 場所が日本かどうかを判定
 */
function isJapanLocation(location: LocationSpec): boolean {
	const countryLower = location.country?.toLowerCase();
	if (countryLower === 'japan' || countryLower === '日本') {
		return true;
	}
	if (location.prefecture) {
		return true; // 都道府県が指定されていれば日本
	}
	if (location.centerPoint) {
		const { lat, lng } = location.centerPoint;
		// 日本の大まかな範囲
		return lat >= 20 && lat <= 46 && lng >= 122 && lng <= 154;
	}
	return false;
}

/**
 * 用途・場所に応じた最適なCRSを推奨
 */
export async function recommendCrs(
	purpose: Purpose,
	location: LocationSpec,
	requirements?: Requirements
): Promise<RecommendCrsOutput> {
	const recommendations = await loadRecommendations();
	const rule = recommendations.rules[purpose];

	if (!rule) {
		throw new Error(`Unknown purpose: ${purpose}`);
	}

	const isJapan = isJapanLocation(location);
	const ruleRegion = isJapan && rule.japan ? rule.japan : rule.global;

	if (!ruleRegion) {
		throw new Error(`No recommendation rule for ${purpose} in ${isJapan ? 'Japan' : 'Global'}`);
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
		const zone = await selectZoneForLocation(location);
		if (zone) {
			primaryCode = zone;

			// 複数系またぐ地域の場合は警告
			if (location.prefecture && isMultiZonePrefecture(location.prefecture)) {
				const prefConfig = recommendations.multiZonePrefectures[location.prefecture];
				if (prefConfig) {
					warnings.push(prefConfig.note);
					if (!location.city && !location.region && !location.centerPoint) {
						warnings.push(
							`${location.prefecture}は複数の系にまたがります。より正確な推奨のために市区町村または座標を指定してください。`
						);
					}
				}
			}
		} else {
			// ゾーンが特定できない場合
			primaryCode = 'EPSG:6677'; // デフォルトで系IX
			warnings.push(
				'都道府県が特定できないため、系IX（東京周辺）をデフォルトとして推奨しています。'
			);
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

		if (latSpan > 3 || lngSpan > 3) {
			warnings.push(
				'広域にわたる計算です。複数の平面直角座標系をまたぐ場合は、JGD2011地理座標系(EPSG:6668)での測地線計算を検討してください。'
			);
			// フォールバックを提案
			if (ruleRegion.fallback) {
				primaryCode = ruleRegion.fallback;
			}
		}
	}

	// primaryを構築
	const primaryCrsDetail = await findCrsById(primaryCode);
	const primaryScore = adjustScoreForRequirements(95, primaryCrsDetail, requirements);
	const primary = await buildRecommendedCrs(
		primaryCode,
		primaryScore,
		ruleRegion.pros || [],
		ruleRegion.cons || [],
		ruleRegion.note
	);

	// alternativesを構築
	const alternatives: RecommendedCrs[] = [];
	if (ruleRegion.alternatives) {
		for (const altCode of ruleRegion.alternatives) {
			// パターンマッチングの場合はスキップ
			if (altCode.includes('-') && altCode.includes('EPSG:')) {
				continue;
			}
			const altDetail = await findCrsById(altCode);
			const altScore = adjustScoreForRequirements(75, altDetail, requirements);
			alternatives.push(await buildRecommendedCrs(altCode, altScore, [], [], undefined));
		}
	}

	// fallbackがあれば追加
	if (ruleRegion.fallback && ruleRegion.fallback !== primaryCode) {
		const fallbackDetail = await findCrsById(ruleRegion.fallback);
		const fallbackScore = adjustScoreForRequirements(70, fallbackDetail, requirements);
		alternatives.push(
			await buildRecommendedCrs(
				ruleRegion.fallback,
				fallbackScore,
				[],
				[],
				'広域計算時のフォールバック'
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
