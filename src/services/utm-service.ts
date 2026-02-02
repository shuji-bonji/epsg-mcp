/**
 * UTM フォールバックサービス
 *
 * パックがない国でも、座標さえあれば適切なUTMゾーンを推奨する
 * 3層フォールバックモデルの Layer 2 に相当
 */

import { VALIDATION_SCORE } from '../constants/index.js';
import type {
	CrsDetail,
	LocationSpec,
	Purpose,
	RecommendCrsOutput,
	RecommendedCrs,
	Requirements,
} from '../types/index.js';
import { generateUtmCrsDetail, getUtmZoneForBoundingBox, isPolarRegion } from '../utils/utm.js';

/**
 * UTMベースの推奨における pros/cons
 */
const UTM_PROS = {
	distance_calculation: [
		'UTM zones provide accurate distance measurements within ±0.04% distortion',
		'Coordinates are in meters, easy to work with for calculations',
	],
	area_calculation: [
		'UTM zones provide accurate area measurements within the zone',
		'Minimal distortion near the central meridian',
	],
	data_exchange: [
		'UTM is globally understood and standardized',
		'Based on WGS 84, compatible with GPS data',
	],
} as const;

const UTM_CONS = {
	distance_calculation: [
		'Cross-zone calculations require coordinate transformation',
		'Not suitable for very large areas spanning multiple zones',
	],
	area_calculation: ['Distortion increases towards zone boundaries'],
	data_exchange: [
		'Requires knowing which UTM zone the data belongs to',
		'Not suitable for global datasets',
	],
} as const;

/**
 * グローバル基盤（Layer 1）の推奨
 */
const GLOBAL_FALLBACK: Record<Purpose, { code: string; reasoning: string }> = {
	web_mapping: {
		code: 'EPSG:3857',
		reasoning: 'Web Mercator is the standard for web mapping applications.',
	},
	distance_calculation: {
		code: 'EPSG:4326',
		reasoning:
			'WGS 84 geographic coordinates with geodesic calculation is recommended when no local projection is available.',
	},
	area_calculation: {
		code: 'EPSG:4326',
		reasoning:
			'WGS 84 geographic coordinates with geodesic calculation is recommended when no local projection is available.',
	},
	survey: {
		code: 'EPSG:4326',
		reasoning: 'WGS 84 is recommended. For accurate survey work, use a local CRS if available.',
	},
	navigation: {
		code: 'EPSG:4326',
		reasoning: 'WGS 84 is the standard for GPS and navigation systems.',
	},
	data_exchange: {
		code: 'EPSG:4326',
		reasoning: 'WGS 84 is the most widely accepted CRS for data exchange.',
	},
	data_storage: {
		code: 'EPSG:4326',
		reasoning: 'WGS 84 is recommended for data storage due to its global coverage.',
	},
	visualization: {
		code: 'EPSG:3857',
		reasoning: 'Web Mercator is commonly used for visualization in web applications.',
	},
};

/**
 * 座標からUTM CRS情報を取得
 */
function getUtmCrsInfo(lat: number, lng: number): CrsDetail {
	return generateUtmCrsDetail(lat, lng);
}

/**
 * UTMが適切かどうかを判定（用途ベース）
 */
function isUtmAppropriateForPurpose(purpose: Purpose): boolean {
	return (
		purpose === 'distance_calculation' ||
		purpose === 'area_calculation' ||
		purpose === 'data_exchange'
	);
}

/**
 * UTMベースの RecommendedCrs を構築
 */
function buildUtmRecommendedCrs(
	crsDetail: CrsDetail,
	purpose: Purpose,
	requirements?: Requirements
): RecommendedCrs {
	const pros = UTM_PROS[purpose as keyof typeof UTM_PROS] || UTM_PROS.distance_calculation;
	const cons = UTM_CONS[purpose as keyof typeof UTM_CONS] || UTM_CONS.distance_calculation;

	let score = VALIDATION_SCORE.PRIMARY_BASE - 5; // UTMは専用CRSより若干低いスコア

	// 精度要件
	if (requirements?.accuracy === 'high') {
		score -= 5; // 高精度要件には専用投影座標系が望ましい
	}

	return {
		code: crsDetail.code,
		name: crsDetail.name,
		score,
		pros: [...pros],
		cons: [...cons],
		usageNotes: crsDetail.remarks,
	};
}

/**
 * グローバル基盤の RecommendedCrs を構築
 */
