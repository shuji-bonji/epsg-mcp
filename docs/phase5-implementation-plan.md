# Phase 5: 国際化（マルチ地域対応）実装計画書

> **バージョン**: 1.2.0
> **作成日**: 2026-02-02
> **更新日**: 2026-02-02
> **変更履歴**: Strangler Fig パターン適用、list_crs_by_region Pack 対応追加
> **対象**: epsg-mcp v0.4.0 → v1.0.0
> **前提**: Phase 1-4 完了済み（9ツール実装、テスト379件）
> **参照設計書**: [internationalization-design.md](./internationalization-design.md)

## 1. 概要

### 1.1 目的

現在の日本特化型アーキテクチャを、後方互換性を維持しながら国際対応可能な構造へ拡張する。

### 1.2 主要目標

1. **UTMゾーン自動計算**: 世界中どこでも最低限の投影座標系を推奨可能にする
2. **Country Knowledge Pack**: 各国固有の知識（日本の平面直角座標系、米国のState Plane等）をモジュール化
3. **SQLite統合（オプション）**: EPSGレジストリDBによるフォールバック検索
4. **後方互換性**: 既存API・動作を100%維持

### 1.3 3層フォールバックモデル

```
┌─────────────────────────────────────────────────────────┐
│ Layer 3: Country Knowledge Pack（各国ナレッジパック）    │
│  - 地域→ゾーンマッピング（都道府県→系、州→SPCS等）      │
│  - 用途別推奨ロジック、ベストプラクティス                 │
│  ※ 日本パック = 既存機能の切り出し                       │
├─────────────────────────────────────────────────────────┤
│ Layer 2: UTMゾーン自動計算（汎用フォールバック）          │
│  - centerPoint/boundingBox から UTMゾーン番号を計算      │
│  - 全120 CRS対応（60ゾーン × N/S）                       │
├─────────────────────────────────────────────────────────┤
│ Layer 1: グローバル基盤                                  │
│  - WGS84, Web Mercator, 主要地域測地系                   │
│  ※ SQLite DB利用時は全EPSG CRS検索可能（オプション）     │
└─────────────────────────────────────────────────────────┘
```

## 2. 実装フェーズ

### Phase 5-1: 基盤整備とUTMフォールバック

**バージョン**: v0.5.0
**工数目安**: 3-4日

### Phase 5-2: CountryPack基盤と日本パック切り出し

**バージョン**: v0.6.0
**工数目安**: 5-7日

### Phase 5-3: SQLite統合（オプショナル）

**バージョン**: v0.7.0
**工数目安**: 2-3日

### Phase 5-4: 米国パック実装（構造検証）

**バージョン**: v0.8.0
**工数目安**: 4-5日

### Phase 5-5: 追加パック・ドキュメント整備

**バージョン**: v1.0.0
**工数目安**: 3-4日

## 3. Phase 5-1: 基盤整備とUTMフォールバック

### 3.1 目標

パックがない国でも、座標さえあれば適切なUTMゾーンを推奨できる状態にする。

### 3.2 新規ファイル

| ファイル                           | 説明                        |
| ---------------------------------- | --------------------------- |
| `src/utils/utm.ts`                 | UTMゾーン計算ユーティリティ |
| `src/utils/location-normalizer.ts` | LocationSpec正規化          |
| `src/services/utm-service.ts`      | UTMベース推奨サービス       |

### 3.3 タスクリスト

#### Step 1: UTMゾーン計算ユーティリティ

- [ ] `src/utils/utm.ts` 作成
  - `getUtmZone(lng: number): number` - 経度からゾーン番号計算
  - `getUtmEpsgCode(lat: number, lng: number): string` - EPSG コード取得
  - `generateUtmCrsDetail(lat: number, lng: number): CrsDetail` - CRS詳細生成
- [ ] `src/constants/index.ts` にUTM関連定数追加

```typescript
// 実装例
export function getUtmZone(lng: number): number {
	return Math.floor((lng + 180) / 6) + 1;
}

export function getUtmEpsgCode(lat: number, lng: number): string {
	const zone = getUtmZone(lng);
	const base = lat >= 0 ? 32600 : 32700; // N or S
	return `EPSG:${base + zone}`;
}
```

#### Step 2: LocationSpec 正規化

**スコープ注意**: Phase 5-1 では型定義とスキーマへの `subdivision` 追加、および `normalizeLocation()` での `prefecture → subdivision` 変換に限定する。実際のサービス層での `subdivision` 活用（Pack が `subdivision` を使って `selectZoneForLocation` を呼ぶ等）は **Phase 5-2** で行う。

- [ ] `src/utils/location-normalizer.ts` 作成
  - `normalizeCountry()` - "Japan"→"JP" 等のエイリアス解決
  - `normalizeLocation()` - `prefecture`→`subdivision` マイグレーション（変換のみ、利用は5-2で）
  - `inferCountryFromSubdivision()` - subdivisionから国を推定
- [ ] `src/schemas/index.ts` の LocationSpec スキーマ更新（`subdivision` 追加）
- [ ] `src/types/crs.ts` の LocationSpec 型更新（`subdivision` 追加、`prefecture` に `@deprecated` 注記）
- [ ] 全ハンドラーの入口で `normalizeLocation()` を呼ぶよう改修

