#!/usr/bin/env python3
"""
FunInsights.tsx Phase 2: Extract analyzer and astrology functions (FIXED)
Better brace matching algorithm
"""

import re
import os

# Read original file
with open('src/components/destiny-map/FunInsights.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# ============================================================
# Function extraction with proper brace matching
# ============================================================

def extract_function(content: str, func_name: str) -> str:
    """Extract a complete function definition with proper brace matching"""
    # Find function start
    pattern = rf'^function {func_name}\s*\('
    match = re.search(pattern, content, re.MULTILINE)

    if not match:
        print(f"  [WARNING] Could not find function: {func_name}")
        return ""

    start_pos = match.start()

    # Find opening brace
    brace_start = content.find('{', start_pos)
    if brace_start == -1:
        return ""

    # Count braces to find matching closing brace
    brace_count = 0
    i = brace_start
    in_string = False
    in_template = False
    string_char = None

    while i < len(content):
        char = content[i]
        prev_char = content[i-1] if i > 0 else ''

        # Handle strings
        if char in ['"', "'"] and prev_char != '\\':
            if not in_string:
                in_string = True
                string_char = char
            elif char == string_char:
                in_string = False
                string_char = None

        # Handle template literals
        elif char == '`' and prev_char != '\\':
            in_template = not in_template

        # Count braces only outside strings
        elif not in_string and not in_template:
            if char == '{':
                brace_count += 1
            elif char == '}':
                brace_count -= 1
                if brace_count == 0:
                    # Found matching brace
                    end_pos = i + 1
                    # Add trailing newline if there's one after
                    if end_pos < len(content) and content[end_pos] == '\n':
                        end_pos += 1
                    return content[start_pos:end_pos]

        i += 1

    print(f"  [ERROR] Could not find matching brace for {func_name}")
    return ""

# ============================================================
# File organization
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

# Extract helper function
helpers_text = extract_function(content, 'findPlanetSign')

# Extract and save analyzer functions
for filename, func_names in analyzers.items():
    file_content = []

    for func_name in func_names:
        func_text = extract_function(content, func_name)
        if func_text:
            file_content.append(f"export {func_text}")
            print(f"  [OK] Extracted {func_name} ({len(func_text)} chars)")

    if file_content:
        output_path = f'src/components/destiny-map/fun-insights/analyzers/{filename}'
        os.makedirs(os.path.dirname(output_path), exist_ok=True)

        with open(output_path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(file_content))

        print(f"[OK] Created {filename}\n")

# Extract and save astrology insight functions
for filename, func_names in astrology_functions.items():
    file_content = []

    for func_name in func_names:
        func_text = extract_function(content, func_name)
        if func_text:
            file_content.append(f"export {func_text}")
            print(f"  [OK] Extracted {func_name} ({len(func_text)} chars)")

    if file_content:
        output_path = f'src/components/destiny-map/fun-insights/astrology/{filename}'
        os.makedirs(os.path.dirname(output_path), exist_ok=True)

        with open(output_path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(file_content))

        print(f"[OK] Created {filename}\n")

# Extract and save generator functions
for filename, func_names in generators.items():
    file_content = []

    for func_name in func_names:
        func_text = extract_function(content, func_name)
        if func_text:
            file_content.append(f"export {func_text}")
            print(f"  [OK] Extracted {func_name} ({len(func_text)} chars)")

    if file_content:
        output_path = f'src/components/destiny-map/fun-insights/generators/{filename}'
        os.makedirs(os.path.dirname(output_path), exist_ok=True)

        with open(output_path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(file_content))

        print(f"[OK] Created {filename}\n")

# Create helper utils file
if helpers_text:
    os.makedirs('src/components/destiny-map/fun-insights/utils', exist_ok=True)
    with open('src/components/destiny-map/fun-insights/utils/helpers.ts', 'w', encoding='utf-8') as f:
        f.write(f"export {helpers_text}")
    print("[OK] Created utils/helpers.ts")

# Create index files
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

utils_index = "export * from './helpers';\n"
with open('src/components/destiny-map/fun-insights/utils/index.ts', 'w', encoding='utf-8') as f:
    f.write(utils_index)
print("[OK] Created utils/index.ts")

print("\n[SUCCESS] Phase 2 complete! All analyzer and astrology functions extracted.")
print("Next: Add imports and update main FunInsights.tsx")
