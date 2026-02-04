/**
 * JP Pack テスト
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { createJpPack } from '../../../src/packs/jp/index.js';
import type { CountryPack, LocationSpec } from '../../../src/types/index.js';

describe('JP Pack', () => {
	let jpPack: CountryPack;

	beforeEach(() => {
		jpPack = createJpPack();
	});

	describe('metadata', () => {
		it('should have correct country code', () => {
			expect(jpPack.metadata.countryCode).toBe('JP');
		});

		it('should have correct primary datum', () => {
			expect(jpPack.metadata.primaryDatum).toBe('JGD2011');
		});

		it('should have version 1.0.0', () => {
			expect(jpPack.metadata.version).toBe('1.0.0');
		});

		it('should have Japanese language', () => {
			expect(jpPack.metadata.language).toBe('ja');
		});
	});

	describe('getCrsData', () => {
		it('should return geographicCRS', async () => {
			const data = await jpPack.getCrsData();
			expect(data.geographicCRS).toBeDefined();
			expect(Object.keys(data.geographicCRS).length).toBeGreaterThan(0);
		});

		it('should return projectedCRS', async () => {
			const data = await jpPack.getCrsData();
			expect(data.projectedCRS).toBeDefined();
			expect(Object.keys(data.projectedCRS).length).toBeGreaterThan(0);
		});

		it('should include JGD2011', async () => {
			const data = await jpPack.getCrsData();
			expect(data.geographicCRS['EPSG:6668']).toBeDefined();
			expect(data.geographicCRS['EPSG:6668'].name).toContain('JGD2011');
		});

		it('should include plane rectangular CS zones', async () => {
			const data = await jpPack.getCrsData();
			// Zone IX (Tokyo area)
			expect(data.projectedCRS['EPSG:6677']).toBeDefined();
		});
	});

	describe('getZoneMapping', () => {
		it('should return zone entries for all prefectures', async () => {
			const mapping = await jpPack.getZoneMapping();
			expect(mapping.entries).toBeDefined();
			expect(Object.keys(mapping.entries).length).toBeGreaterThan(40);
		});

		it('should map Tokyo to zone IX', async () => {
			const mapping = await jpPack.getZoneMapping();
			expect(mapping.entries.東京都).toBeDefined();
			expect(mapping.entries.東京都.code).toBe('EPSG:6677');
			expect(mapping.entries.東京都.zone).toBe('IX');
		});

		it('should have multi-zone regions for Hokkaido and Okinawa', async () => {
			const mapping = await jpPack.getZoneMapping();
			expect(mapping.multiZoneRegions).toBeDefined();
			expect(mapping.multiZoneRegions!.北海道).toBeDefined();
			expect(mapping.multiZoneRegions!.沖縄県).toBeDefined();
		});
	});

	describe('getRecommendationRules', () => {
		it('should return rules for various purposes', async () => {
			const rules = await jpPack.getRecommendationRules();
			expect(rules.purposeRules).toBeDefined();
		});

		it('should have rules for distance calculation', async () => {
			const rules = await jpPack.getRecommendationRules();
			expect(rules.purposeRules.distance_calculation).toBeDefined();
		});

		it('should have rules for survey', async () => {
			const rules = await jpPack.getRecommendationRules();
			expect(rules.purposeRules.survey).toBeDefined();
		});
	});

	describe('getValidationRules', () => {
		it('should return empty array for Phase 5-2', async () => {
			const rules = await jpPack.getValidationRules();
			expect(rules).toEqual([]);
		});
	});

	describe('getTransformationKnowledge', () => {
		it('should return hub CRS', async () => {
			const knowledge = await jpPack.getTransformationKnowledge();
			expect(knowledge.hubCrs).toContain('EPSG:6668');
			expect(knowledge.hubCrs).toContain('EPSG:4326');
		});

		it('should list deprecated CRS', async () => {
			const knowledge = await jpPack.getTransformationKnowledge();
			expect(knowledge.deprecatedCrs).toContain('EPSG:4612');
			expect(knowledge.deprecatedCrs).toContain('EPSG:4301');
		});
	});

	describe('getBestPractices', () => {
		it('should return empty array for Phase 5-2', async () => {
			const practices = await jpPack.getBestPractices();
			expect(practices).toEqual([]);
		});
	});

	describe('getTroubleshootingGuides', () => {
		it('should return empty array for Phase 5-2', async () => {
			const guides = await jpPack.getTroubleshootingGuides();
			expect(guides).toEqual([]);
		});
	});

	describe('selectZoneForLocation', () => {
		it('should select zone IX for Tokyo', async () => {
			const location: LocationSpec = { prefecture: '東京都' };
			const zone = await jpPack.selectZoneForLocation(location);
			expect(zone).toBe('EPSG:6677');
		});

		it('should select zone VI for Osaka', async () => {
			const location: LocationSpec = { prefecture: '大阪府' };
			const zone = await jpPack.selectZoneForLocation(location);
			expect(zone).toBe('EPSG:6674');
		});

		it('should handle Hokkaido with city', async () => {
			const location: LocationSpec = { prefecture: '北海道', city: '札幌市' };
			const zone = await jpPack.selectZoneForLocation(location);
			expect(zone).toBe('EPSG:6680'); // Zone XII (Sapporo is in XII per GSI definition)
		});

		it('should handle Okinawa with centerPoint', async () => {
			const location: LocationSpec = {
				prefecture: '沖縄県',
				centerPoint: { lat: 26.2, lng: 127.7 }, // Naha area
			};
			const zone = await jpPack.selectZoneForLocation(location);
			expect(zone).toBe('EPSG:6683'); // Zone XV
		});

		it('should determine zone from centerPoint when no prefecture', async () => {
			const location: LocationSpec = {
				centerPoint: { lat: 35.68, lng: 139.69 }, // Tokyo
			};
			const zone = await jpPack.selectZoneForLocation(location);
			expect(zone).toBe('EPSG:6677'); // Zone IX
		});

		it('should return null when no location info', async () => {
			const location: LocationSpec = {};
			const zone = await jpPack.selectZoneForLocation(location);
			expect(zone).toBeNull();
		});

		it('should handle subdivision as well as prefecture', async () => {
			const location: LocationSpec = { subdivision: '東京都' };
			const zone = await jpPack.selectZoneForLocation(location);
			expect(zone).toBe('EPSG:6677');
		});
	});

	describe('isLocationInCountry', () => {
		it('should return true for country JP', () => {
			const location: LocationSpec = { country: 'JP' };
			expect(jpPack.isLocationInCountry(location)).toBe(true);
		});

		it('should return true for country jp (lowercase)', () => {
			const location: LocationSpec = { country: 'jp' };
			expect(jpPack.isLocationInCountry(location)).toBe(true);
		});

		it('should return true for Japanese prefecture', () => {
			const location: LocationSpec = { prefecture: '東京都' };
			expect(jpPack.isLocationInCountry(location)).toBe(true);
		});

		it('should return true for centerPoint in Japan', () => {
			const location: LocationSpec = {
				centerPoint: { lat: 35.68, lng: 139.69 },
			};
			expect(jpPack.isLocationInCountry(location)).toBe(true);
		});

		it('should return false for centerPoint outside Japan', () => {
			const location: LocationSpec = {
				centerPoint: { lat: 48.85, lng: 2.35 }, // Paris
			};
			expect(jpPack.isLocationInCountry(location)).toBe(false);
		});

		it('should return false for other country', () => {
			const location: LocationSpec = { country: 'US' };
			expect(jpPack.isLocationInCountry(location)).toBe(false);
		});

		it('should return true for subdivision with Japanese prefecture', () => {
			const location: LocationSpec = { subdivision: '大阪府' };
			expect(jpPack.isLocationInCountry(location)).toBe(true);
		});
	});

	describe('getCountryBounds', () => {
		it('should return correct bounds for Japan', () => {
			const bounds = jpPack.getCountryBounds();
			expect(bounds.north).toBe(46);
			expect(bounds.south).toBe(20);
			expect(bounds.east).toBe(154);
			expect(bounds.west).toBe(122);
		});

		it('should cover Tokyo', () => {
			const bounds = jpPack.getCountryBounds();
			const tokyo = { lat: 35.68, lng: 139.69 };
			expect(tokyo.lat).toBeGreaterThanOrEqual(bounds.south);
			expect(tokyo.lat).toBeLessThanOrEqual(bounds.north);
			expect(tokyo.lng).toBeGreaterThanOrEqual(bounds.west);
			expect(tokyo.lng).toBeLessThanOrEqual(bounds.east);
		});

		it('should cover Hokkaido', () => {
			const bounds = jpPack.getCountryBounds();
			const sapporo = { lat: 43.06, lng: 141.35 };
			expect(sapporo.lat).toBeGreaterThanOrEqual(bounds.south);
			expect(sapporo.lat).toBeLessThanOrEqual(bounds.north);
		});

		it('should cover Okinawa', () => {
			const bounds = jpPack.getCountryBounds();
			const naha = { lat: 26.21, lng: 127.68 };
			expect(naha.lat).toBeGreaterThanOrEqual(bounds.south);
			expect(naha.lat).toBeLessThanOrEqual(bounds.north);
		});
	});
});
