/**
 * LocationSpec 正規化ユーティリティのテスト
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { clearPacks, registerPack } from '../../src/packs/pack-manager.js';
import type { LocationSpec } from '../../src/types/index.js';
import {
	inferCountryFromSubdivision,
	isJapanesePrefecture,
	normalizeCity,
	normalizeCountry,
	normalizeLocation,
	normalizePrefecture,
} from '../../src/utils/location-normalizer.js';

describe('Location Normalizer', () => {
	// JP Pack をロードしてテスト
	beforeAll(async () => {
		const { createJpPack } = await import('../../src/packs/jp/index.js');
		registerPack(createJpPack());
	});

	afterAll(() => {
		clearPacks();
	});
	describe('normalizeCountry', () => {
		it('should normalize "Japan" to "JP"', () => {
			expect(normalizeCountry('Japan')).toBe('JP');
		});

		it('should normalize "japan" (lowercase) to "JP"', () => {
			expect(normalizeCountry('japan')).toBe('JP');
		});

		it('should normalize "JAPAN" (uppercase) to "JP"', () => {
			expect(normalizeCountry('JAPAN')).toBe('JP');
		});

		it('should normalize "日本" to "JP"', () => {
			expect(normalizeCountry('日本')).toBe('JP');
		});

		it('should normalize "Global" to "GLOBAL"', () => {
			expect(normalizeCountry('Global')).toBe('GLOBAL');
		});

		it('should normalize "global" to "GLOBAL"', () => {
			expect(normalizeCountry('global')).toBe('GLOBAL');
		});

		it('should normalize "USA" to "US"', () => {
			expect(normalizeCountry('USA')).toBe('US');
		});

		it('should normalize "usa" to "US"', () => {
			expect(normalizeCountry('usa')).toBe('US');
		});

		it('should normalize "united states" to "US"', () => {
			expect(normalizeCountry('united states')).toBe('US');
		});

		it('should normalize "UK" to "GB"', () => {
			expect(normalizeCountry('UK')).toBe('GB');
		});

		it('should normalize "uk" to "GB"', () => {
			expect(normalizeCountry('uk')).toBe('GB');
		});

		it('should normalize "United Kingdom" to "GB"', () => {
			expect(normalizeCountry('united kingdom')).toBe('GB');
		});

		it('should keep unknown country codes in uppercase', () => {
			expect(normalizeCountry('UnknownCountry')).toBe('UNKNOWNCOUNTRY');
		});

		it('should keep ISO codes unchanged', () => {
			expect(normalizeCountry('JP')).toBe('JP');
			expect(normalizeCountry('US')).toBe('US');
			expect(normalizeCountry('GB')).toBe('GB');
		});
	});

	describe('normalizePrefecture', () => {
		it('should convert English prefecture names to Japanese', () => {
			expect(normalizePrefecture('Hokkaido')).toBe('北海道');
			expect(normalizePrefecture('Tokyo')).toBe('東京都');
			expect(normalizePrefecture('Osaka')).toBe('大阪府');
			expect(normalizePrefecture('Okinawa')).toBe('沖縄県');
		});

		it('should handle lowercase English names', () => {
			expect(normalizePrefecture('hokkaido')).toBe('北海道');
			expect(normalizePrefecture('tokyo')).toBe('東京都');
		});

		it('should handle uppercase English names', () => {
			expect(normalizePrefecture('HOKKAIDO')).toBe('北海道');
			expect(normalizePrefecture('TOKYO')).toBe('東京都');
		});

		it('should keep Japanese prefecture names unchanged', () => {
			expect(normalizePrefecture('北海道')).toBe('北海道');
			expect(normalizePrefecture('東京都')).toBe('東京都');
			expect(normalizePrefecture('大阪府')).toBe('大阪府');
		});

		it('should return unknown names unchanged', () => {
			expect(normalizePrefecture('UnknownRegion')).toBe('UnknownRegion');
			expect(normalizePrefecture('California')).toBe('California');
		});

		it('should handle all 47 prefectures', () => {
			// サンプルとして各地方から1県ずつテスト
			expect(normalizePrefecture('Aomori')).toBe('青森県'); // 東北
			expect(normalizePrefecture('Chiba')).toBe('千葉県'); // 関東
			expect(normalizePrefecture('Nagano')).toBe('長野県'); // 中部
			expect(normalizePrefecture('Kyoto')).toBe('京都府'); // 近畿
			expect(normalizePrefecture('Hiroshima')).toBe('広島県'); // 中国
			expect(normalizePrefecture('Kagawa')).toBe('香川県'); // 四国
			expect(normalizePrefecture('Fukuoka')).toBe('福岡県'); // 九州
		});
	});

	describe('inferCountryFromSubdivision', () => {
		it('should infer JP from Japanese prefecture (Japanese name)', () => {
			expect(inferCountryFromSubdivision('東京都')).toBe('JP');
			expect(inferCountryFromSubdivision('北海道')).toBe('JP');
			expect(inferCountryFromSubdivision('沖縄県')).toBe('JP');
			expect(inferCountryFromSubdivision('大阪府')).toBe('JP');
		});

		it('should infer JP from Japanese prefecture (English name)', () => {
			expect(inferCountryFromSubdivision('Tokyo')).toBe('JP');
			expect(inferCountryFromSubdivision('Hokkaido')).toBe('JP');
			expect(inferCountryFromSubdivision('Okinawa')).toBe('JP');
			expect(inferCountryFromSubdivision('Osaka')).toBe('JP');
		});

		it('should infer US from US state', () => {
			expect(inferCountryFromSubdivision('California')).toBe('US');
			expect(inferCountryFromSubdivision('New York')).toBe('US');
			expect(inferCountryFromSubdivision('Texas')).toBe('US');
		});

		it('should infer GB from UK region', () => {
			expect(inferCountryFromSubdivision('England')).toBe('GB');
			expect(inferCountryFromSubdivision('Scotland')).toBe('GB');
			expect(inferCountryFromSubdivision('Wales')).toBe('GB');
		});

		it('should return undefined for unknown subdivision', () => {
			expect(inferCountryFromSubdivision('Unknown Region')).toBeUndefined();
		});
	});

	describe('isJapanesePrefecture', () => {
		it('should return true for valid prefectures (Japanese names)', () => {
			expect(isJapanesePrefecture('東京都')).toBe(true);
			expect(isJapanesePrefecture('北海道')).toBe(true);
			expect(isJapanesePrefecture('大阪府')).toBe(true);
			expect(isJapanesePrefecture('京都府')).toBe(true);
			expect(isJapanesePrefecture('福岡県')).toBe(true);
		});

		it('should return true for valid prefectures (English names)', () => {
			expect(isJapanesePrefecture('Tokyo')).toBe(true);
			expect(isJapanesePrefecture('Hokkaido')).toBe(true);
			expect(isJapanesePrefecture('Osaka')).toBe(true);
			expect(isJapanesePrefecture('Kyoto')).toBe(true);
			expect(isJapanesePrefecture('Fukuoka')).toBe(true);
		});

		it('should handle case-insensitive English names', () => {
			expect(isJapanesePrefecture('tokyo')).toBe(true);
			expect(isJapanesePrefecture('TOKYO')).toBe(true);
			expect(isJapanesePrefecture('ToKyO')).toBe(true);
		});

		it('should return false for non-Japanese locations', () => {
			expect(isJapanesePrefecture('California')).toBe(false);
			expect(isJapanesePrefecture('London')).toBe(false);
			expect(isJapanesePrefecture('Unknown')).toBe(false);
		});
	});

	describe('normalizeLocation', () => {
		it('should normalize country "Japan" to "JP"', () => {
			const result = normalizeLocation({ country: 'Japan' });
			expect(result.country).toBe('JP');
		});

		it('should normalize country "japan" to "JP"', () => {
			const result = normalizeLocation({ country: 'japan' });
			expect(result.country).toBe('JP');
		});

		it('should normalize country "USA" to "US"', () => {
			const result = normalizeLocation({ country: 'USA' });
			expect(result.country).toBe('US');
		});

		it('should migrate prefecture to subdivision', () => {
			const result = normalizeLocation({ prefecture: '東京都' });
			expect(result.subdivision).toBe('東京都');
			expect(result.prefecture).toBe('東京都'); // original is preserved
		});

		it('should not overwrite existing subdivision', () => {
			const result = normalizeLocation({
				prefecture: '東京都',
				subdivision: '神奈川県',
			});
			expect(result.subdivision).toBe('神奈川県');
		});

		it('should infer country from subdivision', () => {
			const result = normalizeLocation({ subdivision: '大阪府' });
			expect(result.country).toBe('JP');
		});

		it('should infer country from US state', () => {
			const result = normalizeLocation({ subdivision: 'California' });
			expect(result.country).toBe('US');
		});

		it('should infer country JP from prefecture', () => {
			const result = normalizeLocation({ prefecture: '北海道' });
			expect(result.country).toBe('JP');
		});

		it('should not overwrite existing country', () => {
			const result = normalizeLocation({
				country: 'US',
				subdivision: '東京都', // Japanese prefecture but country is US
			});
			expect(result.country).toBe('US');
		});

		it('should handle empty location', () => {
			const result = normalizeLocation({});
			expect(result).toEqual({});
		});

		it('should preserve other fields', () => {
			const input: LocationSpec = {
				country: 'Japan',
				prefecture: '東京都',
				city: '渋谷区',
				centerPoint: { lat: 35.68, lng: 139.69 },
			};
			const result = normalizeLocation(input);
			expect(result.country).toBe('JP');
			expect(result.prefecture).toBe('東京都');
			expect(result.subdivision).toBe('東京都');
			expect(result.city).toBe('渋谷区');
			expect(result.centerPoint).toEqual({ lat: 35.68, lng: 139.69 });
		});

		it('should handle mixed case input', () => {
			expect(normalizeLocation({ country: 'jApAn' }).country).toBe('JP');
			expect(normalizeLocation({ country: 'JAPAN' }).country).toBe('JP');
		});

		it('should handle Global country', () => {
			const result = normalizeLocation({ country: 'Global' });
			expect(result.country).toBe('GLOBAL');
		});
	});

	describe('English Prefecture Names', () => {
		it('should normalize English prefecture to Japanese', () => {
			const result = normalizeLocation({ prefecture: 'Tokyo' });
			expect(result.prefecture).toBe('東京都');
			expect(result.subdivision).toBe('東京都');
			expect(result.country).toBe('JP');
		});

		it('should normalize Hokkaido (English) correctly', () => {
			const result = normalizeLocation({ prefecture: 'Hokkaido' });
			expect(result.prefecture).toBe('北海道');
			expect(result.country).toBe('JP');
		});

		it('should normalize Okinawa (English) correctly', () => {
			const result = normalizeLocation({ prefecture: 'Okinawa' });
			expect(result.prefecture).toBe('沖縄県');
			expect(result.country).toBe('JP');
		});

		it('should handle lowercase English prefecture names', () => {
			const result = normalizeLocation({ prefecture: 'osaka' });
			expect(result.prefecture).toBe('大阪府');
			expect(result.country).toBe('JP');
		});

		it('should work with country: Japan and English prefecture', () => {
			const result = normalizeLocation({ country: 'Japan', prefecture: 'Kyoto' });
			expect(result.country).toBe('JP');
			expect(result.prefecture).toBe('京都府');
		});
	});

	describe('Backward Compatibility', () => {
		it('should keep existing API working with country: "Japan"', () => {
			const result = normalizeLocation({ country: 'Japan' });
			expect(result.country).toBe('JP');
		});

		it('should keep existing API working with Japanese prefecture', () => {
			const result = normalizeLocation({ prefecture: '東京都' });
			expect(result.country).toBe('JP');
			expect(result.subdivision).toBe('東京都');
		});

		it('should handle country: "Global"', () => {
			const result = normalizeLocation({ country: 'Global' });
			expect(result.country).toBe('GLOBAL');
		});
	});

	describe('normalizeCity', () => {
		it('should normalize Hokkaido cities (English to Japanese) with JP country', () => {
			expect(normalizeCity('Sapporo', 'JP')).toBe('札幌市');
			expect(normalizeCity('Asahikawa', 'JP')).toBe('旭川市');
			expect(normalizeCity('Hakodate', 'JP')).toBe('函館市');
			expect(normalizeCity('Kushiro', 'JP')).toBe('釧路市');
			expect(normalizeCity('Obihiro', 'JP')).toBe('帯広市');
		});

		it('should normalize Okinawa cities (English to Japanese) with JP country', () => {
			expect(normalizeCity('Naha', 'JP')).toBe('那覇市');
			expect(normalizeCity('Ginowan', 'JP')).toBe('宜野湾市');
			expect(normalizeCity('Ishigaki', 'JP')).toBe('石垣市');
			expect(normalizeCity('Miyakojima', 'JP')).toBe('宮古島市');
		});

		it('should normalize Okinawa City (with space)', () => {
			expect(normalizeCity('Okinawa City', 'JP')).toBe('沖縄市');
			expect(normalizeCity('okinawa city', 'JP')).toBe('沖縄市');
			expect(normalizeCity('OKINAWA CITY', 'JP')).toBe('沖縄市');
		});

		it('should handle case-insensitive city names', () => {
			expect(normalizeCity('sapporo', 'JP')).toBe('札幌市');
			expect(normalizeCity('SAPPORO', 'JP')).toBe('札幌市');
			expect(normalizeCity('SaPpOrO', 'JP')).toBe('札幌市');
		});

		it('should keep Japanese city names unchanged (not in mapping)', () => {
			// 日本語市名はマッピングにないので元のまま返る
			expect(normalizeCity('札幌市', 'JP')).toBe('札幌市');
			expect(normalizeCity('那覇市', 'JP')).toBe('那覇市');
		});

		it('should return unknown city names unchanged', () => {
			expect(normalizeCity('UnknownCity', 'JP')).toBe('UnknownCity');
			expect(normalizeCity('渋谷区', 'JP')).toBe('渋谷区');
		});

		it('should return city unchanged without country code', () => {
			// countryCode がない場合は Pack を参照できないため元のまま
			expect(normalizeCity('Sapporo')).toBe('Sapporo');
			expect(normalizeCity('Naha')).toBe('Naha');
		});

		it('should return city unchanged for unknown country', () => {
			// 未登録の国コードの場合は元のまま
			expect(normalizeCity('Sapporo', 'XX')).toBe('Sapporo');
		});
	});

	describe('normalizeLocation with city', () => {
		it('should normalize English city name in location', () => {
			const result = normalizeLocation({
				prefecture: 'Hokkaido',
				city: 'Sapporo',
			});
			expect(result.prefecture).toBe('北海道');
			expect(result.city).toBe('札幌市');
			expect(result.country).toBe('JP');
		});

		it('should normalize Okinawa city in location', () => {
			const result = normalizeLocation({
				prefecture: 'Okinawa',
				city: 'Naha',
			});
			expect(result.prefecture).toBe('沖縄県');
			expect(result.city).toBe('那覇市');
		});

		it('should keep non-matching city names unchanged', () => {
			const result = normalizeLocation({
				prefecture: 'Tokyo',
				city: 'Shibuya',
			});
			expect(result.prefecture).toBe('東京都');
			expect(result.city).toBe('Shibuya'); // Not in mapping, unchanged
		});
	});
});
