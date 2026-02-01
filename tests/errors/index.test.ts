import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
	DataLoadError,
	formatErrorResponse,
	NotFoundError,
	ValidationError,
} from '../../src/errors/index.js';

describe('Error Handling', () => {
	describe('ValidationError', () => {
		it('should create from ZodError', () => {
			const schema = z.object({ name: z.string() });
			const result = schema.safeParse({ name: 123 });
			if (!result.success) {
				const error = new ValidationError(result.error);
				expect(error.name).toBe('ValidationError');
				expect(error.message).toContain('Validation failed');
				expect(error.zodError).toBe(result.error);
			}
		});

		it('should include field path in message', () => {
			const schema = z.object({
				query: z.string().min(1),
			});
			const result = schema.safeParse({ query: '' });
			if (!result.success) {
				const error = new ValidationError(result.error);
				expect(error.message).toContain('query');
			}
		});

		it('should handle multiple validation errors', () => {
			const schema = z.object({
				query: z.string().min(1),
				limit: z.number().min(1),
			});
			const result = schema.safeParse({ query: '', limit: 0 });
			if (!result.success) {
				const error = new ValidationError(result.error);
				expect(error.message).toContain('query');
				expect(error.message).toContain('limit');
			}
		});

		it('should handle nested field paths', () => {
			const schema = z.object({
				location: z.object({
					centerPoint: z.object({
						lat: z.number().min(-90).max(90),
					}),
				}),
			});
			const result = schema.safeParse({
				location: { centerPoint: { lat: 100 } },
			});
			if (!result.success) {
				const error = new ValidationError(result.error);
				expect(error.message).toContain('location.centerPoint.lat');
			}
		});
	});

	describe('NotFoundError', () => {
		it('should create with resource type and identifier', () => {
			const error = new NotFoundError('CRS', 'EPSG:99999');
			expect(error.name).toBe('NotFoundError');
			expect(error.message).toBe('CRS not found: EPSG:99999');
			expect(error.resourceType).toBe('CRS');
			expect(error.identifier).toBe('EPSG:99999');
		});

		it('should work with different resource types', () => {
			const error = new NotFoundError('Datum', 'WGS84');
			expect(error.message).toBe('Datum not found: WGS84');
		});
	});

	describe('DataLoadError', () => {
		it('should create with source', () => {
			const error = new DataLoadError('japan-crs.json');
			expect(error.name).toBe('DataLoadError');
			expect(error.message).toContain('japan-crs.json');
			expect(error.source).toBe('japan-crs.json');
		});

		it('should include cause error message', () => {
			const cause = new Error('File not found');
			const error = new DataLoadError('japan-crs.json', cause);
			expect(error.message).toContain('File not found');
			expect(error.cause).toBe(cause);
		});

		it('should handle undefined cause', () => {
			const error = new DataLoadError('japan-crs.json');
			expect(error.message).toContain('Unknown error');
		});
	});

	describe('formatErrorResponse', () => {
		it('should format ValidationError', () => {
			const schema = z.object({ name: z.string() });
			const result = schema.safeParse({ name: 123 });
			if (!result.success) {
				const error = new ValidationError(result.error);
				const response = formatErrorResponse(error);
				expect(response.code).toBe('VALIDATION_ERROR');
				expect(response.text).toContain('Validation failed');
			}
		});

		it('should format NotFoundError', () => {
			const error = new NotFoundError('CRS', '99999');
			const response = formatErrorResponse(error);
			expect(response.code).toBe('NOT_FOUND');
			expect(response.text).toContain('CRS not found');
		});

		it('should format DataLoadError', () => {
			const error = new DataLoadError('test.json');
			const response = formatErrorResponse(error);
			expect(response.code).toBe('DATA_LOAD_ERROR');
			expect(response.text).toContain('test.json');
		});

		it('should format generic Error', () => {
			const error = new Error('Something went wrong');
			const response = formatErrorResponse(error);
			expect(response.code).toBe('INTERNAL_ERROR');
			expect(response.text).toBe('Something went wrong');
		});

		it('should format non-Error values', () => {
			const response = formatErrorResponse('string error');
			expect(response.code).toBe('UNKNOWN_ERROR');
			expect(response.text).toBe('string error');
		});

		it('should format null/undefined', () => {
			const response = formatErrorResponse(null);
			expect(response.code).toBe('UNKNOWN_ERROR');
			expect(response.text).toBe('null');
		});
	});
});
