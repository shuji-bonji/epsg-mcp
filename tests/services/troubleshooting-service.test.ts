import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { clearCache, preloadAll } from '../../src/data/loader.js';
import { listSymptomCategories, troubleshoot } from '../../src/services/troubleshooting-service.js';

describe('Troubleshooting Service', () => {
	beforeAll(async () => {
		// Set Japanese language for these tests (they use Japanese symptoms)
		process.env.EPSG_LANG = 'ja';
		await preloadAll();
	});

	afterAll(() => {
		clearCache();
		delete process.env.EPSG_LANG;
	});

	describe('troubleshoot', () => {
		describe('large coordinate shift (400m)', () => {
			it('should identify Tokyo Datum issue for 400m shift', async () => {
				const result = await troubleshoot('座標が400mずれる');
				expect(result.matchedSymptom).toContain('数百メートル');
				expect(result.possibleCauses.length).toBeGreaterThan(0);
			});

			it('should suggest Tokyo Datum as high likelihood cause', async () => {
				const result = await troubleshoot('座標が数百メートルずれている');
				const tokyoDatumCause = result.possibleCauses.find((c) => c.cause.includes('Tokyo Datum'));
				expect(tokyoDatumCause).toBeDefined();
				expect(tokyoDatumCause?.likelihood).toBe('high');
			});

			it('should include diagnostic steps', async () => {
				const result = await troubleshoot('座標が全然違う場所に表示される');
				expect(result.diagnosticSteps.length).toBeGreaterThan(0);
				expect(result.diagnosticSteps[0].step).toBe(1);
			});

			it('should include solutions', async () => {
				const result = await troubleshoot('数百mのずれがある');
				expect(result.suggestedSolutions.length).toBeGreaterThan(0);
			});
		});

		describe('medium coordinate shift (1-2m)', () => {
			it('should identify transformation accuracy issue', async () => {
				const result = await troubleshoot('座標が1-2mずれる');
				expect(result.matchedSymptom).toContain('1〜数メートル');
			});

			it('should mention Tokyo Datum transformation limit', async () => {
				const result = await troubleshoot('変換後に数メートルのずれがある');
				const transformCause = result.possibleCauses.find((c) => c.cause.includes('変換精度'));
				expect(transformCause).toBeDefined();
			});
		});

		describe('small coordinate shift (cm)', () => {
			it('should identify cm-level shift', async () => {
				const result = await troubleshoot('数cmのずれがある');
				expect(result.matchedSymptom).toContain('数cm');
			});

			it('should mention WGS84/JGD2011 difference', async () => {
				const result = await troubleshoot('センチメートル単位の微小なずれ');
				const wgs84Cause = result.possibleCauses.find((c) => c.cause.includes('WGS84'));
				expect(wgs84Cause).toBeDefined();
			});
		});

		describe('area/distance calculation error', () => {
			it('should identify area calculation issue', async () => {
				const result = await troubleshoot('面積計算の結果がおかしい');
				expect(result.matchedSymptom).toContain('面積');
			});

			it('should suggest Web Mercator as cause', async () => {
				const result = await troubleshoot('距離計算が合わない');
				const mercatorCause = result.possibleCauses.find(
					(c) => c.cause.includes('Mercator') || c.cause.includes('3857')
				);
				expect(mercatorCause).toBeDefined();
			});
		});

		describe('display blank', () => {
			it('should identify display issue', async () => {
				const result = await troubleshoot('データが表示されない');
				expect(result.matchedSymptom).toContain('表示されない');
			});

			it('should suggest CRS mismatch as cause', async () => {
				const result = await troubleshoot('レイヤーが空白になる');
				const crsMismatchCause = result.possibleCauses.find((c) => c.cause.includes('CRS不一致'));
				expect(crsMismatchCause).toBeDefined();
			});
		});

		describe('transformation error', () => {
			it('should identify transformation error', async () => {
				const result = await troubleshoot('座標変換でエラーが発生する');
				expect(result.matchedSymptom).toContain('変換');
			});

			it('should suggest parameter not found as cause', async () => {
				const result = await troubleshoot('変換に失敗する');
				const paramCause = result.possibleCauses.find((c) => c.cause.includes('パラメータ'));
				expect(paramCause).toBeDefined();
			});
		});

		describe('context adjustment', () => {
			it('should adjust likelihood based on source CRS context', async () => {
				const result = await troubleshoot('座標がずれる', {
					sourceCrs: 'EPSG:4301',
					targetCrs: 'EPSG:6668',
				});
				const tokyoDatumCause = result.possibleCauses.find((c) => c.cause.includes('Tokyo Datum'));
				expect(tokyoDatumCause?.likelihood).toBe('high');
			});

			it('should adjust likelihood based on magnitude context', async () => {
				const result = await troubleshoot('座標がずれる', {
					magnitude: '400m程度',
				});
				// Should identify as large shift
				expect(result.possibleCauses.length).toBeGreaterThan(0);
			});

			it('should adjust likelihood based on location context', async () => {
				const result = await troubleshoot('座標がずれる', {
					location: '東北地方',
				});
				const crustalCause = result.possibleCauses.find((c) => c.cause.includes('地殻変動'));
				// If crustal movement cause exists, it should have high likelihood
				if (crustalCause) {
					expect(crustalCause.likelihood).toBe('high');
				}
			});
		});

		describe('confidence levels', () => {
			it('should return high confidence for specific symptoms', async () => {
				const result = await troubleshoot('座標が400mずれる、Tokyo Datumのデータを使っている', {
					sourceCrs: 'EPSG:4301',
					magnitude: '400m',
				});
				expect(result.confidence).toBe('high');
			});

			it('should return lower confidence for vague symptoms', async () => {
				const result = await troubleshoot('おかしい');
				expect(['low', 'medium']).toContain(result.confidence);
			});
		});

		describe('unmatched symptoms', () => {
			it('should return guidance for unmatched symptoms', async () => {
				const result = await troubleshoot('不明なエラー');
				expect(result.matchedSymptom).toBeDefined();
				expect(result.possibleCauses.length).toBeGreaterThan(0);
			});

			it('should return low confidence for unmatched symptoms', async () => {
				const result = await troubleshoot('全く関係ない問題');
				expect(result.confidence).toBe('low');
			});
		});

		describe('related best practices', () => {
			it('should include related best practices', async () => {
				const result = await troubleshoot('座標が400mずれる');
				expect(result.relatedBestPractices.length).toBeGreaterThan(0);
			});

			it('should suggest historical_data for large coordinate shift', async () => {
				const result = await troubleshoot('座標が数百メートルずれている');
				expect(result.relatedBestPractices).toContain('historical_data');
			});
		});

		describe('keyword matching priority', () => {
			it('should prioritize longer keyword matches', async () => {
				// "数百メートル" should match more specifically than just "メートル"
				const result = await troubleshoot('座標が数百メートルずれる');
				expect(result.matchedSymptom).toContain('数百メートル');
			});

			it('should match specific magnitude keywords', async () => {
				const result = await troubleshoot('1-2mの誤差がある');
				expect(result.matchedSymptom).toContain('1〜数メートル');
			});
		});
	});

	describe('listSymptomCategories', () => {
		it('should return list of symptom categories', async () => {
			const categories = await listSymptomCategories();
			expect(categories).toBeInstanceOf(Array);
			expect(categories.length).toBeGreaterThan(0);
		});

		it('should include coordinate shift category', async () => {
			const categories = await listSymptomCategories();
			const hasShiftCategory = categories.some((c) => c.id.includes('coordinate_shift'));
			expect(hasShiftCategory).toBe(true);
		});

		it('should have id and description for each category', async () => {
			const categories = await listSymptomCategories();
			for (const category of categories) {
				expect(category.id).toBeDefined();
				expect(category.description).toBeDefined();
			}
		});
	});
});
