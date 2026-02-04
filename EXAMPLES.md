# EPSG MCP Usage Examples

This document provides practical scenarios demonstrating how EPSG MCP helps AI agents make informed decisions about Coordinate Reference Systems.

## Table of Contents

- [Scenario 1: Japanese Survey Project Setup](#scenario-1-japanese-survey-project-setup)
- [Scenario 2: Legacy Data Migration (Tokyo Datum → JGD2011)](#scenario-2-legacy-data-migration-tokyo-datum--jgd2011)
- [Scenario 3: Web Mapping Application Development](#scenario-3-web-mapping-application-development)
- [Scenario 4: Troubleshooting Coordinate Shifts](#scenario-4-troubleshooting-coordinate-shifts)
- [Scenario 5: International GeoJSON Data Exchange](#scenario-5-international-geojson-data-exchange)
- [Scenario 6: US State Plane Coordinate System Selection](#scenario-6-us-state-plane-coordinate-system-selection)
- [Scenario 7: UK Ordnance Survey Project](#scenario-7-uk-ordnance-survey-project)


## Scenario 1: Japanese Survey Project Setup

### The Challenge

A GIS engineer needs to set up a surveying project in Sapporo, Hokkaido. Japan's Plane Rectangular Coordinate System has 19 zones, and Hokkaido alone spans 4 different zones (XI, XII, XIII, XIV). Choosing the wrong zone can introduce significant errors.

### Without EPSG MCP

- Manually research which zone Sapporo belongs to
- Risk confusion between zones XI, XII, XIII, or XIV
- Potentially use deprecated JGD2000 instead of JGD2011

### With EPSG MCP

**Step 1: Get CRS Recommendation**

```
Tool: recommend_crs
Input: {
  "purpose": "survey",
  "location": {
    "prefecture": "Hokkaido",
    "city": "Sapporo"
  }
}
```

**Response:**
```json
{
  "primary": {
    "code": "EPSG:6680",
    "name": "JGD2011 / Japan Plane Rectangular CS XII",
    "score": 95,
    "pros": [
      "Official CRS for surveying in this area",
      "High accuracy for local measurements",
      "Based on current JGD2011 datum"
    ],
    "cons": [
      "Limited to zone XII coverage area"
    ]
  },
  "reasoning": "Zone XII (EPSG:6680) is the designated zone for Sapporo...",
  "warnings": [
    "Hokkaido spans multiple zones (XI-XIV). Specify city for accurate zone selection."
  ]
}
```

**Step 2: Validate the Selection**

```
Tool: validate_crs_usage
Input: {
  "crs": "EPSG:6680",
  "purpose": "survey",
  "location": { "city": "Sapporo" }
}
```

**Response:**
```json
{
  "isValid": true,
  "score": 95,
  "issues": [],
  "suggestions": []
}
```

**Step 3: Get Best Practices**

```
Tool: get_best_practices
Input: { "topic": "japan_survey" }
```

**Key practices returned:**
- Use JGD2011-based CRS (EPSG:6669-6687)
- Select the correct zone for your work area
- Store raw GNSS observations in JGD2011 geographic (EPSG:6668)


## Scenario 2: Legacy Data Migration (Tokyo Datum → JGD2011)

### The Challenge

An organization has 20-year-old survey data in Tokyo Datum (EPSG:4301). They need to migrate to modern JGD2011, but incorrect transformation can cause **400+ meter coordinate shifts**.

### With EPSG MCP

**Step 1: Understand the Transformation**

```
Tool: suggest_transformation
Input: {
  "sourceCrs": "EPSG:4301",
  "targetCrs": "EPSG:6668",
  "location": { "prefecture": "Tokyo" }
}
```

**Response:**
```json
{
  "recommended": {
    "name": "Tokyo to JGD2011 (2)",
    "method": "NTv2 grid transformation",
    "accuracy": "0.2m in most areas",
    "steps": [
      {
        "from": "EPSG:4301",
        "to": "EPSG:6668",
        "operation": "Grid-based transformation using TKY2JGD.par"
      }
    ]
  },
  "alternatives": [...],
  "warnings": [
    "Tokyo Datum to JGD2011 involves ~400m shift. Verify transformation parameters.",
    "Grid file (TKY2JGD.par) required for best accuracy"
  ],
  "notes": "Direct 3-parameter transformation accuracy is limited to ~1m"
}
```

**Step 2: Troubleshoot if Issues Occur**

```
Tool: troubleshoot
Input: {
  "symptom": "coordinates shifted by 400 meters after transformation",
  "context": {
    "sourceCrs": "EPSG:4301",
    "targetCrs": "EPSG:6668",
    "location": "Tokyo"
  }
}
```

**Response:**
```json
{
  "matchedSymptom": "large_shift_hundreds_meters",
  "possibleCauses": [
    {
      "cause": "Tokyo Datum / JGD2011 datum mismatch",
      "likelihood": "high",
      "explanation": "Tokyo Datum and JGD2011 have ~400m offset..."
    }
  ],
  "diagnosticSteps": [
    "Verify source data is actually in Tokyo Datum",
    "Check if transformation parameters are being applied",
    "Confirm grid file is available and being used"
  ],
  "suggestedSolutions": [
    "Apply proper datum transformation (not just CRS reprojection)",
    "Use NTv2 grid file for highest accuracy"
  ],
  "confidence": "high"
}
```


## Scenario 3: Web Mapping Application Development

### The Challenge

A developer is building a web map application showing data across Japan. They need to:
1. Display tiles correctly
2. Store user-submitted coordinates
3. Calculate accurate distances

### With EPSG MCP

**Step 1: CRS for Map Display**

```
Tool: recommend_crs
Input: {
  "purpose": "web_mapping",
  "location": { "country": "Japan" }
}
```

**Response:**
```json
{
  "primary": {
    "code": "EPSG:3857",
    "name": "WGS 84 / Pseudo-Mercator",
    "score": 100,
    "pros": [
      "Standard for web map tiles",
      "Compatible with all major mapping libraries"
    ],
    "cons": [
      "Significant area/distance distortion"
    ],
    "usageNotes": "Use only for display. Convert to appropriate CRS for calculations."
  }
}
```

**Step 2: Validate Area Calculation in Web Mercator**

```
Tool: validate_crs_usage
Input: {
  "crs": "EPSG:3857",
  "purpose": "area_calculation",
  "location": { "country": "Japan" }
}
```

**Response:**
```json
{
  "isValid": false,
  "score": 25,
  "issues": [
    {
      "severity": "error",
      "code": "AREA_DISTORTION",
      "message": "Web Mercator has ~23% area distortion at Japan's latitude",
      "recommendation": "Use JGD2011 Plane Rectangular CS for area calculations"
    }
  ],
  "betterAlternatives": [
    {
      "code": "EPSG:6677",
      "name": "JGD2011 / Japan Plane Rectangular CS IX",
      "score": 90
    }
  ]
}
```

**Step 3: Best Practices for Web Mapping**

```
Tool: get_best_practices
Input: { "topic": "web_mapping" }
```

**Key practices returned:**
- Use EPSG:3857 for tile display
- Output GeoJSON in WGS84 (EPSG:4326)
- Never calculate area/distance in Web Mercator
- Transform to projected CRS for measurements


## Scenario 4: Troubleshooting Coordinate Shifts

### The Challenge

A user reports: "My coordinates are off by about 1-2 meters after processing."

### With EPSG MCP

```
Tool: troubleshoot
Input: {
  "symptom": "coordinates are off by 1-2 meters",
  "context": {
    "location": "Tokyo",
    "tool": "QGIS"
  }
}
```

**Response:**
```json
{
  "matchedSymptom": "small_shift_meters",
  "possibleCauses": [
    {
      "cause": "Transformation accuracy limits",
      "likelihood": "high",
      "explanation": "Tokyo Datum to JGD transformations have inherent accuracy limits of 1-2m"
    },
    {
      "cause": "Missing grid shift file",
      "likelihood": "medium",
      "explanation": "Without NTv2 grid file, fallback to less accurate parameters"
    },
    {
      "cause": "Coordinate truncation",
      "likelihood": "low",
      "explanation": "Insufficient decimal places in coordinate storage"
    }
  ],
  "diagnosticSteps": [
    "Check transformation method used (grid vs parametric)",
    "Verify grid files are installed",
    "Check coordinate precision settings"
  ],
  "suggestedSolutions": [
    "Install NTv2 grid files for your region",
    "Use at least 8 decimal places for geographic coordinates"
  ],
  "relatedBestPractices": ["precision_requirements", "historical_data"],
  "confidence": "high"
}
```


## Scenario 5: International GeoJSON Data Exchange

### The Challenge

A team needs to share GeoJSON data with international partners. The data is currently in JGD2011 Plane Rectangular CS.

### With EPSG MCP

**Step 1: Validate Current CRS for Data Exchange**

```
Tool: validate_crs_usage
Input: {
  "crs": "EPSG:6677",
  "purpose": "data_exchange",
  "location": { "country": "Japan" }
}
```

**Response:**
```json
{
  "isValid": false,
  "score": 40,
  "issues": [
    {
      "severity": "error",
      "code": "GEOJSON_INCOMPATIBLE",
      "message": "GeoJSON specification requires WGS84 (EPSG:4326)",
      "recommendation": "Transform to EPSG:4326 before creating GeoJSON"
    },
    {
      "severity": "warning",
      "code": "NON_STANDARD_EXCHANGE",
      "message": "Projected CRS reduces interoperability",
      "recommendation": "Use geographic CRS for data exchange"
    }
  ],
  "betterAlternatives": [
    {
      "code": "EPSG:4326",
      "name": "WGS 84",
      "score": 100,
      "pros": ["GeoJSON standard", "Universal compatibility"]
    }
  ]
}
```

**Step 2: Get Data Exchange Best Practices**

```
Tool: get_best_practices
Input: { "topic": "data_exchange" }
```

**Key practices returned:**
- Always include CRS information in metadata
- Use WGS84 (EPSG:4326) for GeoJSON
- Document transformation history for traceability
- Consider accuracy loss during transformations


## Scenario 6: US State Plane Coordinate System Selection

### The Challenge

A surveyor in California needs to select the appropriate State Plane Coordinate System zone for a project in Los Angeles.

### With EPSG MCP

**Step 1: Get Recommendation**

```
Tool: recommend_crs
Input: {
  "purpose": "survey",
  "location": {
    "country": "US",
    "subdivision": "California",
    "city": "Los Angeles"
  }
}
```

**Response:**
```json
{
  "primary": {
    "code": "EPSG:2229",
    "name": "NAD83 / California zone 5",
    "score": 95,
    "pros": [
      "Official State Plane zone for Los Angeles area",
      "High accuracy for local surveying",
      "Based on NAD83 datum"
    ],
    "cons": [
      "Limited coverage area"
    ]
  },
  "alternatives": [
    {
      "code": "EPSG:6425",
      "name": "NAD83(2011) / California zone 5",
      "score": 90,
      "pros": ["Latest datum realization"]
    }
  ],
  "reasoning": "California zone 5 covers the Los Angeles metropolitan area..."
}
```

**Step 2: Compare NAD83 versions**

```
Tool: compare_crs
Input: {
  "crs1": "EPSG:2229",
  "crs2": "EPSG:6425",
  "aspects": ["datum", "accuracy"]
}
```

**Response:**
```json
{
  "comparison": {
    "datum": {
      "crs1": "NAD83 (original)",
      "crs2": "NAD83(2011)",
      "verdict": "CRS2 uses more recent datum realization",
      "recommendation": "NAD83(2011) recommended for new projects"
    },
    "accuracy": {
      "crs1": "~1m relative to current positions",
      "crs2": "~2cm relative to current positions",
      "verdict": "CRS2 has higher accuracy"
    }
  }
}
```


## Scenario 7: UK Ordnance Survey Project

### The Challenge

A mapping project in London needs to work with both legacy OSGB36 data and modern GNSS observations.

### With EPSG MCP

**Step 1: Recommend CRS for Survey**

```
Tool: recommend_crs
Input: {
  "purpose": "survey",
  "location": {
    "country": "UK",
    "city": "London"
  }
}
```

**Response:**
```json
{
  "primary": {
    "code": "EPSG:27700",
    "name": "OSGB36 / British National Grid",
    "score": 95,
    "pros": [
      "Official UK mapping coordinate system",
      "Compatible with Ordnance Survey products",
      "Well-established transformation to GNSS"
    ],
    "usageNotes": "Use OSTN15 transformation for GNSS data"
  }
}
```

**Step 2: Transformation from GNSS (ETRS89) to BNG**

```
Tool: suggest_transformation
Input: {
  "sourceCrs": "EPSG:4258",
  "targetCrs": "EPSG:27700",
  "location": { "country": "UK" }
}
```

**Response:**
```json
{
  "recommended": {
    "name": "ETRS89 to OSGB36 / British National Grid",
    "method": "OSTN15 + OSGM15 transformation",
    "accuracy": "~0.1m horizontal, ~0.02m vertical",
    "steps": [
      {
        "from": "EPSG:4258",
        "to": "EPSG:27700",
        "operation": "OSTN15 grid-based transformation"
      }
    ]
  },
  "warnings": [
    "Do not use simple Helmert transformation (only ~5m accuracy)",
    "OSTN15 is mandatory for sub-metre accuracy"
  ]
}
```

**Step 3: UK-specific Best Practices**

```
Tool: get_best_practices
Input: { "topic": "uk_survey" }
```

**Key practices returned:**
- Use British National Grid (EPSG:27700) for England, Scotland, Wales
- Use Irish Transverse Mercator (EPSG:2157) for Northern Ireland
- Always use OSTN15 for GNSS-to-BNG transformation
- Store raw GNSS in ETRS89 before transformation


## Summary: When to Use Each Tool

| Scenario | Primary Tool | Supporting Tools |
|----------|--------------|------------------|
| Starting a new project | `recommend_crs` | `get_best_practices` |
| Validating existing choice | `validate_crs_usage` | `compare_crs` |
| Data format conversion | `validate_crs_usage` | `suggest_transformation` |
| Debugging coordinate issues | `troubleshoot` | `compare_crs` |
| Legacy data migration | `suggest_transformation` | `troubleshoot` |
| Learning about a CRS | `get_crs_detail` | `search_crs` |


## Integration with Other MCP Servers

EPSG MCP is designed to work alongside transformation tools:

```
┌─────────────────┐     ┌─────────────────┐
│   EPSG MCP      │     │ mcp-server-proj │
│  (Knowledge)    │────▶│ (Execution)     │
│                 │     │                 │
│ • What CRS?     │     │ • Transform     │
│ • Why this one? │     │   coordinates   │
│ • Any issues?   │     │                 │
└─────────────────┘     └─────────────────┘
```

**Typical workflow:**
1. **EPSG MCP**: `recommend_crs` → Get optimal CRS
2. **EPSG MCP**: `suggest_transformation` → Get transformation path
3. **mcp-server-proj**: Execute the actual coordinate transformation
4. **EPSG MCP**: `validate_crs_usage` → Verify result is appropriate


## Further Reading

- [README.md](README.md) - Full tool reference
- [Creating Country Packs](docs/creating-country-packs.md) - Extend EPSG MCP for your region
- [EPSG Registry](https://epsg.org/) - Official CRS definitions
