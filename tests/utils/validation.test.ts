import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { clearCache, preloadAll } from '../../src/data/loader.js';
import { NotFoundError } from '../../src/errors/index.js';
import {
	checkZoneSpan,
	isDeprecatedCrs,
	isLegacyDatum,
	isLocationWithinArea,
	isPlaneRectangularCS,
	validateCrsUsage,
} from '../../src/utils/validation.js';

describe('Validation Utilities', () => {
	beforeAll(async () => {
		await preloadAll();
	});

	afterAll(() => {
		clearCache();
	});

	describe('isPlaneRectangularCS', () => {
		it('should return true for EPSG:6677', () => {
			expect(isPlaneRectangularCS('EPSG:6677')).toBe(true);
		});

		it('should return true for 6669', () => {
			expect(isPlaneRectangularCS('6669')).toBe(true);
		});

		it('should return true for EPSG:6687', () => {
			expect(isPlaneRectangularCS('EPSG:6687')).toBe(true);
		});

		it('should return false for EPSG:4326', () => {
			expect(isPlaneRectangularCS('EPSG:4326')).toBe(false);
		});

		it('should return false for EPSG:3857', () => {
			expect(isPlaneRectangularCS('EPSG:3857')).toBe(false);
		});
	});

	describe('isDeprecatedCrs', () => {
		it('should return true for JGD2000 (EPSG:4612)', async () => {
			expect(await isDeprecatedCrs('EPSG:4612')).toBe(true);
		});

		it('should return true for Tokyo (EPSG:4301)', async () => {
			expect(await isDeprecatedCrs('EPSG:4301')).toBe(true);
		});

		it('should return false for JGD2011 (EPSG:6668)', async () => {
			expect(await isDeprecatedCrs('EPSG:6668')).toBe(false);
		});
	});

	describe('isLegacyDatum', () => {
		it('should return true for Tokyo datum (EPSG:4301)', async () => {
			expect(await isLegacyDatum('EPSG:4301')).toBe(true);
		});

		it('should return false for JGD2011', async () => {
			expect(await isLegacyDatum('EPSG:6668')).toBe(false);
		});
	});

	describe('isLocationWithinArea', () => {
		it('should return true when centerPoint is within bounding box', () => {
			const result = isLocationWithinArea(
				{ centerPoint: { lat: 35.68, lng: 139.69 } },
				{
					description: 'Japan',
					boundingBox: { north: 46, south: 20, east: 155, west: 122 },
				}
			);
			expect(result).toBe(true);
		});

		it('should return false when centerPoint is outside bounding box', () => {
			const result = isLocationWithinArea(
				{ centerPoint: { lat: 51.5, lng: 0 } }, // London
				{
					description: 'Japan',
					boundingBox: { north: 46, south: 20, east: 155, west: 122 },
				}
			);
			expect(result).toBe(false);
		});

		it('should return true when no bounding box is defined', () => {
			const result = isLocationWithinArea(
				{ centerPoint: { lat: 35.68, lng: 139.69 } },
				{ description: 'World' }
			);
			expect(result).toBe(true);
		});
	});

	describe('checkZoneSpan', () => {
		it('should return true for wide area', () => {
			expect(checkZoneSpan({ north: 40, south: 35, east: 145, west: 135 })).toBe(true);
		});

		it('should return false for narrow area', () => {
			expect(checkZoneSpan({ north: 36, south: 35, east: 140, west: 139 })).toBe(false);
		});
	});

	describe('validateCrsUsage', () => {
		describe('area_calculation', () => {
			it('should error about Web Mercator area distortion', async () => {
				const result = await validateCrsUsage('EPSG:3857', 'area_calculation', {
					country: 'Japan',
				});
				expect(result.issues.some((i) => i.code === 'AREA_DISTORTION')).toBe(true);
				expect(result.issues.find((i) => i.code === 'AREA_DISTORTION')?.severity).toBe('error');
				expect(result.isValid).toBe(false);
				expect(result.score).toBeLessThanOrEqual(30);
			});

			it('should info about geographic CRS area calculation', async () => {
				const result = await validateCrsUsage('EPSG:4326', 'area_calculation', {
					country: 'Global',
				});
				expect(result.issues.some((i) => i.code === 'GEOGRAPHIC_AREA')).toBe(true);
				expect(result.issues.find((i) => i.code === 'GEOGRAPHIC_AREA')?.severity).toBe('info');
			});
		});

		describe('distance_calculation', () => {
			it('should warn about Web Mercator distance distortion', async () => {
				const result = await validateCrsUsage('EPSG:3857', 'distance_calculation', {
					country: 'Japan',
				});
				expect(result.issues.some((i) => i.code === 'DISTANCE_DISTORTION')).toBe(true);
			});

			it('should info about geographic CRS distance calculation', async () => {
				const result = await validateCrsUsage('EPSG:4326', 'distance_calculation', {
					country: 'Global',
				});
				expect(result.issues.some((i) => i.code === 'GEOGRAPHIC_DISTANCE')).toBe(true);
			});

			it('should warn about cross-zone calculation', async () => {
				const result = await validateCrsUsage('EPSG:6677', 'distance_calculation', {
					country: 'Japan',
					boundingBox: { north: 40, south: 35, east: 145, west: 135 },
				});
				expect(result.issues.some((i) => i.code === 'CROSS_ZONE_CALCULATION')).toBe(true);
			});
		});

		describe('survey', () => {
			it('should warn about non-official survey CRS for Japan', async () => {
				const result = await validateCrsUsage('EPSG:4326', 'survey', {
					prefecture: '東京都',
				});
				expect(result.issues.some((i) => i.code === 'NOT_OFFICIAL_SURVEY_CRS')).toBe(true);
			});

			it('should warn about zone mismatch', async () => {
				const result = await validateCrsUsage('EPSG:6669', 'survey', {
					prefecture: '東京都',
				});
				expect(result.issues.some((i) => i.code === 'ZONE_MISMATCH')).toBe(true);
			});

			it('should pass for correct zone', async () => {
				const result = await validateCrsUsage('EPSG:6677', 'survey', {
					prefecture: '東京都',
				});
				expect(result.isValid).toBe(true);
				expect(result.issues.filter((i) => i.severity === 'error')).toHaveLength(0);
			});

			it('should error for legacy datum', async () => {
				const result = await validateCrsUsage('EPSG:4301', 'survey', {
					prefecture: '東京都',
				});
				expect(result.issues.some((i) => i.code === 'LEGACY_DATUM')).toBe(true);
				expect(result.issues.find((i) => i.code === 'LEGACY_DATUM')?.severity).toBe('error');
			});
		});

		describe('deprecated CRS', () => {
			it('should error for deprecated CRS (JGD2000)', async () => {
				const result = await validateCrsUsage('EPSG:4612', 'data_storage', {
					country: 'Japan',
				});
				expect(result.issues.some((i) => i.code === 'DEPRECATED_CRS')).toBe(true);
				expect(result.isValid).toBe(false);
			});
		});

		describe('data_storage', () => {
			it('should info about projected CRS storage', async () => {
				const result = await validateCrsUsage('EPSG:6677', 'data_storage', {
					prefecture: '東京都',
				});
				expect(result.issues.some((i) => i.code === 'PROJECTED_STORAGE')).toBe(true);
			});
		});

		describe('data_exchange', () => {
			it('should pass for WGS84 GeoJSON', async () => {
				const result = await validateCrsUsage('EPSG:4326', 'data_exchange', {
					country: 'Global',
				});
				expect(result.isValid).toBe(true);
				expect(result.score).toBe(100);
			});

			it('should warn about GeoJSON incompatibility for projected CRS', async () => {
				const result = await validateCrsUsage('EPSG:6677', 'data_exchange', {
					prefecture: '東京都',
				});
				expect(result.issues.some((i) => i.code === 'GEOJSON_INCOMPATIBLE')).toBe(true);
			});
		});

		describe('navigation', () => {
			it('should pass for JGD2011 navigation', async () => {
				const result = await validateCrsUsage('EPSG:6668', 'navigation', {
					country: 'Japan',
				});
				expect(result.isValid).toBe(true);
				expect(result.issues.filter((i) => i.severity === 'error')).toHaveLength(0);
			});

			it('should info about GPS conversion for projected CRS', async () => {
				const result = await validateCrsUsage('EPSG:6677', 'navigation', {
					prefecture: '東京都',
				});
				expect(result.issues.some((i) => i.code === 'GPS_CONVERSION_NEEDED')).toBe(true);
			});
		});

		describe('web_mapping', () => {
			it('should pass for Web Mercator', async () => {
				const result = await validateCrsUsage('EPSG:3857', 'web_mapping', {
					country: 'Global',
				});
				expect(result.isValid).toBe(true);
			});

			it('should info about non-standard web CRS', async () => {
				const result = await validateCrsUsage('EPSG:6677', 'web_mapping', {
					prefecture: '東京都',
				});
				expect(result.issues.some((i) => i.code === 'NON_STANDARD_WEB_CRS')).toBe(true);
			});
		});

		describe('score calculation', () => {
			it('should return high score for appropriate CRS', async () => {
				const result = await validateCrsUsage('EPSG:6677', 'survey', {
					prefecture: '東京都',
				});
				expect(result.score).toBeGreaterThanOrEqual(80);
			});

			it('should return low score for deprecated CRS', async () => {
				const result = await validateCrsUsage('EPSG:4612', 'data_storage', {
					country: 'Japan',
				});
				expect(result.score).toBeLessThan(60);
			});

			it('should suggest alternatives for low score', async () => {
				const result = await validateCrsUsage('EPSG:3857', 'area_calculation', {
					prefecture: '東京都',
				});
				if (result.score < 70) {
					expect(result.betterAlternatives).toBeDefined();
				}
			});
		});

		describe('not found', () => {
			it('should throw NotFoundError for unknown CRS', async () => {
				await expect(
					validateCrsUsage('EPSG:99999', 'survey', { country: 'Japan' })
				).rejects.toThrow(NotFoundError);
			});
		});
	});
});
