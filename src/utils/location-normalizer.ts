/**
 * LocationSpec 正規化ユーティリティ
 *
 * 後方互換性を維持しながら、LocationSpecを正規化する
 * - country の正規化（"Japan" → "JP"）
 * - prefecture → subdivision のマイグレーション
 * - subdivision から country の推定
 */

import { CITY_EN_TO_JP, COUNTRY_ALIASES, JAPAN_BOUNDS, PREFECTURE_EN_TO_JP } from '../constants/index.js';
import type { LocationSpec } from '../types/index.js';

/**
 * 英語都道府県名を日本語に正規化
 *
 * @param prefecture - 都道府県名（英語または日本語）
 * @returns 日本語都道府県名、または元の値
 */
export function normalizePrefecture(prefecture: string): string {
	// 既に日本語の場合はそのまま返す
	if (JAPANESE_PREFECTURES.has(prefecture)) {
		return prefecture;
	}

	// 英語名を小文字に変換してマッチング
	const lowerPref = prefecture.toLowerCase().trim();
	const japaneseMatch = PREFECTURE_EN_TO_JP[lowerPref];
	if (japaneseMatch) {
		return japaneseMatch;
	}

	// マッチしない場合は元の値を返す
	return prefecture;
}

/**
 * 英語市名を日本語に正規化
 * 北海道・沖縄の複数系にまたがる地域の市町村名を変換
 *
 * @param city - 市名（英語または日本語）
 * @returns 日本語市名、または元の値
 */
export function normalizeCity(city: string): string {
	// 英語名を小文字に変換してマッチング
	const lowerCity = city.toLowerCase().trim();
	const japaneseMatch = CITY_EN_TO_JP[lowerCity];
	if (japaneseMatch) {
		return japaneseMatch;
	}

	// マッチしない場合は元の値を返す
	return city;
}

/**
 * 日本の都道府県一覧（subdivisionから国を推定するため）
 */
export const JAPANESE_PREFECTURES = new Set([
	'北海道',
	'青森県',
	'岩手県',
	'宮城県',
	'秋田県',
	'山形県',
	'福島県',
	'茨城県',
	'栃木県',
	'群馬県',
	'埼玉県',
	'千葉県',
	'東京都',
	'神奈川県',
	'新潟県',
	'富山県',
	'石川県',
	'福井県',
	'山梨県',
	'長野県',
	'岐阜県',
	'静岡県',
	'愛知県',
	'三重県',
	'滋賀県',
	'京都府',
	'大阪府',
	'兵庫県',
	'奈良県',
	'和歌山県',
	'鳥取県',
	'島根県',
	'岡山県',
	'広島県',
	'山口県',
	'徳島県',
	'香川県',
	'愛媛県',
	'高知県',
	'福岡県',
	'佐賀県',
	'長崎県',
	'熊本県',
	'大分県',
	'宮崎県',
	'鹿児島県',
	'沖縄県',
]);

/**
 * 米国の州一覧（subdivisionから国を推定するため）
 */
export const US_STATES = new Set([
	'Alabama',
	'Alaska',
	'Arizona',
	'Arkansas',
	'California',
	'Colorado',
	'Connecticut',
	'Delaware',
	'Florida',
	'Georgia',
	'Hawaii',
	'Idaho',
	'Illinois',
	'Indiana',
	'Iowa',
	'Kansas',
	'Kentucky',
	'Louisiana',
	'Maine',
	'Maryland',
	'Massachusetts',
	'Michigan',
	'Minnesota',
	'Mississippi',
	'Missouri',
	'Montana',
	'Nebraska',
	'Nevada',
	'New Hampshire',
	'New Jersey',
	'New Mexico',
	'New York',
	'North Carolina',
	'North Dakota',
	'Ohio',
	'Oklahoma',
	'Oregon',
	'Pennsylvania',
	'Rhode Island',
	'South Carolina',
	'South Dakota',
	'Tennessee',
	'Texas',
	'Utah',
	'Vermont',
	'Virginia',
	'Washington',
	'West Virginia',
	'Wisconsin',
	'Wyoming',
	'District of Columbia',
]);

/**
 * 英国の地域一覧（subdivisionから国を推定するため）
 */
export const UK_REGIONS = new Set(['England', 'Scotland', 'Wales', 'Northern Ireland']);

/**
 * 国コードを正規化
 *
 * @param country - 国名またはコード
 * @returns ISO 3166-1 alpha-2 コード
 */
