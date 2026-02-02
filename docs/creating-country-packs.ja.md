# Country Pack 作成ガイド

このガイドでは、EPSG MCP用の新しいCountry Packを作成する方法を説明します。

## 概要

Country Packは、国/地域固有のCRS知識を提供するモジュラーでプラグイン可能なコンポーネントです。各パックには以下が含まれます：

- CRS定義（地理座標系・投影座標系）
- ゾーンマッピング（地域からCRSへの対応）
- 推奨ルール（用途別CRS選択）
- 変換知識（測地系変換方法）
- ベストプラクティス（国固有のガイドライン）
- トラブルシューティングガイド（よくある問題と解決策）

## ディレクトリ構造

```
src/packs/{国コード}/
├── index.ts              # パックファクトリ関数
├── constants.ts          # 国固有の定数
├── crs-data.json         # CRS定義
├── recommendations.json  # 用途別推奨ルール
├── transformations.json  # 変換パス
├── best-practices.json   # ベストプラクティス
└── troubleshooting.json  # トラブルシューティング
```

## ステップ1: パックディレクトリ作成

```bash
mkdir -p src/packs/{国コード}
```

ISO 3166-1 alpha-2国コードを使用してください（例：`jp`, `us`, `uk`, `de`, `fr`）。

## ステップ2: 定数定義

`constants.ts`を作成し、国固有の定数を定義します：

```typescript
/**
 * {国名} Pack Constants
 */

// 地理的境界
export const {COUNTRY}_BOUNDS = {
  NORTH: 61.0,
  SOUTH: 49.9,
  EAST: 1.8,
  WEST: -8.7,
  // サブリージョンの境界（必要な場合）
  REGION_A: { NORTH: ..., SOUTH: ..., EAST: ..., WEST: ... },
} as const;

// 主要EPSGコード
export const {COUNTRY}_EPSG = {
  // 地理座標系
  PRIMARY_GEOGRAPHIC: 'EPSG:xxxx',
  INTERNATIONAL: 'EPSG:4326',

  // 投影座標系
  PRIMARY_PROJECTED: 'EPSG:yyyy',
} as const;

// 地域リスト
export const {COUNTRY}_REGIONS = [
  'Region A',
  'Region B',
  // ...
] as const;

// サブリージョンから親リージョンへのマッピング
export const {COUNTRY}_SUBREGIONS: Record<string, string> = {
  'City A': 'Region A',
  'City B': 'Region B',
};
```

## ステップ3: CRSデータ作成

`crs-data.json`を作成し、CRS定義を記述します：

```json
{
  "geographicCRS": {
    "EPSG:xxxx": {
      "code": "EPSG:xxxx",
      "name": "主要測地系名",
      "type": "geographic",
      "datum": "測地系名",
      "description": "CRSの説明",
      "areaOfUse": "適用範囲",
      "deprecated": false,
      "accuracy": "high"
    }
  },
  "projectedCRS": {
    "EPSG:yyyy": {
      "code": "EPSG:yyyy",
      "name": "投影座標系名",
      "type": "projected",
      "baseCRS": "EPSG:xxxx",
      "projection": "Transverse Mercator",
      "description": "説明",
      "areaOfUse": "適用範囲",
      "deprecated": false,
      "accuracy": "high"
    }
  },
  "zoneMapping": {
    "Region A": { "zone": "Zone A", "code": "EPSG:yyyy" },
    "Region B": { "zone": "Zone B", "code": "EPSG:zzzz" }
  }
}
```

## ステップ4: 推奨ルール作成

`recommendations.json`を作成します：

