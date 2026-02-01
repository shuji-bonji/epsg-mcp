import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { clearCache, preloadAll } from '../../src/data/loader.js';
import {
	isMultiZonePrefecture,
	recommendCrs,
	selectZoneForLocation,
	selectZoneForMultiZonePrefecture,
} from '../../src/services/recommendation-service.js';

describe('Recommendation Service', () => {
	beforeAll(async () => {
		await preloadAll();
	});

	afterAll(() => {
		clearCache();
	});

	describe('isMultiZonePrefecture', () => {
		it('should return true for Hokkaido', () => {
			expect(isMultiZonePrefecture('北海道')).toBe(true);
		});

		it('should return true for Okinawa', () => {
			expect(isMultiZonePrefecture('沖縄県')).toBe(true);
		});

		it('should return false for Tokyo', () => {
			expect(isMultiZonePrefecture('東京都')).toBe(false);
		});
	});

	describe('selectZoneForMultiZonePrefecture', () => {
		it('should return zone XI for Sapporo', async () => {
			const result = await selectZoneForMultiZonePrefecture({
				prefecture: '北海道',
				city: '札幌市',
			});
			expect(result).toBe('EPSG:6679');
		});

		it('should return zone XII for Asahikawa', async () => {
			const result = await selectZoneForMultiZonePrefecture({
				prefecture: '北海道',
				city: '旭川市',
			});
			expect(result).toBe('EPSG:6680');
		});

		it('should return zone XIII for Kushiro', async () => {
			const result = await selectZoneForMultiZonePrefecture({
				prefecture: '北海道',
				city: '釧路市',
			});
			expect(result).toBe('EPSG:6681');
		});

		it('should return zone XV for Naha', async () => {
			const result = await selectZoneForMultiZonePrefecture({
				prefecture: '沖縄県',
				city: '那覇市',
			});
			expect(result).toBe('EPSG:6683');
		});

		it('should return zone XVI for Miyakojima', async () => {
			const result = await selectZoneForMultiZonePrefecture({
				prefecture: '沖縄県',
				city: '宮古島市',
			});
			expect(result).toBe('EPSG:6684');
		});

		it('should return default for Hokkaido without city', async () => {
			const result = await selectZoneForMultiZonePrefecture({
				prefecture: '北海道',
			});
			expect(result).toBe('EPSG:6679'); // default
		});

		it('should use subRegion for Hokkaido Tokachi', async () => {
			const result = await selectZoneForMultiZonePrefecture({
				prefecture: '北海道',
				region: '十勝',
			});
			expect(result).toBe('EPSG:6681');
		});
	});

	describe('selectZoneForLocation', () => {
		it('should return zone IX for Tokyo', async () => {
			const result = await selectZoneForLocation({
				prefecture: '東京都',
			});
			expect(result).toBe('EPSG:6677');
		});

		it('should return zone II for Fukuoka', async () => {
			const result = await selectZoneForLocation({
				prefecture: '福岡県',
			});
			expect(result).toBe('EPSG:6670');
		});

		it('should handle multi-zone prefecture', async () => {
			const result = await selectZoneForLocation({
				prefecture: '北海道',
				city: '帯広市',
			});
			expect(result).toBe('EPSG:6681');
		});

		it('should determine zone from coordinates', async () => {
			const result = await selectZoneForLocation({
				centerPoint: { lat: 35.68, lng: 139.69 }, // Tokyo area
			});
			expect(result).toBe('EPSG:6677');
		});
	});

	describe('recommendCrs', () => {
		describe('web_mapping', () => {
			it('should recommend Web Mercator for Tokyo web mapping', async () => {
				const result = await recommendCrs('web_mapping', {
					prefecture: '東京都',
				});
				expect(result.primary.code).toBe('EPSG:3857');
				expect(result.reasoning).toContain('Web Mercator');
			});

			it('should recommend Web Mercator for global web mapping', async () => {
				const result = await recommendCrs('web_mapping', {
					country: 'Global',
				});
				expect(result.primary.code).toBe('EPSG:3857');
			});
		});

		describe('survey', () => {
			it('should recommend zone IX for Tokyo survey', async () => {
				const result = await recommendCrs('survey', {
					prefecture: '東京都',
				});
				expect(result.primary.code).toBe('EPSG:6677');
				expect(result.reasoning).toContain('平面直角座標系');
			});

			it('should recommend zone XI for Sapporo survey', async () => {
				const result = await recommendCrs('survey', {
					prefecture: '北海道',
					city: '札幌市',
				});
				expect(result.primary.code).toBe('EPSG:6679');
			});

			it('should recommend zone XIII for Kushiro survey', async () => {
				const result = await recommendCrs('survey', {
					prefecture: '北海道',
					city: '釧路市',
				});
				expect(result.primary.code).toBe('EPSG:6681');
			});

			it('should recommend zone XV for Okinawa main island survey', async () => {
				const result = await recommendCrs('survey', {
					prefecture: '沖縄県',
					region: '本島',
				});
				expect(result.primary.code).toBe('EPSG:6683');
			});

			it('should recommend zone XVI for Miyakojima survey', async () => {
				const result = await recommendCrs('survey', {
					prefecture: '沖縄県',
					city: '宮古島市',
				});
				expect(result.primary.code).toBe('EPSG:6684');
			});

			it('should add warning for Hokkaido without city', async () => {
				const result = await recommendCrs('survey', {
					prefecture: '北海道',
				});
				expect(result.warnings).toBeDefined();
				expect(result.warnings?.some((w) => w.includes('3系'))).toBe(true);
			});
		});

		describe('distance_calculation', () => {
			it('should recommend plane rectangular for distance in Tokyo', async () => {
				const result = await recommendCrs('distance_calculation', {
					prefecture: '東京都',
				});
				expect(result.primary.code).toBe('EPSG:6677');
			});

			it('should add warning for wide area calculation', async () => {
				const result = await recommendCrs('distance_calculation', {
					country: 'Japan',
					boundingBox: {
						north: 40,
						south: 35,
						east: 142,
						west: 135,
					},
				});
				expect(result.warnings).toBeDefined();
				expect(result.warnings?.some((w) => w.includes('広域'))).toBe(true);
			});
		});

		describe('area_calculation', () => {
			it('should recommend plane rectangular for area in Hokkaido', async () => {
				const result = await recommendCrs('area_calculation', {
					prefecture: '北海道',
					city: '札幌市',
				});
				expect(result.primary.code).toBe('EPSG:6679');
			});
		});

		describe('data_storage', () => {
			it('should recommend WGS84 for global storage', async () => {
				const result = await recommendCrs('data_storage', {
					country: 'Global',
				});
				expect(result.primary.code).toBe('EPSG:4326');
			});

			it('should recommend JGD2011 for Japan storage', async () => {
				const result = await recommendCrs('data_storage', {
					country: 'Japan',
				});
				expect(result.primary.code).toBe('EPSG:6668');
			});
		});

		describe('data_exchange', () => {
			it('should recommend JGD2011 for Japan data exchange', async () => {
				const result = await recommendCrs('data_exchange', {
					country: 'Japan',
				});
				expect(result.primary.code).toBe('EPSG:6668');
			});

			it('should include WGS84 as alternative', async () => {
				const result = await recommendCrs('data_exchange', {
					country: 'Japan',
				});
				expect(result.alternatives.some((a) => a.code === 'EPSG:4326')).toBe(true);
			});
		});

		describe('navigation', () => {
			it('should recommend JGD2011 for Japan navigation', async () => {
				const result = await recommendCrs('navigation', {
					country: 'Japan',
				});
				expect(result.primary.code).toBe('EPSG:6668');
			});

			it('should recommend WGS84 for global navigation', async () => {
				const result = await recommendCrs('navigation', {
					country: 'Global',
				});
				expect(result.primary.code).toBe('EPSG:4326');
			});
		});

		describe('visualization', () => {
			it('should recommend Web Mercator for visualization', async () => {
				const result = await recommendCrs('visualization', {
					country: 'Japan',
				});
				expect(result.primary.code).toBe('EPSG:3857');
			});
		});
	});
});
