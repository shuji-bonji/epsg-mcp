現状のコードとデータを詳しく確認しました。問題点と改善方針を整理します。

## 現状の分析：なぜ「日本専用」になっているか

```mermaid
mindmap
  root((EPSG MCP の<br/>日本偏重))
    データ層
      japan-crs.json: 25+ CRS, 47都道府県マッピング
      global-crs.json: たった6 CRS
      UTM zones: 52N-54N のみ（日本周辺だけ）
      remarks が日本語
    APIデザイン
      region: "Japan" | "Global" の二択
      location.prefecture（日本固有概念）
      country も "Japan" | "Global" だけ
    推奨ロジック
      北海道3系・沖縄3系の詳細サポート
      他国の地域CRS推奨なし
    ベストプラクティス
      japan_survey トピックあり
      他国の測量トピックなし
    変換経路
      Tokyo Datum → JGD2011 が中心
      NAD27→NAD83, ED50→ETRS89 等なし
```

### 具体的な格差

| 側面           | 日本                                               | グローバル                            |
| -------------- | -------------------------------------------------- | ------------------------------------- |
| CRSデータ数    | 25+ (JGD2011, 平面直角I-XIX, JGD2000, Tokyo Datum) | 6 (WGS84, NAD83, ETRS89, 3857, UTM×3) |
| 地域マッピング | 47都道府県 → ゾーンの完全マッピング                | なし                                  |
| UTMゾーン      | 52N-54N（日本周辺のみ）                            | 全60ゾーン中たった3つ                 |
| 推奨ロジック   | 用途×地域×複数系の詳細推奨                         | WGS84かWeb Mercatorの2択程度          |
| データ言語     | `remarks`が日本語                                  | `remarks`が日本語（！）               |

## 改善ロードマップ

### Phase A: データの国際化（最優先・効果大）

```mermaid
flowchart TD
    A[Phase A: データ拡充] --> A1[global-crs.json の大幅拡充]
    A --> A2[remarks の英語化]
    A --> A3[国別CRSデータの追加]

    A1 --> A1a["UTM全60ゾーン（1N-60N, 1S-60S）"]
    A1 --> A1b["US State Plane Zones"]
    A1 --> A1c["UK OSGB36 / BNG"]
    A1 --> A1d["各国National Grid系"]

    A2 --> A2a["global-crs.json: 英語に変更"]
    A2 --> A2b["japan-crs.json: 日本語のまま維持"]

    A3 --> A3a["us-crs.json"]
    A3 --> A3b["europe-crs.json"]
    A3 --> A3c["australia-crs.json"]

    style A1 fill:#ff6b6b,color:#fff
    style A2 fill:#ff6b6b,color:#fff
```

**具体的な追加CRS候補:**

```
【北米】
- EPSG:2263  NAD83 / New York Long Island (State Plane)
- EPSG:2229  NAD83 / California zone 5
- EPSG:3857  (既存)
- EPSG:6350  NAD83(2011) / Conus Albers
- UTM 10N-19N (米国本土カバー)

【ヨーロッパ】
- EPSG:27700  OSGB 1936 / British National Grid
- EPSG:2154   RGF93 v1 / Lambert-93 (フランス)
- EPSG:25832  ETRS89 / UTM zone 32N (ドイツ中心)
- EPSG:3035   ETRS89-extended / LAEA Europe

【オセアニア】
- EPSG:28356  GDA94 / MGA zone 56 (シドニー)
- EPSG:2193   NZGD2000 / NZTM 2000

【アジア（日本以外）】
- EPSG:4490   CGCS2000 (中国)
- EPSG:5186   Korean 2000 / Unified CS
```

### Phase B: APIデザインの汎用化

現在の `"Japan" | "Global"` の二択モデルを拡張します。

```mermaid
flowchart LR
    subgraph 現状
        R1["region: 'Japan' | 'Global'"]
        L1["location.prefecture: '東京都'"]
        C1["country: 'Japan' | 'Global'"]
    end

    subgraph 改善後
        R2["region: 'Japan' | 'NorthAmerica' | 'Europe' | 'Oceania' | 'Asia' | 'Global'"]
        L2["location.state / province / prefecture"]
        C2["country: 'Japan' | 'US' | 'UK' | 'Germany' | 'France' | ..."]
    end

    R1 -->|拡張| R2
    L1 -->|汎用化| L2
    C1 -->|拡張| C2
```

**LocationSpec の改善案:**

```typescript
// 現状
interface LocationSpec {
	country?: 'Japan' | 'Global';
	prefecture?: string; // 日本固有
	city?: string;
	region?: string;
	boundingBox?: BoundingBox;
	centerPoint?: { lat: number; lng: number };
}

// 改善後
interface LocationSpec {
	country?: string; // ISO 3166-1 alpha-2 ("JP", "US", "GB", "DE", ...)
	subdivision?: string; // 都道府県/州/県/省の統一フィールド
	city?: string;
	region?: string; // 地方名 ("Kanto", "Northeast US", "Western Europe")
	boundingBox?: BoundingBox;
	centerPoint?: { lat: number; lng: number };

	// 後方互換
	/** @deprecated Use `subdivision` instead */
	prefecture?: string;
}
```

