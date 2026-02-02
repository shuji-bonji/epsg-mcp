/**
 * UTMゾーン計算ユーティリティ
 *
 * 座標からUTMゾーンを自動計算し、適切なCRS情報を生成する
 * パックがない国でも最低限の推奨が可能になる（Layer 2フォールバック）
 */

import type { CrsDetail } from '../types/index.js';

/**
 * UTM計算で許容する座標の範囲
 */
export const UTM_LIMITS = {
	/** UTMの適用範囲（北緯） */
	MAX_LAT: 84,
	/** UTMの適用範囲（南緯） */
	MIN_LAT: -80,
	/** 経度の最小値 */
	MIN_LNG: -180,
	/** 経度の最大値 */
	MAX_LNG: 180,
} as const;

/**
 * UTM EPSG コードのベース値
 */
export const UTM_EPSG_BASE = {
	/** 北半球の開始コード（EPSG:32601 = UTM 1N） */
	NORTH: 32600,
	/** 南半球の開始コード（EPSG:32701 = UTM 1S） */
	SOUTH: 32700,
} as const;

/**
 * 座標が有効かどうかを検証
 */
function validateCoordinates(lat: number, lng: number): void {
	if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
		throw new Error('Invalid coordinates: latitude and longitude must be finite numbers');
	}
	if (lat < -90 || lat > 90) {
		throw new Error(`Invalid latitude: ${lat}. Must be between -90 and 90`);
	}
	if (lng < -180 || lng > 180) {
		throw new Error(`Invalid longitude: ${lng}. Must be between -180 and 180`);
	}
}

/**
 * 経度からUTMゾーン番号を計算
 *
 * 基本的なUTMゾーン計算（特殊ゾーンは未対応）
 * - ノルウェー 31V→32V の拡大
 * - スバールバル諸島のゾーン調整
 * これらの特殊ケースは将来的に追加可能
 *
 * @param lng - 経度（-180 ~ 180）
 * @returns UTMゾーン番号（1 ~ 60）
 */
export function getUtmZone(lng: number): number {
	if (!Number.isFinite(lng)) {
		throw new Error('Invalid longitude: must be a finite number');
	}

	// 経度を正規化（-180 ~ 180 の範囲に）
	let normalizedLng = lng;
	if (normalizedLng === 180) {
		normalizedLng = 179.999999; // 180度は zone 60 として扱う
	}

	// UTMゾーン計算: (lng + 180) / 6 の整数部分 + 1
	const zone = Math.floor((normalizedLng + 180) / 6) + 1;

	// 範囲を1-60に制限
	return Math.max(1, Math.min(60, zone));
}

/**
 * 座標からUTM EPSGコードを取得
 *
 * @param lat - 緯度（-90 ~ 90）
 * @param lng - 経度（-180 ~ 180）
 * @returns EPSG コード（例: "EPSG:32654"）
 */
export function getUtmEpsgCode(lat: number, lng: number): string {
	validateCoordinates(lat, lng);

	const zone = getUtmZone(lng);
	const base = lat >= 0 ? UTM_EPSG_BASE.NORTH : UTM_EPSG_BASE.SOUTH;
	return `EPSG:${base + zone}`;
}

/**
 * 座標が極地域（UTM適用範囲外）かどうかを判定
 *
 * @param lat - 緯度
 * @returns 極地域の場合 true
 */
export function isPolarRegion(lat: number): boolean {
	return lat > UTM_LIMITS.MAX_LAT || lat < UTM_LIMITS.MIN_LAT;
}

/**
 * UTM CRS の詳細情報を動的生成
 *
 * @param lat - 緯度
 * @param lng - 経度
 * @returns CrsDetail オブジェクト
 */
export function generateUtmCrsDetail(lat: number, lng: number): CrsDetail {
	validateCoordinates(lat, lng);

	const zone = getUtmZone(lng);
	const hemisphere = lat >= 0 ? 'N' : 'S';
	const epsgCode = getUtmEpsgCode(lat, lng);
	const centralMeridian = (zone - 1) * 6 - 180 + 3;

	// ゾーンの経度境界を計算
	const westBoundary = (zone - 1) * 6 - 180;
	const eastBoundary = zone * 6 - 180;

	return {
		code: epsgCode,
		name: `WGS 84 / UTM zone ${zone}${hemisphere}`,
		type: 'projected',
		deprecated: false,
		baseCRS: 'EPSG:4326',
		projection: {
			method: 'Transverse Mercator',
			centralMeridian,
			latitudeOfOrigin: 0,
			scaleFactor: 0.9996,
			falseEasting: 500000,
			falseNorthing: hemisphere === 'S' ? 10000000 : 0,
		},
		areaOfUse: {
			description: `Between ${westBoundary}° and ${eastBoundary}°, ${hemisphere === 'N' ? 'northern' : 'southern'} hemisphere`,
			boundingBox: {
				north: hemisphere === 'N' ? UTM_LIMITS.MAX_LAT : 0,
				south: hemisphere === 'N' ? 0 : UTM_LIMITS.MIN_LAT,
				east: eastBoundary,
				west: westBoundary,
			},
		},
		accuracy: {
			horizontal: 'Within 0.04% distortion inside UTM zone',
			notes: 'Suitable for distance and area calculations within a single UTM zone',
		},
		remarks: `UTM zone ${zone}${hemisphere}. Suitable for distance and area calculations within the zone. Central meridian at ${centralMeridian}°.`,
		useCases: ['distance_calculation', 'area_calculation', 'data_exchange'],
	};
}

/**
 * バウンディングボックスから適切なUTMゾーン情報を取得
 *
 * 複数のゾーンにまたがる場合は中心点のゾーンを返す
 *
 * @param bbox - バウンディングボックス
 * @returns UTMゾーン情報
 */
export function getUtmZoneForBoundingBox(bbox: {
	north: number;
	south: number;
	east: number;
	west: number;
}): { zone: number; hemisphere: 'N' | 'S'; crossesMultipleZones: boolean } {
	const centerLat = (bbox.north + bbox.south) / 2;
	const centerLng = (bbox.east + bbox.west) / 2;

	const westZone = getUtmZone(bbox.west);
	const eastZone = getUtmZone(bbox.east);

	const crossesMultipleZones = westZone !== eastZone;

	return {
		zone: getUtmZone(centerLng),
		hemisphere: centerLat >= 0 ? 'N' : 'S',
		crossesMultipleZones,
	};
}
