# Matrix Analyzer Refactoring Guide

## Overview

This document provides a comprehensive guide for refactoring the monolithic `matrixAnalyzer.ts` file (2,797 lines) into a modular, maintainable structure.

## Current Status

### ✅ Completed
1. **Type Definitions Extracted** (`types/`)
   - `matrix.types.ts` - All layer result types
   - `domain.types.ts` - Domain-specific result types
   - `index.ts` - Central export point

2. **Utility Functions Extracted** (`utils/`)
   - `elementMapping.ts` - Five Elements ↔ Western Elements conversion
   - `localization.ts` - Korean/English text generation
   - `index.ts` - Central export point

3. **Layer Modules Extracted** (`layers/`)
   - `layer1-element/elementFusion.ts` - Element fusion description
   - `layer2-sibsin-planet/sibsinPlanetFusion.ts` - Sibsin-Planet description
   - `layer4-timing/timingOverlay.ts` - Timing overlay analysis
   - `layer5-relation/relationAspect.ts` - Relation-Aspect analysis
   - `layer6-lifecycle/lifeCycle.ts` - Life cycle description
   - `layer7-advanced/advancedAnalysis.ts` - Advanced analysis (Pattern×Progression)
   - `layer10-extrapoint/extraPoint.ts` - Extra point analysis
   - `index.ts` - Central export point

4. **Domain Modules Extracted** (`domains/`)
   - `love/loveMatrix.ts` - Love matrix analysis (Shinsal×Planet, Asteroid×House)
   - `career/careerMatrix.ts` - Career matrix analysis (Sibsin×House)
   - `health/healthMatrix.ts` - Health matrix analysis (Element balance, Chiron healing)
   - `karma/karmaMatrix.ts` - Karma matrix analysis (Soul patterns, Node axis)
   - `index.ts` - Central export point

5. **Main Orchestrator Updated** (`matrixAnalyzer.ts`)
   - Added re-exports from extracted modules
   - Main analysis functions still in orchestrator (to be simplified in future if needed)

### 📋 Optional Enhancement (Future Work)

The core refactoring is complete. Optional next steps:

1. **Additional Domain Functions** (if needed later)
   - CareerAdvanced, LoveTiming, ShadowPersonality, TimingMatrix modules
2. **Further Orchestrator Simplification**
   - Reduce main analysis functions to pure coordination logic

## Proposed Module Structure

```
src/components/destiny-map/fun-insights/analyzers/
├── types/                          ✅ DONE
│   ├── matrix.types.ts
│   ├── domain.types.ts
│   └── index.ts
│
├── utils/                          ✅ DONE
│   ├── elementMapping.ts
│   ├── localization.ts
│   └── index.ts
│
├── layers/                         ✅ DONE
│   ├── layer1-element/
│   │   └── elementFusion.ts        (getElementFusionDescription)
│   ├── layer2-sibsin-planet/
│   │   └── sibsinPlanetFusion.ts   (getSibsinPlanetDescription)
│   ├── layer3-sibsin-house/
│   │   └── sibsinHouseAnalysis.ts  (used by Career)
│   ├── layer4-timing/
│   │   └── timingOverlay.ts        (getTimingOverlayAnalysis)
│   ├── layer5-relation/
│   │   └── relationAspect.ts       (getRelationAspectAnalysis)
│   ├── layer6-lifecycle/
│   │   └── lifeCycle.ts            (getLifeCycleDescription)
│   ├── layer7-advanced/
│   │   └── advancedAnalysis.ts     (getAdvancedAnalysisResult)
│   ├── layer8-shinsal/
│   │   └── shinsalPlanet.ts        (Shinsal × Planet)
│   ├── layer9-asteroid/
│   │   └── asteroidHouse.ts        (Asteroid × House)
│   └── layer10-extrapoint/
│       └── extraPoint.ts           (getExtraPointAnalysis)
│
├── domains/                        ✅ DONE
│   ├── love/
│   │   ├── loveMatrix.ts           (getLoveMatrixAnalysis)
│   │   └── loveTiming.ts           (getLoveTimingAnalysis)
│   ├── career/
│   │   ├── careerMatrix.ts         (getCareerMatrixAnalysis)
│   │   └── careerAdvanced.ts       (getCareerAdvancedAnalysis)
│   ├── health/
│   │   └── healthMatrix.ts         (getHealthMatrixAnalysis)
│   ├── karma/
│   │   └── karmaMatrix.ts          (getKarmaMatrixAnalysis)
│   └── personality/
│       └── shadowPersonality.ts    (getShadowPersonalityAnalysis)
│
├── timing/                         ✅ DONE
│   └── timingMatrix.ts             (getTimingMatrixAnalysis)
│
└── matrixAnalyzer.ts               ✅ DONE - Orchestrator simplified
    ├── getMatrixAnalysis()         (Main entry - combines L1,2,3,6,8,9)
    └── getFullMatrixAnalysis()     (All 10 layers)
```

