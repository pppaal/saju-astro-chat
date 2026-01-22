import sys

# Read the generated content
with open(r'c:\dev\saju-astro-chat\scripts\hexagrams-34-64-output.txt', 'r', encoding='utf-8') as f:
    new_content = f.read().strip()

# Read the original file
with open(r'c:\dev\saju-astro-chat\src\lib\iChing\enhancedData.ts', 'r', encoding='utf-8') as f:
    original = f.read()

# Split into lines
lines = original.split('\n')

# Find the insertion point (after hexagram 33, before closing brace)
# Line 3579 is "  }" closing hexagram 33
# We need to add a comma after line 3579 and insert new content
insert_line = 3579  # 0-indexed, so this is line 3580 in the file

# Insert comma and new content
new_lines = lines[:insert_line] + [lines[insert_line-1] + ','] + new_content.split('\n') + lines[insert_line+1:]

# Write back
with open(r'c:\dev\saju-astro-chat\src\lib\iChing\enhancedData.ts', 'w', encoding='utf-8') as f:
    f.write('\n'.join(new_lines))

print("Successfully inserted hexagrams 34-64!")