```typescript
// 後方互換マッピング
const COUNTRY_ALIASES: Record<string, string> = {
	japan: 'JP',
	日本: 'JP',
	global: 'GLOBAL',
	'united states': 'US',
	usa: 'US',
	'united kingdom': 'GB',
	uk: 'GB',
	// ...
};

// normalizeLocation() の実装
export function normalizeLocation(location: LocationSpec): LocationSpec {
  const normalized = { ...location };
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
```

#### Step 3: UTMサービス統合

- [ ] `src/services/utm-service.ts` 作成（UTMベースの推奨ロジック）
- [ ] `recommendation-service.ts` にUTMフォールバック追加
- [ ] `search-service.ts` でUTM CRSも検索結果に含める（動的生成）

#### Step 4: global-crs.json 英語化

**影響分析**: `remarks` を日本語から英語に変更することで、以下の影響が発生する可能性がある。

- `search-service.ts` の検索スコアリングで `REMARKS_CONTAINS`（60点）を使用している
- 日本語キーワード（例: "経度", "緯度"）での検索結果が変わる可能性
- **対策**: `global-crs.json` の `remarks` は英語化するが、日本語の `remarks` は JP Pack 側に保持する

**タスク**:
- [ ] `global-crs.json` の既存テストで `remarks` 内容を検証しているケースを洗い出し
- [ ] `remarks` を英語に変更した場合の検索結果への影響をテストで確認
- [ ] `global-crs.json` の全 `remarks` を英語に変更
- [ ] 主要グローバルCRS追加
  - `EPSG:6350` NAD83(2011) / Conus Albers
  - `EPSG:3035` ETRS89-extended / LAEA Europe
- [ ] `japan-crs.json` の `remarks` は JP Pack に移動時も日本語を保持（Phase 5-2）

### 3.4 テスト項目

#### 正常系テスト

```typescript
describe('UTM Zone Calculation', () => {
	it('should calculate UTM zone from longitude', () => {
		expect(getUtmZone(139.69)).toBe(54); // Tokyo
		expect(getUtmZone(-118.24)).toBe(11); // Los Angeles
		expect(getUtmZone(-0.12)).toBe(30); // London
	});

	it('should generate correct EPSG code', () => {
		expect(getUtmEpsgCode(35.68, 139.69)).toBe('EPSG:32654'); // Tokyo N
		expect(getUtmEpsgCode(-33.87, 151.21)).toBe('EPSG:32756'); // Sydney S
	});
});

describe('Location Normalization - Backward Compatibility', () => {
	it('should normalize "Japan" to "JP"', () => {
		const result = normalizeLocation({ country: 'Japan' });
		expect(result.country).toBe('JP');
	});

	it('should keep existing API working', async () => {
		const result = await recommendCrs('survey', { prefecture: '東京都' });
		expect(result.primary.code).toBe('EPSG:6677');
	});
});
```

#### エッジケース・ネガティブテスト

```typescript
describe('UTM Edge Cases', () => {
	it('should handle antimeridian (lng=180)', () => {
		expect(getUtmZone(180)).toBe(60);
		expect(getUtmZone(-180)).toBe(1);
	});

	it('should handle boundary between zones', () => {
		// ゾーン境界での動作確認（例: 6度刻みの境界）
		expect(getUtmZone(6)).toBe(31);  // ゾーン31の東端
		expect(getUtmZone(-6)).toBe(30); // ゾーン30の西端
	});

	it('should handle polar regions warning (lat > 84 or < -80)', () => {
		// UTMは84°N〜80°Sが範囲。範囲外では警告を返すことを確認
		const result = await recommendCrs('distance_calculation', {
			centerPoint: { lat: 85, lng: 0 }, // 北極圏
		});
		expect(result.warnings).toContainEqual(
			expect.stringContaining('polar') // 極地域に関する警告
		);
	});

	it('should handle invalid coordinates gracefully', () => {
		expect(() => getUtmEpsgCode(NaN, 139)).toThrow();
		expect(() => getUtmEpsgCode(35.68, NaN)).toThrow();
		expect(() => getUtmZone(Infinity)).toThrow();
	});
});

describe('Location Normalization Edge Cases', () => {
	it('should handle empty location', () => {
		const result = normalizeLocation({});
		expect(result).toEqual({});
	});

	it('should handle unknown country gracefully', () => {
		const result = normalizeLocation({ country: 'UnknownCountry' });
		expect(result.country).toBe('UNKNOWNCOUNTRY'); // 大文字化のみ
	});

	it('should handle mixed case input', () => {
		expect(normalizeLocation({ country: 'jApAn' }).country).toBe('JP');
		expect(normalizeLocation({ country: 'JAPAN' }).country).toBe('JP');
	});
});
```

### 3.5 完了基準

- [ ] 既存379テスト全てパス
- [ ] 新規テスト約40件追加・パス
- [ ] 座標のみの指定で適切なUTMゾーンが推奨される

## 4. Phase 5-2: CountryPack基盤と日本パック切り出し

### 4.1 目標

