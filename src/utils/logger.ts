/**
 * ロガーユーティリティ
 * ログレベル制御と構造化ログ出力をサポート
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogConfig {
	level: LogLevel;
	structured: boolean;
}

const LOG_LEVELS: Record<LogLevel, number> = {
	debug: 0,
	info: 1,
	warn: 2,
	error: 3,
};

let config: LogConfig = {
	level: (process.env.LOG_LEVEL as LogLevel) || 'info',
	structured: process.env.LOG_FORMAT === 'json',
};

function shouldLog(level: LogLevel): boolean {
	return LOG_LEVELS[level] >= LOG_LEVELS[config.level];
}

function formatMessage(level: LogLevel, message: string, meta?: Record<string, unknown>): string {
	if (config.structured) {
		return JSON.stringify({
			timestamp: new Date().toISOString(),
			level,
			message,
			...meta,
		});
	}
	const metaStr = meta && Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
	return `[${level.toUpperCase()}] ${message}${metaStr}`;
}

export function info(message: string, meta?: Record<string, unknown>): void {
	if (shouldLog('info')) {
		console.error(formatMessage('info', message, meta));
	}
}

export function warn(message: string, meta?: Record<string, unknown>): void {
	if (shouldLog('warn')) {
		console.error(formatMessage('warn', message, meta));
	}
}

export function error(message: string, meta?: Record<string, unknown>): void {
	if (shouldLog('error')) {
		console.error(formatMessage('error', message, meta));
	}
}

export function debug(message: string, meta?: Record<string, unknown>): void {
	// DEBUG環境変数が設定されているか、ログレベルがdebugの場合に出力
	if (process.env.DEBUG || shouldLog('debug')) {
		console.error(formatMessage('debug', message, meta));
	}
}

/**
 * ログ設定を変更
 */
export function setLogConfig(newConfig: Partial<LogConfig>): void {
	config = { ...config, ...newConfig };
}

/**
 * 現在のログ設定を取得
 */
export function getLogConfig(): LogConfig {
	return { ...config };
}

/**
 * ログ設定をリセット
 */
export function resetLogConfig(): void {
	config = {
		level: (process.env.LOG_LEVEL as LogLevel) || 'info',
		structured: process.env.LOG_FORMAT === 'json',
	};
}

/**
 * パフォーマンス計測用タイマー
 */
export class PerformanceTimer {
	private startTime: number;

	constructor(private label: string) {
		this.startTime = Date.now();
	}

	end(): number {
		const elapsed = Date.now() - this.startTime;
		debug(this.label, { elapsed_ms: elapsed });
		return elapsed;
	}
}
