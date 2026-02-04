/**
 * UK Pack Constants
 *
 * United Kingdom specific geographic and CRS constants
 */

/**
 * UK Geographic Bounds
 */
export const UK_BOUNDS = {
	/** UK mainland bounding box (Great Britain + Northern Ireland) */
	NORTH: 61.0, // Shetland Islands
	SOUTH: 49.9, // Channel Islands
	EAST: 1.8, // East Anglia
	WEST: -8.7, // Western Scotland

	/** England bounds */
	ENGLAND: {
		NORTH: 55.8,
		SOUTH: 49.9,
		EAST: 1.8,
		WEST: -6.4,
	},

	/** Scotland bounds */
	SCOTLAND: {
		NORTH: 61.0,
		SOUTH: 54.6,
		EAST: -0.7,
		WEST: -8.7,
	},

	/** Wales bounds */
	WALES: {
		NORTH: 53.5,
		SOUTH: 51.4,
		EAST: -2.6,
		WEST: -5.3,
	},

	/** Northern Ireland bounds */
	NORTHERN_IRELAND: {
		NORTH: 55.4,
		SOUTH: 54.0,
		EAST: -5.4,
		WEST: -8.2,
	},
} as const;

/**
 * British National Grid (BNG) zones
 * Note: BNG uses a single projection for all of Great Britain
 */
export const UK_BNG = {
	/** OSGB36 / British National Grid */
	BNG: 'EPSG:27700',
	/** Origin (false origin) */
	FALSE_EASTING: 400000,
	FALSE_NORTHING: -100000,
	/** Central meridian */
	CENTRAL_MERIDIAN: -2,
	/** Scale factor */
	SCALE_FACTOR: 0.9996012717,
} as const;

/**
 * UK Primary EPSG Codes
 */
export const UK_EPSG = {
	// Geographic CRS
	OSGB36: 'EPSG:4277', // Ordnance Survey Great Britain 1936
	ETRS89: 'EPSG:4258', // European Terrestrial Reference System 1989
	WGS84: 'EPSG:4326', // For GPS/international use

	// Projected CRS
	BNG: 'EPSG:27700', // British National Grid (OSGB36 based)
	BNG_ETRS89: 'EPSG:7405', // BNG (ETRS89 based) - for modern surveys

	// Irish Grid (for Northern Ireland context)
	IRISH_GRID: 'EPSG:29902', // TM65 / Irish Grid
	ITM: 'EPSG:2157', // Irish Transverse Mercator (modern)

	// UTM zones covering UK
	UTM_29N: 'EPSG:32629', // Western Scotland
	UTM_30N: 'EPSG:32630', // Most of UK
	UTM_31N: 'EPSG:32631', // Eastern England
} as const;

/**
 * Valid UK country codes (for location matching)
 * Includes ISO 3166-1 alpha-2, alpha-3, and common aliases
 */
export const UK_COUNTRY_CODES = ['UK', 'GB', 'GBR', 'BRITAIN'] as const;

/**
 * UK administrative regions
 */
export const UK_REGIONS = ['England', 'Scotland', 'Wales', 'Northern Ireland'] as const;

/**
 * UK historic counties / regions for reference
 */
export const UK_COUNTIES: Record<string, string> = {
	// England - major regions
	'Greater London': 'England',
	'South East': 'England',
	'South West': 'England',
	'East of England': 'England',
	'East Midlands': 'England',
	'West Midlands': 'England',
	'Yorkshire and the Humber': 'England',
	'North West': 'England',
	'North East': 'England',

	// Scotland
	Highlands: 'Scotland',
	'Central Belt': 'Scotland',
	'Scottish Borders': 'Scotland',

	// Wales
	'North Wales': 'Wales',
	'South Wales': 'Wales',
	'Mid Wales': 'Wales',

	// Northern Ireland
	Belfast: 'Northern Ireland',
	Antrim: 'Northern Ireland',
	Down: 'Northern Ireland',
};
