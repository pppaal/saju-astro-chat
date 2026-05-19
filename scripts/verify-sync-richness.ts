// 종합 검증 — 점수↔그래프↔해석 동기화, 다양한 생년월일/시/도시 풍부도.

import { calculateSajuData } from '../src/lib/saju/saju'
import { buildNatalContext } from '../src/lib/calendar-engine/context/build'
import { buildCalendar } from '../src/lib/calendar-engine'
import { buildInterpretation } from '../src/lib/calendar-engine/interpretation/matcher'

interface Profile {
  label: string
  birthDate: string
  birthTime: string
  gender: 'male' | 'female'
  latitude: number
  longitude: number
  timeZone: string
}

const PROFILES: Profile[] = [
  {
    label: 'A: 1995-02-09 06:40 서울 男',
    birthDate: '1995-02-09',
    birthTime: '06:40',
    gender: 'male',
    latitude: 37.5665,
    longitude: 126.978,
    timeZone: 'Asia/Seoul',
  },
  {
    label: 'B: 1988-07-15 14:30 부산 女',
    birthDate: '1988-07-15',
    birthTime: '14:30',
    gender: 'female',
    latitude: 35.1796,
    longitude: 129.0756,
    timeZone: 'Asia/Seoul',
  },
  {
    label: 'C: 2001-11-22 22:10 도쿄 男',
    birthDate: '2001-11-22',
    birthTime: '22:10',
    gender: 'male',
    latitude: 35.6762,
    longitude: 139.6503,
    timeZone: 'Asia/Tokyo',
  },
  {
    label: 'D: 1976-04-03 09:50 뉴욕 女',
    birthDate: '1976-04-03',
    birthTime: '09:50',
    gender: 'female',
    latitude: 40.7128,
    longitude: -74.006,
    timeZone: 'America/New_York',
  },
]

async function probe(p: Profile, date: string) {
  const saju = calculateSajuData(p.birthDate, p.birthTime, p.gender, 'solar', p.timeZone)
  const natal = await buildNatalContext(
    {
      birthDate: p.birthDate,
      birthTime: p.birthTime,
      gender: p.gender,
      latitude: p.latitude,
      longitude: p.longitude,
      timeZone: p.timeZone,
    },
    { saju }
  )
  const cells = await buildCalendar(
    natal,
    {
      start: `${date}T00:00:00.000Z`,
      end: `${date}T23:59:59.000Z`,
      granularity: 'day',
    },
    { includeEvidence: true }
  )
  const interp = buildInterpretation({ natal, cells, scope: 'monthly' })
  if (interp.themeScores) {
    for (const c of cells) c.themeScores = { ...c.themeScores, ...interp.themeScores }
  }
  return { saju, natal, cells, interp }
}

function sectionText(interp: any, sec: string): string {
  return interp.sections.find((s: any) => s.section === sec)?.text ?? ''
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('TEST 1 — 다른 생년월일/시/도시 → 다른 사주·해석 (4 profile)')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  for (const p of PROFILES) {
    const { saju, natal, cells, interp } = await probe(p, '2026-05-15')
    const seun = sectionText(interp, 'seun').slice(0, 60)
    const wolun = sectionText(interp, 'wolun').slice(0, 60)
    console.log(`\n${p.label}`)
    console.log(
      `  일주: ${saju.pillars.day.heavenlyStem.name}${saju.pillars.day.earthlyBranch.name}  /  ${(natal as any).saju.strength}  /  용신: ${(natal as any).saju.yongsin.primary}`
    )
    console.log(`  점수(2026-05-15): ${cells[0].derivedScore}`)
    console.log(
      `  themeScores: love=${interp.themeScores?.love} money=${interp.themeScores?.money} career=${interp.themeScores?.career} health=${interp.themeScores?.health} growth=${interp.themeScores?.growth}`
    )
    console.log(`  세운: ${seun}...`)
    console.log(`  월운: ${wolun}...`)
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('TEST 2 — 같은 사람, 다른 년도 (4년) → 해석 변동')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  const p = PROFILES[0]
  for (const y of [2024, 2025, 2026, 2027]) {
    const { cells, interp } = await probe(p, `${y}-05-15`)
    const seun = sectionText(interp, 'seun')
    console.log(`\n${y}: ${cells[0].derivedScore}점`)
    console.log(`  ${seun}`)
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('TEST 3 — 같은 사람, 한 달 내 변동 (점수 분포 + narrative 풍부)')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  const saju = calculateSajuData(p.birthDate, p.birthTime, p.gender, 'solar', p.timeZone)
  const natal = await buildNatalContext(
    {
      birthDate: p.birthDate,
      birthTime: p.birthTime,
      gender: p.gender,
      latitude: p.latitude,
      longitude: p.longitude,
      timeZone: p.timeZone,
    },
    { saju }
  )
  const cells = await buildCalendar(
    natal,
    {
      start: '2026-05-01T00:00:00.000Z',
      end: '2026-05-31T23:59:59.000Z',
      granularity: 'day',
    },
    { includeEvidence: true }
  )
  const dist: Record<number, number> = {}
  for (const c of cells) dist[c.derivedScore] = (dist[c.derivedScore] ?? 0) + 1
  const scores = Object.keys(dist)
    .map(Number)
    .sort((a, b) => b - a)
  console.log(
    `점수 범위: ${scores[scores.length - 1]} ~ ${scores[0]}, ${scores.length}개 unique 점수`
  )
  const top5 = scores.slice(0, 5)
  console.log(`TOP 5 점수 분포: ${top5.map((s) => `${s}(${dist[s]}일)`).join(' / ')}`)

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('TEST 4 — 점수↔그래프↔해석 동기화 (10일 샘플)')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  // UI 는 cell.themeScores (deriver 가 cell 단위로 매김) 를 직접 사용.
  const sample = cells.filter((_, i) => i % 3 === 0).slice(0, 10)
  for (const c of sample) {
    const ts = c.themeScores ?? {}
    const careerScore = ts.career ?? 50
    const tone = careerScore >= 70 ? '↑' : careerScore <= 30 ? '↓' : '·'
    console.log(
      `${c.datetime.slice(0, 10)}: derivedScore=${c.derivedScore}, career=${ts.career} love=${ts.love} money=${ts.money} health=${ts.health} growth=${ts.growth}  [career ${tone}]`
    )
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('TEST 5 — 점수↔narrative 동기화: 상·하위 5일 narrative 비교')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  const sorted = [...cells].sort((a, b) => b.derivedScore - a.derivedScore)
  console.log('\nTOP 3 일 (가장 좋은 날):')
  for (const c of sorted.slice(0, 3)) {
    const reasons = c.topReasons?.slice(0, 2).join(' | ') ?? '(없음)'
    console.log(`  ${c.datetime.slice(0, 10)} ${c.derivedScore}점 → ${reasons}`)
  }
  console.log('\nBOTTOM 3 일 (주의 날):')
  for (const c of sorted.slice(-3).reverse()) {
    const cautions = c.cautions?.slice(0, 2).join(' | ') ?? '(없음)'
    console.log(`  ${c.datetime.slice(0, 10)} ${c.derivedScore}점 → ${cautions}`)
  }
}
main().catch((e) => {
  console.error('ERROR:', e)
  process.exit(1)
})
