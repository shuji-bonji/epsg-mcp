/**
 * Message constants for services
 * Centralized location for all user-facing strings
 */

/**
 * Purpose names (display labels)
 */
export const PURPOSE_NAMES = {
	web_mapping: 'Web Mapping',
	distance_calculation: 'Distance Calculation',
	area_calculation: 'Area Calculation',
	survey: 'Survey',
	navigation: 'Navigation',
	data_exchange: 'Data Exchange',
	data_storage: 'Data Storage',
	visualization: 'Visualization',
} as const;

/**
 * Datum names
 */
export const DATUM_NAMES = {
	JGD2011: 'JGD2011',
	JGD2000: 'JGD2000',
	TOKYO: 'Tokyo Datum',
	WGS84: 'WGS84',
} as const;

/**
 * Aspect display names
 */
export const ASPECT_NAMES = {
	datum: 'Datum',
	projection: 'Projection',
	area_of_use: 'Area of Use',
	accuracy: 'Accuracy',
	distortion: 'Distortion',
	compatibility: 'Compatibility',
	use_cases: 'Use Cases',
} as const;

/**
 * Comparison verdicts - Datum
 */
export const DATUM_VERDICTS = {
	SAME: 'Same datum used',
	PRACTICALLY_IDENTICAL: 'Practically identical (within a few cm)',
	LEGACY_DATUM: 'Includes legacy datum. 1-2m error during transformation',
	CRUSTAL_DEFORMATION: 'JGD2000→JGD2011 requires crustal deformation correction',
	DIFFERENT: 'Different datums. Transformation required',
} as const;

/**
 * Comparison verdicts - Projection
 */
export const PROJECTION_VERDICTS = {
	NO_PROJECTION: 'Geographic CRS (no projection)',
	BOTH_GEOGRAPHIC: 'Both are geographic CRS. No projection distortion',
	SAME_METHOD: 'Same projection method. Parameters may differ',
	DIFFERENT_METHOD: 'Different projection methods. Distortion characteristics differ',
	GEOGRAPHIC_VS_PROJECTED: 'Geographic vs projected CRS. Choose based on use case',
} as const;

/**
 * Comparison verdicts - Area of Use
 */
export const AREA_VERDICTS = {
	SAME: 'Same area of use',
	GLOBAL_VS_REGIONAL: 'Comparing global CRS with regional CRS',
	BOTH_JAPAN: 'Both for Japan. Coverage areas may differ',
	DIFFERENT: 'Different areas of use',
} as const;

/**
 * Comparison verdicts - Accuracy
 */
export const ACCURACY_VERDICTS = {
	SIMILAR: 'Similar accuracy',
	HIGHER: (code: string) => `${code} has higher accuracy`,
	DIFFERENT: 'Different accuracy characteristics',
} as const;

/**
 * Comparison verdicts - Distortion
 */
export const DISTORTION_VERDICTS = {
	NO_PROJECTION: 'Both are geographic CRS. No projection distortion',
	WEB_MERCATOR: 'Web Mercator has significant distortion for area/distance calculations',
	DIFFERENT: 'Different distortion characteristics',
} as const;

/**
 * Default distortion descriptions
 */
export const DISTORTION_DEFAULTS = {
	GEOGRAPHIC: 'Geographic CRS (no projection distortion)',
	WEB_MERCATOR: 'Large area distortion at high latitudes',
	PROJECTED: 'Projected CRS (high accuracy within limited area)',
} as const;

/**
 * Comparison verdicts - Compatibility
 */
export const COMPATIBILITY_VERDICTS = {
	WGS84_WIDEST: 'WGS84 has the widest compatibility',
	WEB_MERCATOR_STANDARD: 'Web Mercator is standard for web mapping libraries',
	DIFFERENT: 'Different compatibility characteristics',
} as const;

/**
 * Compatibility format strings
 */
export const COMPATIBILITY_FORMATS = {
	LIMITED: 'Limited',
	HIGH_WITH: (systems: string) => `High compatibility with ${systems}`,
	GIS_GPS: 'GIS/GPS compatible',
} as const;

/**
 * Comparison verdicts - Use Cases
 */
export const USE_CASE_VERDICTS = {
	SIMILAR: 'Similar use case suitability',
	BETTER_FOR: (code: string, purposes: string) => `${code} better for: ${purposes}`,
} as const;

/**
 * Score summary strings
 */
export const SCORE_SUMMARY = {
	NONE: 'None',
	HIGH_SUITABILITY: (items: string) => `High suitability: ${items}`,
} as const;

/**
 * Summary messages for specific CRS combinations
 */
export const SUMMARIES = {
	WGS84_JGD2011:
		'WGS84 and JGD2011 are practically identical (within a few cm). JGD2011 is recommended for data in Japan.',
	WGS84_WEB_MERCATOR:
		'Comparison of geographic CRS and Web Mercator. Use EPSG:3857 for web map display, EPSG:4326 for data storage.',
	JGD2000_JGD2011:
		'Migration from JGD2000 to JGD2011 is necessary for crustal deformation correction after the 2011 earthquake.',
	GEOGRAPHIC_VS_PROJECTED:
		'Comparison of geographic and projected CRS. Choose based on your use case.',
	DEFAULT: (name1: string, name2: string) =>
		`Comparison of ${name1} and ${name2}. Review the characteristics for each.`,
} as const;

/**
 * Recommendation messages
 */
export const RECOMMENDATIONS = {
	DEPRECATED: (code: string, alternative: string) =>
		`${code} is deprecated. Migration to ${alternative} is recommended.`,
	GEOGRAPHIC_VS_PROJECTED:
		'Use geographic CRS for wide-area data storage, projected CRS for local calculations.',
	CHOOSE_BASED_ON_USE: 'Choose the appropriate CRS based on your use case and target area.',
} as const;

/**
 * Transformation note format
 */
export const TRANSFORMATION_NOTES = {
	METHOD_ACCURACY: (method: string, accuracy: number | string) =>
		`Transformation method: ${method}. Accuracy: ${accuracy}`,
} as const;

/**
 * Placeholder values
 */
export const PLACEHOLDERS = {
	NA: 'N/A',
} as const;

/**
 * Warning messages for recommendation service
 */
export const RECOMMENDATION_WARNINGS = {
	MULTI_ZONE_SPECIFY: (prefecture: string) =>
		`${prefecture} spans multiple zones. Specify city or coordinates for more accurate recommendations.`,
	DEFAULT_ZONE_USED: 'Prefecture could not be determined. Using Zone IX (Tokyo area) as default.',
	WIDE_AREA_CALCULATION: (crs: string) =>
		`Wide-area calculation detected. For areas spanning multiple zones, consider geodetic calculations using JGD2011 geographic CRS (${crs}).`,
} as const;

/**
 * Usage notes
 */
export const USAGE_NOTES = {
	FALLBACK_WIDE_AREA: 'Fallback for wide-area calculations',
} as const;

/**
 * Error messages
 */
export const ERRORS = {
	UNKNOWN_PURPOSE: (purpose: string) => `Unknown purpose: ${purpose}`,
	NO_RECOMMENDATION_RULE: (purpose: string, region: string) =>
		`No recommendation rule for ${purpose} in ${region}`,
	UNKNOWN_ASPECT: (aspect: string) => `Unknown comparison aspect: ${aspect}`,
} as const;
