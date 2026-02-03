# EPSG MCP Server

[![npm version](https://img.shields.io/npm/v/@shuji-bonji/epsg-mcp.svg)](https://www.npmjs.com/package/@shuji-bonji/epsg-mcp)
[![CI](https://github.com/shuji-bonji/epsg-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/shuji-bonji/epsg-mcp/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![MCP](https://img.shields.io/badge/MCP-Compatible-blue.svg)](https://modelcontextprotocol.io/)
[![Built with Claude Code](https://img.shields.io/badge/Built%20with-Claude%20Code-blueviolet?logo=anthropic)](https://claude.ai/code)

[日本語版 README](README.ja.md)

An MCP server that provides specialized knowledge and decision support for Coordinate Reference Systems (CRS) worldwide.

**Global coverage** through a 3-layer fallback:
1. **Country Packs** (Japan, US State Plane, UK National Grid, etc.) for expert-level recommendations
2. **Automatic UTM zone calculation** when no pack is available
3. **Safe defaults** (WGS84 / Web Mercator) as the final fallback

Coordinate transformation execution is delegated to [mcp-server-proj](https://github.com/mcp-server-proj), **focusing on knowledge provision and decision support**.

## Features

- **CRS Search**: Search CRS by EPSG code, name, region, or prefecture
- **Detailed Information**: Get detailed information on geodetic datum, projection method, area of use, accuracy characteristics, and more
- **Regional Listings**: List CRS available in Japan/Global with purpose-specific recommendations
- **CRS Recommendation**: Recommend the optimal CRS for each purpose and location (with multi-zone support for Hokkaido and Okinawa)
- **Usage Validation**: Verify the validity of CRS selection and present issues with suggestions for improvement
- **Transformation Routing**: Propose optimal transformation paths using BFS graph search (with reverse transformation support)
- **CRS Comparison**: Compare CRS from 7 perspectives (datum, projection, accuracy, distortion, compatibility, etc.)
- **Best Practices**: CRS usage guidance on 10 topics (surveying, web mapping, data exchange, etc.)
- **Troubleshooting**: Diagnose CRS problems by symptoms (coordinate shifts, calculation errors, etc.)
- **Country Pack System**: Extensible regional expertise (Japan, US, UK available; easily add more)
- **Offline Operation**: Local database requires no external API
- **Internationalized**: Tool definitions and parameter descriptions in English (usable by AI agents in any language)
- **Graceful Degradation**: Works anywhere via UTM fallback even without region-specific packs

## Installation

```bash
npm install @shuji-bonji/epsg-mcp
```

Or run directly:

```bash
npx @shuji-bonji/epsg-mcp
```

## Usage

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
	"mcpServers": {
		"epsg": {
			"command": "npx",
			"args": ["@shuji-bonji/epsg-mcp"]
		}
	}
}
```

#### Enabling Additional Country Packs

By default, only the Japan pack is loaded. To enable additional packs (e.g., US, UK), set the `EPSG_PACKS` environment variable:

```json
{
	"mcpServers": {
		"epsg": {
			"command": "npx",
			"args": ["@shuji-bonji/epsg-mcp"],
			"env": {
				"EPSG_PACKS": "jp,us,uk"
			}
		}
	}
}
```

Available packs: `jp` (Japan), `us` (United States), `uk`/`gb` (United Kingdom)

#### Language Settings

By default, output is in English. To get Japanese output, set the `EPSG_LANG` environment variable:

```json
{
	"mcpServers": {
		"epsg": {
			"command": "npx",
			"args": ["@shuji-bonji/epsg-mcp"],
			"env": {
				"EPSG_LANG": "ja"
			}
		}
	}
}
```

### MCP Inspector

```bash
npx @anthropic-ai/mcp-inspector npx @shuji-bonji/epsg-mcp
```

## Tools

### search_crs

Search CRS by keyword.

```typescript
// Input
{
  query: string;           // Search keyword (e.g., "JGD2011", "4326", "Tokyo")
  type?: "geographic" | "projected" | "compound" | "vertical" | "engineering";
  region?: "Japan" | "Global";
  limit?: number;          // Default: 10
}

// Output
{
  results: CrsInfo[];
  totalCount: number;
}
```

**Usage Examples**:

- "Search for CRS related to JGD2011"
- "Find projected coordinate systems available in Tokyo"
- "Get information about EPSG code 6677"

### get_crs_detail

Get detailed CRS information by EPSG code.

```typescript
// Input
{
  code: string;  // "EPSG:6677" or "6677"
}

// Output
{
  code: string;
  name: string;
  type: CrsType;
  datum?: DatumInfo;
  projection?: ProjectionInfo;
  areaOfUse: AreaOfUse;
  accuracy?: AccuracyInfo;
  remarks?: string;
  useCases?: string[];
  // ...
}
```

**Usage Examples**:

- "Tell me the details of EPSG:6677"
- "What are the characteristics of Web Mercator (3857)?"

### list_crs_by_region

Get available CRS list and recommendations by region.

```typescript
// Input
{
  region: "Japan" | "Global";
  type?: CrsType;
  includeDeprecated?: boolean;  // Default: false
}

// Output
{
  region: string;
  crsList: CrsInfo[];
  recommendedFor: {
    general: string;
    survey: string;
    webMapping: string;
  };
}
```

**Usage Examples**:

- "List CRS available in Japan"
- "What global geographic coordinate systems are there?"

### recommend_crs

Recommend optimal CRS based on purpose and location.

```typescript
// Input
{
  purpose: "web_mapping" | "distance_calculation" | "area_calculation" |
           "survey" | "navigation" | "data_exchange" | "data_storage" | "visualization";
  location: {
    country?: string;      // "Japan" | "Global"
    prefecture?: string;   // "Tokyo", "Hokkaido", etc.
    city?: string;         // "Sapporo", "Naha", etc. (for multi-zone support)
    boundingBox?: BoundingBox;
    centerPoint?: { lat: number; lng: number };
  };
  requirements?: {
    accuracy?: "high" | "medium" | "low";
    distortionTolerance?: "minimal" | "moderate" | "flexible";
  };
}

// Output
{
  primary: RecommendedCrs;    // Recommended CRS (with score, pros, cons)
  alternatives: RecommendedCrs[];
  reasoning: string;
  warnings?: string[];        // Warnings for areas spanning multiple zones
}
```

**Usage Examples**:

- "What's the best CRS for distance calculation around Tokyo?"
- "What CRS should I use for surveying in Sapporo, Hokkaido?"
- "I want to display a map of all Japan in a web app"

### validate_crs_usage

Validate whether a specified CRS is appropriate for a specific purpose and location.

```typescript
// Input
{
  crs: string;               // "EPSG:3857" or "3857"
  purpose: Purpose;          // Same as recommend_crs
  location: LocationSpec;    // Same as recommend_crs
}

// Output
{
  isValid: boolean;
  score: number;             // Suitability 0-100
  issues: ValidationIssue[]; // List of issues
  suggestions: string[];     // Improvement suggestions
  betterAlternatives?: RecommendedCrs[];  // Alternatives when score is low
}
```

**Detected Issues Examples**:

- `DEPRECATED_CRS`: Using deprecated CRS
- `AREA_DISTORTION`: Area calculation with Web Mercator
- `ZONE_MISMATCH`: Using Zone I (for Nagasaki) in Tokyo
- `GEOJSON_INCOMPATIBLE`: Outputting GeoJSON with projected CRS

**Usage Examples**:

- "Is it OK to use Web Mercator for area calculation in Hokkaido?"
- "Any issues with storing survey data in Japan using EPSG:4326?"

### suggest_transformation

Suggest optimal transformation path between two CRS.

```typescript
// Input
{
  sourceCrs: string;    // "EPSG:4301" or "4301"
  targetCrs: string;    // "EPSG:6668" or "6668"
  location?: {
    country?: string;
    prefecture?: string;
    boundingBox?: BoundingBox;
  };
}

// Output
{
  directPath: TransformationPath | null;  // Direct transformation path
  viaPaths: TransformationPath[];         // Indirect transformation paths
  recommended: TransformationPath;        // Recommended path
  warnings: string[];
}
```

**TransformationPath**:

- `steps`: Array of transformation steps (from, to, method, accuracy, isReverse)
- `totalAccuracy`: Overall accuracy
- `complexity`: "simple" | "moderate" | "complex"

**Features**:

- BFS graph search for paths up to 4 steps
- Automatic consideration of reverse transformations (reversible: true)
- Warnings when using deprecated CRS (Tokyo Datum, JGD2000)
- Accuracy warnings for large area data transformation

**Usage Examples**:

- "How to transform from Tokyo Datum to JGD2011?"
- "Show me the transformation path from WGS84 to Web Mercator"

### compare_crs

Compare two CRS from various perspectives.

```typescript
// Input
{
  crs1: string;  // "EPSG:4326" or "4326"
  crs2: string;  // "EPSG:6668" or "6668"
  aspects?: ComparisonAspect[];  // Specify comparison aspects (all if omitted)
}

// ComparisonAspect
"datum" | "projection" | "area_of_use" | "accuracy" | "distortion" | "compatibility" | "use_cases"

// Output
{
  comparison: ComparisonResult[];  // Comparison results for each aspect
  summary: string;                 // Summary
  recommendation: string;          // Recommendation
  transformationNote?: string;     // Notes on transformation
}
```

**Comparison Aspects**:

- `datum`: Datum comparison (e.g., WGS84 vs JGD2011 are practically identical)
- `projection`: Projection comparison
- `area_of_use`: Area of use comparison
- `accuracy`: Accuracy characteristics comparison
- `distortion`: Distortion characteristics comparison
- `compatibility`: GIS/Web/CAD/GPS compatibility comparison
- `use_cases`: Use case suitability comparison (score-based)

**Usage Examples**:

- "What's the difference between WGS84 and JGD2011?"
- "Compare Web Mercator and geographic CRS"
- "Compare JGD2000 and JGD2011 from the datum perspective"

### get_best_practices

Get best practices for CRS usage.

```typescript
// Input
{
  topic: "japan_survey" | "web_mapping" | "data_exchange" | "coordinate_storage" |
         "mobile_gps" | "cross_border" | "historical_data" | "gis_integration" |
         "precision_requirements" | "projection_selection";
  context?: string;  // Additional context (optional, max 500 characters)
}

// Output
{
  topic: string;
  description: string;
  practices: Practice[];       // Recommended practices
  commonMistakes: Mistake[];   // Common mistakes
  relatedTopics: string[];     // Related topics
  references: Reference[];     // Reference materials
}
```

**Practice**:

- `title`: Practice name
- `description`: Description
- `priority`: "must" | "should" | "may"
- `rationale`: Rationale
- `example?`: Concrete example

**Usage Examples**:

- "What are the best practices for surveying in Japan?"
- "How to choose coordinate systems when creating web maps"
- "What to watch out for when exchanging data in GeoJSON"

### troubleshoot

Troubleshoot CRS-related problems.

```typescript
// Input
{
  symptom: string;  // Symptom (2-500 characters)
  context?: {
    sourceCrs?: string;   // Source CRS
    targetCrs?: string;   // Target CRS
    location?: string;    // Target region
    tool?: string;        // Tool being used
    magnitude?: string;   // Magnitude of shift
  };
}

// Output
{
  matchedSymptom: string;         // Matched symptom category
  possibleCauses: Cause[];        // Possible causes (with likelihood)
  diagnosticSteps: DiagnosticStep[]; // Diagnostic steps
  suggestedSolutions: Solution[]; // Solutions
  relatedBestPractices: string[]; // Related best practices
  confidence: "high" | "medium" | "low";  // Diagnosis confidence
}
```

**Supported Symptoms**:

- Coordinates shift by hundreds of meters to kilometers (Tokyo Datum issues, etc.)
- Coordinates shift by 1-several meters (transformation accuracy limits, etc.)
- Coordinates shift by centimeters to tens of centimeters (WGS84/JGD2011 difference, etc.)
- Area/distance calculations are incorrect (Web Mercator distortion, etc.)
- Data doesn't display (CRS mismatch, etc.)
- Coordinate transformation errors (unregistered parameters, etc.)

**Usage Examples**:

- "Coordinates are off by 400m"
- "Area calculation results are wrong"
- "Old data and new data don't align"

## Supported CRS

### Japan (JGD2011)

| EPSG      | Name                             | Usage                       |
| --------- | -------------------------------- | --------------------------- |
| 6668      | JGD2011                          | Geographic CRS (reference)  |
| 6669-6687 | Japan Plane Rectangular CS I-XIX | Surveying, large-scale maps |
| 4612      | JGD2000                          | Legacy (deprecated)         |

### United States (NAD83)

| EPSG | Name                         | Usage                     |
| ---- | ---------------------------- | ------------------------- |
| 4269 | NAD83                        | Geographic CRS (standard) |
| 6318 | NAD83(2011)                  | Latest realization        |
| 5070 | NAD83 / Conus Albers         | Area calculations         |
| 2229 | NAD83 / California zone 5    | State Plane example       |
| 2263 | NAD83 / New York Long Island | State Plane example       |

### United Kingdom (OSGB36/ETRS89)

| EPSG  | Name                      | Usage                   |
| ----- | ------------------------- | ----------------------- |
| 4277  | OSGB36                    | Geographic CRS (legacy) |
| 4258  | ETRS89                    | Geographic CRS (modern) |
| 27700 | British National Grid     | Surveying, mapping      |
| 2157  | Irish Transverse Mercator | Northern Ireland        |

### Global

| EPSG  | Name         | Usage                     |
| ----- | ------------ | ------------------------- |
| 4326  | WGS 84       | GPS/GeoJSON standard      |
| 3857  | Web Mercator | Web map display           |
| 326xx | UTM zones    | Distance/area calculation |

## Extended CRS Support (Optional)

By default, this server provides CRS data for Japan and major global systems. For access to the complete EPSG registry (10,000+ CRS), you can optionally enable SQLite support.

### Setup

1. **Download EPSG Database**

```bash
# Using the built-in script
npm run epsg:download-db

# Or specify a custom path
npx tsx scripts/download-epsg-db.ts ./path/to/epsg.db
```

2. **Install sql.js** (if not already installed)

```bash
npm install sql.js
```

3. **Configure Environment**

Set the `EPSG_DB_PATH` environment variable:

```bash
export EPSG_DB_PATH="/path/to/epsg.db"
```

Or configure in Claude Desktop's `claude_desktop_config.json`:

```json
{
	"mcpServers": {
		"epsg": {
			"command": "npx",
			"args": ["@shuji-bonji/epsg-mcp"],
			"env": {
				"EPSG_DB_PATH": "/path/to/epsg.db"
			}
		}
	}
}
```

### Data Source

The EPSG database is provided by [PROJ](https://proj.org/), which redistributes the [IOGP EPSG Geodetic Parameter Dataset](https://epsg.org/). Please refer to the [EPSG Terms of Use](https://epsg.org/terms-of-use.html) for licensing information.

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Test
npm test

# Watch mode
npm run test:watch
```

## Documentation

- [Creating Country Packs](docs/creating-country-packs.md) - Guide for adding new country/region support

## Roadmap

- **Phase 1** ✅: search_crs, get_crs_detail, list_crs_by_region
- **Phase 2** ✅: recommend_crs, validate_crs_usage
- **Phase 3** ✅: suggest_transformation, compare_crs
- **Phase 4** ✅: get_best_practices, troubleshoot

## Related Projects

- [mcp-server-proj](https://github.com/mcp-server-proj) - MCP server for coordinate transformation execution
- [EPSG.io](https://epsg.io/) - EPSG coordinate system database

## License

MIT License - see [LICENSE](LICENSE) for details.
