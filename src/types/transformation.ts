/**
 * 変換経路関連型定義
 */

import type { LocationSpec } from './crs.js';

export interface TransformationStep {
	from: string; // "EPSG:4301"
	to: string; // "EPSG:6668"
	method: string; // "Geocentric translation", "Helmert 7-parameter"
	accuracy: string; // "1-2m", "数cm"
	epsgCode?: string; // 変換操作のEPSGコード（例: "EPSG:15483"）
	notes?: string; // 特記事項
	isReverse?: boolean; // 逆方向変換か
}

export type TransformationComplexity = 'simple' | 'moderate' | 'complex';

export interface TransformationPath {
	steps: TransformationStep[];
	totalAccuracy: string; // "1m", "数cm" など
	complexity: TransformationComplexity;
	estimatedPrecisionLoss?: string; // 累積精度損失の説明
}

export interface SuggestTransformationArgs {
	sourceCrs: string; // "EPSG:4301", "4301"
	targetCrs: string; // "EPSG:6668", "6668"
	location?: LocationSpec; // 変換対象の位置（精度向上のため）
}

export interface SuggestTransformationOutput {
	directPath: TransformationPath | null; // 直接変換可能な場合
	viaPaths: TransformationPath[]; // 中間CRSを経由する変換
	recommended: TransformationPath; // 推奨される変換経路
	warnings: string[]; // 注意事項
}

// データ構造

export interface TransformationRecord {
	id: string;
	from: string;
	to: string;
	method: string;
	accuracy: string;
	reversible: boolean; // 逆方向変換可能か
	reverseNote?: string; // 逆方向特有の注記
	parameters?: Record<string, unknown>;
	description: string;
	notes?: string;
}

export interface CommonPath {
	description: string;
	steps: string[];
	totalAccuracy: string;
	notes?: string;
}

export interface DeprecationInfo {
	note: string;
	migrateTo: string;
}

export interface TransformationsData {
	version: string;
	transformations: TransformationRecord[];
	commonPaths: Record<string, CommonPath>;
	hubCrs: string[];
	deprecatedTransformations: Record<string, DeprecationInfo>;
}