**重要: 後方互換性を維持しつつ拡張する**ことがポイントです。`prefecture`をいきなり削除せず、`subdivision` へのエイリアスとして残します。

### Phase C: 推奨ロジックの汎用化

```mermaid
flowchart TD
    subgraph 現状のrecommend_crs
        J1[country === 'Japan'?] -->|Yes| J2[都道府県→系の詳細マッピング]
        J1 -->|No| J3[WGS84 or Web Mercator を返すだけ]
    end

    subgraph 改善後のrecommend_crs
        N1[country判定] -->|JP| N2[既存の日本ロジック維持]
        N1 -->|US| N3[State Plane / UTM推奨]
        N1 -->|GB| N4[BNG / UTM推奨]
        N1 -->|DE,FR等| N5[ETRS89系 / UTM推奨]
        N1 -->|その他/Global| N6[UTMゾーン自動選択]

        N6 --> N6a["centerPoint/boundingBoxから<br/>UTMゾーン番号を計算"]
    end

    style J3 fill:#ff6b6b,color:#fff
    style N6 fill:#51cf66,color:#fff
```

**UTMゾーン自動計算は最もインパクトが大きい改善**です。経度からゾーン番号を計算するだけで、世界中どこでも適切なProjected CRSを推奨できるようになります。

```typescript
// UTMゾーン番号の計算（実装例）
function getUtmZone(lng: number): number {
	return Math.floor((lng + 180) / 6) + 1;
}

function getUtmEpsg(lat: number, lng: number): string {
	const zone = getUtmZone(lng);
	const base = lat >= 0 ? 32600 : 32700; // N or S
	return `EPSG:${base + zone}`;
}
```

### Phase D: データ言語の整理

```
global-crs.json の remarks:
  現状: "北米測地系1983。アメリカ・カナダ・メキシコで使用。"  ← 日本語！
  改善: "North American Datum 1983. Used in the US, Canada, and Mexico."

japan-crs.json の remarks:
  → 日本語のまま維持（日本の利用者向け）
  → ただしツールの出力フォーマットにlocale概念を追加検討
```

## 優先順位の提案

```mermaid
gantt
    title グローバル化ロードマップ
    dateFormat YYYY-MM-DD
    axisFormat %m/%d

    section Phase A（データ）
    global-crs.json remarks英語化     :a1, 2026-02-01, 1d
    UTM全ゾーン追加                   :a2, after a1, 3d
    主要国CRS追加（US,UK,EU）          :a3, after a2, 5d

    section Phase B（API）
    LocationSpec汎用化               :b1, after a1, 2d
    region列挙型の拡張                :b2, after b1, 1d
    country → ISO 3166対応           :b3, after b2, 2d

    section Phase C（ロジック）
    UTMゾーン自動計算                 :c1, after a2, 2d
    国別推奨ロジック追加              :c2, after c1, 5d
    国別ベストプラクティス            :c3, after c2, 3d

    section Phase D（品質）
    テスト追加                       :d1, after c2, 3d
    README更新・Usage例の国際化       :d2, after d1, 2d
```

### すぐにできる「クイックウィン」 Top 3

1. **`global-crs.json` の `remarks` を英語化** — 1時間で完了、グローバルユーザーへの最低限の対応
2. **UTMゾーン自動計算の追加** — `centerPoint`からUTMゾーンを計算する関数を追加するだけで、世界中の`recommend_crs`が劇的に改善
3. **`country`パラメータの ISO 3166化** — `"Japan"` → `"JP"` をエイリアスとして受け付けるだけで国際標準準拠

## アーキテクチャの方向性

現在のローカルJSON方式を維持しつつスケールさせる場合、データファイルの構造を見直す必要があります。

```
src/data/static/
├── japan-crs.json          # 既存（維持）
├── global-crs.json         # 拡充（UTM全ゾーン + 主要CRS）
├── regions/                # 新規：国別データ
│   ├── us-crs.json
│   ├── uk-crs.json
│   ├── europe-crs.json
│   └── australia-crs.json
├── recommendations.json    # 国別推奨ルール追加
├── transformations.json    # 国別変換経路追加
└── best-practices.json     # 国別ベストプラクティス追加
```

あるいは、EPSGレジストリのデータベース（SQLite形式で公開されている）をビルド時に取り込んで、ローカルJSONを自動生成するパイプラインを構築する方法もあります。これなら全CRSを網羅できますが、開発コストは大きくなります。

どのPhaseから着手するか、あるいは特定の国・地域を優先的にサポートしたいといった方針があれば、より具体的な実装プランを詰められます。