日本の既存機能をパック構造に切り出し、パックシステムの基盤を確立する。

### 4.2 新規ディレクトリ構造

```
src/
├── types/
│   └── country-pack.ts          # CountryPackインターフェース
├── packs/
│   ├── pack-manager.ts          # パック管理
│   └── jp/                      # 日本パック
│       ├── index.ts             # エントリポイント
│       ├── crs-data.json        # CRSデータ
│       ├── zone-mapping.json    # 都道府県マッピング
│       ├── recommendations.json # 推奨ルール
│       ├── validation-rules.ts  # 検証ルール
│       ├── transformations.json # 変換経路
│       ├── best-practices.json  # ベストプラクティス
│       ├── troubleshooting.json # トラブルシュート
│       └── constants.ts         # 日本固有定数
└── ...
```

### 4.3 タスクリスト

#### Step 1: CountryPack インターフェース定義

- [ ] `src/types/country-pack.ts` 作成
  - `PackMetadata` - パックメタデータ
  - `ZoneMapping` - 地域→ゾーンマッピング
  - `PackRecommendationRules` - 推奨ルール
  - `CountryPack` - メインインターフェース
- [ ] `src/types/index.ts` からエクスポート

```typescript
// src/types/country-pack.ts - 主要インターフェース定義

export interface PackMetadata {
  countryCode: string;     // ISO 3166-1 alpha-2 ("JP", "US", "GB")
  name: string;            // パック名
  version: string;         // バージョン
  primaryDatum: string;    // 主要測地系
  description: string;     // パックの説明
  language: string;        // remarksの言語
}

export interface ZoneMapping {
  entries: Record<string, ZoneMappingEntry>;
  multiZoneRegions?: Record<string, MultiZoneConfig>;
}

export interface ZoneMappingEntry {
  zone: string;
  code: string;
  notes?: string;
}

export interface MultiZoneConfig {
  default: string;
  subRegions: Record<string, string>;
  cities: Record<string, string>;
  note: string;
}

export interface CountryPack {
  metadata: PackMetadata;
  getCrsData(): PackCrsDataSet;
  getZoneMapping(): ZoneMapping;
  getRecommendationRules(): PackRecommendationRules;
  getValidationRules(): PackValidationRule[];
  getTransformationKnowledge(): PackTransformationKnowledge;
  getBestPractices(): PackBestPractice[];
  getTroubleshootingGuides(): PackTroubleshootingGuide[];
  selectZoneForLocation(location: LocationSpec): Promise<string | null>;
  isLocationInCountry(location: LocationSpec): boolean;
}
```

#### Step 2: パック管理システム

- [ ] `src/packs/pack-manager.ts` 作成
  - `registerPack()` - パック登録
  - `getPackForCountry()` - 国コードからパック取得
  - `findPackForLocation()` - LocationSpecから該当パック検索
  - `loadPacksFromEnv()` - 環境変数からパックロード
- [ ] `src/index.ts` の起動シーケンスに `loadPacksFromEnv()` 追加

#### Step 3: JP Pack の並行構築（Strangler Fig パターン）

> **方針**: 既存ファイルは**削除せず**、新しい Pack 構造に**コピー**する。
> 中間状態でも既存テストが全てパスする状態を維持する。

**Phase A: データのコピー（既存ファイルは残す）**

| コピー元                              | コピー先                               | 備考                     |
| ------------------------------------- | -------------------------------------- | ------------------------ |
| `japan-crs.json`                      | `src/packs/jp/crs-data.json`           | CRS定義                  |
| `japan-crs.json` の `prefectureZones` | `src/packs/jp/zone-mapping.json`       | マッピング部分を分離     |
| `recommendations.json` の日本部分     | `src/packs/jp/recommendations.json`    | 日本固有推奨ルール       |
| `transformations.json` の日本固有部分 | `src/packs/jp/transformations.json`    | Tokyo→JGD変換等          |
| `best-practices.json` の日本固有部分  | `src/packs/jp/best-practices.json`     | `japan_survey` トピック等|
| `troubleshooting.json` の日本固有部分 | `src/packs/jp/troubleshooting.json`    | 日本固有の症状・解決策   |

**Phase B: ロジックのコピー（既存関数は残す）**

| コピー元                                                  | コピー先                      | 備考                  |
| --------------------------------------------------------- | ----------------------------- | --------------------- |
| `recommendation-service.ts` の日本固有関数                | `src/packs/jp/index.ts`       | 関数を Pack にコピー  |
| `constants/index.ts` の `JAPAN_BOUNDS`, `EPSG.PLANE_RECT` | `src/packs/jp/constants.ts`   | 定数を Pack にコピー  |

- [ ] `src/packs/jp/index.ts`（`createJpPack()`）実装
- [ ] **注意**: 既存の `japan-crs.json`, `recommendation-service.ts` 等は削除しない
- [ ] テスト実行: 既存379テスト全パスを確認

#### Step 4: data/loader.ts の二重サポート（Strangler Fig パターン）

> **方針**: 既存読み込みロジックを残しつつ、Pack からも読み込む「二重サポート」を実装。
> Pack が見つかれば Pack 優先、なければ既存ファイルにフォールバック。

