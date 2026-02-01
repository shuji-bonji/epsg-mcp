# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

### Planned for Phase 2
- `recommend_crs` - 用途・位置に基づくCRS推奨
- `validate_crs_usage` - CRS使用の妥当性検証

### Planned for Phase 3
- `suggest_transformation` - 変換経路提案
- `compare_crs` - CRS比較

### Planned for Phase 4
- `get_best_practices` - ベストプラクティス提供
- `troubleshoot` - トラブルシューティング支援
