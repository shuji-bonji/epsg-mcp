# EPSG MCP

座標参照系（CRS）に関する知識提供MCPサーバー。

## ドキュメント

実装にあたって以下のドキュメントを参照すること：

- [README.md](README.md) / [README.ja.md](README.ja.md) - インストール・使用方法
- [EXAMPLES.md](EXAMPLES.md) / [EXAMPLES.ja.md](EXAMPLES.ja.md) - 使用例
- [CHANGELOG.md](CHANGELOG.md) - リリース履歴
- [docs/project-architecture.md](docs/project-architecture.md) - ディレクトリ構成
- [docs/implementation-status.md](docs/implementation-status.md) - Phase 1〜5 の実装状況
- [docs/EPSG-MCP-Design-Specification.md](docs/EPSG-MCP-Design-Specification.md) - 機能設計書（ツール定義、データ構造）
- [docs/internationalization-design.md](docs/internationalization-design.md) - 国際化設計書
- [docs/creating-country-packs.md](docs/creating-country-packs.md) - Country Pack作成ガイド
- Phase 別実装計画: [phase1](docs/implementation-plan.md) / [phase2](docs/phase2-implementation-plan.md) / [phase3](docs/phase3-implementation-plan.md) / [phase4](docs/phase4-implementation-plan.md) / [phase5](docs/phase5-implementation-plan.md)

## 技術スタック

- TypeScript（ESM）
- @modelcontextprotocol/sdk
- Zod（バリデーション）
- Vitest（テスト）
- Biome（Lint / Format）

## コマンド

```bash
# ビルド
npm run build

# テスト
npm test

# 開発時テスト（watch mode）
npm run test:watch

# Lint / Format
npm run lint
npm run check
```

## 環境変数

| 変数名 | 説明 | デフォルト |
|--------|------|----------|
| `EPSG_PACKS` | 有効化するCountry Pack（カンマ区切り、例: `jp,us,uk`） | `jp` |
| `EPSG_LANG` | 出力言語（`en` または `ja`） | `en` |
| `EPSG_DB_PATH` | SQLiteデータベースパス（オプショナル） | なし |
