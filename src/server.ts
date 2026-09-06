/**
 * MCP サーバーの組み立て
 */

import { createRequire } from 'node:module';
import { McpServer } from '@modelcontextprotocol/server';
import { formatErrorResponse } from './errors/index.js';
import { tools } from './tools/definitions.js';
import { toolHandlers } from './tools/handlers.js';
import { error } from './utils/logger.js';

const require = createRequire(import.meta.url);
const { version } = require('../package.json');

export const SERVER_NAME = 'epsg-mcp';
export const SERVER_VERSION: string = version;

/**
 * MCP サーバーインスタンスを生成し、全ツールを登録する。
 *
 * serveStdio のファクトリーとして呼ばれる。stdio では接続は 1 本なので、
 * このファクトリーはプロセスの生存中に 1 回だけ呼ばれる。
 * データのプリロードはプロセス単位で行うため、ここではなく preload() で行う。
 */
export function createServer(): McpServer {
	const server = new McpServer(
		{ name: SERVER_NAME, version: SERVER_VERSION },
		{ capabilities: { tools: {} } }
	);

	for (const tool of tools) {
		const handler = toolHandlers[tool.name];
		if (!handler) {
			throw new Error(`No handler registered for tool: ${tool.name}`);
		}

		server.registerTool(
			tool.name,
			{ description: tool.description, inputSchema: tool.inputSchema },
			async (args: unknown) => {
				try {
					const result = await handler(args);
					return {
						content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
					};
				} catch (err) {
					const formatted = formatErrorResponse(err);
					error(`Tool ${tool.name} failed`, { error: formatted.text });
					return {
						content: [{ type: 'text', text: JSON.stringify(formatted, null, 2) }],
						isError: true,
					};
				}
			}
		);
	}

	return server;
}
