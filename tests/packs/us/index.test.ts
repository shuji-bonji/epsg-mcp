/**
 * US Pack Tests
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { createUsPack, resetUsPackCache } from '../../../src/packs/us/index.js';
import type { CountryPack, LocationSpec } from '../../../src/types/index.js';

describe('US Pack', () => {
	let usPack: CountryPack;

	beforeEach(() => {
		resetUsPackCache();
		usPack = createUsPack();
	});

	describe('metadata', () => {
		it('should have correct country code', () => {
			expect(usPack.metadata.countryCode).toBe('US');
		});

		it('should have correct primary datum', () => {
			expect(usPack.metadata.primaryDatum).toBe('NAD83');
		});

		it('should have version 1.0.0', () => {
			expect(usPack.metadata.version).toBe('1.0.0');
		});

		it('should have English language', () => {
			expect(usPack.metadata.language).toBe('en');
		});
	});

	describe('getCrsData', () => {
		it('should return geographicCRS', async () => {
			const data = await usPack.getCrsData();
			expect(data.geographicCRS).toBeDefined();
			expect(Object.keys(data.geographicCRS).length).toBeGreaterThan(0);
		});

		it('should return projectedCRS', async () => {
			const data = await usPack.getCrsData();
			expect(data.projectedCRS).toBeDefined();
			expect(Object.keys(data.projectedCRS).length).toBeGreaterThan(0);
		});

		it('should include NAD83', async () => {
			const data = await usPack.getCrsData();
			expect(data.geographicCRS['EPSG:4269']).toBeDefined();
			expect(data.geographicCRS['EPSG:4269'].name).toBe('NAD83');
		});

		it('should include NAD83(2011)', async () => {
			const data = await usPack.getCrsData();
			expect(data.geographicCRS['EPSG:6318']).toBeDefined();
			expect(data.geographicCRS['EPSG:6318'].name).toContain('NAD83(2011)');
		});

		it('should include Conus Albers', async () => {
			const data = await usPack.getCrsData();
			expect(data.projectedCRS['EPSG:5070']).toBeDefined();
			expect(data.projectedCRS['EPSG:5070'].name).toContain('Conus Albers');
		});

		it('should include California SPCS zone 5', async () => {
			const data = await usPack.getCrsData();
			expect(data.projectedCRS['EPSG:2229']).toBeDefined();
			expect(data.projectedCRS['EPSG:2229'].name).toContain('California');
		});
	});

	describe('getZoneMapping', () => {
		it('should return zone entries for states', async () => {
			const mapping = await usPack.getZoneMapping();
			expect(mapping.entries).toBeDefined();
			expect(Object.keys(mapping.entries).length).toBeGreaterThan(40);
		});

		it('should map California to SPCS zone 5', async () => {
			const mapping = await usPack.getZoneMapping();
			expect(mapping.entries.California).toBeDefined();
			expect(mapping.entries.California.code).toBe('EPSG:2229');
		});

		it('should map New York to Long Island zone', async () => {
			const mapping = await usPack.getZoneMapping();
			expect(mapping.entries['New York']).toBeDefined();
			expect(mapping.entries['New York'].code).toBe('EPSG:2263');
		});

		it('should have multi-zone regions for California', async () => {
			const mapping = await usPack.getZoneMapping();
			expect(mapping.multiZoneRegions).toBeDefined();
			expect(mapping.multiZoneRegions!.California).toBeDefined();
		});

		it('should have multi-zone regions for Texas', async () => {
			const mapping = await usPack.getZoneMapping();
			expect(mapping.multiZoneRegions!.Texas).toBeDefined();
		});

		it('should include name in zone mapping entries', async () => {
			const mapping = await usPack.getZoneMapping();
			expect(mapping.entries.Alabama.name).toBe('NAD83 / Alabama East');
			expect(mapping.entries.California.name).toBe('NAD83 / California zone 5');
			expect(mapping.entries.Montana.name).toBe('NAD83 / Montana');
		});
	});

	describe('getRecommendationRules', () => {
		it('should return rules for various purposes', async () => {
			const rules = await usPack.getRecommendationRules();
			expect(rules.purposeRules).toBeDefined();
		});

		it('should have rules for web_mapping', async () => {
			const rules = await usPack.getRecommendationRules();
			expect(rules.purposeRules.web_mapping).toBeDefined();
			expect(rules.purposeRules.web_mapping.primary).toBe('EPSG:3857');
		});

		it('should have rules for survey', async () => {
			const rules = await usPack.getRecommendationRules();
			expect(rules.purposeRules.survey).toBeDefined();
			expect(rules.purposeRules.survey.primary).toContain('State Plane');
		});

		it('should have rules for area_calculation', async () => {
			const rules = await usPack.getRecommendationRules();
			expect(rules.purposeRules.area_calculation).toBeDefined();
			expect(rules.purposeRules.area_calculation.primary).toBe('EPSG:5070');
		});
	});

	describe('getTransformationKnowledge', () => {
		it('should return hub CRS', async () => {
			const knowledge = await usPack.getTransformationKnowledge();
			expect(knowledge.hubCrs).toContain('EPSG:4269');
			expect(knowledge.hubCrs).toContain('EPSG:4326');
		});

		it('should list deprecated CRS', async () => {
			const knowledge = await usPack.getTransformationKnowledge();
			expect(knowledge.deprecatedCrs).toContain('EPSG:4267');
		});

		it('should include NAD27 to NAD83 transformation', async () => {
			const knowledge = await usPack.getTransformationKnowledge();
			const nad27ToNad83 = knowledge.transformations.find(
				(t) => t.from === 'EPSG:4267' && t.to === 'EPSG:4269'
			);
			expect(nad27ToNad83).toBeDefined();
			expect(nad27ToNad83?.method).toContain('NADCON');
		});
	});

	describe('getBestPractices', () => {
		it('should return best practices', async () => {
			const practices = await usPack.getBestPractices();
			expect(practices.length).toBeGreaterThan(0);
		});

		it('should include US survey best practices', async () => {
			const practices = await usPack.getBestPractices();
			const surveyPractice = practices.find((p) => p.topic === 'us_survey');
			expect(surveyPractice).toBeDefined();
		});
	});

	describe('getTroubleshootingGuides', () => {
		it('should return troubleshooting guides', async () => {
			const guides = await usPack.getTroubleshootingGuides();
			expect(guides.length).toBeGreaterThan(0);
		});

		it('should include NAD27 shift symptom', async () => {
			const guides = await usPack.getTroubleshootingGuides();
			const nad27Guide = guides.find((g) => g.symptomId === 'nad27_shift');
			expect(nad27Guide).toBeDefined();
		});
	});

	describe('selectZoneForLocation', () => {
		it('should select SPCS zone for California', async () => {
			const location: LocationSpec = { subdivision: 'California' };
			const zone = await usPack.selectZoneForLocation(location);
			expect(zone).toBe('EPSG:2229'); // Default zone for California
		});

		it('should select SPCS zone for New York', async () => {
			const location: LocationSpec = { subdivision: 'New York' };
			const zone = await usPack.selectZoneForLocation(location);
			expect(zone).toBe('EPSG:2263'); // Long Island zone
		});

		it('should handle California with city', async () => {
			const location: LocationSpec = { subdivision: 'California', city: 'San Francisco' };
			const zone = await usPack.selectZoneForLocation(location);
			expect(zone).toBe('EPSG:2227'); // Zone 3
		});

		it('should handle Texas', async () => {
			const location: LocationSpec = { subdivision: 'Texas' };
			const zone = await usPack.selectZoneForLocation(location);
			expect(zone).toBe('EPSG:2277'); // Central zone
		});

		it('should return UTM zone from centerPoint in CONUS', async () => {
			const location: LocationSpec = {
				centerPoint: { lat: 34.0, lng: -118.2 }, // Los Angeles area
			};
			const zone = await usPack.selectZoneForLocation(location);
			// Should return UTM zone 11N
			expect(zone).toBe('EPSG:32611');
		});

		it('should return null when no location info', async () => {
			const location: LocationSpec = {};
			const zone = await usPack.selectZoneForLocation(location);
			expect(zone).toBeNull();
		});

		it('should handle state abbreviations', async () => {
			const location: LocationSpec = { subdivision: 'CA' };
			const zone = await usPack.selectZoneForLocation(location);
			expect(zone).toBe('EPSG:2229');
		});
	});

	describe('isLocationInCountry', () => {
		it('should return true for country US', () => {
			const location: LocationSpec = { country: 'US' };
			expect(usPack.isLocationInCountry(location)).toBe(true);
		});

		it('should return true for country USA', () => {
			const location: LocationSpec = { country: 'USA' };
			expect(usPack.isLocationInCountry(location)).toBe(true);
		});

		it('should return true for country us (lowercase)', () => {
			const location: LocationSpec = { country: 'us' };
			expect(usPack.isLocationInCountry(location)).toBe(true);
		});

		it('should return true for US state', () => {
			const location: LocationSpec = { subdivision: 'California' };
			expect(usPack.isLocationInCountry(location)).toBe(true);
		});

		it('should return true for centerPoint in CONUS', () => {
			const location: LocationSpec = {
				centerPoint: { lat: 40.7, lng: -74.0 }, // New York City
			};
			expect(usPack.isLocationInCountry(location)).toBe(true);
		});

		it('should return true for centerPoint in Alaska', () => {
			const location: LocationSpec = {
				centerPoint: { lat: 61.2, lng: -149.9 }, // Anchorage
			};
			expect(usPack.isLocationInCountry(location)).toBe(true);
		});

		it('should return true for centerPoint in Hawaii', () => {
			const location: LocationSpec = {
				centerPoint: { lat: 21.3, lng: -157.9 }, // Honolulu
			};
			expect(usPack.isLocationInCountry(location)).toBe(true);
		});

		it('should return false for centerPoint outside US', () => {
			const location: LocationSpec = {
				centerPoint: { lat: 35.68, lng: 139.69 }, // Tokyo
			};
			expect(usPack.isLocationInCountry(location)).toBe(false);
		});

		it('should return false for other country', () => {
			const location: LocationSpec = { country: 'JP' };
			expect(usPack.isLocationInCountry(location)).toBe(false);
		});
	});

	describe('getCountryBounds', () => {
		it('should return extended bounds including Alaska', () => {
			const bounds = usPack.getCountryBounds();
			expect(bounds.north).toBeGreaterThanOrEqual(71); // Alaska
			expect(bounds.south).toBeLessThanOrEqual(19); // Hawaii
		});

		it('should cover Los Angeles', () => {
			const bounds = usPack.getCountryBounds();
			const la = { lat: 34.05, lng: -118.24 };
			expect(la.lat).toBeGreaterThanOrEqual(bounds.south);
			expect(la.lat).toBeLessThanOrEqual(bounds.north);
			expect(la.lng).toBeGreaterThanOrEqual(bounds.west);
			expect(la.lng).toBeLessThanOrEqual(bounds.east);
		});

		it('should cover New York', () => {
			const bounds = usPack.getCountryBounds();
			const ny = { lat: 40.71, lng: -74.01 };
			expect(ny.lat).toBeGreaterThanOrEqual(bounds.south);
			expect(ny.lat).toBeLessThanOrEqual(bounds.north);
			expect(ny.lng).toBeGreaterThanOrEqual(bounds.west);
			expect(ny.lng).toBeLessThanOrEqual(bounds.east);
		});
	});
});
