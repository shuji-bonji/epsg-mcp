# Creating Country Packs

This guide explains how to create a new Country Pack for EPSG MCP.

## Overview

Country Packs are modular, pluggable components that provide country-specific CRS knowledge. Each pack encapsulates:

- CRS definitions (geographic and projected)
- Zone mapping (region to CRS)
- Recommendation rules (purpose-based CRS selection)
- Transformation knowledge (datum shift methods)
- Best practices (country-specific guidelines)
- Troubleshooting guides (common issues and solutions)

## Directory Structure

```
src/packs/{country-code}/
├── index.ts              # Pack factory function
├── constants.ts          # Country-specific constants
├── crs-data.json         # CRS definitions
├── recommendations.json  # Purpose-based recommendation rules
├── transformations.json  # Transformation paths
├── best-practices.json   # Best practice guides
└── troubleshooting.json  # Troubleshooting guides
```

## Step 1: Create Pack Directory

```bash
mkdir -p src/packs/{country-code}
```

Use ISO 3166-1 alpha-2 country codes (e.g., `jp`, `us`, `uk`, `de`, `fr`).

## Step 2: Define Constants

Create `constants.ts` with country-specific constants:

```typescript
/**
 * {Country} Pack Constants
 */

// Geographic bounds
export const {COUNTRY}_BOUNDS = {
  NORTH: 61.0,
  SOUTH: 49.9,
  EAST: 1.8,
  WEST: -8.7,
  // Sub-region bounds if applicable
  REGION_A: { NORTH: ..., SOUTH: ..., EAST: ..., WEST: ... },
} as const;

// Primary EPSG codes
export const {COUNTRY}_EPSG = {
  // Geographic CRS
  PRIMARY_GEOGRAPHIC: 'EPSG:xxxx',
  INTERNATIONAL: 'EPSG:4326',

  // Projected CRS
  PRIMARY_PROJECTED: 'EPSG:yyyy',
} as const;

// Regions list
export const {COUNTRY}_REGIONS = [
  'Region A',
  'Region B',
  // ...
] as const;

// Sub-regions to parent region mapping
export const {COUNTRY}_SUBREGIONS: Record<string, string> = {
  'City A': 'Region A',
  'City B': 'Region B',
};
```

## Step 3: Create CRS Data

Create `crs-data.json` with CRS definitions:

```json
{
  "geographicCRS": {
    "EPSG:xxxx": {
      "code": "EPSG:xxxx",
      "name": "Primary Datum Name",
      "type": "geographic",
      "datum": "Datum Name",
      "description": "Description of the CRS",
      "areaOfUse": "Country/region coverage",
      "deprecated": false,
      "accuracy": "high"
    }
  },
  "projectedCRS": {
    "EPSG:yyyy": {
      "code": "EPSG:yyyy",
      "name": "Projected CRS Name",
      "type": "projected",
      "baseCRS": "EPSG:xxxx",
      "projection": "Transverse Mercator",
      "description": "Description",
      "areaOfUse": "Coverage area",
      "deprecated": false,
      "accuracy": "high"
    }
  },
  "zoneMapping": {
    "Region A": { "zone": "Zone A", "code": "EPSG:yyyy" },
    "Region B": { "zone": "Zone B", "code": "EPSG:zzzz" }
  }
}
```

## Step 4: Create Recommendation Rules

Create `recommendations.json`:

```json
{
  "rules": {
    "web_mapping": {
      "primary": "EPSG:3857",
      "alternatives": ["EPSG:4326"],
      "reasoning": "Web Mercator for tile-based mapping",
      "pros": ["Universal browser support"],
      "cons": ["Area distortion at high latitudes"]
    },
    "survey": {
      "primary": "EPSG:yyyy",
      "alternatives": [],
      "reasoning": "National survey standard",
      "usesZoneMapping": true
    },
    "area_calculation": {
      "primary": "EPSG:yyyy",
      "alternatives": [],
      "reasoning": "Minimizes area distortion",
      "warnings": ["Use local zone for best accuracy"]
    },
    "distance_calculation": { ... },
    "navigation": { ... },
    "data_exchange": { ... },
    "data_storage": { ... },
    "visualization": { ... }
  },
  "multiZoneRegions": {
    "Large Region": {
      "note": "This region spans multiple zones",
      "subRegions": {
        "Sub-Region A": "EPSG:aaaa",
        "Sub-Region B": "EPSG:bbbb"
      },
      "cities": {
        "City A": "EPSG:aaaa",
        "City B": "EPSG:bbbb"
      },
      "default": "EPSG:aaaa"
    }
  }
}
```

## Step 5: Create Transformation Knowledge

Create `transformations.json`:

```json
{
  "transformations": [
    {
      "from": "EPSG:xxxx",
      "to": "EPSG:4326",
      "method": "Transformation method name",
      "accuracy": 0.1,
      "reversible": true,
      "notes": "Additional information"
    }
  ],
  "hubCrs": ["EPSG:xxxx", "EPSG:4326"],
  "deprecatedCrs": ["EPSG:old1", "EPSG:old2"]
}
```

## Step 6: Create Best Practices

Create `best-practices.json`:

```json
{
  "practices": [
    {
      "topic": "{country}_survey",
      "title": "Survey Best Practices for {Country}",
      "description": "Guidelines for survey work",
      "recommendations": [
        { "priority": "must", "text": "Always use national datum" },
        { "priority": "should", "text": "Document transformation method" },
        { "priority": "may", "text": "Consider local requirements" }
      ],
      "commonMistakes": [
        {
          "mistake": "Common error description",
          "problem": "Why this causes issues",
          "solution": "How to fix"
        }
      ],
      "references": [
        {
          "type": "official",
          "title": "National Survey Authority Guide",
          "url": "https://...",
          "description": "Official documentation"
        }
      ]
    }
  ]
}
```

