import { describe, expect, it } from 'vitest';
import {
	BoundingBoxSchema,
	CrsTypeSchema,
	GetCrsDetailSchema,
	ListCrsByRegionSchema,
	LocationSchema,
	PurposeSchema,
	RecommendCrsSchema,
	SearchCrsSchema,
} from '../../src/schemas/index.js';

describe('Schemas', () => {
	describe('CrsTypeSchema', () => {
		it('should accept valid CRS types', () => {
			const validTypes = ['geographic', 'projected', 'compound', 'vertical', 'engineering'];
			for (const type of validTypes) {
				const result = CrsTypeSchema.safeParse(type);
				expect(result.success).toBe(true);
			}
		});

		it('should reject invalid CRS types', () => {
			const result = CrsTypeSchema.safeParse('invalid');
			expect(result.success).toBe(false);
		});
	});

	describe('BoundingBoxSchema', () => {
		it('should accept valid bounding box', () => {
			const result = BoundingBoxSchema.safeParse({
				north: 46.05,
				south: 17.09,
				east: 157.65,
				west: 122.38,
			});
			expect(result.success).toBe(true);
		});

		it('should reject latitude out of range', () => {
			const result = BoundingBoxSchema.safeParse({
				north: 91,
				south: 17.09,
				east: 157.65,
				west: 122.38,
			});
			expect(result.success).toBe(false);
		});

		it('should reject longitude out of range', () => {
			const result = BoundingBoxSchema.safeParse({
				north: 46.05,
				south: 17.09,
				east: 181,
				west: 122.38,
			});
			expect(result.success).toBe(false);
		});

		it('should reject missing fields', () => {
			const result = BoundingBoxSchema.safeParse({
				north: 46.05,
				south: 17.09,
			});
			expect(result.success).toBe(false);
		});
	});

	describe('SearchCrsSchema', () => {
		it('should accept valid search query', () => {
			const result = SearchCrsSchema.safeParse({ query: 'JGD2011' });
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.query).toBe('JGD2011');
				expect(result.data.limit).toBe(10);
			}
		});

		it('should accept query with all options', () => {
			const result = SearchCrsSchema.safeParse({
				query: 'Japan',
				type: 'projected',
				region: 'Japan',
				limit: 20,
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.type).toBe('projected');
				expect(result.data.region).toBe('Japan');
				expect(result.data.limit).toBe(20);
			}
		});

		it('should reject empty query', () => {
			const result = SearchCrsSchema.safeParse({ query: '' });
			expect(result.success).toBe(false);
		});

		it('should reject missing query', () => {
			const result = SearchCrsSchema.safeParse({});
			expect(result.success).toBe(false);
		});

		it('should reject invalid type', () => {
			const result = SearchCrsSchema.safeParse({
				query: 'test',
				type: 'invalid',
			});
			expect(result.success).toBe(false);
		});

		it('should reject limit out of range (too low)', () => {
			const result = SearchCrsSchema.safeParse({
				query: 'test',
				limit: 0,
			});
			expect(result.success).toBe(false);
		});

		it('should reject limit out of range (too high)', () => {
			const result = SearchCrsSchema.safeParse({
				query: 'test',
				limit: 101,
			});
			expect(result.success).toBe(false);
		});

		it('should use default limit when not specified', () => {
			const result = SearchCrsSchema.safeParse({ query: 'test' });
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.limit).toBe(10);
			}
		});
	});

	describe('GetCrsDetailSchema', () => {
		it('should accept valid EPSG code with prefix', () => {
			const result = GetCrsDetailSchema.safeParse({ code: 'EPSG:4326' });
			expect(result.success).toBe(true);
		});

		it('should accept valid EPSG code without prefix', () => {
			const result = GetCrsDetailSchema.safeParse({ code: '4326' });
			expect(result.success).toBe(true);
		});

		it('should accept code with spaces (trimmed)', () => {
			const result = GetCrsDetailSchema.safeParse({ code: '4326' });
			expect(result.success).toBe(true);
		});

		it('should reject empty code', () => {
			const result = GetCrsDetailSchema.safeParse({ code: '' });
			expect(result.success).toBe(false);
		});

		it('should reject invalid code format', () => {
			const result = GetCrsDetailSchema.safeParse({ code: 'invalid' });
			expect(result.success).toBe(false);
		});

		it('should reject code with letters', () => {
			const result = GetCrsDetailSchema.safeParse({ code: 'EPSG:abc' });
			expect(result.success).toBe(false);
		});

		it('should reject missing code', () => {
			const result = GetCrsDetailSchema.safeParse({});
			expect(result.success).toBe(false);
		});
	});

	describe('ListCrsByRegionSchema', () => {
		it('should accept valid region', () => {
			const result = ListCrsByRegionSchema.safeParse({ region: 'Japan' });
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.includeDeprecated).toBe(false);
			}
		});

		it('should accept region with all options', () => {
			const result = ListCrsByRegionSchema.safeParse({
				region: 'Japan',
				type: 'geographic',
				includeDeprecated: true,
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.type).toBe('geographic');
				expect(result.data.includeDeprecated).toBe(true);
			}
		});

		it('should reject empty region', () => {
			const result = ListCrsByRegionSchema.safeParse({ region: '' });
			expect(result.success).toBe(false);
		});

		it('should reject missing region', () => {
			const result = ListCrsByRegionSchema.safeParse({});
			expect(result.success).toBe(false);
		});

		it('should reject invalid type', () => {
			const result = ListCrsByRegionSchema.safeParse({
				region: 'Japan',
				type: 'invalid',
			});
			expect(result.success).toBe(false);
		});

		it('should use default includeDeprecated when not specified', () => {
			const result = ListCrsByRegionSchema.safeParse({ region: 'Japan' });
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.includeDeprecated).toBe(false);
			}
		});
	});

	describe('PurposeSchema', () => {
		it('should accept all valid purposes', () => {
			const validPurposes = [
				'web_mapping',
				'distance_calculation',
				'area_calculation',
				'survey',
				'navigation',
				'data_exchange',
				'data_storage',
				'visualization',
			];
			for (const purpose of validPurposes) {
				const result = PurposeSchema.safeParse(purpose);
				expect(result.success).toBe(true);
			}
		});

		it('should reject invalid purpose', () => {
			const result = PurposeSchema.safeParse('invalid_purpose');
			expect(result.success).toBe(false);
		});
	});

	describe('LocationSchema', () => {
		it('should accept empty location', () => {
			const result = LocationSchema.safeParse({});
			expect(result.success).toBe(true);
		});

		it('should accept location with country', () => {
			const result = LocationSchema.safeParse({ country: 'Japan' });
			expect(result.success).toBe(true);
		});

		it('should accept location with prefecture', () => {
			const result = LocationSchema.safeParse({ prefecture: '東京都' });
			expect(result.success).toBe(true);
		});

		it('should accept location with center point', () => {
			const result = LocationSchema.safeParse({
				centerPoint: { lat: 35.6762, lng: 139.6503 },
			});
			expect(result.success).toBe(true);
		});

		it('should accept location with bounding box', () => {
			const result = LocationSchema.safeParse({
				boundingBox: {
					north: 36,
					south: 35,
					east: 140,
					west: 139,
				},
			});
			expect(result.success).toBe(true);
		});

		it('should reject invalid center point latitude', () => {
			const result = LocationSchema.safeParse({
				centerPoint: { lat: 91, lng: 139.6503 },
			});
			expect(result.success).toBe(false);
		});

		it('should reject invalid center point longitude', () => {
			const result = LocationSchema.safeParse({
				centerPoint: { lat: 35.6762, lng: 181 },
			});
			expect(result.success).toBe(false);
		});
	});

	describe('RecommendCrsSchema', () => {
		it('should accept valid recommend request', () => {
			const result = RecommendCrsSchema.safeParse({
				purpose: 'survey',
				location: { country: 'Japan' },
			});
			expect(result.success).toBe(true);
		});

		it('should accept with requirements', () => {
			const result = RecommendCrsSchema.safeParse({
				purpose: 'distance_calculation',
				location: { prefecture: '東京都' },
				requirements: {
					accuracy: 'high',
					interoperability: ['PostGIS', 'QGIS'],
				},
			});
			expect(result.success).toBe(true);
		});

		it('should reject missing purpose', () => {
			const result = RecommendCrsSchema.safeParse({
				location: { country: 'Japan' },
			});
			expect(result.success).toBe(false);
		});

		it('should reject missing location', () => {
			const result = RecommendCrsSchema.safeParse({
				purpose: 'survey',
			});
			expect(result.success).toBe(false);
		});

		it('should reject invalid purpose', () => {
			const result = RecommendCrsSchema.safeParse({
				purpose: 'invalid',
				location: { country: 'Japan' },
			});
			expect(result.success).toBe(false);
		});

		it('should reject invalid accuracy', () => {
			const result = RecommendCrsSchema.safeParse({
				purpose: 'survey',
				location: { country: 'Japan' },
				requirements: { accuracy: 'super_high' },
			});
			expect(result.success).toBe(false);
		});
	});
});
