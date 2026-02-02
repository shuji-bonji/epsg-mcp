import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { clearCache, preloadAll } from '../../src/data/loader.js';
import { NotFoundError } from '../../src/errors/index.js';
import {
	getBestPractices,
	listBestPracticeTopics,
} from '../../src/services/best-practices-service.js';
import type { BestPracticeTopic } from '../../src/types/index.js';

describe('Best Practices Service', () => {
	beforeAll(async () => {
		// Set Japanese language for these tests (they check for Japanese content)
		process.env.EPSG_LANG = 'ja';
		await preloadAll();
	});

	afterAll(() => {
		clearCache();
		delete process.env.EPSG_LANG;
	});

	describe('getBestPractices', () => {
		describe('japan_survey topic', () => {
			it('should return best practices for japan_survey', async () => {
				const result = await getBestPractices('japan_survey');
				expect(result.topic).toBe('japan_survey');
				expect(result.description).toBeDefined();
				expect(result.practices.length).toBeGreaterThan(0);
			});

			it('should include JGD2011 in practices', async () => {
				const result = await getBestPractices('japan_survey');
				const hasJgd2011 = result.practices.some(
					(p) => p.title.includes('JGD2011') || p.description.includes('JGD2011')
				);
				expect(hasJgd2011).toBe(true);
			});

			it('should include common mistakes', async () => {
				const result = await getBestPractices('japan_survey');
				expect(result.commonMistakes.length).toBeGreaterThan(0);
			});

			it('should include references', async () => {
				const result = await getBestPractices('japan_survey');
				expect(result.references.length).toBeGreaterThan(0);
			});
		});

		describe('web_mapping topic', () => {
			it('should return best practices for web_mapping', async () => {
				const result = await getBestPractices('web_mapping');
				expect(result.topic).toBe('web_mapping');
				expect(result.practices.length).toBeGreaterThan(0);
			});

			it('should mention Web Mercator', async () => {
				const result = await getBestPractices('web_mapping');
				const hasWebMercator = result.practices.some(
					(p) =>
						p.title.includes('Mercator') ||
						p.description.includes('Mercator') ||
						p.description.includes('3857')
				);
				expect(hasWebMercator).toBe(true);
			});
		});

		describe('data_exchange topic', () => {
			it('should return best practices for data_exchange', async () => {
				const result = await getBestPractices('data_exchange');
				expect(result.topic).toBe('data_exchange');
				expect(result.practices.length).toBeGreaterThan(0);
			});

			it('should mention WGS84 or EPSG:4326', async () => {
				const result = await getBestPractices('data_exchange');
				const hasWgs84 = result.practices.some(
					(p) =>
						p.title.includes('WGS84') ||
						p.description.includes('WGS84') ||
						p.description.includes('4326')
				);
				expect(hasWgs84).toBe(true);
			});
		});

		describe('coordinate_storage topic', () => {
			it('should return best practices for coordinate_storage', async () => {
				const result = await getBestPractices('coordinate_storage');
				expect(result.topic).toBe('coordinate_storage');
				expect(result.practices.length).toBeGreaterThan(0);
			});

			it('should mention precision or DOUBLE', async () => {
				const result = await getBestPractices('coordinate_storage');
				const hasPrecisionInfo = result.practices.some(
					(p) =>
						p.description.includes('精度') ||
						p.description.includes('DOUBLE') ||
						p.description.includes('倍精度')
				);
				expect(hasPrecisionInfo).toBe(true);
			});
		});

		describe('all topics', () => {
			const topics: BestPracticeTopic[] = [
				'japan_survey',
				'web_mapping',
				'data_exchange',
				'coordinate_storage',
				'mobile_gps',
				'cross_border',
				'historical_data',
				'gis_integration',
				'precision_requirements',
				'projection_selection',
			];

			it.each(topics)('should return valid data for topic: %s', async (topic) => {
				const result = await getBestPractices(topic);
				expect(result.topic).toBe(topic);
				expect(result.description).toBeDefined();
				expect(result.description.length).toBeGreaterThan(0);
				expect(result.practices).toBeInstanceOf(Array);
				expect(result.commonMistakes).toBeInstanceOf(Array);
				expect(result.relatedTopics).toBeInstanceOf(Array);
				expect(result.references).toBeInstanceOf(Array);
			});

			it.each(topics)('should have practices with required fields for topic: %s', async (topic) => {
				const result = await getBestPractices(topic);
				for (const practice of result.practices) {
					expect(practice.title).toBeDefined();
					expect(practice.description).toBeDefined();
					expect(practice.priority).toMatch(/^(must|should|may)$/);
					expect(practice.rationale).toBeDefined();
				}
			});

			it.each(
				topics
			)('should have common mistakes with required fields for topic: %s', async (topic) => {
				const result = await getBestPractices(topic);
				for (const mistake of result.commonMistakes) {
					expect(mistake.mistake).toBeDefined();
					expect(mistake.consequence).toBeDefined();
					expect(mistake.solution).toBeDefined();
				}
			});
		});

		describe('context parameter', () => {
			it('should accept optional context parameter', async () => {
				const result = await getBestPractices('japan_survey', '東京都での測量');
				expect(result.topic).toBe('japan_survey');
			});
		});

		describe('not found', () => {
			it('should throw NotFoundError for unknown topic', async () => {
				await expect(getBestPractices('unknown_topic' as BestPracticeTopic)).rejects.toThrow(
					NotFoundError
				);
			});
		});
	});

	describe('listBestPracticeTopics', () => {
		it('should return list of available topics', async () => {
			const topics = await listBestPracticeTopics();
			expect(topics).toBeInstanceOf(Array);
			expect(topics.length).toBe(10);
		});

		it('should include japan_survey', async () => {
			const topics = await listBestPracticeTopics();
			expect(topics).toContain('japan_survey');
		});

		it('should include web_mapping', async () => {
			const topics = await listBestPracticeTopics();
			expect(topics).toContain('web_mapping');
		});
	});
});
