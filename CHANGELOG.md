# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

---

## [0.9.5] - 2026-02-04

### Fixed

#### City Name Normalization for Multi-Zone Prefectures
- Added `normalizeCity()` function for English → Japanese city name translation
- `normalizeLocation()` now normalizes `city` field in addition to `country` and `prefecture`
- Fixed: English city names (e.g., "Sapporo") now correctly resolve to Japanese (e.g., "札幌市")
  - This enables correct zone selection for Hokkaido and Okinawa when city is specified in English
  - Example: `{prefecture: "Hokkaido", city: "Sapporo"}` → XII系 (EPSG:6680)

### Added

#### City Name Mappings
- `CITY_EN_TO_JP` constant with English → Japanese mappings for:
  - Hokkaido: Sapporo, Asahikawa, Hakodate, Kushiro, Obihiro, Otaru, Kitami, Ebetsu, Tomakomai, Abashiri, Wakkanai, Nemuro
  - Okinawa: Naha, Ginowan, Urasoe, Uruma, Nago, Itoman, Tomigusuku, Miyakojima, Ishigaki, Nanjo, Okinawa City

### Technical Details
- Added 13 tests for city normalization (657 tests total)
- City normalization is case-insensitive

---

## [0.9.4] - 2026-02-04

### Added

#### Country Pack Aliases Support
- `PackMetadata` now supports `aliases` field for country code variants
- Packs can define their own aliases (ISO 3166-1 alpha-3, common names, etc.)
  - JP Pack: `['JPN', 'JAPAN']`
  - US Pack: `['USA', 'AMERICA']`
  - UK Pack: `['GB', 'GBR', 'BRITAIN']`
- New packs can define aliases without modifying core code

### Changed

#### Pack Manager Country Code Resolution
- Removed hardcoded country code aliases from pack-manager
- Pack registration now automatically registers all aliases defined in metadata
- `getRegisteredPacks()` returns unique packs (no duplicates from aliases)

#### UK Pack
- UK Pack now returns BNG (EPSG:27700) for all UK country code variants (UK, GB, GBR, BRITAIN)
- Added `UK_COUNTRY_CODES` constant for consistent country code matching

### Technical Details
- Added 6 tests for aliases feature (644 tests total)
- Updated documentation with aliases example

---

## [0.9.3] - 2026-02-04

### Fixed

#### Country Pack Integration in Recommendation Service
- `recommend_crs` now properly uses US/UK Country Packs for non-Japan locations
  - US locations (California, New York, etc.) now return State Plane CRS (e.g., EPSG:2229, EPSG:2263)
  - UK locations (London, Northern Ireland, etc.) now return BNG/ITM (EPSG:27700, EPSG:2157)
  - Previously all non-Japan locations fell back to UTM

#### UK Pack Default Zone
- UK Pack now returns BNG (EPSG:27700) for country-only queries without specific region

### Technical Details
- Added `arePacksLoaded()` and `loadPacksFromEnv()` to recommendation-service
- Pack loading now happens lazily on first recommendation request if not already loaded

---

## [0.9.2] - 2026-02-04

### Added

#### Documentation
- [EXAMPLES.md](EXAMPLES.md) - Usage examples in English (7 practical scenarios)
- [EXAMPLES.ja.md](EXAMPLES.ja.md) - Usage examples in Japanese
- Documentation links added to README.md, README.ja.md, and CLAUDE.md

### Fixed

#### Japan Pack - Hokkaido Zone Corrections (per GSI official definition)
- **Sapporo**: XI → XII (EPSG:6680)
- **Kitami**: XII → XIII (EPSG:6681)
- **Abashiri**: XII → XIII (EPSG:6681)
- **Tomakomai**: XI → XII (EPSG:6680)
- **Ebetsu**: XI → XII (EPSG:6680)
- **Ishikari/Sorachi subregions**: XI → XII (EPSG:6680)

#### Validation Strictness
- `validate_crs_usage`: Web Mercator + area_calculation now returns `isValid: false`
  - Severity changed from 'warning' to 'error' for AREA_DISTORTION
  - Score penalty increased from -20 to -75

#### Troubleshooting
- English keyword matching improved for `troubleshoot` tool
  - Added: "off by", "meters", "1-2 meters", "couple meters", etc.

### Technical Details
- All 638 tests passing
- Both Japanese and English `recommendations.json` updated
- Both Japanese and English `troubleshooting.json` updated

