#!/usr/bin/env node

// Analyze all remaining cells in Layers 3, 5, 7 that need advice

import { SIBSIN_HOUSE_MATRIX } from '../src/lib/destiny-matrix/data/layer3-sibsin-house.ts';
import { RELATION_ASPECT_MATRIX } from '../src/lib/destiny-matrix/data/layer5-relation-aspect.ts';
import { ADVANCED_ANALYSIS_MATRIX } from '../src/lib/destiny-matrix/data/layer7-advanced-analysis.ts';

console.log('================================================================================');
console.log('Layers 3, 5, 7 - Complete Remaining Analysis');
console.log('================================================================================\n');

// Layer 3
console.log('📊 Layer 3: Sibsin-House Matrix - ALL Remaining Cells');
console.log('--------------------------------------------------------------------------------');

const layer3Cells = [];
for (const [sibsin, houses] of Object.entries(SIBSIN_HOUSE_MATRIX)) {
  for (const [house, code] of Object.entries(houses)) {
    const score = code.score;
    const hasAdvice = !!code.advice;
    if (!hasAdvice) {
      layer3Cells.push({
        combination: `${sibsin} × ${house}`,
        score,
        keyword: code.keyword,
        level: code.level,
      });
    }
  }
}

layer3Cells.sort((a, b) => b.score - a.score);

console.log(`Total cells: 120`);
console.log(`With advice: ${120 - layer3Cells.length}`);
console.log(`Need advice: ${layer3Cells.length}\n`);

// Group by score
const layer3ByScore = {};
layer3Cells.forEach(cell => {
  if (!layer3ByScore[cell.score]) layer3ByScore[cell.score] = [];
  layer3ByScore[cell.score].push(cell);
});

console.log('Breakdown by score:');
Object.keys(layer3ByScore).sort((a, b) => b - a).forEach(score => {
  console.log(`  Score ${score}: ${layer3ByScore[score].length} cells`);
});

console.log('\nFirst 20 cells needing advice:');
layer3Cells.slice(0, 20).forEach((cell, i) => {
  console.log(`${(i+1).toString().padStart(2)}. ${cell.combination.padEnd(25)} Score: ${cell.score} - ${cell.keyword}`);
});

// Layer 5
console.log('\n\n📊 Layer 5: Relation-Aspect Matrix - ALL Remaining Cells');
console.log('--------------------------------------------------------------------------------');

const layer5Cells = [];
for (const [relation, aspects] of Object.entries(RELATION_ASPECT_MATRIX)) {
  for (const [aspect, code] of Object.entries(aspects)) {
    const score = code.score;
    const hasAdvice = !!code.advice;
    if (!hasAdvice) {
      layer5Cells.push({
        combination: `${relation} × ${aspect}`,
        score,
        keyword: code.keyword,
        level: code.level,
      });
    }
  }
}

layer5Cells.sort((a, b) => b.score - a.score);

console.log(`Total cells: 72`);
console.log(`With advice: ${72 - layer5Cells.length}`);
console.log(`Need advice: ${layer5Cells.length}\n`);

// Group by score
const layer5ByScore = {};
layer5Cells.forEach(cell => {
  if (!layer5ByScore[cell.score]) layer5ByScore[cell.score] = [];
  layer5ByScore[cell.score].push(cell);
});

console.log('Breakdown by score:');
Object.keys(layer5ByScore).sort((a, b) => b - a).forEach(score => {
  console.log(`  Score ${score}: ${layer5ByScore[score].length} cells`);
});

console.log('\nAll cells needing advice:');
layer5Cells.forEach((cell, i) => {
  console.log(`${(i+1).toString().padStart(2)}. ${cell.combination.padEnd(30)} Score: ${cell.score} - ${cell.keyword}`);
});

// Layer 7
console.log('\n\n📊 Layer 7: Advanced Analysis Matrix - ALL Remaining Cells');
console.log('--------------------------------------------------------------------------------');

const layer7Cells = [];
for (const [geokguk, techniques] of Object.entries(ADVANCED_ANALYSIS_MATRIX)) {
  for (const [technique, code] of Object.entries(techniques)) {
    const score = code.score;
    const hasAdvice = !!code.advice;
    if (!hasAdvice) {
      layer7Cells.push({
        combination: `${geokguk} × ${technique}`,
        score,
        keyword: code.keyword,
        level: code.level,
      });
    }
  }
}

layer7Cells.sort((a, b) => b.score - a.score);

console.log(`Total cells: 144`);
console.log(`With advice: ${144 - layer7Cells.length}`);
console.log(`Need advice: ${layer7Cells.length}\n`);

// Group by score
const layer7ByScore = {};
layer7Cells.forEach(cell => {
  if (!layer7ByScore[cell.score]) layer7ByScore[cell.score] = [];
  layer7ByScore[cell.score].push(cell);
});

console.log('Breakdown by score:');
Object.keys(layer7ByScore).sort((a, b) => b - a).forEach(score => {
  console.log(`  Score ${score}: ${layer7ByScore[score].length} cells`);
});

console.log('\nFirst 30 cells needing advice:');
layer7Cells.slice(0, 30).forEach((cell, i) => {
  console.log(`${(i+1).toString().padStart(2)}. ${cell.combination.padEnd(35)} Score: ${cell.score} - ${cell.keyword}`);
});

// Summary
console.log('\n\n================================================================================');
console.log('📊 Summary - Complete Remaining Work');
console.log('================================================================================');
console.log(`Layer 3: ${layer3Cells.length} cells need advice`);
console.log(`Layer 5: ${layer5Cells.length} cells need advice`);
console.log(`Layer 7: ${layer7Cells.length} cells need advice`);
console.log('');
console.log(`Total remaining: ${layer3Cells.length + layer5Cells.length + layer7Cells.length} cells`);
console.log('');
console.log('Recommended approach:');
console.log('  Phase 1 (Score 6+): ~80 cells, ~4 hours');
console.log('  Phase 2 (Score 5): ~60 cells, ~3 hours');
console.log('  Phase 3 (Score 3-4): ~72 cells, ~3 hours');
console.log('  Total: ~212 cells, ~10 hours to reach 75-90% coverage');
console.log('================================================================================');
