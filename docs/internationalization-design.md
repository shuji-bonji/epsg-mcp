# EPSG MCP マルチ地域（国際）対応化 設計書

> **バージョン**: 1.0.0
> **作成日**: 2026-02-02
> **対象**: epsg-mcp v0.2.0 → v1.0.0
> **前提**: Phase 1-4 完了済み（9ツール実装、テスト306件）

---

## 1. 背景と目的

### 1.1 現状の課題

EPSG MCPサーバーはグローバル利用を想定して設計されたが、
現状のデータ層・ロジック層ともに日本向けに特化している。

```
日本CRSデータ : 25+ CRS（JGD2011, 平面直角座標系 I-XIX, JGD2000, Tokyo Datum）
グローバルCRSデータ: 6 CRS（WGS84, NAD83, ETRS89, Web Mercator, UTM×3）
```

| 側面 | 日本 | グローバル |
|------|------|-----------|
| CRSデータ数 | 25+ | 6 |
| 地域→ゾーンマッピング | 47都道府県完全対応 | なし |
| UTMゾーン | 52N-54N（日本周辺のみ） | 全60ゾーン中3つ |
| 推奨ロジック | 用途×地域×複数系の詳細推奨 | WGS84/3857の二択 |
| ベストプラクティス | `japan_survey` あり | 他国向けなし |
| 変換経路 | Tokyo Datum→JGD2011 中心 | 他国の旧→現行なし |
| データ言語 | `remarks`が日本語（日本・グローバル両方） | — |

### 1.2 目的

1. **汎用フォールバック**: UTMゾーン自動計算により、世界中どこでも最低限の推奨が可能な状態にする
2. **各国ナレッジパック**: 日本と同等の高品質な知識を、各国パック（Country Knowledge Pack）として追加可能にする
3. **SQLite統合**: EPSGレジストリDBをオプショナルで利用可能にし、全CRSの基本情報を検索可能にする
4. **後方互換性**: 既存のAPI・動作を一切壊さない

### 1.3 各国の独自ゾーンシステム事情

日本の平面直角座標系は特殊ではなく、各測量先進国が同様のシステムを持つ。

| 国 | 独自ゾーンシステム | ゾーン数 |
|---|---|---|
| 🇯🇵 日本 | 平面直角座標系 I-XIX | 19系 |
| 🇺🇸 アメリカ | State Plane Coordinate System (SPCS) | 120+ゾーン |
| 🇬🇧 イギリス | British National Grid (OSGB36) | 1（単一グリッド） |
| 🇫🇷 フランス | Conical Conformal zones (CC42-CC50) | 9ゾーン + Lambert-93 |
| 🇩🇪 ドイツ | Gauss-Krüger → ETRS89/UTMに移行中 | 3帯(旧) → UTM 32-33N |
| 🇦🇺 オーストラリア | Map Grid of Australia (MGA) | 8ゾーン |
| 🇰🇷 韓国 | Korean Unified CS + TM zones | 4ゾーン + 統合CS |
| 🇨🇳 中国 | CGCS2000 Gauss-Krüger | 6度帯(11) + 3度帯(22) |

これらの国に対しても、日本パックと同等の推奨ロジック・ベストプラクティス・トラブルシュートを提供できるようにする。

---

## 2. アーキテクチャ設計

### 2.1 3層フォールバックモデル

```
┌───────────────────────────────────────────────────────┐
│ Layer 3: Country Knowledge Pack（各国ナレッジパック）  │
│  - 地域→ゾーンマッピング（都道府県→系、州→SPCS等）    │
│  - 用途別推奨ロジック（pros/cons/warnings）            │
│  - ベストプラクティス                                   │
│  - トラブルシュート知識                                 │
│  - 変換経路と注意点（旧測地系→現行）                   │
│  ※ 日本パック = 既存機能の切り出し                      │
├───────────────────────────────────────────────────────┤
│ Layer 2: UTMゾーン自動計算（汎用フォールバック）       │
│  - centerPoint/boundingBox から UTMゾーン番号を計算     │
│  - 全60ゾーン × N/S = 120 CRS 対応                     │
│  - パックがない国でも最低限の推奨が可能                 │
├───────────────────────────────────────────────────────┤
│ Layer 1: グローバル基盤                                │
│  - WGS84 (EPSG:4326), Web Mercator (EPSG:3857)        │
│  - 主要地域測地系（ETRS89, NAD83等）                   │
│  ※ SQLite DB利用時は全EPSG CRS検索可能（オプション）   │
└───────────────────────────────────────────────────────┘
```

**優先順位**: Pack（知識） > SQLite（データ） > UTM（計算） > グローバル基盤

#### 検索・推奨フロー

```
recommend_crs(purpose, location) が呼ばれた場合:

1. country を判定
   ├─ location.country が指定されている → そのまま使用
   ├─ location.prefecture が指定されている → "JP" と推定
   └─ location.centerPoint/boundingBox のみ → 座標から国を推定 or "Global"

2. 該当国の Pack が有効か確認
   ├─ [有効] → Pack の recommend() を呼ぶ（Layer 3）
   │   例: JP Pack → 都道府県→系マッピング → 高品質な推奨
   │   例: US Pack → 州→SPCS マッピング → 高品質な推奨
   └─ [無効] → Layer 2 へフォールバック

3. Layer 2: UTMゾーン自動計算
   ├─ centerPoint/boundingBox がある → UTMゾーン計算
   │   例: lng=-118° → UTM Zone 11N (EPSG:32611)
   └─ 座標がない → Layer 1 へフォールバック

4. Layer 1: グローバル基盤
   └─ 用途に応じて WGS84 or Web Mercator を推奨
```

### 2.2 パック配布モデル

全パックをコアパッケージに同梱し、環境変数で有効化を制御する方式を採用する。

**理由**:
- MCPサーバーは1つの `npx` コマンドで起動する設計であり、別パッケージ方式は設定が煩雑
- JSONデータ中心のため追加パックのサイズは小さい（1パック数十KB〜数百KB程度）
- ユーザーは不要なパックを無効にできるため、メモリ効率も制御可能