---

## [0.9.1] - 2026-02-03

### Changed

#### Documentation Improvements
- README.md/README.ja.md: Revised description to emphasize global coverage
  - Removed "Japan-focused" impression from opening paragraph
  - Added 3-layer fallback architecture explanation (Country Pack → UTM → Global)
  - New features: "Country Pack System", "Graceful Degradation"
  - Removed "Japan-focused" / "日本重視" from Features section
- package.json: Updated description to reflect worldwide CRS support

### Technical Details
- Documentation-only release, no code changes
- All 638 tests passing

---

## [0.9.0] - 2026-02-02

### Changed

#### Internationalization Enhancements
- Default output language is now English (previously Japanese)
- `EPSG_LANG` environment variable support for language selection
  - `EPSG_LANG=ja`: Japanese output
  - `EPSG_LANG=en` or unset: English output (default)
- Message constants centralized in `src/constants/messages.ts`
  - Purpose names, datum names, aspect names
  - Comparison verdicts for all 7 aspects
  - Recommendation warnings, usage notes, error messages
  - Enables future i18n expansion

### Performance

#### Async Optimization
- `comparison-service.ts`: Parallel CRS fetching with `Promise.all`
- `recommendation-service.ts`: Parallel alternatives building with `Promise.all`

### Refactored

#### Code Deduplication
- Consolidated `isJapanLocation()` function (was duplicated in 3 files)
  - Single source of truth in `src/utils/location-normalizer.ts`
  - Removed duplicates from `recommendation-service.ts` and `validation-rules.ts`
- Added `indexCrsData()` helper in `src/data/loader.ts`
  - Eliminated 4 identical indexing loops

### Technical Details
- All 638 tests passing
- No breaking changes

### Added

#### UK Pack Implementation (Phase 5-5)
- Complete UK Country Knowledge Pack
- New directory: `src/packs/uk/`
  - `index.ts` - `createUkPack()` factory function
  - `constants.ts` - UK geographic bounds (England, Scotland, Wales, Northern Ireland)
  - `crs-data.json` - OSGB36, ETRS89, British National Grid, ITM
  - `recommendations.json` - UK-specific CRS recommendations
  - `transformations.json` - OSGB36→ETRS89 (OSTN15)
  - `best-practices.json` - UK surveying and INSPIRE best practices
  - `troubleshooting.json` - UK-specific troubleshooting guides

#### UK CRS Data
- Geographic CRS: OSGB36 (EPSG:4277), ETRS89 (EPSG:4258), WGS84 (EPSG:4326)
- Projected CRS: British National Grid (EPSG:27700), Irish Transverse Mercator (EPSG:2157)
- Zone mapping for England, Scotland, Wales, Northern Ireland
- Northern Ireland handled separately with ITM (not BNG)

#### Documentation
- New guide: `docs/creating-country-packs.md` - Complete guide for creating Country Packs (English)
- New guide: `docs/creating-country-packs.ja.md` - Country Pack作成ガイド (Japanese)
- Updated CLAUDE.md with Phase 5 completion status and pack architecture

#### Pack Manager Updates
- UK/GB pack loading via `EPSG_PACKS=uk` or `EPSG_PACKS=gb`
- Support for all three packs: `EPSG_PACKS=jp,us,uk`

### Fixed

#### English Prefecture Name Support
- `recommend_crs` now correctly recognizes English prefecture names (e.g., "Tokyo", "Hokkaido", "Okinawa")
- Added `PREFECTURE_EN_TO_JP` mapping for all 47 Japanese prefectures
- `normalizePrefecture()` function converts English names to Japanese for internal processing
- `inferCountryFromSubdivision()` now recognizes English prefecture names as Japanese locations
- `isJapanesePrefecture()` supports case-insensitive English name matching

### Technical Details
- Build script updated to copy UK pack JSON files
- Test count: 566 → 638 (+50 UK Pack tests, +22 English prefecture tests)
- All three packs (JP/US/UK) can coexist without interference

---

## [0.8.0] - 2026-02-02

### Added

#### US Pack Implementation (Phase 5-4)
- Complete US Country Knowledge Pack
- New directory: `src/packs/us/`
  - `index.ts` - `createUsPack()` factory function
  - `constants.ts` - US geographic bounds and SPCS constants
  - `crs-data.json` - NAD83, NAD83(2011), SPCS zones, Conus Albers
  - `recommendations.json` - US-specific CRS recommendations
  - `transformations.json` - NAD27→NAD83, NAD83→NAD83(2011)
  - `best-practices.json` - US surveying best practices
  - `troubleshooting.json` - US-specific troubleshooting guides