```json
{
  "rules": {
    "web_mapping": {
      "primary": "EPSG:3857",
      "alternatives": ["EPSG:4326"],
      "reasoning": "Web地図タイルの標準であるWeb Mercator",
      "pros": ["ブラウザ全般でサポート"],
      "cons": ["高緯度で面積・距離が歪む"]
    },
    "survey": {
      "primary": "EPSG:yyyy",
      "alternatives": [],
      "reasoning": "国の測量標準",
      "usesZoneMapping": true
    },
    "area_calculation": {
      "primary": "EPSG:yyyy",
      "alternatives": [],
      "reasoning": "面積歪みを最小化",
      "warnings": ["最高精度のためにローカルゾーンを使用"]
    },
    "distance_calculation": { ... },
    "navigation": { ... },
    "data_exchange": { ... },
    "data_storage": { ... },
    "visualization": { ... }
  },
  "multiZoneRegions": {
    "大きな地域": {
      "note": "この地域は複数のゾーンにまたがります",
      "subRegions": {
        "サブリージョンA": "EPSG:aaaa",
        "サブリージョンB": "EPSG:bbbb"
      },
      "cities": {
        "都市A": "EPSG:aaaa",
        "都市B": "EPSG:bbbb"
      },
      "default": "EPSG:aaaa"
    }
  }
}
```

## ステップ5: 変換知識作成

`transformations.json`を作成します：

```json
{
  "transformations": [
    {
      "from": "EPSG:xxxx",
      "to": "EPSG:4326",
      "method": "変換方法名",
      "accuracy": 0.1,
      "reversible": true,
      "notes": "追加情報"
    }
  ],
  "hubCrs": ["EPSG:xxxx", "EPSG:4326"],
  "deprecatedCrs": ["EPSG:old1", "EPSG:old2"]
}
```

## ステップ6: ベストプラクティス作成

`best-practices.json`を作成します：

```json
{
  "practices": [
    {
      "topic": "{country}_survey",
      "title": "{国名}での測量ベストプラクティス",
      "description": "測量作業のガイドライン",
      "recommendations": [
        { "priority": "must", "text": "常に国の測地系を使用" },
        { "priority": "should", "text": "変換方法を文書化" },
        { "priority": "may", "text": "ローカル要件を考慮" }
      ],
      "commonMistakes": [
        {
          "mistake": "よくあるエラーの説明",
          "problem": "問題が発生する理由",
          "solution": "解決方法"
        }
      ],
      "references": [
        {
          "type": "official",
          "title": "国の測量機関ガイド",
          "url": "https://...",
          "description": "公式ドキュメント"
        }
      ]
    }
  ]
}
```

## ステップ7: トラブルシューティング作成

`troubleshooting.json`を作成します：

```json
{
  "symptoms": [
    {
      "symptomId": "datum_shift_error",
      "description": "座標がXメートルずれる",
      "keywords": ["ずれる", "オフセット", "測地系", "メートル"],
      "causes": [
        {
          "likelihood": "high",
          "cause": "測地系の違いが考慮されていない",
          "description": "詳細な説明",
          "indicators": [
            "地域によってずれが変わる",
            "系統的なオフセット"
          ]
        }
      ],
      "solutions": [
        {
          "forCause": "測地系の違いが考慮されていない",
          "steps": [
            "各データセットの測地系を特定",
            "適切な変換を適用"
          ],
          "prevention": "常に測地系情報を文書化"
        }
      ]
    }
  ]
}
```

## ステップ8: パックファクトリ作成

`index.ts`を作成します：

