#!/usr/bin/env python3
"""
FunInsights.tsx Phase 2: Extract all functions properly
"""

import re
import os

# Read original file
with open('src/components/destiny-map/FunInsights.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
    content = ''.join(lines)

def extract_function_better(content: str, func_name: str) -> str:
    """
    Extract function by finding it and counting braces from the first { after function declaration
    """
    # Find "function funcName("
    pattern = rf'function {func_name}\s*\('
    match = re.search(pattern, content)

    if not match:
        print(f"  [ERROR] Function not found: {func_name}")
        return ""

    func_start = match.start()

    # Find the first { that starts the function body (after the ) of parameters)
    # We need to skip the return type annotation
    search_pos = match.end()

    # Find closing ) for parameters - but we need to handle nested ()
    paren_count = 1  # We already passed the opening (
    i = search_pos
    while i < len(content) and paren_count > 0:
        if content[i] == '(':
            paren_count += 1
        elif content[i] == ')':
            paren_count -= 1
        i += 1

    # Now find the { that opens function body
    brace_start = content.find('{', i)
    if brace_start == -1:
        print(f"  [ERROR] No opening brace found for {func_name}")
        return ""

    # Count braces to find the closing one
    brace_count = 1
    i = brace_start + 1
    in_string = False
    in_template = False
    string_char = None
    escape_next = False

    while i < len(content) and brace_count > 0:
        char = content[i]

        if escape_next:
            escape_next = False
            i += 1
            continue

        if char == '\\':
            escape_next = True
            i += 1
            continue

        # Handle template literals
        if char == '`':
            in_template = not in_template
            i += 1
            continue

        # Handle strings
        if char in ['"', "'"] and not in_template:
            if not in_string:
                in_string = True
                string_char = char
            elif char == string_char:
                in_string = False
                string_char = None
            i += 1
            continue

        # Count braces only when not in strings/templates
        if not in_string and not in_template:
            if char == '{':
                brace_count += 1
            elif char == '}':
                brace_count -= 1

        i += 1

    if brace_count != 0:
        print(f"  [ERROR] Mismatched braces for {func_name}")
        return ""

    # Extract from function start to closing brace
    func_text = content[func_start:i]
    if not func_text.endswith('\n'):
        func_text += '\n'

    return func_text


# Define all functions to extract
all_functions = {
    'analyzers': {
        'sibsinAnalyzer.ts': ['getSibsinDistribution', 'getSibsinAnalysis'],
        'crossAnalyzer.ts': ['getCrossAnalysis'],
        'healthAnalyzer.ts': ['getHealthAnalysis'],
        'timeAnalyzer.ts': ['getTimeBasedFortune'],
        'strengthsAnalyzer.ts': ['getStrengthsAndWeaknesses'],
        'flowAnalyzer.ts': ['getCurrentFlowAnalysis'],
        'yongsinAnalyzer.ts': ['getYongsinAnalysis']
    },
    'astrology': {
        'chironInsight.ts': ['getChironInsight'],
        'partOfFortuneInsight.ts': ['getPartOfFortuneInsight'],
        'vertexInsight.ts': ['getVertexInsight'],
        'draconicInsight.ts': ['getDraconicInsight'],
        'harmonicsInsight.ts': ['getHarmonicsInsight'],
        'lilithInsight.ts': ['getLilithInsight'],
        'asteroidsInsight.ts': ['getAsteroidsInsight'],
        'fixedStarsInsight.ts': ['getFixedStarsInsight'],
        'eclipsesInsight.ts': ['getEclipsesInsight']
    },
    'generators': {
        'dateRecommender.ts': ['getRecommendedDates', 'getSimpleRecommendedDates'],
        'luckyItems.ts': ['getLuckyItems']
    },
    'utils': {
        'helpers.ts': ['findPlanetSign']
    }
}

# Extract all functions
for category, files in all_functions.items():
    for filename, func_names in files.items():
        file_parts = []

        for func_name in func_names:
            func_text = extract_function_better(content, func_name)
            if func_text:
                file_parts.append(f"export {func_text}")
                lines_count = func_text.count('\n')
                print(f"  [OK] {func_name}: {lines_count} lines, {len(func_text)} chars")
            else:
                print(f"  [FAIL] {func_name}")

        if file_parts:
            output_dir = f'src/components/destiny-map/fun-insights/{category}'
            os.makedirs(output_dir, exist_ok=True)
            output_path = f'{output_dir}/{filename}'

            with open(output_path, 'w', encoding='utf-8') as f:
                f.write('\n'.join(file_parts))

            print(f"[OK] Created {category}/{filename}\n")

# Create index files
for category, files in all_functions.items():
    index_lines = [f"export * from './{fname[:-3]}';" for fname in files.keys()]
    index_path = f'src/components/destiny-map/fun-insights/{category}/index.ts'

    with open(index_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(index_lines) + '\n')

    print(f"[OK] Created {category}/index.ts")

print("\n[SUCCESS] All functions extracted successfully!")
print("Total files created:")
print(f"  - {sum(len(files) for files in all_functions.values())} function files")
print(f"  - {len(all_functions)} index files")
