/**
 * UTMゾーン計算ユーティリティのテスト
 */

import { describe, expect, it } from 'vitest';
import {
	generateUtmCrsDetail,
	getUtmEpsgCode,
	getUtmZone,
	getUtmZoneForBoundingBox,
	isPolarRegion,
} from '../../src/utils/utm.js';

describe('UTM Utility', () => {
	describe('getUtmZone', () => {
		it('should calculate UTM zone for Tokyo (139.69°E)', () => {
			expect(getUtmZone(139.69)).toBe(54);
		});

		it('should calculate UTM zone for Los Angeles (-118.24°W)', () => {
			expect(getUtmZone(-118.24)).toBe(11);
		});

		it('should calculate UTM zone for London (-0.12°W)', () => {
			expect(getUtmZone(-0.12)).toBe(30);
		});

		it('should calculate UTM zone for Paris (2.35°E)', () => {
			expect(getUtmZone(2.35)).toBe(31);
		});

		it('should calculate UTM zone for Berlin (13.41°E)', () => {
			expect(getUtmZone(13.41)).toBe(33);
		});

		it('should calculate UTM zone for Sydney (151.21°E)', () => {
			expect(getUtmZone(151.21)).toBe(56);
		});

		it('should handle antimeridian (lng=180)', () => {
			expect(getUtmZone(180)).toBe(60);
		});

		it('should handle antimeridian (lng=-180)', () => {
			expect(getUtmZone(-180)).toBe(1);
		});

		it('should handle zone boundary (6°E is zone 31)', () => {
			expect(getUtmZone(6)).toBe(32); // 6度は zone 32 の開始
			expect(getUtmZone(5.999)).toBe(31);
		});

		it('should throw error for invalid longitude (NaN)', () => {
			expect(() => getUtmZone(NaN)).toThrow();
		});

		it('should throw error for invalid longitude (Infinity)', () => {
			expect(() => getUtmZone(Infinity)).toThrow();
		});
	});

	describe('getUtmEpsgCode', () => {
		it('should return correct EPSG code for Tokyo (northern hemisphere)', () => {
			expect(getUtmEpsgCode(35.68, 139.69)).toBe('EPSG:32654'); // UTM 54N
		});

		it('should return correct EPSG code for Sydney (southern hemisphere)', () => {
			expect(getUtmEpsgCode(-33.87, 151.21)).toBe('EPSG:32756'); // UTM 56S
		});

		it('should return correct EPSG code for Los Angeles', () => {
			expect(getUtmEpsgCode(34.05, -118.24)).toBe('EPSG:32611'); // UTM 11N
		});

		it('should return correct EPSG code for Cape Town', () => {
			expect(getUtmEpsgCode(-33.93, 18.42)).toBe('EPSG:32734'); // UTM 34S
		});

		it('should throw error for invalid coordinates (NaN lat)', () => {
			expect(() => getUtmEpsgCode(NaN, 139.69)).toThrow();
		});

		it('should throw error for invalid coordinates (NaN lng)', () => {
			expect(() => getUtmEpsgCode(35.68, NaN)).toThrow();
		});

		it('should throw error for out of range latitude', () => {
			expect(() => getUtmEpsgCode(91, 0)).toThrow();
			expect(() => getUtmEpsgCode(-91, 0)).toThrow();
		});

		it('should throw error for out of range longitude', () => {
			expect(() => getUtmEpsgCode(0, 181)).toThrow();
			expect(() => getUtmEpsgCode(0, -181)).toThrow();
		});
	});

	describe('isPolarRegion', () => {
		it('should return true for arctic (lat > 84)', () => {
			expect(isPolarRegion(85)).toBe(true);
			expect(isPolarRegion(84.1)).toBe(true);
		});

		it('should return true for antarctic (lat < -80)', () => {
			expect(isPolarRegion(-81)).toBe(true);
			expect(isPolarRegion(-80.1)).toBe(true);
		});

		it('should return false for Tokyo', () => {
			expect(isPolarRegion(35.68)).toBe(false);
		});

		it('should return false for boundary latitudes', () => {
			expect(isPolarRegion(84)).toBe(false);
			expect(isPolarRegion(-80)).toBe(false);
		});
	});

	describe('generateUtmCrsDetail', () => {
		it('should generate correct CRS detail for Tokyo', () => {
			const detail = generateUtmCrsDetail(35.68, 139.69);
			expect(detail.code).toBe('EPSG:32654');
			expect(detail.name).toBe('WGS 84 / UTM zone 54N');
			expect(detail.type).toBe('projected');
			expect(detail.baseCRS).toBe('EPSG:4326');
			expect(detail.projection?.method).toBe('Transverse Mercator');
			expect(detail.projection?.centralMeridian).toBe(141);
			expect(detail.projection?.scaleFactor).toBe(0.9996);
			expect(detail.projection?.falseEasting).toBe(500000);
			expect(detail.projection?.falseNorthing).toBe(0);
		});

		it('should generate correct CRS detail for southern hemisphere', () => {
			const detail = generateUtmCrsDetail(-33.87, 151.21);
			expect(detail.code).toBe('EPSG:32756');
			expect(detail.name).toBe('WGS 84 / UTM zone 56S');
			expect(detail.projection?.falseNorthing).toBe(10000000);
		});

		it('should have correct area of use boundaries', () => {
			const detail = generateUtmCrsDetail(35.68, 139.69);
			// Zone 54 is between 138°E and 144°E
			expect(detail.areaOfUse.boundingBox?.west).toBe(138);
			expect(detail.areaOfUse.boundingBox?.east).toBe(144);
			expect(detail.areaOfUse.boundingBox?.north).toBe(84);
			expect(detail.areaOfUse.boundingBox?.south).toBe(0);
		});

		it('should include use cases for distance and area calculation', () => {
			const detail = generateUtmCrsDetail(35.68, 139.69);
			expect(detail.useCases).toContain('distance_calculation');
			expect(detail.useCases).toContain('area_calculation');
			expect(detail.useCases).toContain('data_exchange');
		});
	});

	describe('getUtmZoneForBoundingBox', () => {
		it('should return correct zone for Tokyo area', () => {
			const result = getUtmZoneForBoundingBox({
				north: 36,
				south: 35,
				east: 140,
				west: 139,
			});
			expect(result.zone).toBe(54);
			expect(result.hemisphere).toBe('N');
			expect(result.crossesMultipleZones).toBe(false);
		});

		it('should detect when bounding box crosses multiple zones', () => {
			const result = getUtmZoneForBoundingBox({
				north: 36,
				south: 35,
				east: 145, // Zone 54-55 boundary at 144°E
				west: 137,
			});
			expect(result.crossesMultipleZones).toBe(true);
		});

		it('should return correct hemisphere for southern area', () => {
			const result = getUtmZoneForBoundingBox({
				north: -33,
				south: -34,
				east: 152,
				west: 151,
			});
			expect(result.hemisphere).toBe('S');
		});

		it('should handle crossing equator', () => {
			const result = getUtmZoneForBoundingBox({
				north: 1,
				south: -1,
				east: 2,
				west: 1,
			});
			// Center is at 0°, which is on the equator
			expect(result.hemisphere).toBe('N'); // Northern hemisphere for lat >= 0
		});
	});
});
