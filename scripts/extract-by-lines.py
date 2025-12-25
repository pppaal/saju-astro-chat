#!/usr/bin/env python3
"""
Extract functions from FunInsights.tsx using known line ranges
"""

import os

# Read the file
with open('src/components/destiny-map/FunInsights.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

def extract_lines(start, end):
    """Extract lines (1-indexed)"""
    return ''.join(lines[start-1:end])

# Manual line ranges for each function (found via grep)
extractions = {
    'analyzers/sibsinAnalyzer.ts': [
        (212, 239),  # getSibsinDistribution
        (509, 575),  # getSibsinAnalysis
    ],
    'analyzers/crossAnalyzer.ts': [
        (243, 303),  # getCrossAnalysis
    ],
    'analyzers/healthAnalyzer.ts': [
        (578, 610),  # getHealthAnalysis
    ],
    'analyzers/timeAnalyzer.ts': [
        (855, 1046),  # getTimeBasedFortune
    ],
    'analyzers/strengthsAnalyzer.ts': [
        (1309, 1461),  # getStrengthsAndWeaknesses
    ],
    'analyzers/flowAnalyzer.ts': [
        (1464, 1522),  # getCurrentFlowAnalysis
    ],
    'analyzers/yongsinAnalyzer.ts': [
        (1525, 1571),  # getYongsinAnalysis
    ],
    'astrology/chironInsight.ts': [
        (613, 690),  # getChironInsight
    ],
    'astrology/partOfFortuneInsight.ts': [
        (693, 771),  # getPartOfFortuneInsight
    ],
    'astrology/vertexInsight.ts': [
        (774, 852),  # getVertexInsight
    ],
    'astrology/draconicInsight.ts': [
        (1049, 1089),  # getDraconicInsight
    ],
    'astrology/harmonicsInsight.ts': [
        (1092, 1123),  # getHarmonicsInsight
    ],
    'astrology/lilithInsight.ts': [
        (1126, 1191),  # getLilithInsight
    ],
    'astrology/asteroidsInsight.ts': [
        (1194, 1249),  # getAsteroidsInsight
    ],
    'astrology/fixedStarsInsight.ts': [
        (1252, 1282),  # getFixedStarsInsight
    ],
    'astrology/eclipsesInsight.ts': [
        (1285, 1306),  # getEclipsesInsight
    ],
    'generators/dateRecommender.ts': [
        (307, 424),  # getRecommendedDates
        (428, 462),  # getSimpleRecommendedDates
    ],
    'generators/luckyItems.ts': [
        (466, 506),  # getLuckyItems
    ],
    'utils/helpers.ts': [
        (197, 209),  # findPlanetSign
    ],
}

# Extract and save each file
for filepath, ranges in extractions.items():
    content_parts = []

    for start, end in ranges:
        func_text = extract_lines(start, end)
        content_parts.append(f"export {func_text}")
        line_count = end - start + 1
        print(f"  [OK] Extracted lines {start}-{end} ({line_count} lines)")

    if content_parts:
        full_path = f'src/components/destiny-map/fun-insights/{filepath}'
        os.makedirs(os.path.dirname(full_path), exist_ok=True)

        with open(full_path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(content_parts))

        print(f"[OK] Created {filepath}\n")

# Create index files
categories = {
    'analyzers': ['sibsinAnalyzer', 'crossAnalyzer', 'healthAnalyzer', 'timeAnalyzer', 'strengthsAnalyzer', 'flowAnalyzer', 'yongsinAnalyzer'],
    'astrology': ['chironInsight', 'partOfFortuneInsight', 'vertexInsight', 'draconicInsight', 'harmonicsInsight', 'lilithInsight', 'asteroidsInsight', 'fixedStarsInsight', 'eclipsesInsight'],
    'generators': ['dateRecommender', 'luckyItems'],
    'utils': ['helpers']
}

for category, modules in categories.items():
    index_content = '\n'.join([f"export * from './{m}';" for m in modules]) + '\n'
    index_path = f'src/components/destiny-map/fun-insights/{category}/index.ts'

    with open(index_path, 'w', encoding='utf-8') as f:
        f.write(index_content)

    print(f"[OK] Created {category}/index.ts")

print("\n[SUCCESS] All functions extracted by line ranges!")