```jsonc
// claude_desktop_config.json
{
  "mcpServers": {
    "epsg": {
      "command": "npx",
      "args": ["@shuji-bonji/epsg-mcp"],
      "env": {
        // 有効にするパックを指定（デフォルト: "jp"）
        "EPSG_PACKS": "jp,us,uk",
        // オプション: EPSG SQLite DBパス
        "EPSG_DB_PATH": "/path/to/epsg-registry.sqlite"
      }
    }
  }
}
```

`EPSG_PACKS` 未指定時は `"jp"` がデフォルト（後方互換性維持）。

### 2.3 SQLite 統合

EPSGレジストリ公式データベース（SQLite形式、~15MB）を任意で利用可能にする。

**SQLiteが提供するもの（Layer 3 の Pack にはない情報源）**:
- CRS定義データ（名前、座標系、投影法パラメータ）
- 適用範囲（boundingBox）
- 非推奨フラグ

**SQLiteが提供しないもの（Pack だけが持つ「知識」）**:
- 地域→ゾーンマッピング（都道府県→系、州→SPCS等）
- 用途別推奨ロジック（pros/cons/warnings）
- ベストプラクティス、トラブルシュート
- 変換経路の注意点

**具体例（EPSG:6677）**:

```
SQLiteから取れる:
  name: "JGD2011 / Japan Plane Rectangular CS IX"
  projection: Transverse Mercator, central meridian 139.833333
  area: Japan - zone IX
  deprecated: false

JP Packが持つ「知識」（SQLiteにはない）:
  対象都道府県: 東京都, 神奈川県, 千葉県, 埼玉県, 茨城県, 栃木県, 群馬県, 福島県
  東京都離島は別系（XIV, XVIII, XIX）という注意事項
  測量推奨度: ★★★★★ / Web表示推奨度: ★☆☆☆☆
  JGD2000(EPSG:2451)からの移行ガイド
  "中央子午線から130km以内で最高精度"という実務知識
```

SQLiteはあくまで「パックがない国・地域のフォールバック情報源」として位置付ける。

---

## 3. インターフェース設計

### 3.1 CountryPack インターフェース

既存の日本向け機能を抽象化し、各国パックが実装するインターフェースを定義する。

```typescript
// src/types/country-pack.ts

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
  purposeRules: Record<string, PurposeRule>;
  /** 検証ルール */
  validationRules: PackValidationConfig;
}

export interface PurposeRule {
  primary: string;
  alternatives?: string[];
  fallback?: string;
  reasoning: string;
  pros?: string[];
  cons?: string[];
  warnings?: string[];
  /** ゾーンマッピングを使って動的に決定するか */
  usesZoneMapping?: boolean;
}

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
  recommendations: string[];
  commonMistakes: string[];
  references: string[];
}

/**
 * トラブルシュート知識
 */
export interface PackTroubleshootingGuide {
  symptomId: string;
  keywords: string[];
  causes: Array<{
    likelihood: 'high' | 'medium' | 'low';
    cause: string;
    description: string;
    indicators: string[];
  }>;
  solutions: Array<{
    forCause: string;
    steps: string[];
    prevention: string;
  }>;
}

/**
 * Country Knowledge Pack インターフェース
 */
export interface CountryPack {
  /** パックメタデータ */
  metadata: PackMetadata;

  /** CRSデータ（既存の japan-crs.json に相当） */
  getCrsData(): PackCrsDataSet;

  /** 地域→ゾーンマッピング */
  getZoneMapping(): ZoneMapping;

  /** 用途別推奨ルール */
  getRecommendationRules(): PackRecommendationRules;

  /** CRS使用の妥当性検証ルール */
  getValidationRules(): PackValidationRule[];

  /** 変換経路の知識 */
  getTransformationKnowledge(): PackTransformationKnowledge;

  /** ベストプラクティス */
  getBestPractices(): PackBestPractice[];

  /** トラブルシュート知識 */
  getTroubleshootingGuides(): PackTroubleshootingGuide[];

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
}

/**
 * CRSデータセット（Pack用）
 */
export interface PackCrsDataSet {
  geographicCRS: Record<string, CrsDetail>;
  projectedCRS: Record<string, CrsDetail>;
}

/**
 * Pack用検証ルール
 */
export interface PackValidationRule {
  purposes: Purpose[];
  condition: (ctx: PackValidationContext) => boolean | Promise<boolean>;
  issue: ValidationIssue | ((ctx: PackValidationContext) => ValidationIssue | Promise<ValidationIssue>);
}

export interface PackValidationContext {
  crs: CrsDetail;
  location: LocationSpec;
  pack: CountryPack;
}
```

### 3.2 LocationSpec の改善

```typescript
// src/types/crs.ts（改修）

export interface LocationSpec {
  /**
   * 国コード（ISO 3166-1 alpha-2）
   * 例: "JP", "US", "GB", "DE", "FR", "AU"
   * 後方互換: "Japan" → "JP", "Global" → undefined
   */
  country?: string;

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

  /** 市区町村/都市 */
  city?: string;

  /** 地方名 ("Kanto", "Northeast US", "Western Europe") */
  region?: string;

  /** バウンディングボックス */
  boundingBox?: BoundingBox;

  /** 中心座標 */
  centerPoint?: { lat: number; lng: number };
}
```

**後方互換性ルール**:

