#!/usr/bin/env node
/**
 * Extract karma narratives from karma-narratives.ts to JSON files
 * Similar to extract-enhanced-data.mjs approach
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sourceFile = join(__dirname, '../src/components/destiny-map/fun-insights/tabs/data/karma-narratives.ts');
const outputDir = join(__dirname, '../public/data/karma');

// Ensure output directory exists
mkdirSync(outputDir, { recursive: true });

console.log('📖 Reading karma-narratives.ts...');
const content = readFileSync(sourceFile, 'utf-8');

// Helper to extract object literal between markers
function extractObject(content, startMarker, endMarker) {
  const startIdx = content.indexOf(startMarker);
  if (startIdx === -1) {
    console.warn(`Warning: Could not find start marker: ${startMarker}`);
    return null;
  }

  const searchStart = startIdx + startMarker.length;
  let braceCount = 0;
  let inString = false;
  let stringChar = null;
  let objStart = -1;
  let objEnd = -1;

  for (let i = searchStart; i < content.length; i++) {
    const char = content[i];
    const prevChar = i > 0 ? content[i - 1] : '';

    // Handle strings
    if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
        stringChar = null;
      }
    }

    if (inString) continue;

    // Track braces
    if (char === '{') {
      if (braceCount === 0) {
        objStart = i;
      }
      braceCount++;
    } else if (char === '}') {
      braceCount--;
      if (braceCount === 0) {
        objEnd = i + 1;
        break;
      }
    }
  }

  if (objStart === -1 || objEnd === -1) {
    console.warn(`Warning: Could not find object boundaries for: ${startMarker}`);
    return null;
  }

  return content.substring(objStart, objEnd);
}

// Extract each narrative object
console.log('🔍 Extracting dayMasterExtendedNarratives...');
const dayMasterStr = extractObject(
  content,
  'const dayMasterExtendedNarratives: Record<string, { ko: string[]; en: string[] }> = ',
  null
);

console.log('🔍 Extracting northNodeExtendedNarratives...');
const northNodeStr = extractObject(
  content,
  'const northNodeExtendedNarratives: Record<number, { ko: string[]; en: string[] }> = ',
  null
);

console.log('🔍 Extracting saturnExtendedNarratives...');
const saturnStr = extractObject(
  content,
  'const saturnExtendedNarratives: Record<number, { ko: string[]; en: string[] }> = ',
  null
);

console.log('🔍 Extracting shinsalExtendedNarratives...');
const shinsalStr = extractObject(
  content,
  'const shinsalExtendedNarratives: Record<string, { ko: string[]; en: string[] }> = ',
  null
);

// Convert to proper JSON by evaluating as JavaScript
// This is safe because we're only working with our own source code
function objectLiteralToJSON(objStr) {
  if (!objStr) return null;

  try {
    // Use Function constructor to safely evaluate the object literal
    const evalFunc = new Function(`return ${objStr}`);
    return evalFunc();
  } catch (err) {
    console.error('Error converting object literal:', err.message);
    return null;
  }
}

console.log('🔄 Converting to JSON...');
const dayMasterData = objectLiteralToJSON(dayMasterStr);
const northNodeData = objectLiteralToJSON(northNodeStr);
const saturnData = objectLiteralToJSON(saturnStr);
const shinsalData = objectLiteralToJSON(shinsalStr);

// Write JSON files
if (dayMasterData) {
  const dayMasterPath = join(outputDir, 'day-master-narratives.json');
  writeFileSync(dayMasterPath, JSON.stringify(dayMasterData, null, 2), 'utf-8');
  console.log(`✅ Created: ${dayMasterPath}`);
  console.log(`   Keys: ${Object.keys(dayMasterData).length}`);
}

if (northNodeData) {
  const northNodePath = join(outputDir, 'north-node-narratives.json');
  writeFileSync(northNodePath, JSON.stringify(northNodeData, null, 2), 'utf-8');
  console.log(`✅ Created: ${northNodePath}`);
  console.log(`   Keys: ${Object.keys(northNodeData).length}`);
}

if (saturnData) {
  const saturnPath = join(outputDir, 'saturn-narratives.json');
  writeFileSync(saturnPath, JSON.stringify(saturnData, null, 2), 'utf-8');
  console.log(`✅ Created: ${saturnPath}`);
  console.log(`   Keys: ${Object.keys(saturnData).length}`);
}

if (shinsalData) {
  const shinsalPath = join(outputDir, 'shinsal-narratives.json');
  writeFileSync(shinsalPath, JSON.stringify(shinsalData, null, 2), 'utf-8');
  console.log(`✅ Created: ${shinsalPath}`);
  console.log(`   Keys: ${Object.keys(shinsalData).length}`);
}

console.log('\n✨ Extraction complete!');
console.log(`📁 Output directory: ${outputDir}`);
