/**
 * エラーハンドリング
 */

import type { ZodError } from 'zod';

export class ValidationError extends Error {
	constructor(public zodError: ZodError) {
		const messages = zodError.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
		super(`Validation failed: ${messages}`);
		this.name = 'ValidationError';
	}
}

export class NotFoundError extends Error {
	constructor(
		public resourceType: string,
		public identifier: string
	) {
		super(`${resourceType} not found: ${identifier}`);
		this.name = 'NotFoundError';
	}
}

export class DataLoadError extends Error {
	constructor(
		public source: string,
		cause?: Error
	) {
		super(`Failed to load data from ${source}: ${cause?.message || 'Unknown error'}`);
		this.name = 'DataLoadError';
		this.cause = cause;
	}
}

export interface ErrorResponse {
	text: string;
	code?: string;
}

export function formatErrorResponse(error: unknown): ErrorResponse {
	if (error instanceof ValidationError) {
		return {
			text: error.message,
			code: 'VALIDATION_ERROR',
		};
	}

	if (error instanceof NotFoundError) {
		return {
			text: error.message,
			code: 'NOT_FOUND',
		};
	}

	if (error instanceof DataLoadError) {
		return {
			text: error.message,
			code: 'DATA_LOAD_ERROR',
		};
	}

	if (error instanceof Error) {
		return {
			text: error.message,
			code: 'INTERNAL_ERROR',
		};
	}

	return {
		text: String(error),
		code: 'UNKNOWN_ERROR',
	};
}