```typescript
// src/utils/location-normalizer.ts（新規）

/**
 * LocationSpec の後方互換性を処理する正規化関数
 */
export function normalizeLocation(location: LocationSpec): LocationSpec {
  const normalized = { ...location };

  // country の正規化
  if (normalized.country) {
    normalized.country = normalizeCountry(normalized.country);
  }

  // prefecture → subdivision のマイグレーション
  if (normalized.prefecture && !normalized.subdivision) {
    normalized.subdivision = normalized.prefecture;
  }

  // subdivision から country を推定
  if (normalized.subdivision && !normalized.country) {
    normalized.country = inferCountryFromSubdivision(normalized.subdivision);
  }

  return normalized;
}

function normalizeCountry(country: string): string {
  const COUNTRY_ALIASES: Record<string, string> = {
    'japan': 'JP',
    '日本': 'JP',
    'global': 'GLOBAL',
    'united states': 'US',
    'usa': 'US',
    'united kingdom': 'GB',
    'uk': 'GB',
    'germany': 'DE',
    'france': 'FR',
    'australia': 'AU',
    'korea': 'KR',
    'china': 'CN',
    // ISO 3166-1 alpha-2 はそのまま
  };
  return COUNTRY_ALIASES[country.toLowerCase()] || country.toUpperCase();
}
```

### 3.3 ServiceRegistry の拡張

```typescript
// src/services/registry.ts（改修）

export interface ServiceRegistry {
  // --- 既存（変更なし） ---
  searchCrs: (...) => Promise<SearchResult>;
  getCrsDetail: (...) => Promise<CrsDetail | null>;
  listCrsByRegion: (...) => Promise<RegionCrsList>;
  recommendCrs: (...) => Promise<RecommendCrsOutput>;
  validateCrsUsage: (...) => Promise<ValidateCrsUsageOutput>;
  suggestTransformation: (...) => Promise<SuggestTransformationOutput>;
  compareCrs: (...) => Promise<CompareCrsOutput>;
  getBestPractices: (...) => Promise<GetBestPracticesOutput>;
  troubleshoot: (...) => Promise<TroubleshootOutput>;

  // --- 新規追加 ---
  /** 登録済みパック一覧を取得 */
  getRegisteredPacks: () => PackMetadata[];
  /** 国コードに対応するパックを取得 */
  getPackForCountry: (countryCode: string) => CountryPack | null;
}
```

---

## 4. ファイル構成（変更後）

```
src/
├── index.ts                          # MCPサーバーエントリポイント（微修正）
├── constants/
│   └── index.ts                      # 定数（UTM追加）
├── types/
│   ├── crs.ts                        # CRS型（LocationSpec改修）
│   ├── country-pack.ts               # 【新規】CountryPack インターフェース
│   ├── recommendation.ts             # 推奨型
│   ├── search.ts                     # 検索型
│   ├── transformation.ts             # 変換型
│   ├── comparison.ts                 # 比較型
│   ├── best-practices.ts             # ベストプラクティス型
│   └── index.ts                      # 型エクスポート
├── schemas/
│   └── index.ts                      # Zodスキーマ（LocationSpec改修）
├── errors/
│   └── index.ts                      # エラーハンドリング（変更なし）
├── utils/
│   ├── logger.ts                     # ロガー（変更なし）
│   ├── validation.ts                 # 検証ユーティリティ（Pack対応）
│   ├── validation-rules.ts           # 検証ルール（共通ルール抽出）
│   ├── location-normalizer.ts        # 【新規】LocationSpec正規化
│   └── utm.ts                        # 【新規】UTMゾーン計算
├── data/
│   ├── loader.ts                     # データローダー（Pack対応に改修）
│   ├── sqlite-loader.ts              # 【新規】SQLiteローダー（オプション）
│   └── static/
│       ├── global-crs.json           # グローバルCRS（英語化・拡充）
│       ├── recommendations.json      # 推奨ルール（共通部分のみ残す）
│       ├── transformations.json      # 変換経路（共通部分のみ残す）
│       ├── comparisons.json          # 比較データ（共通部分のみ残す）
│       ├── best-practices.json       # ベストプラクティス（共通部分のみ残す）
│       └── troubleshooting.json      # トラブルシュート（共通部分のみ残す）
├── packs/                            # 【新規】Country Knowledge Packs
│   ├── pack-manager.ts               # パック管理（ロード/有効化/検索）
│   ├── jp/                           # 日本パック
│   │   ├── index.ts                  # JP Pack エントリポイント（CountryPack実装）
│   │   ├── crs-data.json             # 既存 japan-crs.json から移動
│   │   ├── zone-mapping.json         # 47都道府県マッピング（既存データから抽出）
│   │   ├── recommendations.json      # 日本固有の推奨ルール
│   │   ├── validation-rules.ts       # 日本固有の検証ルール
│   │   ├── transformations.json      # 日本固有の変換経路
│   │   ├── best-practices.json       # 日本固有のベストプラクティス
│   │   └── troubleshooting.json      # 日本固有のトラブルシュート
│   ├── us/                           # 米国パック
│   │   ├── index.ts
│   │   ├── crs-data.json
│   │   ├── zone-mapping.json         # 州→SPCS ゾーンマッピング
│   │   ├── recommendations.json
│   │   ├── validation-rules.ts
│   │   ├── transformations.json      # NAD27→NAD83, NAD83→NAD83(2011)
│   │   ├── best-practices.json
│   │   └── troubleshooting.json
│   └── uk/                           # 英国パック
│       ├── index.ts
│       ├── crs-data.json
│       └── ...
├── services/
│   ├── registry.ts                   # サービスレジストリ（Pack対応追加）
│   ├── search-service.ts             # 検索サービス（Pack CRSも検索対象に）
│   ├── recommendation-service.ts     # 推奨サービス（Pack委譲に改修）
│   ├── transformation-service.ts     # 変換サービス（Pack知識も参照）
│   ├── comparison-service.ts         # 比較サービス（Pack CRSも対応）
│   ├── best-practices-service.ts     # ベストプラクティス（Pack統合）
│   ├── troubleshooting-service.ts    # トラブルシュート（Pack統合）
│   └── utm-service.ts                # 【新規】UTMフォールバックサービス
└── tools/
    ├── definitions.ts                # ツール定義（変更なし）
    └── handlers/                     # ハンドラー（変更なし）
        ├── index.ts
        ├── search.ts
        ├── recommendation.ts
        ├── transformation.ts
        ├── comparison.ts
        └── guidance.ts
```

---

## 5. 実装フェーズ

### Phase I: 基盤整備とUTMフォールバック（Layer 2）