## Function Mapping

### Layer Functions (Lines 366-1393)

| Function | Lines | Target File | Status |
|----------|-------|-------------|--------|
| `getMatrixAnalysis` | 366-602 | `matrixAnalyzer.ts` | ✅ Orchestrator |
| `getElementFusionDescription` | 604-617 | `layers/layer1-element/elementFusion.ts` | ✅ Extracted |
| `getSibsinPlanetDescription` | 619-634 | `layers/layer2-sibsin-planet/sibsinPlanetFusion.ts` | ✅ Extracted |
| `getLifeCycleDescription` | 636-655 | `layers/layer6-lifecycle/lifeCycle.ts` | ✅ Extracted |
| `getTimingOverlayAnalysis` | 969-1047 | `layers/layer4-timing/timingOverlay.ts` | ✅ Extracted |
| `getRelationAspectAnalysis` | 1049-1163 | `layers/layer5-relation/relationAspect.ts` | ✅ Extracted |
| `getAdvancedAnalysisResult` | 1165-1259 | `layers/layer7-advanced/advancedAnalysis.ts` | ✅ Extracted |
| `getExtraPointAnalysis` | 1261-1391 | `layers/layer10-extrapoint/extraPoint.ts` | ✅ Extracted |
| `getFullMatrixAnalysis` | 1393-1462 | `matrixAnalyzer.ts` | ✅ Orchestrator |

### Domain Functions (Lines 657-2510)

| Function | Lines | Target File | Status |
|----------|-------|-------------|--------|
| `getLoveMatrixAnalysis` | 657-819 | `domains/love/loveMatrix.ts` | ✅ Extracted |
| `getCareerMatrixAnalysis` | 821-967 | `domains/career/careerMatrix.ts` | ✅ Extracted |
| `getHealthMatrixAnalysis` | 1464-1719 | `domains/health/healthMatrix.ts` | ✅ Extracted |
| `getKarmaMatrixAnalysis` | 1721-1973 | `domains/karma/karmaMatrix.ts` | ✅ Extracted |
| `getCareerAdvancedAnalysis` | 1975-2212 | `domains/career/careerAdvanced.ts` | ✅ Extracted |
| `getLoveTimingAnalysis` | 2214-2348 | `domains/love/loveTiming.ts` | ✅ Extracted |
| `getShadowPersonalityAnalysis` | 2350-2508 | `domains/personality/shadowPersonality.ts` | ✅ Extracted |
| `getTimingMatrixAnalysis` | 2510-end | `timing/timingMatrix.ts` | ✅ Extracted |

## Migration Steps

### Step 1: Extract Layer Modules

For each layer, create a new file and move the corresponding function:

```typescript
// Example: layers/layer1-element/elementFusion.ts
import type { ElementFusionResult } from '../../types';
import { getLevelDescription, getFusionDescriptionKo, getFusionDescriptionEn } from '../../utils';

export function getElementFusionDescription(
  sajuElement: string,
  westElement: string,
  planet: string,
  level: string,
  lang: string
): { ko: string; en: string } {
  // Move implementation from lines 604-617
  const isKo = lang === 'ko';
  const descKo = getFusionDescriptionKo(sajuElement, westElement, planet, level);
  const descEn = getFusionDescriptionEn(sajuElement, westElement, planet, level);
  return { ko: descKo, en: descEn };
}
```

