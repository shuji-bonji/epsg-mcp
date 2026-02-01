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
];
