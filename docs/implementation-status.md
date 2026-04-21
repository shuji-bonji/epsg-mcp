# Implementation Status

Phase 1〜5 の実装状況まとめ。各 Phase の計画書は `phase{N}-implementation-plan.md` を、リリース履歴は [../CHANGELOG.md](../CHANGELOG.md) を参照。

## 全体サマリ

| Phase | 状態 | 主要ツール / 機能 |
|-------|------|-------------------|
| Phase 1 | ✅ 完了 | `search_crs`, `get_crs_detail`, `list_crs_by_region` |
| Phase 2 | ✅ 完了 | `recommend_crs`, `validate_crs_usage` |
| Phase 3 | ✅ 完了 | `suggest_transformation`, `compare_crs` |
| Phase 4 | ✅ 完了 | `get_best_practices`, `troubleshoot` |
| Phase 5 | ✅ 完了 | 国際化・多地域対応（Country Pack, UTMフォールバック, SQLite） |

## Phase 1（完了）

- `search_crs` — CRS検索
- `get_crs_detail` — CRS詳細取得
- `list_crs_by_region` — 地域別CRS一覧

## Phase 2（完了）

- `recommend_crs` — 用途・場所に応じた最適CRS推奨
    - 8つの用途（web_mapping, distance_calculation, area_calculation, survey, navigation, data_exchange, data_storage, visualization）
    - 北海道・沖縄の複数系対応（市区町村・振興局ベース）
    - 警告付き推奨
- `validate_crs_usage` — CRS選択の妥当性検証
    - 18種類のValidationIssueCode
    - スコア計算（0-100）
    - 代替案提案

## Phase 3（完了）

- `suggest_transformation` — 変換経路提案
    - BFSグラフ探索（最大4ステップ）
    - 逆方向変換サポート（`reversible: true`）
    - 非推奨CRS警告・広域データ警告
    - 精度累積計算
- `compare_crs` — CRS比較
    - 7つの比較観点（datum, projection, area_of_use, accuracy, distortion, compatibility, use_cases）
    - 用途別スコアリング比較
    - サマリー・推奨生成

## Phase 4（完了）

- `get_best_practices` — ベストプラクティス提供
    - 10トピック対応（japan_survey, web_mapping, data_exchange, coordinate_storage, mobile_gps, cross_border, historical_data, gis_integration, precision_requirements, projection_selection）
    - 推奨プラクティス（must / should / may 優先度）
    - よくある間違いと解決策
    - 参考資料（official / article / tool）
- `troubleshoot` — トラブルシューティング
    - 6症状カテゴリ（coordinate_shift_large / medium / small, area_distance_error, display_blank, transformation_error）
    - キーワードマッチング（長いキーワード優先）
    - コンテキストベース可能性調整
    - 診断信頼度算出（high / medium / low）

## Phase 5（完了）— 国際化・多地域対応

- Country Pack アーキテクチャ（プラグイン形式の地域データ）
- UTMフォールバック（座標からUTMゾーン自動判定）
- 3層フォールバックモデル（CountryPack → UTM → Global）
- SQLite対応（大規模データの効率的管理、オプショナル依存）
- Japan Pack（JGD2011、平面直角座標系19系）
- US Pack（NAD83、State Plane Coordinate System）
- UK Pack（OSGB36、British National Grid、ETRS89）
- 環境変数 `EPSG_PACKS` によるパック有効化制御
- 環境変数 `EPSG_LANG` による言語切り替え（デフォルト: `en`）
- メッセージ定数の集中管理（`src/constants/messages.ts`）
