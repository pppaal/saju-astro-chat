#!/usr/bin/env node

// Analyze mid-priority cells (score 6-7) in Layers 3, 5, 7

import { SIBSIN_HOUSE_MATRIX } from '../src/lib/destiny-matrix/data/layer3-sibsin-house.ts';
import { RELATION_ASPECT_MATRIX } from '../src/lib/destiny-matrix/data/layer5-relation-aspect.ts';
import { ADVANCED_ANALYSIS_MATRIX } from '../src/lib/destiny-matrix/data/layer7-advanced-analysis.ts';

console.log('================================================================================');
console.log('Layers 3, 5, 7 - Mid-Priority Analysis (Score 6-7)');
console.log('================================================================================\n');

// Layer 3
console.log('📊 Layer 3: Sibsin-House Matrix (Score 6-7)');
console.log('--------------------------------------------------------------------------------');

const layer3Cells = [];
for (const [sibsin, houses] of Object.entries(SIBSIN_HOUSE_MATRIX)) {
  for (const [house, code] of Object.entries(houses)) {
    const score = code.score;
    const hasAdvice = !!code.advice;
    if (score >= 6 && score <= 7) {
      layer3Cells.push({
        combination: `${sibsin} × ${house}`,
        score,
        hasAdvice,
        keyword: code.keyword,
        level: code.level,
      });
    }
  }
}

layer3Cells.sort((a, b) => b.score - a.score);
const layer3Need = layer3Cells.filter(c => !c.hasAdvice);

console.log(`Total score 6-7 cells: ${layer3Cells.length}`);
console.log(`With advice: ${layer3Cells.filter(c => c.hasAdvice).length}`);
console.log(`Need advice: ${layer3Need.length}\n`);

console.log('Cells needing advice:');
layer3Need.forEach((cell, i) => {
  console.log(`${(i+1).toString().padStart(2)}. ${cell.combination.padEnd(25)} Score: ${cell.score} - ${cell.keyword}`);
});

// Layer 5
console.log('\n\n📊 Layer 5: Relation-Aspect Matrix (Score 6-7)');
console.log('--------------------------------------------------------------------------------');

const layer5Cells = [];
for (const [relation, aspects] of Object.entries(RELATION_ASPECT_MATRIX)) {
  for (const [aspect, code] of Object.entries(aspects)) {
    const score = code.score;
    const hasAdvice = !!code.advice;
    if (score >= 6 && score <= 7) {
      layer5Cells.push({
        combination: `${relation} × ${aspect}`,
        score,
        hasAdvice,
        keyword: code.keyword,
        level: code.level,
      });
    }
  }
}

layer5Cells.sort((a, b) => b.score - a.score);
const layer5Need = layer5Cells.filter(c => !c.hasAdvice);

console.log(`Total score 6-7 cells: ${layer5Cells.length}`);
console.log(`With advice: ${layer5Cells.filter(c => c.hasAdvice).length}`);
console.log(`Need advice: ${layer5Need.length}\n`);

console.log('Cells needing advice:');
layer5Need.forEach((cell, i) => {
  console.log(`${(i+1).toString().padStart(2)}. ${cell.combination.padEnd(30)} Score: ${cell.score} - ${cell.keyword}`);
});

// Layer 7
console.log('\n\n📊 Layer 7: Advanced Analysis Matrix (Score 6-7)');
console.log('--------------------------------------------------------------------------------');

const layer7Cells = [];
for (const [geokguk, techniques] of Object.entries(ADVANCED_ANALYSIS_MATRIX)) {
  for (const [technique, code] of Object.entries(techniques)) {
    const score = code.score;
    const hasAdvice = !!code.advice;
    if (score >= 6 && score <= 7) {
      layer7Cells.push({
        combination: `${geokguk} × ${technique}`,
        score,
        hasAdvice,
        keyword: code.keyword,
        level: code.level,
      });
    }
  }
}

layer7Cells.sort((a, b) => b.score - a.score);
const layer7Need = layer7Cells.filter(c => !c.hasAdvice);

console.log(`Total score 6-7 cells: ${layer7Cells.length}`);
console.log(`With advice: ${layer7Cells.filter(c => c.hasAdvice).length}`);
console.log(`Need advice: ${layer7Need.length}\n`);

console.log('Cells needing advice:');
layer7Need.forEach((cell, i) => {
  console.log(`${(i+1).toString().padStart(2)}. ${cell.combination.padEnd(35)} Score: ${cell.score} - ${cell.keyword}`);
});

// Summary
console.log('\n\n================================================================================');
console.log('📊 Summary - Mid-Priority Cells (Score 6-7)');
console.log('================================================================================');
console.log(`Layer 3: ${layer3Need.length} cells need advice`);
console.log(`Layer 5: ${layer5Need.length} cells need advice`);
console.log(`Layer 7: ${layer7Need.length} cells need advice`);
console.log('');
console.log(`Total to add: ${layer3Need.length + layer5Need.length + layer7Need.length} cells`);
console.log('================================================================================');
