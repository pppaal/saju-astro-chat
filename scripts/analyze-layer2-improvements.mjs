// Analyze Layer 2 score distribution and advice coverage after improvements
import { SIBSIN_PLANET_MATRIX } from '../src/lib/destiny-matrix/data/layer2-sibsin-planet.ts';

console.log('='.repeat(70));
console.log('Layer 2 (Sibsin-Planet) Analysis After Improvements');
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
const adviceExamples = [];

// Analyze each sibsin
Object.entries(SIBSIN_PLANET_MATRIX).forEach(([sibsin, planets]) => {
  Object.entries(planets).forEach(([planet, data]) => {
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
      if (adviceExamples.length < 5) {
        adviceExamples.push({
          combination: `${sibsin} × ${planet}`,
          score: score,
          keyword: data.keyword,
          advice: data.advice
        });
      }
    }
  });
});

// Print score distribution
console.log('\n📊 Score Distribution:');
console.log('-'.repeat(70));
Object.entries(scoreRanges).forEach(([range, count]) => {
  const percentage = ((count / totalCells) * 100).toFixed(1);
  const bar = '█'.repeat(Math.round(percentage / 2));
  console.log(`${range.padEnd(20)} ${count.toString().padStart(3)} cells (${percentage.padStart(5)}%) ${bar}`);
});

console.log('\n📈 Target vs Current:');
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

console.log('\n📝 Advice Examples:');
console.log('-'.repeat(70));
adviceExamples.forEach((example, i) => {
  console.log(`\n${i + 1}. ${example.combination} [Score: ${example.score}]`);
  console.log(`   Keyword: ${example.keyword}`);
  console.log(`   Advice: ${example.advice.substring(0, 60)}...`);
});

// Key changes summary
console.log('\n🔄 Key Score Adjustments Made:');
console.log('-'.repeat(70));
const adjustments = [
  { cell: '비견 × Mars', old: 4, new: 5, reason: '건강한 경쟁심' },
  { cell: '비견 × Jupiter', old: 8, new: 6, reason: '과도한 자만 방지' },
  { cell: '비견 × Saturn', old: 4, new: 5, reason: '제약 속 성숙' },
  { cell: '식신 × Sun', old: 8, new: 7, reason: '과도한 자기 과시 방지' },
  { cell: '식신 × Moon', old: 8, new: 7, reason: '감성 표현 균형' },
  { cell: '식신 × Mercury', old: 8, new: 6, reason: '창작 활동 중립화' },
  { cell: '상관 × Mercury', old: 5, new: 5, reason: '날카로운 통찰' },
  { cell: '상관 × Uranus', old: 5, new: 7, reason: '혁신적 파괴' },
  { cell: '편재 × Uranus', old: 7, new: 6, reason: '투자 리스크 완화' },
  { cell: '편재 × Pluto', old: 7, new: 6, reason: '재물 집착 완화' },
  { cell: '정재 × Moon', old: 8, new: 7, reason: '가정 안정 균형' },
  { cell: '정관 × Sun', old: 8, new: 7, reason: '명예 균형' },
  { cell: '편인 × Moon', old: 8, new: 7, reason: '직관 현실화' },
  { cell: '정인 × Mercury', old: 8, new: 7, reason: '교육 균형' },
];

adjustments.forEach((adj, i) => {
  console.log(`${(i + 1).toString().padStart(2)}. ${adj.cell.padEnd(20)} ${adj.old} → ${adj.new}  (${adj.reason})`);
});

console.log('\n' + '='.repeat(70));
console.log('✅ Layer 2 improvements completed!');
console.log('='.repeat(70));
