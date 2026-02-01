# Phase 4 実装計画書

## 概要

Phase 4では、**ガイダンス・支援機能**を実装する。CRS利用のベストプラクティス提供と、座標系関連の問題に対するトラブルシューティング支援を提供する。

| ツール             | 説明                             | 優先度 |
| ------------------ | -------------------------------- | ------ |
| `get_best_practices` | CRS利用のベストプラクティス提供 | 高     |
| `troubleshoot`       | 座標系問題のトラブルシューティング | 高   |

## 1. get_best_practices

### 1.1 ツール定義

```typescript
interface GetBestPracticesInput {
	topic: BestPracticeTopic;
	context?: string;  // 追加の文脈情報
}

type BestPracticeTopic =
	| 'japan_survey'        // 日本での測量
	| 'web_mapping'         // Web地図開発
	| 'data_exchange'       // データ交換
	| 'coordinate_storage'  // 座標保存
	| 'mobile_gps'          // モバイルGPS利用
	| 'cross_border'        // 国境をまたぐデータ
	| 'historical_data'     // 過去データの扱い
	| 'gis_integration'     // GISシステム統合
	| 'precision_requirements'  // 精度要件
	| 'projection_selection';   // 投影法選択

interface GetBestPracticesOutput {
	topic: string;
	description: string;        // トピックの説明
	practices: Practice[];
	commonMistakes: CommonMistake[];
	relatedTopics: string[];    // 関連トピック
	references: Reference[];
}

interface Practice {
	title: string;
	description: string;
	example?: string;           // 具体例
	codeExample?: string;       // コード例（あれば）
	priority: 'must' | 'should' | 'may';
	rationale: string;          // なぜこれが重要か
}

interface CommonMistake {
	mistake: string;            // よくある間違い
	consequence: string;        // その結果起こる問題
	solution: string;           // 正しい方法
}

interface Reference {
	title: string;
	url?: string;
	type: 'official' | 'article' | 'tool';
}
```

### 1.2 トピック詳細

#### japan_survey（日本での測量）

- JGD2011の使用推奨
- 平面直角座標系の系選択
- 公共測量規程との整合性

#### web_mapping（Web地図開発）

- Web Mercator (EPSG:3857) の使い分け
- GeoJSON出力時のCRS
- タイル座標系との関係

#### data_exchange（データ交換）

- 国際データ交換時のCRS選択
- メタデータの重要性
- 変換時の精度明示

#### coordinate_storage（座標保存）

- 地理座標系での保存推奨
- 投影座標系保存時の注意点
- 座標精度の桁数

#### mobile_gps（モバイルGPS利用）

- GPS出力のWGS84について
- 精度の限界
- 測地系混在の回避

#### historical_data（過去データの扱い）

- Tokyo Datum からの変換
- JGD2000 からの移行
- 精度劣化の許容

#### cross_border（国境をまたぐデータ）

- 国際標準の使用
- 各国測地系の違い
- UTM zones の活用

#### gis_integration（GISシステム統合）

- CRS不一致の検出
- オンザフライ変換の注意点
- 空間インデックスとCRS

#### precision_requirements（精度要件）

- 用途別の精度要件
- 精度とコストのトレードオフ
- 測量等級との対応

#### projection_selection（投影法選択）

- 正角・正積・正距の使い分け
- 日本での推奨投影法
- 歪みの影響評価

### 1.3 データ構造（best-practices.json）