**目標**: パックがない国でも最低限の推奨ができる状態にする。

**バージョン**: v0.3.0

#### Step I-1: UTMゾーン計算ユーティリティ

```typescript
// src/utils/utm.ts

/**
 * 経度からUTMゾーン番号を計算
 * 特殊ゾーン（ノルウェー 31V→32V, スバールバル）にも対応
 */
export function getUtmZone(lng: number): number {
  // 特殊ケース: ノルウェー南西部
  // ゾーン32Vに拡大（ゾーン31Vは0°→3°Eのみ）
  // スバールバル: ゾーン32X, 34X, 36X を拡大
  // → 簡易実装では省略可、後から追加

  return Math.floor((lng + 180) / 6) + 1;
}

/**
 * 座標からUTM EPSGコードを取得
 */
export function getUtmEpsgCode(lat: number, lng: number): string {
  const zone = getUtmZone(lng);
  const base = lat >= 0 ? 32600 : 32700; // N or S
  return `EPSG:${base + zone}`;
}

/**
 * UTM CRS の詳細情報を動的生成
 */
export function generateUtmCrsDetail(lat: number, lng: number): CrsDetail {
  const zone = getUtmZone(lng);
  const hemisphere = lat >= 0 ? 'N' : 'S';
  const epsg = getUtmEpsgCode(lat, lng);
  const centralMeridian = (zone - 1) * 6 - 180 + 3;

  return {
    code: epsg,
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
      description: `Between ${centralMeridian - 3}°${lng >= 0 ? 'E' : 'W'} and ${centralMeridian + 3}°${lng >= 0 ? 'E' : 'W'}, ${hemisphere === 'N' ? 'northern' : 'southern'} hemisphere`,
      boundingBox: {
        north: hemisphere === 'N' ? 84 : 0,
        south: hemisphere === 'N' ? 0 : -80,
        east: centralMeridian + 3,
        west: centralMeridian - 3,
      },
    },
    accuracy: {
      horizontal: 'Within 0.04% distortion inside UTM zone',
      notes: 'Suitable for distance and area calculations within a single UTM zone',
    },
    remarks: `UTM zone ${zone}${hemisphere}. Suitable for distance and area calculations within the zone.`,
    useCases: ['distance_calculation', 'area_calculation', 'data_exchange'],
  };
}
```

**タスクリスト**:

- [ ] `src/utils/utm.ts` 作成（`getUtmZone`, `getUtmEpsgCode`, `generateUtmCrsDetail`）
- [ ] `src/services/utm-service.ts` 作成（UTMベースの推奨ロジック）
- [ ] `recommendation-service.ts` にUTMフォールバック追加
- [ ] `search-service.ts` でUTM CRSも検索結果に含める（動的生成）
- [ ] テスト追加（UTM計算の正確性、フォールバック動作）
- [ ] `src/constants/index.ts` にUTM関連定数追加

**テスト項目**:

```typescript
describe('UTM Zone Calculation', () => {
  it('should calculate UTM zone from longitude', () => {
    expect(getUtmZone(139.69)).toBe(54);    // Tokyo
    expect(getUtmZone(-118.24)).toBe(11);   // Los Angeles
    expect(getUtmZone(-0.12)).toBe(30);     // London
    expect(getUtmZone(2.35)).toBe(31);      // Paris
    expect(getUtmZone(13.41)).toBe(33);     // Berlin
  });

  it('should generate correct EPSG code', () => {
    expect(getUtmEpsgCode(35.68, 139.69)).toBe('EPSG:32654');  // Tokyo N
    expect(getUtmEpsgCode(-33.87, 151.21)).toBe('EPSG:32756'); // Sydney S
  });
});

describe('UTM Fallback Recommendation', () => {
  it('should recommend UTM for unknown country with coordinates', async () => {
    const result = await recommendCrs('distance_calculation', {
      centerPoint: { lat: 48.85, lng: 2.35 }, // Paris
    });
    expect(result.primary.code).toBe('EPSG:32631'); // UTM 31N
  });
});
```

#### Step I-2: LocationSpec 正規化

- [ ] `src/utils/location-normalizer.ts` 作成
- [ ] `normalizeCountry()` 関数（"Japan"→"JP" 等のエイリアス解決）
- [ ] `normalizeLocation()` 関数（`prefecture`→`subdivision` マイグレーション）
- [ ] 全ハンドラーの入口で `normalizeLocation()` を呼ぶよう改修
- [ ] `src/schemas/index.ts` の LocationSpec スキーマを更新（`subdivision` 追加）
- [ ] テスト追加（後方互換性の検証）

**後方互換テスト**:

```typescript
describe('Location Normalization - Backward Compatibility', () => {
  it('should normalize "Japan" to "JP"', () => {
    const result = normalizeLocation({ country: 'Japan' });
    expect(result.country).toBe('JP');
  });

  it('should migrate prefecture to subdivision', () => {
    const result = normalizeLocation({ prefecture: '東京都' });
    expect(result.subdivision).toBe('東京都');
    expect(result.country).toBe('JP'); // 自動推定
  });

  it('should keep existing API working', async () => {
    // 既存テストが全てパスすることの確認
    const result = await recommendCrs('survey', { prefecture: '東京都' });
    expect(result.primary.code).toBe('EPSG:6677');
  });
});
```

#### Step I-3: global-crs.json 英語化・拡充

- [ ] `global-crs.json` の全 `remarks` を英語に変更
- [ ] 主要グローバルCRS追加（UTM は動的生成のため不要）
  - `EPSG:6350` NAD83(2011) / Conus Albers
  - `EPSG:3035` ETRS89-extended / LAEA Europe
- [ ] テスト更新（remarks の変更に伴う検索結果の検証）

---

### Phase II: CountryPack 基盤と日本パック切り出し（Layer 3 基盤）

**目標**: 日本の既存機能をパック構造に切り出し、パックシステムの基盤を確立する。

**バージョン**: v0.4.0

#### Step II-1: CountryPack インターフェース定義