**現在の責務**:
- `preloadAll()` → `japan-crs.json` + `global-crs.json` をハードコードでロード
- `findCrsById()` → 上記2ファイルから検索
- `getZoneMapping()` → `japan-crs.json` から取得

**改修後の責務（二重サポート期間中）**:
- `preloadAll()` → `global-crs.json` + 各 Pack CRS + **既存 `japan-crs.json`（フォールバック）**
- `findCrsById()` → Pack CRS → グローバル CRS → **既存データ（フォールバック）**
- `getZoneMapping()` → Pack から取得 → **既存 `japan-crs.json` にフォールバック**

**タスク**:
- [ ] `preloadAll()` を Pack 対応に改修（フォールバック維持）
  - `loadPacksFromEnv()` 呼び出しを追加
  - Pack CRS をインデックスに追加
  - **既存 `japan-crs.json` ロードも残す**（`EPSG_PACKS` 未設定時のため）
- [ ] `findCrsById()` を改修（優先順位: Pack → グローバル → 既存）
  - Pack CRS 検索を追加
  - 既存ロジックをフォールバックとして残す
- [ ] `getZoneMapping()` に Pack 委譲を追加
  - `getPackForCountry('JP')?.getZoneMapping()` を試行
  - 失敗時は既存 `japan-crs.json` から取得
- [ ] `loadRecommendations()` を二重サポートに改修
  - Pack から国固有部分を取得を試行
  - フォールバック: 既存 `recommendations.json` 全体を使用
- [ ] `loadTransformations()` を二重サポートに改修（同様）
- [ ] `loadBestPractices()` を二重サポートに改修（同様）
- [ ] `loadTroubleshooting()` を二重サポートに改修（同様）
- [ ] テスト実行: 既存379テスト全パスを確認（Pack あり/なし両方）

#### Step 5: recommendation-service.ts の Pack 対応

**移動対象関数（→ JP Pack へ）**:
- `isMultiZonePrefecture()` → `src/packs/jp/index.ts`
- `selectZoneForMultiZonePrefecture()` → `src/packs/jp/index.ts`
- `determineZoneFromCoordinate()` → `src/packs/jp/index.ts`
- `selectZoneForLocation()` → `src/packs/jp/index.ts`（`CountryPack.selectZoneForLocation()` として実装）

**新規関数**:
- [ ] `recommendWithPack(pack, purpose, location, requirements)` - Pack 委譲ロジック
- [ ] `recommendWithFallback(purpose, location, requirements)` - UTM/グローバルフォールバック
- [ ] `recommendCrs()` のエントリポイントを Pack → UTM → グローバルの3層分岐に改修

