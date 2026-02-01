# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

---

## [0.4.0] - 2026-02-01

### Added

#### CI/CD
- GitHub Actions workflows for automated testing and publishing
  - `ci.yml`: Runs lint, build, and tests on Node.js 18/20/22 for push/PR to main
  - `publish.yml`: Automated npm publish on version tags (v*)

#### Cross-Platform Support
- Added `shx` for cross-platform build scripts (Windows compatible)

### Changed

#### Internationalization
- **Tool definitions**: All 9 tool descriptions translated to English
  - `search_crs`, `get_crs_detail`, `list_crs_by_region`
  - `recommend_crs`, `validate_crs_usage`
  - `suggest_transformation`, `compare_crs`
  - `get_best_practices`, `troubleshoot`
- **Input schemas**: All parameter descriptions translated to English
  - Enables AI agents in any language to properly discover and use tools
  - Examples in descriptions remain language-neutral (EPSG codes, etc.)

#### Build System
- Version now dynamically loaded from `package.json` (eliminates dual maintenance)
- Build script uses `shx` instead of Unix-specific `cp` and `chmod`

### Technical Details
- New dependency: `shx@^0.4.0` (devDependency)
- `src/index.ts`: Uses `createRequire` to import package.json version
- All 379 tests passing

---

## [0.3.0] - 2026-02-01

### Added

#### Tools
- `get_best_practices` - CRS usage best practices
  - 10 topics:
    - `japan_survey`: Surveying in Japan
    - `web_mapping`: Web map creation
    - `data_exchange`: Data exchange
    - `coordinate_storage`: Coordinate storage
    - `mobile_gps`: Mobile GPS
    - `cross_border`: Cross-border data
    - `historical_data`: Historical data
    - `gis_integration`: GIS integration
    - `precision_requirements`: Precision requirements
    - `projection_selection`: Projection selection
  - For each topic:
    - Recommended practices (must/should/may priority)
    - Common mistakes and solutions
    - Related topics
    - References (official/article/tool)
- `troubleshoot` - CRS problem troubleshooting
  - 6 symptom categories:
    - `coordinate_shift_large`: Coordinates shift by hundreds of meters to kilometers
    - `coordinate_shift_medium`: Coordinates shift by 1-several meters
    - `coordinate_shift_small`: Coordinates shift by centimeters to tens of centimeters
    - `area_distance_error`: Area/distance calculation errors
    - `display_blank`: Data doesn't display
    - `transformation_error`: Coordinate transformation errors
  - Keyword matching (longer keywords prioritized)
  - Context-based likelihood adjustment:
    - sourceCrs/targetCrs: Source/target CRS
    - location: Target region
    - magnitude: Shift magnitude
    - tool: Tool being used
  - Diagnostic confidence (high/medium/low) calculation
  - Links to related best practices

#### Data
- `best-practices.json` - Best practices data
  - Complete best practices for 10 topics
  - Each topic: description, practices[], commonMistakes[], relatedTopics[], references[]
- `troubleshooting.json` - Troubleshooting data
  - Diagnostic data for 6 symptom categories
  - Keyword mapping (25 keywords)
  - Each symptom: possibleCauses[], diagnosticSteps[], solutions[]

### Technical Details
- New service: `best-practices-service.ts`
  - `getBestPractices()` - Get best practices by topic
  - `listBestPracticeTopics()` - List available topics
- New service: `troubleshooting-service.ts`
  - `sortKeywordsByLength()` - Sort keywords by length
  - `matchSymptom()` - Symptom matching with scoring
  - `adjustCauseLikelihood()` - Context-based likelihood adjustment
  - `sortCausesByLikelihood()` - Sort by likelihood
  - `getSolutionsForCauses()` - Get solutions for causes
  - `calculateConfidence()` - Calculate diagnostic confidence
  - `troubleshoot()` - Main API
  - `listSymptomCategories()` - List symptom categories
- Type guard: `isBestPracticeTopic()` - `as const` pattern
- Input validation: symptom 2-500 characters
- Test count: 306 → 379 (+73 tests)

---

## [0.2.0] - 2026-02-01

### Added

#### Tools
- `suggest_transformation` - CRS transformation path suggestion
  - BFS graph search for transformation paths up to 4 steps
  - Reverse transformation support (reversible: true edges are bidirectional)
  - Returns both direct path (directPath) and indirect paths (viaPaths)
  - Automatic recommended path selection
  - Accuracy accumulation calculation (1-2m, few cm, etc.)
  - Complexity assessment (simple/moderate/complex)
  - Warning system:
    - Deprecated CRS (Tokyo Datum, JGD2000) warnings
    - Large area data transformation accuracy warnings
    - Complex transformation path cumulative error warnings
- `compare_crs` - CRS comparison
  - 7 comparison aspects:
    - `datum`: Datum comparison (WGS84 vs JGD2011 practically identical, etc.)
    - `projection`: Projection comparison
    - `area_of_use`: Area of use comparison
    - `accuracy`: Accuracy characteristics comparison
    - `distortion`: Distortion characteristics comparison
    - `compatibility`: GIS/Web/CAD/GPS compatibility comparison
    - `use_cases`: Use case suitability scoring comparison
  - Summary and recommendation generation
  - Transformation notes (transformationNote)

