# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-02-01

### Added

#### Tools
- `suggest_transformation` - CRS間の変換経路提案
  - BFSグラフ探索で最大4ステップの変換経路を探索
  - 逆方向変換サポート（reversible: true のエッジは双方向探索）
  - 直接経路（directPath）と間接経路（viaPaths）の両方を返却
  - 推奨経路（recommended）の自動選択
  - 精度累積計算（1-2m、数cm等の精度情報を伝播）
  - 複雑度判定（simple/moderate/complex）
  - 警告システム:
    - 非推奨CRS（Tokyo Datum, JGD2000）使用時の警告
    - 広域データ変換時の精度警告
    - 複雑な変換経路での累積誤差警告
- `compare_crs` - CRS比較
  - 7つの比較観点:
    - `datum`: 測地系比較（WGS84 vs JGD2011は実用上同一など）
    - `projection`: 投影法比較
    - `area_of_use`: 適用範囲比較
    - `accuracy`: 精度特性比較
    - `distortion`: 歪み特性比較
    - `compatibility`: GIS/Web/CAD/GPS互換性比較
    - `use_cases`: 用途適性スコアリング比較
  - サマリー・推奨生成
  - 変換に関する注記（transformationNote）

#### Data
- `transformations.json` - 変換経路データ
  - 12件の変換レコード
  - Tokyo→JGD2000、JGD2000→JGD2011、WGS84→JGD2011、WGS84→Web Mercator等
  - JGD2011→平面直角座標系（IX, XI, XII, XIII, XV, XVI系）
  - ハブCRS定義（EPSG:4326, EPSG:6668, EPSG:4612）
  - 非推奨変換情報（EPSG:4301, EPSG:4612）
- `comparisons.json` - CRS比較データ
  - 7つのCRSの特性データ（4326, 6668, 4612, 4301, 3857, 6677, 6679）
  - 歪み特性（distortion）: area, distance, shape, note
  - 互換性（compatibility）: gis, web, cad, gps
  - 用途スコア（useCasesScore）: 8種類の用途ごとのスコア
  - 比較テンプレート（comparisonTemplates）: 5パターン

### Technical Details
- 新規サービス: `transformation-service.ts`
  - `normalizeCrsCode()` - EPSGコード正規化
  - `isWideArea()` - 広域判定
  - `buildTransformationGraph()` - グラフ構築
  - `findPaths()` - BFS経路探索
  - `suggestTransformation()` - 変換提案
- 新規サービス: `comparison-service.ts`
  - `inferDatumName()` - データム名推論
  - `compareDatum()`, `compareProjection()`, `compareAreaOfUse()` 等7つの比較関数
  - `generateSummary()`, `generateRecommendation()`
  - `compareCrs()` - メインAPI
- テスト数: 261 → 306（+45テスト）

---

## [1.1.0] - 2026-02-01

### Added

#### Tools
- `recommend_crs` - 用途・場所に応じた最適CRS推奨
  - 8つの用途タイプ対応（web_mapping, distance_calculation, area_calculation, survey, navigation, data_exchange, data_storage, visualization）
  - 北海道の3系（XI, XII, XIII）対応（振興局・市区町村ベース）
  - 沖縄の3系（XV, XVI, XVII）対応（本島/先島/大東）
  - 広域計算時の警告・フォールバック提案
  - pros/cons付きの推奨結果
- `validate_crs_usage` - CRS使用の妥当性検証
  - 18種類のValidationIssueCode
  - severity（error/warning/info）による重大度分類
  - スコア計算（0-100）
  - 低スコア時の代替案自動提案

#### Validation Rules
- `DEPRECATED_CRS` - 非推奨CRS使用検出
- `LEGACY_DATUM` - 旧測地系（Tokyo Datum）検出
- `AREA_MISMATCH` - 適用範囲外使用検出
- `AREA_DISTORTION` - Web Mercator面積歪み警告
- `DISTANCE_DISTORTION` - Web Mercator距離歪み警告
- `ZONE_MISMATCH` - 平面直角座標系の系不一致警告
- `CROSS_ZONE_CALCULATION` - 複数系またぎ計算警告
- `GEOJSON_INCOMPATIBLE` - GeoJSON非互換警告
- `NOT_OFFICIAL_SURVEY_CRS` - 日本で非公式測量CRS警告
- その他9種類

#### Data
- `recommendations.json` 拡張
  - 各用途のpros/cons追加
  - `multiZonePrefectures` - 北海道・沖縄の振興局/市区町村→系マッピング
  - `validationRules` - 検証ルール設定・スコア重み

### Changed
- `LocationSpec` に `city` フィールド追加（複数系対応）
- `Requirements` に `distortionTolerance` フィールド追加

### Technical Details
- 新規サービス: `recommendation-service.ts`
- 新規ユーティリティ: `validation.ts`
- テスト数: 171 → 261（+90テスト）

---

## [1.0.0] - 2026-02-01

### Added

