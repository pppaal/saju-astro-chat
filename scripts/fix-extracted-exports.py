#!/usr/bin/env python3
"""
Fix export statements in extracted files - remove duplicate exports and comments before functions
"""

import os
import re

base_path = 'src/components/destiny-map/fun-insights'

# Get all .ts files recursively
ts_files = []
for root, dirs, files in os.walk(base_path):
    for file in files:
        if file.endswith('.ts') and file != 'index.ts':
            ts_files.append(os.path.join(root, file))

for filepath in ts_files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Remove "export // comment\nfunction" pattern - replace with "export function"
    content = re.sub(r'export\s*//[^\n]*\nfunction\s+', 'export function ', content)

    # Remove standalone "export " before function definitions
    content = re.sub(r'\nexport\s+export\s+function\s+', '\nexport function ', content)

    # Fix any remaining standalone export at the start of file
    content = re.sub(r'^export\s+//[^\n]*\nfunction\s+', 'export function ', content)

    # Fix cases where export is alone on a line followed by function
    content = re.sub(r'export\s*\n+function\s+', 'export function ', content)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"[OK] Fixed {filepath}")

print("\n[SUCCESS] All export statements fixed!")
