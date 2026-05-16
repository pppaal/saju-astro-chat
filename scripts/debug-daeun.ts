// scripts/debug-daeun.ts
// A: 1995-02-09 06:40 남자 서울 / B: 1991-02-03 00:35 여자 서울
// daeWoon.list 전체를 print해서 순행/역행 검증.

import { calculateSajuData } from '../src/lib/saju/saju'

const cases = [
  { tag: 'A 남(양력 1995-02-09 06:40, 乙亥年 → 음년·남자 → 역행 기대)', date: '1995-02-09', time: '06:40', gender: 'male' as const },
  { tag: 'B 여(양력 1991-02-03 00:35, 辛未年 → 음년·여자 → 순행 기대)', date: '1991-02-03', time: '00:35', gender: 'female' as const },
]

for (const c of cases) {
  console.log('\n========', c.tag)
  const s = calculateSajuData(c.date, c.time, c.gender, 'solar', 'Asia/Seoul')
  console.log('일간:', s.dayMaster)
  console.log('연주:', s.pillars?.year)
  console.log('월주:', s.pillars?.month)
  console.log('daeWoon.startAge:', (s.daeWoon as any)?.startAge ?? (s.daeWoon as any)?.start)
  console.log('daeWoon.current:', s.daeWoon?.current)
  console.log('daeWoon.list:')
  for (const d of s.daeWoon?.list ?? []) {
    console.log('  age', (d as any).age, (d as any).heavenlyStem + (d as any).earthlyBranch, (d as any).sibsin)
  }
}
