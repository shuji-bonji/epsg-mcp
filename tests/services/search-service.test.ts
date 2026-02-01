import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { clearCache, preloadAll } from '../../src/data/loader.js';
import { getCrsDetail, listCrsByRegion, searchCrs } from '../../src/services/search-service.js';

describe('Search Service', () => {
	beforeAll(async () => {
		await preloadAll();
	});

	afterAll(() => {
		clearCache();
	});

	describe('searchCrs', () => {
		describe('basic search', () => {
			it('should search by exact EPSG code', async () => {
				const result = await searchCrs('4326');
				expect(result.results.length).toBeGreaterThan(0);
				expect(result.results[0].code).toBe('EPSG:4326');
			});

			it('should search by full EPSG code', async () => {
				const result = await searchCrs('EPSG:6677');
				expect(result.results.length).toBeGreaterThan(0);
				expect(result.results[0].code).toBe('EPSG:6677');
			});

			it('should search by name', async () => {
				const result = await searchCrs('WGS 84');
				expect(result.results.length).toBeGreaterThan(0);
				expect(result.results.some((r) => r.name === 'WGS 84')).toBe(true);
			});

			it('should search by partial name', async () => {
				const result = await searchCrs('Mercator');
				expect(result.results.length).toBeGreaterThan(0);
				expect(result.results.some((r) => r.name.includes('Mercator'))).toBe(true);
			});

			it('should be case-insensitive', async () => {
				const result1 = await searchCrs('jgd2011');
				const result2 = await searchCrs('JGD2011');
				expect(result1.totalCount).toBe(result2.totalCount);
			});

			it('should trim whitespace', async () => {
				const result = await searchCrs('  4326  ');
				expect(result.results.length).toBeGreaterThan(0);
			});
		});

		describe('Japanese search', () => {
			it('should search by prefecture name', async () => {
				const result = await searchCrs('東京');
				expect(result.results.length).toBeGreaterThan(0);
			});

			it('should search by Japanese CRS name', async () => {
				const result = await searchCrs('平面直角');
				expect(result.results.length).toBeGreaterThan(0);
			});

			it('should find zone IX for Tokyo area', async () => {
				const result = await searchCrs('東京', { region: 'Japan' });
				expect(result.results.some((r) => r.code === 'EPSG:6677')).toBe(true);
			});
		});

		describe('filtering', () => {
			it('should filter by geographic type', async () => {
				const result = await searchCrs('Japan', { type: 'geographic' });
				for (const crs of result.results) {
					expect(crs.type).toBe('geographic');
				}
			});

			it('should filter by projected type', async () => {
				const result = await searchCrs('Japan', { type: 'projected' });
				for (const crs of result.results) {
					expect(crs.type).toBe('projected');
				}
			});

			it('should filter by Japan region', async () => {
				const result = await searchCrs('JGD', { region: 'Japan' });
				expect(result.results.length).toBeGreaterThan(0);
			});

			it('should filter by Global region', async () => {
				const result = await searchCrs('WGS', { region: 'Global' });
				expect(result.results.length).toBeGreaterThan(0);
			});

			it('should combine type and region filters', async () => {
				const result = await searchCrs('Japan', { type: 'projected', region: 'Japan' });
				for (const crs of result.results) {
					expect(crs.type).toBe('projected');
				}
			});
		});

		describe('limit', () => {
			it('should respect limit parameter', async () => {
				const result = await searchCrs('Japan', { limit: 5 });
				expect(result.results.length).toBeLessThanOrEqual(5);
			});

			it('should default to 10 results', async () => {
				const result = await searchCrs('Japan');
				expect(result.results.length).toBeLessThanOrEqual(10);
			});

			it('should return totalCount regardless of limit', async () => {
				const result = await searchCrs('Japan', { limit: 1 });
				expect(result.totalCount).toBeGreaterThan(1);
				expect(result.results.length).toBe(1);
			});
		});

		describe('scoring', () => {
			it('should rank exact code match highest', async () => {
				const result = await searchCrs('4326');
				expect(result.results[0].code).toBe('EPSG:4326');
			});

			it('should rank exact name match high', async () => {
				const result = await searchCrs('WGS 84');
				expect(result.results[0].name).toBe('WGS 84');
			});
		});

		describe('edge cases', () => {
			it('should return empty results for no match', async () => {
				const result = await searchCrs('xyznonexistent');
				expect(result.results.length).toBe(0);
				expect(result.totalCount).toBe(0);
			});

			it('should handle special characters', async () => {
				const result = await searchCrs('Japan / CS IX');
				expect(result.results.length).toBeGreaterThanOrEqual(0);
			});

			it('should handle multiple words', async () => {
				const result = await searchCrs('WGS 84 UTM');
				expect(result.results.length).toBeGreaterThanOrEqual(0);
			});
		});
	});

	describe('getCrsDetail', () => {
		it('should return full CRS detail', async () => {
			const detail = await getCrsDetail('4326');
			expect(detail).toBeDefined();
			expect(detail?.code).toBe('EPSG:4326');
			expect(detail?.name).toBe('WGS 84');
			expect(detail?.type).toBe('geographic');
			expect(detail?.areaOfUse).toBeDefined();
		});

		it('should return projection info for projected CRS', async () => {
			const detail = await getCrsDetail('6677');
			expect(detail).toBeDefined();
			expect(detail?.projection).toBeDefined();
			expect(detail?.projection?.method).toBe('Transverse Mercator');
			expect(detail?.projection?.centralMeridian).toBeDefined();
		});

		it('should return prefectures for Japan CRS', async () => {
			const detail = await getCrsDetail('6677');
			expect(detail).toBeDefined();
			expect(detail?.areaOfUse?.prefectures).toBeDefined();
			expect(detail?.areaOfUse?.prefectures).toContain('東京都');
		});

		it('should return accuracy info when available', async () => {
			const detail = await getCrsDetail('6677');
			expect(detail?.accuracy).toBeDefined();
		});

		it('should return useCases when available', async () => {
			const detail = await getCrsDetail('6677');
			expect(detail?.useCases).toBeDefined();
			expect(detail?.useCases).toContain('survey');
		});

		it('should return null for non-existent code', async () => {
			const detail = await getCrsDetail('99999');
			expect(detail).toBeNull();
		});

		it('should handle EPSG prefix', async () => {
			const detail = await getCrsDetail('EPSG:4326');
			expect(detail).toBeDefined();
			expect(detail?.code).toBe('EPSG:4326');
		});
	});

	describe('listCrsByRegion', () => {
		describe('Japan region', () => {
			it('should return Japan CRS list', async () => {
				const result = await listCrsByRegion('Japan');
				expect(result.region).toBe('Japan');
				expect(result.crsList.length).toBeGreaterThan(0);
			});

			it('should include JGD2011 geographic CRS', async () => {
				const result = await listCrsByRegion('Japan');
				expect(result.crsList.some((crs) => crs.code === 'EPSG:6668')).toBe(true);
			});

			it('should include plane rectangular coordinate systems', async () => {
				const result = await listCrsByRegion('Japan');
				expect(result.crsList.some((crs) => crs.code === 'EPSG:6677')).toBe(true);
			});

			it('should return Japan-specific recommendations', async () => {
				const result = await listCrsByRegion('Japan');
				expect(result.recommendedFor.general).toContain('JGD2011');
				expect(result.recommendedFor.survey).toContain('6669-6687');
				expect(result.recommendedFor.webMapping).toContain('3857');
			});
		});

		describe('Global region', () => {
			it('should return Global CRS list', async () => {
				const result = await listCrsByRegion('Global');
				expect(result.region).toBe('Global');
				expect(result.crsList.length).toBeGreaterThan(0);
			});

			it('should include WGS 84', async () => {
				const result = await listCrsByRegion('Global');
				expect(result.crsList.some((crs) => crs.code === 'EPSG:4326')).toBe(true);
			});

			it('should include Web Mercator', async () => {
				const result = await listCrsByRegion('Global');
				expect(result.crsList.some((crs) => crs.code === 'EPSG:3857')).toBe(true);
			});

			it('should return Global recommendations', async () => {
				const result = await listCrsByRegion('Global');
				expect(result.recommendedFor.general).toContain('4326');
				expect(result.recommendedFor.survey).toContain('UTM');
			});
		});

		describe('filtering', () => {
			it('should filter by geographic type', async () => {
				const result = await listCrsByRegion('Japan', { type: 'geographic' });
				for (const crs of result.crsList) {
					expect(crs.type).toBe('geographic');
				}
			});

			it('should filter by projected type', async () => {
				const result = await listCrsByRegion('Japan', { type: 'projected' });
				for (const crs of result.crsList) {
					expect(crs.type).toBe('projected');
				}
			});

			it('should exclude deprecated by default', async () => {
				const result = await listCrsByRegion('Japan');
				for (const crs of result.crsList) {
					expect(crs.deprecated).toBe(false);
				}
			});

			it('should include deprecated when specified', async () => {
				const result = await listCrsByRegion('Japan', { includeDeprecated: true });
				expect(result.crsList.some((crs) => crs.deprecated)).toBe(true);
			});
		});

		describe('edge cases', () => {
			it('should handle unknown region', async () => {
				const result = await listCrsByRegion('Unknown');
				expect(result.crsList).toEqual([]);
			});

			it('should be case-insensitive for region', async () => {
				const result1 = await listCrsByRegion('japan');
				const result2 = await listCrsByRegion('JAPAN');
				// Both should return non-empty lists, but recommendations key might differ
				expect(result1.crsList.length).toBeGreaterThan(0);
				expect(result2.crsList.length).toBeGreaterThan(0);
			});
		});
	});
});
