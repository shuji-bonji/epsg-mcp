/**
 * CRS比較関連型定義
 */

import type { Purpose } from './recommendation.js';

export type ComparisonAspect =
	| 'accuracy' // 精度
	| 'area_of_use' // 適用範囲
	| 'distortion' // 歪み特性
	| 'compatibility' // 互換性
	| 'use_cases' // 用途
	| 'datum' // 測地系
	| 'projection'; // 投影法

export interface ComparisonResult {
	aspect: string;
	crs1Value: string;
	crs2Value: string;
	verdict: string; // 判定・説明
}

export interface CompareCrsArgs {
	crs1: string; // "EPSG:4326", "4326"
	crs2: string; // "EPSG:6668", "6668"
	aspects?: ComparisonAspect[]; // 比較する観点（省略時は全て）
}

export interface CompareCrsOutput {
	comparison: ComparisonResult[];
	summary: string;
	recommendation: string;
	transformationNote?: string; // 変換に関する注記
}

// データ構造

export interface DistortionInfo {
	area: string;
	distance: string;
	shape: string;
	note?: string;
}

export interface CompatibilityInfo {
	gis: string;
	web: string;
	cad: string;
	gps: string;
}

export interface CrsCharacteristics {
	distortion: DistortionInfo;
	compatibility: CompatibilityInfo;
	useCasesScore: Record<Purpose, number>;
}

export interface ComparisonTemplate {
	summary: string;
	considerations: string[];
}

export interface ComparisonsData {
	version: string;
	crsCharacteristics: Record<string, CrsCharacteristics>;
	comparisonTemplates: Record<string, ComparisonTemplate>;
}