```json
{
	"version": "1.0.0",
	"topics": {
		"japan_survey": {
			"description": "日本国内での測量・地図作成におけるCRS選択のベストプラクティス",
			"practices": [
				{
					"title": "JGD2011 (EPSG:6668) を基準とする",
					"description": "日本国内の測量・地図作成では、測量法に基づくJGD2011を使用する",
					"priority": "must",
					"rationale": "日本の公式測地系であり、国土地理院の成果と整合性がある",
					"example": "国土基本図、地籍図、都市計画図などの作成"
				},
				{
					"title": "適切な平面直角座標系を選択する",
					"description": "対象地域に応じた平面直角座標系（I〜XIX系）を選択する",
					"priority": "must",
					"rationale": "系が異なると座標値の意味が変わり、計算結果が不正確になる",
					"example": "東京都 → IX系 (EPSG:6677)、北海道札幌 → XII系 (EPSG:6680)"
				},
				{
					"title": "広域データは地理座標系で管理",
					"description": "複数の系にまたがるデータは地理座標系(EPSG:6668)で保存し、必要に応じて投影する",
					"priority": "should",
					"rationale": "系の境界で連続性が失われることを防ぐ"
				},
				{
					"title": "座標精度に応じた桁数を使用",
					"description": "平面直角座標系ではミリメートル単位（小数点以下3桁）、地理座標系では小数点以下8桁程度",
					"priority": "should",
					"rationale": "過剰な桁数は無意味であり、不足するとデータ品質が低下"
				}
			],
			"commonMistakes": [
				{
					"mistake": "Tokyo Datum (EPSG:4301) を使用している",
					"consequence": "JGD2011との座標差が1-2mあり、他データとの重ね合わせでずれが生じる",
					"solution": "JGD2011に変換し、メタデータに変換履歴を記録する"
				},
				{
					"mistake": "異なる系のデータを同一系として扱う",
					"consequence": "座標値が大きく異なり、計算結果が不正確になる",
					"solution": "データの系情報を確認し、必要に応じて座標変換する"
				}
			],
			"relatedTopics": ["precision_requirements", "projection_selection", "historical_data"],
			"references": [
				{
					"title": "国土地理院 - 測地成果2011について",
					"url": "https://www.gsi.go.jp/sokuchikijun/jgd2011.html",
					"type": "official"
				},
				{
					"title": "作業規程の準則（公共測量）",
					"url": "https://psgsv2.gsi.go.jp/koukyou/jyunsoku/",
					"type": "official"
				}
			]
		},
		"web_mapping": {
			"description": "Webアプリケーションでの地図表示・操作におけるCRS選択のベストプラクティス",
			"practices": [
				{
					"title": "Web地図表示にはWeb Mercator (EPSG:3857) を使用",
					"description": "Leaflet、MapLibre、Google Maps等の標準タイル座標系",
					"priority": "must",
					"rationale": "主要なWeb地図ライブラリとタイルサービスがこの座標系を採用",
					"example": "地図タイルのURL: https://tile.openstreetmap.org/{z}/{x}/{y}.png"
				},
				{
					"title": "GeoJSONはWGS84 (EPSG:4326) で出力",
					"description": "GeoJSON仕様ではWGS84が標準",
					"priority": "must",
					"rationale": "仕様準拠により相互運用性を確保",
					"codeExample": "{ \"type\": \"Point\", \"coordinates\": [139.6917, 35.6895] }"
				},
				{
					"title": "面積・距離計算はWeb Mercatorでは行わない",
					"description": "面積・距離の正確な計算が必要な場合は、地理座標系または適切な投影座標系に変換",
					"priority": "must",
					"rationale": "Web Mercatorは高緯度で著しい面積歪みがある（緯度60度で4倍）"
				},
				{
					"title": "高精度が必要な機能では適切な投影座標系を使用",
					"description": "距離測定、面積計算、バッファ生成などでは目的に合った座標系に変換",
					"priority": "should",
					"rationale": "投影歪みによる誤差を最小化"
				}
			],
			"commonMistakes": [
				{
					"mistake": "Web Mercatorで面積計算をしている",
					"consequence": "日本（緯度35度付近）でも約23%の面積歪みが生じる",
					"solution": "面積計算前にJGD2011平面直角座標系または等積図法に変換"
				},
				{
					"mistake": "GeoJSONにEPSG:3857の座標を出力している",
					"consequence": "他のGISソフトウェアで正しく読み込めない",
					"solution": "GeoJSONはWGS84 (EPSG:4326) で出力し、CRSプロパティは省略"
				}
			],
			"relatedTopics": ["data_exchange", "coordinate_storage"],
			"references": [
				{
					"title": "GeoJSON仕様 (RFC 7946)",
					"url": "https://datatracker.ietf.org/doc/html/rfc7946",
					"type": "official"
				},
				{
					"title": "Leaflet Documentation",
					"url": "https://leafletjs.com/reference.html",
					"type": "tool"
				}
			]
		},
		"data_exchange": {
			"description": "組織間・システム間でのデータ交換におけるCRS選択のベストプラクティス",
			"practices": [
				{
					"title": "データにCRS情報を明記する",
					"description": "EPSGコードをメタデータに含め、変換履歴も記録",
					"priority": "must",
					"rationale": "CRS不明のデータは使用時に混乱を招く",
					"example": "Shapefile の .prj ファイル、GeoPackage の spatial_ref_sys テーブル"
				},
				{
					"title": "国際データ交換にはWGS84を使用",
					"description": "国や地域を超えるデータ交換ではWGS84 (EPSG:4326) を基準",
					"priority": "should",
					"rationale": "GPS衛星の基準であり、世界共通で理解される"
				},
				{
					"title": "変換精度を明示する",
					"description": "座標変換を行った場合、変換方法と精度をメタデータに記録",
					"priority": "should",
					"rationale": "受領者が精度を評価できる"
				}
			],
			"commonMistakes": [
				{
					"mistake": "CRS情報なしでデータを渡している",
					"consequence": "受領者が間違った座標系として解釈し、位置ずれが発生",
					"solution": "常にCRS情報（EPSGコード）をメタデータに含める"
				}
			],
			"relatedTopics": ["coordinate_storage", "cross_border"],
			"references": []
		},
		"coordinate_storage": {
			"description": "データベースやファイルでの座標データ保存のベストプラクティス",
			"practices": [
				{
					"title": "長期保存には地理座標系を使用",
					"description": "データベースには地理座標系（EPSG:4326またはEPSG:6668）で保存",
					"priority": "should",
					"rationale": "投影座標系は将来変更の可能性があるが、地理座標系は安定"
				},
				{
					"title": "座標の精度に応じた数値型を使用",
					"description": "緯度経度はDOUBLE型、投影座標はDECIMAL(12,3)程度",
					"priority": "should",
					"rationale": "FLOAT型では精度不足の可能性"
				},
				{
					"title": "空間インデックスのCRSを統一する",
					"description": "PostGIS等で空間インデックスを作成する場合、統一されたCRSを使用",
					"priority": "must",
					"rationale": "異なるCRSのデータは空間クエリで正しく比較できない"
				}
			],
			"commonMistakes": [
				{
					"mistake": "FLOAT型で座標を保存している",
					"consequence": "約7桁の精度しかなく、緯度経度で約10m程度の誤差が発生する可能性",
					"solution": "DOUBLE型またはDECIMAL型を使用"
				}
			],
			"relatedTopics": ["precision_requirements", "gis_integration"],
			"references": []
		},
		"mobile_gps": {
			"description": "スマートフォンやGPSデバイスでの位置情報利用のベストプラクティス",
			"practices": [
				{
					"title": "GPS出力はWGS84であることを認識する",
					"description": "GPS衛星システムはWGS84を使用しており、出力される座標もWGS84",
					"priority": "must",
					"rationale": "測地系を誤認すると1-2m以上のずれが生じる"
				},
				{
					"title": "GPS精度の限界を理解する",
					"description": "民生GPS: 数m〜10m、DGPS: 1m程度、RTK: 数cm",
					"priority": "should",
					"rationale": "精度以上の議論は無意味"
				},
				{
					"title": "日本国内データはJGD2011に変換して保存",
					"description": "WGS84とJGD2011は実用上同一だが、国内データ管理の統一性のため変換推奨",
					"priority": "may",
					"rationale": "座標差は数cm以内だが、メタデータの一貫性を保つ"
				}
			],
			"commonMistakes": [
				{
					"mistake": "GPSデータをTokyo Datumとして扱っている",
					"consequence": "実際の位置から400m以上ずれる",
					"solution": "GPSはWGS84出力であることを認識し、適切に処理"
				}
			],
			"relatedTopics": ["precision_requirements", "japan_survey"],
			"references": []
		},
		"historical_data": {
			"description": "過去に作成されたデータの取り扱いに関するベストプラクティス",
			"practices": [
				{
					"title": "Tokyo Datumデータは変換して使用",
					"description": "Tokyo Datum (EPSG:4301) のデータはJGD2011に変換してから使用",
					"priority": "must",
					"rationale": "現行測地系との整合性を確保",
					"example": "EPSG:4301 → EPSG:4612 → EPSG:6668 の2段階変換"
				},
				{
					"title": "変換精度の限界を認識する",
					"description": "Tokyo Datum → JGD2011 の変換精度は1-2m程度",
					"priority": "must",
					"rationale": "精度以上の議論は無意味であり、精度要件と照らし合わせる"
				},
				{
					"title": "元データの測地系情報を保存",
					"description": "変換後も元の測地系情報とパラメータをメタデータとして保持",
					"priority": "should",
					"rationale": "将来の検証や再変換に必要"
				}
			],
			"commonMistakes": [
				{
					"mistake": "測地系情報なしの古いデータをそのまま使用",
					"consequence": "新しいデータとの重ね合わせで大きなずれが発生",
					"solution": "データの由来を調査し、適切な測地系を推定して変換"
				}
			],
			"relatedTopics": ["japan_survey", "precision_requirements"],
			"references": []
		},
		"cross_border": {
			"description": "国境をまたぐデータや国際プロジェクトでのCRS選択のベストプラクティス",
			"practices": [
				{
					"title": "WGS84を共通基準とする",
					"description": "国際データ交換ではWGS84 (EPSG:4326) を基準座標系として使用",
					"priority": "must",
					"rationale": "世界共通で認識され、GPS衛星の基準でもある"
				},
				{
					"title": "UTM座標系の活用",
					"description": "広域の投影座標が必要な場合はUTMゾーンを使用",
					"priority": "should",
					"rationale": "世界中で定義されており、相互運用性が高い",
					"example": "日本: UTM 52N-54N (EPSG:32652-32654)"
				}
			],
			"commonMistakes": [
				{
					"mistake": "各国の国内測地系をそのまま結合している",
					"consequence": "国境付近でデータの不連続が発生",
					"solution": "共通座標系（WGS84等）に変換してから結合"
				}
			],
			"relatedTopics": ["data_exchange", "projection_selection"],
			"references": []
		},
		"gis_integration": {
			"description": "GISソフトウェア・システム統合時のCRS取り扱いのベストプラクティス",
			"practices": [
				{
					"title": "プロジェクトのCRSを明確に設定",
					"description": "GISプロジェクト開始時にCRSを決定し、ドキュメント化",
					"priority": "must",
					"rationale": "後からの変更は大きな手戻りを招く"
				},
				{
					"title": "オンザフライ変換に頼りすぎない",
					"description": "表示用のオンザフライ変換は便利だが、分析・出力前に明示的に変換",
					"priority": "should",
					"rationale": "オンザフライ変換はパフォーマンスに影響し、予期しない丸め誤差の原因にもなる"
				},
				{
					"title": "データ読み込み時にCRSを確認",
					"description": "新しいデータを追加する際、CRS情報を確認してから読み込む",
					"priority": "should",
					"rationale": "CRS不明または誤りのデータ混入を防ぐ"
				}
			],
			"commonMistakes": [
				{
					"mistake": "CRS不明データを「多分これだろう」で設定",
					"consequence": "実際のCRSと異なる場合、全ての空間計算結果が不正確に",
					"solution": "データソースを確認し、必要なら提供元に問い合わせ"
				}
			],
			"relatedTopics": ["coordinate_storage", "data_exchange"],
			"references": []
		},
		"precision_requirements": {
			"description": "用途に応じた精度要件の設定と達成方法",
			"practices": [
				{
					"title": "用途に応じた精度を設定",
					"description": "カーナビ: 数m、都市計画: 数十cm、測量: 数cm以下",
					"priority": "must",
					"rationale": "過剰精度はコスト増、不足は要件未達"
				},
				{
					"title": "精度に見合った座標系を選択",
					"description": "高精度が必要な場合は投影座標系、広域は地理座標系",
					"priority": "should",
					"rationale": "座標系の特性と精度要件をマッチング"
				}
			],
			"commonMistakes": [
				{
					"mistake": "GPSデータにミリメートル精度を求める",
					"consequence": "測定限界を超えた議論になり、無意味な精度議論に時間を浪費",
					"solution": "データソースの精度限界を理解する"
				}
			],
			"relatedTopics": ["mobile_gps", "japan_survey"],
			"references": []
		},
		"projection_selection": {
			"description": "目的に応じた投影法の選択方法",
			"practices": [
				{
					"title": "用途に応じた投影法を選択",
					"description": "正角図法（形状保存）、正積図法（面積保存）、正距図法（距離保存）",
					"priority": "must",
					"rationale": "全ての特性を同時に保存することは不可能"
				},
				{
					"title": "日本の測量には平面直角座標系を使用",
					"description": "横メルカトル図法（正角）で高精度な距離・角度計算が可能",
					"priority": "should",
					"rationale": "公共測量の基準であり、法的にも認められている"
				},
				{
					"title": "Web地図にはWeb Mercatorを使用",
					"description": "全世界を1枚の地図で表現でき、タイル分割と相性が良い",
					"priority": "should",
					"rationale": "Web地図のデファクトスタンダード"
				}
			],
			"commonMistakes": [
				{
					"mistake": "Web Mercatorで統計地図を作成",
					"consequence": "高緯度地域の面積が過大表示され、誤解を招く",
					"solution": "統計地図には正積図法を使用"
				}
			],
			"relatedTopics": ["web_mapping", "japan_survey"],
			"references": []
		}
	}
}
```