export function normalizeCountry(country: string): string {
	const lowerCountry = country.toLowerCase().trim();
	return COUNTRY_ALIASES[lowerCountry] || country.toUpperCase();
}

/**
 * subdivisionから国を推定
 *
 * @param subdivision - 行政区画名
 * @returns 推定された国コード、または undefined
 */
export function inferCountryFromSubdivision(subdivision: string): string | undefined {
	// 日本語の都道府県名
	if (JAPANESE_PREFECTURES.has(subdivision)) {
		return 'JP';
	}
	// 英語の都道府県名
	const lowerSubdivision = subdivision.toLowerCase().trim();
	if (PREFECTURE_EN_TO_JP[lowerSubdivision]) {
		return 'JP';
	}
	if (US_STATES.has(subdivision)) {
		return 'US';
	}
	if (UK_REGIONS.has(subdivision)) {
		return 'GB';
	}
	return undefined;
}

/**
 * 値が日本の都道府県かどうかを判定（英語名も対応）
 */
export function isJapanesePrefecture(value: string): boolean {
	if (JAPANESE_PREFECTURES.has(value)) {
		return true;
	}
	// 英語名もチェック
	const lowerValue = value.toLowerCase().trim();
	return !!PREFECTURE_EN_TO_JP[lowerValue];
}

/**
 * LocationSpec を正規化
 *
 * 後方互換性を維持しながら、以下の変換を行う：
 * - country の正規化（"Japan" → "JP"）
 * - prefecture の正規化（"Hokkaido" → "北海道"）
 * - city の正規化（"Sapporo" → "札幌市"）
 * - prefecture → subdivision のマイグレーション
 * - subdivision から country の推定
 *
 * @param location - 正規化前の LocationSpec
 * @returns 正規化後の LocationSpec
 */
export function normalizeLocation(location: LocationSpec): LocationSpec {
	const normalized = { ...location };

	// country の正規化
	if (normalized.country) {
		normalized.country = normalizeCountry(normalized.country);
	}

	// prefecture の正規化（英語→日本語変換）
	if (normalized.prefecture) {
		normalized.prefecture = normalizePrefecture(normalized.prefecture);
	}

	// city の正規化（英語→日本語変換）
	if (normalized.city) {
		normalized.city = normalizeCity(normalized.city);
	}

	// prefecture → subdivision のマイグレーション
	// Phase 5-1 では変換のみ行い、サービス層での利用は Phase 5-2 で行う
	if (normalized.prefecture && !normalized.subdivision) {
		normalized.subdivision = normalized.prefecture;
	}

	// subdivision から country を推定
	if (normalized.subdivision && !normalized.country) {
		const inferredCountry = inferCountryFromSubdivision(normalized.subdivision);
		if (inferredCountry) {
			normalized.country = inferredCountry;
		}
	}

	// prefecture が指定されていて country がない場合は JP と推定
	// （日本語の都道府県名が指定されている可能性が高い）
	if (normalized.prefecture && !normalized.country) {
		normalized.country = 'JP';
	}

	return normalized;
}

/**
 * 場所が日本かどうかを判定
 * 正規化済み・未正規化どちらのLocationSpecでも動作
 *
 * 判定基準（優先順）:
 * 1. country === 'JP' (正規化済み)
 * 2. country が 'japan' または '日本' (未正規化)
 * 3. prefecture または subdivision が日本の都道府県名
 * 4. centerPoint が日本の地理的境界内
 */
export function isJapanLocation(location: LocationSpec): boolean {
	// 正規化済みの国コード
	if (location.country === 'JP') {
		return true;
	}

	// 未正規化の国名（後方互換性）
	const countryLower = location.country?.toLowerCase();
	if (countryLower === 'japan' || location.country === '日本') {
		return true;
	}

	// 都道府県名から判定
	if (location.subdivision && isJapanesePrefecture(location.subdivision)) {
		return true;
	}
	if (location.prefecture && isJapanesePrefecture(location.prefecture)) {
		return true;
	}

	// 座標から判定（日本の地理的境界）
	if (location.centerPoint) {
		const { lat, lng } = location.centerPoint;
		const bounds = JAPAN_BOUNDS.OVERALL;
		if (lat >= bounds.SOUTH && lat <= bounds.NORTH && lng >= bounds.WEST && lng <= bounds.EAST) {
			return true;
		}
	}

	return false;
}

/**
 * @deprecated isJapanLocation を使用してください
 */
export const isJapanLocationNormalized = isJapanLocation;
