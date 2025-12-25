#!/usr/bin/env python3
"""
Add necessary imports to extracted FunInsights files
"""

import os
import re

base_path = 'src/components/destiny-map/fun-insights'

# Define imports needed for each file based on what they reference
file_imports = {
    'analyzers/sibsinAnalyzer.ts': [],  # No imports needed

    'analyzers/crossAnalyzer.ts': [
        "import { elementTraits, dayMasterData, zodiacData, elementKeyMap, tianGanMap, elementRelations, astroToSaju } from '../data';",
        "import { findPlanetSign } from '../utils';"
    ],

    'analyzers/healthAnalyzer.ts': [
        "import { elementTraits } from '../data';"
    ],

    'analyzers/timeAnalyzer.ts': [
        "import { elementTraits, elementKeyMap, monthElements } from '../data';"
    ],

    'analyzers/strengthsAnalyzer.ts': [
        "import { elementTraits, elementKeyMap } from '../data';"
    ],

    'analyzers/flowAnalyzer.ts': [],  # No imports needed

    'analyzers/yongsinAnalyzer.ts': [
        "import { elementTraits } from '../data';"
    ],

    'astrology/chironInsight.ts': [
        "import { findPlanetSign } from '../utils';"
    ],

    'astrology/partOfFortuneInsight.ts': [
        "import { findPlanetSign } from '../utils';"
    ],

    'astrology/vertexInsight.ts': [
        "import { findPlanetSign } from '../utils';"
    ],

    'astrology/draconicInsight.ts': [],  # No imports needed

    'astrology/harmonicsInsight.ts': [],  # No imports needed

    'astrology/lilithInsight.ts': [
        "import { findPlanetSign } from '../utils';"
    ],

    'astrology/asteroidsInsight.ts': [],  # No imports needed

    'astrology/fixedStarsInsight.ts': [],  # No imports needed

    'astrology/eclipsesInsight.ts': [],  # No imports needed

    'generators/dateRecommender.ts': [
        "import { extractSajuProfile, extractAstroProfile, calculateMonthlyImportantDates } from '@/lib/destiny-map/destinyCalendar';",
        "import { elementTraits, elementKeyMap, elementRelations, monthElements } from '../data';"
    ],

    'generators/luckyItems.ts': [],  # No imports needed

    'utils/helpers.ts': []  # No imports needed
}

# Add imports to each file
for filepath, imports in file_imports.items():
    full_path = f'{base_path}/{filepath}'

    if not os.path.exists(full_path):
        print(f"[SKIP] File not found: {filepath}")
        continue

    with open(full_path, 'r', encoding='utf-8') as f:
        content = f.read()

    if imports:
        # Add imports at the top
        import_block = '\n'.join(imports) + '\n\n'
        new_content = import_block + content

        with open(full_path, 'w', encoding='utf-8') as f:
            f.write(new_content)

        print(f"[OK] Added {len(imports)} import(s) to {filepath}")
    else:
        print(f"[OK] No imports needed for {filepath}")

print("\n[SUCCESS] All imports added!")