## Step 7: Create Troubleshooting Guides

Create `troubleshooting.json`:

```json
{
  "symptoms": [
    {
      "symptomId": "datum_shift_error",
      "description": "Coordinates shifted by X meters",
      "keywords": ["shifted", "offset", "datum", "meters"],
      "causes": [
        {
          "likelihood": "high",
          "cause": "Datum difference not accounted for",
          "description": "Detailed explanation",
          "indicators": [
            "Shift varies across the region",
            "Systematic offset"
          ]
        }
      ],
      "solutions": [
        {
          "forCause": "Datum difference not accounted for",
          "steps": [
            "Identify the datum of each dataset",
            "Apply proper transformation"
          ],
          "prevention": "Always document datum information"
        }
      ]
    }
  ]
}
```

## Step 8: Create Pack Factory

Create `index.ts`:

```typescript
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
import { {COUNTRY}_BOUNDS, {COUNTRY}_EPSG, {COUNTRY}_REGIONS } from './constants.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Cache for loaded data
let crsDataCache: PackCrsDataSet | null = null;
// ... other caches

async function loadJsonData<T>(filename: string): Promise<T> {
  const filePath = join(__dirname, filename);
  const content = await readFile(filePath, 'utf-8');
  return JSON.parse(content) as T;
}

export function create{Country}Pack(): CountryPack {
  return {
    metadata: {
      countryCode: '{CC}',
      name: '{Country} CRS Knowledge Pack',
      version: '1.0.0',
      primaryDatum: 'Datum Name',
      description: 'CRS knowledge for {Country}',
      language: 'en',
      // Optional: Country code aliases (ISO 3166-1 alpha-3, common names, etc.)
      // These allow users to specify the country in multiple ways
      aliases: ['{CCC}', '{COUNTRY_NAME}'],  // e.g., ['DEU', 'GERMANY'] for DE
    },

    async getCrsData(): Promise<PackCrsDataSet> {
      // Load and cache CRS data
    },

    async getZoneMapping(): Promise<ZoneMapping> {
      // Load zone mapping
    },

    async getRecommendationRules(): Promise<PackRecommendationRules> {
      // Load recommendation rules
    },

    async getValidationRules(): Promise<PackValidationRule[]> {
      // Return country-specific validation rules
      return [];
    },

    async getTransformationKnowledge(): Promise<PackTransformationKnowledge> {
      // Load transformation knowledge
    },

    async getBestPractices(): Promise<PackBestPractice[]> {
      // Load best practices
    },

    async getTroubleshootingGuides(): Promise<PackTroubleshootingGuide[]> {
      // Load troubleshooting guides
    },

    async selectZoneForLocation(location: LocationSpec): Promise<string | null> {
      // Determine zone based on location
    },

    isLocationInCountry(location: LocationSpec): boolean {
      // Check if location is within country bounds
    },

    getCountryBounds(): BoundingBox {
      return {
        north: {COUNTRY}_BOUNDS.NORTH,
        south: {COUNTRY}_BOUNDS.SOUTH,
        east: {COUNTRY}_BOUNDS.EAST,
        west: {COUNTRY}_BOUNDS.WEST,
      };
    },
  };
}

export function reset{Country}PackCache(): void {
  crsDataCache = null;
  // ... reset other caches
}
```

## Step 9: Register Pack in Pack Manager

Edit `src/packs/pack-manager.ts`:

```typescript
async function importPack(code: string): Promise<CountryPack | null> {
  switch (code.toLowerCase()) {
    // ... existing cases
    case '{cc}': {
      const { create{Country}Pack } = await import('./{cc}/index.js');
      return create{Country}Pack();
    }
  }
}
```

## Step 10: Update Build Script

Edit `package.json` to copy JSON files:

```json
{
  "scripts": {
    "build": "tsc && shx cp -r src/data/static build/data/ && shx cp src/packs/{cc}/*.json build/packs/{cc}/ && shx chmod 755 build/index.js"
  }
}
```

## Step 11: Create Tests

Create `tests/packs/{cc}/index.test.ts`:

```typescript
import { beforeEach, describe, expect, it } from 'vitest';
import { create{Country}Pack, reset{Country}PackCache } from '../../../src/packs/{cc}/index.js';
import type { CountryPack, LocationSpec } from '../../../src/types/index.js';

describe('{Country} Pack', () => {
  let pack: CountryPack;

  beforeEach(() => {
    reset{Country}PackCache();
    pack = create{Country}Pack();
  });

  describe('metadata', () => {
    it('should have correct country code', () => {
      expect(pack.metadata.countryCode).toBe('{CC}');
    });
    // ... more tests
  });

  // ... test all methods
});
```

## Step 12: Enable Pack

Users can enable the pack via environment variable:

```bash
# Enable single pack
export EPSG_PACKS="{cc}"

# Enable multiple packs
export EPSG_PACKS="jp,us,uk,{cc}"
```

## Reference Implementations

See existing packs for reference:

- **Japan (jp)**: Complex zone system with 19 plane rectangular coordinate systems
- **US (us)**: State Plane Coordinate System with multi-zone states
- **UK (uk)**: British National Grid with Northern Ireland handling (ITM)

## Best Practices for Pack Development

1. **Use Official Sources**: Reference national geodetic authority documentation
2. **Document Datums**: Clearly specify datum realizations and epochs
3. **Handle Edge Cases**: Consider border regions, overseas territories
4. **Test Thoroughly**: Include tests for all regions and edge cases
5. **Cache Data**: Use lazy loading with caching for performance
6. **Validate JSON**: Ensure all JSON files are valid before committing
