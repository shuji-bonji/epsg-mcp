/**
 * Country Knowledge Pack インターフェース定義
 *
 * 各国パックが実装するインターフェースを定義
 * 日本の既存機能を抽象化し、他国パックでも同様の機能を提供可能にする
 */

import type { BoundingBox, CrsDetail, LocationSpec, Purpose, ValidationIssue } from './index.js';

/**
 * 各国パックのメタデータ
 */
export interface PackMetadata {
	/** ISO 3166-1 alpha-2 国コード ("JP", "US", "GB", "DE", ...) */
	countryCode: string;
	/** パック名 */
	name: string;
	/** バージョン */
	version: string;
	/** 主要測地系 */
	primaryDatum: string;
	/** パックの説明 */
	description: string;
	/** 対応言語（remarksの言語） */
	language: string;
	/**
	 * 国コードのエイリアス（代替コード）
	 * ISO 3166-1 alpha-3, 通称など
	 * 例: UK Pack → ['GB', 'GBR', 'Britain']
	 */
	aliases?: string[];
}

/**
 * 地域→ゾーンマッピング
 * 日本: 都道府県 → 平面直角座標系
 * 米国: 州 → State Plane ゾーン
 */
export interface ZoneMapping {
	/** マッピングテーブル */
	entries: Record<string, ZoneMappingEntry>;
	/** 複数ゾーンにまたがる地域 */
	multiZoneRegions?: Record<string, MultiZoneConfig>;
}

export interface ZoneMappingEntry {
	/** ゾーン名 */
	zone: string;
	/** EPSGコード */
	code: string;
	/** 備考 */
	notes?: string;
}

export interface MultiZoneConfig {
	/** デフォルトゾーン */
	default: string;
	/** サブ地域（日本: 振興局、米国: 郡等） → ゾーン */
	subRegions: Record<string, string>;
	/** 都市 → ゾーン */
	cities: Record<string, string>;
	/** 注意事項 */
	note: string;
}

/**
 * 推奨ルール
 */
export interface PackRecommendationRules {
	/** 用途別推奨（既存 recommendations.json の構造を踏襲） */
	purposeRules: Record<string, PackPurposeRule>;
}

export interface PackPurposeRule {
	primary: string;
	alternatives?: string[];
	fallback?: string;
	reasoning: string;
	pros?: string[];
	cons?: string[];
	warnings?: string[];
	/** ゾーンマッピングを使って動的に決定するか */
	usesZoneMapping?: boolean;
	/** コードパターン（例: "EPSG:6669-6687"） */
	codePattern?: string;
}

/**
 * Pack用検証設定
 */
export interface PackValidationConfig {
	/** この国の公式測量CRS（配列） */
	officialSurveyCrs: string[];
	/** Webマッピング対応CRS */
	webMappingCrs: string[];
	/** ナビゲーション対応CRS */
	navigationCrs: string[];
	/** レガシー（非推奨）CRS */
	legacyCrs: string[];
	/** レガシー→現行の推奨移行先 */
	legacyMigration: Record<string, string>;
}

/**
 * 変換知識
 */
export interface PackTransformationKnowledge {
	/** 変換パラメータ */
	transformations: PackTransformation[];
	/** ハブCRS */
	hubCrs: string[];
	/** 非推奨CRS */
	deprecatedCrs: string[];
}

export interface PackTransformation {
	from: string;
	to: string;
	method: string;
	accuracy: string;
	notes?: string;
	epsgCode?: string;
	reversible: boolean;
}

/**
 * ベストプラクティス
 */
export interface PackBestPractice {
	topic: string;
	title: string;
	description: string;
	recommendations: PackRecommendationItem[];
	commonMistakes: PackMistake[];
	references: PackReference[];
}

export interface PackRecommendationItem {
	priority: 'must' | 'should' | 'may';
	text: string;
}

export interface PackMistake {
	mistake: string;
	problem: string;
	solution: string;
}

export interface PackReference {
	type: 'official' | 'article' | 'tool';
	title: string;
	url?: string;
	description?: string;
}

/**
 * トラブルシュート知識
 */
export interface PackTroubleshootingGuide {
	symptomId: string;
	keywords: string[];
	causes: PackCause[];
	solutions: PackSolution[];
}

export interface PackCause {
	likelihood: 'high' | 'medium' | 'low';
	cause: string;
	description: string;
	indicators: string[];
}

export interface PackSolution {
	forCause: string;
	steps: string[];
	prevention: string;
}

/**
 * Pack用検証ルール
 */
export interface PackValidationRule {
	purposes: Purpose[];
	condition: (ctx: PackValidationContext) => boolean | Promise<boolean>;
	issue:
		| ValidationIssue
		| ((ctx: PackValidationContext) => ValidationIssue | Promise<ValidationIssue>);
}

export interface PackValidationContext {
	crs: CrsDetail;
	location: LocationSpec;
	pack: CountryPack;
}

/**
 * CRSデータセット（Pack用）
 */
export interface PackCrsDataSet {
	geographicCRS: Record<string, CrsDetail>;
	projectedCRS: Record<string, CrsDetail>;
}

/**
 * Country Knowledge Pack インターフェース
 *
 * 非同期メソッドはデータ読み込みが必要なもの
 * 同期メソッドはメモリ内のメタデータのみ必要なもの
 */
export interface CountryPack {
	/** パックメタデータ */
	metadata: PackMetadata;

	/** CRSデータ（既存の japan-crs.json に相当） */
	getCrsData(): Promise<PackCrsDataSet>;

	/** 地域→ゾーンマッピング */
	getZoneMapping(): Promise<ZoneMapping>;

	/** 用途別推奨ルール */
	getRecommendationRules(): Promise<PackRecommendationRules>;

	/** CRS使用の妥当性検証ルール */
	getValidationRules(): Promise<PackValidationRule[]>;

	/** 変換経路の知識 */
	getTransformationKnowledge(): Promise<PackTransformationKnowledge>;

	/** ベストプラクティス */
	getBestPractices(): Promise<PackBestPractice[]>;

	/** トラブルシュート知識 */
	getTroubleshootingGuides(): Promise<PackTroubleshootingGuide[]>;

	/**
	 * 場所に応じた適切なゾーンを選択
	 * 日本: 都道府県/座標 → 平面直角座標系
	 * 米国: 州/座標 → State Plane ゾーン
	 */
	selectZoneForLocation(location: LocationSpec): Promise<string | null>;

	/**
	 * この国の場所かどうかを判定
	 * centerPoint/boundingBox からの推定も含む
	 */
	isLocationInCountry(location: LocationSpec): boolean;

	/**
	 * 国の地理的境界を取得
	 */
	getCountryBounds(): BoundingBox;
}
