#!/usr/bin/env python3
"""
Create new refactored FunInsights.tsx with imports
"""

# Read original file
with open('src/components/destiny-map/FunInsights.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# New file header with imports
new_header = '''"use client";

import { useMemo } from "react";
import {
  extractSajuProfile,
  extractAstroProfile,
  calculateMonthlyImportantDates,
  type ImportantDate,
} from "@/lib/destiny-map/destinyCalendar";

// Import data
import {
  elementTraits,
  dayMasterData,
  zodiacData,
  elementKeyMap,
  tianGanMap,
  elementRelations,
  astroToSaju,
  monthElements
} from "./fun-insights/data";

// Import helper utilities
import { findPlanetSign } from "./fun-insights/utils";

// Import analyzers
import {
  getSibsinDistribution,
  getSibsinAnalysis,
  getCrossAnalysis,
  getHealthAnalysis,
  getTimeBasedFortune,
  getStrengthsAndWeaknesses,
  getCurrentFlowAnalysis,
  getYongsinAnalysis
} from "./fun-insights/analyzers";

// Import astrology insights
import {
  getChironInsight,
  getPartOfFortuneInsight,
  getVertexInsight,
  getDraconicInsight,
  getHarmonicsInsight,
  getLilithInsight,
  getAsteroidsInsight,
  getFixedStarsInsight,
  getEclipsesInsight
} from "./fun-insights/astrology";

// Import generators
import {
  getRecommendedDates,
  getSimpleRecommendedDates,
  getLuckyItems
} from "./fun-insights/generators";

interface Props {
  saju?: any;
  astro?: any;
  lang?: string;
  theme?: string;
  className?: string;
}

'''

# Get everything from line 1574 (generateReport function) to end
# (generateReport contains huge narrative data that we keep in main component)
component_body = ''.join(lines[1573:])  # 0-indexed, so 1573 is line 1574

# Write new file
with open('src/components/destiny-map/FunInsights.tsx', 'w', encoding='utf-8') as f:
    f.write(new_header)
    f.write(component_body)

print("[OK] Created new refactored FunInsights.tsx")
print(f"  - Added {new_header.count('import')} import statements")
print("  - Kept generateReport and main component")
print("  - All other functions now imported from fun-insights/")
