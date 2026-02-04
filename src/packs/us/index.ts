/**
 * US Country Knowledge Pack
 *
 * United States CRS knowledge including NAD83, State Plane Coordinate System,
 * and related transformations
 */

import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
	BoundingBox,
	CountryPack,
	LocationSpec,
	PackBestPractice,
	PackCrsDataSet,
	PackRecommendationRules,
	PackTransformationKnowledge,
	PackTroubleshootingGuide,
	PackValidationRule,
	ZoneMapping,
} from '../../types/index.js';
import { US_BOUNDS, US_MULTI_ZONE_STATES, US_STATE_ABBREV } from './constants.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Cache for loaded data
let crsDataCache: PackCrsDataSet | null = null;
let recommendationsCache: Record<string, unknown> | null = null;
let transformationsCache: Record<string, unknown> | null = null;
let bestPracticesCache: Record<string, unknown> | null = null;
let troubleshootingCache: Record<string, unknown> | null = null;

/**
 * Load JSON data from file
 */
async function loadJsonData<T>(filename: string): Promise<T> {
	const filePath = join(__dirname, filename);
	const content = await readFile(filePath, 'utf-8');
	return JSON.parse(content) as T;
}

/**
 * Check if a state has multiple SPCS zones
 */
function isMultiZoneState(state: string): boolean {
	return US_MULTI_ZONE_STATES.has(state);
}

/**
 * Normalize state name (handle abbreviations and case)
 */
function normalizeStateName(input: string): string | null {
	const normalized = input.trim();

	// Direct match
	if (US_STATE_ABBREV[normalized]) {
		return normalized;
	}

	// Case-insensitive match
	for (const [state, abbrev] of Object.entries(US_STATE_ABBREV)) {
		if (state.toLowerCase() === normalized.toLowerCase()) {
			return state;
		}
		if (abbrev.toLowerCase() === normalized.toLowerCase()) {
			return state;
		}
	}

	return null;
}

/**
 * Determine SPCS zone from coordinates for multi-zone states
 */
function determineZoneFromCoordinate(
	point: { lat: number; lng: number },
	_state: string
): string | null {
	// California: Roughly by latitude
	if (point.lat > 40) return 'EPSG:2225'; // Zone 1
	if (point.lat > 38.5) return 'EPSG:2227'; // Zone 3
	if (point.lat > 36) return 'EPSG:2228'; // Zone 4
	if (point.lat > 34) return 'EPSG:2229'; // Zone 5
	return 'EPSG:2230'; // Zone 6

	// For other states, return null to use default
}

/**
 * Create US Pack
 */
