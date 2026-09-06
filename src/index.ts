#!/usr/bin/env node

/**
 * EPSG MCP Server
 * 座標参照系（CRS）に関する知識提供MCPサーバー
 */

import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { preloadAll } from './data/loader.js';
import { initSqliteDb, isSqliteAvailable } from './data/sqlite-loader.js';
import { getRegisteredPacks, loadPacksFromEnv } from './packs/pack-manager.js';
import { createServer } from './server.js';
import { error, info, PerformanceTimer } from './utils/logger.js';

/**
 * Country Pack・静的データ・（任意の）SQLite DB をプロセス起動時に一度だけ読み込む。
 */
async function preload(): Promise<void> {
	info('EPSG MCP Server: Preloading data...');
	const timer = new PerformanceTimer('preload');

	const epsgDbPath = process.env.EPSG_DB_PATH;
	const loadTasks: Promise<unknown>[] = [loadPacksFromEnv(), preloadAll()];

	if (epsgDbPath) {
		loadTasks.push(initSqliteDb(epsgDbPath));
	}

	await Promise.all(loadTasks);

	const loadTime = timer.end();
	const packs = getRegisteredPacks();
	const sqliteStatus = isSqliteAvailable() ? 'SQLite: enabled' : '';
	info(
		`EPSG MCP Server: Data loaded in ${loadTime}ms (${packs.length} pack(s): ${packs.map((p) => p.countryCode).join(', ') || 'none'}${sqliteStatus ? `, ${sqliteStatus}` : ''})`
	);
}

async function main(): Promise<void> {
	await preload();

	const handle = serveStdio(() => createServer(), {
		onerror: (err) => error('stdio transport error', { error: err.message }),
	});

	const shutdown = () => {
		void handle.close().finally(() => process.exit(0));
	};
	process.on('SIGINT', shutdown);
	process.on('SIGTERM', shutdown);

	info('EPSG MCP Server running on stdio');
}

main().catch((err) => {
	error('Failed to start server', { error: err instanceof Error ? err.message : String(err) });
	process.exit(1);
});
