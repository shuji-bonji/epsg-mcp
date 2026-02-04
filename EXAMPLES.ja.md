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
      "高精度",
      "法的根拠あり",
      "公共測量準則に準拠"
    ],
    "cons": [
      "系の選択が必要",
      "広域では複数系にまたがる"
    ]
  },
  "alternatives": [],
  "reasoning": "公共測量作業規程に準拠。測量法で定められた座標系。平面直角座標系は国土地理院の公式測量座標系です。",
  "warnings": [
    "3つの系にまたがります（西部=XI、中央部=XII、東部=XIII）"
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
  "score": 100,
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
- JGD2011（EPSG:6668）を標準として使用（must）
- 対象地域に適した平面直角座標系を選択（must）
- 広域データは地理座標系で管理（should）
- 座標精度に応じた適切な小数点以下桁数を使用（should）


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
  "directPath": null,
  "viaPaths": [
    {
      "steps": [
        {
          "from": "EPSG:4301",
          "to": "EPSG:4612",
          "method": "Geocentric translations (geog2D domain)",
          "accuracy": "1-2m",
          "epsgCode": "EPSG:15483",
          "notes": "日本国土地理院による公式パラメータ"
        },
        {
          "from": "EPSG:4612",
          "to": "EPSG:6668",
          "method": "Time-dependent Coordinate Frame rotation",
          "accuracy": "数cm",
          "epsgCode": "EPSG:6190",
          "notes": "東北地方太平洋沖地震による地殻変動対応"
        }
      ],
      "totalAccuracy": "1-2m以上（累積誤差注意）",
      "complexity": "moderate"
    }
  ],
  "recommended": { /* viaPaths[0]と同じ */ },
  "warnings": [
    "EPSG:4301 は非推奨です。Tokyo Datumは非推奨。新規データには使用しないこと。新規データには EPSG:6668 を使用してください。"
  ]
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
  "matchedSymptom": "座標が1〜数メートルずれている",
  "possibleCauses": [
    {
      "likelihood": "high",
      "cause": "Tokyo DatumからJGD2011への変換精度",
      "description": "Tokyo Datum → JGD2011 変換精度は1-2mに制限されます",
      "indicators": [
        "Tokyo Datumからの変換が行われた",
        "古いデータを使用している"
      ]
    },
    {
      "likelihood": "medium",
      "cause": "異なる変換パラメータ",
      "description": "同じ変換でも使用するパラメータによって結果が異なります"
    }
  ],
  "diagnosticSteps": [
    {
      "step": 1,
      "action": "変換履歴を確認",
      "expected": "変換方法とパラメータが記録されている"
    },
    {
      "step": 2,
      "action": "変換精度の限界を確認",
      "expected": "Tokyo→JGD変換では1-2mのずれは正常"
    }
  ],
  "suggestedSolutions": [
    {
      "forCause": "Tokyo DatumからJGD2011への変換精度",
      "steps": [
        "1-2mのずれを変換精度の限界として受け入れる",
        "高精度が必要な場合は元データの再測量を検討"
      ]
    }
  ],
  "relatedBestPractices": ["historical_data", "precision_requirements"],
  "confidence": "medium"
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
    "score": 95,
    "pros": [
      "主要ライブラリサポート",
      "タイルサービス互換"
    ],
    "cons": [
      "北海道で顕著な歪み",
      "面積計算不可"
    ]
  },
  "alternatives": [
    {
      "code": "EPSG:6668",
      "name": "JGD2011",
      "score": 75
    }
  ],
  "reasoning": "Web MercatorはWeb地図において日本でもデファクトスタンダードです。データ保存にはEPSG:6668（JGD2011）を推奨します。"
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
      "message": "Web Mercatorは面積に大きな歪みを生じます",
      "recommendation": "正積図法またはローカル投影座標系を使用してください"
    }
  ],
  "suggestions": [
    "正積図法またはローカル投影座標系を使用してください"
  ],
  "betterAlternatives": [
    {
      "code": "EPSG:6677",
      "name": "JGD2011 / Japan Plane Rectangular CS IX",
      "score": 95,
      "pros": ["高精度", "日本国内の標準"],
      "cons": ["系をまたげない"]
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
- Web地図表示にはWeb Mercator（EPSG:3857）を使用（must）
- GeoJSON出力はWGS84（EPSG:4326）で（must）
- Web Mercatorでは面積・距離計算をしない（must）
- 高精度機能には適切な投影座標系を使用（should）


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
  "matchedSymptom": "座標が1〜数メートルずれている",
  "possibleCauses": [
    {
      "likelihood": "high",
      "cause": "Tokyo DatumからJGD2011への変換精度",
      "description": "Tokyo Datum → JGD2011 変換精度は1-2mに制限されます",
      "indicators": [
        "Tokyo Datumからの変換が行われた",
        "古いデータを使用している"
      ]
    },
    {
      "likelihood": "medium",
      "cause": "異なる変換パラメータ",
      "description": "同じ変換でも使用するパラメータによって結果が異なります",
      "indicators": [
        "ソフトウェア間で結果が異なる",
        "変換方法が文書化されていない"
      ]
    }
  ],
  "diagnosticSteps": [
    {
      "step": 1,
      "action": "変換履歴を確認",
      "expected": "変換方法とパラメータが記録されている",
      "ifFailed": "変換が不明な場合は元データを検証"
    },
    {
      "step": 2,
      "action": "変換精度の限界を確認",
      "expected": "Tokyo→JGD変換では1-2mのずれは正常",
      "ifFailed": "ずれが大きい場合は他の原因を調査"
    }
  ],
  "suggestedSolutions": [
    {
      "forCause": "Tokyo DatumからJGD2011への変換精度",
      "steps": [
        "1-2mのずれを変換精度の限界として受け入れる",
        "高精度が必要な場合は元データの再測量を検討",
        "変換精度をメタデータに記録"
      ],
      "prevention": "事前にデータ精度要件と変換精度の限界を確認"
    }
  ],
  "relatedBestPractices": ["historical_data", "precision_requirements"],
  "confidence": "medium"
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
  "isValid": true,
  "score": 80,
  "issues": [
    {
      "severity": "info",
      "code": "NON_STANDARD_EXCHANGE",
      "message": "EPSG:4326がデータ交換で最も広くサポートされているCRSです",
      "recommendation": "より広い互換性のためにWGS84への変換を検討してください"
    },
    {
      "severity": "warning",
      "code": "GEOJSON_INCOMPATIBLE",
      "message": "GeoJSON仕様はWGS84（EPSG:4326）を要求しています",
      "recommendation": "GeoJSONエクスポート時はEPSG:4326に変換してください"
    }
  ],
  "suggestions": [
    "より広い互換性のためにWGS84への変換を検討してください",
    "GeoJSONエクスポート時はEPSG:4326に変換してください"
  ]
}
```

**ステップ 2: データ交換のベストプラクティス**

```
Tool: get_best_practices
Input: { "topic": "data_exchange" }
```

**主な推奨事項:**
- データにCRS情報を含める（must）
- 国際データ交換にはWGS84を使用（should）
- 変換精度を明記（should）


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
      "高精度",
      "法的根拠あり",
      "公共測量準則に準拠"
    ],
    "cons": [
      "ゾーン選択が必要",
      "広域では複数ゾーンにまたがる"
    ]
  },
  "alternatives": [],
  "reasoning": "US CRS Knowledge Packの測量推奨。",
  "warnings": []
}
```

**ステップ 2: WGS84との比較**

```
Tool: compare_crs
Input: {
  "crs1": "EPSG:2229",
  "crs2": "EPSG:4326",
  "aspects": ["datum", "accuracy"]
}
```

**レスポンス:**
```json
{
  "comparison": [
    {
      "aspect": "測地系",
      "crs1Value": "NAD83 / California zone 5",
      "crs2Value": "WGS84",
      "verdict": "異なる測地系。変換が必要"
    },
    {
      "aspect": "精度",
      "crs1Value": "ゾーン内で測量グレード",
      "crs2Value": "N/A",
      "verdict": "異なる精度特性"
    }
  ],
  "summary": "地理座標系と投影座標系の比較。用途に応じて選択してください。",
  "recommendation": "広域データ保存には地理座標系、ローカル計算には投影座標系を使用。"
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
      "高精度",
      "法的根拠あり",
      "公共測量準則に準拠"
    ],
    "cons": [
      "ゾーン選択が必要",
      "広域では複数ゾーンにまたがる"
    ]
  },
  "alternatives": [],
  "reasoning": "UK CRS Knowledge Packの測量推奨。",
  "warnings": []
}
```

**ステップ 2: 測量のベストプラクティス**

```
Tool: get_best_practices
Input: { "topic": "precision_requirements" }
```

**主な推奨事項:**
- プロジェクト開始時に精度要件を定義（must）
- 必要な精度に適したCRSを使用（should）
- メタデータに精度を記録（should）


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
