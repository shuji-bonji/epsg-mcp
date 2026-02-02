/**
 * CRS 基本型定義
 */

export type CrsType = 'geographic' | 'projected' | 'compound' | 'vertical' | 'engineering';

export interface BoundingBox {
	north: number;
	south: number;
	east: number;
	west: number;
}

export interface EllipsoidInfo {
	name: string;
	code: string;
	semiMajorAxis: number;
	inverseFlattening: number;
}

export interface DatumInfo {
	code: string;
	name: string;
	type: 'geodetic' | 'vertical' | 'engineering';
	ellipsoid?: EllipsoidInfo;
	primeMeridian?: string;
	remarks?: string;
}

export interface ProjectionInfo {
	method: string;
	centralMeridian?: number;
	latitudeOfOrigin?: number;
	scaleFactor?: number;
	falseEasting?: number;
	falseNorthing?: number;
}

export interface AreaOfUse {
	description: string;
	boundingBox?: BoundingBox;
	prefectures?: string[];
}

export interface AccuracyInfo {
	horizontal?: string;
	vertical?: string;
	notes?: string;
}

export interface CrsInfo {
	code: string;
	name: string;
	type: CrsType;
	region?: string;
	description?: string;
	deprecated: boolean;
	supersededBy?: string;
}

export interface CrsDetail extends CrsInfo {
	datum?: DatumInfo;
	baseCRS?: string;
	projection?: ProjectionInfo;
	coordinateSystem?: string;
	areaOfUse: AreaOfUse;
	accuracy?: AccuracyInfo;
	remarks?: string;
	relatedCrs?: string[];
	useCases?: string[];
}

export interface LocationSpec {
	/**
	 * 国コード（ISO 3166-1 alpha-2）
	 * 例: "JP", "US", "GB", "DE", "FR", "AU"
	 * 後方互換: "Japan" → "JP", "Global" → "GLOBAL" に内部変換
	 */
	country?: string;

	/**
	 * 地方名 ("Kanto", "Northeast US", "Western Europe")
	 */
	region?: string;

	/**
	 * 行政区画（都道府県/州/県/省の統一フィールド）
	 * 日本: "東京都", "北海道"
	 * 米国: "California", "New York"
	 * 英国: "England", "Scotland"
	 */
	subdivision?: string;

	/**
	 * @deprecated Use `subdivision` instead.
	 * 後方互換のため残す。内部で subdivision に変換。
	 */
	prefecture?: string;

	/**
	 * 市区町村/都市
	 * 複数系をまたぐ地域での判定用（札幌市、那覇市など）
	 */
	city?: string;

	/** バウンディングボックス */
	boundingBox?: BoundingBox;

	/** 中心座標 */
	centerPoint?: { lat: number; lng: number };
}
