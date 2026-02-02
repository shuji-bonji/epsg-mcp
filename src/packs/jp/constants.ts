/**
 * JP Pack 固有定数
 */

/**
 * 日本の地理的境界
 */
export const JP_BOUNDS = {
	/** 日本全体のバウンディングボックス */
	NORTH: 46,
	SOUTH: 20,
	EAST: 154,
	WEST: 122,

	/** 北海道の経度境界 */
	HOKKAIDO: {
		/** 系XI/XII境界（経度） */
		ZONE_XI_XII_BOUNDARY: 141.5,
		/** 系XII/XIII境界（経度） */
		ZONE_XII_XIII_BOUNDARY: 144.0,
		/** 北海道判定の緯度閾値 */
		LAT_THRESHOLD: 41.5,
	},

	/** 沖縄の経度境界 */
	OKINAWA: {
		/** 系XV/XVI境界（経度） */
		ZONE_XV_XVI_BOUNDARY: 126.5,
		/** 系XVI/XVII境界（経度） */
		ZONE_XVI_XVII_BOUNDARY: 131.0,
	},

	/** 地域別境界 */
	REGIONS: {
		TOHOKU: { SOUTH: 37.0, EAST: 139.5 },
		KANTO: { SOUTH: 34.5, NORTH: 37.5, WEST: 138.5, EAST: 141.0 },
		CHUBU: { SOUTH: 34.5, NORTH: 37.5, WEST: 136.0, EAST: 139.0 },
		KANSAI: { SOUTH: 33.5, NORTH: 36.0, WEST: 134.5, EAST: 137.0 },
	},
} as const;

/**
 * 平面直角座標系 EPSG コード
 */
export const JP_PLANE_RECT = {
	ZONE_I: 'EPSG:6669', // 長崎・鹿児島（西部）
	ZONE_II: 'EPSG:6670', // 福岡・佐賀・熊本・大分・宮崎
	ZONE_III: 'EPSG:6671', // 山口・島根・広島
	ZONE_IV: 'EPSG:6672', // 香川・愛媛・徳島・高知
	ZONE_V: 'EPSG:6673', // 兵庫・鳥取・岡山
	ZONE_VI: 'EPSG:6674', // 京都・大阪・奈良・和歌山・三重
	ZONE_VII: 'EPSG:6675', // 石川・富山・岐阜・愛知
	ZONE_VIII: 'EPSG:6676', // 新潟・長野・山梨・静岡
	ZONE_IX: 'EPSG:6677', // 東京・神奈川・埼玉・千葉・茨城・栃木・群馬
	ZONE_X: 'EPSG:6678', // 青森・秋田・山形・岩手・宮城・福島
	ZONE_XI: 'EPSG:6679', // 北海道（西部・札幌周辺）
	ZONE_XII: 'EPSG:6680', // 北海道（中部）
	ZONE_XIII: 'EPSG:6681', // 北海道（東部）
	ZONE_XIV: 'EPSG:6682', // 小笠原
	ZONE_XV: 'EPSG:6683', // 沖縄本島
	ZONE_XVI: 'EPSG:6684', // 沖縄（先島）
	ZONE_XVII: 'EPSG:6685', // 沖縄（大東）
	ZONE_XVIII: 'EPSG:6686', // 沖縄（尖閣）
	ZONE_XIX: 'EPSG:6687', // 南鳥島
	/** 範囲（6669-6687） */
	RANGE_START: 6669,
	RANGE_END: 6687,
} as const;

/**
 * 日本の主要 EPSG コード
 */
export const JP_EPSG = {
	// 地理座標系
	JGD2011: 'EPSG:6668',
	JGD2000: 'EPSG:4612',
	TOKYO_DATUM: 'EPSG:4301',
	// 平面直角座標系
	PLANE_RECT: JP_PLANE_RECT,
} as const;
