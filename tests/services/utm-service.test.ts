/**
 * UTM フォールバックサービスのテスト
 */

import { describe, expect, it } from 'vitest';
import { canUseUtmFallback, recommendWithUtmFallback } from '../../src/services/utm-service.js';
import type { LocationSpec } from '../../src/types/index.js';

describe('UTM Service', () => {
	describe('canUseUtmFallback', () => {
		it('should return true for valid centerPoint', () => {
			const location: LocationSpec = {
				centerPoint: { lat: 35.68, lng: 139.69 }, // Tokyo
			};
			expect(canUseUtmFallback(location)).toBe(true);
		});

		it('should return true for valid boundingBox', () => {
			const location: LocationSpec = {
				boundingBox: {
					north: 36,
					south: 35,
					east: 140,
					west: 139,
				},
			};
			expect(canUseUtmFallback(location)).toBe(true);
		});

		it('should return false for polar region (arctic)', () => {
			const location: LocationSpec = {
				centerPoint: { lat: 85, lng: 0 },
			};
			expect(canUseUtmFallback(location)).toBe(false);
		});

		it('should return false for polar region (antarctic)', () => {
			const location: LocationSpec = {
				centerPoint: { lat: -81, lng: 0 },
			};
			expect(canUseUtmFallback(location)).toBe(false);
		});

		it('should return false for location without coordinates', () => {
			const location: LocationSpec = {
				country: 'US',
			};
			expect(canUseUtmFallback(location)).toBe(false);
		});
	});

	describe('recommendWithUtmFallback', () => {
		describe('distance_calculation', () => {
			it('should recommend UTM for Paris coordinates', async () => {
				const result = await recommendWithUtmFallback('distance_calculation', {
					centerPoint: { lat: 48.85, lng: 2.35 }, // Paris
				});
				expect(result.primary.code).toBe('EPSG:32631'); // UTM 31N
				expect(result.primary.name).toContain('UTM zone 31N');
			});

			it('should recommend UTM for New York coordinates', async () => {
				const result = await recommendWithUtmFallback('distance_calculation', {
					centerPoint: { lat: 40.71, lng: -74.01 }, // New York
				});
				expect(result.primary.code).toBe('EPSG:32618'); // UTM 18N
			});

			it('should recommend UTM for Sydney coordinates (southern hemisphere)', async () => {
				const result = await recommendWithUtmFallback('distance_calculation', {
					centerPoint: { lat: -33.87, lng: 151.21 }, // Sydney
				});
				expect(result.primary.code).toBe('EPSG:32756'); // UTM 56S
				expect(result.primary.name).toContain('56S');
			});
		});

		describe('area_calculation', () => {
			it('should recommend UTM for area calculation', async () => {
				const result = await recommendWithUtmFallback('area_calculation', {
					centerPoint: { lat: 52.52, lng: 13.41 }, // Berlin
				});
				expect(result.primary.code).toBe('EPSG:32633'); // UTM 33N
			});
		});

		describe('web_mapping', () => {
			it('should recommend Web Mercator for web mapping', async () => {
				const result = await recommendWithUtmFallback('web_mapping', {
					centerPoint: { lat: 48.85, lng: 2.35 }, // Paris
				});
				expect(result.primary.code).toBe('EPSG:3857');
				expect(result.alternatives.some((a) => a.code.includes('326'))).toBe(true); // UTM as alternative
			});
		});

		describe('data_storage', () => {
			it('should recommend WGS84 for data storage', async () => {
				const result = await recommendWithUtmFallback('data_storage', {
					centerPoint: { lat: 48.85, lng: 2.35 },
				});
				expect(result.primary.code).toBe('EPSG:4326');
			});
		});

		describe('navigation', () => {
			it('should recommend WGS84 for navigation', async () => {
				const result = await recommendWithUtmFallback('navigation', {
					centerPoint: { lat: 48.85, lng: 2.35 },
				});
				expect(result.primary.code).toBe('EPSG:4326');
			});
		});

		describe('edge cases', () => {
			it('should fallback to global when no coordinates provided', async () => {
				const result = await recommendWithUtmFallback('distance_calculation', {
					country: 'FR',
				});
				expect(result.primary.code).toBe('EPSG:4326');
				expect(result.warnings).toBeDefined();
				expect(result.warnings?.some((w) => w.includes('No location coordinates'))).toBe(true);
			});

			it('should warn for polar regions', async () => {
				const result = await recommendWithUtmFallback('distance_calculation', {
					centerPoint: { lat: 85, lng: 0 },
				});
				expect(result.warnings).toBeDefined();
				expect(result.warnings?.some((w) => w.includes('polar'))).toBe(true);
			});

			it('should warn when bbox crosses multiple zones', async () => {
				const result = await recommendWithUtmFallback('distance_calculation', {
					boundingBox: {
						north: 50,
						south: 48,
						east: 10, // Crosses zone 31/32 boundary at 6°E
						west: 0,
					},
				});
				expect(result.warnings?.some((w) => w.includes('multiple UTM zones'))).toBe(true);
			});
		});

		describe('pros and cons', () => {
			it('should include appropriate pros for UTM recommendation', async () => {
				const result = await recommendWithUtmFallback('distance_calculation', {
					centerPoint: { lat: 48.85, lng: 2.35 },
				});
				expect(result.primary.pros.length).toBeGreaterThan(0);
				expect(result.primary.pros.some((p) => p.includes('distortion'))).toBe(true);
			});

			it('should include appropriate cons for UTM recommendation', async () => {
				const result = await recommendWithUtmFallback('distance_calculation', {
					centerPoint: { lat: 48.85, lng: 2.35 },
				});
				expect(result.primary.cons.length).toBeGreaterThan(0);
			});
		});
	});
});
