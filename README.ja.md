# EPSG MCP Server

[![npm version](https://img.shields.io/npm/v/@shuji-bonji/epsg-mcp.svg)](https://www.npmjs.com/package/@shuji-bonji/epsg-mcp)
[![CI](https://github.com/shuji-bonji/epsg-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/shuji-bonji/epsg-mcp/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![MCP](https://img.shields.io/badge/MCP-Compatible-blue.svg)](https://modelcontextprotocol.io/)
[![Built with Claude Code](https://img.shields.io/badge/Built%20with-Claude%20Code-blueviolet?logo=anthropic)](https://claude.ai/code)

[English README](README.md)

座標参照系（CRS: Coordinate Reference System）に関する知識提供を行うMCPサーバーです。

日本のJGD2011測地系、平面直角座標系（I〜XIX系）、およびグローバルなWGS84、Web Mercatorなどの座標系情報を提供します。変換実行は [mcp-server-proj](https://github.com/mcp-server-proj) に委譲し、**知識提供・判断支援に特化**しています。

## Features

- **CRS検索**: EPSGコード、名称、地域名、都道府県名でCRSを検索
- **詳細情報取得**: 測地系、投影法、適用範囲、精度特性などの詳細情報
- **地域別一覧**: 日本/グローバルで利用可能なCRS一覧と用途別推奨
- **CRS推奨**: 用途・場所に応じた最適なCRSを推奨（北海道・沖縄の複数系対応）
- **使用検証**: CRS選択の妥当性を検証し、問題点と改善提案を提示
- **変換経路提案**: BFSグラフ探索で最適な変換経路を提案（逆変換対応）
- **CRS比較**: 7つの観点（測地系、投影法、精度、歪み、互換性など）でCRSを比較
- **ベストプラクティス**: 10トピックのCRS利用ガイダンス（測量、Web地図、データ交換等）
- **トラブルシューティング**: 症状からCRS問題を診断（座標ずれ、計算エラー等）
- **日本重視**: JGD2011、平面直角座標系I〜XIX系の完全サポート
- **オフライン動作**: ローカルデータベースで外部API不要
- **国際化対応**: ツール定義・パラメータ説明は英語化済み（AIエージェントが言語に依存せず利用可能）

## Installation

```bash
npm install @shuji-bonji/epsg-mcp
```

Or run directly:

```bash
npx @shuji-bonji/epsg-mcp
```

## Usage

### Claude Desktop

`claude_desktop_config.json` に追加:

```json
{
  "mcpServers": {
    "epsg": {
      "command": "npx",
      "args": ["@shuji-bonji/epsg-mcp"]
    }
  }
}
```

#### 追加のCountry Packを有効にする

デフォルトでは日本パックのみがロードされます。追加のパック（例: US）を有効にするには、`EPSG_PACKS` 環境変数を設定します:

```json
{
  "mcpServers": {
    "epsg": {
      "command": "npx",
      "args": ["@shuji-bonji/epsg-mcp"],
      "env": {
        "EPSG_PACKS": "jp,us"
      }
    }
  }
}
```

### MCP Inspector

```bash
npx @anthropic-ai/mcp-inspector npx @shuji-bonji/epsg-mcp
```

## Tools

### search_crs

CRSをキーワードで検索します。

```typescript
// 入力
{
  query: string;           // 検索キーワード（例: "JGD2011", "4326", "東京"）
  type?: "geographic" | "projected" | "compound" | "vertical" | "engineering";
  region?: "Japan" | "Global";
  limit?: number;          // デフォルト: 10
}

// 出力
{
  results: CrsInfo[];
  totalCount: number;
}
```

**使用例**:
- 「JGD2011に関連するCRSを検索」
- 「東京で使える投影座標系を探す」
- 「EPSGコード6677の情報」

### get_crs_detail

EPSGコードでCRSの詳細情報を取得します。

```typescript
// 入力
{
  code: string;  // "EPSG:6677" または "6677"
}

// 出力
{
  code: string;
  name: string;
  type: CrsType;
  datum?: DatumInfo;
  projection?: ProjectionInfo;
  areaOfUse: AreaOfUse;
  accuracy?: AccuracyInfo;
  remarks?: string;
  useCases?: string[];
  // ...
}
```

**使用例**:
- 「EPSG:6677の詳細を教えて」
- 「Web Mercator(3857)の特徴は？」

### list_crs_by_region

地域で利用可能なCRS一覧と推奨を取得します。

```typescript
// 入力
{
  region: "Japan" | "Global";
  type?: CrsType;
  includeDeprecated?: boolean;  // デフォルト: false
}

// 出力
{
  region: string;
  crsList: CrsInfo[];
  recommendedFor: {
    general: string;
    survey: string;
    webMapping: string;
  };
}
```

**使用例**:
- 「日本で使えるCRS一覧」
- 「グローバルな地理座標系は？」

### recommend_crs

用途と場所に応じた最適なCRSを推奨します。

```typescript
// 入力
{
  purpose: "web_mapping" | "distance_calculation" | "area_calculation" |
           "survey" | "navigation" | "data_exchange" | "data_storage" | "visualization";
  location: {
    country?: string;      // "Japan" | "Global"
    prefecture?: string;   // "東京都", "北海道" など
    city?: string;         // "札幌市", "那覇市" など（複数系対応）
    boundingBox?: BoundingBox;
    centerPoint?: { lat: number; lng: number };
  };
  requirements?: {
    accuracy?: "high" | "medium" | "low";
    distortionTolerance?: "minimal" | "moderate" | "flexible";
  };
}

// 出力
{
  primary: RecommendedCrs;    // 推奨CRS（score, pros, cons付き）
  alternatives: RecommendedCrs[];
  reasoning: string;
  warnings?: string[];        // 複数系またぐ地域での警告など
}
```

**使用例**:
- 「東京周辺で距離計算するのに最適なCRSは？」
- 「北海道札幌で測量するときのCRSは？」
- 「Webアプリで日本全国の地図を表示したい」

### validate_crs_usage

指定されたCRSが特定の用途・場所で適切かどうかを検証します。

```typescript
// 入力
{
  crs: string;               // "EPSG:3857" または "3857"
  purpose: Purpose;          // recommend_crsと同じ
  location: LocationSpec;    // recommend_crsと同じ
}

// 出力
{
  isValid: boolean;
  score: number;             // 適合度 0-100
  issues: ValidationIssue[]; // 問題点リスト
  suggestions: string[];     // 改善提案
  betterAlternatives?: RecommendedCrs[];  // スコア低い場合の代替案
}
```

**検出される問題例**:
- `DEPRECATED_CRS`: 非推奨CRSの使用
- `AREA_DISTORTION`: Web Mercatorでの面積計算
- `ZONE_MISMATCH`: 東京で系I（長崎用）を使用
- `GEOJSON_INCOMPATIBLE`: 投影座標系でGeoJSON出力

**使用例**:
- 「Web Mercatorを北海道の面積計算に使って大丈夫？」
- 「EPSG:4326で日本の測量データを保存しても問題ない？」

### suggest_transformation

2つのCRS間の最適な変換経路を提案します。

```typescript
// 入力
{
  sourceCrs: string;    // "EPSG:4301" または "4301"
  targetCrs: string;    // "EPSG:6668" または "6668"
  location?: {
    country?: string;
    prefecture?: string;
    boundingBox?: BoundingBox;
  };
}

// 出力
{
  directPath: TransformationPath | null;  // 直接変換経路
  viaPaths: TransformationPath[];         // 間接変換経路
  recommended: TransformationPath;        // 推奨経路
  warnings: string[];
}
```

**TransformationPath**:
- `steps`: 変換ステップの配列（from, to, method, accuracy, isReverse）
- `totalAccuracy`: 総合精度
- `complexity`: "simple" | "moderate" | "complex"

**特徴**:
- BFSグラフ探索で最大4ステップまでの経路を探索
- 逆方向変換（reversible: true）も自動的に考慮
- 非推奨CRS（Tokyo Datum, JGD2000）使用時に警告
- 広域データ変換時の精度警告

**使用例**:
- 「Tokyo DatumからJGD2011への変換方法は？」
- 「WGS84からWeb Mercatorへの変換経路を教えて」

### compare_crs

2つのCRSを様々な観点から比較します。

```typescript
// 入力
{
  crs1: string;  // "EPSG:4326" または "4326"
  crs2: string;  // "EPSG:6668" または "6668"
  aspects?: ComparisonAspect[];  // 比較観点を指定（省略時は全て）
}

// ComparisonAspect
"datum" | "projection" | "area_of_use" | "accuracy" | "distortion" | "compatibility" | "use_cases"

// 出力
{
  comparison: ComparisonResult[];  // 各観点の比較結果
  summary: string;                 // サマリー
  recommendation: string;          // 推奨
  transformationNote?: string;     // 変換に関する注記
}
```

**比較観点**:
- `datum`: 測地系の比較（WGS84 vs JGD2011は実用上同一など）
- `projection`: 投影法の比較
- `area_of_use`: 適用範囲の比較
- `accuracy`: 精度特性の比較
- `distortion`: 歪み特性の比較
- `compatibility`: GIS/Web/CAD/GPS互換性の比較
- `use_cases`: 用途適性の比較（スコアベース）

**使用例**:
- 「WGS84とJGD2011の違いは？」
- 「Web Mercatorと地理座標系の比較をして」
- 「JGD2000とJGD2011を測地系の観点で比較して」

### get_best_practices

CRS利用のベストプラクティスを取得します。

```typescript
// 入力
{
  topic: "japan_survey" | "web_mapping" | "data_exchange" | "coordinate_storage" |
         "mobile_gps" | "cross_border" | "historical_data" | "gis_integration" |
         "precision_requirements" | "projection_selection";
  context?: string;  // 追加コンテキスト（任意、最大500文字）
}

// 出力
{
  topic: string;
  description: string;
  practices: Practice[];       // 推奨プラクティス
  commonMistakes: Mistake[];   // よくある間違い
  relatedTopics: string[];     // 関連トピック
  references: Reference[];     // 参考資料
}
```

**Practice**:
- `title`: プラクティス名
- `description`: 説明
- `priority`: "must" | "should" | "may"
- `rationale`: 理由
- `example?`: 具体例

**使用例**:
- 「日本での測量のベストプラクティスは？」
- 「Web地図を作るときの座標系の選び方」
- 「GeoJSONでデータ交換するときの注意点」

### troubleshoot

CRS関連の問題をトラブルシューティングします。

```typescript
// 入力
{
  symptom: string;  // 症状（2〜500文字）
  context?: {
    sourceCrs?: string;   // 変換元CRS
    targetCrs?: string;   // 変換先CRS
    location?: string;    // 対象地域
    tool?: string;        // 使用ツール
    magnitude?: string;   // ずれの大きさ
  };
}

// 出力
{
  matchedSymptom: string;         // マッチした症状カテゴリ
  possibleCauses: Cause[];        // 可能性のある原因（likelihood付き）
  diagnosticSteps: DiagnosticStep[]; // 診断手順
  suggestedSolutions: Solution[]; // 解決策
  relatedBestPractices: string[]; // 関連ベストプラクティス
  confidence: "high" | "medium" | "low";  // 診断信頼度
}
```

**対応症状**:
- 座標が数百m〜数kmずれる（Tokyo Datum問題など）
- 座標が1〜数mずれる（変換精度限界など）
- 座標が数cm〜数十cmずれる（WGS84/JGD2011差など）
- 面積・距離計算がおかしい（Web Mercator歪みなど）
- データが表示されない（CRS不一致など）
- 座標変換でエラー（パラメータ未登録など）

**使用例**:
- 「座標が400mずれる」
- 「面積計算の結果がおかしい」
- 「古いデータと新しいデータが合わない」

## Supported CRS

### Japan (JGD2011)

| EPSG | Name | Usage |
|------|------|-------|
| 6668 | JGD2011 | 地理座標系（基準） |
| 6669-6687 | 平面直角座標系 I-XIX | 測量・大縮尺地図 |
| 4612 | JGD2000 | レガシー（非推奨） |

### United States (NAD83)

| EPSG | Name | Usage |
|------|------|-------|
| 4269 | NAD83 | 地理座標系（標準） |
| 6318 | NAD83(2011) | 最新リアライゼーション |
| 5070 | NAD83 / Conus Albers | 面積計算用 |
| 2229 | NAD83 / California zone 5 | State Plane例 |
| 2263 | NAD83 / New York Long Island | State Plane例 |

### Global

| EPSG | Name | Usage |
|------|------|-------|
| 4326 | WGS 84 | GPS/GeoJSON標準 |
| 3857 | Web Mercator | Web地図表示 |
| 326xx | UTM zones | 距離・面積計算 |

## 拡張CRSサポート（オプション）

デフォルトでは日本および主要なグローバルCRSのデータを提供します。完全なEPSGレジストリ（10,000以上のCRS）にアクセスするには、オプションでSQLiteサポートを有効にできます。

### セットアップ

1. **EPSGデータベースのダウンロード**

```bash
# 組み込みスクリプトを使用
npm run epsg:download-db

# カスタムパスを指定する場合
npx tsx scripts/download-epsg-db.ts ./path/to/epsg.db
```

2. **sql.js のインストール**（未インストールの場合）

```bash
npm install sql.js
```

3. **環境変数の設定**

`EPSG_DB_PATH` 環境変数を設定します:

```bash
export EPSG_DB_PATH="/path/to/epsg.db"
```

または Claude Desktop の `claude_desktop_config.json` で設定:

```json
{
  "mcpServers": {
    "epsg": {
      "command": "npx",
      "args": ["@shuji-bonji/epsg-mcp"],
      "env": {
        "EPSG_DB_PATH": "/path/to/epsg.db"
      }
    }
  }
}
```

### データソース

EPSGデータベースは [PROJ](https://proj.org/) が提供しており、[IOGP EPSG Geodetic Parameter Dataset](https://epsg.org/) を再配布しています。ライセンス情報については [EPSG利用規約](https://epsg.org/terms-of-use.html) を参照してください。

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Test
npm test

# Watch mode
npm run test:watch
```

## Documentation

- [設計書](docs/EPSG-MCP-Design-Specification.md) - 機能設計・ツール定義
- [実装計画](docs/implementation-plan.md) - 実装タスク・進捗

## Roadmap

- **Phase 1** ✅: search_crs, get_crs_detail, list_crs_by_region
- **Phase 2** ✅: recommend_crs, validate_crs_usage
- **Phase 3** ✅: suggest_transformation, compare_crs
- **Phase 4** ✅: get_best_practices, troubleshoot

## Related Projects

- [mcp-server-proj](https://github.com/mcp-server-proj) - 座標変換実行用MCPサーバー
- [EPSG.io](https://epsg.io/) - EPSG座標系データベース

## License

MIT License - see [LICENSE](LICENSE) for details.