### 1.4 実装

```typescript
import { loadBestPractices } from '../data/loader.js';
import { NotFoundError } from '../errors/index.js';
import type { GetBestPracticesOutput, BestPracticeTopic } from '../types/index.js';

export async function getBestPractices(
	topic: BestPracticeTopic,
	context?: string
): Promise<GetBestPracticesOutput> {
	const data = await loadBestPractices();
	const topicData = data.topics[topic];

	if (!topicData) {
		throw new NotFoundError('BestPractice', topic);
	}

	return {
		topic: topic,
		description: topicData.description,
		practices: topicData.practices,
		commonMistakes: topicData.commonMistakes,
		relatedTopics: topicData.relatedTopics,
		references: topicData.references,
	};
}
```

## 2. troubleshoot

### 2.1 ツール定義

```typescript
interface TroubleshootInput {
	symptom: string;  // 「座標がずれる」「変換結果がおかしい」など
	context?: {
		sourceCrs?: string;
		targetCrs?: string;
		location?: string;      // 「東京」「日本全国」など
		tool?: string;          // 「QGIS」「PostGIS」「Leaflet」など
		magnitude?: string;     // 「数メートル」「数百メートル」など
	};
}

interface TroubleshootOutput {
	symptom: string;
	possibleCauses: Cause[];
	diagnosticSteps: DiagnosticStep[];
	solutions: Solution[];
	relatedBestPractices: string[];  // 関連するベストプラクティストピック
}

interface Cause {
	likelihood: 'high' | 'medium' | 'low';
	cause: string;
	description: string;
	indicators: string[];  // この原因を示す兆候
}

interface DiagnosticStep {
	step: number;
	action: string;
	expected: string;
	ifFailed: string;
}

interface Solution {
	forCause: string;
	steps: string[];
	prevention: string;
	tools?: string[];  // 解決に使えるツール
}
```