```typescript
// 改修後の recommendCrs() 構造
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

#### Step 6: search-service.ts の Pack 対応

- [ ] `searchInPacks(query, options)` 関数追加
  - 登録済み Pack の CRS データを検索
  - 検索スコアリングは既存ロジック流用
- [ ] `searchCrs()` に Pack CRS 検索を統合
  - グローバル CRS + Pack CRS を結合して検索
- [ ] `getCrsDetail()` に Pack CRS フォールバック追加
  - Pack CRS も詳細取得対象に

#### Step 7: validation.ts の Pack 対応

- [ ] `getPackValidationRules(pack)` 関数追加
  - Pack 固有の検証ルールを取得
- [ ] `validateCrsUsage()` で Pack 検証ルールを統合
  - 共通ルール + Pack 固有ルールを結合
- [ ] 日本固有ルールを JP Pack に移動
  - `NOT_OFFICIAL_SURVEY_CRS` → `src/packs/jp/validation-rules.ts`
  - `ZONE_MISMATCH` （平面直角座標系）→ `src/packs/jp/validation-rules.ts`

#### Step 8: transformation-service.ts の Pack 対応

- [ ] `getPackTransformations(pack)` 関数追加
  - Pack 固有の変換知識を取得
- [ ] `buildTransformationGraph()` で Pack 変換知識を統合
  - グローバル変換 + Pack 固有変換を結合してグラフ構築
- [ ] `generateWarnings()` で Pack 固有の非推奨 CRS 警告を追加

#### Step 9: comparison-service.ts の Pack 対応

- [ ] `getPackCrsCharacteristics(pack, code)` 関数追加
  - Pack CRS の特性データを取得
- [ ] `compareCrs()` で Pack CRS も比較対象に
  - Pack CRS の歪み特性、互換性情報を統合

#### Step 10: best-practices-service.ts の Pack 対応

- [ ] `getPackBestPractices(pack, topic)` 関数追加
- [ ] `getBestPractices()` で Pack ベストプラクティスを優先
  - Pack にトピックがあれば Pack から取得
  - なければグローバル共通から取得

#### Step 11: troubleshooting-service.ts の Pack 対応

- [ ] `getPackTroubleshootingGuides(pack)` 関数追加
- [ ] `troubleshoot()` で Pack トラブルシュート知識を統合
  - 症状マッチング時に Pack 固有の原因・解決策を優先

#### Step 12: list_crs_by_region ハンドラーの Pack 対応

> **背景**: 現在 `region: "Japan" | "Global"` の二択だが、Pack 対応後は
> `"US"`, `"UK"`, `"Europe"` 等も受け付けられるようにする必要がある。

**スキーマ更新**:
- [ ] `src/schemas/index.ts` の `region` パラメータを拡張
  ```typescript
  // 現状
  region: z.enum(['Japan', 'Global'])

  // 改修後
  region: z.union([
    z.enum(['Japan', 'Global']),  // 後方互換
    z.string(),  // Pack コードを受け付け（"US", "UK", etc.）
  ])
  ```

**ツール定義更新**:
- [ ] `src/tools/definitions.ts` の `list_crs_by_region` ツール定義を更新
  - `region` パラメータの `description` に Pack コードも利用可能なことを記載
  - 例: `"Region to list CRS for. Use 'Japan' or 'Global' for backward compatibility, or ISO 3166-1 alpha-2 country codes ('JP', 'US', 'UK') for Pack-based regions."`
  - **注意**: 動的に登録済み Pack から enum を生成する方式は複雑化するため、description ベースでの説明を推奨

**ハンドラー改修**:
- [ ] `src/tools/handlers.ts` の `listCrsByRegion` 関数を改修
  - `region` が Pack コード（"JP", "US" 等）の場合 → Pack の CRS を返す
  - `region` が "Japan" の場合 → 後方互換として "JP" Pack を使用
  - `region` が "Global" の場合 → グローバル CRS を返す（従来通り）

  ```typescript
  async function listCrsByRegion(input: ListCrsByRegionInput): Promise<ListCrsByRegionOutput> {
    const { region, type, includeDeprecated } = input;

    // 後方互換: "Japan" → "JP"
    const normalizedRegion = region === 'Japan' ? 'JP' : region;

    if (normalizedRegion === 'Global') {
      // 従来通りグローバル CRS を返す
      return getGlobalCrsList(type, includeDeprecated);
    }

    // Pack から CRS リストを取得
    const pack = getPackForCountry(normalizedRegion);
    if (pack) {
      const crsList = pack.getCrsData().crs;
      // フィルタリング・推奨情報付与
      return formatPackCrsList(pack, crsList, type, includeDeprecated);
    }

    // Pack がない場合はエラー or 空リスト
    throw new ValidationError(`Unknown region: ${region}`);
  }
  ```

**戻り値の拡張**:
- [ ] `recommendedFor` の生成を Pack 対応に
  - Pack がある場合 → Pack の推奨情報を使用
  - Pack がない場合 → 汎用的な推奨（UTM 等）

**テスト**:
- [ ] `region: "Japan"` で従来通り動作（後方互換）
- [ ] `region: "JP"` で JP Pack CRS が返る
- [ ] `region: "US"` で US Pack CRS が返る（Phase 5-4 以降）
- [ ] `region: "Global"` で従来通り動作
- [ ] 未知の region でエラー

#### Step 13: 既存ファイルのクリーンアップ（最終ステップ）

> **重要**: このステップは **Phase 5-2 の全テストがパスした後**、かつ
> **Phase 5-4（US Pack）で Pack システムの動作が十分に検証された後** に実行する。
> 急いで削除しないこと。

**削除対象（Strangler Fig パターンの完了）**:

| 削除対象                                        | 条件                                      |
| ----------------------------------------------- | ----------------------------------------- |
| `src/data/static/japan-crs.json`                | JP Pack が全機能をカバーしていることを確認 |
| `recommendations.json` 内の日本固有部分         | JP Pack に移動済みであることを確認         |
| `transformations.json` 内の日本固有部分         | JP Pack に移動済みであることを確認         |
| `best-practices.json` 内の日本固有部分          | JP Pack に移動済みであることを確認         |
| `troubleshooting.json` 内の日本固有部分         | JP Pack に移動済みであることを確認         |
| `recommendation-service.ts` の日本固有関数      | JP Pack に移動済みであることを確認         |
| `constants/index.ts` の `JAPAN_BOUNDS` 等       | JP Pack に移動済みであることを確認         |
| `data/loader.ts` のフォールバックロジック       | 全 Pack 経由で動作することを確認           |

**チェックリスト**:
- [ ] 全379+件のテストがパス
- [ ] `EPSG_PACKS="jp"` で従来と同等の動作
- [ ] `EPSG_PACKS=""` で UTM フォールバックが動作
- [ ] 削除後にビルドエラーがないこと
- [ ] git diff で削除範囲を最終確認

**注意**: このステップは **Phase 5-4 完了後**（v0.8.0 リリース後）に実行を推奨。
Phase 5-2 完了時点では削除せず、二重サポートを維持する。

### 4.4 テスト項目

#### 後方互換性テスト（最重要）

```typescript
describe('Backward Compatibility after JP Pack extraction', () => {
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

	it('should search Japan CRS by Japanese keyword', async () => {
		const result = await searchCrs({ query: '平面直角座標系' });
		expect(result.results.length).toBeGreaterThan(0);
	});

	it('should validate with Japan-specific rules', async () => {
		const result = await validateCrsUsage({
			crs: 'EPSG:4326',
			purpose: 'survey',
			location: { prefecture: '東京都' },
		});
		expect(result.issues.some(i => i.code === 'NOT_OFFICIAL_SURVEY_CRS')).toBe(true);
	});
});
```

#### Pack 管理テスト

```typescript
describe('Pack Manager', () => {
	it('should register and retrieve JP pack', () => {
		const pack = getPackForCountry('JP');
		expect(pack).not.toBeNull();
		expect(pack?.metadata.countryCode).toBe('JP');
	});

	it('should find pack from LocationSpec with prefecture', () => {
		const pack = findPackForLocation({ prefecture: '東京都' });
		expect(pack?.metadata.countryCode).toBe('JP');
	});

	it('should find pack from centerPoint', () => {
		const pack = findPackForLocation({
			centerPoint: { lat: 35.68, lng: 139.69 }, // Tokyo
		});
		expect(pack?.metadata.countryCode).toBe('JP');
	});
});
```

#### Pack 管理エッジケース

```typescript
describe('Pack Manager Edge Cases', () => {
	it('should handle unknown pack code gracefully', async () => {
		// EPSG_PACKS="jp,unknown" の場合に JP だけロードされる
		process.env.EPSG_PACKS = 'jp,unknown';
		await loadPacksFromEnv();
		expect(getRegisteredPacks().length).toBe(1);
		expect(getRegisteredPacks()[0].countryCode).toBe('JP');
	});

	it('should work with no packs loaded', async () => {
		// EPSG_PACKS="" の場合に UTM フォールバックが動作する
		process.env.EPSG_PACKS = '';
		await loadPacksFromEnv();
		const result = await recommendCrs('distance_calculation', {
			centerPoint: { lat: 35.68, lng: 139.69 },
		});
		// Pack なしなので UTM フォールバック
		expect(result.primary.code).toBe('EPSG:32654'); // UTM 54N
	});

	it('should return null for location without matching pack', () => {
		// フランスの座標（FR Pack がない場合）
		const pack = findPackForLocation({
			centerPoint: { lat: 48.85, lng: 2.35 }, // Paris
		});
		expect(pack).toBeNull();
	});
});
```

#### list_crs_by_region Pack 対応テスト

```typescript
describe('list_crs_by_region with Pack support', () => {
	it('should return Japan CRS with region: "Japan" (backward compat)', async () => {
		const result = await listCrsByRegion({ region: 'Japan' });
		expect(result.region).toBe('Japan');
		expect(result.crsList.some(c => c.code === 'EPSG:6668')).toBe(true); // JGD2011
	});

	it('should return Japan CRS with region: "JP"', async () => {
		const result = await listCrsByRegion({ region: 'JP' });
		expect(result.region).toBe('JP');
		expect(result.crsList.some(c => c.code === 'EPSG:6668')).toBe(true); // JGD2011
	});

	it('should return Global CRS with region: "Global"', async () => {
		const result = await listCrsByRegion({ region: 'Global' });
		expect(result.region).toBe('Global');
		expect(result.crsList.some(c => c.code === 'EPSG:4326')).toBe(true); // WGS84
	});

	it('should include recommendedFor from Pack', async () => {
		const result = await listCrsByRegion({ region: 'JP' });
		expect(result.recommendedFor).toBeDefined();
		expect(result.recommendedFor.survey).toBeDefined();
	});

	it('should throw error for unknown region without Pack', async () => {
		await expect(listCrsByRegion({ region: 'XX' }))
			.rejects.toThrow(/Unknown region/);
	});
});
```

### 4.5 完了基準

- [ ] 既存テスト全てパス（リグレッションゼロ）
- [ ] 新規テスト約70件追加・パス（list_crs_by_region テスト含む）
- [ ] Pack経由の推奨が既存と同等の結果を返す
- [ ] `list_crs_by_region` が `"JP"`, `"Japan"`, `"Global"` で正常動作

## 5. Phase 5-3: SQLite統合

### 5.1 目標

EPSGレジストリDBを任意で利用可能にし、Packがない国のCRS基本情報を検索可能にする。

### 5.2 技術選定

#### better-sqlite3 vs sql.js の比較

| 観点 | better-sqlite3 | sql.js |
|------|---------------|--------|
| パフォーマンス | ◎ 高速（ネイティブ） | △ 遅い（WASM） |
| インストール | △ C++コンパイル必要 | ◎ Pure JS、コンパイル不要 |
| CI/Docker互換性 | △ ビルド環境必要 | ◎ どこでも動作 |
| ファイルサイズ | ◯ 小 | △ WASMバンドル込みで大 |
| 読み取り専用用途 | ◎ 最適 | ◯ 十分 |

**推奨**: `sql.js` を採用する。

**理由**:
- EPSG DB は読み取り専用のため、better-sqlite3 の速度優位は小さい
- ネイティブコンパイル不要のため、CI/Docker 環境での問題を回避
- `optionalDependencies` として追加しても、ネイティブビルド失敗のケースが多い
- ユーザーの環境に依存しない安定動作を優先

### 5.3 タスクリスト

#### Step 1: sql.js 導入

- [ ] `sql.js` を `optionalDependencies` に追加
- [ ] 動的 import のエラーハンドリングパターン設計
- [ ] WASM ファイルパス解決の実装

**WASM ファイルパス解決の注意点**:

sql.js は `sql-wasm.wasm` ファイルを必要とする。Node.js 環境では通常 `node_modules/sql.js/dist/` から自動的に解決されるが、**npx 経由で実行される MCP サーバー**では以下の問題が発生する可能性がある：

1. **npx のキャッシュパス**: npx は一時ディレクトリにパッケージを展開するため、WASM ファイルの相対パスが期待通りに解決されない
2. **bundler との相互作用**: esbuild 等でバンドルする場合、WASM ファイルがバンドルに含まれない

**対策**:
- `initSqlJs()` に `locateFile` オプションを明示的に指定する
- パッケージ配布時に WASM ファイルを `dist/` に同梱し、`import.meta.url` ベースでパスを解決する

```typescript
// 動的 import のフォールバックパターン（WASM パス解決対応）
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

