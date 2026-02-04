/**
 * Country Knowledge Pack 管理システム
 *
 * パックのロード、登録、検索を管理
 * 環境変数 EPSG_PACKS で有効にするパックを制御
 */

import type { CountryPack, LocationSpec, PackMetadata } from '../types/index.js';
import { debug, info } from '../utils/logger.js';

/** 登録済みパック */
const registeredPacks: Map<string, CountryPack> = new Map();

/** パックロード済みフラグ */
let packsLoaded = false;

/**
 * パックを登録
 */
export function registerPack(pack: CountryPack): void {
	const { countryCode } = pack.metadata;
	registeredPacks.set(countryCode.toUpperCase(), pack);
	info(`Registered country pack: ${pack.metadata.name} (${countryCode})`);
}

/**
 * 国コードエイリアス（ISO 3166-1 alpha-2/alpha-3 と通称の対応）
 */
const COUNTRY_CODE_ALIASES: Record<string, string> = {
	GB: 'UK', // Great Britain → United Kingdom
	GBR: 'UK',
	USA: 'US',
	JPN: 'JP',
};

/**
 * 国コードを正規化（エイリアス解決）
 */
function normalizeCountryCode(code: string): string {
	const upper = code.toUpperCase();
	return COUNTRY_CODE_ALIASES[upper] || upper;
}

/**
 * 国コードからパックを取得
 */
export function getPackForCountry(countryCode: string): CountryPack | null {
	const normalized = normalizeCountryCode(countryCode);
	return registeredPacks.get(normalized) || null;
}

/**
 * 登録済みパック一覧
 */
export function getRegisteredPacks(): PackMetadata[] {
	return Array.from(registeredPacks.values()).map((p) => p.metadata);
}

/**
 * LocationSpec から該当パックを探す
 */
export function findPackForLocation(location: LocationSpec): CountryPack | null {
	// 1. country が明示されている場合
	if (location.country && location.country !== 'GLOBAL') {
		return getPackForCountry(location.country);
	}

	// 2. 各パックの isLocationInCountry で判定
	for (const pack of registeredPacks.values()) {
		if (pack.isLocationInCountry(location)) {
			return pack;
		}
	}

	return null;
}

/**
 * パックコードから動的インポート
 */
async function importPack(code: string): Promise<CountryPack | null> {
	try {
		switch (code.toLowerCase()) {
			case 'jp': {
				const { createJpPack } = await import('./jp/index.js');
				return createJpPack();
			}
			case 'us': {
				const { createUsPack } = await import('./us/index.js');
				return createUsPack();
			}
			case 'uk':
			case 'gb': {
				const { createUkPack } = await import('./uk/index.js');
				return createUkPack();
			}
			default:
				debug(`Unknown pack code: ${code}`);
				return null;
		}
	} catch (err) {
		debug(`Failed to import pack '${code}': ${err}`);
		return null;
	}
}

/**
 * 環境変数からパックをロード
 *
 * EPSG_PACKS 環境変数で有効にするパックを指定（カンマ区切り）
 * 未指定時は "jp" がデフォルト（後方互換性維持）
 */
export async function loadPacksFromEnv(): Promise<void> {
	// 二重ロード防止
	if (packsLoaded) {
		return;
	}

	const packsEnv = process.env.EPSG_PACKS ?? 'jp';
	const packCodes = packsEnv
		.split(',')
		.map((s) => s.trim().toLowerCase())
		.filter((s) => s.length > 0);

	for (const code of packCodes) {
		try {
			const pack = await importPack(code);
			if (pack) {
				registerPack(pack);
			}
		} catch (err) {
			// パックのロード失敗はサーバー起動を止めない
			debug(`Failed to load pack '${code}': ${err}`);
		}
	}

	packsLoaded = true;
}

/**
 * パックがロード済みかどうかを確認
 */
export function arePacksLoaded(): boolean {
	return packsLoaded;
}

/**
 * テスト用: パックをクリア
 */
export function clearPacks(): void {
	registeredPacks.clear();
	packsLoaded = false;
}

/**
 * 全パックからCRSを検索
 */
export async function findCrsInPacks(
	code: string
): Promise<{ pack: CountryPack; crs: import('../types/index.js').CrsDetail } | null> {
	const normalizedCode = code.startsWith('EPSG:') ? code : `EPSG:${code}`;

	for (const pack of registeredPacks.values()) {
		const crsData = await pack.getCrsData();
		const crs = crsData.geographicCRS[normalizedCode] || crsData.projectedCRS[normalizedCode];
		if (crs) {
			return { pack, crs };
		}
	}

	return null;
}
