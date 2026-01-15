// Analyze Layer 1 current state before improvements
import { ELEMENT_CORE_GRID } from '../src/lib/destiny-matrix/data/layer1-element-core.ts';

console.log('='.repeat(70));
console.log('Layer 1 (Element Core) - Current State Analysis');
console.log('='.repeat(70));

const scoreRanges = {
  '1-2 (conflict)': 0,
  '3-4 (clash)': 0,
  '5-6 (balance)': 0,
  '7-8 (amplify)': 0,
  '9-10 (extreme)': 0,
};

let totalCells = 0;
let cellsWithAdvice = 0;
const allCells = [];

// Analyze each element combination
Object.entries(ELEMENT_CORE_GRID).forEach(([element, westernElements]) => {
  Object.entries(westernElements).forEach(([westElem, data]) => {
    totalCells++;

    // Count score ranges
    const score = data.score;
    if (score >= 1 && score <= 2) scoreRanges['1-2 (conflict)']++;
    else if (score >= 3 && score <= 4) scoreRanges['3-4 (clash)']++;
    else if (score >= 5 && score <= 6) scoreRanges['5-6 (balance)']++;
    else if (score >= 7 && score <= 8) scoreRanges['7-8 (amplify)']++;
    else if (score >= 9 && score <= 10) scoreRanges['9-10 (extreme)']++;

    // Count advice coverage
    if (data.advice) {
      cellsWithAdvice++;
    }

    allCells.push({
      combination: `${element} × ${westElem}`,
      score: score,
      level: data.level,
      keyword: data.keyword,
      hasAdvice: !!data.advice
    });
  });
});

// Print score distribution
console.log('\n📊 Score Distribution:');
console.log('-'.repeat(70));
Object.entries(scoreRanges).forEach(([range, count]) => {
  const percentage = ((count / totalCells) * 100).toFixed(1);
  const bar = '█'.repeat(Math.round(percentage / 2));
  console.log(`${range.padEnd(20)} ${count.toString().padStart(2)} cells (${percentage.padStart(5)}%) ${bar}`);
});

console.log('\n📈 Comparison to Target:');
console.log('-'.repeat(70));
console.log('Range          | Target | Current | Status');
console.log('-'.repeat(70));
const targets = {
  '1-2 (conflict)': 10,
  '3-4 (clash)': 20,
  '5-6 (balance)': 40,
  '7-8 (amplify)': 20,
  '9-10 (extreme)': 10,
};

Object.entries(targets).forEach(([range, target]) => {
  const current = ((scoreRanges[range] / totalCells) * 100).toFixed(1);
  const diff = parseFloat(current) - target;
  const status = Math.abs(diff) < 5 ? '✅' : diff > 0 ? '⚠️ High' : '⚠️ Low';
  console.log(`${range.padEnd(14)} | ${target.toString().padStart(4)}%  | ${current.padStart(5)}% | ${status}`);
});

// Print advice coverage
console.log('\n💬 Advice Coverage:');
console.log('-'.repeat(70));
const adviceCoverage = ((cellsWithAdvice / totalCells) * 100).toFixed(1);
console.log(`Total cells: ${totalCells}`);
console.log(`Cells with advice: ${cellsWithAdvice} (${adviceCoverage}%)`);
console.log(`Cells without advice: ${totalCells - cellsWithAdvice}`);

// Show all cells sorted by score
console.log('\n📋 All Cells (Sorted by Score):');
console.log('-'.repeat(70));
allCells.sort((a, b) => b.score - a.score);
allCells.forEach((cell, i) => {
  const adviceIcon = cell.hasAdvice ? '✅' : '❌';
  console.log(`${(i + 1).toString().padStart(2)}. ${cell.combination.padEnd(12)} Score: ${cell.score.toString().padStart(2)} [${cell.level.padEnd(8)}] ${cell.keyword.padEnd(8)} ${adviceIcon}`);
});

console.log('\n' + '='.repeat(70));
console.log('Ready for improvements!');
console.log('='.repeat(70));