#### Tools
- `search_crs` - CRSをキーワードで検索
  - EPSGコード、名称、地域名、都道府県名での検索に対応
  - タイプ（geographic/projected）、地域（Japan/Global）でのフィルタリング
  - スコアリングベースの関連度順ソート
- `get_crs_detail` - EPSGコードでCRS詳細情報を取得
  - 測地系、投影法、適用範囲、精度特性などの詳細情報
  - 使用目的、関連CRS、備考の提供
- `list_crs_by_region` - 地域別CRS一覧と用途別推奨を取得
  - 日本/グローバルの切り替え
  - 非推奨CRSの表示/非表示オプション
  - 用途別（汎用、測量、Web地図）の推奨CRS提示

#### Data
- 日本CRSデータ (`japan-crs.json`)
  - JGD2011 (EPSG:6668) 地理座標系
  - 平面直角座標系 I〜XIX系 (EPSG:6669-6687)
  - JGD2000 (EPSG:4612) レガシーサポート
  - Tokyo Datum (EPSG:4301) レガシーサポート
  - 47都道府県の平面直角座標系マッピング
- グローバルCRSデータ (`global-crs.json`)
  - WGS 84 (EPSG:4326)
  - Web Mercator (EPSG:3857)
  - UTM zones 52N-54N (EPSG:32652-32654)
  - NAD83, ETRS89
- 用途別推奨ルール (`recommendations.json`)
  - Web地図表示、距離計算、面積計算、測量、ナビゲーション、データ保存、データ交換、可視化

#### Infrastructure
- TypeScript + ES Modules 構成
- @modelcontextprotocol/sdk によるMCPサーバー実装
- Zod によるスキーマバリデーション
- Vitest によるテスト（19テスト）
- ローカルJSONデータベース（外部API不要）

### Technical Details
- Node.js 18+ 対応
- stdio トランスポートによるMCP通信
- 起動時データプリロードによる高速レスポンス
- エラーハンドリング（ValidationError, NotFoundError, DataLoadError）

## [Unreleased]

---

## [1.3.0] - 2026-02-01

### Added

#### Tools
- `get_best_practices` - CRS利用のベストプラクティス提供
  - 10トピック対応:
    - `japan_survey`: 日本での測量
    - `web_mapping`: Web地図作成
    - `data_exchange`: データ交換
    - `coordinate_storage`: 座標の保存
    - `mobile_gps`: モバイルGPS
    - `cross_border`: 越境データ
    - `historical_data`: 歴史的データ
    - `gis_integration`: GIS統合
    - `precision_requirements`: 精度要件
    - `projection_selection`: 投影法選択
  - 各トピックに対し:
    - 推奨プラクティス（must/should/may優先度付き）
    - よくある間違いと解決策
    - 関連トピック
    - 参考資料（official/article/tool）
- `troubleshoot` - CRS関連問題のトラブルシューティング
  - 6つの症状カテゴリ:
    - `coordinate_shift_large`: 座標が数百m〜数kmずれる
    - `coordinate_shift_medium`: 座標が1〜数mずれる
    - `coordinate_shift_small`: 座標が数cm〜数十cmずれる
    - `area_distance_error`: 面積・距離計算エラー
    - `display_blank`: データが表示されない
    - `transformation_error`: 座標変換エラー
  - キーワードマッチング（長いキーワード優先）
  - コンテキストに基づく可能性調整:
    - sourceCrs/targetCrs: 変換元/先CRS
    - location: 対象地域
    - magnitude: ずれの大きさ
    - tool: 使用ツール
  - 診断信頼度（high/medium/low）算出
  - 関連ベストプラクティスへのリンク

#### Data
- `best-practices.json` - ベストプラクティスデータ
  - 10トピックの完全なベストプラクティス集
  - 各トピック: description, practices[], commonMistakes[], relatedTopics[], references[]
- `troubleshooting.json` - トラブルシューティングデータ
  - 6症状カテゴリの診断データ
  - キーワードマッピング（25キーワード）
  - 各症状: possibleCauses[], diagnosticSteps[], solutions[]

### Technical Details
- 新規サービス: `best-practices-service.ts`
  - `getBestPractices()` - トピック別ベストプラクティス取得
  - `listBestPracticeTopics()` - トピック一覧取得
- 新規サービス: `troubleshooting-service.ts`
  - `sortKeywordsByLength()` - キーワード長さ順ソート
  - `matchSymptom()` - 症状マッチング（スコアリング付き）
  - `adjustCauseLikelihood()` - コンテキストベース可能性調整
  - `sortCausesByLikelihood()` - 可能性順ソート
  - `getSolutionsForCauses()` - 原因に対する解決策取得
  - `calculateConfidence()` - 診断信頼度計算
  - `troubleshoot()` - メインAPI
  - `listSymptomCategories()` - 症状カテゴリ一覧
- 型ガード: `isBestPracticeTopic()` - `as const`パターン
- 入力バリデーション: symptom 2〜500文字
- テスト数: 306 → 379（+73テスト）
