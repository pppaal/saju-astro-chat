/* eslint-disable */
// Run calendar interpretation for a specific person on a specific day.
// Quick standalone preview — not part of the build.
import { calculateSajuData } from '../src/lib/saju/saju'
import { buildNatalContext } from '../src/lib/calendar-engine/context/build'
import { buildCalendar } from '../src/lib/calendar-engine'
import { buildInterpretation } from '../src/lib/calendar-engine/interpretation/matcher'

const BIRTH = {
  birthDate: '1995-02-09',
  birthTime: '06:40',
  gender: 'male' as const,
  latitude: 37.5665,
  longitude: 126.978,
  timeZone: 'Asia/Seoul',
}

// Today (per system context)
const TODAY = '2026-05-18'

async function main() {
  // 1. Compute saju
  const sajuResult = calculateSajuData(
    BIRTH.birthDate,
    BIRTH.birthTime,
    BIRTH.gender,
    'solar',
    BIRTH.timeZone,
  )

  console.log('=== 사주 ===')
  console.log('일주:', sajuResult.dayMaster?.name)
  console.log('년주:', sajuResult.yearPillar?.heavenlyStem?.name, sajuResult.yearPillar?.earthlyBranch?.name)
  console.log('월주:', sajuResult.monthPillar?.heavenlyStem?.name, sajuResult.monthPillar?.earthlyBranch?.name)
  console.log('일주:', sajuResult.dayPillar?.heavenlyStem?.name, sajuResult.dayPillar?.earthlyBranch?.name)
  console.log('시주:', sajuResult.hourPillar?.heavenlyStem?.name, sajuResult.hourPillar?.earthlyBranch?.name)
  console.log()

  // 2. Build natal context
  const natal = await buildNatalContext(BIRTH, { saju: sajuResult })

  console.log('=== Natal 컨텍스트 ===')
  console.log('일간:', natal.saju.dayMaster)
  console.log('신강/신약:', natal.saju.strength)
  console.log('용신:', natal.saju.yongsin?.primary, natal.saju.yongsin?.avoid ? `(피할: ${natal.saju.yongsin.avoid})` : '')
  console.log()

  // 3. Build calendar for today (full day, hourly granularity for richer signals)
  const dayStart = `${TODAY}T00:00:00.000Z`
  const dayEnd = `${TODAY}T23:59:59.000Z`
  const cells = await buildCalendar(natal, {
    start: dayStart,
    end: dayEnd,
    granularity: 'day',
  }, { includeEvidence: true })

  console.log('=== 활성 신호 (오늘) ===')
  if (cells.length === 0) {
    console.log('cells 없음')
    return
  }
  const cell = cells[0]
  console.log('cell.signals 수:', cell.signals.length)
  console.log()

  // 점수 ↔ 해석 동기화 검증
  console.log('=== 점수 매트릭스 (오늘) ===')
  console.log('derivedScore:', cell.derivedScore)
  console.log('themeScores:')
  for (const [theme, score] of Object.entries(cell.themeScores ?? {})) {
    console.log(`  ${theme}: ${score}`)
  }
  if (cell.topReasons?.length) {
    console.log('topReasons:')
    for (const r of cell.topReasons.slice(0, 5)) console.log(`  + ${r}`)
  }
  if (cell.cautions?.length) {
    console.log('cautions:')
    for (const c of cell.cautions.slice(0, 5)) console.log(`  - ${c}`)
  }
  console.log()

  console.log('=== 신호 polarity 분포 ===')
  const byLayer: Record<string, { pos: number; neu: number; neg: number }> = {}
  for (const s of cell.signals) {
    const k = s.layer ?? '?'
    if (!byLayer[k]) byLayer[k] = { pos: 0, neu: 0, neg: 0 }
    if (s.polarity >= 1) byLayer[k].pos++
    else if (s.polarity <= -1) byLayer[k].neg++
    else byLayer[k].neu++
  }
  for (const [k, v] of Object.entries(byLayer)) {
    console.log(`  ${k}: 우호 ${v.pos}, 중립 ${v.neu}, 주의 ${v.neg}`)
  }
  console.log()

  // 4. Build interpretation (monthly scope = 가장 풍부)
  const interp = buildInterpretation({ natal, cells, scope: 'monthly' })

  console.log('=== 해석 narrative ===')
  console.log(interp.narrative)
  console.log()

  console.log('=== 매칭된 룰 ===')
  for (const id of interp.matchedRuleIds) {
    console.log('  -', id)
  }
  console.log()

  console.log('=== 섹션별 ===')
  for (const sec of interp.sections) {
    console.log(`### ${sec.title} (${sec.section})`)
    console.log(sec.text)
    console.log()
  }
}

main().catch((e) => {
  console.error('ERROR:', e)
  process.exit(1)
})
