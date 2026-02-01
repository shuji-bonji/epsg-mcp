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
	country?: string;
	region?: string;
	prefecture?: string;
	city?: string; // 複数系をまたぐ地域での判定用（札幌市、那覇市など）
	boundingBox?: BoundingBox;
	centerPoint?: { lat: number; lng: number };
}
