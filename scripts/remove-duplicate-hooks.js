/**
 * Remove duplicate hook definitions from main/page.tsx
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'src/app/(main)/page.tsx');
const content = fs.readFileSync(filePath, 'utf-8');

const lines = content.split('\n');

// Find the start and end of duplicate hooks section
// Starts at line 21 (index 20): "// Custom hook for typing animation"
// Ends at line 173 (index 172): end of useVisitorStats

// Keep lines 0-19 (before duplicates) and lines 174+ (after duplicates)
const newLines = [
  ...lines.slice(0, 20),  // Lines 1-20
  ...lines.slice(173)      // Lines 174+
];

const newContent = newLines.join('\n');

fs.writeFileSync(filePath, newContent, 'utf-8');

console.log('✅ Removed duplicate hooks from main/page.tsx');
console.log(`   Lines removed: 21-173 (153 lines)`);
console.log(`   New total: ${newLines.length} lines (was ${lines.length})`);
