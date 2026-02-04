/**
 * UK Country Knowledge Pack
 *
 * United Kingdom CRS knowledge including OSGB36, British National Grid,
 * ETRS89, and related transformations
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
import { UK_BOUNDS, UK_COUNTIES, UK_COUNTRY_CODES, UK_EPSG, UK_REGIONS } from './constants.js';

/**
 * Check if country code matches UK
 */
function isUkCountryCode(country: string | undefined): boolean {
	if (!country) return false;
	return UK_COUNTRY_CODES.includes(country.toUpperCase() as (typeof UK_COUNTRY_CODES)[number]);
}

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
 * Check if a region is in Northern Ireland (uses different CRS)
 */
function isNorthernIreland(region: string): boolean {
	const niRegions = ['Northern Ireland', 'Belfast', 'Antrim', 'Down', 'Londonderry', 'Derry'];
	return niRegions.some(
		(r) =>
			region.toLowerCase() === r.toLowerCase() || region.toLowerCase().includes(r.toLowerCase())
	);
}

/**
 * Normalize region name
 */
function normalizeRegionName(input: string): string | null {
	const normalized = input.trim();

	// Check UK regions
	for (const region of UK_REGIONS) {
		if (region.toLowerCase() === normalized.toLowerCase()) {
			return region;
		}
	}

	// Check counties/sub-regions
	for (const county of Object.keys(UK_COUNTIES)) {
		if (county.toLowerCase() === normalized.toLowerCase()) {
			return county;
		}
	}

	return normalized;
}

/**
 * Create UK Pack
 */
export function createUkPack(): CountryPack {
	return {
		metadata: {
			countryCode: 'UK',
			name: 'UK CRS Knowledge Pack',
			version: '1.0.0',
			primaryDatum: 'OSGB36',
			description: 'OSGB36, British National Grid, ETRS89, and UK-specific CRS knowledge',
			language: 'en',
			aliases: ['GB', 'GBR', 'BRITAIN'],
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
				zoneMapping: Record<string, { zone: string; code: string; name?: string; notes?: string }>;
			}>('crs-data.json');

			if (!recommendationsCache) {
				recommendationsCache = await loadJsonData<Record<string, unknown>>('recommendations.json');
			}

			const entries: ZoneMapping['entries'] = {};
			for (const [region, mapping] of Object.entries(data.zoneMapping)) {
				entries[region] = {
					zone: mapping.zone,
					code: mapping.code,
					name: mapping.name,
					notes: mapping.notes,
				};
			}

			const multiZoneRegions =
				(recommendationsCache.multiZoneRegions as Record<
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
				multiZoneRegions,
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
			// UK-specific validation rules can be added here
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
					'EPSG:4258',
					'EPSG:4326',
					'EPSG:27700',
				],
				deprecatedCrs: (transformationsCache.deprecatedCrs as string[]) || ['EPSG:29902'],
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
			const region = location.subdivision || location.region;
			const normalizedRegion = region ? normalizeRegionName(region) : null;

			// Northern Ireland uses ITM
			if (normalizedRegion && isNorthernIreland(normalizedRegion)) {
				return UK_EPSG.ITM;
			}

			// Check city for Northern Ireland
			if (location.city && isNorthernIreland(location.city)) {
				return UK_EPSG.ITM;
			}

			// Great Britain uses BNG
			if (normalizedRegion) {
				const parentRegion = UK_COUNTIES[normalizedRegion];
				if (parentRegion === 'Northern Ireland') {
					return UK_EPSG.ITM;
				}
				// All other UK regions use BNG
				return UK_EPSG.BNG;
			}

			// Coordinate-based lookup
			if (location.centerPoint) {
				const { lat, lng } = location.centerPoint;

				// Check if in UK bounds
				if (
					lat >= UK_BOUNDS.SOUTH &&
					lat <= UK_BOUNDS.NORTH &&
					lng >= UK_BOUNDS.WEST &&
					lng <= UK_BOUNDS.EAST
				) {
					// Check Northern Ireland bounds
					if (
						lat >= UK_BOUNDS.NORTHERN_IRELAND.SOUTH &&
						lat <= UK_BOUNDS.NORTHERN_IRELAND.NORTH &&
						lng >= UK_BOUNDS.NORTHERN_IRELAND.WEST &&
						lng <= UK_BOUNDS.NORTHERN_IRELAND.EAST
					) {
						return UK_EPSG.ITM;
					}
					// Great Britain
					return UK_EPSG.BNG;
				}
			}

			// Default: if country is UK but no specific region/coordinates, use BNG
			if (isUkCountryCode(location.country)) {
				return UK_EPSG.BNG;
			}

			return null;
		},

		isLocationInCountry(location: LocationSpec): boolean {
			// Check country code
			if (isUkCountryCode(location.country)) {
				return true;
			}

			// Check region/subdivision
			const region = location.subdivision || location.region;
			if (region) {
				const normalized = normalizeRegionName(region);
				if (normalized) {
					// Check if it's a UK region
					if (UK_REGIONS.includes(normalized as (typeof UK_REGIONS)[number])) {
						return true;
					}
					// Check if it's a UK county
					if (UK_COUNTIES[normalized]) {
						return true;
					}
				}
			}

			// Check coordinates
			if (location.centerPoint) {
				const { lat, lng } = location.centerPoint;
				return (
					lat >= UK_BOUNDS.SOUTH &&
					lat <= UK_BOUNDS.NORTH &&
					lng >= UK_BOUNDS.WEST &&
					lng <= UK_BOUNDS.EAST
				);
			}

			return false;
		},

		getCountryBounds(): BoundingBox {
			return {
				north: UK_BOUNDS.NORTH,
				south: UK_BOUNDS.SOUTH,
				east: UK_BOUNDS.EAST,
				west: UK_BOUNDS.WEST,
			};
		},
	};
}

/**
 * Reset cache (for testing)
 */
export function resetUkPackCache(): void {
	crsDataCache = null;
	recommendationsCache = null;
	transformationsCache = null;
	bestPracticesCache = null;
	troubleshootingCache = null;
}
