import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { clearCache, preloadAll } from '../../src/data/loader.js';
import { NotFoundError } from '../../src/errors/index.js';
import {
	isWideArea,
	normalizeCrsCode,
	suggestTransformation,
} from '../../src/services/transformation-service.js';

describe('Transformation Service', () => {
	beforeAll(async () => {
		await preloadAll();
	});

	afterAll(() => {
		clearCache();
	});

	describe('normalizeCrsCode', () => {
		it('should normalize code without prefix', () => {
			expect(normalizeCrsCode('4326')).toBe('EPSG:4326');
		});

		it('should normalize code with prefix', () => {
			expect(normalizeCrsCode('EPSG:4326')).toBe('EPSG:4326');
		});

		it('should normalize code with lowercase prefix', () => {
			expect(normalizeCrsCode('epsg:4326')).toBe('EPSG:4326');
		});
	});

	describe('isWideArea', () => {
		it('should return true for wide bounding box', () => {
			expect(
				isWideArea({
					boundingBox: { north: 40, south: 35, east: 145, west: 135 },
				})
			).toBe(true);
		});

		it('should return false for narrow bounding box', () => {
			expect(
				isWideArea({
					boundingBox: { north: 36, south: 35, east: 140, west: 139 },
				})
			).toBe(false);
		});

		it('should return false for no bounding box', () => {
			expect(isWideArea({ country: 'Japan' })).toBe(false);
		});
	});

	describe('suggestTransformation', () => {
		describe('same CRS', () => {
			it('should return no transformation needed for same CRS', async () => {
				const result = await suggestTransformation('EPSG:4326', 'EPSG:4326');
				expect(result.directPath).toBeNull();
				expect(result.viaPaths).toHaveLength(0);
				expect(result.recommended.steps).toHaveLength(0);
				expect(result.recommended.complexity).toBe('simple');
				expect(result.warnings).toContain('同一のCRSが指定されました。変換は不要です。');
			});
		});

		describe('direct transformation', () => {
			it('should find direct path for JGD2000 to JGD2011', async () => {
				const result = await suggestTransformation('4612', '6668');
				expect(result.directPath).not.toBeNull();
				expect(result.directPath?.steps).toHaveLength(1);
				expect(result.directPath?.complexity).toBe('simple');
				expect(result.recommended.steps).toHaveLength(1);
			});

			it('should find direct path for WGS84 to Web Mercator', async () => {
				const result = await suggestTransformation('4326', '3857');
				expect(result.directPath).not.toBeNull();
				expect(result.directPath?.steps).toHaveLength(1);
			});

			it('should find direct path for WGS84 to JGD2011', async () => {
				const result = await suggestTransformation('4326', '6668');
				expect(result.directPath).not.toBeNull();
				expect(result.directPath?.totalAccuracy).toContain('実用上同一');
			});
		});

		describe('multi-step transformation', () => {
			it('should find 2-step path for Tokyo to JGD2011', async () => {
				const result = await suggestTransformation('4301', '6668');
				// Direct path may not exist, check via paths
				const paths = result.directPath ? [result.directPath, ...result.viaPaths] : result.viaPaths;
				const twoStepPath = paths.find((p) => p.steps.length === 2);
				expect(twoStepPath).toBeDefined();
			});

			it('should find path for JGD2011 to plane rectangular', async () => {
				const result = await suggestTransformation('6668', '6677');
				expect(result.recommended.steps.length).toBeGreaterThanOrEqual(1);
			});
		});

		describe('reverse transformation', () => {
			it('should find reverse path for JGD2011 to WGS84', async () => {
				const result = await suggestTransformation('6668', '4326');
				expect(result.recommended.steps.length).toBeGreaterThanOrEqual(1);
			});

			it('should find reverse path for Web Mercator to WGS84', async () => {
				const result = await suggestTransformation('3857', '4326');
				expect(result.recommended.steps.length).toBeGreaterThanOrEqual(1);
			});
		});

		describe('deprecated CRS warning', () => {
			it('should warn about deprecated Tokyo Datum', async () => {
				const result = await suggestTransformation('4301', '6668');
				expect(result.warnings.some((w) => w.includes('非推奨'))).toBe(true);
			});

			it('should warn about deprecated JGD2000', async () => {
				const result = await suggestTransformation('4612', '4326');
				expect(result.warnings.some((w) => w.includes('非推奨'))).toBe(true);
			});
		});

		describe('wide area warning', () => {
			it('should warn about wide area transformation', async () => {
				const result = await suggestTransformation('4326', '6668', {
					boundingBox: { north: 45, south: 30, east: 145, west: 130 },
				});
				expect(result.warnings.some((w) => w.includes('広域'))).toBe(true);
			});
		});

		describe('not found', () => {
			it('should throw NotFoundError for unknown transformation', async () => {
				await expect(suggestTransformation('4326', '99999')).rejects.toThrow(NotFoundError);
			});
		});

		describe('complexity', () => {
			it('should mark single-step as simple', async () => {
				const result = await suggestTransformation('4326', '3857');
				expect(result.recommended.complexity).toBe('simple');
			});

			it('should mark 2-step as moderate', async () => {
				const result = await suggestTransformation('4301', '6668');
				// Find the recommended path
				if (result.recommended.steps.length === 2) {
					expect(result.recommended.complexity).toBe('moderate');
				}
			});
		});
	});
});
