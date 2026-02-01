#!/usr/bin/env node

/**
 * EPSG MCP Server
 * 座標参照系（CRS）に関する知識提供MCPサーバー
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { preloadAll } from './data/loader.js';
import { formatErrorResponse } from './errors/index.js';
import { tools } from './tools/definitions.js';
import { toolHandlers } from './tools/handlers.js';
import { error, info, PerformanceTimer } from './utils/logger.js';

const server = new Server(
	{
		name: 'epsg-mcp',
		version: '1.0.0',
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

	await preloadAll();

	const loadTime = timer.end();
	info(`EPSG MCP Server: Data loaded in ${loadTime}ms`);

	const transport = new StdioServerTransport();
	await server.connect(transport);
	info('EPSG MCP Server running on stdio');
}

main().catch((err) => {
	error('Failed to start server', { error: err instanceof Error ? err.message : String(err) });
	process.exit(1);
});