- [ ] `src/types/country-pack.ts` 作成（セクション 3.1 のインターフェース定義）
- [ ] `src/types/index.ts` からエクスポート

#### Step II-2: パック管理システム

```typescript
// src/packs/pack-manager.ts

import type { CountryPack, PackMetadata } from '../types/country-pack.js';
import { info, debug } from '../utils/logger.js';

/** 登録済みパック */
const registeredPacks: Map<string, CountryPack> = new Map();

/**
 * パックを登録
 */
export function registerPack(pack: CountryPack): void {
  const { countryCode } = pack.metadata;
  registeredPacks.set(countryCode.toUpperCase(), pack);
  info(`Registered country pack: ${pack.metadata.name} (${countryCode})`);
}

/**
 * 国コードからパックを取得
 */
export function getPackForCountry(countryCode: string): CountryPack | null {
  return registeredPacks.get(countryCode.toUpperCase()) || null;
}

/**
 * 登録済みパック一覧
 */
export function getRegisteredPacks(): PackMetadata[] {
  return Array.from(registeredPacks.values()).map(p => p.metadata);
}

/**
 * LocationSpec から該当パックを探す
 */
export function findPackForLocation(location: LocationSpec): CountryPack | null {
  // 1. country が明示されている場合
  if (location.country && location.country !== 'GLOBAL') {
    return getPackForCountry(location.country);
  }

  // 2. 各パックの isLocationInCountry で判定
  for (const pack of registeredPacks.values()) {
    if (pack.isLocationInCountry(location)) {
      return pack;
    }
  }

  return null;
}

/**
 * 環境変数からパックをロード
 */
export async function loadPacksFromEnv(): Promise<void> {
  const packsEnv = process.env.EPSG_PACKS || 'jp';
  const packCodes = packsEnv.split(',').map(s => s.trim().toLowerCase());

  for (const code of packCodes) {
    try {
      const pack = await importPack(code);
      if (pack) {
        registerPack(pack);
      }
    } catch (err) {
      // パックのロード失敗はサーバー起動を止めない
      debug(`Failed to load pack '${code}': ${err}`);
    }
  }
}

/**
 * パックコードから動的インポート
 */
async function importPack(code: string): Promise<CountryPack | null> {
  switch (code) {
    case 'jp': {
      const { createJpPack } = await import('./jp/index.js');
      return createJpPack();
    }
    case 'us': {
      const { createUsPack } = await import('./us/index.js');
      return createUsPack();
    }
    case 'uk': {
      const { createUkPack } = await import('./uk/index.js');
      return createUkPack();
    }
    default:
      debug(`Unknown pack code: ${code}`);
      return null;
  }
}
```

**タスクリスト**:

- [ ] `src/packs/pack-manager.ts` 作成
- [ ] `src/index.ts` の起動シーケンスに `loadPacksFromEnv()` を追加

#### Step II-3: 日本パック切り出し

既存コードから日本固有のデータとロジックを抽出し、JP Pack として再構成する。

**データ移動**:

| 移動元 | 移動先 | 内容 |
|--------|--------|------|
| `src/data/static/japan-crs.json` | `src/packs/jp/crs-data.json` | CRSデータ（geographicCRS + projectedCRS） |
| `japan-crs.json` の `prefectureMapping` | `src/packs/jp/zone-mapping.json` | 47都道府県→系マッピング |
| `recommendations.json` の日本部分 | `src/packs/jp/recommendations.json` | 日本固有の推奨ルール |
| `recommendations.json` の `multiZonePrefectures` | `src/packs/jp/zone-mapping.json` | 北海道・沖縄の複数系マッピング |
| `transformations.json` の日本固有部分 | `src/packs/jp/transformations.json` | Tokyo Datum→JGD2011等 |
| `best-practices.json` の `japan_survey` | `src/packs/jp/best-practices.json` | 日本測量ベストプラクティス |
| `troubleshooting.json` の日本固有部分 | `src/packs/jp/troubleshooting.json` | 日本固有のトラブルシュート |
| `src/utils/validation-rules.ts` の日本ルール | `src/packs/jp/validation-rules.ts` | `NOT_OFFICIAL_SURVEY_CRS` 等 |

**ロジック移動**:

| 移動元 | 移動先 | 内容 |
|--------|--------|------|
| `recommendation-service.ts` の `isMultiZonePrefecture()` | `src/packs/jp/index.ts` | 北海道・沖縄の複数系判定 |
| `recommendation-service.ts` の `selectZoneForMultiZonePrefecture()` | `src/packs/jp/index.ts` | 複数系ゾーン選択 |
| `recommendation-service.ts` の `determineZoneFromCoordinate()` | `src/packs/jp/index.ts` | 座標からのゾーン判定 |
| `recommendation-service.ts` の `selectZoneForLocation()` | `src/packs/jp/index.ts` | CountryPack.selectZoneForLocation() 実装 |
| `constants/index.ts` の `JAPAN_BOUNDS` | `src/packs/jp/constants.ts` | 日本の地理的境界定数 |
| `constants/index.ts` の `EPSG.PLANE_RECT` | `src/packs/jp/constants.ts` | 平面直角座標系コード定数 |

**JP Pack エントリポイント**:

```typescript
// src/packs/jp/index.ts

import type { CountryPack, LocationSpec } from '../../types/index.js';
import crsData from './crs-data.json' with { type: 'json' };
import zoneMapping from './zone-mapping.json' with { type: 'json' };
import recommendations from './recommendations.json' with { type: 'json' };
import transformations from './transformations.json' with { type: 'json' };
import bestPractices from './best-practices.json' with { type: 'json' };
import troubleshooting from './troubleshooting.json' with { type: 'json' };
import { JP_BOUNDS } from './constants.js';
import { jpValidationRules } from './validation-rules.js';

export function createJpPack(): CountryPack {
  return {
    metadata: {
      countryCode: 'JP',
      name: 'Japan CRS Knowledge Pack',
      version: '1.0.0',
      primaryDatum: 'JGD2011',
      description: 'Japan Plane Rectangular CS I-XIX, JGD2011/JGD2000/Tokyo Datum knowledge',
      language: 'ja',
    },

    getCrsData: () => crsData,
    getZoneMapping: () => zoneMapping,
    getRecommendationRules: () => recommendations,
    getValidationRules: () => jpValidationRules,
    getTransformationKnowledge: () => transformations,
    getBestPractices: () => bestPractices,
    getTroubleshootingGuides: () => troubleshooting,

    selectZoneForLocation: async (location: LocationSpec) => {
      // 既存の selectZoneForLocation ロジックをここに移動
      // ...
    },

    isLocationInCountry: (location: LocationSpec) => {
      if (location.country?.toUpperCase() === 'JP') return true;
      if (location.subdivision && isJapanesePrefecture(location.subdivision)) return true;
      if (location.prefecture) return true; // 後方互換
      if (location.centerPoint) {
        const { lat, lng } = location.centerPoint;
        return (
          lat >= JP_BOUNDS.SOUTH && lat <= JP_BOUNDS.NORTH &&
          lng >= JP_BOUNDS.WEST && lng <= JP_BOUNDS.EAST
        );
      }
      return false;
    },
  };
}
```

**タスクリスト**:

- [ ] `src/packs/jp/` ディレクトリ作成
- [ ] `japan-crs.json` → `src/packs/jp/crs-data.json` + `src/packs/jp/zone-mapping.json` に分割
- [ ] `src/packs/jp/recommendations.json` に日本固有ルール抽出
- [ ] `src/packs/jp/validation-rules.ts` に日本固有検証ルール抽出
- [ ] `src/packs/jp/transformations.json` に日本固有変換経路抽出
- [ ] `src/packs/jp/best-practices.json` に日本固有ベストプラクティス抽出
- [ ] `src/packs/jp/troubleshooting.json` に日本固有トラブルシュート抽出
- [ ] `src/packs/jp/constants.ts` に日本固有定数移動
- [ ] `src/packs/jp/index.ts`（`createJpPack()`）実装

#### Step II-4: 既存サービスのPack対応改修

`recommendation-service.ts` の改修例:

```typescript
// src/services/recommendation-service.ts（改修後の中核ロジック）

export async function recommendCrs(
  purpose: Purpose,
  location: LocationSpec,
  requirements?: Requirements,
): Promise<RecommendCrsOutput> {
  // 1. LocationSpec 正規化
  const normalized = normalizeLocation(location);

  // 2. Pack を探す
  const pack = findPackForLocation(normalized);

  if (pack) {
    // 3a. Pack がある → Pack の推奨ロジックを使用
    return recommendWithPack(pack, purpose, normalized, requirements);
  }

  // 3b. Pack がない → UTM フォールバック or グローバル基盤
  return recommendWithFallback(purpose, normalized, requirements);
}
```

**タスクリスト**:

- [ ] `recommendation-service.ts` を Pack 委譲方式に改修
- [ ] `search-service.ts` で Pack CRS も検索対象に含める
- [ ] `validation.ts` で Pack 検証ルールを統合
- [ ] `transformation-service.ts` で Pack 変換知識を参照
- [ ] `comparison-service.ts` で Pack CRS も比較対象に
- [ ] `best-practices-service.ts` で Pack ベストプラクティスを統合
- [ ] `troubleshooting-service.ts` で Pack トラブルシュートを統合
- [ ] `data/loader.ts` を Pack 対応に改修（Pack CRS もインデックスに追加）

#### Step II-5: 既存テストの維持と追加

**最重要**: 既存306件のテストが全てパスすること。

- [ ] 全既存テストのパス確認（リグレッションゼロ）
- [ ] Pack管理のテスト追加
- [ ] LocationSpec 正規化のテスト追加
- [ ] Pack経由の推奨が既存と同等の結果を返すことの検証

---

### Phase III: SQLite 統合（オプショナル層）

**目標**: EPSGレジストリDBを利用可能にし、Pack がない国の CRS 基本情報を検索可能にする。

**バージョン**: v0.5.0

#### Step III-1: SQLiteローダー

```typescript
// src/data/sqlite-loader.ts

import { debug, info } from '../utils/logger.js';
import type { CrsDetail } from '../types/index.js';

let db: any = null; // better-sqlite3 インスタンス

/**
 * SQLite DBが利用可能かどうか
 */
export function isSqliteAvailable(): boolean {
  return db !== null;
}

/**
 * SQLite DBを初期化
 */
export async function initSqliteDb(dbPath: string): Promise<boolean> {
  try {
    // better-sqlite3 を動的インポート（オプショナル依存）
    const Database = (await import('better-sqlite3')).default;
    db = new Database(dbPath, { readonly: true });
    info(`EPSG SQLite DB loaded: ${dbPath}`);
    return true;
  } catch (err) {
    debug(`SQLite DB not available: ${err}`);
    return false;
  }
}

/**
 * EPSGコードでCRS基本情報を検索
 */
export function findCrsBySqlite(epsgCode: number): CrsDetail | null {
  if (!db) return null;

  const row = db.prepare(`
    SELECT
      coord_ref_sys_code,
      coord_ref_sys_name,
      coord_ref_sys_kind,
      deprecated,
      area_of_use_code,
      remarks
    FROM epsg_coordinatereferencesystem
    WHERE coord_ref_sys_code = ?
  `).get(epsgCode);

  if (!row) return null;

  return mapRowToCrsDetail(row);
}

/**
 * キーワードでCRSを検索
 */
export function searchCrsBySqlite(
  query: string,
  limit: number = 10
): CrsDetail[] {
  if (!db) return [];

  const rows = db.prepare(`
    SELECT
      coord_ref_sys_code,
      coord_ref_sys_name,
      coord_ref_sys_kind,
      deprecated,
      remarks
    FROM epsg_coordinatereferencesystem
    WHERE coord_ref_sys_name LIKE ?
      AND deprecated = 0
    ORDER BY coord_ref_sys_code
    LIMIT ?
  `).all(`%${query}%`, limit);

  return rows.map(mapRowToCrsDetail);
}
```