### 2.2 症状パターンと診断ロジック

#### 症状カテゴリ

| 症状カテゴリ | キーワード | 主な原因 |
| ------------ | ---------- | -------- |
| 座標ずれ（大） | 「数百m」「キロ」「全然違う」 | 測地系混在、CRS誤認 |
| 座標ずれ（中） | 「数m」「1-2m」 | Tokyo Datum/JGD変換 |
| 座標ずれ（小） | 「数cm」「mm」 | 変換精度、丸め誤差 |
| 面積・距離異常 | 「面積が違う」「距離が違う」 | 投影法選択ミス |
| 表示異常 | 「表示されない」「空白」 | CRS不一致、座標範囲外 |
| 変換エラー | 「変換できない」「エラー」 | 対応パラメータなし |

### 2.3 データ構造（troubleshooting.json）

```json
{
	"version": "1.0.0",
	"symptoms": {
		"coordinate_shift_large": {
			"description": "座標が数百メートル〜数キロメートルずれる",
			"keywords": ["数百m", "キロ", "全然違う", "大きくずれ", "400m"],
			"possibleCauses": [
				{
					"likelihood": "high",
					"cause": "測地系の混在（Tokyo Datum と JGD/WGS84）",
					"description": "Tokyo Datum と JGD2011/WGS84 の間には約400mの系統的なずれがある",
					"indicators": [
						"データが2002年以前に作成された",
						"古い地図や図面からデジタイズした",
						"CRS情報が不明または未設定"
					]
				},
				{
					"likelihood": "medium",
					"cause": "CRSの誤設定",
					"description": "データのCRS情報が実際と異なる値で設定されている",
					"indicators": [
						"インポート時にCRSを手動指定した",
						".prjファイルが欠落または不正",
						"CRS変換を行っていないのに変換後のCRSが設定されている"
					]
				},
				{
					"likelihood": "low",
					"cause": "座標軸の入れ替わり（X/Y, 経度/緯度）",
					"description": "経度と緯度が入れ替わっているか、X/Yの順序が逆",
					"indicators": [
						"ポイントが海上や外国に表示される",
						"座標値の範囲が想定と異なる"
					]
				}
			],
			"diagnosticSteps": [
				{
					"step": 1,
					"action": "データのCRS情報を確認する",
					"expected": "明確なEPSGコードが設定されている",
					"ifFailed": "CRS情報が不明の場合、データの由来を調査"
				},
				{
					"step": 2,
					"action": "座標値の範囲を確認する",
					"expected": "日本の場合: 緯度 20-46°, 経度 122-154°",
					"ifFailed": "座標値が異常な場合、座標軸の入れ替わりを疑う"
				},
				{
					"step": 3,
					"action": "既知の地点の座標を比較する",
					"expected": "参照データと一致する",
					"ifFailed": "ずれのパターン（方向、距離）から原因を推定"
				}
			],
			"solutions": [
				{
					"forCause": "測地系の混在（Tokyo Datum と JGD/WGS84）",
					"steps": [
						"データがTokyo Datumであることを確認",
						"EPSG:4301 から EPSG:6668 への変換を実行",
						"変換後のデータを検証"
					],
					"prevention": "データ作成時に測地系を明記し、古いデータは変換してから使用する",
					"tools": ["QGIS", "GDAL ogr2ogr", "PostGIS ST_Transform"]
				},
				{
					"forCause": "CRSの誤設定",
					"steps": [
						"正しいCRSを特定する",
						"CRS情報を修正（変換ではなく定義の変更）",
						"修正後のデータを検証"
					],
					"prevention": "データ取得時にCRS情報を必ず確認し、ドキュメント化する"
				}
			],
			"relatedBestPractices": ["historical_data", "data_exchange"]
		},
		"coordinate_shift_medium": {
			"description": "座標が1〜数メートルずれる",
			"keywords": ["数m", "1-2m", "メートル単位"],
			"possibleCauses": [
				{
					"likelihood": "high",
					"cause": "Tokyo Datum から JGD2011 への変換精度",
					"description": "Tokyo Datum → JGD2011 の変換精度は1-2m程度が限界",
					"indicators": [
						"Tokyo Datumからの変換を行った",
						"古いデータを使用している"
					]
				},
				{
					"likelihood": "medium",
					"cause": "変換パラメータの違い",
					"description": "同じ変換でも使用するパラメータにより結果が異なる",
					"indicators": [
						"異なるソフトウェアで変換した結果が異なる",
						"変換方法を明示していない"
					]
				}
			],
			"diagnosticSteps": [
				{
					"step": 1,
					"action": "変換履歴を確認する",
					"expected": "変換方法とパラメータが記録されている",
					"ifFailed": "変換が行われたかどうか不明な場合、元データを確認"
				},
				{
					"step": 2,
					"action": "変換精度の限界を確認する",
					"expected": "Tokyo→JGD変換では1-2mのずれは正常",
					"ifFailed": "それ以上のずれがある場合、他の原因を調査"
				}
			],
			"solutions": [
				{
					"forCause": "Tokyo Datum から JGD2011 への変換精度",
					"steps": [
						"1-2mのずれは変換精度の限界として受容",
						"より高精度が必要な場合は元データの再測量を検討",
						"メタデータに変換精度を記録"
					],
					"prevention": "データの精度要件と変換精度の限界を事前に確認する"
				}
			],
			"relatedBestPractices": ["historical_data", "precision_requirements"]
		},
		"coordinate_shift_small": {
			"description": "座標が数cm〜数十cmずれる",
			"keywords": ["数cm", "センチ", "微小"],
			"possibleCauses": [
				{
					"likelihood": "high",
					"cause": "WGS84 と JGD2011 の差",
					"description": "WGS84とJGD2011は実用上同一だが、厳密には数cm程度の差がある",
					"indicators": [
						"GPS(WGS84)データとJGD2011データを混在使用",
						"高精度測量データを使用"
					]
				},
				{
					"likelihood": "medium",
					"cause": "JGD2000 から JGD2011 への地殻変動補正",
					"description": "2011年東北地方太平洋沖地震による地殻変動で座標が変化",
					"indicators": [
						"2011年以前のJGD2000データを使用",
						"東北地方のデータ"
					]
				},
				{
					"likelihood": "low",
					"cause": "数値精度・丸め誤差",
					"description": "座標値の桁数不足や計算時の丸め誤差",
					"indicators": [
						"FLOAT型で座標を保存している",
						"複数回の変換を経ている"
					]
				}
			],
			"diagnosticSteps": [
				{
					"step": 1,
					"action": "使用しているCRSを確認",
					"expected": "WGS84とJGD2011が混在していないか確認",
					"ifFailed": "混在している場合は統一を検討"
				},
				{
					"step": 2,
					"action": "数値型を確認",
					"expected": "DOUBLE型または十分な精度のDECIMAL型",
					"ifFailed": "FLOAT型の場合は型変更を検討"
				}
			],
			"solutions": [
				{
					"forCause": "WGS84 と JGD2011 の差",
					"steps": [
						"実用上の問題がなければそのまま使用",
						"厳密な整合性が必要な場合はどちらかに統一",
						"日本国内データはJGD2011推奨"
					],
					"prevention": "プロジェクト開始時にCRSを統一する"
				}
			],
			"relatedBestPractices": ["coordinate_storage", "precision_requirements"]
		},
		"area_distance_error": {
			"description": "面積や距離の計算結果がおかしい",
			"keywords": ["面積", "距離", "計算結果", "長さ"],
			"possibleCauses": [
				{
					"likelihood": "high",
					"cause": "Web Mercator (EPSG:3857) での計算",
					"description": "Web Mercatorは高緯度で著しい面積・距離歪みがある",
					"indicators": [
						"Web地図ライブラリを使用",
						"EPSG:3857で計算している",
						"高緯度地域のデータ"
					]
				},
				{
					"likelihood": "medium",
					"cause": "地理座標系での平面計算",
					"description": "緯度経度で直接距離や面積を計算している",
					"indicators": [
						"度単位の座標をそのまま計算に使用",
						"ピタゴラスの定理で距離計算"
					]
				}
			],
			"diagnosticSteps": [
				{
					"step": 1,
					"action": "計算時のCRSを確認",
					"expected": "適切な投影座標系（日本なら平面直角座標系）",
					"ifFailed": "Web Mercatorや地理座標系なら変換が必要"
				},
				{
					"step": 2,
					"action": "期待される誤差を計算",
					"expected": "緯度35度のWeb Mercator: 面積約23%歪み",
					"ifFailed": "誤差が想定と一致するか確認"
				}
			],
			"solutions": [
				{
					"forCause": "Web Mercator (EPSG:3857) での計算",
					"steps": [
						"計算前にJGD2011平面直角座標系に変換",
						"または球面上の計算式（Haversine等）を使用",
						"面積計算には等積図法を検討"
					],
					"prevention": "面積・距離計算にはWeb Mercatorを使用しない",
					"tools": ["PostGIS ST_Area(geography)", "Turf.js"]
				}
			],
			"relatedBestPractices": ["web_mapping", "projection_selection"]
		},
		"display_blank": {
			"description": "データが表示されない・空白になる",
			"keywords": ["表示されない", "空白", "見えない", "消えた"],
			"possibleCauses": [
				{
					"likelihood": "high",
					"cause": "CRS不一致による座標範囲外",
					"description": "異なるCRSのデータを同一ビューで表示しようとしている",
					"indicators": [
						"一部のレイヤーだけ表示されない",
						"ズームすると何も表示されない領域がある"
					]
				},
				{
					"likelihood": "medium",
					"cause": "座標値の桁違い",
					"description": "メートル単位と度単位が混在、または単位系の誤り",
					"indicators": [
						"座標値が極端に大きいまたは小さい",
						"投影座標系と地理座標系が混在"
					]
				}
			],
			"diagnosticSteps": [
				{
					"step": 1,
					"action": "各レイヤーのCRSを確認",
					"expected": "全レイヤーで同じCRS、または変換可能",
					"ifFailed": "CRSを統一または変換設定を確認"
				},
				{
					"step": 2,
					"action": "座標値の範囲を確認",
					"expected": "想定される範囲内（日本の緯度経度等）",
					"ifFailed": "座標値が異常な場合、データの確認が必要"
				}
			],
			"solutions": [
				{
					"forCause": "CRS不一致による座標範囲外",
					"steps": [
						"プロジェクトCRSを確認",
						"全レイヤーのCRSを確認・統一",
						"オンザフライ変換が有効か確認"
					],
					"prevention": "データ追加時にCRSを確認してから追加する"
				}
			],
			"relatedBestPractices": ["gis_integration", "data_exchange"]
		},
		"transformation_error": {
			"description": "座標変換でエラーが発生する",
			"keywords": ["変換できない", "エラー", "失敗", "変換に失敗"],
			"possibleCauses": [
				{
					"likelihood": "high",
					"cause": "変換パラメータが見つからない",
					"description": "指定したCRS間の変換パラメータがソフトウェアに登録されていない",
					"indicators": [
						"マイナーなCRS間の変換",
						"「変換方法が見つかりません」エラー"
					]
				},
				{
					"likelihood": "medium",
					"cause": "不正なCRSコード",
					"description": "存在しないまたは廃止されたEPSGコードを指定",
					"indicators": [
						"「CRSが見つかりません」エラー",
						"手入力でCRSコードを指定した"
					]
				}
			],
			"diagnosticSteps": [
				{
					"step": 1,
					"action": "CRSコードの有効性を確認",
					"expected": "EPSG Registryに存在するコード",
					"ifFailed": "正しいコードを調査"
				},
				{
					"step": 2,
					"action": "中間CRS経由の変換を試す",
					"expected": "WGS84 (EPSG:4326) 経由で変換可能",
					"ifFailed": "手動でパラメータを設定"
				}
			],
			"solutions": [
				{
					"forCause": "変換パラメータが見つからない",
					"steps": [
						"WGS84 (EPSG:4326) 経由の2段階変換を試す",
						"PROJやGDALのバージョンを更新",
						"手動で変換パラメータを設定"
					],
					"prevention": "主要なCRSを使用し、特殊なCRSは避ける",
					"tools": ["PROJ", "GDAL", "epsg.io"]
				}
			],
			"relatedBestPractices": ["data_exchange", "cross_border"]
		}
	},
	"keywordMapping": {
		"ずれる": ["coordinate_shift_large", "coordinate_shift_medium", "coordinate_shift_small"],
		"ずれ": ["coordinate_shift_large", "coordinate_shift_medium", "coordinate_shift_small"],
		"400m": ["coordinate_shift_large"],
		"数百": ["coordinate_shift_large"],
		"1-2m": ["coordinate_shift_medium"],
		"数m": ["coordinate_shift_medium"],
		"数cm": ["coordinate_shift_small"],
		"面積": ["area_distance_error"],
		"距離": ["area_distance_error"],
		"表示されない": ["display_blank"],
		"空白": ["display_blank"],
		"変換できない": ["transformation_error"],
		"エラー": ["transformation_error"]
	}
}
```

