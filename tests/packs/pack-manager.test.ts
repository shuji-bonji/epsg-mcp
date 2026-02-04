/**
 * Pack Manager テスト
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createJpPack } from '../../src/packs/jp/index.js';
import {
	arePacksLoaded,
	clearPacks,
	findCrsInPacks,
	findPackForLocation,
	getPackForCountry,
	getRegisteredPacks,
	loadPacksFromEnv,
	registerPack,
} from '../../src/packs/pack-manager.js';
import type { CountryPack, LocationSpec } from '../../src/types/index.js';

describe('Pack Manager', () => {
	beforeEach(() => {
		clearPacks();
	});

	afterEach(() => {
		clearPacks();
		vi.unstubAllEnvs();
	});

	describe('registerPack', () => {
		it('should register a pack', () => {
			const pack = createJpPack();
			registerPack(pack);
			expect(getRegisteredPacks()).toHaveLength(1);
			expect(getRegisteredPacks()[0].countryCode).toBe('JP');
		});

		it('should register multiple packs', () => {
			const jpPack = createJpPack();
			registerPack(jpPack);

			// Create a mock US pack for testing
			const mockUsPack: CountryPack = {
				metadata: {
					countryCode: 'US',
					name: 'Mock US Pack',
					version: '1.0.0',
					primaryDatum: 'NAD83',
					description: 'Mock US Pack for testing',
					language: 'en',
				},
				getCrsData: async () => ({ geographicCRS: {}, projectedCRS: {} }),
				getZoneMapping: async () => ({ entries: {} }),
				getRecommendationRules: async () => ({ purposeRules: {} }),
				getValidationRules: async () => [],
				getTransformationKnowledge: async () => ({
					transformations: [],
					hubCrs: [],
					deprecatedCrs: [],
				}),
				getBestPractices: async () => [],
				getTroubleshootingGuides: async () => [],
				selectZoneForLocation: async () => null,
				isLocationInCountry: () => false,
				getCountryBounds: () => ({ north: 50, south: 25, east: -66, west: -125 }),
			};
			registerPack(mockUsPack);

			expect(getRegisteredPacks()).toHaveLength(2);
		});
	});

	describe('getPackForCountry', () => {
		it('should return registered pack by country code', () => {
			const pack = createJpPack();
			registerPack(pack);

			const retrieved = getPackForCountry('JP');
			expect(retrieved).not.toBeNull();
			expect(retrieved?.metadata.countryCode).toBe('JP');
		});

		it('should return pack regardless of case', () => {
			const pack = createJpPack();
			registerPack(pack);

			expect(getPackForCountry('jp')).not.toBeNull();
			expect(getPackForCountry('Jp')).not.toBeNull();
		});

		it('should return null for unregistered country', () => {
			const pack = createJpPack();
			registerPack(pack);

			expect(getPackForCountry('US')).toBeNull();
		});
	});

	describe('findPackForLocation', () => {
		it('should find pack by country field', () => {
			const pack = createJpPack();
			registerPack(pack);

			const location: LocationSpec = { country: 'JP' };
			const found = findPackForLocation(location);
			expect(found).not.toBeNull();
			expect(found?.metadata.countryCode).toBe('JP');
		});

		it('should find pack by isLocationInCountry check', () => {
			const pack = createJpPack();
			registerPack(pack);

			// No country specified, but prefecture is Japanese
			const location: LocationSpec = { prefecture: '東京都' };
			const found = findPackForLocation(location);
			expect(found).not.toBeNull();
			expect(found?.metadata.countryCode).toBe('JP');
		});

		it('should find pack by centerPoint in country', () => {
			const pack = createJpPack();
			registerPack(pack);

			const location: LocationSpec = {
				centerPoint: { lat: 35.68, lng: 139.69 }, // Tokyo
			};
			const found = findPackForLocation(location);
			expect(found).not.toBeNull();
			expect(found?.metadata.countryCode).toBe('JP');
		});

		it('should return null for GLOBAL country', () => {
			const pack = createJpPack();
			registerPack(pack);

			const location: LocationSpec = { country: 'GLOBAL' };
			const found = findPackForLocation(location);
			expect(found).toBeNull();
		});

		it('should return null when no pack matches', () => {
			const pack = createJpPack();
			registerPack(pack);

			const location: LocationSpec = {
				centerPoint: { lat: 48.85, lng: 2.35 }, // Paris
			};
			const found = findPackForLocation(location);
			expect(found).toBeNull();
		});
	});

	describe('findCrsInPacks', () => {
		it('should find CRS from registered pack', async () => {
			const pack = createJpPack();
			registerPack(pack);

			const result = await findCrsInPacks('EPSG:6668');
			expect(result).not.toBeNull();
			expect(result?.crs.code).toBe('EPSG:6668');
			expect(result?.pack.metadata.countryCode).toBe('JP');
		});

		it('should find CRS without EPSG: prefix', async () => {
			const pack = createJpPack();
			registerPack(pack);

			const result = await findCrsInPacks('6668');
			expect(result).not.toBeNull();
			expect(result?.crs.code).toBe('EPSG:6668');
		});

		it('should return null for unknown CRS', async () => {
			const pack = createJpPack();
			registerPack(pack);

			const result = await findCrsInPacks('EPSG:99999');
			expect(result).toBeNull();
		});

		it('should return null when no packs registered', async () => {
			const result = await findCrsInPacks('EPSG:6668');
			expect(result).toBeNull();
		});
	});

	describe('loadPacksFromEnv', () => {
		it('should load JP pack by default', async () => {
			// EPSG_PACKS not set, defaults to 'jp'
			await loadPacksFromEnv();

			expect(arePacksLoaded()).toBe(true);
			expect(getRegisteredPacks()).toHaveLength(1);
			expect(getRegisteredPacks()[0].countryCode).toBe('JP');
		});

		it('should not double-load', async () => {
			await loadPacksFromEnv();
			await loadPacksFromEnv();

			expect(getRegisteredPacks()).toHaveLength(1);
		});

		it('should load multiple packs from env', async () => {
			vi.stubEnv('EPSG_PACKS', 'jp, unknownpack');
			await loadPacksFromEnv();

			// Only JP should be loaded (unknownpack is ignored)
			expect(getRegisteredPacks()).toHaveLength(1);
		});

		it('should load US pack from env', async () => {
			vi.stubEnv('EPSG_PACKS', 'us');
			await loadPacksFromEnv();

			expect(arePacksLoaded()).toBe(true);
			expect(getRegisteredPacks()).toHaveLength(1);
			expect(getRegisteredPacks()[0].countryCode).toBe('US');
		});

		it('should load both JP and US packs', async () => {
			vi.stubEnv('EPSG_PACKS', 'jp,us');
			await loadPacksFromEnv();

			expect(getRegisteredPacks()).toHaveLength(2);
			const codes = getRegisteredPacks().map((p) => p.countryCode);
			expect(codes).toContain('JP');
			expect(codes).toContain('US');
		});

		it('should handle empty EPSG_PACKS', async () => {
			vi.stubEnv('EPSG_PACKS', '');
			await loadPacksFromEnv();

			expect(arePacksLoaded()).toBe(true);
			expect(getRegisteredPacks()).toHaveLength(0);
		});
	});

	describe('clearPacks', () => {
		it('should clear all registered packs', async () => {
			const pack = createJpPack();
			registerPack(pack);
			expect(getRegisteredPacks()).toHaveLength(1);

			clearPacks();
			expect(getRegisteredPacks()).toHaveLength(0);
			expect(arePacksLoaded()).toBe(false);
		});
	});

	describe('aliases', () => {
		it('should register pack with aliases', () => {
			const pack = createJpPack();
			registerPack(pack);

			// JP Pack has aliases: ['JPN', 'JAPAN']
			expect(getPackForCountry('JP')).not.toBeNull();
			expect(getPackForCountry('JPN')).not.toBeNull();
			expect(getPackForCountry('JAPAN')).not.toBeNull();
		});

		it('should find pack by alias (case insensitive)', () => {
			const pack = createJpPack();
			registerPack(pack);

			expect(getPackForCountry('jpn')).not.toBeNull();
			expect(getPackForCountry('japan')).not.toBeNull();
			expect(getPackForCountry('Japan')).not.toBeNull();
		});

		it('should return unique packs from getRegisteredPacks', () => {
			const pack = createJpPack();
			registerPack(pack);

			// Even though JP is registered under JP, JPN, JAPAN,
			// getRegisteredPacks should return only 1 unique pack
			const packs = getRegisteredPacks();
			expect(packs).toHaveLength(1);
			expect(packs[0].countryCode).toBe('JP');
		});

		it('should find pack by alias in findPackForLocation', () => {
			const pack = createJpPack();
			registerPack(pack);

			// Using JPN alias
			const found1 = findPackForLocation({ country: 'JPN' });
			expect(found1).not.toBeNull();
			expect(found1?.metadata.countryCode).toBe('JP');

			// Using JAPAN alias
			const found2 = findPackForLocation({ country: 'JAPAN' });
			expect(found2).not.toBeNull();
			expect(found2?.metadata.countryCode).toBe('JP');
		});

		it('should work with pack without aliases', () => {
			// Create a mock pack without aliases
			const mockPack: CountryPack = {
				metadata: {
					countryCode: 'FR',
					name: 'Mock France Pack',
					version: '1.0.0',
					primaryDatum: 'RGF93',
					description: 'Mock France Pack for testing',
					language: 'fr',
					// No aliases defined
				},
				getCrsData: async () => ({ geographicCRS: {}, projectedCRS: {} }),
				getZoneMapping: async () => ({ entries: {} }),
				getRecommendationRules: async () => ({ purposeRules: {} }),
				getValidationRules: async () => [],
				getTransformationKnowledge: async () => ({
					transformations: [],
					hubCrs: [],
					deprecatedCrs: [],
				}),
				getBestPractices: async () => [],
				getTroubleshootingGuides: async () => [],
				selectZoneForLocation: async () => null,
				isLocationInCountry: () => false,
				getCountryBounds: () => ({ north: 51, south: 41, east: 10, west: -5 }),
			};
			registerPack(mockPack);

			expect(getPackForCountry('FR')).not.toBeNull();
			expect(getPackForCountry('FRA')).toBeNull(); // No alias defined
			expect(getRegisteredPacks()).toHaveLength(1);
		});

		it('should handle multiple packs with aliases', async () => {
			vi.stubEnv('EPSG_PACKS', 'jp,us,uk');
			await loadPacksFromEnv();

			// Each pack should be findable by its aliases
			// JP: JP, JPN, JAPAN
			expect(getPackForCountry('JP')).not.toBeNull();
			expect(getPackForCountry('JPN')).not.toBeNull();
			expect(getPackForCountry('JAPAN')).not.toBeNull();

			// US: US, USA, AMERICA
			expect(getPackForCountry('US')).not.toBeNull();
			expect(getPackForCountry('USA')).not.toBeNull();
			expect(getPackForCountry('AMERICA')).not.toBeNull();

			// UK: UK, GB, GBR, BRITAIN
			expect(getPackForCountry('UK')).not.toBeNull();
			expect(getPackForCountry('GB')).not.toBeNull();
			expect(getPackForCountry('GBR')).not.toBeNull();
			expect(getPackForCountry('BRITAIN')).not.toBeNull();

			// getRegisteredPacks should still return only 3 unique packs
			expect(getRegisteredPacks()).toHaveLength(3);
		});
	});
});
