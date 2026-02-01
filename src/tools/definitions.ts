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
];
