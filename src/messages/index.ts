/**
 * メッセージカタログ
 * 将来の多言語対応を見据えた設計
 */

export const MESSAGES = {
	transformation: {
		SAME_CRS: '同一のCRSが指定されました。変換は不要です。',
		DEPRECATED_CRS: (code: string, note: string, migrateTo: string) =>
			`${code} は非推奨です。${note} 新規データには ${migrateTo} を使用してください。`,
		WIDE_AREA_WARNING: '広域のデータを変換する場合、位置によって精度が異なる場合があります。',
		COMPLEX_PATH_WARNING: '変換が複数ステップにわたるため、累積誤差に注意してください。',
		NO_PATH_FOUND: (source: string, target: string) =>
			`${source} から ${target} への変換経路が見つかりません`,
		NO_TRANSFORMATION_NEEDED: '変換不要',
	},

	recommendation: {
		DEFAULT_ZONE_FALLBACK:
			'都道府県が特定できないため、系IX（東京周辺）をデフォルトとして推奨しています。',
		WIDE_AREA_CALCULATION:
			'広域にわたる計算です。複数の平面直角座標系をまたぐ場合は、JGD2011地理座標系(EPSG:6668)での測地線計算を検討してください。',
	},

	comparison: {
		// 測地系比較
		DATUM_WGS84_JGD2011: '実用上同一（数cm以内）',
		DATUM_TOKYO_COMPARISON: '約400mの座標ずれ。変換が必要',
		DATUM_JGD2000_JGD2011: 'JGD2000→JGD2011は地殻変動補正が必要',
		DATUM_IDENTICAL: '同一測地系。変換不要',

		// 投影法比較
		PROJECTION_SAME_METHOD: '同一の投影法。パラメータが異なる可能性あり',
		PROJECTION_GEOGRAPHIC_VS_PROJECTED: '地理座標系と投影座標系の比較。用途に応じて使い分け',

		// 適用範囲
		AREA_GLOBAL_VS_LOCAL: '一方が全球適用、もう一方が地域限定。用途に注意',
		AREA_BOTH_JAPAN: '両方とも日本向け。適用地域が異なる可能性',

		// 歪み特性
		DISTORTION_WEB_MERCATOR: 'Web Mercatorは面積・距離計算に大きな歪み',

		// 互換性
		COMPATIBILITY_WEB_MERCATOR: 'Web MercatorはWeb地図ライブラリで標準',

		// サマリー
		SUMMARY_WGS84_JGD2011: 'WGS84とJGD2011は実用上同一（数cm以内）。日本国内データはJGD2011推奨。',
		SUMMARY_GEOGRAPHIC_WEB_MERCATOR:
			'地理座標系とWeb Mercatorの比較。Web地図表示は3857、データ保存は4326推奨。',
		SUMMARY_JGD2000_JGD2011: 'JGD2000からJGD2011への移行は2011年地震後の地殻変動補正のため必要。',
		SUMMARY_GEOGRAPHIC_VS_PROJECTED: '地理座標系と投影座標系の比較。用途に応じて使い分けが必要。',
		SUMMARY_GEOGRAPHIC_FOR_STORAGE:
			'広域データの保存には地理座標系、局所的な計算には投影座標系を使用してください。',
		SUMMARY_DEFAULT: '用途と対象地域に応じて適切なCRSを選択してください。',
	},

	troubleshooting: {
		SYMPTOM_NOT_FOUND:
			'入力された症状から特定の問題を特定できませんでした。より具体的な情報を提供してください。',
		PROVIDE_SHIFT_MAGNITUDE: '座標のずれがある場合：ずれの大きさ（cm、m、km）を記載',
		PROVIDE_ERROR_MESSAGE: '表示の問題がある場合：エラーメッセージや挙動を記載',
		PROVIDE_CRS_CODES: '変換エラーの場合：使用しているCRSコードを記載',
		EXPECTED_DETAILS: 'ずれの大きさ、エラーメッセージ、使用しているCRSなど',
		RETRY_WITH_DETAILS: 'より詳細な情報で再度お問い合わせください',
	},

	error: {
		NOT_FOUND: (type: string, id: string) => `${type} not found: ${id}`,
		VALIDATION_FAILED: (messages: string) => `Validation failed: ${messages}`,
	},

	accuracy: {
		UNKNOWN: '不明',
		NO_TRANSFORMATION: '変換不要',
		CUMULATIVE_ERROR_WARNING: '1-2m以上（累積誤差注意）',
		CM_TO_M_RANGE: '数cm〜数m',
	},
} as const;

export type MessageKey = keyof typeof MESSAGES;
