#!/usr/bin/env python3
import re
import os

files = [
    'src/app/api/astrology/route.ts',
    'src/app/api/compatibility/route.ts',
    'src/app/api/daily-fortune/route.ts',
    'src/app/api/dream/route.ts',
    'src/app/api/dream/chat/route.ts',
    'src/app/api/tarot/chat/route.ts',
    'src/app/api/tarot/interpret/route.ts',
]

import_line = 'import { getBackendUrl as pickBackendUrl } from "@/lib/backend-url";'

# Multi-line function pattern (flexible to match different formatting)
function_pattern = re.compile(
    r'function pickBackendUrl\(\) \{.*?return url;\n\}\n',
    re.DOTALL
)

for filepath in files:
    print(f"Processing: {filepath}")

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Remove pickBackendUrl function
    new_content, count = function_pattern.subn('', content)

    if count > 0:
        print(f"  [OK] Removed {count} pickBackendUrl function(s)")
    else:
        print(f"  [INFO] No pickBackendUrl function found")

    # 2. Add import if not exists
    if '@/lib/backend-url' not in new_content:
        # Find first import line
        match = re.search(r"^import .+?;\n", new_content, re.MULTILINE)
        if match:
            insert_pos = match.end()
            new_content = new_content[:insert_pos] + import_line + '\n' + new_content[insert_pos:]
            print(f"  [OK] Added import statement")
    else:
        print(f"  [INFO] Import already exists")

    # 3. Write back
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)

    print(f"  [DONE] Completed\n")

print("[SUCCESS] Refactoring complete!")
