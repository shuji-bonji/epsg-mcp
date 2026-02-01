import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
	clearCache,
	findCrsById,
	getAllCrs,
	getCrsByRegion,
	getZoneMapping,
	loadGlobalCrs,
	loadJapanCrs,
	loadRecommendations,
	preloadAll,
} from '../../src/data/loader.js';

describe('Data Loader', () => {
	beforeEach(() => {
		clearCache();
	});

	afterEach(() => {
		clearCache();
	});

	describe('loadJapanCrs', () => {
		it('should load Japan CRS data', async () => {
			const data = await loadJapanCrs();
			expect(data).toBeDefined();
			expect(data.version).toBeDefined();
			expect(data.datums).toBeDefined();
			expect(data.geographicCRS).toBeDefined();
			expect(data.projectedCRS).toBeDefined();
			expect(data.zoneMapping).toBeDefined();
		});

		it('should include JGD2011 datum', async () => {
			const data = await loadJapanCrs();
			expect(data.datums.JGD2011).toBeDefined();
			expect(data.datums.JGD2011.code).toBe('EPSG:1128');
			expect(data.datums.JGD2011.ellipsoid).toBeDefined();
		});

		it('should include all 19 plane rectangular coordinate systems', async () => {
			const data = await loadJapanCrs();
			const projectedCodes = Object.keys(data.projectedCRS);
			const planeRectangular = projectedCodes.filter(
				(code) => code.startsWith('EPSG:66') && Number(code.replace('EPSG:', '')) >= 6669
			);
			expect(planeRectangular.length).toBe(19);
		});

		it('should cache data on subsequent calls', async () => {
			const data1 = await loadJapanCrs();
			const data2 = await loadJapanCrs();
			expect(data1).toBe(data2);
		});
	});

	describe('loadGlobalCrs', () => {
		it('should load Global CRS data', async () => {
			const data = await loadGlobalCrs();
			expect(data).toBeDefined();
			expect(data.version).toBeDefined();
			expect(data.geographicCRS).toBeDefined();
			expect(data.projectedCRS).toBeDefined();
		});

		it('should include WGS 84', async () => {
			const data = await loadGlobalCrs();
			expect(data.geographicCRS['EPSG:4326']).toBeDefined();
			expect(data.geographicCRS['EPSG:4326'].name).toBe('WGS 84');
		});

		it('should include Web Mercator', async () => {
			const data = await loadGlobalCrs();
			expect(data.projectedCRS['EPSG:3857']).toBeDefined();
			expect(data.projectedCRS['EPSG:3857'].name).toContain('Pseudo-Mercator');
		});

		it('should include UTM zones', async () => {
			const data = await loadGlobalCrs();
			expect(data.projectedCRS['EPSG:32654']).toBeDefined();
			expect(data.projectedCRS['EPSG:32654'].name).toContain('UTM zone 54N');
		});
	});

	describe('loadRecommendations', () => {
		it('should load recommendations data', async () => {
			const data = await loadRecommendations();
			expect(data).toBeDefined();
			expect(data.version).toBeDefined();
			expect(data.rules).toBeDefined();
		});

		it('should include web_mapping recommendations', async () => {
			const data = await loadRecommendations();
			expect(data.rules.web_mapping).toBeDefined();
			expect(data.rules.web_mapping.global?.primary).toBe('EPSG:3857');
		});

		it('should include survey recommendations for Japan', async () => {
			const data = await loadRecommendations();
			expect(data.rules.survey).toBeDefined();
			expect(data.rules.survey.japan?.primary).toContain('平面直角座標系');
			expect(data.rules.survey.japan?.codePattern).toBe('EPSG:6669-6687');
		});

		it('should include all purpose types', async () => {
			const data = await loadRecommendations();
			const expectedPurposes = [
				'web_mapping',
				'distance_calculation',
				'area_calculation',
				'survey',
				'navigation',
				'data_storage',
				'data_exchange',
				'visualization',
			];
			for (const purpose of expectedPurposes) {
				expect(data.rules[purpose]).toBeDefined();
			}
		});
	});

	describe('findCrsById', () => {
		beforeEach(async () => {
			await preloadAll();
		});

		it('should find CRS by full EPSG code', async () => {
			const crs = await findCrsById('EPSG:4326');
			expect(crs).toBeDefined();
			expect(crs?.code).toBe('EPSG:4326');
			expect(crs?.name).toBe('WGS 84');
		});

		it('should find CRS by numeric code only', async () => {
			const crs = await findCrsById('4326');
			expect(crs).toBeDefined();
			expect(crs?.code).toBe('EPSG:4326');
		});

		it('should find Japan plane rectangular CS', async () => {
			const crs = await findCrsById('6677');
			expect(crs).toBeDefined();
			expect(crs?.code).toBe('EPSG:6677');
			expect(crs?.type).toBe('projected');
		});

		it('should return undefined for non-existent code', async () => {
			const crs = await findCrsById('99999');
			expect(crs).toBeUndefined();
		});

		it('should be case-insensitive for EPSG prefix', async () => {
			const crs1 = await findCrsById('EPSG:4326');
			const crs2 = await findCrsById('epsg:4326');
			expect(crs1).toBeDefined();
			expect(crs2).toBeDefined();
			expect(crs1?.code).toBe(crs2?.code);
		});
	});

	describe('getCrsByRegion', () => {
		beforeEach(async () => {
			await preloadAll();
		});

		it('should return Japan CRS list', async () => {
			const crsList = await getCrsByRegion('Japan');
			expect(crsList.length).toBeGreaterThan(0);
			expect(crsList.some((crs) => crs.code === 'EPSG:6668')).toBe(true);
		});

		it('should return Global CRS list', async () => {
			const crsList = await getCrsByRegion('Global');
			expect(crsList.length).toBeGreaterThan(0);
			expect(crsList.some((crs) => crs.code === 'EPSG:4326')).toBe(true);
		});

		it('should return empty array for unknown region', async () => {
			const crsList = await getCrsByRegion('Unknown');
			expect(crsList).toEqual([]);
		});
	});

	describe('getAllCrs', () => {
		beforeEach(async () => {
			await preloadAll();
		});

		it('should return all CRS from all regions', async () => {
			const allCrs = await getAllCrs();
			expect(allCrs.length).toBeGreaterThan(20);
		});

		it('should include both Japan and Global CRS', async () => {
			const allCrs = await getAllCrs();
			const hasJapan = allCrs.some((crs) => crs.code === 'EPSG:6668');
			const hasGlobal = allCrs.some((crs) => crs.code === 'EPSG:4326');
			expect(hasJapan).toBe(true);
			expect(hasGlobal).toBe(true);
		});
	});

	describe('getZoneMapping', () => {
		it('should return zone mapping for prefectures', async () => {
			const mapping = await getZoneMapping();
			expect(mapping).toBeDefined();
			expect(mapping['東京都']).toBeDefined();
			expect(mapping['東京都'].zone).toBe('IX');
			expect(mapping['東京都'].code).toBe('EPSG:6677');
		});

		it('should include all major prefectures', async () => {
			const mapping = await getZoneMapping();
			const majorPrefectures = ['東京都', '大阪府', '北海道', '福岡県', '沖縄県'];
			for (const pref of majorPrefectures) {
				expect(mapping[pref]).toBeDefined();
			}
		});
	});

	describe('preloadAll', () => {
		it('should load all data files', async () => {
			await preloadAll();
			const crs = await findCrsById('4326');
			expect(crs).toBeDefined();
		});

		it('should be idempotent', async () => {
			await preloadAll();
			await preloadAll();
			const crs = await findCrsById('4326');
			expect(crs).toBeDefined();
		});
	});

	describe('clearCache', () => {
		it('should clear all cached data', async () => {
			await preloadAll();
			clearCache();
			// After clearing, findCrsById will reload data
			const crs = await findCrsById('4326');
			expect(crs).toBeDefined();
		});
	});
});