```typescript
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  BoundingBox,
  CountryPack,
  LocationSpec,
  PackBestPractice,
  PackCrsDataSet,
  PackRecommendationRules,
  PackTransformationKnowledge,
  PackTroubleshootingGuide,
  PackValidationRule,
  ZoneMapping,
} from '../../types/index.js';
import { {COUNTRY}_BOUNDS, {COUNTRY}_EPSG, {COUNTRY}_REGIONS } from './constants.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// データキャッシュ
let crsDataCache: PackCrsDataSet | null = null;
// ... 他のキャッシュ

async function loadJsonData<T>(filename: string): Promise<T> {
  const filePath = join(__dirname, filename);
  const content = await readFile(filePath, 'utf-8');
  return JSON.parse(content) as T;
}

export function create{Country}Pack(): CountryPack {
  return {
    metadata: {
      countryCode: '{CC}',
      name: '{国名} CRS Knowledge Pack',
      version: '1.0.0',
      primaryDatum: '測地系名',
      description: '{国名}のCRS知識',
      language: 'en',
    },

    async getCrsData(): Promise<PackCrsDataSet> {
      // CRSデータをロードしてキャッシュ
    },

    async getZoneMapping(): Promise<ZoneMapping> {
      // ゾーンマッピングをロード
    },

    async getRecommendationRules(): Promise<PackRecommendationRules> {
      // 推奨ルールをロード
    },

    async getValidationRules(): Promise<PackValidationRule[]> {
      // 国固有の検証ルールを返す
      return [];
    },

    async getTransformationKnowledge(): Promise<PackTransformationKnowledge> {
      // 変換知識をロード
    },

    async getBestPractices(): Promise<PackBestPractice[]> {
      // ベストプラクティスをロード
    },

    async getTroubleshootingGuides(): Promise<PackTroubleshootingGuide[]> {
      // トラブルシューティングガイドをロード
    },

    async selectZoneForLocation(location: LocationSpec): Promise<string | null> {
      // 位置に基づいてゾーンを決定
    },

    isLocationInCountry(location: LocationSpec): boolean {
      // 位置が国の境界内かどうかを確認
    },

    getCountryBounds(): BoundingBox {
      return {
        north: {COUNTRY}_BOUNDS.NORTH,
        south: {COUNTRY}_BOUNDS.SOUTH,
        east: {COUNTRY}_BOUNDS.EAST,
        west: {COUNTRY}_BOUNDS.WEST,
      };
    },
  };
}

export function reset{Country}PackCache(): void {
  crsDataCache = null;
  // ... 他のキャッシュもリセット
}
```

## ステップ9: パックマネージャーに登録

`src/packs/pack-manager.ts`を編集します：

```typescript
async function importPack(code: string): Promise<CountryPack | null> {
  switch (code.toLowerCase()) {
    // ... 既存のケース
    case '{cc}': {
      const { create{Country}Pack } = await import('./{cc}/index.js');
      return create{Country}Pack();
    }
  }
}
```

## ステップ10: ビルドスクリプト更新

`package.json`を編集してJSONファイルをコピーします：

```json
{
  "scripts": {
    "build": "tsc && shx cp -r src/data/static build/data/ && shx cp src/packs/{cc}/*.json build/packs/{cc}/ && shx chmod 755 build/index.js"
  }
}
```

## ステップ11: テスト作成

`tests/packs/{cc}/index.test.ts`を作成します：

```typescript
import { beforeEach, describe, expect, it } from 'vitest';
import { create{Country}Pack, reset{Country}PackCache } from '../../../src/packs/{cc}/index.js';
import type { CountryPack, LocationSpec } from '../../../src/types/index.js';

describe('{国名} Pack', () => {
  let pack: CountryPack;

  beforeEach(() => {
    reset{Country}PackCache();
    pack = create{Country}Pack();
  });

  describe('metadata', () => {
    it('should have correct country code', () => {
      expect(pack.metadata.countryCode).toBe('{CC}');
    });
    // ... その他のテスト
  });

  // ... 全メソッドのテスト
});
```

## ステップ12: パック有効化

ユーザーは環境変数でパックを有効化できます：

```bash
# 単一パックを有効化
export EPSG_PACKS="{cc}"

# 複数パックを有効化
export EPSG_PACKS="jp,us,uk,{cc}"
```

## リファレンス実装

既存のパックを参考にしてください：

- **Japan (jp)**: 19系の平面直角座標系を持つ複雑なゾーンシステム
- **US (us)**: マルチゾーン州を含むState Plane Coordinate System
- **UK (uk)**: 北アイルランド対応（ITM）を含むBritish National Grid

## パック開発のベストプラクティス

1. **公式ソースを使用**: 国の測地機関のドキュメントを参照
2. **測地系を文書化**: 測地系のリアライゼーションとエポックを明確に指定
3. **エッジケースを処理**: 国境地域、海外領土を考慮
4. **徹底的にテスト**: 全地域とエッジケースのテストを含める
5. **データをキャッシュ**: パフォーマンスのために遅延ロードとキャッシュを使用
6. **JSONを検証**: コミット前にすべてのJSONファイルが有効であることを確認
