# EPSG MCP

座標参照系（CRS）に関する知識提供MCPサーバー。

## ドキュメント

実装にあたって以下のドキュメントを参照すること：

- [EXAMPLES.md](EXAMPLES.md) - 使用例（英語）
- [EXAMPLES.ja.md](EXAMPLES.ja.md) - 使用例（日本語）
- [docs/EPSG-MCP-Design-Specification.md](docs/EPSG-MCP-Design-Specification.md) - 機能設計書（ツール定義、データ構造）
- [docs/implementation-plan.md](docs/implementation-plan.md) - Phase 1 実装計画書
- [docs/phase2-implementation-plan.md](docs/phase2-implementation-plan.md) - Phase 2 実装計画書
- [docs/phase3-implementation-plan.md](docs/phase3-implementation-plan.md) - Phase 3 実装計画書
- [docs/phase4-implementation-plan.md](docs/phase4-implementation-plan.md) - Phase 4 実装計画書
- [docs/phase5-implementation-plan.md](docs/phase5-implementation-plan.md) - Phase 5 実装計画書（国際化・多地域対応）
- [docs/internationalization-design.md](docs/internationalization-design.md) - 国際化設計書
- [docs/creating-country-packs.md](docs/creating-country-packs.md) - Country Pack作成ガイド

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
├── constants/
│   ├── index.ts            # 定数エクスポート
│   └── messages.ts         # メッセージ定数（i18n対応）
├── utils/
│   ├── logger.ts           # ロガー
│   ├── validation.ts       # CRS検証ユーティリティ（Phase 2）
│   ├── location-normalizer.ts # 位置情報正規化
│   └── utm.ts              # UTMゾーン計算
├── data/
│   ├── loader.ts           # データローダー（EPSG_LANG対応）
│   ├── sqlite-loader.ts    # SQLiteローダー（オプショナル）
│   └── static/
│       ├── japan-crs.json       # 日本CRSデータ
│       ├── global-crs.json      # グローバルCRSデータ
│       ├── recommendations.json # 推奨ルール（日本語）
│       ├── transformations.json # 変換経路データ
│       ├── comparisons.json     # CRS比較データ
│       ├── best-practices.json  # ベストプラクティス（日本語）
│       ├── troubleshooting.json # トラブルシューティング（日本語）
│       └── en/                  # 英語ローカライズファイル
│           ├── recommendations.json
│           ├── best-practices.json
│           └── troubleshooting.json
├── services/
│   ├── search-service.ts        # 検索サービス
│   ├── recommendation-service.ts # 推奨サービス（Phase 2）
│   ├── transformation-service.ts    # 変換経路サービス（Phase 3）
│   ├── comparison-service.ts        # CRS比較サービス（Phase 3）
│   ├── best-practices-service.ts    # ベストプラクティスサービス（Phase 4）
│   ├── troubleshooting-service.ts   # トラブルシューティングサービス（Phase 4）
│   └── utm-service.ts               # UTMフォールバックサービス（Phase 5）
├── packs/                       # Country Packs（Phase 5）
│   ├── pack-manager.ts          # パック管理システム
│   ├── jp/                      # Japan Pack
│   │   ├── index.ts
│   │   └── constants.ts
│   ├── us/                      # US Pack
│   │   ├── index.ts
│   │   ├── constants.ts
│   │   ├── crs-data.json
│   │   ├── recommendations.json
│   │   ├── transformations.json
│   │   ├── best-practices.json
│   │   └── troubleshooting.json
│   └── uk/                      # UK Pack
│       ├── index.ts
│       ├── constants.ts
│       ├── crs-data.json
│       ├── recommendations.json
│       ├── transformations.json
│       ├── best-practices.json
│       └── troubleshooting.json
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

### Phase 3（完了）
- `suggest_transformation` - 変換経路提案
  - BFSグラフ探索（最大4ステップ）
  - 逆方向変換サポート（reversible: true）
  - 非推奨CRS警告・広域データ警告
  - 精度累積計算
- `compare_crs` - CRS比較
  - 7つの比較観点（datum, projection, area_of_use, accuracy, distortion, compatibility, use_cases）
  - 用途別スコアリング比較
  - サマリー・推奨生成

### Phase 4（完了）
- `get_best_practices` - ベストプラクティス提供
  - 10トピック対応（japan_survey, web_mapping, data_exchange, coordinate_storage, mobile_gps, cross_border, historical_data, gis_integration, precision_requirements, projection_selection）
  - 推奨プラクティス（must/should/may優先度）
  - よくある間違いと解決策
  - 参考資料（official/article/tool）
- `troubleshoot` - トラブルシューティング
  - 6症状カテゴリ（coordinate_shift_large/medium/small, area_distance_error, display_blank, transformation_error）
  - キーワードマッチング（長いキーワード優先）
  - コンテキストベース可能性調整
  - 診断信頼度算出（high/medium/low）

### Phase 5（完了）
- 国際化・多地域対応
  - CountryPackアーキテクチャ（プラグイン形式の地域データ）
  - UTMフォールバック（座標からUTMゾーン自動判定）
  - 3層フォールバックモデル（CountryPack → UTM → Global）
  - SQLite対応（大規模データの効率的管理、オプショナル依存）
  - Japan Pack（JGD2011、平面直角座標系19系）
  - US Pack（NAD83、State Plane Coordinate System）
  - UK Pack（OSGB36、British National Grid、ETRS89）
  - 環境変数 `EPSG_PACKS` によるパック有効化制御
  - 環境変数 `EPSG_LANG` による言語切り替え（デフォルト: en）
  - メッセージ定数の集中管理（`src/constants/messages.ts`）

## 環境変数

| 変数名 | 説明 | デフォルト |
|--------|------|----------|
| `EPSG_PACKS` | 有効化するCountry Pack（カンマ区切り） | `jp` |
| `EPSG_LANG` | 出力言語（`en` または `ja`） | `en` |
| `EPSG_DB_PATH` | SQLiteデータベースパス（オプショナル） | なし |

## データソース

Phase 1ではローカルJSONデータを使用（外部API依存なし）。
将来的にMapTiler Coordinates APIとのハイブリッド構成を検討。
