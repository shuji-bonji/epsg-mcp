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
      "High accuracy",
      "Legal basis",
      "Public survey compliant"
    ],
    "cons": [
      "Zone selection required",
      "Multiple zones for wide areas"
    ]
  },
  "alternatives": [],
  "reasoning": "Compliant with Public Survey Procedures. Coordinate system established by Survey Act. Japan Plane Rectangular CS is the official survey coordinate system of GSI.",
  "warnings": [
    "Spans 3 zones (West=XI, Central=XII, East=XIII)"
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
  "score": 100,
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
- Use JGD2011 (EPSG:6668) as the standard (must)
- Select the appropriate Japan Plane Rectangular CS for the target area (must)
- Manage wide-area data in geographic CRS (should)
- Use appropriate decimal places based on coordinate precision (should)


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
  "directPath": null,
  "viaPaths": [
    {
      "steps": [
        {
          "from": "EPSG:4301",
          "to": "EPSG:4612",
          "method": "Geocentric translations (geog2D domain)",
          "accuracy": "1-2m",
          "epsgCode": "EPSG:15483",
          "notes": "Official parameters from GSI Japan"
        },
        {
          "from": "EPSG:4612",
          "to": "EPSG:6668",
          "method": "Time-dependent Coordinate Frame rotation",
          "accuracy": "few cm",
          "epsgCode": "EPSG:6190",
          "notes": "Crust movement from 2011 Tohoku earthquake"
        }
      ],
      "totalAccuracy": "1-2m or more (watch cumulative error)",
      "complexity": "moderate"
    }
  ],
  "recommended": { /* same as viaPaths[0] */ },
  "warnings": [
    "EPSG:4301 is deprecated. Tokyo Datum is deprecated. Do not use for new data. Use EPSG:6668 for new data."
  ]
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
  "matchedSymptom": "Coordinates shifted by 1 to several meters",
  "possibleCauses": [
    {
      "likelihood": "high",
      "cause": "Tokyo Datum to JGD2011 transformation accuracy",
      "description": "Tokyo Datum → JGD2011 transformation accuracy is limited to 1-2m",
      "indicators": [
        "Transformation from Tokyo Datum was performed",
        "Using old data"
      ]
    },
    {
      "likelihood": "medium",
      "cause": "Different transformation parameters",
      "description": "Same transformation can produce different results depending on parameters used"
    }
  ],
  "diagnosticSteps": [
    {
      "step": 1,
      "action": "Check transformation history",
      "expected": "Transformation method and parameters are recorded"
    },
    {
      "step": 2,
      "action": "Verify transformation accuracy limits",
      "expected": "1-2m shift is normal for Tokyo→JGD transformation"
    }
  ],
  "suggestedSolutions": [
    {
      "forCause": "Tokyo Datum to JGD2011 transformation accuracy",
      "steps": [
        "Accept 1-2m shift as transformation accuracy limit",
        "Consider re-surveying original data if higher accuracy needed"
      ]
    }
  ],
  "relatedBestPractices": ["historical_data", "precision_requirements"],
  "confidence": "medium"
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
    "score": 95,
    "pros": [
      "Major library support",
      "Tile service compatible"
    ],
    "cons": [
      "Noticeable distortion in Hokkaido",
      "Cannot calculate area"
    ]
  },
  "alternatives": [
    {
      "code": "EPSG:6668",
      "name": "JGD2011",
      "score": 75
    }
  ],
  "reasoning": "Web Mercator is the de facto standard for web maps in Japan as well. EPSG:6668 (JGD2011) is recommended for data storage."
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
      "message": "Web Mercator causes significant area distortion",
      "recommendation": "Use an equal-area or local projected CRS"
    }
  ],
  "suggestions": [
    "Use an equal-area or local projected CRS"
  ],
  "betterAlternatives": [
    {
      "code": "EPSG:6677",
      "name": "JGD2011 / Japan Plane Rectangular CS IX",
      "score": 95,
      "pros": ["High accuracy", "Standard within Japan"],
      "cons": ["Cannot span zones"]
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
- Use Web Mercator (EPSG:3857) for web map display (must)
- Output GeoJSON in WGS84 (EPSG:4326) (must)
- Do not perform area/distance calculations in Web Mercator (must)
- Use appropriate projected CRS for high-precision functions (should)


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
  "matchedSymptom": "Coordinates shifted by 1 to several meters",
  "possibleCauses": [
    {
      "likelihood": "high",
      "cause": "Tokyo Datum to JGD2011 transformation accuracy",
      "description": "Tokyo Datum → JGD2011 transformation accuracy is limited to 1-2m",
      "indicators": [
        "Transformation from Tokyo Datum was performed",
        "Using old data"
      ]
    },
    {
      "likelihood": "medium",
      "cause": "Different transformation parameters",
      "description": "Same transformation can produce different results depending on parameters used",
      "indicators": [
        "Results differ between software",
        "Transformation method not documented"
      ]
    }
  ],
  "diagnosticSteps": [
    {
      "step": 1,
      "action": "Check transformation history",
      "expected": "Transformation method and parameters are recorded",
      "ifFailed": "If transformation is unclear, verify original data"
    },
    {
      "step": 2,
      "action": "Verify transformation accuracy limits",
      "expected": "1-2m shift is normal for Tokyo→JGD transformation",
      "ifFailed": "If shift is larger, investigate other causes"
    }
  ],
  "suggestedSolutions": [
    {
      "forCause": "Tokyo Datum to JGD2011 transformation accuracy",
      "steps": [
        "Accept 1-2m shift as transformation accuracy limit",
        "Consider re-surveying original data if higher accuracy needed",
        "Record transformation accuracy in metadata"
      ],
      "prevention": "Verify data precision requirements and transformation accuracy limits beforehand"
    }
  ],
  "relatedBestPractices": ["historical_data", "precision_requirements"],
  "confidence": "medium"
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
  "isValid": true,
  "score": 80,
  "issues": [
    {
      "severity": "info",
      "code": "NON_STANDARD_EXCHANGE",
      "message": "EPSG:4326 is the most widely supported CRS for data exchange",
      "recommendation": "Consider converting to WGS84 for broader compatibility"
    },
    {
      "severity": "warning",
      "code": "GEOJSON_INCOMPATIBLE",
      "message": "GeoJSON specification requires WGS84 (EPSG:4326)",
      "recommendation": "Convert to EPSG:4326 for GeoJSON export"
    }
  ],
  "suggestions": [
    "Consider converting to WGS84 for broader compatibility",
    "Convert to EPSG:4326 for GeoJSON export"
  ]
}
```

**Step 2: Get Data Exchange Best Practices**

```
Tool: get_best_practices
Input: { "topic": "data_exchange" }
```

**Key practices returned:**
- Include CRS information in data (must)
- Use WGS84 for international data exchange (should)
- Specify transformation accuracy (should)


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
      "High accuracy",
      "Legal basis",
      "Public survey compliant"
    ],
    "cons": [
      "Zone selection required",
      "Multiple zones for wide areas"
    ]
  },
  "alternatives": [],
  "reasoning": "Recommended by US CRS Knowledge Pack for survey.",
  "warnings": []
}
```

**Step 2: Compare with WGS84**

```
Tool: compare_crs
Input: {
  "crs1": "EPSG:2229",
  "crs2": "EPSG:4326",
  "aspects": ["datum", "accuracy"]
}
```

**Response:**
```json
{
  "comparison": [
    {
      "aspect": "Datum",
      "crs1Value": "NAD83 / California zone 5",
      "crs2Value": "WGS84",
      "verdict": "Different datums. Transformation required"
    },
    {
      "aspect": "Accuracy",
      "crs1Value": "Survey-grade within zone",
      "crs2Value": "N/A",
      "verdict": "Different accuracy characteristics"
    }
  ],
  "summary": "Comparison of geographic and projected CRS. Choose based on your use case.",
  "recommendation": "Use geographic CRS for wide-area data storage, projected CRS for local calculations."
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
      "High accuracy",
      "Legal basis",
      "Public survey compliant"
    ],
    "cons": [
      "Zone selection required",
      "Multiple zones for wide areas"
    ]
  },
  "alternatives": [],
  "reasoning": "Recommended by UK CRS Knowledge Pack for survey.",
  "warnings": []
}
```

**Step 2: Best Practices for Survey**

```
Tool: get_best_practices
Input: { "topic": "precision_requirements" }
```

**Key practices returned:**
- Define precision requirements at project start (must)
- Use appropriate CRS for required precision (should)
- Document precision in metadata (should)


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