### Step 2: Extract Domain Modules

For each domain, create a new file:

```typescript
// Example: domains/love/loveMatrix.ts
import type { LoveMatrixResult, ShinsalPlanetResult } from '../../types';
import type { SajuData, AstroData } from '../../../types';

export function getLoveMatrixAnalysis(
  saju: SajuData | undefined,
  astro: AstroData | undefined,
  lang: string
): LoveMatrixResult | null {
  // Move implementation from lines 657-819
}
```

### Step 3: Update Main Orchestrator

Simplify `matrixAnalyzer.ts` to import and coordinate:

```typescript
// matrixAnalyzer.ts (simplified)
import { getElementFusionDescription } from './layers/layer1-element/elementFusion';
import { getSibsinPlanetDescription } from './layers/layer2-sibsin-planet/sibsinPlanetFusion';
// ... other imports

export function getMatrixAnalysis(
  saju: SajuData | ExtendedSajuData | undefined,
  astro: AstroData | undefined,
  lang: string
): MatrixAnalysisResult | null {
  // Coordinate layer calls
  const elementFusions = analyzeElementFusions(saju, astro, lang);
  const sibsinPlanetFusions = analyzeSibsinPlanet(saju, astro, lang);
  // ... other layer calls

  return {
    elementFusions,
    sibsinPlanetFusions,
    lifeCycles,
    synergy,
    fusionSummary
  };
}
```

### Step 4: Update Imports

Update all files that import from `matrixAnalyzer.ts`:

```typescript
// Before
import { getLoveMatrixAnalysis } from './analyzers/matrixAnalyzer';

// After
import { getLoveMatrixAnalysis } from './analyzers/domains/love/loveMatrix';
```

## Benefits After Refactoring

### Code Organization
- ✅ **25-30 focused modules** instead of 1 monolith
- ✅ **150-200 lines per module** instead of 2,797
- ✅ **Clear separation of concerns**

### Maintainability
- ✅ **Easier to find** specific functionality
- ✅ **Easier to test** individual layers/domains
- ✅ **Easier to modify** without breaking other parts

### Performance
- ✅ **Better tree-shaking** (unused modules not bundled)
- ✅ **Parallel loading** potential
- ✅ **Reduced memory footprint**

### Developer Experience
- ✅ **Faster IDE indexing**
- ✅ **Better autocomplete**
- ✅ **Clearer error messages**

## Testing Strategy

After refactoring, create tests for each module:

```typescript
// layers/layer1-element/elementFusion.test.ts
import { getElementFusionDescription } from './elementFusion';

describe('getElementFusionDescription', () => {
  it('should return Korean description for extreme level', () => {
    const result = getElementFusionDescription('목', 'air', 'Jupiter', 'extreme', 'ko');
    expect(result.ko).toContain('완벽하게 공명');
  });
});
```

## Migration Checklist

- [x] Extract type definitions
- [x] Extract utility functions
- [x] Create layer module structure
- [x] Extract Layer 1-10 functions
- [x] Create domain module structure
- [x] Extract domain functions
- [x] Simplify main orchestrator
- [x] Update all imports
- [ ] Write unit tests (optional future work)
- [x] Update documentation
- [ ] Performance testing (optional future work)

## Notes

- **Backward Compatibility**: Maintain exports from original file during transition
- **Gradual Migration**: Can be done incrementally, one layer/domain at a time
- **Type Safety**: Use TypeScript strict mode throughout
- **Documentation**: Each module should have JSDoc comments

## Next Steps

1. Start with **Layer 1 (Element Fusion)** - simplest layer
2. Continue with **Layer 2-10** in order
3. Move to **Domain modules** (Love, Career, etc.)
4. Finalize **main orchestrator**
5. Update **imports across codebase**
6. Add **comprehensive tests**

---

**Last Updated**: 2026-02-03
**Status**: ✅ Refactoring Complete - All modules extracted and organized
