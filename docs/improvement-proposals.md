# EPSG MCP 改善提案書

このドキュメントでは、国際ユーザー対応の観点から発見された問題点と改善提案をまとめます。

## 目次

1. [国際化（i18n）の問題](#1-国際化i18nの問題)
2. [コード冗長性の問題](#2-コード冗長性の問題)
3. [設計・アーキテクチャの問題](#3-設計アーキテクチャの問題)
4. [改善ロードマップ](#4-改善ロードマップ)

---

## 1. 国際化（i18n）の問題

### 1.1 現状

| カテゴリ | ファイル | 問題 | 重要度 |
|---------|---------|------|--------|
| サービス | `comparison-service.ts` | 70+ 日本語文字列 | 高 |
| サービス | `recommendation-service.ts` | 20+ 日本語文字列 | 高 |
| サービス | `troubleshooting-service.ts` | 10+ 日本語文字列 | 中 |
| データ | `recommendations.json` | 100% 日本語 | 高 |
| データ | `best-practices.json` | 100% 日本語 | 高 |
| データ | `troubleshooting.json` | 100% 日本語 | 高 |
| データ | `japan-crs.json` | 日本語CRS名 | 低（仕様） |

### 1.2 問題の詳細

#### サービス層のハードコード例

```typescript
// comparison-service.ts:29-38
const PURPOSE_NAMES: Record<Purpose, string> = {
  web_mapping: 'Web地図',        // Japanese
  distance_calculation: '距離計算', // Japanese
  area_calculation: '面積計算',    // Japanese
  survey: '測量',                  // Japanese
  // ...
};

// comparison-service.ts:80-94
if (datum1 === datum2) {
  verdict = '同一の測地系を使用';  // Japanese
} else if (...) {
  verdict = '実用上同一（数cm以内の差）'; // Japanese
}

// recommendation-service.ts:284-286
warnings.push(
  `${normalized.prefecture}は複数の系にまたがります。...`  // Japanese
);
```

#### データファイルの問題

`recommendations.json`、`best-practices.json`、`troubleshooting.json` は100%日本語で記述されており、国際ユーザーは内容を理解できません。

### 1.3 改善案

#### Option A: 多言語データファイル（推奨）

```
src/data/static/
├── en/
│   ├── recommendations.json
│   ├── best-practices.json
│   └── troubleshooting.json
├── ja/
│   ├── recommendations.json
│   ├── best-practices.json
│   └── troubleshooting.json
└── loader.ts  # 言語に応じてロード
```

利点:
- 完全な多言語対応
- 翻訳の追加が容易
- 各言語で独立したコンテンツ管理

欠点:
- データ管理の複雑化
- 同期維持のコスト

#### Option B: i18nキーシステム

```typescript
// i18n/messages.ts
export const messages = {
  en: {
    'datum.same': 'Same datum used',
    'datum.practically_same': 'Practically identical (within a few cm)',
    'warning.multi_zone': '{prefecture} spans multiple zones...',
  },
  ja: {
    'datum.same': '同一の測地系を使用',
    'datum.practically_same': '実用上同一（数cm以内の差）',
    'warning.multi_zone': '{prefecture}は複数の系にまたがります...',
  },
};

// 使用例
const verdict = t('datum.same', locale);
```

利点:
- 集中管理
- 型安全なキー

欠点:
- 大規模なリファクタリング
- 動的コンテンツの扱いが複雑

#### Option C: 英語デフォルト + 日本語Country Pack（推奨）

```typescript
// 基本サービスは英語
const verdict = 'Same datum used';

// Country Packが追加コンテキストを提供
// jp/messages.json で日本語オーバーライド
```

利点:
- 既存アーキテクチャとの整合性
- 段階的移行が可能
- 国際ユーザーは即座に利用可能

---

## 2. コード冗長性の問題

### 2.1 ゾーン判定ロジックの重複

#### 現状

2箇所で同じロジックが実装されています:

1. `src/services/recommendation-service.ts:64-91`
   - `determineZoneFromCoordinate()`

2. `src/packs/jp/index.ts:95-130`
   - `determineZoneFromCoordinateInternal()`

#### 改善案

```typescript
// src/packs/jp/zone-utils.ts（新規）
export function determineZoneFromCoordinate(
  point: { lat: number; lng: number },
  prefecture?: string
): string {
  // 統一実装
}

// recommendation-service.ts
import { determineZoneFromCoordinate } from '../packs/jp/zone-utils.js';
```

### 2.2 境界定数の重複

#### 現状

```typescript
// src/constants/index.ts
export const JAPAN_BOUNDS = {
  OVERALL: { NORTH: 45.5, SOUTH: 24.0, EAST: 154.0, WEST: 122.0 },
  HOKKAIDO: { ... },
  // ...
};

// src/packs/jp/constants.ts
export const JP_BOUNDS = {
  NORTH: 45.5,
  SOUTH: 24.0,
  EAST: 154.0,
  WEST: 122.0,
};
```

#### 改善案

Country Pack（jp）の境界を正式なソースとし、グローバル定数は参照のみに:

```typescript
// src/packs/jp/constants.ts（正式ソース）
export const JP_BOUNDS = { ... };

// src/constants/index.ts
// JAPAN_BOUNDS は jp Pack から re-export するか、
// 段階的に jp Pack 直接参照に移行
```

### 2.3 位置バリデーションの分散

#### 現状

`isJapanLocation()` 相当のロジックが4箇所に存在:
- `recommendation-service.ts`
- `utils/validation.ts`
- `packs/jp/index.ts`
- `utils/location-normalizer.ts`

#### 改善案

```typescript
// src/utils/location-utils.ts（新規）
export function isLocationInCountry(
  location: LocationSpec,
  countryCode: string
): boolean {
  // 統一実装
  // Pack Manager経由でPack境界を取得
}
```

---

## 3. 設計・アーキテクチャの問題

### 3.1 型安全性

#### 問題

```typescript
// 危険なasアサーション
const prefConfig = recommendations.multiZonePrefectures[location.prefecture] as
  | MultiZonePrefecture
  | undefined;

// JSONからの型推論
const data = JSON.parse(content) as T;
```

#### 改善案

```typescript
// Zodスキーマによるランタイム検証
import { z } from 'zod';

const MultiZonePrefectureSchema = z.object({
  note: z.string(),
  subRegions: z.record(z.string()),
  cities: z.record(z.string()),
  default: z.string(),
});

// 安全な取得
function getMultiZonePrefecture(
  recommendations: Recommendations,
  prefecture: string
): MultiZonePrefecture | undefined {
  const raw = recommendations.multiZonePrefectures[prefecture];
  if (!raw) return undefined;
  const result = MultiZonePrefectureSchema.safeParse(raw);
  return result.success ? result.data : undefined;
}
```

### 3.2 キャッシュ管理

#### 問題

モジュールレベルのミュータブル状態:

```typescript
// 各ファイルで独立したキャッシュ
let crsDataCache: PackCrsDataSet | null = null;
let recommendationsCache: PackRecommendationRules | null = null;
```

#### 改善案

```typescript
// src/cache/cache-manager.ts（新規）
class CacheManager {
  private cache = new Map<string, { data: unknown; timestamp: number }>();
  private ttl: number;

  constructor(ttlMs: number = 0) { // 0 = no expiry
    this.ttl = ttlMs;
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (this.ttl > 0 && Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }
}

export const packCache = new CacheManager();
```

### 3.3 エラーハンドリング

#### 問題

不統一なパターン:
- 一部は例外をスロー
- 一部はnullを返す
- 一部はデフォルト値を返す

#### 改善案

Result型パターンの導入:

```typescript
// src/types/result.ts
type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

// 使用例
async function findCrsById(code: string): Promise<Result<CrsDetail, NotFoundError>> {
  const crs = await lookupCrs(code);
  if (!crs) {
    return { success: false, error: new NotFoundError(`CRS ${code} not found`) };
  }
  return { success: true, data: crs };
}
```

---

## 4. 改善ロードマップ

### Phase 6-1: 英語デフォルト化（高優先度）

**目標**: 国際ユーザーが基本機能を利用可能に

| タスク | 工数 | 影響 |
|-------|------|------|
| comparison-service.ts の英語化 | 2h | 中 |
| recommendation-service.ts の警告英語化 | 1h | 低 |
| recommendations.json 英語版作成 | 3h | 高 |
| best-practices.json 英語版作成 | 4h | 高 |
| troubleshooting.json 英語版作成 | 3h | 高 |

**実装方針**:
1. サービス層のハードコード文字列を英語に変更
2. データファイルは `src/data/static/en/` に英語版を作成
3. `EPSG_LANG` 環境変数でロード先を切り替え

### Phase 6-2: コード統合（中優先度）

**目標**: 保守性の向上

| タスク | 工数 | 影響 |
|-------|------|------|
| ゾーン判定ロジック統合 | 2h | 低 |
| 境界定数の正規化 | 1h | 低 |
| 位置バリデーション統合 | 2h | 低 |

### Phase 6-3: 型安全性強化（低優先度）

**目標**: バグの予防

| タスク | 工数 | 影響 |
|-------|------|------|
| Zodスキーマ追加 | 3h | 低 |
| キャッシュマネージャー導入 | 2h | 低 |
| Result型パターン導入 | 4h | 中 |

---

## 付録: 即座に実施可能な改善

### A. PURPOSE_NAMESの英語化

```typescript
// Before
const PURPOSE_NAMES: Record<Purpose, string> = {
  web_mapping: 'Web地図',
  distance_calculation: '距離計算',
  // ...
};

// After
const PURPOSE_NAMES: Record<Purpose, string> = {
  web_mapping: 'Web Mapping',
  distance_calculation: 'Distance Calculation',
  area_calculation: 'Area Calculation',
  survey: 'Survey',
  navigation: 'Navigation',
  data_exchange: 'Data Exchange',
  data_storage: 'Data Storage',
  visualization: 'Visualization',
};
```

### B. 比較結果の英語化

```typescript
// Before
verdict = '同一の測地系を使用';

// After
verdict = 'Same datum used';
```

### C. 警告メッセージの英語化

```typescript
// Before
warnings.push(`${normalized.prefecture}は複数の系にまたがります。...`);

// After
warnings.push(`${normalized.prefecture} spans multiple zones. Specify city or coordinates for more accurate recommendations.`);
```

---

## 結論

**即座に対応すべき**: Phase 6-1（英語デフォルト化）

現状では国際ユーザーが出力を理解できないため、MCPサーバーとしての有用性が大幅に制限されています。サービス層の文字列を英語化し、データファイルの英語版を提供することで、国際ユーザーへの対応が可能になります。

**次のステップ**:
1. comparison-service.ts の英語化（最優先）
2. recommendations.json の英語版作成
3. 環境変数による言語切り替え実装