function buildGlobalFallbackCrs(purpose: Purpose): RecommendedCrs {
	const fallback = GLOBAL_FALLBACK[purpose];

	const pros: string[] = [];
	const cons: string[] = [];

	if (fallback.code === 'EPSG:4326') {
		pros.push('Global coverage', 'GPS compatible', 'Widely supported');
		cons.push(
			'Geographic coordinates require geodesic calculations for accurate distances',
			'Not a projected coordinate system'
		);
	} else if (fallback.code === 'EPSG:3857') {
		pros.push('Standard for web mapping', 'Supported by all major map libraries');
		cons.push('Severe distortion at high latitudes', 'Not suitable for accurate measurements');
	}

	return {
		code: fallback.code,
		name: fallback.code === 'EPSG:4326' ? 'WGS 84' : 'WGS 84 / Pseudo-Mercator',
		score: VALIDATION_SCORE.FALLBACK,
		pros,
		cons,
		usageNotes: fallback.reasoning,
	};
}

/**
 * UTMフォールバック推奨
 *
 * Packがない国で座標が指定されている場合に使用
 *
 * @param purpose - 用途
 * @param location - 場所指定
 * @param requirements - 要件
 * @returns 推奨結果
 */
export async function recommendWithUtmFallback(
	purpose: Purpose,
	location: LocationSpec,
	requirements?: Requirements
): Promise<RecommendCrsOutput> {
	const warnings: string[] = [];
	const alternatives: RecommendedCrs[] = [];

	// 座標を取得
	let lat: number | undefined;
	let lng: number | undefined;
	let crossesMultipleZones = false;

	if (location.centerPoint) {
		lat = location.centerPoint.lat;
		lng = location.centerPoint.lng;
	} else if (location.boundingBox) {
		const bbox = location.boundingBox;
		lat = (bbox.north + bbox.south) / 2;
		lng = (bbox.east + bbox.west) / 2;

		const utmInfo = getUtmZoneForBoundingBox(bbox);
		crossesMultipleZones = utmInfo.crossesMultipleZones;
	}

	// 座標がない場合はグローバル基盤にフォールバック
	if (lat === undefined || lng === undefined) {
		const globalFallback = buildGlobalFallbackCrs(purpose);
		return {
			primary: globalFallback,
			alternatives: [],
			reasoning: GLOBAL_FALLBACK[purpose].reasoning,
			warnings: [
				'No location coordinates provided. Using global fallback CRS.',
				'For more accurate recommendations, provide centerPoint or boundingBox.',
			],
		};
	}

	// 極地域の場合は警告
	if (isPolarRegion(lat)) {
		warnings.push(
			`Location is in polar region (latitude: ${lat}°). UTM is not suitable for latitudes beyond 84°N or 80°S.`
		);
		const globalFallback = buildGlobalFallbackCrs(purpose);
		return {
			primary: globalFallback,
			alternatives: [],
			reasoning:
				'Polar region detected. UTM is not applicable. Using WGS 84 geographic coordinates.',
			warnings,
		};
	}

	// UTMが適切な用途かどうか
	if (!isUtmAppropriateForPurpose(purpose)) {
		// Web mapping や visualization はグローバル基盤を使用
		const globalFallback = buildGlobalFallbackCrs(purpose);

		// UTMを代替案として追加
		const utmCrs = getUtmCrsInfo(lat, lng);
		alternatives.push(buildUtmRecommendedCrs(utmCrs, purpose, requirements));

		return {
			primary: globalFallback,
			alternatives,
			reasoning: GLOBAL_FALLBACK[purpose].reasoning,
		};
	}

	// UTM CRSを構築
	const utmCrs = getUtmCrsInfo(lat, lng);
	const primary = buildUtmRecommendedCrs(utmCrs, purpose, requirements);

	// 複数ゾーンにまたがる場合の警告
	if (crossesMultipleZones) {
		warnings.push(
			'The specified area spans multiple UTM zones. Consider using WGS 84 with geodesic calculations for cross-zone operations.'
		);
		alternatives.push(buildGlobalFallbackCrs(purpose));
	}

	// グローバル基盤を代替案として追加
	if (!crossesMultipleZones) {
		alternatives.push(buildGlobalFallbackCrs(purpose));
	}

	return {
		primary,
		alternatives,
		reasoning: `UTM zone ${utmCrs.code.replace('EPSG:', '')} is recommended for ${purpose.replace('_', ' ')} at this location. UTM provides meter-based coordinates suitable for distance and area calculations within the zone.`,
		warnings: warnings.length > 0 ? warnings : undefined,
	};
}

/**
 * 座標からUTM推奨が可能かどうかを判定
 */
export function canUseUtmFallback(location: LocationSpec): boolean {
	if (location.centerPoint) {
		const { lat } = location.centerPoint;
		return !isPolarRegion(lat);
	}
	if (location.boundingBox) {
		const { north, south } = location.boundingBox;
		return !isPolarRegion(north) && !isPolarRegion(south);
	}
	return false;
}