let SQL: SqlJsStatic | null = null;

export async function initSqliteDb(dbPath: string): Promise<boolean> {
  try {
    const initSqlJs = (await import('sql.js')).default;

    // WASM ファイルのパス解決（npx 対応）
    // 方法1: node_modules から解決を試行
    // 方法2: パッケージ同梱の dist/sql-wasm.wasm を使用
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const wasmPath = join(__dirname, 'sql-wasm.wasm');

    SQL = await initSqlJs({
      locateFile: (file: string) => {
        // 同梱 WASM があればそちらを優先
        if (existsSync(wasmPath)) {
          return wasmPath;
        }
        // なければデフォルト動作（node_modules から解決）
        return file;
      },
    });

    const buffer = await fs.readFile(dbPath);
    db = new SQL.Database(buffer);
    info(`EPSG SQLite DB loaded: ${dbPath}`);
    return true;
  } catch (err) {
    // sql.js 未インストール or DB読み込み失敗
    debug(`SQLite DB not available: ${err}`);
    return false;
  }
}
```

**ビルドスクリプトへの追加**:
- [ ] `package.json` の `build` スクリプトで WASM ファイルを `dist/` にコピー
  ```json
  "build": "... && shx cp node_modules/sql.js/dist/sql-wasm.wasm dist/"
  ```

#### Step 2: SQLiteローダー実装

- [ ] `src/data/sqlite-loader.ts` 作成
  - `initSqliteDb()` - DB初期化
  - `isSqliteAvailable()` - 利用可能判定
  - `findCrsBySqlite()` - EPSGコードでCRS検索
  - `searchCrsBySqlite()` - キーワード検索
  - `mapRowToCrsDetail()` - DB行→CrsDetail変換

#### Step 3: サービス統合

- [ ] `src/index.ts` で `EPSG_DB_PATH` 環境変数チェック
- [ ] `search-service.ts` に SQLite フォールバック検索追加
- [ ] `data/loader.ts` の `findCrsById()` に SQLite フォールバック追加

#### Step 4: ユーティリティ・ドキュメント

- [ ] `scripts/download-epsg-db.ts` 作成（DB取得スクリプト）
- [ ] `package.json` に `"epsg:download-db"` スクリプト追加
- [ ] README に SQLite 設定手順記載
- [ ] EPSG DB のライセンス確認（IOGP利用規約）

### 5.4 完了基準

- [ ] sql.js 未インストール時もサーバー正常動作
- [ ] SQLite設定時に全EPSGコード検索可能
- [ ] 新規テスト約20件追加・パス
  - SQLiteあり/なし両方のケース
  - DB読み込み失敗時のグレースフル処理

## 6. Phase 5-4: 米国パック実装

### 6.1 目標

JP Pack以外の初のパック実装により、CountryPackアーキテクチャの妥当性を検証する。

### 6.2 ファイル構成

```
src/packs/us/
├── index.ts                  # US Pack エントリポイント
├── crs-data.json             # NAD83系、State Plane主要ゾーン
├── zone-mapping.json         # 州 → SPCS ゾーンマッピング
├── recommendations.json      # 米国向け推奨ルール
├── validation-rules.ts       # 米国向け検証ルール
├── transformations.json      # NAD27→NAD83、NAD83→NAD83(2011)
├── best-practices.json       # 米国向けベストプラクティス
└── troubleshooting.json      # 米国向けトラブルシュート
```

### 6.3 収録CRS（初期）

| EPSG | 名称                         | 用途                   |
| ---- | ---------------------------- | ---------------------- |
| 4269 | NAD83                        | 地理座標系（北米基準） |
| 6318 | NAD83(2011)                  | 最新測地系             |
| 2229 | NAD83 / California zone 5    | SPCS例                 |
| 2263 | NAD83 / New York Long Island | SPCS例                 |
| 6350 | NAD83(2011) / Conus Albers   | 全米等積               |

### 6.4 タスクリスト

- [ ] `src/packs/us/` ディレクトリ作成
- [ ] `crs-data.json` 作成（主要CRS）
- [ ] `zone-mapping.json` 作成（全50州 + DC）
- [ ] `recommendations.json` 作成
- [ ] `validation-rules.ts` 作成
- [ ] `transformations.json` 作成（NAD27→NAD83知識）
- [ ] `best-practices.json` 作成
- [ ] `troubleshooting.json` 作成
- [ ] `index.ts`（`createUsPack()`）実装

### 6.5 検証ポイント

1. CountryPack インターフェースが十分に汎用的か
2. JP Pack と US Pack の共存時に干渉がないか
3. UTM フォールバックとの優先順位が正しいか
4. Pack 追加時のパフォーマンスへの影響

### 6.6 完了基準

- [ ] 新規テスト約50件追加・パス
- [ ] JP/US 両パック有効時の動作検証
- [ ] インターフェース改善点のフィードバック

## 7. Phase 5-5: 追加パック・ドキュメント整備

### 7.1 目標

UK Pack実装とドキュメント整備により、v1.0.0リリースを完了する。

### 7.2 タスクリスト

#### UK Pack

- [ ] `src/packs/uk/` 作成
- [ ] OSGB36/BNG、ETRS89 データ
- [ ] OSGB36→ETRS89 変換知識

#### ドキュメント

- [ ] `docs/creating-country-packs.md` 作成（パック作成ガイド）
- [ ] `README.md` 更新（マルチ地域対応の記載）
- [ ] `README.ja.md` 更新
- [ ] `CLAUDE.md` 更新（新ファイル構成反映）
- [ ] `CHANGELOG.md` 更新

### 7.3 完了基準

- [ ] 新規テスト約30件追加・パス
- [ ] 全テスト約580件パス
- [ ] ドキュメント完備

## 8. テスト計画

### 8.1 テスト数推移

| フェーズ       | 新規テスト | 累計 | 備考                          |
| -------------- | ---------- | ---- | ----------------------------- |
| 現状（v0.4.0） | -          | 379  |                               |
| Phase 5-1      | ~40        | ~419 |                               |
| Phase 5-2      | ~70        | ~489 | list_crs_by_region テスト含む |
| Phase 5-3      | ~20        | ~509 |                               |
| Phase 5-4      | ~50        | ~559 |                               |
| Phase 5-5      | ~30        | ~589 |                               |

### 8.2 リグレッション防止

各フェーズで必須:

```bash
# 全テスト実行
npm test

