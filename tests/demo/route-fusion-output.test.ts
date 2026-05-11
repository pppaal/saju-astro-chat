import { it } from 'vitest'
import { calculateSajuData } from '@/lib/Saju/saju'
import { calculateNatalChart, toChart } from '@/lib/astrology/foundation/astrologyService'
import { buildCalendarDay, buildCalendarHourly, buildCalendarMonth } from '@/lib/fusion/adapters'
import type { SimpleSajuPillars } from '@/lib/Saju/themes/types'

it('route-level fusion output: 1995-02-09 06:40 Seoul male → 2026-05-15', async () => {
  // route.ts 가 호출할 fusion 결과만 시뮬레이션 — UI 가 받을 데이터 그대로
  const sajuRes = calculateSajuData('1995-02-09', '06:40', 'male', 'solar', 'Asia/Seoul')
  const p = sajuRes.pillars
  const simplePillars: SimpleSajuPillars = {
    year:  { stem: p.year.heavenlyStem.name,  branch: p.year.earthlyBranch.name },
    month: { stem: p.month.heavenlyStem.name, branch: p.month.earthlyBranch.name },
    day:   { stem: p.day.heavenlyStem.name,   branch: p.day.earthlyBranch.name },
    hour:  { stem: p.time.heavenlyStem.name,  branch: p.time.earthlyBranch.name },
  }
  const natalInput = {
    year: 1995, month: 2, date: 9, hour: 6, minute: 40,
    latitude: 37.5665, longitude: 126.978, timeZone: 'Asia/Seoul',
  }
  const natalChart = toChart(await calculateNatalChart(natalInput))
  const age = 31
  const daeunList = sajuRes.daeWoon.list.map(d => ({ stem: d.heavenlyStem, branch: d.earthlyBranch, startAge: d.age }))

  const fusionInput = {
    saju: simplePillars, astro: natalChart, natalInput, age, birthYear: 1995, daeunList,
  }

  console.log('\n╔═══════════════════════════════════════════════════════════╗')
  console.log('║  /api/calendar/date-detail 응답 시뮬레이션                  ║')
  console.log('║  1995-02-09 06:40 KST male → 2026-05-15                   ║')
  console.log('╚═══════════════════════════════════════════════════════════╝')

  const dayRes = await buildCalendarDay(fusionInput, '2026-05-15')
  const hourlyRes = await buildCalendarHourly(fusionInput, '2026-05-15')
  const monthRes = await buildCalendarMonth(fusionInput, 2026, 5)

  // ── route.ts 에 추가한 fusion 필드와 동일 shape ──
  const fusionField = {
    overallScore: Math.round(
      (Object.values(dayRes.domainScores) as number[]).reduce((a, b) => a + b, 0)
      / Object.keys(dayRes.domainScores).length * 100,
    ),
    domainScores: Object.fromEntries(
      Object.entries(dayRes.domainScores).map(([k, v]) => [k, Math.round((v as number) * 100)]),
    ),
    advice: dayRes.advice,
    topInsights: dayRes.topInsights,
    hourly: {
      slots: hourlyRes.slots.map((s) => ({
        hour: s.hour,
        score: s.score,
        tone: s.tone,
        topDomain: s.topDomain,
        hourPillar: s.hourPillar ? `${s.hourPillar.stem}${s.hourPillar.branch}` : undefined,
        planetaryHour: s.planetaryHour,
        label: s.label,
      })),
      bestHours: hourlyRes.bestHours.map((s) => ({
        hour: s.hour, score: s.score, topDomain: s.topDomain,
        hourPillar: s.hourPillar ? `${s.hourPillar.stem}${s.hourPillar.branch}` : undefined,
        planetaryHour: s.planetaryHour,
      })),
      worstHours: hourlyRes.worstHours.map((s) => ({
        hour: s.hour, score: s.score, topDomain: s.topDomain,
        hourPillar: s.hourPillar ? `${s.hourPillar.stem}${s.hourPillar.branch}` : undefined,
        planetaryHour: s.planetaryHour,
      })),
      bestByDomain: hourlyRes.bestByDomain,
    },
  }

  console.log('\n========== Monthly 탭 (2026-05) 표시될 데이터 ==========')
  console.log(`월 평균: ${Math.round(monthRes.monthScore * 100)}점 / [${monthRes.monthGrade}]`)
  console.log(`narrative: ${monthRes.monthNarrative}`)
  console.log('\n31일 grid (각 날 score/grade — 캘린더 셀 색칠):')
  for (const d of monthRes.days) {
    const dot = d.grade === 'auspicious' ? '●' : d.grade === 'inauspicious' ? '○' : ' '
    console.log(`  ${dot} ${d.date.slice(8)}일 ${String(d.score).padStart(3)} [${d.grade}]`)
  }

  console.log('\n========== Daily 탭 (2026-05-15) 표시될 데이터 ==========')
  console.log(`overallScore: ${fusionField.overallScore}`)
  console.log(`\n18테마 도메인 점수:`)
  for (const [k, v] of Object.entries(fusionField.domainScores)) {
    const bar = '█'.repeat(Math.round(v / 5)).padEnd(20, '░')
    console.log(`  ${k.padEnd(12)} ${bar} ${v}`)
  }
  console.log('\n좋은 시간 (BEST 4):')
  for (const s of fusionField.hourly.bestHours.slice(0, 4)) {
    const ampm = s.hour < 12 ? `오전 ${s.hour || 12}시` : s.hour === 12 ? '정오 12시' : `오후 ${s.hour - 12}시`
    console.log(`  ${ampm.padEnd(10)} ${s.score}점  시주:${s.hourPillar} 행성시:${s.planetaryHour}`)
  }
  console.log('\n주의 시간 (WORST 2):')
  for (const s of fusionField.hourly.worstHours.slice(0, 2)) {
    const ampm = s.hour < 12 ? `오전 ${s.hour || 12}시` : s.hour === 12 ? '정오 12시' : `오후 ${s.hour - 12}시`
    console.log(`  ${ampm.padEnd(10)} ${s.score}점  시주:${s.hourPillar} 행성시:${s.planetaryHour}`)
  }
  console.log('\n권장 행동:')
  for (const a of fusionField.advice.do) console.log(`  • ${a}`)
  console.log('\n주의 행동:')
  for (const a of fusionField.advice.avoid) console.log(`  • ${a}`)
  console.log('\n핵심 통찰:')
  for (const i of fusionField.topInsights.slice(0, 5)) console.log(`  • ${i}`)

  console.log('\n========== Stats 탭 (주차별 크로스) ==========')
  // 5주차로 7일씩 묶어 평균 점수
  const weeks: Array<{ saju: number; astro: number }> = []
  for (let w = 0; w < 5; w++) {
    const slice = monthRes.days.slice(w * 7, (w + 1) * 7)
    if (slice.length === 0) continue
    const avgScore = slice.reduce((a, b) => a + b.score, 0) / slice.length
    // 사주/점성 분리는 cross 의 sajuScore/astroScore 평균 — 데모에선 임시
    weeks.push({ saju: Math.round(avgScore * 0.8), astro: Math.round(avgScore * 1.1) })
  }
  console.log('주차별 사주 vs 점성 점수 (라인 차트):')
  for (let i = 0; i < weeks.length; i++) {
    console.log(`  ${i + 1}주차: 사주 ${weeks[i].saju} / 점성 ${weeks[i].astro}`)
  }
  // 슈퍼 타이밍 = 사주+점성 격차 작은 주
  let bestW = 0
  let bestDiff = 999
  for (let i = 0; i < weeks.length; i++) {
    const diff = Math.abs(weeks[i].saju - weeks[i].astro)
    if (diff < bestDiff) { bestDiff = diff; bestW = i }
  }
  console.log(`\n슈퍼 타이밍: ${bestW + 1}주차 (사주·점성 가장 강하게 교차)`)
}, 60000)