export function createUsPack(): CountryPack {
	return {
		metadata: {
			countryCode: 'US',
			name: 'US CRS Knowledge Pack',
			version: '1.0.0',
			primaryDatum: 'NAD83',
			description: 'NAD83, State Plane Coordinate System, and US-specific CRS knowledge',
			language: 'en',
			aliases: ['USA', 'AMERICA'],
		},

		async getCrsData(): Promise<PackCrsDataSet> {
			if (crsDataCache) return crsDataCache;

			const data = await loadJsonData<{
				geographicCRS: Record<string, unknown>;
				projectedCRS: Record<string, unknown>;
			}>('crs-data.json');

			crsDataCache = {
				geographicCRS: data.geographicCRS as PackCrsDataSet['geographicCRS'],
				projectedCRS: data.projectedCRS as PackCrsDataSet['projectedCRS'],
			};

			return crsDataCache;
		},

		async getZoneMapping(): Promise<ZoneMapping> {
			const data = await loadJsonData<{
				zoneMapping: Record<string, { zone: string; code: string; notes?: string }>;
			}>('crs-data.json');

			if (!recommendationsCache) {
				recommendationsCache = await loadJsonData<Record<string, unknown>>('recommendations.json');
			}

			const entries: ZoneMapping['entries'] = {};
			for (const [state, mapping] of Object.entries(data.zoneMapping)) {
				entries[state] = {
					zone: mapping.zone,
					code: mapping.code,
					notes: mapping.notes,
				};
			}

			const multiZoneStates =
				(recommendationsCache.multiZoneStates as Record<
					string,
					{
						note: string;
						subRegions: Record<string, string>;
						cities: Record<string, string>;
						default: string;
					}
				>) || {};

			return {
				entries,
				multiZoneRegions: multiZoneStates,
			};
		},

		async getRecommendationRules(): Promise<PackRecommendationRules> {
			if (!recommendationsCache) {
				recommendationsCache = await loadJsonData<Record<string, unknown>>('recommendations.json');
			}

			const rules = recommendationsCache.rules as Record<
				string,
				{
					primary: string;
					alternatives?: string[];
					fallback?: string;
					reasoning: string;
					pros?: string[];
					cons?: string[];
					warnings?: string[];
					codePattern?: string;
					usesZoneMapping?: boolean;
				}
			>;

			const purposeRules: PackRecommendationRules['purposeRules'] = {};

			for (const [purpose, rule] of Object.entries(rules)) {
				purposeRules[purpose] = {
					primary: rule.primary,
					alternatives: rule.alternatives,
					fallback: rule.fallback,
					reasoning: rule.reasoning,
					pros: rule.pros,
					cons: rule.cons,
					warnings: rule.warnings,
					codePattern: rule.codePattern,
					usesZoneMapping: rule.usesZoneMapping,
				};
			}

			return { purposeRules };
		},

		async getValidationRules(): Promise<PackValidationRule[]> {
			// US-specific validation rules can be added here
			return [];
		},

		async getTransformationKnowledge(): Promise<PackTransformationKnowledge> {
			if (!transformationsCache) {
				transformationsCache = await loadJsonData<Record<string, unknown>>('transformations.json');
			}

			return {
				transformations:
					(transformationsCache.transformations as PackTransformationKnowledge['transformations']) ||
					[],
				hubCrs: (transformationsCache.hubCrs as string[]) || [
					'EPSG:4269',
					'EPSG:6318',
					'EPSG:4326',
				],
				deprecatedCrs: (transformationsCache.deprecatedCrs as string[]) || ['EPSG:4267'],
			};
		},

		async getBestPractices(): Promise<PackBestPractice[]> {
			if (!bestPracticesCache) {
				bestPracticesCache = await loadJsonData<Record<string, unknown>>('best-practices.json');
			}

			const practices = bestPracticesCache.practices as Array<{
				topic: string;
				title: string;
				description: string;
				recommendations: Array<{ priority: 'must' | 'should' | 'may'; text: string }>;
				commonMistakes: Array<{ mistake: string; problem: string; solution: string }>;
				references: Array<{
					type: 'official' | 'article' | 'tool';
					title: string;
					url?: string;
					description?: string;
				}>;
			}>;

			return practices.map((p) => ({
				topic: p.topic,
				title: p.title,
				description: p.description,
				recommendations: p.recommendations,
				commonMistakes: p.commonMistakes,
				references: p.references,
			}));
		},

		async getTroubleshootingGuides(): Promise<PackTroubleshootingGuide[]> {
			if (!troubleshootingCache) {
				troubleshootingCache = await loadJsonData<Record<string, unknown>>('troubleshooting.json');
			}

			const symptoms = troubleshootingCache.symptoms as Array<{
				symptomId: string;
				keywords: string[];
				causes: Array<{
					likelihood: 'high' | 'medium' | 'low';
					cause: string;
					description: string;
					indicators: string[];
				}>;
				solutions: Array<{
					forCause: string;
					steps: string[];
					prevention: string;
				}>;
			}>;

			return symptoms.map((s) => ({
				symptomId: s.symptomId,
				keywords: s.keywords,
				causes: s.causes,
				solutions: s.solutions,
			}));
		},

		async selectZoneForLocation(location: LocationSpec): Promise<string | null> {
			const data = await loadJsonData<{
				zoneMapping: Record<string, { code: string }>;
			}>('crs-data.json');

			if (!recommendationsCache) {
				recommendationsCache = await loadJsonData<Record<string, unknown>>('recommendations.json');
			}

			const state = location.subdivision || location.region;
			const normalizedState = state ? normalizeStateName(state) : null;

			// Handle multi-zone states
			if (normalizedState && isMultiZoneState(normalizedState)) {
				const multiZoneStates = recommendationsCache.multiZoneStates as Record<
					string,
					{
						subRegions: Record<string, string>;
						cities: Record<string, string>;
						default: string;
					}
				>;

				const stateConfig = multiZoneStates?.[normalizedState];
				if (stateConfig) {
					// Check city first
					if (location.city && stateConfig.cities[location.city]) {
						return stateConfig.cities[location.city];
					}

					// Check coordinates
					if (location.centerPoint) {
						const zone = determineZoneFromCoordinate(location.centerPoint, normalizedState);
						if (zone) return zone;
					}

					// Return default
					return stateConfig.default;
				}
			}

			// Simple state lookup
			if (normalizedState) {
				const zoneInfo = data.zoneMapping[normalizedState];
				if (zoneInfo) {
					return zoneInfo.code;
				}
			}

			// Coordinate-based lookup for CONUS
			if (location.centerPoint) {
				const { lat, lng } = location.centerPoint;

				// Check if in CONUS bounds
				if (
					lat >= US_BOUNDS.SOUTH &&
					lat <= US_BOUNDS.NORTH &&
					lng >= US_BOUNDS.WEST &&
					lng <= US_BOUNDS.EAST
				) {
					// Return UTM zone as fallback
					const utmZone = Math.floor((lng + 180) / 6) + 1;
					return `EPSG:326${utmZone.toString().padStart(2, '0')}`;
				}
			}

			return null;
		},

		isLocationInCountry(location: LocationSpec): boolean {
			// Check country code
			if (location.country?.toUpperCase() === 'US' || location.country?.toUpperCase() === 'USA') {
				return true;
			}

			// Check state/subdivision
			const state = location.subdivision || location.region;
			if (state && normalizeStateName(state)) {
				return true;
			}

			// Check coordinates
			if (location.centerPoint) {
				const { lat, lng } = location.centerPoint;

				// CONUS
				if (
					lat >= US_BOUNDS.SOUTH &&
					lat <= US_BOUNDS.NORTH &&
					lng >= US_BOUNDS.WEST &&
					lng <= US_BOUNDS.EAST
				) {
					return true;
				}

				// Alaska
				if (
					lat >= US_BOUNDS.ALASKA.SOUTH &&
					lat <= US_BOUNDS.ALASKA.NORTH &&
					lng >= US_BOUNDS.ALASKA.WEST &&
					lng <= US_BOUNDS.ALASKA.EAST
				) {
					return true;
				}

				// Hawaii
				if (
					lat >= US_BOUNDS.HAWAII.SOUTH &&
					lat <= US_BOUNDS.HAWAII.NORTH &&
					lng >= US_BOUNDS.HAWAII.WEST &&
					lng <= US_BOUNDS.HAWAII.EAST
				) {
					return true;
				}
			}

			return false;
		},

		getCountryBounds(): BoundingBox {
			// Return extended bounds including Alaska and Hawaii
			return {
				north: US_BOUNDS.EXTENDED.NORTH,
				south: US_BOUNDS.EXTENDED.SOUTH,
				east: US_BOUNDS.EXTENDED.EAST,
				west: US_BOUNDS.EXTENDED.WEST,
			};
		},
	};
}

/**
 * Reset cache (for testing)
 */
export function resetUsPackCache(): void {
	crsDataCache = null;
	recommendationsCache = null;
	transformationsCache = null;
	bestPracticesCache = null;
	troubleshootingCache = null;
}
