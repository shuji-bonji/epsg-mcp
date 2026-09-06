/**
 * MCP サーバー結合テスト
 *
 * createServer() が組み立てたサーバーに MCP クライアントを接続し、
 * tools/list と tools/call を MCP のプロトコル経由で検証する。
 */

import { Client, InMemoryTransport } from '@modelcontextprotocol/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { clearCache, preloadAll } from '../src/data/loader.js';
import { createServer, SERVER_NAME } from '../src/server.js';
import { tools } from '../src/tools/definitions.js';

type JsonSchema = {
	type?: string;
	description?: string;
	properties?: Record<string, JsonSchema>;
	required?: string[];
	enum?: string[];
	items?: JsonSchema;
	default?: unknown;
};

/** プロパティを再帰的にたどり、description が無いものの JSON パスを集める */
function collectMissingDescriptions(schema: JsonSchema, path: string, out: string[]): void {
	for (const [key, prop] of Object.entries(schema.properties ?? {})) {
		const here = `${path}.${key}`;
		if (!prop.description) {
			out.push(here);
		}
		if (prop.properties) {
			collectMissingDescriptions(prop, here, out);
		}
	}
}

// tools/list に出る必須プロパティの期待値（v0.9.x の definitions.ts と同じ）
const EXPECTED_REQUIRED: Record<string, string[]> = {
	search_crs: ['query'],
	get_crs_detail: ['code'],
	list_crs_by_region: ['region'],
	recommend_crs: ['purpose', 'location'],
	validate_crs_usage: ['crs', 'purpose', 'location'],
	suggest_transformation: ['sourceCrs', 'targetCrs'],
	compare_crs: ['crs1', 'crs2'],
	get_best_practices: ['topic'],
	troubleshoot: ['symptom'],
};

describe('MCP server (createServer)', () => {
	let client: Client;

	beforeAll(async () => {
		await preloadAll();
		const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
		const server = createServer();
		await server.connect(serverTransport);
		client = new Client({ name: 'epsg-mcp-test', version: '0.0.0' });
		await client.connect(clientTransport);
	});

	afterAll(async () => {
		await client.close();
		clearCache();
	});

	it('reports the server name', () => {
		expect(client.getServerVersion()?.name).toBe(SERVER_NAME);
	});

	it('lists all 9 tools in definition order', async () => {
		const { tools: listed } = await client.listTools();
		expect(listed.map((t) => t.name)).toEqual(tools.map((t) => t.name));
	});

	it('exposes a description on every tool and every input property', async () => {
		const { tools: listed } = await client.listTools();
		for (const tool of listed) {
			expect(tool.description, tool.name).toBeTruthy();
			const missing: string[] = [];
			collectMissingDescriptions(tool.inputSchema as JsonSchema, tool.name, missing);
			expect(missing, `properties without description in ${tool.name}`).toEqual([]);
		}
	});

	it('keeps the required properties of each tool', async () => {
		const { tools: listed } = await client.listTools();
		for (const tool of listed) {
			const schema = tool.inputSchema as JsonSchema;
			expect(schema.required ?? [], tool.name).toEqual(EXPECTED_REQUIRED[tool.name]);
		}
	});

	it('emits enum and default values from the Zod schemas', async () => {
		const { tools: listed } = await client.listTools();
		const search = listed.find((t) => t.name === 'search_crs')?.inputSchema as JsonSchema;
		expect(search.properties?.limit?.default).toBe(10);
		expect(search.properties?.type?.enum).toEqual([
			'geographic',
			'projected',
			'compound',
			'vertical',
			'engineering',
		]);

		const recommend = listed.find((t) => t.name === 'recommend_crs')?.inputSchema as JsonSchema;
		expect(recommend.properties?.purpose?.enum).toContain('survey');
		expect(recommend.properties?.location?.properties?.subdivision).toBeDefined();
	});

	it('calls search_crs and returns JSON text', async () => {
		const result = await client.callTool({ name: 'search_crs', arguments: { query: 'JGD2011' } });
		expect(result.isError).toBeFalsy();
		const content = result.content as Array<{ type: string; text: string }>;
		expect(content[0].type).toBe('text');
		const parsed = JSON.parse(content[0].text);
		expect(parsed.results.length).toBeGreaterThan(0);
	});

	it('applies the default limit when omitted', async () => {
		const result = await client.callTool({ name: 'search_crs', arguments: { query: 'JGD' } });
		const content = result.content as Array<{ type: string; text: string }>;
		const parsed = JSON.parse(content[0].text);
		expect(parsed.results.length).toBeLessThanOrEqual(10);
	});

	it('rejects invalid input before the handler runs (SDK validation)', async () => {
		const result = await client.callTool({ name: 'recommend_crs', arguments: { purpose: 'xxx' } });
		expect(result.isError).toBe(true);
		const content = result.content as Array<{ type: string; text: string }>;
		expect(content[0].text).toContain('Input validation error');
		expect(content[0].text).toContain('purpose');
	});

	it('returns a formatted NOT_FOUND error for an unknown EPSG code', async () => {
		const result = await client.callTool({ name: 'get_crs_detail', arguments: { code: '999999' } });
		expect(result.isError).toBe(true);
		const content = result.content as Array<{ type: string; text: string }>;
		expect(JSON.parse(content[0].text).code).toBe('NOT_FOUND');
	});
});