### 2.4 症状マッチングロジック

```typescript
import { loadTroubleshooting } from '../data/loader.js';
import type { TroubleshootInput, TroubleshootOutput } from '../types/index.js';

export async function troubleshoot(input: TroubleshootInput): Promise<TroubleshootOutput> {
	const { symptom, context } = input;
	const data = await loadTroubleshooting();

	// 症状からマッチするカテゴリを特定
	const matchedCategories = matchSymptom(symptom, data);

	if (matchedCategories.length === 0) {
		return {
			symptom,
			possibleCauses: [{
				likelihood: 'medium',
				cause: '原因不明',
				description: '入力された症状に一致する既知のパターンが見つかりませんでした。',
				indicators: []
			}],
			diagnosticSteps: [{
				step: 1,
				action: 'より具体的な症状を記述してください',
				expected: '「座標が○mずれる」「○○が表示されない」など',
				ifFailed: '専門家に相談'
			}],
			solutions: [],
			relatedBestPractices: ['gis_integration']
		};
	}

	// コンテキスト情報でフィルタリング・優先順位付け
	const rankedCategories = rankByContext(matchedCategories, context, data);

	// 最も可能性の高いカテゴリの情報を返す
	const primaryCategory = data.symptoms[rankedCategories[0]];

	// コンテキストに応じて原因の可能性を調整
	const adjustedCauses = adjustCauseLikelihood(primaryCategory.possibleCauses, context);

	return {
		symptom,
		possibleCauses: adjustedCauses,
		diagnosticSteps: primaryCategory.diagnosticSteps,
		solutions: primaryCategory.solutions,
		relatedBestPractices: primaryCategory.relatedBestPractices,
	};
}

function matchSymptom(symptom: string, data: TroubleshootingData): string[] {
	const matched: Set<string> = new Set();

	// キーワードマッチング
	for (const [keyword, categories] of Object.entries(data.keywordMapping)) {
		if (symptom.includes(keyword)) {
			categories.forEach(c => matched.add(c));
		}
	}

	// 各カテゴリのキーワードでもマッチング
	for (const [category, info] of Object.entries(data.symptoms)) {
		for (const keyword of info.keywords) {
			if (symptom.includes(keyword)) {
				matched.add(category);
			}
		}
	}

	return Array.from(matched);
}

function rankByContext(
	categories: string[],
	context: TroubleshootInput['context'],
	data: TroubleshootingData
): string[] {
	if (!context) return categories;

	// ずれの大きさが分かる場合
	if (context.magnitude) {
		if (context.magnitude.includes('百') || context.magnitude.includes('キロ')) {
			return ['coordinate_shift_large', ...categories.filter(c => c !== 'coordinate_shift_large')];
		}
		if (context.magnitude.includes('数m') || context.magnitude.includes('メートル')) {
			return ['coordinate_shift_medium', ...categories.filter(c => c !== 'coordinate_shift_medium')];
		}
		if (context.magnitude.includes('cm') || context.magnitude.includes('センチ')) {
			return ['coordinate_shift_small', ...categories.filter(c => c !== 'coordinate_shift_small')];
		}
	}

	return categories;
}

function adjustCauseLikelihood(
	causes: Cause[],
	context?: TroubleshootInput['context']
): Cause[] {
	if (!context) return causes;

	return causes.map(cause => {
		let likelihood = cause.likelihood;

		// コンテキストに応じて可能性を調整
		if (context.sourceCrs?.includes('4301') || context.targetCrs?.includes('4301')) {
			if (cause.cause.includes('Tokyo Datum')) {
				likelihood = 'high';
			}
		}

		return { ...cause, likelihood };
	});
}
```

