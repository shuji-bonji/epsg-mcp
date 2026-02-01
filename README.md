# EPSG MCP Server

[![npm version](https://img.shields.io/npm/v/@shuji-bonji/epsg-mcp.svg)](https://www.npmjs.com/package/@shuji-bonji/epsg-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![MCP](https://img.shields.io/badge/MCP-Compatible-blue.svg)](https://modelcontextprotocol.io/)
[![Built with Claude Code](https://img.shields.io/badge/Built%20with-Claude%20Code-blueviolet?logo=anthropic)](https://claude.ai/code)

座標参照系（CRS: Coordinate Reference System）に関する知識提供を行うMCPサーバーです。

日本のJGD2011測地系、平面直角座標系（I〜XIX系）、およびグローバルなWGS84、Web Mercatorなどの座標系情報を提供します。変換実行は [mcp-server-proj](https://github.com/mcp-server-proj) に委譲し、**知識提供・判断支援に特化**しています。

## Features

- **CRS検索**: EPSGコード、名称、地域名、都道府県名でCRSを検索
- **詳細情報取得**: 測地系、投影法、適用範囲、精度特性などの詳細情報
- **地域別一覧**: 日本/グローバルで利用可能なCRS一覧と用途別推奨
- **日本重視**: JGD2011、平面直角座標系I〜XIX系の完全サポート
- **オフライン動作**: ローカルデータベースで外部API不要

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

## Supported CRS

### Japan (JGD2011)

| EPSG | Name | Usage |
|------|------|-------|
| 6668 | JGD2011 | 地理座標系（基準） |
| 6669-6687 | 平面直角座標系 I-XIX | 測量・大縮尺地図 |
| 4612 | JGD2000 | レガシー（非推奨） |

### Global

| EPSG | Name | Usage |
|------|------|-------|
| 4326 | WGS 84 | GPS/GeoJSON標準 |
| 3857 | Web Mercator | Web地図表示 |
| 326xx | UTM zones | 距離・面積計算 |

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

- **Phase 1** (Current): search_crs, get_crs_detail, list_crs_by_region
- **Phase 2**: recommend_crs, validate_crs_usage
- **Phase 3**: suggest_transformation, compare_crs
- **Phase 4**: get_best_practices, troubleshoot

## Related Projects

- [mcp-server-proj](https://github.com/mcp-server-proj) - 座標変換実行用MCPサーバー
- [EPSG.io](https://epsg.io/) - EPSG座標系データベース

## License

MIT License - see [LICENSE](LICENSE) for details.
