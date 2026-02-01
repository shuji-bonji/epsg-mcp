/**
 * MCP ツール定義
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';

export const tools: Tool[] = [
	{
		name: 'search_crs',
		description:
			'EPSG座標参照系（CRS）をキーワードで検索します。EPSGコード、名前、地域名、都道府県名などで検索可能。日本のJGD2011系CRSや、グローバルなWGS84、Web Mercatorなどを検索できます。',
		inputSchema: {
			type: 'object',
			properties: {
				query: {
					type: 'string',
					description: '検索キーワード（例: "JGD2011", "4326", "Tokyo", "東京", "平面直角"）',
				},
				type: {
					type: 'string',
					enum: ['geographic', 'projected', 'compound', 'vertical', 'engineering'],
					description: 'CRSタイプでフィルタ（geographic: 地理座標系、projected: 投影座標系）',
				},
				region: {
					type: 'string',
					description: '地域でフィルタ（"Japan" または "Global"）',
				},
				limit: {
					type: 'number',
					description: '結果数上限（デフォルト: 10、最大: 100）',
					default: 10,
				},
			},
			required: ['query'],
		},
	},
	{
		name: 'get_crs_detail',
		description:
			'指定されたEPSGコードのCRS詳細情報を取得します。測地系（datum）、投影法、適用範囲、精度特性、使用目的などの詳細情報が含まれます。',
		inputSchema: {
			type: 'object',
			properties: {
				code: {
					type: 'string',
					description: 'EPSGコード（例: "EPSG:6677" または "6677"）',
				},
			},
			required: ['code'],
		},
	},
	{
		name: 'list_crs_by_region',
		description:
			'指定された地域で利用可能なCRS一覧と、用途別の推奨CRSを取得します。日本では平面直角座標系（I-XIX系）、グローバルではWGS84やUTMなどが含まれます。',
		inputSchema: {
			type: 'object',
			properties: {
				region: {
					type: 'string',
					description: '地域名（"Japan" または "Global"）',
				},
				type: {
					type: 'string',
					enum: ['geographic', 'projected', 'compound', 'vertical', 'engineering'],
					description: 'CRSタイプでフィルタ',
				},
				includeDeprecated: {
					type: 'boolean',
					description: '非推奨のCRSも含めるか（デフォルト: false）',
					default: false,
				},
			},
			required: ['region'],
		},
	},
	{
		name: 'recommend_crs',
		description:
			'用途と場所に応じた最適なCRSを推奨します。Web地図表示、距離計算、面積計算、測量など用途別に、日本の平面直角座標系やグローバルなUTMなど最適な座標系を提案します。北海道や沖縄など複数の系にまたがる地域にも対応。',
		inputSchema: {
			type: 'object',
			properties: {
				purpose: {
					type: 'string',
					enum: [
						'web_mapping',
						'distance_calculation',
						'area_calculation',
						'survey',
						'navigation',
						'data_exchange',
						'data_storage',
						'visualization',
					],
					description:
						'使用目的（web_mapping: Web地図表示、distance_calculation: 距離計算、area_calculation: 面積計算、survey: 測量、navigation: ナビゲーション、data_exchange: データ交換、data_storage: データ保存、visualization: 可視化）',
				},
				location: {
					type: 'object',
					description: '対象地域の指定',
					properties: {
						country: {
							type: 'string',
							description: '国名（"Japan" または "Global"）',
						},
						region: {
							type: 'string',
							description: '地域名（"Kanto", "Hokkaido", "本島", "先島" など）',
						},
						prefecture: {
							type: 'string',
							description: '都道府県名（"東京都", "北海道", "沖縄県" など）',
						},
						city: {
							type: 'string',
							description:
								'市区町村名（"札幌市", "那覇市" など、複数の系にまたがる地域での判定用）',
						},
						boundingBox: {
							type: 'object',
							description: '対象領域の境界ボックス',
							properties: {
								north: { type: 'number', description: '北端緯度' },
								south: { type: 'number', description: '南端緯度' },
								east: { type: 'number', description: '東端経度' },
								west: { type: 'number', description: '西端経度' },
							},
						},
						centerPoint: {
							type: 'object',
							description: '中心座標',
							properties: {
								lat: { type: 'number', description: '緯度' },
								lng: { type: 'number', description: '経度' },
							},
						},
					},
				},
				requirements: {
					type: 'object',
					description: '追加要件',
					properties: {
						accuracy: {
							type: 'string',
							enum: ['high', 'medium', 'low'],
							description: '精度要件',
						},
						distortionTolerance: {
							type: 'string',
							enum: ['minimal', 'moderate', 'flexible'],
							description: '歪み許容度',
						},
						interoperability: {
							type: 'array',
							items: { type: 'string' },
							description: '相互運用性要件（"GIS", "CAD", "Web" など）',
						},
					},
				},
			},
			required: ['purpose', 'location'],
		},
	},
	{
		name: 'validate_crs_usage',
		description:
			'指定されたCRSが特定の用途・場所で適切かどうかを検証します。非推奨CRSの使用、面積・距離計算時の歪み、測量での不適切な系の選択などを検出し、改善提案を行います。',
		inputSchema: {
			type: 'object',
			properties: {
				crs: {
					type: 'string',
					description: '検証対象のEPSGコード（例: "EPSG:3857" または "3857"）',
				},
				purpose: {
					type: 'string',
					enum: [
						'web_mapping',
						'distance_calculation',
						'area_calculation',
						'survey',
						'navigation',
						'data_exchange',
						'data_storage',
						'visualization',
					],
					description: '使用目的',
				},
				location: {
					type: 'object',
					description: '対象地域の指定',
					properties: {
						country: {
							type: 'string',
							description: '国名（"Japan" または "Global"）',
						},
						region: {
							type: 'string',
							description: '地域名',
						},
						prefecture: {
							type: 'string',
							description: '都道府県名',
						},
						city: {
							type: 'string',
							description: '市区町村名',
						},
						boundingBox: {
							type: 'object',
							description: '対象領域の境界ボックス',
							properties: {
								north: { type: 'number' },
								south: { type: 'number' },
								east: { type: 'number' },
								west: { type: 'number' },
							},
						},
						centerPoint: {
							type: 'object',
							description: '中心座標',
							properties: {
								lat: { type: 'number' },
								lng: { type: 'number' },
							},
						},
					},
				},
			},
			required: ['crs', 'purpose', 'location'],
		},
	},
	{
		name: 'suggest_transformation',
		description:
			'2つのCRS間の変換経路を提案します。Tokyo Datum→JGD2011、WGS84→平面直角座標系など、最適な変換経路と精度情報を提供します。複数ステップの変換経路も探索し、累積誤差の警告も行います。',
		inputSchema: {
			type: 'object',
			properties: {
				sourceCrs: {
					type: 'string',
					description: '変換元のEPSGコード（例: "EPSG:4301" または "4301"）',
				},
				targetCrs: {
					type: 'string',
					description: '変換先のEPSGコード（例: "EPSG:6668" または "6668"）',
				},
				location: {
					type: 'object',
					description: '変換対象の位置（精度向上のため、任意）',
					properties: {
						country: {
							type: 'string',
							description: '国名（"Japan" または "Global"）',
						},
						prefecture: {
							type: 'string',
							description: '都道府県名',
						},
						boundingBox: {
							type: 'object',
							description: '対象領域の境界ボックス',
							properties: {
								north: { type: 'number' },
								south: { type: 'number' },
								east: { type: 'number' },
								west: { type: 'number' },
							},
						},
						centerPoint: {
							type: 'object',
							description: '中心座標',
							properties: {
								lat: { type: 'number' },
								lng: { type: 'number' },
							},
						},
					},
				},
			},
			required: ['sourceCrs', 'targetCrs'],
		},
	},
	{
		name: 'compare_crs',
		description:
			'2つのCRSを様々な観点から比較します。測地系、投影法、適用範囲、精度、歪み特性、互換性、用途適性などを比較し、どちらがどの用途に適しているかを説明します。',
		inputSchema: {
			type: 'object',
			properties: {
				crs1: {
					type: 'string',
					description: '比較対象のEPSGコード1（例: "EPSG:4326" または "4326"）',
				},
				crs2: {
					type: 'string',
					description: '比較対象のEPSGコード2（例: "EPSG:6668" または "6668"）',
				},
				aspects: {
					type: 'array',
					items: {
						type: 'string',
						enum: [
							'accuracy',
							'area_of_use',
							'distortion',
							'compatibility',
							'use_cases',
							'datum',
							'projection',
						],
					},
					description:
						'比較する観点（省略時は全て）。accuracy: 精度、area_of_use: 適用範囲、distortion: 歪み特性、compatibility: 互換性、use_cases: 用途、datum: 測地系、projection: 投影法',
				},
			},
			required: ['crs1', 'crs2'],
		},
	},
	{
		name: 'get_best_practices',
		description:
			'CRS利用のベストプラクティスを取得します。日本の測量、Web地図作成、データ交換、座標の保存、モバイルGPS、越境データ、歴史的データ、GIS統合、精度要件、投影法選択などのトピックについて、推奨プラクティス、よくある間違い、参考情報を提供します。',
		inputSchema: {
			type: 'object',
			properties: {
				topic: {
					type: 'string',
					enum: [
						'japan_survey',
						'web_mapping',
						'data_exchange',
						'coordinate_storage',
						'mobile_gps',
						'cross_border',
						'historical_data',
						'gis_integration',
						'precision_requirements',
						'projection_selection',
					],
					description:
						'ベストプラクティスのトピック。japan_survey: 日本での測量、web_mapping: Web地図作成、data_exchange: データ交換、coordinate_storage: 座標の保存、mobile_gps: モバイルGPS、cross_border: 越境データ、historical_data: 歴史的データ、gis_integration: GIS統合、precision_requirements: 精度要件、projection_selection: 投影法選択',
				},
				context: {
					type: 'string',
					description: '追加のコンテキスト情報（任意、最大500文字）',
					maxLength: 500,
				},
			},
			required: ['topic'],
		},
	},
	{
		name: 'troubleshoot',
		description:
			'CRS関連の問題をトラブルシューティングします。座標のずれ（cm、m、km単位）、面積・距離計算の誤り、データが表示されない問題、変換エラーなどの症状から、原因の特定、診断手順、解決策を提供します。',
		inputSchema: {
			type: 'object',
			properties: {
				symptom: {
					type: 'string',
					description:
						'問題の症状を記述（例: "座標が400mずれる"、"面積計算の結果がおかしい"、"データが表示されない"）。2文字以上500文字以内で記述してください。',
					minLength: 2,
					maxLength: 500,
				},
				context: {
					type: 'object',
					description: '問題の文脈情報（任意）',
					properties: {
						sourceCrs: {
							type: 'string',
							description: '変換元CRS（例: "EPSG:4301"）',
						},
						targetCrs: {
							type: 'string',
							description: '変換先CRS（例: "EPSG:6668"）',
						},
						location: {
							type: 'string',
							description: '対象地域（例: "東北地方"、"東京都"）',
						},
						tool: {
							type: 'string',
							description: '使用しているツール（例: "QGIS"、"PostGIS"）',
						},
						magnitude: {
							type: 'string',
							description: 'ずれの大きさ（例: "400m"、"数cm"、"1-2m"）',
						},
					},
				},
			},
			required: ['symptom'],
		},
	},
];
