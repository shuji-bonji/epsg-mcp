# EPSG MCP

座標参照系（CRS）に関する知識提供MCPサーバー。

## ドキュメント

実装にあたって以下のドキュメントを参照すること：

- [docs/EPSG-MCP-Design-Specification.md](docs/EPSG-MCP-Design-Specification.md) - 機能設計書（ツール定義、データ構造）
- [docs/implementation-plan.md](docs/implementation-plan.md) - Phase 1 実装計画書
- [docs/phase2-implementation-plan.md](docs/phase2-implementation-plan.md) - Phase 2 実装計画書

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
├── index.ts                # MCPサーバーエントリポイント
├── types/                  # 型定義（ValidationIssueCode等）
├── schemas/                # Zodスキーマ
├── errors/                 # エラーハンドリング
├── utils/
│   ├── logger.ts           # ロガー
│   └── validation.ts       # CRS検証ユーティリティ（Phase 2）
├── data/
│   ├── loader.ts           # データローダー
│   └── static/
│       ├── japan-crs.json       # 日本CRSデータ
│       ├── global-crs.json      # グローバルCRSデータ
│       └── recommendations.json # 推奨ルール・検証ルール
├── services/
│   ├── search-service.ts        # 検索サービス
│   └── recommendation-service.ts # 推奨サービス（Phase 2）
└── tools/
    ├── definitions.ts      # ツール定義
    └── handlers.ts         # ツールハンドラー
```

## 実装状況

### Phase 1（完了）
- `search_crs` - CRS検索
- `get_crs_detail` - CRS詳細取得
- `list_crs_by_region` - 地域別CRS一覧

### Phase 2（完了）
- `recommend_crs` - 用途・場所に応じた最適CRS推奨
  - 8つの用途（web_mapping, distance_calculation, area_calculation, survey, navigation, data_exchange, data_storage, visualization）
  - 北海道・沖縄の複数系対応（市区町村・振興局ベース）
  - 警告付き推奨
- `validate_crs_usage` - CRS選択の妥当性検証
  - 18種類のValidationIssueCode
  - スコア計算（0-100）
  - 代替案提案

### Phase 3（計画中）
- `suggest_transformation` - 変換経路提案
- `compare_crs` - CRS比較

## データソース

Phase 1ではローカルJSONデータを使用（外部API依存なし）。
将来的にMapTiler Coordinates APIとのハイブリッド構成を検討。