## 3. 実装タスク

### 3.1 ファイル構成

```
src/
├── types/
│   └── index.ts              # 新しい型定義追加
├── schemas/
│   └── index.ts              # 新しいZodスキーマ追加
├── data/
│   ├── loader.ts             # loadBestPractices, loadTroubleshooting 追加
│   └── static/
│       ├── best-practices.json    # 新規：ベストプラクティスデータ
│       └── troubleshooting.json   # 新規：トラブルシューティングデータ
├── services/
│   ├── ...existing...
│   ├── best-practices-service.ts  # 新規
│   └── troubleshooting-service.ts # 新規
├── tools/
│   ├── definitions.ts        # ツール定義追加
│   └── handlers.ts           # ハンドラー追加
tests/
├── services/
│   ├── best-practices-service.test.ts  # 新規
│   └── troubleshooting-service.test.ts # 新規
└── tools/
    └── handlers.test.ts      # 追加テスト
```

### 3.2 タスクリスト

#### Step 1: 型定義とスキーマ

- [ ] `GetBestPracticesInput/Output` 型定義
- [ ] `BestPracticeTopic`, `Practice`, `CommonMistake`, `Reference` 型定義
- [ ] `TroubleshootInput/Output` 型定義
- [ ] `Cause`, `DiagnosticStep`, `Solution` 型定義
- [ ] Zodスキーマ作成