**注意**: `better-sqlite3` は `optionalDependencies` として追加する。
SQLite DB が未設定の場合でも、サーバーは正常に起動しPack + UTMのみで動作する。

**タスクリスト**:

- [ ] `better-sqlite3` を `optionalDependencies` に追加
- [ ] `src/data/sqlite-loader.ts` 作成
- [ ] `src/index.ts` で `EPSG_DB_PATH` 環境変数をチェックし、存在すればDB初期化
- [ ] `search-service.ts` に SQLite フォールバック検索を追加
- [ ] `get_crs_detail` ハンドラーに SQLite フォールバックを追加
- [ ] テスト追加（SQLiteあり/なし両方のケース）
- [ ] README に SQLite 設定手順を記載

#### Step III-2: EPSG DB取得スクリプト

```typescript
// scripts/download-epsg-db.ts
// ユーザーがオプショナルで実行するスクリプト

/**
 * EPSG レジストリデータベース（SQLite形式）をダウンロード
 * ソース: IOGP (International Association of Oil & Gas Producers)
 * URL: https://epsg.org/
 */
```

- [ ] `scripts/download-epsg-db.ts` 作成
- [ ] `package.json` に `"epsg:download-db"` スクリプト追加
- [ ] ダウンロードURL・ライセンス確認（IOGP利用規約準拠）

---

### Phase IV: 米国パック実装（構造検証）

**目標**: JP Pack 以外の初のパック実装により、CountryPack アーキテクチャの妥当性を検証する。

**バージョン**: v0.6.0

#### US Pack の構成

```
src/packs/us/
├── index.ts                  # US Pack エントリポイント
├── crs-data.json             # NAD83系、State Plane 主要ゾーン
├── zone-mapping.json         # 州 → SPCS ゾーンマッピング
├── recommendations.json      # 米国向け推奨ルール
├── validation-rules.ts       # 米国向け検証ルール
├── transformations.json      # NAD27→NAD83、NAD83→NAD83(2011)
├── best-practices.json       # 米国向けベストプラクティス
└── troubleshooting.json      # 米国向けトラブルシュート
```

**収録CRS（初期）**:

| EPSG | 名称 | 用途 |
|------|------|------|
| 4269 | NAD83 | 地理座標系（北米基準） |
| 6318 | NAD83(2011) | 最新測地系 |
| 2229 | NAD83 / California zone 5 | SPCS例 |
| 2263 | NAD83 / New York Long Island | SPCS例 |
| 6350 | NAD83(2011) / Conus Albers | 全米等積 |
| 32610-32619 | UTM 10N-19N | 米国本土UTM |

**州→SPCSゾーンマッピング（一部抜粋）**:

```json
{
  "entries": {
    "California": { "zone": "Zone 5", "code": "EPSG:2229", "notes": "Multiple zones (1-6)" },
    "New York": { "zone": "Long Island", "code": "EPSG:2263", "notes": "Multiple zones" },
    "Texas": { "zone": "Central", "code": "EPSG:2277", "notes": "Multiple zones (N/NC/C/SC/S)" }
  },
  "multiZoneRegions": {
    "California": {
      "default": "EPSG:2229",
      "subRegions": {
        "Northern California": "EPSG:2225",
        "Southern California": "EPSG:2229"
      },
      "cities": {
        "Los Angeles": "EPSG:2229",
        "San Francisco": "EPSG:2227"
      },
      "note": "California has 6 State Plane zones"
    }
  }
}
```

**タスクリスト**:

- [ ] `src/packs/us/` ディレクトリ作成
- [ ] `crs-data.json` 作成（主要CRS、段階的に拡充）
- [ ] `zone-mapping.json` 作成（全50州 + DC）
- [ ] `recommendations.json` 作成
- [ ] `validation-rules.ts` 作成（`NOT_OFFICIAL_SURVEY_CRS` の米国版等）
- [ ] `transformations.json` 作成（NAD27→NAD83 知識）
- [ ] `best-practices.json` 作成（米国測量のベストプラクティス）
- [ ] `troubleshooting.json` 作成
- [ ] `index.ts`（`createUsPack()`）実装
- [ ] テスト追加（推奨結果の検証、JP Pack との独立性検証）
- [ ] **CountryPack インターフェースの改善点をフィードバック**

#### 検証ポイント

US Pack 実装を通じて、以下を検証する:

1. CountryPack インターフェースが十分に汎用的か
2. Pack 切り替えが正しく動作するか
3. JP Pack と US Pack の共存時に干渉がないか
4. UTM フォールバックとの優先順位が正しいか
5. Pack 追加時のパフォーマンスへの影響

---

### Phase V: 英国パック + 追加パック + ドキュメント

**目標**: 3つ目のパック実装でパターンを確立し、コミュニティ向けドキュメントを整備する。

**バージョン**: v1.0.0

#### Step V-1: UK Pack

```
src/packs/uk/
├── index.ts
├── crs-data.json             # OSGB36/BNG、ETRS89
├── zone-mapping.json         # 単一グリッド（シンプル）
├── recommendations.json
├── validation-rules.ts
├── transformations.json      # OSGB36→ETRS89
├── best-practices.json
└── troubleshooting.json
```

**収録CRS**:

| EPSG | 名称 | 用途 |
|------|------|------|
| 4277 | OSGB 1936 | 旧測地系 |
| 27700 | OSGB 1936 / British National Grid | 英国測量 |
| 4258 | ETRS89 | 欧州測地系 |
| 3857 | Web Mercator | Web表示 |

- [ ] UK Pack 実装

#### Step V-2: パック作成ガイドライン

コミュニティや他の開発者がパックを作成できるよう、ガイドラインを整備する。

