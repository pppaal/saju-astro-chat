#!/usr/bin/env python3
"""
FunInsights.tsx Phase 2: Extract analyzer and astrology functions
"""

import re
import os

# Read original file
with open('src/components/destiny-map/FunInsights.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# ============================================================
# 2. Extract analyzer functions
# ============================================================

analyzers = {
    'sibsinAnalyzer.ts': [
        'getSibsinDistribution',
        'getSibsinAnalysis'
    ],
    'crossAnalyzer.ts': [
        'getCrossAnalysis'
    ],
    'healthAnalyzer.ts': [
        'getHealthAnalysis'
    ],
    'timeAnalyzer.ts': [
        'getTimeBasedFortune'
    ],
    'strengthsAnalyzer.ts': [
        'getStrengthsAndWeaknesses'
    ],
    'flowAnalyzer.ts': [
        'getCurrentFlowAnalysis'
    ],
    'yongsinAnalyzer.ts': [
        'getYongsinAnalysis'
    ]
}

astrology_functions = {
    'chironInsight.ts': ['getChironInsight'],
    'partOfFortuneInsight.ts': ['getPartOfFortuneInsight'],
    'vertexInsight.ts': ['getVertexInsight'],
    'draconicInsight.ts': ['getDraconicInsight'],
    'harmonicsInsight.ts': ['getHarmonicsInsight'],
    'lilithInsight.ts': ['getLilithInsight'],
    'asteroidsInsight.ts': ['getAsteroidsInsight'],
    'fixedStarsInsight.ts': ['getFixedStarsInsight'],
    'eclipsesInsight.ts': ['getEclipsesInsight']
}

generators = {
    'dateRecommender.ts': [
        'getRecommendedDates',
        'getSimpleRecommendedDates'
    ],
    'luckyItems.ts': [
        'getLuckyItems'
    ]
}

def extract_function(content: str, func_name: str) -> str:
    """Extract a complete function definition"""
    # Match function definition with its body
    pattern = rf'function {func_name}\([^)]*\)[^{{]*\{{[^}}]*(?:\{{[^}}]*\}})*[^}}]*\}}\n'

    # More robust pattern for nested braces
    start_pattern = rf'function {func_name}\('
    match = re.search(start_pattern, content)

    if not match:
        print(f"  [WARNING] Could not find function: {func_name}")
        return ""

    start_pos = match.start()

    # Find matching closing brace
    brace_count = 0
    in_function = False
    end_pos = start_pos

    for i in range(start_pos, len(content)):
        char = content[i]
        if char == '{':
            in_function = True
            brace_count += 1
        elif char == '}':
            brace_count -= 1
            if in_function and brace_count == 0:
                end_pos = i + 1
                break

    # Extract function text
    func_text = content[start_pos:end_pos]

    # Add trailing newline if needed
    if not func_text.endswith('\n'):
        func_text += '\n'

    return func_text

def extract_helper_functions(content: str) -> str:
    """Extract helper functions like findPlanetSign"""
    helpers = []

    # findPlanetSign
    match = extract_function(content, 'findPlanetSign')
    if match:
        helpers.append(match)

    return '\n'.join(helpers)

# Extract and save analyzer functions
for filename, func_names in analyzers.items():
    file_content = []

    for func_name in func_names:
        func_text = extract_function(content, func_name)
        if func_text:
            file_content.append(f"export {func_text}")
            print(f"  [OK] Extracted {func_name}")

    if file_content:
        output_path = f'src/components/destiny-map/fun-insights/analyzers/{filename}'
        os.makedirs(os.path.dirname(output_path), exist_ok=True)

        with open(output_path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(file_content))

        print(f"[OK] Created {filename}")

# Extract and save astrology insight functions
for filename, func_names in astrology_functions.items():
    file_content = []

    for func_name in func_names:
        func_text = extract_function(content, func_name)
        if func_text:
            file_content.append(f"export {func_text}")
            print(f"  [OK] Extracted {func_name}")

    if file_content:
        output_path = f'src/components/destiny-map/fun-insights/astrology/{filename}'
        os.makedirs(os.path.dirname(output_path), exist_ok=True)

        with open(output_path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(file_content))

        print(f"[OK] Created {filename}")

# Extract and save generator functions
for filename, func_names in generators.items():
    file_content = []

    for func_name in func_names:
        func_text = extract_function(content, func_name)
        if func_text:
            file_content.append(f"export {func_text}")
            print(f"  [OK] Extracted {func_name}")

    if file_content:
        output_path = f'src/components/destiny-map/fun-insights/generators/{filename}'
        os.makedirs(os.path.dirname(output_path), exist_ok=True)

        with open(output_path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(file_content))

        print(f"[OK] Created {filename}")

# Create helper utils file
helpers_content = extract_helper_functions(content)
if helpers_content:
    with open('src/components/destiny-map/fun-insights/utils/helpers.ts', 'w', encoding='utf-8') as f:
        f.write(f"export {helpers_content}")
    print("[OK] Created utils/helpers.ts")

# Create index files for each directory
analyzer_index = '\n'.join([f"export * from './{f[:-3]}';" for f in analyzers.keys()])
with open('src/components/destiny-map/fun-insights/analyzers/index.ts', 'w', encoding='utf-8') as f:
    f.write(analyzer_index + '\n')
print("[OK] Created analyzers/index.ts")

astrology_index = '\n'.join([f"export * from './{f[:-3]}';" for f in astrology_functions.keys()])
with open('src/components/destiny-map/fun-insights/astrology/index.ts', 'w', encoding='utf-8') as f:
    f.write(astrology_index + '\n')
print("[OK] Created astrology/index.ts")

generators_index = '\n'.join([f"export * from './{f[:-3]}';" for f in generators.keys()])
with open('src/components/destiny-map/fun-insights/generators/index.ts', 'w', encoding='utf-8') as f:
    f.write(generators_index + '\n')
print("[OK] Created generators/index.ts")

print("\n[SUCCESS] Phase 2 complete! All analyzer and astrology functions extracted.")
print("Next: Update main FunInsights.tsx to import these functions.")