#### Step 2: データ作成

- [ ] `src/data/static/best-practices.json` 作成
  - 10トピックのベストプラクティス
  - よくある間違い
  - 参照リンク
- [ ] `src/data/static/troubleshooting.json` 作成
  - 6つの症状カテゴリ
  - キーワードマッピング
  - 診断ステップと解決策
- [ ] `src/data/loader.ts` に読み込み関数追加

#### Step 3: best-practices-service.ts

- [ ] `getBestPractices()` 関数
- [ ] トピック検索ロジック

#### Step 4: troubleshooting-service.ts

- [ ] `troubleshoot()` 関数
- [ ] `matchSymptom()` 関数
- [ ] `rankByContext()` 関数
- [ ] `adjustCauseLikelihood()` 関数

#### Step 5: ツール統合

- [ ] `definitions.ts` にツール定義追加
- [ ] `handlers.ts` にハンドラー追加
- [ ] `toolHandlers` マップに登録

#### Step 6: テスト

- [ ] `best-practices-service.test.ts`
- [ ] `troubleshooting-service.test.ts`
- [ ] `handlers.test.ts` に追加テスト

## 4. テストケース

### 4.1 get_best_practices

| シナリオ | 入力 | 期待結果 |
| -------- | ---- | -------- |
| 日本測量 | topic: "japan_survey" | JGD2011推奨、平面直角座標系選択など |
| Web地図 | topic: "web_mapping" | Web Mercator/WGS84使い分け、GeoJSON仕様 |
| データ交換 | topic: "data_exchange" | CRS明記、メタデータ重要性 |
| 過去データ | topic: "historical_data" | Tokyo Datum変換、精度限界 |
| GPS利用 | topic: "mobile_gps" | WGS84認識、精度限界 |
| 存在しないトピック | topic: "unknown" | NotFoundError |