#### US CRS Data
- Geographic CRS: NAD83 (EPSG:4269), NAD83(2011) (EPSG:6318), NAD27 (EPSG:4267)
- Projected CRS: Conus Albers (EPSG:5070, 6350), State Plane zones
- Zone mapping for all 50 states + DC
- Multi-zone support for California, Texas, New York, Florida, Washington

#### Pack Manager Updates
- US pack loading via `EPSG_PACKS=us` environment variable
- Support for loading multiple packs: `EPSG_PACKS=jp,us`

### Technical Details
- Build script updated to copy US pack JSON files
- Test count: 519 → 566 (+47 tests)
- JP/US packs can coexist without interference

---

## [0.7.0] - 2026-02-02

### Added

#### Extended CRS Support (SQLite)
- Optional SQLite support for accessing complete EPSG registry (10,000+ CRS)
- `sql.js` added as optionalDependency
- New module: `src/data/sqlite-loader.ts`
  - `initSqliteDb()` - Initialize SQLite DB with WASM
  - `isSqliteAvailable()` - Check SQLite availability
  - `findCrsBySqlite()` - Find CRS by EPSG code
  - `searchCrsBySqlite()` - Keyword search in SQLite
  - `listCrsByRegionSqlite()` - Region-based CRS listing
- SQLite fallback in `findCrsById()` and `searchCrs()`
- Download script: `scripts/download-epsg-db.ts`
- npm script: `npm run epsg:download-db`

#### Documentation
- Added SQLite setup instructions to README.md and README.ja.md
- EPSG DB licensing information (IOGP Terms of Use)

### Technical Details
- Environment variable: `EPSG_DB_PATH` for SQLite DB location
- Dynamic import pattern for optional sql.js dependency
- WASM path resolution for sql.js
- Test count: 519 (unchanged)

---

## [0.6.0] - 2026-02-02

### Added

#### CountryPack Architecture (Phase 5-2)
- Modular country-specific CRS knowledge system
- New types in `src/types/country-pack.ts`:
  - `CountryPack` interface with async data methods
  - `PackMetadata`, `ZoneMapping`, `PackRecommendationRules`
  - `PackTransformationKnowledge`, `PackBestPractice`, `PackTroubleshootingGuide`
- Pack manager: `src/packs/pack-manager.ts`
  - `registerPack()`, `clearPacks()`, `getRegisteredPacks()`
  - `getPackForCountry()`, `findPackForLocation()`
  - `findCrsInPacks()`, `loadPacksFromEnv()`
- Japan Pack: `src/packs/jp/`
  - `createJpPack()` factory function
  - Japan-specific constants (JP_BOUNDS, JP_PLANE_RECT)
  - Full implementation using existing data loaders

#### Environment Configuration
- `EPSG_PACKS` environment variable for enabling country packs
- Default: `jp` (Japan pack)

### Technical Details
- Strangler Fig Pattern: New pack structure built in parallel
- 3-Layer Fallback Model: CountryPack → UTM → Global
- Test count: 463 → 519 (+56 tests for packs)

---

## [0.5.0] - 2026-02-02

### Added

#### UTM Fallback System (Phase 5-1)
- Automatic UTM zone detection from coordinates
- New module: `src/utils/utm.ts`
  - `getUtmZone()` - Calculate UTM zone from lat/lng
  - `getUtmEpsgCode()` - Get EPSG code for UTM zone
  - `getUtmZoneInfo()` - Full UTM zone information
  - `isValidLatitude()`, `isValidLongitude()` - Coordinate validation
- New service: `src/services/utm-service.ts`
  - `getUtmCrsForLocation()` - Get UTM CRS for any location
  - `createUtmCrsDetail()` - Generate CRS detail for UTM zones

#### Location Normalization
- New utility: `src/utils/location-normalizer.ts`
  - `normalizeLocation()` - Standardize location input
  - `getLocationCenter()` - Calculate center from bounds
  - Support for country, region, subdivision, prefecture, city
  - BoundingBox center calculation

### Technical Details
- UTM zones 1-60 for both hemispheres
- EPSG codes: 326xx (North), 327xx (South)
- Test count: 379 → 463 (+84 tests)

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
