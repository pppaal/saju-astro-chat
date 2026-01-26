/**
 * Extract enhancedData.ts to JSON files
 * This script splits the 293KB TypeScript file into smaller JSON chunks
 */

import fs from 'fs';
import path from 'path';
import { enhancedHexagramData, enhancedHexagramDataKo } from '../src/lib/iChing/enhancedData';

// Create output directory
const outputDir = path.join(__dirname, '../public/data/iching');
fs.mkdirSync(outputDir, { recursive: true });

// Strategy: Split by hexagram number ranges (8 hexagrams per file)
const CHUNK_SIZE = 8;
const totalHexagrams = 64;

console.log('📦 Extracting enhanced hexagram data to JSON...');
console.log(`Total hexagrams: ${totalHexagrams}`);
console.log(`Chunk size: ${CHUNK_SIZE} hexagrams per file\n`);

// Create chunks for English data
for (let i = 0; i < totalHexagrams; i += CHUNK_SIZE) {
  const chunkStart = i + 1;
  const chunkEnd = Math.min(i + CHUNK_SIZE, totalHexagrams);
  const chunk: Record<number, any> = {};

  for (let num = chunkStart; num <= chunkEnd; num++) {
    if (enhancedHexagramData[num]) {
      chunk[num] = enhancedHexagramData[num];
    }
  }

  const filename = `enhanced-data-en-${chunkStart}-${chunkEnd}.json`;
  const filepath = path.join(outputDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(chunk, null, 2));

  const size = (fs.statSync(filepath).size / 1024).toFixed(2);
  console.log(`✓ ${filename} (${Object.keys(chunk).length} hexagrams, ${size}KB)`);
}

console.log('');

// Create chunks for Korean data
for (let i = 0; i < totalHexagrams; i += CHUNK_SIZE) {
  const chunkStart = i + 1;
  const chunkEnd = Math.min(i + CHUNK_SIZE, totalHexagrams);
  const chunk: Record<number, any> = {};

  for (let num = chunkStart; num <= chunkEnd; num++) {
    if (enhancedHexagramDataKo[num]) {
      chunk[num] = enhancedHexagramDataKo[num];
    }
  }

  const filename = `enhanced-data-ko-${chunkStart}-${chunkEnd}.json`;
  const filepath = path.join(outputDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(chunk, null, 2));

  const size = (fs.statSync(filepath).size / 1024).toFixed(2);
  console.log(`✓ ${filename} (${Object.keys(chunk).length} hexagrams, ${size}KB)`);
}

// Create index file
const indexData = {
  totalHexagrams,
  chunkSize: CHUNK_SIZE,
  chunks: [] as Array<{ start: number; end: number; enFile: string; koFile: string }>
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

console.log('\n✓ Created index.json with chunk metadata');
console.log(`\n🎉 Successfully extracted all data!`);
console.log(`📊 Total files: ${indexData.chunks.length * 2 + 1}`);