#### Data
- `transformations.json` - Transformation path data
  - 12 transformation records
  - Tokyo→JGD2000, JGD2000→JGD2011, WGS84→JGD2011, WGS84→Web Mercator, etc.
  - JGD2011→Plane Rectangular CS (Zones IX, XI, XII, XIII, XV, XVI)
  - Hub CRS definitions (EPSG:4326, EPSG:6668, EPSG:4612)
  - Deprecated transformation info (EPSG:4301, EPSG:4612)
- `comparisons.json` - CRS comparison data
  - Characteristics for 7 CRS (4326, 6668, 4612, 4301, 3857, 6677, 6679)
  - Distortion: area, distance, shape, note
  - Compatibility: gis, web, cad, gps
  - Use case scores: Scores for 8 use cases
  - Comparison templates: 5 patterns

### Technical Details
- New service: `transformation-service.ts`
  - `normalizeCrsCode()` - EPSG code normalization
  - `isWideArea()` - Wide area detection
  - `buildTransformationGraph()` - Graph construction
  - `findPaths()` - BFS path search
  - `suggestTransformation()` - Transformation suggestion
- New service: `comparison-service.ts`
  - `inferDatumName()` - Datum name inference
  - `compareDatum()`, `compareProjection()`, `compareAreaOfUse()`, etc. (7 comparison functions)
  - `generateSummary()`, `generateRecommendation()`
  - `compareCrs()` - Main API
- Test count: 261 → 306 (+45 tests)

---

## [0.1.0] - 2026-02-01

### Added

#### Tools
- `recommend_crs` - Optimal CRS recommendation based on purpose and location
  - 8 purpose types (web_mapping, distance_calculation, area_calculation, survey, navigation, data_exchange, data_storage, visualization)
  - Hokkaido 3 zones (XI, XII, XIII) support (subprefecture/municipality based)
  - Okinawa 3 zones (XV, XVI, XVII) support (Main Island/Sakishima/Daito)
  - Warnings and fallback suggestions for wide area calculations
  - Recommendations with pros/cons
- `validate_crs_usage` - CRS usage validation
  - 18 ValidationIssueCode types
  - Severity classification (error/warning/info)
  - Score calculation (0-100)
  - Automatic alternative suggestions for low scores

#### Validation Rules
- `DEPRECATED_CRS` - Deprecated CRS detection
- `LEGACY_DATUM` - Legacy datum (Tokyo Datum) detection
- `AREA_MISMATCH` - Out-of-area usage detection
- `AREA_DISTORTION` - Web Mercator area distortion warning
- `DISTANCE_DISTORTION` - Web Mercator distance distortion warning
- `ZONE_MISMATCH` - Plane Rectangular CS zone mismatch warning
- `CROSS_ZONE_CALCULATION` - Cross-zone calculation warning
- `GEOJSON_INCOMPATIBLE` - GeoJSON incompatibility warning
- `NOT_OFFICIAL_SURVEY_CRS` - Unofficial survey CRS in Japan warning
- 9 other types

#### Data
- `recommendations.json` extension
  - Added pros/cons for each purpose
  - `multiZonePrefectures` - Hokkaido/Okinawa subprefecture/municipality→zone mapping
  - `validationRules` - Validation rule settings and score weights

### Changed
- Added `city` field to `LocationSpec` (multi-zone support)
- Added `distortionTolerance` field to `Requirements`

### Technical Details
- New service: `recommendation-service.ts`
- New utility: `validation.ts`
- Test count: 171 → 261 (+90 tests)

---

## [0.0.1] - 2026-02-01

### Added

#### Tools
- `search_crs` - Search CRS by keyword
  - EPSG code, name, region, prefecture search support
  - Type (geographic/projected) and region (Japan/Global) filtering
  - Scoring-based relevance sorting
- `get_crs_detail` - Get CRS details by EPSG code
  - Datum, projection, area of use, accuracy characteristics
  - Use cases, related CRS, remarks
- `list_crs_by_region` - Get CRS list by region with purpose-based recommendations
  - Japan/Global toggle
  - Deprecated CRS show/hide option
  - Purpose-based (general, survey, web mapping) CRS recommendations

#### Data
- Japan CRS data (`japan-crs.json`)
  - JGD2011 (EPSG:6668) Geographic CRS
  - Plane Rectangular CS I-XIX (EPSG:6669-6687)
  - JGD2000 (EPSG:4612) Legacy support
  - Tokyo Datum (EPSG:4301) Legacy support
  - 47 prefecture Plane Rectangular CS mapping
- Global CRS data (`global-crs.json`)
  - WGS 84 (EPSG:4326)
  - Web Mercator (EPSG:3857)
  - UTM zones 52N-54N (EPSG:32652-32654)
  - NAD83, ETRS89
- Purpose-based recommendation rules (`recommendations.json`)
  - Web mapping, distance calculation, area calculation, survey, navigation, data storage, data exchange, visualization

#### Infrastructure
- TypeScript + ES Modules configuration
- MCP server implementation with @modelcontextprotocol/sdk
- Schema validation with Zod
- Testing with Vitest (19 tests)
- Local JSON database (no external API required)

### Technical Details
- Node.js 18+ support
- MCP communication via stdio transport
- Fast response with startup data preloading
- Error handling (ValidationError, NotFoundError, DataLoadError)
