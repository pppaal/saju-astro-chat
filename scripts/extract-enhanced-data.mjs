/**
 * Extract enhancedData.ts to JSON files
 * This script splits the 293KB TypeScript file into smaller JSON chunks
 * for better bundle optimization and lazy loading
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the source file
const sourceFile = path.join(__dirname, '../src/lib/iChing/enhancedData.ts');
const content = fs.readFileSync(sourceFile, 'utf-8');

// Extract the data object using regex
const matchEn = content.match(/export const enhancedHexagramData[^=]*=\s*({[\s\S]*?^});/m);
const matchKo = content.match(/export const enhancedHexagramDataKo[^=]*=\s*({[\s\S]*?^});/m);

if (!matchEn || !matchKo) {
  console.error('Failed to extract data from source file');
  process.exit(1);
}

// Parse the data (convert to valid JSON)
const dataEnStr = matchEn[1]
  .replace(/(\w+):/g, '"$1":') // Add quotes to keys
  .replace(/'/g, '"') // Convert single quotes to double quotes
  .replace(/,(\s*[}\]])/g, '$1'); // Remove trailing commas

const dataKoStr = matchKo[1]
  .replace(/(\w+):/g, '"$1":')
  .replace(/'/g, '"')
  .replace(/,(\s*[}\]])/g, '$1');

let dataEn, dataKo;
try {
  // Use eval to parse the object (it's our own code, so it's safe)
  dataEn = eval('(' + matchEn[1] + ')');
  dataKo = eval('(' + matchKo[1] + ')');
} catch (e) {
  console.error('Failed to parse data:', e);
  // Try importing directly
  try {
    const module = await import(sourceFile);
    dataEn = module.enhancedHexagramData;
    dataKo = module.enhancedHexagramDataKo;
  } catch (importError) {
    console.error('Failed to import module:', importError);
    process.exit(1);
  }
}

// Create output directory
const outputDir = path.join(__dirname, '../public/data/iching');
fs.mkdirSync(outputDir, { recursive: true });

// Strategy 1: Split by hexagram number ranges (8 files with 8 hexagrams each)
const CHUNK_SIZE = 8;
const totalHexagrams = 64;

console.log('Extracting enhanced hexagram data to JSON...');
console.log(`Total hexagrams: ${totalHexagrams}`);
console.log(`Chunk size: ${CHUNK_SIZE} hexagrams per file`);

// Create chunks for English data
for (let i = 0; i < totalHexagrams; i += CHUNK_SIZE) {
  const chunkStart = i + 1;
  const chunkEnd = Math.min(i + CHUNK_SIZE, totalHexagrams);
  const chunk = {};

  for (let num = chunkStart; num <= chunkEnd; num++) {
    if (dataEn[num]) {
      chunk[num] = dataEn[num];
    }
  }

  const filename = `enhanced-data-en-${chunkStart}-${chunkEnd}.json`;
  const filepath = path.join(outputDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(chunk, null, 2));
  console.log(`✓ Created ${filename} (${Object.keys(chunk).length} hexagrams)`);
}

// Create chunks for Korean data
for (let i = 0; i < totalHexagrams; i += CHUNK_SIZE) {
  const chunkStart = i + 1;
  const chunkEnd = Math.min(i + CHUNK_SIZE, totalHexagrams);
  const chunk = {};

  for (let num = chunkStart; num <= chunkEnd; num++) {
    if (dataKo[num]) {
      chunk[num] = dataKo[num];
    }
  }

  const filename = `enhanced-data-ko-${chunkStart}-${chunkEnd}.json`;
  const filepath = path.join(outputDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(chunk, null, 2));
  console.log(`✓ Created ${filename} (${Object.keys(chunk).length} hexagrams)`);
}

// Create index file for easier imports
const indexData = {
  totalHexagrams,
  chunkSize: CHUNK_SIZE,
  chunks: []
};

for (let i = 0; i < totalHexagrams; i += CHUNK_SIZE) {
  const chunkStart = i + 1;
  const chunkEnd = Math.min(i + CHUNK_SIZE, totalHexagrams);
  indexData.chunks.push({
    start: chunkStart,
    end: chunkEnd,
    enFile: `enhanced-data-en-${chunkStart}-${chunkEnd}.json`,
    koFile: `enhanced-data-ko-${chunkStart}-${chunkEnd}.json`
  });
}

fs.writeFileSync(
  path.join(outputDir, 'index.json'),
  JSON.stringify(indexData, null, 2)
);

console.log('\n✓ Successfully extracted all data!');
console.log(`✓ Created index.json with chunk metadata`);
console.log(`\nTotal files created: ${indexData.chunks.length * 2 + 1}`);
