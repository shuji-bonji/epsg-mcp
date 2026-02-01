/**
 * ロガーユーティリティ
 */

export function info(message: string, ...args: unknown[]): void {
	console.error(`[INFO] ${message}`, ...args);
}

export function error(message: string, ...args: unknown[]): void {
	console.error(`[ERROR] ${message}`, ...args);
}

export function debug(message: string, ...args: unknown[]): void {
	if (process.env.DEBUG) {
		console.error(`[DEBUG] ${message}`, ...args);
	}
}

export class PerformanceTimer {
	private startTime: number;

	constructor(private label: string) {
		this.startTime = Date.now();
	}

	end(): number {
		const elapsed = Date.now() - this.startTime;
		debug(`${this.label}: ${elapsed}ms`);
		return elapsed;
	}
}
