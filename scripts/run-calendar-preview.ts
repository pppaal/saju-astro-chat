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

  // 3. Build calendar for the whole month (1 year ideally but month for speed)
  const monthStart = `${TODAY.slice(0, 7)}-01T00:00:00.000Z`
  const monthEnd = `${TODAY.slice(0, 7)}-31T23:59:59.000Z`
  const cells = await buildCalendar(natal, {
    start: monthStart,
    end: monthEnd,
    granularity: 'day',
  }, { includeEvidence: true })

  console.log('=== 한 달 cells ===')
  console.log(`총 ${cells.length}일`)
  if (cells.length === 0) {
    console.log('cells 없음')
    return
  }

  // 좋은 날 TOP / 주의 날 TOP
  const ranked = [...cells].sort((a, b) => b.derivedScore - a.derivedScore)
  console.log()
  console.log('=== 🌟 좋은 날 TOP 5 ===')
  for (const c of ranked.slice(0, 5)) {
    const date = c.datetime.slice(0, 10)
    const top = c.topReasons?.slice(0, 2).join(' · ') ?? ''
    console.log(`  ${date}  ${c.derivedScore}점  ${top}`)
  }
  console.log()
  console.log('=== ⚠️ 주의 날 TOP 5 ===')
  for (const c of ranked.slice(-5).reverse()) {
    const date = c.datetime.slice(0, 10)
    const cau = c.cautions?.slice(0, 2).join(' · ') ?? ''
    console.log(`  ${date}  ${c.derivedScore}점  ${cau}`)
  }
  console.log()

  // 도메인별 좋은 날 (themeScores 기준 — interp.themeScores로 overwrite 후 비교용)
  // 일단 오늘 cell만 자세히 보고
  const today = cells.find((c) => c.datetime.slice(0, 10) === TODAY) ?? cells[0]
  const cell = today
  console.log('=== 오늘 (' + cell.datetime.slice(0, 10) + ') 활성 신호 ===')
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

  // API와 동일한 흐름: interp.themeScores를 cell에 overwrite해서
  // 그래프(love/wealth/health 바)가 narrative와 같은 점수 모델 사용.
  if (interp.themeScores) {
    for (const c of cells) {
      c.themeScores = { ...c.themeScores, ...interp.themeScores }
    }
  }

  console.log('=== 점수 매트릭스 (해석 동기화) ===')
  console.log('interp.themeScores (narrative 톤 + 신호 평균 base):')
  for (const [theme, score] of Object.entries(interp.themeScores ?? {})) {
    console.log(`  ${theme}: ${score}`)
  }
  console.log()
  console.log('cell.themeScores (overwrite 후 — 그래프 바가 사용):')
  for (const [theme, score] of Object.entries(cells[0].themeScores ?? {})) {
    console.log(`  ${theme}: ${score}`)
  }
  console.log()

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
