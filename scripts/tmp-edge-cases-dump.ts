// 임시: edge case 6개 실제 출력을 캡쳐해서 새 골든 테스트 fixture 로 박는다.
// 실행: npx tsx scripts/tmp-edge-cases-dump.ts
import { calculateSajuData } from '@/lib/saju/saju'

type Case = {
  label: string
  birthDate: string
  birthTime: string
  gender: 'male' | 'female'
  tz: string
}

const CASES: Case[] = [
  // C1, C2: 시간 미상 (birthTime '')
  { label: 'C1 time-unknown 1990-05-15 male', birthDate: '1990-05-15', birthTime: '', gender: 'male', tz: 'Asia/Seoul' },
  { label: 'C2 time-unknown + 입춘 경계 1985-02-04 female', birthDate: '1985-02-04', birthTime: '', gender: 'female', tz: 'Asia/Seoul' },
  // D1, D2: 윤년 2/29 출생
  { label: 'D1 leap-year 1984-02-29 male', birthDate: '1984-02-29', birthTime: '10:00', gender: 'male', tz: 'Asia/Seoul' },
  { label: 'D2 leap-year 2020-02-29 male', birthDate: '2020-02-29', birthTime: '12:00', gender: 'male', tz: 'Asia/Seoul' },
  // A1: 정확히 자정 — 일주 전환 순간
  { label: 'A1 exact-midnight 1990-01-01 00:00:00 male', birthDate: '1990-01-01', birthTime: '00:00', gender: 'male', tz: 'Asia/Seoul' },
  // A2: 자정 직전 1초 — 보통 23:59 분 기반 fixture 와 초 단위 일관성
  { label: 'A2 second-before-midnight 1990-12-31 23:59:59 male', birthDate: '1990-12-31', birthTime: '23:59:59', gender: 'male', tz: 'Asia/Seoul' },
]

for (const c of CASES) {
  const r = calculateSajuData(c.birthDate, c.birthTime, c.gender, 'solar', c.tz)
  console.log(`\n=== ${c.label} ===`)
  console.log(
    `year=${r.yearPillar.heavenlyStem.name}${r.yearPillar.earthlyBranch.name} ` +
    `month=${r.monthPillar.heavenlyStem.name}${r.monthPillar.earthlyBranch.name} ` +
    `day=${r.dayPillar.heavenlyStem.name}${r.dayPillar.earthlyBranch.name} ` +
    `time=${r.timePillar.heavenlyStem.name}${r.timePillar.earthlyBranch.name}`
  )
  console.log(`dayMaster=${r.dayPillar.heavenlyStem.name} daeunStartAge=${r.daeWoon.startAge} isForward=${r.daeWoon.isForward}`)
  console.log(`daeun first 3: ${r.daeWoon.list.slice(0, 3).map(d => `${d.age}세 ${d.heavenlyStem}${d.earthlyBranch}`).join(' / ')}`)
}
