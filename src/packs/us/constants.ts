/**
 * US Pack Constants
 *
 * United States specific geographic and CRS constants
 */

/**
 * US Geographic Bounds
 */
export const US_BOUNDS = {
	/** Continental US (CONUS) bounding box */
	NORTH: 49.5,
	SOUTH: 24.5,
	EAST: -66.5,
	WEST: -125.0,

	/** Alaska bounds */
	ALASKA: {
		NORTH: 71.5,
		SOUTH: 51.0,
		EAST: -130.0,
		WEST: -180.0,
	},

	/** Hawaii bounds */
	HAWAII: {
		NORTH: 22.5,
		SOUTH: 18.5,
		EAST: -154.5,
		WEST: -161.0,
	},

	/** Extended bounds including Alaska and Hawaii */
	EXTENDED: {
		NORTH: 71.5,
		SOUTH: 18.5,
		EAST: -66.5,
		WEST: -180.0,
	},
} as const;

/**
 * State Plane Coordinate System (SPCS) EPSG Codes
 * Representative zones for major states
 */
export const US_SPCS = {
	// NAD83 based SPCS zones (representative)
	CALIFORNIA_5: 'EPSG:2229', // Los Angeles area
	CALIFORNIA_3: 'EPSG:2227', // San Francisco area
	NEW_YORK_LONG_ISLAND: 'EPSG:2263',
	NEW_YORK_CENTRAL: 'EPSG:2261',
	TEXAS_CENTRAL: 'EPSG:2277',
	TEXAS_SOUTH: 'EPSG:2279',
	FLORIDA_EAST: 'EPSG:2236',
	FLORIDA_WEST: 'EPSG:2237',
	WASHINGTON_NORTH: 'EPSG:2285',
	WASHINGTON_SOUTH: 'EPSG:2286',

	// NAD83(2011) based SPCS zones
	CALIFORNIA_5_2011: 'EPSG:6423',
	NEW_YORK_LONG_ISLAND_2011: 'EPSG:6539',
} as const;

/**
 * US Primary EPSG Codes
 */
export const US_EPSG = {
	// Geographic CRS
	NAD83: 'EPSG:4269',
	NAD83_2011: 'EPSG:6318',
	NAD27: 'EPSG:4267', // Legacy datum

	// Projected CRS (national/regional)
	CONUS_ALBERS: 'EPSG:5070', // NAD83 / Conus Albers
	CONUS_ALBERS_2011: 'EPSG:6350', // NAD83(2011) / Conus Albers

	// UTM zones covering continental US
	UTM_10N: 'EPSG:32610', // California (west)
	UTM_11N: 'EPSG:32611', // California/Nevada
	UTM_12N: 'EPSG:32612', // Arizona/Utah
	UTM_13N: 'EPSG:32613', // Colorado/New Mexico
	UTM_14N: 'EPSG:32614', // Texas (west)
	UTM_15N: 'EPSG:32615', // Texas/Oklahoma
	UTM_16N: 'EPSG:32616', // Central US
	UTM_17N: 'EPSG:32617', // Eastern US
	UTM_18N: 'EPSG:32618', // East coast
	UTM_19N: 'EPSG:32619', // New England

	// State Plane zones
	SPCS: US_SPCS,
} as const;

/**
 * State name to abbreviation mapping
 */
export const US_STATE_ABBREV: Record<string, string> = {
	Alabama: 'AL',
	Alaska: 'AK',
	Arizona: 'AZ',
	Arkansas: 'AR',
	California: 'CA',
	Colorado: 'CO',
	Connecticut: 'CT',
	Delaware: 'DE',
	'District of Columbia': 'DC',
	Florida: 'FL',
	Georgia: 'GA',
	Hawaii: 'HI',
	Idaho: 'ID',
	Illinois: 'IL',
	Indiana: 'IN',
	Iowa: 'IA',
	Kansas: 'KS',
	Kentucky: 'KY',
	Louisiana: 'LA',
	Maine: 'ME',
	Maryland: 'MD',
	Massachusetts: 'MA',
	Michigan: 'MI',
	Minnesota: 'MN',
	Mississippi: 'MS',
	Missouri: 'MO',
	Montana: 'MT',
	Nebraska: 'NE',
	Nevada: 'NV',
	'New Hampshire': 'NH',
	'New Jersey': 'NJ',
	'New Mexico': 'NM',
	'New York': 'NY',
	'North Carolina': 'NC',
	'North Dakota': 'ND',
	Ohio: 'OH',
	Oklahoma: 'OK',
	Oregon: 'OR',
	Pennsylvania: 'PA',
	'Rhode Island': 'RI',
	'South Carolina': 'SC',
	'South Dakota': 'SD',
	Tennessee: 'TN',
	Texas: 'TX',
	Utah: 'UT',
	Vermont: 'VT',
	Virginia: 'VA',
	Washington: 'WA',
	'West Virginia': 'WV',
	Wisconsin: 'WI',
	Wyoming: 'WY',
};

/**
 * Multi-zone states (states with multiple SPCS zones)
 */
export const US_MULTI_ZONE_STATES = new Set([
	'California', // 6 zones
	'Texas', // 5 zones
	'New York', // 4 zones
	'Florida', // 3 zones
	'Alaska', // 10 zones
	'Washington', // 2 zones
	'Oregon', // 2 zones
	'Montana', // 2 zones (unofficial)
	'Colorado', // 3 zones
]);
