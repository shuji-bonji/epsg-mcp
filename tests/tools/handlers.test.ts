import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { clearCache, preloadAll } from '../../src/data/loader.js';
import { NotFoundError, ValidationError } from '../../src/errors/index.js';
import {
	handleGetCrsDetail,
	handleListCrsByRegion,
	handleSearchCrs,
	toolHandlers,
} from '../../src/tools/handlers.js';

describe('Tool Handlers', () => {
	beforeAll(async () => {
		await preloadAll();
	});

	afterAll(() => {
		clearCache();
	});

	describe('toolHandlers registry', () => {
		it('should have search_crs handler', () => {
			expect(toolHandlers.search_crs).toBeDefined();
			expect(typeof toolHandlers.search_crs).toBe('function');
		});

		it('should have get_crs_detail handler', () => {
			expect(toolHandlers.get_crs_detail).toBeDefined();
			expect(typeof toolHandlers.get_crs_detail).toBe('function');
		});

		it('should have list_crs_by_region handler', () => {
			expect(toolHandlers.list_crs_by_region).toBeDefined();
			expect(typeof toolHandlers.list_crs_by_region).toBe('function');
		});

		it('should call correct handler via registry', async () => {
			const result = await toolHandlers.search_crs({ query: '4326' });
			expect(result).toBeDefined();
		});
	});

	describe('search_crs', () => {
		it('should find JGD2011 by name', async () => {
			const result = (await handleSearchCrs({ query: 'JGD2011' })) as {
				results: Array<{ name: string }>;
				totalCount: number;
			};
			expect(result.results.length).toBeGreaterThan(0);
			expect(result.results[0].name).toContain('JGD2011');
		});

		it('should find CRS by EPSG code (6677)', async () => {
			const result = (await handleSearchCrs({ query: '6677' })) as {
				results: Array<{ code: string }>;
				totalCount: number;
			};
			expect(result.results.length).toBeGreaterThan(0);
			expect(result.results[0].code).toBe('EPSG:6677');
		});

		it('should find CRS by full EPSG code', async () => {
			const result = (await handleSearchCrs({ query: 'EPSG:4326' })) as {
				results: Array<{ code: string }>;
				totalCount: number;
			};
			expect(result.results.length).toBeGreaterThan(0);
		});

		it('should filter by type', async () => {
			const result = (await handleSearchCrs({
				query: 'Japan',
				type: 'projected',
			})) as {
				results: Array<{ type: string }>;
				totalCount: number;
			};
			result.results.forEach((crs) => {
				expect(crs.type).toBe('projected');
			});
		});

		it('should filter by region', async () => {
			const result = (await handleSearchCrs({
				query: 'WGS',
				region: 'Global',
			})) as {
				results: Array<{ code: string }>;
				totalCount: number;
			};
			expect(result.results.length).toBeGreaterThan(0);
		});

		it('should limit results', async () => {
			const result = (await handleSearchCrs({
				query: 'Japan',
				limit: 3,
			})) as {
				results: Array<{ code: string }>;
				totalCount: number;
			};
			expect(result.results.length).toBeLessThanOrEqual(3);
		});

		it('should find by prefecture name', async () => {
			const result = (await handleSearchCrs({ query: '東京' })) as {
				results: Array<{ code: string }>;
				totalCount: number;
			};
			expect(result.results.length).toBeGreaterThan(0);
		});

		it('should find by multiple prefectures', async () => {
			const prefectures = ['大阪', '北海道', '福岡', '沖縄'];
			for (const pref of prefectures) {
				const result = (await handleSearchCrs({ query: pref })) as {
					results: Array<{ code: string }>;
					totalCount: number;
				};
				expect(result.results.length).toBeGreaterThan(0);
			}
		});

		it('should find Web Mercator', async () => {
			const result = (await handleSearchCrs({ query: 'Web Mercator' })) as {
				results: Array<{ code: string; name: string }>;
				totalCount: number;
			};
			expect(result.results.length).toBeGreaterThan(0);
		});

		it('should find UTM zones', async () => {
			const result = (await handleSearchCrs({ query: 'UTM' })) as {
				results: Array<{ code: string; name: string }>;
				totalCount: number;
			};
			expect(result.results.length).toBeGreaterThan(0);
		});

		it('should return totalCount with limited results', async () => {
			const result = (await handleSearchCrs({
				query: 'Japan',
				limit: 1,
			})) as {
				results: Array<{ code: string }>;
				totalCount: number;
			};
			expect(result.results.length).toBe(1);
			expect(result.totalCount).toBeGreaterThan(1);
		});

		it('should throw ValidationError for empty query', async () => {
			await expect(handleSearchCrs({ query: '' })).rejects.toThrow(ValidationError);
		});

		it('should throw ValidationError for missing query', async () => {
			await expect(handleSearchCrs({})).rejects.toThrow(ValidationError);
		});

		it('should throw ValidationError for invalid type', async () => {
			await expect(handleSearchCrs({ query: 'test', type: 'invalid' })).rejects.toThrow(
				ValidationError
			);
		});

		it('should throw ValidationError for limit out of range', async () => {
			await expect(handleSearchCrs({ query: 'test', limit: 0 })).rejects.toThrow(ValidationError);
			await expect(handleSearchCrs({ query: 'test', limit: 101 })).rejects.toThrow(ValidationError);
		});
	});

	describe('get_crs_detail', () => {
		it('should return full details for valid code', async () => {
			const result = (await handleGetCrsDetail({ code: 'EPSG:6677' })) as {
				code: string;
				name: string;
				type: string;
				areaOfUse: { description: string; prefectures?: string[] };
				projection?: { method: string };
			};
			expect(result.code).toBe('EPSG:6677');
			expect(result.name).toContain('Japan Plane Rectangular CS IX');
			expect(result.type).toBe('projected');
			expect(result.areaOfUse).toBeDefined();
			expect(result.areaOfUse.prefectures).toContain('東京都');
			expect(result.projection?.method).toBe('Transverse Mercator');
		});

		it('should accept code without EPSG prefix', async () => {
			const result = (await handleGetCrsDetail({ code: '6677' })) as {
				code: string;
			};
			expect(result.code).toBe('EPSG:6677');
		});

		it('should return details for WGS 84', async () => {
			const result = (await handleGetCrsDetail({ code: '4326' })) as {
				code: string;
				name: string;
				type: string;
				useCases?: string[];
			};
			expect(result.code).toBe('EPSG:4326');
			expect(result.name).toBe('WGS 84');
			expect(result.type).toBe('geographic');
			expect(result.useCases).toBeDefined();
		});

		it('should return details for Web Mercator', async () => {
			const result = (await handleGetCrsDetail({ code: '3857' })) as {
				code: string;
				name: string;
				baseCRS?: string;
			};
			expect(result.code).toBe('EPSG:3857');
			expect(result.baseCRS).toBe('EPSG:4326');
		});

		it('should return details for JGD2011 geographic', async () => {
			const result = (await handleGetCrsDetail({ code: '6668' })) as {
				code: string;
				name: string;
				type: string;
			};
			expect(result.code).toBe('EPSG:6668');
			expect(result.name).toBe('JGD2011');
			expect(result.type).toBe('geographic');
		});

		it('should return details for all plane rectangular systems', async () => {
			for (let i = 6669; i <= 6687; i++) {
				const result = await handleGetCrsDetail({ code: String(i) });
				expect(result).toBeDefined();
			}
		});

		it('should throw NotFoundError for non-existent code', async () => {
			await expect(handleGetCrsDetail({ code: '99999' })).rejects.toThrow(NotFoundError);
		});

		it('should throw ValidationError for invalid code format', async () => {
			await expect(handleGetCrsDetail({ code: 'invalid' })).rejects.toThrow(ValidationError);
		});

		it('should throw ValidationError for empty code', async () => {
			await expect(handleGetCrsDetail({ code: '' })).rejects.toThrow(ValidationError);
		});

		it('should throw ValidationError for missing code', async () => {
			await expect(handleGetCrsDetail({})).rejects.toThrow(ValidationError);
		});

		it('should throw ValidationError for code with letters', async () => {
			await expect(handleGetCrsDetail({ code: 'EPSG:abc' })).rejects.toThrow(ValidationError);
		});
	});

	describe('list_crs_by_region', () => {
		it('should list Japan CRS with recommendations', async () => {
			const result = (await handleListCrsByRegion({ region: 'Japan' })) as {
				region: string;
				crsList: Array<{ code: string; deprecated: boolean }>;
				recommendedFor: { survey: string; webMapping: string; general: string };
			};
			expect(result.region).toBe('Japan');
			expect(result.crsList.length).toBeGreaterThan(0);
			expect(result.recommendedFor.survey).toContain('6669-6687');
			expect(result.recommendedFor.webMapping).toContain('3857');
			expect(result.recommendedFor.general).toContain('JGD2011');
		});

		it('should list Global CRS', async () => {
			const result = (await handleListCrsByRegion({ region: 'Global' })) as {
				region: string;
				crsList: Array<{ code: string }>;
				recommendedFor: { general: string; survey: string };
			};
			expect(result.region).toBe('Global');
			expect(result.crsList.length).toBeGreaterThan(0);
			expect(result.recommendedFor.general).toContain('4326');
			expect(result.recommendedFor.survey).toContain('UTM');
		});

		it('should include WGS 84 in Global list', async () => {
			const result = (await handleListCrsByRegion({ region: 'Global' })) as {
				crsList: Array<{ code: string }>;
			};
			expect(result.crsList.some((crs) => crs.code === 'EPSG:4326')).toBe(true);
		});

		it('should include Web Mercator in Global list', async () => {
			const result = (await handleListCrsByRegion({ region: 'Global' })) as {
				crsList: Array<{ code: string }>;
			};
			expect(result.crsList.some((crs) => crs.code === 'EPSG:3857')).toBe(true);
		});

		it('should include JGD2011 in Japan list', async () => {
			const result = (await handleListCrsByRegion({ region: 'Japan' })) as {
				crsList: Array<{ code: string }>;
			};
			expect(result.crsList.some((crs) => crs.code === 'EPSG:6668')).toBe(true);
		});

		it('should exclude deprecated by default', async () => {
			const result = (await handleListCrsByRegion({ region: 'Japan' })) as {
				crsList: Array<{ deprecated: boolean }>;
			};
			result.crsList.forEach((crs) => {
				expect(crs.deprecated).toBe(false);
			});
		});

		it('should include deprecated when specified', async () => {
			const result = (await handleListCrsByRegion({
				region: 'Japan',
				includeDeprecated: true,
			})) as {
				crsList: Array<{ deprecated: boolean; code: string }>;
			};
			const hasDeprecated = result.crsList.some((crs) => crs.deprecated);
			expect(hasDeprecated).toBe(true);
		});

		it('should include JGD2000 when deprecated included', async () => {
			const result = (await handleListCrsByRegion({
				region: 'Japan',
				includeDeprecated: true,
			})) as {
				crsList: Array<{ code: string }>;
			};
			expect(result.crsList.some((crs) => crs.code === 'EPSG:4612')).toBe(true);
		});

		it('should filter by geographic type', async () => {
			const result = (await handleListCrsByRegion({
				region: 'Japan',
				type: 'geographic',
			})) as {
				crsList: Array<{ type: string }>;
			};
			expect(result.crsList.length).toBeGreaterThan(0);
			result.crsList.forEach((crs) => {
				expect(crs.type).toBe('geographic');
			});
		});

		it('should filter by projected type', async () => {
			const result = (await handleListCrsByRegion({
				region: 'Japan',
				type: 'projected',
			})) as {
				crsList: Array<{ type: string }>;
			};
			expect(result.crsList.length).toBeGreaterThan(0);
			result.crsList.forEach((crs) => {
				expect(crs.type).toBe('projected');
			});
		});

		it('should return empty list for unknown region', async () => {
			const result = (await handleListCrsByRegion({ region: 'Unknown' })) as {
				crsList: Array<{ code: string }>;
			};
			expect(result.crsList).toEqual([]);
		});

		it('should throw ValidationError for empty region', async () => {
			await expect(handleListCrsByRegion({ region: '' })).rejects.toThrow(ValidationError);
		});

		it('should throw ValidationError for missing region', async () => {
			await expect(handleListCrsByRegion({})).rejects.toThrow(ValidationError);
		});

		it('should throw ValidationError for invalid type', async () => {
			await expect(handleListCrsByRegion({ region: 'Japan', type: 'invalid' })).rejects.toThrow(
				ValidationError
			);
		});
	});
});
