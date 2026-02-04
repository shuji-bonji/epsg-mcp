# EPSG MCP 使用例

このドキュメントでは、EPSG MCP が AI エージェントの座標参照系（CRS）に関する意思決定をどのように支援するか、実践的なシナリオで説明します。

## 目次

- [シナリオ 1: 日本での測量プロジェクトセットアップ](#シナリオ-1-日本での測量プロジェクトセットアップ)
- [シナリオ 2: 旧測地系データの移行（Tokyo Datum → JGD2011）](#シナリオ-2-旧測地系データの移行tokyo-datum--jgd2011)
- [シナリオ 3: Web地図アプリケーション開発](#シナリオ-3-web地図アプリケーション開発)
- [シナリオ 4: 座標ずれのトラブルシューティング](#シナリオ-4-座標ずれのトラブルシューティング)
- [シナリオ 5: GeoJSONでの国際データ交換](#シナリオ-5-geojsonでの国際データ交換)
- [シナリオ 6: 米国State Plane座標系の選択](#シナリオ-6-米国state-plane座標系の選択)
- [シナリオ 7: 英国Ordnance Surveyプロジェクト](#シナリオ-7-英国ordnance-surveyプロジェクト)


## シナリオ 1: 日本での測量プロジェクトセットアップ

### 課題

GISエンジニアが札幌でのプロジェクトをセットアップする必要があります。日本の平面直角座標系は19系あり、北海道だけでも4つの系（XI〜XIV系）にまたがっています。間違った系を選ぶと大きな誤差が生じます。

### EPSG MCPなしの場合

- 札幌がどの系に属するか手動で調査が必要
- XI、XII、XIII、XIV系の混同リスク
- 廃止予定のJGD2000をJGD2011の代わりに使用してしまう可能性

### EPSG MCPを使用した場合

**ステップ 1: CRS推奨を取得**

```
Tool: recommend_crs
Input: {
  "purpose": "survey",
  "location": {
    "prefecture": "Hokkaido",
    "city": "Sapporo"
  }
}
```

**レスポンス:**
```json
{
  "primary": {
    "code": "EPSG:6680",
    "name": "JGD2011 / Japan Plane Rectangular CS XII",
    "score": 95,
    "pros": [
      "この地域での測量の公式CRS",
      "局所的な測定で高精度",
      "現行のJGD2011測地系に基づく"
    ],
    "cons": [
      "XII系のカバー範囲に限定"
    ]
  },
  "reasoning": "XII系（EPSG:6680）は札幌市の指定系です...",
  "warnings": [
    "北海道は複数の系（XI〜XIV）にまたがります。正確な系選択のため市区町村を指定してください。"
  ]
}
```

**ステップ 2: 選択の妥当性検証**

```
Tool: validate_crs_usage
Input: {
  "crs": "EPSG:6680",
  "purpose": "survey",
  "location": { "city": "Sapporo" }
}
```

**レスポンス:**
```json
{
  "isValid": true,
  "score": 95,
  "issues": [],
  "suggestions": []
}
```

**ステップ 3: ベストプラクティスの取得**

```
Tool: get_best_practices
Input: { "topic": "japan_survey" }
```

**主な推奨事項:**
- JGD2011ベースのCRS（EPSG:6669-6687）を使用
- 作業地域に適した系を選択
- GNSSの生データはJGD2011地理座標系（EPSG:6668）で保存


## シナリオ 2: 旧測地系データの移行（Tokyo Datum → JGD2011）

### 課題

組織がTokyo Datum（EPSG:4301）の20年前の測量データを保有しています。現行のJGD2011への移行が必要ですが、変換を誤ると**400メートル以上の座標ずれ**が発生します。

### EPSG MCPを使用した場合

**ステップ 1: 変換方法の理解**

```
Tool: suggest_transformation
Input: {
  "sourceCrs": "EPSG:4301",
  "targetCrs": "EPSG:6668",
  "location": { "prefecture": "Tokyo" }
}
```

**レスポンス:**
```json
{
  "recommended": {
    "name": "Tokyo to JGD2011 (2)",
    "method": "NTv2グリッド変換",
    "accuracy": "ほとんどの地域で0.2m",
    "steps": [
      {
        "from": "EPSG:4301",
        "to": "EPSG:6668",
        "operation": "TKY2JGD.parを使用したグリッドベース変換"
      }
    ]
  },
  "warnings": [
    "Tokyo DatumからJGD2011への変換は約400mのずれを伴います。変換パラメータを確認してください。",
    "最高精度にはグリッドファイル（TKY2JGD.par）が必要です"
  ],
  "notes": "3パラメータ変換の精度は約1mに制限されます"
}
```

**ステップ 2: 問題発生時のトラブルシュート**

```
Tool: troubleshoot
Input: {
  "symptom": "変換後に座標が400メートルずれている",
  "context": {
    "sourceCrs": "EPSG:4301",
    "targetCrs": "EPSG:6668",
    "location": "東京"
  }
}
```

**レスポンス:**
```json
{
  "matchedSymptom": "large_shift_hundreds_meters",
  "possibleCauses": [
    {
      "cause": "Tokyo Datum / JGD2011 測地系の不一致",
      "likelihood": "high",
      "explanation": "Tokyo DatumとJGD2011には約400mのオフセットがあります..."
    }
  ],
  "diagnosticSteps": [
    "元データが本当にTokyo Datumであることを確認",
    "変換パラメータが適用されているか確認",
    "グリッドファイルが利用可能で使用されているか確認"
  ],
  "suggestedSolutions": [
    "適切な測地系変換を適用（単なるCRS再投影ではなく）",
    "最高精度にはNTv2グリッドファイルを使用"
  ],
  "confidence": "high"
}
```


## シナリオ 3: Web地図アプリケーション開発

### 課題

開発者が日本全国のデータを表示するWeb地図アプリケーションを構築しています。必要な要件：
1. タイルを正しく表示
2. ユーザー送信の座標を保存
3. 正確な距離を計算

### EPSG MCPを使用した場合

**ステップ 1: 地図表示用のCRS**

```
Tool: recommend_crs
Input: {
  "purpose": "web_mapping",
  "location": { "country": "Japan" }
}
```

**レスポンス:**
```json
{
  "primary": {
    "code": "EPSG:3857",
    "name": "WGS 84 / Pseudo-Mercator",
    "score": 100,
    "pros": [
      "Web地図タイルの標準",
      "すべての主要地図ライブラリと互換性あり"
    ],
    "cons": [
      "面積・距離に大きな歪みあり"
    ],
    "usageNotes": "表示専用。計算には適切なCRSに変換してください。"
  }
}
```

**ステップ 2: Web Mercatorでの面積計算を検証**

```
Tool: validate_crs_usage
Input: {
  "crs": "EPSG:3857",
  "purpose": "area_calculation",
  "location": { "country": "Japan" }
}
```

**レスポンス:**
```json
{
  "isValid": false,
  "score": 25,
  "issues": [
    {
      "severity": "error",
      "code": "AREA_DISTORTION",
      "message": "Web Mercatorは日本の緯度で約23%の面積歪みがあります",
      "recommendation": "面積計算にはJGD2011平面直角座標系を使用してください"
    }
  ],
  "betterAlternatives": [
    {
      "code": "EPSG:6677",
      "name": "JGD2011 / Japan Plane Rectangular CS IX",
      "score": 90
    }
  ]
}
```

**ステップ 3: Web地図のベストプラクティス**

```
Tool: get_best_practices
Input: { "topic": "web_mapping" }
```

**主な推奨事項:**
- タイル表示にはEPSG:3857を使用
- GeoJSON出力はWGS84（EPSG:4326）で
- Web Mercatorでは面積・距離計算をしない
- 測定には投影座標系に変換


## シナリオ 4: 座標ずれのトラブルシューティング

### 課題

ユーザーから報告：「処理後に座標が1〜2メートルずれています」

### EPSG MCPを使用した場合

```
Tool: troubleshoot
Input: {
  "symptom": "座標が1〜2メートルずれている",
  "context": {
    "location": "東京",
    "tool": "QGIS"
  }
}
```

**レスポンス:**
```json
{
  "matchedSymptom": "small_shift_meters",
  "possibleCauses": [
    {
      "cause": "変換精度の限界",
      "likelihood": "high",
      "explanation": "Tokyo DatumからJGDへの変換には1〜2mの固有の精度限界があります"
    },
    {
      "cause": "グリッドシフトファイルの欠落",
      "likelihood": "medium",
      "explanation": "NTv2グリッドファイルがないと、精度の低いパラメータにフォールバック"
    },
    {
      "cause": "座標の桁落ち",
      "likelihood": "low",
      "explanation": "座標保存時の小数点以下桁数が不十分"
    }
  ],
  "diagnosticSteps": [
    "使用された変換方法（グリッド vs パラメトリック）を確認",
    "グリッドファイルがインストールされているか確認",
    "座標精度設定を確認"
  ],
  "suggestedSolutions": [
    "対象地域のNTv2グリッドファイルをインストール",
    "地理座標には少なくとも8桁の小数点を使用"
  ],
  "relatedBestPractices": ["precision_requirements", "historical_data"],
  "confidence": "high"
}
```


## シナリオ 5: GeoJSONでの国際データ交換

### 課題

チームが国際パートナーとGeoJSONデータを共有する必要があります。データは現在JGD2011平面直角座標系です。

### EPSG MCPを使用した場合

**ステップ 1: データ交換用に現在のCRSを検証**

```
Tool: validate_crs_usage
Input: {
  "crs": "EPSG:6677",
  "purpose": "data_exchange",
  "location": { "country": "Japan" }
}
```

**レスポンス:**
```json
{
  "isValid": false,
  "score": 40,
  "issues": [
    {
      "severity": "error",
      "code": "GEOJSON_INCOMPATIBLE",
      "message": "GeoJSON仕様はWGS84（EPSG:4326）を要求しています",
      "recommendation": "GeoJSON作成前にEPSG:4326に変換してください"
    },
    {
      "severity": "warning",
      "code": "NON_STANDARD_EXCHANGE",
      "message": "投影座標系は相互運用性を低下させます",
      "recommendation": "データ交換には地理座標系を使用"
    }
  ],
  "betterAlternatives": [
    {
      "code": "EPSG:4326",
      "name": "WGS 84",
      "score": 100,
      "pros": ["GeoJSON標準", "普遍的な互換性"]
    }
  ]
}
```

**ステップ 2: データ交換のベストプラクティス**

```
Tool: get_best_practices
Input: { "topic": "data_exchange" }
```

**主な推奨事項:**
- メタデータには必ずCRS情報を含める
- GeoJSONにはWGS84（EPSG:4326）を使用
- 追跡可能性のため変換履歴を記録
- 変換時の精度低下に注意


## シナリオ 6: 米国State Plane座標系の選択

### 課題

カリフォルニア州の測量士がロサンゼルスのプロジェクトに適したState Plane座標系のゾーンを選択する必要があります。

### EPSG MCPを使用した場合

**ステップ 1: 推奨を取得**

```
Tool: recommend_crs
Input: {
  "purpose": "survey",
  "location": {
    "country": "US",
    "subdivision": "California",
    "city": "Los Angeles"
  }
}
```

**レスポンス:**
```json
{
  "primary": {
    "code": "EPSG:2229",
    "name": "NAD83 / California zone 5",
    "score": 95,
    "pros": [
      "ロサンゼルス地域の公式State Planeゾーン",
      "ローカル測量に高精度",
      "NAD83測地系に基づく"
    ],
    "cons": [
      "カバー範囲が限定的"
    ]
  },
  "alternatives": [
    {
      "code": "EPSG:6425",
      "name": "NAD83(2011) / California zone 5",
      "score": 90,
      "pros": ["最新の測地系実現"]
    }
  ],
  "reasoning": "カリフォルニアゾーン5はロサンゼルス都市圏をカバーしています..."
}
```

**ステップ 2: NAD83バージョンの比較**

```
Tool: compare_crs
Input: {
  "crs1": "EPSG:2229",
  "crs2": "EPSG:6425",
  "aspects": ["datum", "accuracy"]
}
```

**レスポンス:**
```json
{
  "comparison": {
    "datum": {
      "crs1": "NAD83（オリジナル）",
      "crs2": "NAD83(2011)",
      "verdict": "CRS2はより新しい測地系実現を使用",
      "recommendation": "新規プロジェクトにはNAD83(2011)を推奨"
    },
    "accuracy": {
      "crs1": "現在の位置に対して約1m",
      "crs2": "現在の位置に対して約2cm",
      "verdict": "CRS2の方が高精度"
    }
  }
}
```


## シナリオ 7: 英国Ordnance Surveyプロジェクト

### 課題

ロンドンでのマッピングプロジェクトで、レガシーOSGB36データと最新のGNSS観測データの両方を扱う必要があります。

### EPSG MCPを使用した場合

**ステップ 1: 測量用CRSを推奨**

```
Tool: recommend_crs
Input: {
  "purpose": "survey",
  "location": {
    "country": "UK",
    "city": "London"
  }
}
```

**レスポンス:**
```json
{
  "primary": {
    "code": "EPSG:27700",
    "name": "OSGB36 / British National Grid",
    "score": 95,
    "pros": [
      "英国の公式マッピング座標系",
      "Ordnance Survey製品と互換性あり",
      "GNSSへの確立された変換あり"
    ],
    "usageNotes": "GNSSデータにはOSTN15変換を使用"
  }
}
```

**ステップ 2: GNSS（ETRS89）からBNGへの変換**

```
Tool: suggest_transformation
Input: {
  "sourceCrs": "EPSG:4258",
  "targetCrs": "EPSG:27700",
  "location": { "country": "UK" }
}
```

**レスポンス:**
```json
{
  "recommended": {
    "name": "ETRS89 to OSGB36 / British National Grid",
    "method": "OSTN15 + OSGM15 変換",
    "accuracy": "水平約0.1m、垂直約0.02m",
    "steps": [
      {
        "from": "EPSG:4258",
        "to": "EPSG:27700",
        "operation": "OSTN15グリッドベース変換"
      }
    ]
  },
  "warnings": [
    "単純なヘルマート変換を使用しないでください（精度約5mのみ）",
    "サブメートル精度にはOSTN15が必須です"
  ]
}
```

**ステップ 3: 英国固有のベストプラクティス**

```
Tool: get_best_practices
Input: { "topic": "uk_survey" }
```

**主な推奨事項:**
- イングランド、スコットランド、ウェールズにはBritish National Grid（EPSG:27700）を使用
- 北アイルランドにはIrish Transverse Mercator（EPSG:2157）を使用
- GNSSからBNGへの変換には必ずOSTN15を使用
- 変換前のGNSS生データはETRS89で保存


## まとめ: 各ツールの使いどころ

| シナリオ | 主要ツール | 補助ツール |
|----------|------------|------------|
| 新規プロジェクト開始 | `recommend_crs` | `get_best_practices` |
| 既存選択の検証 | `validate_crs_usage` | `compare_crs` |
| データ形式変換 | `validate_crs_usage` | `suggest_transformation` |
| 座標問題のデバッグ | `troubleshoot` | `compare_crs` |
| レガシーデータ移行 | `suggest_transformation` | `troubleshoot` |
| CRSについて学ぶ | `get_crs_detail` | `search_crs` |


## 他のMCPサーバーとの連携

EPSG MCPは変換ツールと連携して動作するよう設計されています：

```
┌─────────────────┐     ┌─────────────────┐
│   EPSG MCP      │     │ mcp-server-proj │
│  （知識層）      │────▶│  （実行層）      │
│                 │     │                 │
│ • どのCRS？     │     │ • 座標変換      │
│ • なぜこれ？    │     │   実行          │
│ • 問題は？      │     │                 │
└─────────────────┘     └─────────────────┘
```

**典型的なワークフロー:**
1. **EPSG MCP**: `recommend_crs` → 最適なCRSを取得
2. **EPSG MCP**: `suggest_transformation` → 変換パスを取得
3. **mcp-server-proj**: 実際の座標変換を実行
4. **EPSG MCP**: `validate_crs_usage` → 結果が適切か検証


## 関連資料

- [README.md](README.md) - 完全なツールリファレンス
- [Country Pack作成ガイド](docs/creating-country-packs.ja.md) - あなたの地域向けにEPSG MCPを拡張
- [EPSGレジストリ](https://epsg.org/) - 公式CRS定義