```markdown
# Country Pack 作成ガイド

## 必要なファイル
1. `index.ts` - CountryPack インターフェース実装
2. `crs-data.json` - CRS定義データ
3. `zone-mapping.json` - 地域→ゾーンマッピング
4. `recommendations.json` - 推奨ルール
5. `validation-rules.ts` - 検証ルール
6. `transformations.json` - 変換知識
7. `best-practices.json` - ベストプラクティス
8. `troubleshooting.json` - トラブルシュート

## 最小構成
最低限 index.ts と crs-data.json があればパックとして機能する。
他のファイルが存在しない場合、該当機能はグローバルフォールバックを使用する。

## データの調べ方
- EPSG Registry: https://epsg.org/
- 各国の測量局サイト
- ...
```

- [ ] `docs/creating-country-packs.md` 作成
- [ ] JP Pack を参照実装として整備（コメント充実化）

#### Step V-3: README・ドキュメント更新

- [ ] `README.md` 更新（マルチ地域対応の記載）
- [ ] `README.ja.md` 更新
- [ ] `CLAUDE.md` 更新（新しいファイル構成の反映）
- [ ] `CHANGELOG.md` 更新

---

## 6. テスト計画

### 6.1 テスト戦略

| フェーズ | 新規テスト概算 | 重点テスト領域 |
|---------|---------------|---------------|
| Phase I | ~40件 | UTM計算、LocationSpec正規化、後方互換性 |
| Phase II | ~60件 | Pack管理、JP Pack切り出し後の既存互換 |
| Phase III | ~20件 | SQLiteあり/なし、フォールバック |
| Phase IV | ~50件 | US Pack推奨・検証、Pack共存 |
| Phase V | ~30件 | UK Pack、パック作成ガイドの検証 |
| **合計** | **~200件** | **既存306 + 新規200 = ~506件** |

### 6.2 リグレッション防止

各フェーズで以下を必ず実施:

```bash
# 全テスト実行
npm test

# 既存テストのみ実行（リグレッション確認用タグ付け推奨）
npm test -- --grep "existing"
```

**Phase II 完了時の最重要検証**:

```typescript
describe('Backward Compatibility after JP Pack extraction', () => {
  // Phase 1-4 で書かれた全テストケースがパスすること
  // 特に以下の既存テストの結果が変わらないこと:

  it('should recommend zone IX for Tokyo survey', async () => {
    const result = await recommendCrs('survey', { prefecture: '東京都' });
    expect(result.primary.code).toBe('EPSG:6677');
  });

  it('should handle Hokkaido multi-zone', async () => {
    const result = await recommendCrs('survey', {
      prefecture: '北海道',
      city: '札幌市',
    });
    expect(result.primary.code).toBe('EPSG:6679');
  });

  // ... 他の全既存テスト
});
```

---

## 7. マイグレーションガイド（利用者向け）

### v0.2.0 → v1.0.0

**破壊的変更: なし**

既存の設定・利用方法はそのまま動作する。

```jsonc
// 変更不要 - 既存設定がそのまま動く
{
  "mcpServers": {
    "epsg": {
      "command": "npx",
      "args": ["@shuji-bonji/epsg-mcp"]
    }
  }
}
```

**新機能を有効にする場合**:

```jsonc
{
  "mcpServers": {
    "epsg": {
      "command": "npx",
      "args": ["@shuji-bonji/epsg-mcp"],
      "env": {
        "EPSG_PACKS": "jp,us,uk",           // 追加パック有効化
        "EPSG_DB_PATH": "/path/to/epsg.db"  // SQLite DB（オプション）
      }
    }
  }
}
```

### API の後方互換性

| パラメータ | v0.2.0 | v1.0.0 | 互換性 |
|-----------|--------|--------|--------|
| `country: "Japan"` | ✅ | ✅（内部で"JP"に変換） | 完全互換 |
| `country: "Global"` | ✅ | ✅（内部で"GLOBAL"に変換） | 完全互換 |
| `prefecture: "東京都"` | ✅ | ✅（内部でsubdivisionに変換） | 完全互換 |
| `country: "JP"` | ❌ | ✅ | 新機能 |
| `subdivision: "California"` | ❌ | ✅ | 新機能 |
| `country: "US"` | ❌ | ✅（US Pack有効時） | 新機能 |

---

## 8. ロードマップ

```
v0.2.0 (現在)
  └── Phase 1-4 完了: 9ツール、306テスト

v0.3.0 - Phase I: 基盤整備
  ├── UTMゾーン自動計算（Layer 2）
  ├── LocationSpec正規化 + 後方互換
  └── global-crs.json英語化

v0.4.0 - Phase II: Pack基盤
  ├── CountryPackインターフェース
  ├── パック管理システム
  ├── JP Pack切り出し
  └── 既存サービスのPack対応

v0.5.0 - Phase III: SQLite統合
  ├── SQLiteローダー（オプショナル）
  ├── EPSG DB取得スクリプト
  └── フォールバック検索

v0.6.0 - Phase IV: US Pack
  ├── 米国パック実装（構造検証）
  └── CountryPack IFの改善

v1.0.0 - Phase V: 正式リリース
  ├── UK Pack
  ├── パック作成ガイド
  └── ドキュメント整備
```

---

## 9. リスクと対策

| リスク | 影響度 | 対策 |
|--------|-------|------|
| JP Pack切り出し時のリグレッション | 高 | 既存306テストをセーフティネットとして活用。Phase II完了時に全テストパス必須 |
| CountryPackインターフェースが不十分 | 中 | US Pack実装（Phase IV）で検証し、必要に応じて改善。JP Pack実装時点では過度な汎用化を避ける |
| SQLite依存によるパッケージサイズ増加 | 低 | `optionalDependencies`として追加。未インストール時もサーバーは正常動作 |
| 各国CRSデータの正確性 | 中 | 初期リリースは主要CRSのみに限定。EPSGレジストリを正とする。コミュニティフィードバックで拡充 |
| パフォーマンス劣化 | 低 | Pack CRSはプリロード。SQLiteはインデックスあり。既存ベンチマーク（<5ms）を維持 |
| EPSG DB のライセンス問題 | 中 | IOGP利用規約を確認。DBファイルそのものはパッケージに同梱せず、ユーザーが自分でダウンロードする方式 |
