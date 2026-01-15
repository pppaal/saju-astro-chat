// Analyze Layers 3, 5, 7 and identify priority cells
import { SIBSIN_HOUSE_MATRIX } from '../src/lib/destiny-matrix/data/layer3-sibsin-house.ts';
import { RELATION_ASPECT_MATRIX } from '../src/lib/destiny-matrix/data/layer5-relation-aspect.ts';
import { ADVANCED_ANALYSIS_MATRIX } from '../src/lib/destiny-matrix/data/layer7-advanced-analysis.ts';

console.log('='.repeat(80));
console.log('Layers 3, 5, 7 - Priority Analysis');
console.log('='.repeat(80));

// Layer 3: Sibsin-House (10 sibsin × 12 houses = 120 cells)
console.log('\n📊 Layer 3: Sibsin-House Matrix');
console.log('-'.repeat(80));

const layer3Cells = [];
let layer3Total = 0;
let layer3WithAdvice = 0;

Object.entries(SIBSIN_HOUSE_MATRIX).forEach(([sibsin, houses]) => {
  Object.entries(houses).forEach(([house, data]) => {
    layer3Total++;
    if (data.advice) layer3WithAdvice++;

    layer3Cells.push({
      combination: `${sibsin} × House ${house}`,
      score: data.score,
      level: data.level,
      keyword: data.keyword,
      hasAdvice: !!data.advice,
    });
  });
});

console.log(`Total cells: ${layer3Total}`);
console.log(`With advice: ${layer3WithAdvice} (${((layer3WithAdvice/layer3Total)*100).toFixed(1)}%)`);

// Sort by score and show top 30
layer3Cells.sort((a, b) => b.score - a.score);
console.log('\n⭐ Top 30 Priority Cells:');
console.log('-'.repeat(80));
layer3Cells.slice(0, 30).forEach((cell, i) => {
  const adviceIcon = cell.hasAdvice ? '✅' : '❌';
  console.log(`${(i+1).toString().padStart(2)}. ${cell.combination.padEnd(25)} Score: ${cell.score.toString().padStart(2)}  ${adviceIcon}`);
});

// Layer 5: Relation-Aspect (8 relations × 9 aspects = 72 cells)
console.log('\n\n📊 Layer 5: Relation-Aspect Matrix');
console.log('-'.repeat(80));

const layer5Cells = [];
let layer5Total = 0;
let layer5WithAdvice = 0;

Object.entries(RELATION_ASPECT_MATRIX).forEach(([relation, aspects]) => {
  Object.entries(aspects).forEach(([aspect, data]) => {
    layer5Total++;
    if (data.advice) layer5WithAdvice++;

    layer5Cells.push({
      combination: `${relation} × ${aspect}`,
      score: data.score,
      level: data.level,
      keyword: data.keyword,
      hasAdvice: !!data.advice,
    });
  });
});

console.log(`Total cells: ${layer5Total}`);
console.log(`With advice: ${layer5WithAdvice} (${((layer5WithAdvice/layer5Total)*100).toFixed(1)}%)`);

// Sort by score and show top 20
layer5Cells.sort((a, b) => b.score - a.score);
console.log('\n⭐ Top 20 Priority Cells:');
console.log('-'.repeat(80));
layer5Cells.slice(0, 20).forEach((cell, i) => {
  const adviceIcon = cell.hasAdvice ? '✅' : '❌';
  console.log(`${(i+1).toString().padStart(2)}. ${cell.combination.padEnd(30)} Score: ${cell.score.toString().padStart(2)}  ${adviceIcon}`);
});

// Layer 7: Advanced Analysis (varies)
console.log('\n\n📊 Layer 7: Advanced Analysis Matrix');
console.log('-'.repeat(80));

const layer7Cells = [];
let layer7Total = 0;
let layer7WithAdvice = 0;

Object.entries(ADVANCED_ANALYSIS_MATRIX).forEach(([key1, submatrix]) => {
  Object.entries(submatrix).forEach(([key2, data]) => {
    layer7Total++;
    if (data.advice) layer7WithAdvice++;

    layer7Cells.push({
      combination: `${key1} × ${key2}`,
      score: data.score,
      level: data.level,
      keyword: data.keyword,
      hasAdvice: !!data.advice,
    });
  });
});

console.log(`Total cells: ${layer7Total}`);
console.log(`With advice: ${layer7WithAdvice} (${((layer7WithAdvice/layer7Total)*100).toFixed(1)}%)`);

// Sort by score and show top 20
layer7Cells.sort((a, b) => b.score - a.score);
console.log('\n⭐ Top 20 Priority Cells:');
console.log('-'.repeat(80));
layer7Cells.slice(0, 20).forEach((cell, i) => {
  const adviceIcon = cell.hasAdvice ? '✅' : '❌';
  console.log(`${(i+1).toString().padStart(2)}. ${cell.combination.padEnd(35)} Score: ${cell.score.toString().padStart(2)}  ${adviceIcon}`);
});

// Summary
console.log('\n\n' + '='.repeat(80));
console.log('📊 Summary - Total Cells to Add Advice');
console.log('='.repeat(80));
console.log(`Layer 3 (Top 30): ${layer3Cells.slice(0, 30).filter(c => !c.hasAdvice).length} need advice`);
console.log(`Layer 5 (Top 20): ${layer5Cells.slice(0, 20).filter(c => !c.hasAdvice).length} need advice`);
console.log(`Layer 7 (Top 20): ${layer7Cells.slice(0, 20).filter(c => !c.hasAdvice).length} need advice`);
console.log(`\nTotal to add: ${
  layer3Cells.slice(0, 30).filter(c => !c.hasAdvice).length +
  layer5Cells.slice(0, 20).filter(c => !c.hasAdvice).length +
  layer7Cells.slice(0, 20).filter(c => !c.hasAdvice).length
} cells`);
console.log('='.repeat(80));
