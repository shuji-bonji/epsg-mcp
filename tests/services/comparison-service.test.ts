import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { clearCache, preloadAll } from '../../src/data/loader.js';
import { NotFoundError } from '../../src/errors/index.js';
import { compareCrs } from '../../src/services/comparison-service.js';

describe('Comparison Service', () => {
	beforeAll(async () => {
		await preloadAll();
	});

	afterAll(() => {
		clearCache();
	});

	describe('compareCrs', () => {
		describe('WGS84 vs JGD2011', () => {
			it('should compare WGS84 and JGD2011', async () => {
				const result = await compareCrs('4326', '6668');
				expect(result.comparison.length).toBeGreaterThan(0);
				expect(result.summary).toContain('実用上同一');
			});

			it('should have datum comparison', async () => {
				const result = await compareCrs('4326', '6668');
				const datumResult = result.comparison.find((c) => c.aspect.includes('測地系'));
				expect(datumResult).toBeDefined();
				expect(datumResult?.verdict).toContain('実用上同一');
			});

			it('should have transformation note', async () => {
				const result = await compareCrs('4326', '6668');
				expect(result.transformationNote).toBeDefined();
			});
		});

		describe('WGS84 vs Web Mercator', () => {
			it('should compare WGS84 and Web Mercator', async () => {
				const result = await compareCrs('4326', '3857');
				expect(result.comparison.length).toBeGreaterThan(0);
			});

			it('should have projection comparison', async () => {
				const result = await compareCrs('4326', '3857');
				const projResult = result.comparison.find((c) => c.aspect.includes('投影法'));
				expect(projResult).toBeDefined();
				expect(projResult?.verdict).toContain('使い分け');
			});

			it('should have distortion comparison', async () => {
				const result = await compareCrs('4326', '3857');
				const distResult = result.comparison.find((c) => c.aspect.includes('歪み'));
				expect(distResult).toBeDefined();
			});
		});

		describe('JGD2000 vs JGD2011', () => {
			it('should compare JGD2000 and JGD2011', async () => {
				const result = await compareCrs('4612', '6668');
				expect(result.comparison.length).toBeGreaterThan(0);
			});

			it('should mention crustal movement in datum comparison', async () => {
				const result = await compareCrs('4612', '6668');
				const datumResult = result.comparison.find((c) => c.aspect.includes('測地系'));
				expect(datumResult?.verdict).toContain('地殻変動');
			});

			it('should recommend migration in recommendation', async () => {
				const result = await compareCrs('4612', '6668');
				expect(result.recommendation).toContain('非推奨');
			});
		});

		describe('Tokyo Datum vs JGD2011', () => {
			it('should compare Tokyo Datum and JGD2011', async () => {
				const result = await compareCrs('4301', '6668');
				expect(result.comparison.length).toBeGreaterThan(0);
			});

			it('should warn about legacy datum', async () => {
				const result = await compareCrs('4301', '6668');
				const datumResult = result.comparison.find((c) => c.aspect.includes('測地系'));
				expect(datumResult?.verdict).toContain('旧測地系');
			});
		});

		describe('plane rectangular vs WGS84', () => {
			it('should compare plane rectangular and WGS84', async () => {
				const result = await compareCrs('6677', '4326');
				expect(result.comparison.length).toBeGreaterThan(0);
			});

			it('should have different projection types', async () => {
				const result = await compareCrs('6677', '4326');
				const projResult = result.comparison.find((c) => c.aspect.includes('投影法'));
				expect(projResult).toBeDefined();
			});
		});

		describe('with specific aspects', () => {
			it('should compare only specified aspects', async () => {
				const result = await compareCrs('4326', '6668', ['datum', 'accuracy']);
				expect(result.comparison.length).toBe(2);
				expect(result.comparison.some((c) => c.aspect.includes('測地系'))).toBe(true);
				expect(result.comparison.some((c) => c.aspect.includes('精度'))).toBe(true);
			});

			it('should compare only datum', async () => {
				const result = await compareCrs('4326', '6668', ['datum']);
				expect(result.comparison.length).toBe(1);
				expect(result.comparison[0].aspect).toContain('測地系');
			});
		});

		describe('use_cases comparison', () => {
			it('should compare use cases', async () => {
				const result = await compareCrs('4326', '3857', ['use_cases']);
				const useCaseResult = result.comparison.find((c) => c.aspect.includes('用途'));
				expect(useCaseResult).toBeDefined();
			});

			it('should show Web Mercator advantage for web mapping', async () => {
				const result = await compareCrs('4326', '3857', ['use_cases']);
				const useCaseResult = result.comparison.find((c) => c.aspect.includes('用途'));
				expect(useCaseResult?.verdict).toContain('3857');
			});
		});

		describe('compatibility comparison', () => {
			it('should compare compatibility', async () => {
				const result = await compareCrs('4326', '3857', ['compatibility']);
				const compatResult = result.comparison.find((c) => c.aspect.includes('互換性'));
				expect(compatResult).toBeDefined();
			});
		});

		describe('area_of_use comparison', () => {
			it('should compare area of use', async () => {
				const result = await compareCrs('4326', '6677', ['area_of_use']);
				const areaResult = result.comparison.find((c) => c.aspect.includes('適用範囲'));
				expect(areaResult).toBeDefined();
			});
		});

		describe('summary and recommendation', () => {
			it('should generate summary', async () => {
				const result = await compareCrs('4326', '6668');
				expect(result.summary).toBeDefined();
				expect(result.summary.length).toBeGreaterThan(0);
			});

			it('should generate recommendation', async () => {
				const result = await compareCrs('4326', '6668');
				expect(result.recommendation).toBeDefined();
				expect(result.recommendation.length).toBeGreaterThan(0);
			});
		});

		describe('not found', () => {
			it('should throw NotFoundError for unknown CRS1', async () => {
				await expect(compareCrs('99999', '4326')).rejects.toThrow(NotFoundError);
			});

			it('should throw NotFoundError for unknown CRS2', async () => {
				await expect(compareCrs('4326', '99999')).rejects.toThrow(NotFoundError);
			});
		});
	});
});