# ビルド確認
npm run build
```

**Phase 5-2 完了時の最重要検証**: 既存379件のテストが全てパスすること。

## 9. 環境変数設計

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
				"EPSG_DB_PATH": "/path/to/epsg-registry.sqlite",
			},
		},
	},
}
```

`EPSG_PACKS` 未指定時は `"jp"` がデフォルト（後方互換性維持）。

## 10. 後方互換性

### API互換性

| パラメータ                  | v0.4.0 | v1.0.0                        | 互換性   |
| --------------------------- | ------ | ----------------------------- | -------- |
| `country: "Japan"`          | ✅     | ✅（内部で"JP"に変換）        | 完全互換 |
| `country: "Global"`         | ✅     | ✅（内部で"GLOBAL"に変換）    | 完全互換 |
| `prefecture: "東京都"`      | ✅     | ✅（内部でsubdivisionに変換） | 完全互換 |
| `country: "JP"`             | ❌     | ✅                            | 新機能   |
| `subdivision: "California"` | ❌     | ✅                            | 新機能   |

### 設定互換性

既存の設定はそのまま動作:

```jsonc
// 変更不要
{
	"mcpServers": {
		"epsg": {
			"command": "npx",
			"args": ["@shuji-bonji/epsg-mcp"],
		},
	},
}
```

