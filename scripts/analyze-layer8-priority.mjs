// Analyze Layer 8 and identify top priority cells
import { SHINSAL_PLANET_MATRIX } from '../src/lib/destiny-matrix/data/layer8-shinsal-planet.ts';

console.log('='.repeat(80));
console.log('Layer 8 (Shinsal-Planet) - Priority Analysis');
console.log('='.repeat(80));

// Define shinsal priority (based on usage frequency in Korean Saju)
const shinsalPriority = {
  // 최고 우선순위 (Top 5 - most frequently used)
  '천을귀인': 10,
  '역마': 10,
  '도화': 10,
  '화개': 9,
  '백호': 9,

  // 높은 우선순위 (High - commonly referenced)
  '겁살': 8,
  '재살': 8,
  '망신': 8,
  '고신': 8,
  '원진': 8,

  // 중간 우선순위 (Medium - important but less frequent)
  '태극귀인': 7,
  '천덕귀인': 7,
  '월덕귀인': 7,
  '문창귀인': 7,
  '학당귀인': 7,
  '금여록': 7,
  '건록': 7,
  '제왕': 7,
  '괴강': 7,
  '양인': 7,

  // 기타 (Lower priority)
  // 나머지는 기본값 5
};

const allCells = [];
let totalCells = 0;
let cellsWithAdvice = 0;

// Analyze each shinsal-planet combination
Object.entries(SHINSAL_PLANET_MATRIX).forEach(([shinsal, planets]) => {
  const priority = shinsalPriority[shinsal] || 5;

  Object.entries(planets).forEach(([planet, data]) => {
    totalCells++;

    if (data.advice) {
      cellsWithAdvice++;
    }

    // Calculate importance score
    const importanceScore =
      priority * 10 +  // Shinsal frequency weight
      data.score;      // Interaction strength

    allCells.push({
      shinsal,
      planet,
      score: data.score,
      level: data.level,
      keyword: data.keyword,
      priority,
      importanceScore,
      hasAdvice: !!data.advice,
    });
  });
});

// Sort by importance
allCells.sort((a, b) => b.importanceScore - a.importanceScore);

console.log('\n📊 Overall Statistics:');
console.log('-'.repeat(80));
console.log(`Total cells: ${totalCells}`);
console.log(`Cells with advice: ${cellsWithAdvice} (${((cellsWithAdvice / totalCells) * 100).toFixed(1)}%)`);
console.log(`Cells without advice: ${totalCells - cellsWithAdvice}`);

// Count by shinsal priority
const priorityCounts = {};
allCells.forEach(cell => {
  const p = cell.priority;
  priorityCounts[p] = (priorityCounts[p] || 0) + 1;
});

console.log('\n🎯 Cells by Priority Level:');
console.log('-'.repeat(80));
Object.entries(priorityCounts).sort((a, b) => b[0] - a[0]).forEach(([priority, count]) => {
  const label =
    priority >= 9 ? 'Critical' :
    priority >= 8 ? 'High' :
    priority >= 7 ? 'Medium' :
    'Low';
  console.log(`Priority ${priority} (${label.padEnd(8)}): ${count.toString().padStart(3)} cells`);
});

// Top 50 cells
console.log('\n⭐ Top 50 Priority Cells (For Immediate Advice Addition):');
console.log('-'.repeat(80));
console.log('Rank  Shinsal          Planet    Score  Level     Priority  Has Advice');
console.log('-'.repeat(80));

allCells.slice(0, 50).forEach((cell, i) => {
  const rank = (i + 1).toString().padStart(2);
  const shinsal = cell.shinsal.padEnd(16);
  const planet = cell.planet.padEnd(9);
  const score = cell.score.toString().padStart(2);
  const level = cell.level.padEnd(9);
  const priority = cell.priority.toString().padStart(2);
  const adviceIcon = cell.hasAdvice ? '✅' : '❌';

  console.log(`${rank}.  ${shinsal} ${planet} ${score}     ${level} ${priority}        ${adviceIcon}`);
});

// Group top 50 by shinsal
console.log('\n📋 Top 50 Grouped by Shinsal:');
console.log('-'.repeat(80));
const top50ByShinsal = {};
allCells.slice(0, 50).forEach(cell => {
  if (!top50ByShinsal[cell.shinsal]) {
    top50ByShinsal[cell.shinsal] = [];
  }
  top50ByShinsal[cell.shinsal].push(cell);
});

Object.entries(top50ByShinsal)
  .sort((a, b) => b[1].length - a[1].length)
  .forEach(([shinsal, cells]) => {
    console.log(`\n${shinsal} (${cells.length} cells):`);
    cells.forEach(cell => {
      const adviceIcon = cell.hasAdvice ? '✅' : '❌';
      console.log(`  ${cell.planet.padEnd(10)} Score: ${cell.score.toString().padStart(2)}  ${cell.keyword.padEnd(12)} ${adviceIcon}`);
    });
  });

// Score distribution of top 50
const top50Scores = {};
allCells.slice(0, 50).forEach(cell => {
  const scoreRange =
    cell.score >= 9 ? '9-10 (extreme)' :
    cell.score >= 7 ? '7-8 (amplify)' :
    cell.score >= 5 ? '5-6 (balance)' :
    cell.score >= 3 ? '3-4 (clash)' :
    '1-2 (conflict)';
  top50Scores[scoreRange] = (top50Scores[scoreRange] || 0) + 1;
});

console.log('\n📊 Score Distribution (Top 50):');
console.log('-'.repeat(80));
Object.entries(top50Scores).forEach(([range, count]) => {
  const percentage = ((count / 50) * 100).toFixed(1);
  const bar = '█'.repeat(Math.round(percentage / 2));
  console.log(`${range.padEnd(20)} ${count.toString().padStart(2)} cells (${percentage.padStart(5)}%) ${bar}`);
});

console.log('\n' + '='.repeat(80));
console.log('✅ Analysis complete - Ready to add advice to top 50 cells!');
console.log('='.repeat(80));
