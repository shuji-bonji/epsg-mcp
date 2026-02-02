#!/usr/bin/env node

/**
 * EPSG MCP Server
 * 座標参照系（CRS）に関する知識提供MCPサーバー
 */

import { createRequire } from 'node:module';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { preloadAll } from './data/loader.js';
import { initSqliteDb, isSqliteAvailable } from './data/sqlite-loader.js';
import { formatErrorResponse } from './errors/index.js';
import { getRegisteredPacks, loadPacksFromEnv } from './packs/pack-manager.js';
import { tools } from './tools/definitions.js';
import { toolHandlers } from './tools/handlers.js';
import { error, info, PerformanceTimer } from './utils/logger.js';

const require = createRequire(import.meta.url);
const { version } = require('../package.json');

const server = new Server(
	{
		name: 'epsg-mcp',
		version,
	},
	{
		capabilities: {
			tools: {},
		},
	}
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
	return { tools };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
	const { name, arguments: args } = request.params;

	try {
		const handler = toolHandlers[name];
		if (!handler) {
			throw new Error(`Unknown tool: ${name}`);
		}

		const result = await handler(args);
		return {
			content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
		};
	} catch (err) {
		const formatted = formatErrorResponse(err);
		error(`Tool ${name} failed`, { error: formatted.text });
		return {
			content: [{ type: 'text', text: JSON.stringify(formatted, null, 2) }],
			isError: true,
		};
	}
});

async function main() {
	info('EPSG MCP Server: Preloading data...');
	const timer = new PerformanceTimer('preload');

	// Load country packs, static data, and optionally SQLite DB in parallel
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

	const transport = new StdioServerTransport();
	await server.connect(transport);
	info('EPSG MCP Server running on stdio');
}

main().catch((err) => {
	error('Failed to start server', { error: err instanceof Error ? err.message : String(err) });
	process.exit(1);
});
