# EPSG MCP

座標参照系（CRS）に関する知識提供MCPサーバー。

## ドキュメント

実装にあたって以下のドキュメントを参照すること：

- [docs/EPSG-MCP-Design-Specification.md](docs/EPSG-MCP-Design-Specification.md) - 機能設計書（ツール定義、データ構造）
- [docs/implementation-plan.md](docs/implementation-plan.md) - 実装計画書（タスク一覧、ディレクトリ構造）

## 技術スタック

- TypeScript
- @modelcontextprotocol/sdk
- Zod（バリデーション）
- Vitest（テスト）

## コマンド

```bash
# ビルド
npm run build

# テスト
npm test

# 開発時テスト（watch mode）
npm run test:watch
```

## アーキテクチャ

```
src/
├── index.ts          # MCPサーバーエントリポイント
├── types/            # 型定義
├── schemas/          # Zodスキーマ
├── errors/           # エラーハンドリング
├── utils/            # ユーティリティ
├── data/
│   ├── loader.ts     # データローダー
│   └── static/       # 静的CRSデータ（JSON）
├── services/         # ビジネスロジック
└── tools/            # MCPツール定義・ハンドラー
```

## Phase 1 ツール

- `search_crs` - CRS検索
- `get_crs_detail` - CRS詳細取得
- `list_crs_by_region` - 地域別CRS一覧

## データソース

Phase 1ではローカルJSONデータを使用（外部API依存なし）。
将来的にMapTiler Coordinates APIとのハイブリッド構成を検討。
