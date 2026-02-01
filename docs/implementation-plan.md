# EPSG MCP 実装計画書

## 概要

座標参照系（CRS）に関する知識提供MCPサーバー。変換実行は既存のmcp-server-projに委譲し、**知識提供・判断支援に特化**する。

## 重要な調査結果

### データソース戦略
- **epsg.io API**: 2025年2月以降、MapTiler Coordinates APIに移行必須（APIキー必要）
- **推奨アプローチ**: ローカルJSONデータをベースとし、将来的にAPIで補完するハイブリッド方式
- **Phase 1**: ローカルJSONのみで実装（外部依存なし、オフライン動作可能）

### MCP SDK パターン
- `server.setRequestHandler()` でツール一覧とツール実行を処理
- `StdioServerTransport` で標準入出力通信
- エラー時は `isError: true` を返却

---

## ディレクトリ構造

```
epsg-mcp/
├── src/
│   ├── index.ts                 # エントリポイント
│   ├── types/
│   │   └── index.ts             # 型定義
│   ├── schemas/
│   │   └── index.ts             # Zodスキーマ
│   ├── errors/
│   │   └── index.ts             # エラーハンドリング
│   ├── utils/
│   │   └── logger.ts            # ロガー
│   ├── data/
│   │   ├── loader.ts            # データローダー
│   │   └── static/
│   │       ├── japan-crs.json   # 日本固有CRSデータ
│   │       ├── global-crs.json  # グローバルCRSデータ
│   │       └── recommendations.json
│   ├── services/
│   │   └── search-service.ts    # 検索サービス
│   └── tools/
│       ├── definitions.ts       # ツール定義
│       └── handlers.ts          # ツールハンドラー
├── tests/
│   └── tools/
│       └── handlers.test.ts
├── docs/
│   ├── EPSG-MCP-Design-Specification.md  # 機能設計書
│   └── implementation-plan.md            # 本実装計画書
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

---

## Phase 1 実装タスク（基盤） ✅ 完了

### 1. プロジェクト設定
- [x] package.json更新（vitest追加、bin名修正）
- [x] vitest.config.ts作成

### 2. 型定義 (`src/types/index.ts`)
- [x] CrsType, BoundingBox, EllipsoidInfo, DatumInfo
- [x] CrsInfo, CrsDetail
- [x] SearchResult, ツール引数の型

### 3. Zodスキーマ (`src/schemas/index.ts`)
- [x] SearchCrsSchema
- [x] GetCrsDetailSchema
- [x] ListCrsByRegionSchema

### 4. エラーハンドリング (`src/errors/index.ts`)
- [x] ValidationError, NotFoundError
- [x] formatErrorResponse関数

### 5. ユーティリティ (`src/utils/logger.ts`)
- [x] info, error, PerformanceTimer

### 6. 静的データ作成
- [x] `src/data/static/japan-crs.json` - JGD2011, 平面直角座標系I-XIX
- [x] `src/data/static/global-crs.json` - WGS84, Web Mercator, UTM
- [x] `src/data/static/recommendations.json` - 用途別推奨ルール

### 7. データローダー (`src/data/loader.ts`)
- [x] loadJapanCrs, loadGlobalCrs, loadRecommendations
- [x] findCrsById（EPSGコードでO(1)検索）
- [x] getCrsByRegion
- [x] preloadAll, clearCache

### 8. 検索サービス (`src/services/search-service.ts`)
- [x] searchCrs（スコアリング付きキーワード検索）
- [x] getCrsDetail
- [x] listCrsByRegion

### 9. ツール定義 (`src/tools/definitions.ts`)
- [x] search_crs
- [x] get_crs_detail
- [x] list_crs_by_region

### 10. ツールハンドラー (`src/tools/handlers.ts`)
- [x] handleSearchCrs
- [x] handleGetCrsDetail
- [x] handleListCrsByRegion
- [x] toolHandlersマップ

### 11. エントリポイント (`src/index.ts`)
- [x] Server初期化
- [x] ListToolsRequestHandler
- [x] CallToolRequestHandler
- [x] preloadAll→server.connect

### 12. テスト (`tests/tools/handlers.test.ts`)
- [x] search_crsの各種パターン
- [x] get_crs_detailの正常系・異常系
- [x] list_crs_by_regionのフィルタ動作

**テスト結果**: 19テスト全て成功

---

## 日本固有CRSデータ（主要）

| EPSG | 名称 | 用途 |
|------|------|------|
| 6668 | JGD2011 | 地理座標系（基準） |
| 6669-6687 | 平面直角座標系 I-XIX | 測量・大縮尺地図 |
| 4612 | JGD2000 | レガシー（非推奨） |

### 平面直角座標系の主要な系

| EPSG | 系 | 対象地域 |
|------|-----|---------|
| 6669 | I | 長崎県、佐賀県 |
| 6670 | II | 福岡県、熊本県、大分県、宮崎県、鹿児島県 |
| 6671 | III | 山口県、島根県、広島県 |
| 6672 | IV | 香川県、愛媛県、徳島県、高知県 |
| 6673 | V | 兵庫県、鳥取県、岡山県 |
| 6674 | VI | 京都府、大阪府、福井県、滋賀県、三重県、奈良県、和歌山県 |
| 6675 | VII | 石川県、富山県、岐阜県、愛知県 |
| 6676 | VIII | 新潟県、長野県、山梨県、静岡県 |
| 6677 | IX | 東京都、神奈川県、千葉県、埼玉県、茨城県、栃木県、群馬県、福島県 |
| 6678 | X | 青森県、秋田県、山形県、岩手県、宮城県 |
| 6679 | XI | 小笠原諸島 |
| 6680 | XII | 北海道（西部） |
| 6681 | XIII | 北海道（中部） |
| 6682 | XIV | 東京都（南鳥島） |
| 6683 | XV | 沖縄県（本島周辺） |
| 6684 | XVI | 沖縄県（先島諸島） |
| 6685 | XVII | 沖縄県（大東諸島） |
| 6686 | XVIII | 東京都（沖ノ鳥島） |
| 6687 | XIX | 東京都（南鳥島） |

---

## 検証方法

### ビルド確認
```bash
npm run build
```

### テスト実行
```bash
npm test
```

### 手動テスト（MCP Inspector）
```bash
npx @anthropic-ai/mcp-inspector build/index.js
```

### Claude Desktopでの統合テスト
claude_desktop_config.jsonに追加:
```json
{
  "mcpServers": {
    "epsg": {
      "command": "node",
      "args": ["/path/to/epsg-mcp/build/index.js"]
    }
  }
}
```

テストシナリオ:
1. `search_crs` で "JGD2011" を検索 → 結果が返る
2. `get_crs_detail` で "EPSG:6677" を取得 → 詳細情報が返る
3. `list_crs_by_region` で "Japan" を指定 → CRS一覧と推奨が返る

---

## 将来のPhase（参考）

- **Phase 2**: recommend_crs, validate_crs_usage
- **Phase 3**: suggest_transformation, compare_crs
- **Phase 4**: get_best_practices, troubleshoot

---

## 主要ファイル

| ファイル | 役割 |
|----------|------|
| src/index.ts | MCPサーバーエントリポイント |
| src/data/loader.ts | データロード・キャッシュ |
| src/data/static/japan-crs.json | 日本CRSの知識ベース |
| src/services/search-service.ts | 検索ロジック |
| src/tools/handlers.ts | ツール実行ハンドラー |