### 4.2 troubleshoot

| シナリオ | 入力 | 期待結果 |
| -------- | ---- | -------- |
| 大きなずれ | symptom: "座標が400mずれる" | Tokyo Datum混在を最優先で提示 |
| 中程度のずれ | symptom: "1-2mのずれ" | Tokyo→JGD変換精度を提示 |
| 微小なずれ | symptom: "数cmのずれ" | WGS84/JGD2011差、丸め誤差を提示 |
| 面積異常 | symptom: "面積計算が合わない" | Web Mercator歪みを最優先 |
| 表示問題 | symptom: "データが表示されない" | CRS不一致を提示 |
| 変換エラー | symptom: "座標変換でエラー" | パラメータ不足を提示 |
| コンテキスト付き | symptom: "ずれる", context: {sourceCrs: "4301"} | Tokyo Datumの可能性を高く評価 |

## 5. 検証方法

### 5.1 ビルド・テスト

```bash
npm run build
npm test
```

### 5.2 MCP Inspector

```bash
npx @anthropic-ai/mcp-inspector build/index.js
```

### 5.3 Claude Codeでの統合テスト

- 「日本で測量するときのCRS選択のベストプラクティスを教えて」
- 「Web地図開発でのCRSの使い分けは？」
- 「座標が400mずれる原因は？」
- 「Tokyo DatumからJGD2011に変換したら1-2mずれるけど正常？」
- 「Web MercatorでPolygonの面積を計算したら値がおかしい」

## 6. 見積もり

| タスク | 工数 |
| ------ | ---- |
| 型定義・スキーマ | 0.5日 |
| データ作成（best-practices.json） | 1.5日 |
| データ作成（troubleshooting.json） | 1日 |
| best-practices-service | 0.5日 |
| troubleshooting-service | 1日 |
| ツール統合 | 0.5日 |
| テスト | 1日 |
| **合計** | **6日** |

## 7. 注意事項

### 7.1 ベストプラクティスの更新

- 測量規程や法令の改正に追従
- 新しいソフトウェア・ライブラリへの対応
- ユーザーフィードバックの反映

### 7.2 トラブルシューティングの拡張

- 新しい症状パターンの追加
- 解決策の有効性検証
- ツール固有の問題への対応

### 7.3 多言語対応の可能性

- 現状は日本語のみ
- 将来的に英語版も検討

---

## 8. 完了後の状態

Phase 4完了後、EPSG MCPは以下の7つのツールを提供：

| Phase | ツール | 説明 |
| ----- | ------ | ---- |
| 1 | `search_crs` | CRS検索 |
| 1 | `get_crs_detail` | CRS詳細取得 |
| 1 | `list_crs_by_region` | 地域別CRS一覧 |
| 2 | `recommend_crs` | CRS推奨 |
| 2 | `validate_crs_usage` | CRS使用検証 |
| 3 | `suggest_transformation` | 変換経路提案 |
| 3 | `compare_crs` | CRS比較 |
| **4** | **`get_best_practices`** | **ベストプラクティス** |
| **4** | **`troubleshoot`** | **トラブルシューティング** |

これにより、CRSに関する知識提供・判断支援の完全なツールセットが完成する。
