/**
 * 신살 분석 테스트
 * Run with: npx tsx scripts/test-shinsal.ts
 */

import { analyzeShinsal } from '../src/lib/prediction/ultraPrecisionEngine';

// 몇 가지 지지 조합 테스트
const tests = [
  { dayBranch: '子', targetBranch: '子' },
  { dayBranch: '子', targetBranch: '午' },
  { dayBranch: '子', targetBranch: '卯' },
  { dayBranch: '寅', targetBranch: '申' },
  { dayBranch: '卯', targetBranch: '酉' },
];

console.log('=== 신살 분석 테스트 ===\n');

for (const t of tests) {
  const result = analyzeShinsal(t.dayBranch, t.targetBranch);
  console.log(t.dayBranch + ' vs ' + t.targetBranch + ':');
  if (result.active.length === 0) {
    console.log('  (신살 없음)');
  } else {
    for (const s of result.active) {
      console.log('  - ' + s.name + ' (' + s.type + '): ' + s.affectedArea);
    }
  }
  console.log('');
}
