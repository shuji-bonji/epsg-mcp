/**
 * LocationSpec 正規化ユーティリティのテスト
 */

import { describe, expect, it } from 'vitest';
import type { LocationSpec } from '../../src/types/index.js';
import {
	inferCountryFromSubdivision,
	isJapanesePrefecture,
	normalizeCountry,
	normalizeLocation,
} from '../../src/utils/location-normalizer.js';

describe('Location Normalizer', () => {
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

	describe('inferCountryFromSubdivision', () => {
		it('should infer JP from Japanese prefecture', () => {
			expect(inferCountryFromSubdivision('東京都')).toBe('JP');
			expect(inferCountryFromSubdivision('北海道')).toBe('JP');
			expect(inferCountryFromSubdivision('沖縄県')).toBe('JP');
			expect(inferCountryFromSubdivision('大阪府')).toBe('JP');
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
		it('should return true for valid prefectures', () => {
			expect(isJapanesePrefecture('東京都')).toBe(true);
			expect(isJapanesePrefecture('北海道')).toBe(true);
			expect(isJapanesePrefecture('大阪府')).toBe(true);
			expect(isJapanesePrefecture('京都府')).toBe(true);
			expect(isJapanesePrefecture('福岡県')).toBe(true);
		});

		it('should return false for non-Japanese prefectures', () => {
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

	describe('Backward Compatibility', () => {
		it('should keep existing API working with country: "Japan"', () => {
			const result = normalizeLocation({ country: 'Japan' });
			expect(result.country).toBe('JP');
		});

		it('should keep existing API working with prefecture', () => {
			const result = normalizeLocation({ prefecture: '東京都' });
			expect(result.country).toBe('JP');
			expect(result.subdivision).toBe('東京都');
		});

		it('should handle country: "Global"', () => {
			const result = normalizeLocation({ country: 'Global' });
			expect(result.country).toBe('GLOBAL');
		});
	});
});
