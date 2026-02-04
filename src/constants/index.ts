/**
 * アプリケーション全体で使用する定数
 */

// Re-export message constants
export * from './messages.js';

// 変換経路探索
export const TRANSFORMATION = {
	/** 変換経路の最大ステップ数 */
	MAX_STEPS: 4,
	/** 探索で返す最大パス数 */
	MAX_PATHS: 10,
} as const;

// 広域判定閾値
export const WIDE_AREA_THRESHOLD = {
	/** 広域とみなす緯度スパン（度） */
	LAT_SPAN_DEGREES: 3,
	/** 広域とみなす経度スパン（度） */
	LNG_SPAN_DEGREES: 5,
} as const;

// 検索スコア
export const SEARCH_SCORE = {
	/** EPSGコード完全一致 */
	EXACT_CODE_MATCH: 100,
	/** EPSGコード部分一致 */
	PARTIAL_CODE_MATCH: 95,
	/** 名前完全一致 */
	EXACT_NAME_MATCH: 90,
	/** 名前に含まれる */
	NAME_CONTAINS: 80,
	/** 都道府県一致 */
	PREFECTURE_MATCH: 70,
	/** 複数ワード完全マッチ */
	ALL_WORDS_MATCH: 65,
	/** 備考欄に含まれる */
	REMARKS_CONTAINS: 60,
	/** 部分ワードマッチのベーススコア */
	PARTIAL_WORDS_BASE: 30,
	/** 部分ワードマッチの最大追加スコア */
	PARTIAL_WORDS_MAX_BONUS: 30,
} as const;

// デフォルト値
export const DEFAULTS = {
	/** 検索結果のデフォルト上限 */
	SEARCH_LIMIT: 10,
	/** 検索クエリの最大単語数 */
	MAX_QUERY_WORDS: 5,
	/** 最小単語長（これ未満は無視） */
	MIN_WORD_LENGTH: 2,
} as const;

// 精度優先度（低いほど高精度）
export const ACCURACY_PRIORITY = {
	/** 実用上同一/高精度 */
	HIGH: 1,
	/** cm単位 */
	CENTIMETER: 2,
	/** 誤差なし（座標変換のみ） */
	NO_ERROR: 3,
	/** 1-2m/数m */
	METER: 4,
	/** 不明/その他 */
	UNKNOWN: 5,
} as const;

// 複雑度判定の閾値
export const COMPLEXITY_THRESHOLD = {
	/** シンプル（直接変換）の最大ステップ数 */
	SIMPLE_MAX: 1,
	/** 中程度の最大ステップ数 */
	MODERATE_MAX: 2,
} as const;

// 主要EPSGコード
export const EPSG = {
	// 地理座標系
	WGS84: 'EPSG:4326',
	JGD2011: 'EPSG:6668',
	JGD2000: 'EPSG:4612',
	TOKYO_DATUM: 'EPSG:4301',
	// 投影座標系
	WEB_MERCATOR: 'EPSG:3857',
	// 平面直角座標系（JGD2011）全19系
	PLANE_RECT: {
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
	},
} as const;

