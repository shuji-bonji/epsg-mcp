/**
 * UK Pack Tests
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { createUkPack, resetUkPackCache } from '../../../src/packs/uk/index.js';
import type { CountryPack, LocationSpec } from '../../../src/types/index.js';

describe('UK Pack', () => {
	let ukPack: CountryPack;

	beforeEach(() => {
		resetUkPackCache();
		ukPack = createUkPack();
	});

	describe('metadata', () => {
		it('should have correct country code', () => {
			expect(ukPack.metadata.countryCode).toBe('UK');
		});

		it('should have correct primary datum', () => {
			expect(ukPack.metadata.primaryDatum).toBe('OSGB36');
		});

		it('should have version 1.0.0', () => {
			expect(ukPack.metadata.version).toBe('1.0.0');
		});

		it('should have English language', () => {
			expect(ukPack.metadata.language).toBe('en');
		});
	});

	describe('getCrsData', () => {
		it('should return geographicCRS', async () => {
			const data = await ukPack.getCrsData();
			expect(data.geographicCRS).toBeDefined();
			expect(Object.keys(data.geographicCRS).length).toBeGreaterThan(0);
		});

		it('should return projectedCRS', async () => {
			const data = await ukPack.getCrsData();
			expect(data.projectedCRS).toBeDefined();
			expect(Object.keys(data.projectedCRS).length).toBeGreaterThan(0);
		});

		it('should include OSGB36', async () => {
			const data = await ukPack.getCrsData();
			expect(data.geographicCRS['EPSG:4277']).toBeDefined();
			expect(data.geographicCRS['EPSG:4277'].name).toBe('OSGB36');
		});

		it('should include ETRS89', async () => {
			const data = await ukPack.getCrsData();
			expect(data.geographicCRS['EPSG:4258']).toBeDefined();
			expect(data.geographicCRS['EPSG:4258'].name).toBe('ETRS89');
		});

		it('should include British National Grid', async () => {
			const data = await ukPack.getCrsData();
			expect(data.projectedCRS['EPSG:27700']).toBeDefined();
			expect(data.projectedCRS['EPSG:27700'].name).toContain('British National Grid');
		});

		it('should include Irish Transverse Mercator', async () => {
			const data = await ukPack.getCrsData();
			expect(data.projectedCRS['EPSG:2157']).toBeDefined();
			expect(data.projectedCRS['EPSG:2157'].name).toContain('Irish Transverse Mercator');
		});
	});

	describe('getZoneMapping', () => {
		it('should return zone entries for UK regions', async () => {
			const mapping = await ukPack.getZoneMapping();
			expect(mapping.entries).toBeDefined();
			expect(Object.keys(mapping.entries).length).toBeGreaterThan(0);
		});

		it('should map England to BNG', async () => {
			const mapping = await ukPack.getZoneMapping();
			expect(mapping.entries.England).toBeDefined();
			expect(mapping.entries.England.code).toBe('EPSG:27700');
		});

		it('should map Scotland to BNG', async () => {
			const mapping = await ukPack.getZoneMapping();
			expect(mapping.entries.Scotland).toBeDefined();
			expect(mapping.entries.Scotland.code).toBe('EPSG:27700');
		});

		it('should map Wales to BNG', async () => {
			const mapping = await ukPack.getZoneMapping();
			expect(mapping.entries.Wales).toBeDefined();
			expect(mapping.entries.Wales.code).toBe('EPSG:27700');
		});

		it('should map Northern Ireland to ITM', async () => {
			const mapping = await ukPack.getZoneMapping();
			expect(mapping.entries['Northern Ireland']).toBeDefined();
			expect(mapping.entries['Northern Ireland'].code).toBe('EPSG:2157');
		});
	});

	describe('getRecommendationRules', () => {
		it('should return rules for various purposes', async () => {
			const rules = await ukPack.getRecommendationRules();
			expect(rules.purposeRules).toBeDefined();
		});

		it('should have rules for web_mapping', async () => {
			const rules = await ukPack.getRecommendationRules();
			expect(rules.purposeRules.web_mapping).toBeDefined();
			expect(rules.purposeRules.web_mapping.primary).toBe('EPSG:3857');
		});

		it('should have rules for survey', async () => {
			const rules = await ukPack.getRecommendationRules();
			expect(rules.purposeRules.survey).toBeDefined();
			expect(rules.purposeRules.survey.primary).toBe('EPSG:27700');
		});

		it('should have rules for area_calculation', async () => {
			const rules = await ukPack.getRecommendationRules();
			expect(rules.purposeRules.area_calculation).toBeDefined();
			expect(rules.purposeRules.area_calculation.primary).toBe('EPSG:27700');
		});
	});

	describe('getTransformationKnowledge', () => {
		it('should return hub CRS', async () => {
			const knowledge = await ukPack.getTransformationKnowledge();
			expect(knowledge.hubCrs).toContain('EPSG:4258');
			expect(knowledge.hubCrs).toContain('EPSG:4326');
		});

		it('should list deprecated CRS', async () => {
			const knowledge = await ukPack.getTransformationKnowledge();
			expect(knowledge.deprecatedCrs).toContain('EPSG:29902');
		});

		it('should include OSGB36 to ETRS89 transformation', async () => {
			const knowledge = await ukPack.getTransformationKnowledge();
			const osgb36ToEtrs89 = knowledge.transformations.find(
				(t) => t.from === 'EPSG:4277' && t.to === 'EPSG:4258'
			);
			expect(osgb36ToEtrs89).toBeDefined();
			expect(osgb36ToEtrs89?.method).toContain('OSTN15');
		});
	});

	describe('getBestPractices', () => {
		it('should return best practices', async () => {
			const practices = await ukPack.getBestPractices();
			expect(practices.length).toBeGreaterThan(0);
		});

		it('should include UK survey best practices', async () => {
			const practices = await ukPack.getBestPractices();
			const surveyPractice = practices.find((p) => p.topic === 'uk_survey');
			expect(surveyPractice).toBeDefined();
		});

		it('should include UK INSPIRE best practices', async () => {
			const practices = await ukPack.getBestPractices();
			const inspirePractice = practices.find((p) => p.topic === 'uk_inspire');
			expect(inspirePractice).toBeDefined();
		});
	});

	describe('getTroubleshootingGuides', () => {
		it('should return troubleshooting guides', async () => {
			const guides = await ukPack.getTroubleshootingGuides();
			expect(guides.length).toBeGreaterThan(0);
		});

		it('should include OSGB36/ETRS89 shift symptom', async () => {
			const guides = await ukPack.getTroubleshootingGuides();
			const shiftGuide = guides.find((g) => g.symptomId === 'osgb36_etrs89_shift');
			expect(shiftGuide).toBeDefined();
		});

		it('should include BNG/NI mismatch symptom', async () => {
			const guides = await ukPack.getTroubleshootingGuides();
			const niGuide = guides.find((g) => g.symptomId === 'bng_ni_mismatch');
			expect(niGuide).toBeDefined();
		});
	});

	describe('selectZoneForLocation', () => {
		it('should select BNG for England', async () => {
			const location: LocationSpec = { subdivision: 'England' };
			const zone = await ukPack.selectZoneForLocation(location);
			expect(zone).toBe('EPSG:27700');
		});

		it('should select BNG for Scotland', async () => {
			const location: LocationSpec = { subdivision: 'Scotland' };
			const zone = await ukPack.selectZoneForLocation(location);
			expect(zone).toBe('EPSG:27700');
		});

		it('should select BNG for Wales', async () => {
			const location: LocationSpec = { subdivision: 'Wales' };
			const zone = await ukPack.selectZoneForLocation(location);
			expect(zone).toBe('EPSG:27700');
		});

		it('should select ITM for Northern Ireland', async () => {
			const location: LocationSpec = { subdivision: 'Northern Ireland' };
			const zone = await ukPack.selectZoneForLocation(location);
			expect(zone).toBe('EPSG:2157');
		});

		it('should select ITM for Belfast', async () => {
			const location: LocationSpec = { city: 'Belfast' };
			const zone = await ukPack.selectZoneForLocation(location);
			expect(zone).toBe('EPSG:2157');
		});

		it('should return BNG for centerPoint in England', async () => {
			const location: LocationSpec = {
				centerPoint: { lat: 51.5, lng: -0.1 }, // London area
			};
			const zone = await ukPack.selectZoneForLocation(location);
			expect(zone).toBe('EPSG:27700');
		});

		it('should return ITM for centerPoint in Northern Ireland', async () => {
			const location: LocationSpec = {
				centerPoint: { lat: 54.6, lng: -5.9 }, // Belfast area
			};
			const zone = await ukPack.selectZoneForLocation(location);
			expect(zone).toBe('EPSG:2157');
		});

		it('should return null when no location info', async () => {
			const location: LocationSpec = {};
			const zone = await ukPack.selectZoneForLocation(location);
			expect(zone).toBeNull();
		});

		it('should handle Greater London region', async () => {
			const location: LocationSpec = { region: 'Greater London' };
			const zone = await ukPack.selectZoneForLocation(location);
			expect(zone).toBe('EPSG:27700');
		});
	});

	describe('isLocationInCountry', () => {
		it('should return true for country UK', () => {
			const location: LocationSpec = { country: 'UK' };
			expect(ukPack.isLocationInCountry(location)).toBe(true);
		});

		it('should return true for country GB', () => {
			const location: LocationSpec = { country: 'GB' };
			expect(ukPack.isLocationInCountry(location)).toBe(true);
		});

		it('should return true for country GBR', () => {
			const location: LocationSpec = { country: 'GBR' };
			expect(ukPack.isLocationInCountry(location)).toBe(true);
		});

		it('should return true for country uk (lowercase)', () => {
			const location: LocationSpec = { country: 'uk' };
			expect(ukPack.isLocationInCountry(location)).toBe(true);
		});

		it('should return true for UK region', () => {
			const location: LocationSpec = { subdivision: 'England' };
			expect(ukPack.isLocationInCountry(location)).toBe(true);
		});

		it('should return true for centerPoint in London', () => {
			const location: LocationSpec = {
				centerPoint: { lat: 51.5, lng: -0.1 }, // London
			};
			expect(ukPack.isLocationInCountry(location)).toBe(true);
		});

		it('should return true for centerPoint in Edinburgh', () => {
			const location: LocationSpec = {
				centerPoint: { lat: 55.95, lng: -3.19 }, // Edinburgh
			};
			expect(ukPack.isLocationInCountry(location)).toBe(true);
		});

		it('should return false for centerPoint outside UK', () => {
			const location: LocationSpec = {
				centerPoint: { lat: 48.86, lng: 2.35 }, // Paris
			};
			expect(ukPack.isLocationInCountry(location)).toBe(false);
		});

		it('should return false for other country', () => {
			const location: LocationSpec = { country: 'FR' };
			expect(ukPack.isLocationInCountry(location)).toBe(false);
		});
	});

	describe('getCountryBounds', () => {
		it('should return bounds including Shetland Islands', () => {
			const bounds = ukPack.getCountryBounds();
			expect(bounds.north).toBeGreaterThanOrEqual(60); // Shetland
			expect(bounds.south).toBeLessThanOrEqual(50); // Channel Islands
		});

		it('should cover London', () => {
			const bounds = ukPack.getCountryBounds();
			const london = { lat: 51.5, lng: -0.1 };
			expect(london.lat).toBeGreaterThanOrEqual(bounds.south);
			expect(london.lat).toBeLessThanOrEqual(bounds.north);
			expect(london.lng).toBeGreaterThanOrEqual(bounds.west);
			expect(london.lng).toBeLessThanOrEqual(bounds.east);
		});

		it('should cover Edinburgh', () => {
			const bounds = ukPack.getCountryBounds();
			const edinburgh = { lat: 55.95, lng: -3.19 };
			expect(edinburgh.lat).toBeGreaterThanOrEqual(bounds.south);
			expect(edinburgh.lat).toBeLessThanOrEqual(bounds.north);
			expect(edinburgh.lng).toBeGreaterThanOrEqual(bounds.west);
			expect(edinburgh.lng).toBeLessThanOrEqual(bounds.east);
		});

		it('should cover Belfast', () => {
			const bounds = ukPack.getCountryBounds();
			const belfast = { lat: 54.6, lng: -5.93 };
			expect(belfast.lat).toBeGreaterThanOrEqual(bounds.south);
			expect(belfast.lat).toBeLessThanOrEqual(bounds.north);
			expect(belfast.lng).toBeGreaterThanOrEqual(bounds.west);
			expect(belfast.lng).toBeLessThanOrEqual(bounds.east);
		});
	});
});
