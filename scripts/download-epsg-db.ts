#!/usr/bin/env npx tsx
/**
 * EPSG レジストリデータベース（SQLite形式）ダウンロードスクリプト
 *
 * EPSG Geodetic Parameter Dataset は IOGP (International Association of Oil & Gas Producers) が
 * 管理・配布しています。
 *
 * ライセンス: IOGP EPSG Geodetic Parameter Dataset Terms of Use
 * https://epsg.org/terms-of-use.html
 *
 * 使用方法:
 *   npx tsx scripts/download-epsg-db.ts [出力パス]
 *
 * 例:
 *   npx tsx scripts/download-epsg-db.ts
 *   npx tsx scripts/download-epsg-db.ts ./data/epsg.db
 */

import { createWriteStream, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { Readable } from 'node:stream';
import { finished } from 'node:stream/promises';

// EPSG レジストリ SQLite DB のダウンロードURL
// 注意: IOGPは直接のSQLiteダウンロードを提供していないため、
// PROJ (https://proj.org/) が配布する epsg.db を使用します
// PROJ は EPSG レジストリデータを SQLite 形式で再配布しています
const EPSG_DB_URL = 'https://cdn.proj.org/epsg.db';

// 代替ソース（PROJのGitHub releases）
const EPSG_DB_URL_ALT = 'https://github.com/OSGeo/PROJ-data/raw/master/epsg.db';

// デフォルト出力パス
const DEFAULT_OUTPUT_PATH = './data/epsg.db';

interface DownloadOptions {
	outputPath: string;
	verbose: boolean;
}

async function downloadFile(url: string, outputPath: string): Promise<void> {
	const response = await fetch(url);

	if (!response.ok) {
		throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
	}

	const outputDir = dirname(outputPath);
	if (!existsSync(outputDir)) {
		mkdirSync(outputDir, { recursive: true });
	}

	const fileStream = createWriteStream(outputPath);
	// Node.js 18+ の fetch は web streams を返すので変換が必要
	const readable = Readable.fromWeb(response.body as import('node:stream/web').ReadableStream);
	await finished(readable.pipe(fileStream));
}

async function downloadEpsgDb(options: DownloadOptions): Promise<void> {
	const { outputPath, verbose } = options;
	const absolutePath = resolve(outputPath);

	console.log('EPSG レジストリデータベースのダウンロード');
	console.log('=========================================');
	console.log();
	console.log('ライセンス: IOGP EPSG Geodetic Parameter Dataset Terms of Use');
	console.log('https://epsg.org/terms-of-use.html');
	console.log();

	if (existsSync(absolutePath)) {
		console.log(`既存のファイルが見つかりました: ${absolutePath}`);
		console.log('上書きします...');
		console.log();
	}

	console.log(`ダウンロード元: ${EPSG_DB_URL}`);
	console.log(`出力先: ${absolutePath}`);
	console.log();

	try {
		if (verbose) {
			console.log('ダウンロード中...');
		}
		await downloadFile(EPSG_DB_URL, absolutePath);
		console.log('✅ ダウンロード完了');
	} catch (error) {
		console.log(`プライマリソースからのダウンロードに失敗しました: ${error}`);
		console.log(`代替ソースを試行します: ${EPSG_DB_URL_ALT}`);
		console.log();

		try {
			await downloadFile(EPSG_DB_URL_ALT, absolutePath);
			console.log('✅ ダウンロード完了（代替ソース）');
		} catch (altError) {
			console.error('❌ ダウンロードに失敗しました');
			console.error(`エラー: ${altError}`);
			process.exit(1);
		}
	}

	console.log();
	console.log('セットアップ手順:');
	console.log('----------------');
	console.log('1. 環境変数 EPSG_DB_PATH にダウンロードしたDBファイルのパスを設定');
	console.log(`   export EPSG_DB_PATH="${absolutePath}"`);
	console.log();
	console.log('2. MCP設定で環境変数を指定（Claude Desktop の場合）:');
	console.log('   {');
	console.log('     "mcpServers": {');
	console.log('       "epsg": {');
	console.log('         "command": "npx",');
	console.log('         "args": ["-y", "@shuji-bonji/epsg-mcp"],');
	console.log('         "env": {');
	console.log(`           "EPSG_DB_PATH": "${absolutePath}"`);
	console.log('         }');
	console.log('       }');
	console.log('     }');
	console.log('   }');
	console.log();
	console.log('注意: SQLite 機能を使用するには sql.js パッケージが必要です');
	console.log('      npm install sql.js');
}

// メイン処理
const args = process.argv.slice(2);
const outputPath = args[0] || DEFAULT_OUTPUT_PATH;
const verbose = args.includes('-v') || args.includes('--verbose');

downloadEpsgDb({ outputPath, verbose });
