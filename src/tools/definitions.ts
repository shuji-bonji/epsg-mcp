/**
 * MCP Tool Definitions
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';

export const tools: Tool[] = [
	{
		name: 'search_crs',
		description:
			'Search EPSG Coordinate Reference Systems (CRS) by keyword. Searchable by EPSG code, name, region name, or prefecture name. Covers Japanese JGD2011 CRS family, global WGS84, Web Mercator, and more.',
		inputSchema: {
			type: 'object',
			properties: {
				query: {
					type: 'string',
					description: 'Search keyword (e.g., "JGD2011", "4326", "Tokyo", "plane rectangular")',
				},
				type: {
					type: 'string',
					enum: ['geographic', 'projected', 'compound', 'vertical', 'engineering'],
					description: 'Filter by CRS type (geographic: lat/lon, projected: x/y meters)',
				},
				region: {
					type: 'string',
					description: 'Filter by region ("Japan" or "Global")',
				},
				limit: {
					type: 'number',
					description: 'Maximum number of results (default: 10, max: 100)',
					default: 10,
				},
			},
			required: ['query'],
		},
	},
	{
		name: 'get_crs_detail',
		description:
			'Get detailed information for a specific EPSG code. Includes datum, projection method, area of use, accuracy characteristics, and intended use cases.',
		inputSchema: {
			type: 'object',
			properties: {
				code: {
					type: 'string',
					description: 'EPSG code (e.g., "EPSG:6677" or "6677")',
				},
			},
			required: ['code'],
		},
	},
	{
		name: 'list_crs_by_region',
		description:
			'Get available CRS list for a region with purpose-based recommendations. Japan includes Plane Rectangular CS (Zones I-XIX), Global includes WGS84 and UTM zones.',
		inputSchema: {
			type: 'object',
			properties: {
				region: {
					type: 'string',
					description: 'Region name ("Japan" or "Global")',
				},
				type: {
					type: 'string',
					enum: ['geographic', 'projected', 'compound', 'vertical', 'engineering'],
					description: 'Filter by CRS type',
				},
				includeDeprecated: {
					type: 'boolean',
					description: 'Include deprecated CRS (default: false)',
					default: false,
				},
			},
			required: ['region'],
		},
	},
	{
		name: 'recommend_crs',
		description:
			'Recommend the optimal CRS based on purpose and location. Supports web mapping, distance/area calculation, surveying, navigation, data exchange, etc. Full support for Japan Plane Rectangular CS (Zones I-XIX) including multi-zone regions like Hokkaido and Okinawa.',
		inputSchema: {
			type: 'object',
			properties: {
				purpose: {
					type: 'string',
					enum: [
						'web_mapping',
						'distance_calculation',
						'area_calculation',
						'survey',
						'navigation',
						'data_exchange',
						'data_storage',
						'visualization',
					],
					description:
						'Intended use (web_mapping: web map display, distance_calculation: distance calc, area_calculation: area calc, survey: surveying, navigation: GPS/navigation, data_exchange: interoperability, data_storage: archival, visualization: display)',
				},
				location: {
					type: 'object',
					description: 'Target location specification',
					properties: {
						country: {
							type: 'string',
							description: 'Country ("Japan" or "Global")',
						},
						region: {
							type: 'string',
							description: 'Region name (e.g., "Kanto", "Hokkaido", "Main Island", "Sakishima")',
						},
						prefecture: {
							type: 'string',
							description: 'Prefecture name (e.g., "Tokyo", "Hokkaido", "Okinawa")',
						},
						city: {
							type: 'string',
							description:
								'City/municipality name (e.g., "Sapporo", "Naha") for multi-zone region disambiguation',
						},
						boundingBox: {
							type: 'object',
							description: 'Bounding box of target area',
							properties: {
								north: { type: 'number', description: 'North latitude' },
								south: { type: 'number', description: 'South latitude' },
								east: { type: 'number', description: 'East longitude' },
								west: { type: 'number', description: 'West longitude' },
							},
						},
						centerPoint: {
							type: 'object',
							description: 'Center coordinates',
							properties: {
								lat: { type: 'number', description: 'Latitude' },
								lng: { type: 'number', description: 'Longitude' },
							},
						},
					},
				},
				requirements: {
					type: 'object',
					description: 'Additional requirements',
					properties: {
						accuracy: {
							type: 'string',
							enum: ['high', 'medium', 'low'],
							description: 'Accuracy requirement',
						},
						distortionTolerance: {
							type: 'string',
							enum: ['minimal', 'moderate', 'flexible'],
							description: 'Distortion tolerance',
						},
						interoperability: {
							type: 'array',
							items: { type: 'string' },
							description: 'Interoperability requirements (e.g., "GIS", "CAD", "Web")',
						},
					},
				},
			},
			required: ['purpose', 'location'],
		},
	},
	{
		name: 'validate_crs_usage',
		description:
			'Validate whether a CRS is appropriate for a specific purpose and location. Detects deprecated CRS usage, area/distance calculation distortion issues, inappropriate zone selection for surveying, and provides improvement suggestions.',
		inputSchema: {
			type: 'object',
			properties: {
				crs: {
					type: 'string',
					description: 'EPSG code to validate (e.g., "EPSG:3857" or "3857")',
				},
				purpose: {
					type: 'string',
					enum: [
						'web_mapping',
						'distance_calculation',
						'area_calculation',
						'survey',
						'navigation',
						'data_exchange',
						'data_storage',
						'visualization',
					],
					description: 'Intended use',
				},
				location: {
					type: 'object',
					description: 'Target location specification',
					properties: {
						country: {
							type: 'string',
							description: 'Country ("Japan" or "Global")',
						},
						region: {
							type: 'string',
							description: 'Region name',
						},
						prefecture: {
							type: 'string',
							description: 'Prefecture name',
						},
						city: {
							type: 'string',
							description: 'City/municipality name',
						},
						boundingBox: {
							type: 'object',
							description: 'Bounding box of target area',
							properties: {
								north: { type: 'number' },
								south: { type: 'number' },
								east: { type: 'number' },
								west: { type: 'number' },
							},
						},
						centerPoint: {
							type: 'object',
							description: 'Center coordinates',
							properties: {
								lat: { type: 'number' },
								lng: { type: 'number' },
							},
						},
					},
				},
			},
			required: ['crs', 'purpose', 'location'],
		},
	},
	{
		name: 'suggest_transformation',
		description:
			'Suggest transformation paths between two CRS. Covers Tokyo Datum to JGD2011, WGS84 to Plane Rectangular CS, etc. Searches multi-step paths, provides accuracy info, and warns about cumulative errors.',
		inputSchema: {
			type: 'object',
			properties: {
				sourceCrs: {
					type: 'string',
					description: 'Source EPSG code (e.g., "EPSG:4301" or "4301")',
				},
				targetCrs: {
					type: 'string',
					description: 'Target EPSG code (e.g., "EPSG:6668" or "6668")',
				},
				location: {
					type: 'object',
					description: 'Location of data being transformed (optional, for accuracy improvement)',
					properties: {
						country: {
							type: 'string',
							description: 'Country ("Japan" or "Global")',
						},
						prefecture: {
							type: 'string',
							description: 'Prefecture name',
						},
						boundingBox: {
							type: 'object',
							description: 'Bounding box of target area',
							properties: {
								north: { type: 'number' },
								south: { type: 'number' },
								east: { type: 'number' },
								west: { type: 'number' },
							},
						},
						centerPoint: {
							type: 'object',
							description: 'Center coordinates',
							properties: {
								lat: { type: 'number' },
								lng: { type: 'number' },
							},
						},
					},
				},
			},
			required: ['sourceCrs', 'targetCrs'],
		},
	},
	{
		name: 'compare_crs',
		description:
			'Compare two CRS from various perspectives. Compares datum, projection method, area of use, accuracy, distortion characteristics, compatibility, and use case suitability. Explains which is better suited for specific purposes.',
		inputSchema: {
			type: 'object',
			properties: {
				crs1: {
					type: 'string',
					description: 'First EPSG code to compare (e.g., "EPSG:4326" or "4326")',
				},
				crs2: {
					type: 'string',
					description: 'Second EPSG code to compare (e.g., "EPSG:6668" or "6668")',
				},
				aspects: {
					type: 'array',
					items: {
						type: 'string',
						enum: [
							'accuracy',
							'area_of_use',
							'distortion',
							'compatibility',
							'use_cases',
							'datum',
							'projection',
						],
					},
					description:
						'Comparison aspects (all if omitted). accuracy: precision, area_of_use: coverage, distortion: distortion properties, compatibility: interoperability, use_cases: suitability, datum: geodetic datum, projection: projection method',
				},
			},
			required: ['crs1', 'crs2'],
		},
	},
	{
		name: 'get_best_practices',
		description:
			'Get CRS best practices for specific topics. Covers surveying in Japan, web mapping, data exchange, coordinate storage, mobile GPS, cross-border data, historical data, GIS integration, precision requirements, and projection selection. Provides recommended practices, common mistakes, and reference materials.',
		inputSchema: {
			type: 'object',
			properties: {
				topic: {
					type: 'string',
					enum: [
						'japan_survey',
						'web_mapping',
						'data_exchange',
						'coordinate_storage',
						'mobile_gps',
						'cross_border',
						'historical_data',
						'gis_integration',
						'precision_requirements',
						'projection_selection',
					],
					description:
						'Best practice topic. japan_survey: surveying in Japan, web_mapping: web map creation, data_exchange: interoperability, coordinate_storage: archival, mobile_gps: mobile GPS apps, cross_border: cross-border data, historical_data: legacy data, gis_integration: GIS system integration, precision_requirements: accuracy specs, projection_selection: choosing projections',
				},
				context: {
					type: 'string',
					description: 'Additional context information (optional, max 500 chars)',
					maxLength: 500,
				},
			},
			required: ['topic'],
		},
	},
	{
		name: 'troubleshoot',
		description:
			'Troubleshoot CRS-related problems. Diagnoses coordinate shifts (cm, m, km scale), area/distance calculation errors, data not displaying, and transformation errors. Identifies causes, provides diagnostic steps, and solutions.',
		inputSchema: {
			type: 'object',
			properties: {
				symptom: {
					type: 'string',
					description:
						'Describe the problem (e.g., "coordinates shifted by 400m", "area calculation results are wrong", "data not displaying"). 2-500 characters.',
					minLength: 2,
					maxLength: 500,
				},
				context: {
					type: 'object',
					description: 'Problem context (optional)',
					properties: {
						sourceCrs: {
							type: 'string',
							description: 'Source CRS (e.g., "EPSG:4301")',
						},
						targetCrs: {
							type: 'string',
							description: 'Target CRS (e.g., "EPSG:6668")',
						},
						location: {
							type: 'string',
							description: 'Target region (e.g., "Tohoku region", "Tokyo")',
						},
						tool: {
							type: 'string',
							description: 'Tool being used (e.g., "QGIS", "PostGIS")',
						},
						magnitude: {
							type: 'string',
							description: 'Magnitude of shift (e.g., "400m", "few cm", "1-2m")',
						},
					},
				},
			},
			required: ['symptom'],
		},
	},
];
