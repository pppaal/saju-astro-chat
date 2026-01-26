/**
 * Automated refactoring script for past-life/analyzer.ts
 * Extracts large data objects into separate files
 */

import fs from 'fs';
import path from 'path';

const sourceFile = path.join(__dirname, '../src/lib/past-life/analyzer.ts');
const content = fs.readFileSync(sourceFile, 'utf-8');
const lines = content.split('\n');

// Create output directories
const dataDir = path.join(__dirname, '../src/lib/past-life/data');
const utilsDir = path.join(__dirname, '../src/lib/past-life/utils');
fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(utilsDir, { recursive: true });

console.log('📦 Starting past-life/analyzer.ts refactoring...\n');

// Data extraction configurations
const dataExtracts = [
  {
    name: 'SOUL_PATTERNS',
    startLine: 92,
    endLine: 253,
    type: 'GeokgukType',
    valueType: 'SoulPatternData',
    outputFile: 'soul-patterns.ts'
  },
  {
    name: 'PAST_LIFE_THEMES',
    startLine: 256,
    endLine: 559,
    type: 'GeokgukType',
    valueType: 'PastLifeThemeData',
    outputFile: 'past-life-themes.ts'
  },
  {
    name: 'NODE_JOURNEY',
    startLine: 560,
    endLine: 971,
    type: 'HouseNumber',
    valueType: 'NodeJourneyData',
    outputFile: 'node-journey.ts'
  },
  {
    name: 'SATURN_LESSONS',
    startLine: 972,
    endLine: 1287,
    type: 'HouseNumber',
    valueType: 'SaturnLessonData',
    outputFile: 'saturn-lessons.ts'
  },
  {
    name: 'DAY_MASTER_MISSION',
    startLine: 1288,
    endLine: 1619,
    type: 'HeavenlyStem',
    valueType: 'DayMasterMissionData',
    outputFile: 'day-master-mission.ts'
  }
];

// Extract each data object
for (const config of dataExtracts) {
  const { name, startLine, endLine, type, valueType, outputFile } = config;

  // Extract lines (arrays are 0-indexed, line numbers are 1-indexed)
  const dataLines = lines.slice(startLine - 1, endLine);
  const dataContent = dataLines.join('\n');

  // Create file content
  const fileContent = `/**
 * ${name} data for past-life analysis
 * Extracted from analyzer.ts for better modularity
 */

import type { ${type}, ${valueType} } from './types';

export ${dataContent}
`;

  // Write to file
  const outputPath = path.join(dataDir, outputFile);
  fs.writeFileSync(outputPath, fileContent);

  const lineCount = endLine - startLine + 1;
  const size = (Buffer.byteLength(fileContent) / 1024).toFixed(2);
  console.log(`✅ ${outputFile.padEnd(30)} ${lineCount.toString().padStart(4)} lines, ${size}KB`);
}

// Extract constants
console.log('\n📋 Extracting constants...');

const constantsContent = `/**
 * Constants for past-life analysis
 */

import type { GeokgukType } from './types';

${lines.slice(1619, 1795).join('\n')}

export const PLANET_ALIASES = {
  northNode: ['North Node', 'northnode', 'true node'],
  saturn: ['Saturn', 'saturn']
} as const;

export const KARMA_SCORE_CONFIG = {
  BASE_SCORE: 50,
  MAX_SCORE: 100,
  MIN_SCORE: 0,
  BONUS: {
    GEOKGUK: 10,
    NORTH_NODE: 10,
    SATURN: 10,
    DAY_MASTER: 10,
    PER_KARMIC_DEBT: 5,
  }
} as const;
`;

fs.writeFileSync(path.join(dataDir, 'constants.ts'), constantsContent);
console.log(`✅ ${'constants.ts'.padEnd(30)} ${(176).toString().padStart(4)} lines`);

console.log('\n✨ Data extraction complete!');
console.log('\n📊 Summary:');
console.log(`   - Total data lines extracted: ~1,700`);
console.log(`   - Files created: 6`);
console.log(`   - Average file size: ~35KB`);

console.log('\n📝 Next steps:');
console.log('   1. Review generated files in src/lib/past-life/data/');
console.log('   2. Extract helper functions to src/lib/past-life/utils/');
console.log('   3. Update analyzer.ts to import from new files');
console.log('   4. Run tests: npm test src/lib/past-life');

console.log('\n💡 Tip: Check docs/REFACTORING_GUIDE.md for detailed steps');