// 日本の地理的境界
export const JAPAN_BOUNDS = {
	/** 日本全体のバウンディングボックス */
	OVERALL: {
		NORTH: 46,
		SOUTH: 20,
		EAST: 154,
		WEST: 122,
	},
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

// 検証・推奨スコア
export const VALIDATION_SCORE = {
	/** 代替案提示の閾値 */
	BETTER_ALTERNATIVES_THRESHOLD: 70,
	/** スコア最大値 */
	MAX: 100,
	/** プライマリ推奨のベーススコア */
	PRIMARY_BASE: 95,
	/** 代替推奨のベーススコア */
	ALTERNATIVE_BASE: 75,
	/** フォールバックCRSのスコア */
	FALLBACK: 70,
	/** 高精度要件のスコア調整 */
	HIGH_ACCURACY_BONUS: 5,
	/** 最小歪み要件のスコア調整 */
	MINIMAL_DISTORTION_BONUS: 5,
} as const;

// CRS比較
export const COMPARISON = {
	/** 用途スコア差の閾値（これ以上で差異とみなす） */
	SCORE_DIFFERENCE_THRESHOLD: 20,
	/** 高適合度の閾値 */
	HIGH_SUITABILITY_THRESHOLD: 80,
	/** サマリーに表示する最大項目数 */
	MAX_SUMMARY_ITEMS: 3,
} as const;

// トラブルシューティング
export const TROUBLESHOOTING = {
	/** 症状固有キーワードの重み係数 */
	SYMPTOM_KEYWORD_WEIGHT: 1.5,
	/** マッチスコア閾値（高） */
	MATCH_SCORE_HIGH: 15,
	/** マッチスコア閾値（中） */
	MATCH_SCORE_MEDIUM: 8,
	/** 信頼度判定スコア（高） */
	CONFIDENCE_HIGH_THRESHOLD: 4,
	/** 信頼度判定スコア（中） */
	CONFIDENCE_MEDIUM_THRESHOLD: 2,
} as const;

// 都道府県名
export const PREFECTURES = {
	HOKKAIDO: '北海道',
	OKINAWA: '沖縄県',
} as const;

// UTM関連
export const UTM = {
	/** 北半球のEPSGコードベース（EPSG:32601 = UTM 1N） */
	EPSG_BASE_NORTH: 32600,
	/** 南半球のEPSGコードベース（EPSG:32701 = UTM 1S） */
	EPSG_BASE_SOUTH: 32700,
	/** UTMの適用範囲（北緯上限） */
	MAX_LAT: 84,
	/** UTMの適用範囲（南緯下限） */
	MIN_LAT: -80,
	/** UTMゾーンの幅（度） */
	ZONE_WIDTH: 6,
	/** 中央子午線でのスケールファクター */
	SCALE_FACTOR: 0.9996,
	/** False Easting（メートル） */
	FALSE_EASTING: 500000,
	/** 南半球のFalse Northing（メートル） */
	FALSE_NORTHING_SOUTH: 10000000,
} as const;

// 国コードエイリアス（後方互換性用）
export const COUNTRY_ALIASES: Record<string, string> = {
	japan: 'JP',
	日本: 'JP',
	global: 'GLOBAL',
	'united states': 'US',
	usa: 'US',
	'united kingdom': 'GB',
	uk: 'GB',
	germany: 'DE',
	france: 'FR',
	australia: 'AU',
	korea: 'KR',
	'south korea': 'KR',
	china: 'CN',
	canada: 'CA',
} as const;

/**
 * 英語都道府県名→日本語都道府県名マッピング
 * 国際ユーザー向けに英語での都道府県指定をサポート
 */
export const PREFECTURE_EN_TO_JP: Record<string, string> = {
	// 北海道
	hokkaido: '北海道',

	// 東北
	aomori: '青森県',
	iwate: '岩手県',
	miyagi: '宮城県',
	akita: '秋田県',
	yamagata: '山形県',
	fukushima: '福島県',

	// 関東
	ibaraki: '茨城県',
	tochigi: '栃木県',
	gunma: '群馬県',
	saitama: '埼玉県',
	chiba: '千葉県',
	tokyo: '東京都',
	kanagawa: '神奈川県',

	// 中部
	niigata: '新潟県',
	toyama: '富山県',
	ishikawa: '石川県',
	fukui: '福井県',
	yamanashi: '山梨県',
	nagano: '長野県',
	gifu: '岐阜県',
	shizuoka: '静岡県',
	aichi: '愛知県',

	// 近畿
	mie: '三重県',
	shiga: '滋賀県',
	kyoto: '京都府',
	osaka: '大阪府',
	hyogo: '兵庫県',
	nara: '奈良県',
	wakayama: '和歌山県',

	// 中国
	tottori: '鳥取県',
	shimane: '島根県',
	okayama: '岡山県',
	hiroshima: '広島県',
	yamaguchi: '山口県',

	// 四国
	tokushima: '徳島県',
	kagawa: '香川県',
	ehime: '愛媛県',
	kochi: '高知県',

	// 九州
	fukuoka: '福岡県',
	saga: '佐賀県',
	nagasaki: '長崎県',
	kumamoto: '熊本県',
	oita: '大分県',
	miyazaki: '宮崎県',
	kagoshima: '鹿児島県',

	// 沖縄
	okinawa: '沖縄県',
} as const;

/**
 * 英語市名 → 日本語市名マッピング
 * 北海道・沖縄の複数系にまたがる地域の市町村名
 * キーは小文字で統一
 */
export const CITY_EN_TO_JP: Record<string, string> = {
	// 北海道
	sapporo: '札幌市',
	asahikawa: '旭川市',
	kushiro: '釧路市',
	hakodate: '函館市',
	obihiro: '帯広市',
	otaru: '小樽市',
	kitami: '北見市',
	ebetsu: '江別市',
	tomakomai: '苫小牧市',
	abashiri: '網走市',
	wakkanai: '稚内市',
	nemuro: '根室市',

	// 沖縄
	naha: '那覇市',
	ginowan: '宜野湾市',
	urasoe: '浦添市',
	uruma: 'うるま市',
	nago: '名護市',
	itoman: '糸満市',
	tomigusuku: '豊見城市',
	miyakojima: '宮古島市',
	ishigaki: '石垣市',
	nanjo: '南城市',
	'okinawa city': '沖縄市',
} as const;