## 11. ロードマップ

```
v0.4.0 (現在)
  └── Phase 1-4 完了: 9ツール、379テスト、国際化対応済み

v0.5.0 - Phase 5-1: 基盤整備
  ├── UTMゾーン自動計算（Layer 2）
  ├── LocationSpec正規化 + 後方互換
  └── global-crs.json英語化

v0.6.0 - Phase 5-2: Pack基盤
  ├── CountryPackインターフェース
  ├── パック管理システム
  ├── JP Pack切り出し
  └── 既存サービスのPack対応

v0.7.0 - Phase 5-3: SQLite統合
  ├── SQLiteローダー（オプショナル）
  └── フォールバック検索

v0.8.0 - Phase 5-4: US Pack
  ├── 米国パック実装（構造検証）
  └── CountryPack IFの改善

v1.0.0 - Phase 5-5: 正式リリース
  ├── UK Pack
  ├── パック作成ガイド
  └── ドキュメント整備
```

## 12. リスクと対策

| リスク                               | 影響度 | 対策                                       |
| ------------------------------------ | ------ | ------------------------------------------ |
| JP Pack切り出し時のリグレッション    | 高     | 既存379テストをセーフティネットとして活用  |
| CountryPackインターフェースが不十分  | 中     | US Pack実装で検証し、必要に応じて改善      |
| SQLite依存によるパッケージサイズ増加 | 低     | `optionalDependencies`として追加           |
| 各国CRSデータの正確性                | 中     | 初期リリースは主要CRSのみに限定            |
| パフォーマンス劣化                   | 低     | Pack CRSはプリロード、既存ベンチマーク維持 |
