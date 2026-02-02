/**
 * SQLite EPSG Registry ローダー
 *
 * EPSG レジストリDB (sqlite) を任意で読み込み、
 * Pack にない CRS の基本情報を提供する
 *
 * sql.js は optionalDependencies のため、インストールされていなくても動作する
 */

import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CrsDetail, CrsType } from '../types/index.js';
import { debug, info, warn } from '../utils/logger.js';

// sql.js の型定義（簡易版）
interface SqlJsDatabase {
	exec(sql: string): SqlJsQueryResult[];
	close(): void;
}

interface SqlJsQueryResult {
	columns: string[];
	values: unknown[][];
}

// モジュールレベル変数
// biome-ignore lint/suspicious/noExplicitAny: sql.js types are complex and not well-defined
let sqlJsFactory: any = null;
let db: SqlJsDatabase | null = null;
let sqliteAvailable = false;

/**
 * sql.js を動的にロードし、DBを初期化
 *
 * @param dbPath - SQLite DBファイルのパス
 * @returns 初期化成功時 true
 */
export async function initSqliteDb(dbPath: string): Promise<boolean> {
	if (!existsSync(dbPath)) {
		debug(`SQLite DB not found: ${dbPath}`);
		return false;
	}

	try {
		// sql.js を動的 import（optionalDependencies のため失敗することがある）
		const sqlJsModule = await import('sql.js');
		const initSqlJs = sqlJsModule.default;

		// WASM ファイルのパス解決
		const __dirname = dirname(fileURLToPath(import.meta.url));
		const wasmPath = join(__dirname, 'sql-wasm.wasm');

		sqlJsFactory = await initSqlJs({
			locateFile: (file: string) => {
				// 同梱 WASM があればそちらを優先
				if (existsSync(wasmPath)) {
					return wasmPath;
				}
				// なければデフォルト動作（node_modules から解決）
				return file;
			},
		});

		const buffer = await readFile(dbPath);
		db = new sqlJsFactory.Database(buffer) as SqlJsDatabase;
		sqliteAvailable = true;
		info(`EPSG SQLite DB loaded: ${dbPath}`);
		return true;
	} catch (err) {
		// sql.js 未インストール or DB読み込み失敗
		debug(`SQLite DB not available: ${err}`);
		sqliteAvailable = false;
		return false;
	}
}

/**
 * SQLite が利用可能かどうか
 */
export function isSqliteAvailable(): boolean {
	return sqliteAvailable && db !== null;
}

/**
 * EPSG コードから CRS を検索
 *
 * @param code - EPSG コード（例: "4326" or "EPSG:4326"）
 * @returns CrsDetail または undefined
 */
export function findCrsBySqlite(code: string): CrsDetail | undefined {
	if (!db) return undefined;

	const numericCode = code.replace(/^EPSG:/i, '');

	try {
		// EPSG レジストリの構造に合わせたクエリ
		// 実際のテーブル構造に応じて調整が必要
		const results = db.exec(`
			SELECT
				coord_ref_sys_code,
				coord_ref_sys_name,
				coord_ref_sys_kind,
				area_of_use_code,
				deprecated
			FROM epsg_coordinatereferencesystem
			WHERE coord_ref_sys_code = ${numericCode}
		`);

		if (results.length === 0 || results[0].values.length === 0) {
			return undefined;
		}

		const row = results[0].values[0];
		return mapRowToCrsDetail(row, results[0].columns);
	} catch (err) {
		warn(`SQLite query failed: ${err}`);
		return undefined;
	}
}

/**
 * キーワードで CRS を検索
 *
 * @param query - 検索クエリ
 * @param limit - 最大件数
 * @returns CrsDetail の配列
 */
export function searchCrsBySqlite(query: string, limit = 10): CrsDetail[] {
	if (!db) return [];

	try {
		// 名前での部分一致検索
		const escapedQuery = query.replace(/'/g, "''");
		const results = db.exec(`
			SELECT
				coord_ref_sys_code,
				coord_ref_sys_name,
				coord_ref_sys_kind,
				area_of_use_code,
				deprecated
			FROM epsg_coordinatereferencesystem
			WHERE coord_ref_sys_name LIKE '%${escapedQuery}%'
			   OR CAST(coord_ref_sys_code AS TEXT) LIKE '%${escapedQuery}%'
			ORDER BY
				CASE WHEN deprecated = 0 THEN 0 ELSE 1 END,
				coord_ref_sys_code
			LIMIT ${limit}
		`);

		if (results.length === 0) {
			return [];
		}

		return results[0].values.map((row) => mapRowToCrsDetail(row, results[0].columns));
	} catch (err) {
		warn(`SQLite search failed: ${err}`);
		return [];
	}
}

/**
 * DB 行を CrsDetail に変換
 */
function mapRowToCrsDetail(row: unknown[], columns: string[]): CrsDetail {
	const getValue = (col: string): unknown => {
		const idx = columns.indexOf(col);
		return idx >= 0 ? row[idx] : undefined;
	};

	const code = getValue('coord_ref_sys_code');
	const name = getValue('coord_ref_sys_name');
	const kind = getValue('coord_ref_sys_kind');
	const deprecated = getValue('deprecated');

	// CRS 種別のマッピング
	const typeMap: Record<string, CrsType> = {
		geographic2D: 'geographic',
		geographic3D: 'geographic',
		projected: 'projected',
		compound: 'compound',
		vertical: 'vertical',
		engineering: 'engineering',
	};

	return {
		code: `EPSG:${code}`,
		name: String(name || ''),
		type: typeMap[String(kind)] || 'geographic',
		deprecated: deprecated === 1,
		remarks: 'Data from EPSG Registry (SQLite)',
		areaOfUse: {
			description: 'See EPSG Registry for details',
		},
	};
}

/**
 * 地域名で CRS を検索
 *
 * @param region - 地域名（例: "France", "Germany"）
 * @param limit - 最大件数
 * @returns CrsDetail の配列
 */
export function listCrsByRegionSqlite(region: string, limit = 50): CrsDetail[] {
	if (!db) return [];

	try {
		const escapedRegion = region.replace(/'/g, "''");
		const results = db.exec(`
			SELECT
				c.coord_ref_sys_code,
				c.coord_ref_sys_name,
				c.coord_ref_sys_kind,
				c.area_of_use_code,
				c.deprecated
			FROM epsg_coordinatereferencesystem c
			JOIN epsg_area a ON c.area_of_use_code = a.area_code
			WHERE a.area_name LIKE '%${escapedRegion}%'
			   AND c.deprecated = 0
			ORDER BY c.coord_ref_sys_code
			LIMIT ${limit}
		`);

		if (results.length === 0) {
			return [];
		}

		return results[0].values.map((row) => mapRowToCrsDetail(row, results[0].columns));
	} catch (err) {
		warn(`SQLite region search failed: ${err}`);
		return [];
	}
}

/**
 * DB を閉じる
 */
export function closeSqliteDb(): void {
	if (db) {
		db.close();
		db = null;
		sqliteAvailable = false;
		debug('SQLite DB closed');
	}
}

/**
 * テスト用: 状態をリセット
 */
export function resetSqliteState(): void {
	closeSqliteDb();
	sqlJsFactory = null;
}
