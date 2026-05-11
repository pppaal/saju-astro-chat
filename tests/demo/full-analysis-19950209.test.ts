import { it } from 'vitest'
import { calculateSajuData } from '@/lib/Saju/saju'
import { calculateNatalChart, toChart } from '@/lib/astrology/foundation/astrologyService'
import {
  buildCalendarYear,
  buildCalendarMonth,
  buildCalendarDay,
  buildCalendarHourly,
} from '@/lib/fusion/adapters'
import type { SimpleSajuPillars } from '@/lib/Saju/themes/types'
import type { NatalInput } from '@/lib/astrology/foundation/types'

it('full demo: 1995-02-09 06:40 KST — 년/달/일/시 분석', async () => {
  const natalInput: NatalInput = {
    year: 1995, month: 2, date: 9, hour: 6, minute: 40,
    latitude: 37.5665, longitude: 126.978, timeZone: 'Asia/Seoul',
  }

  const sajuRes = calculateSajuData('1995-02-09', '06:40', 'male', 'solar', 'Asia/Seoul')
  const p = sajuRes.pillars
  const simplePillars: SimpleSajuPillars = {
    year:  { stem: p.year.heavenlyStem.name,  branch: p.year.earthlyBranch.name },
    month: { stem: p.month.heavenlyStem.name, branch: p.month.earthlyBranch.name },
    day:   { stem: p.day.heavenlyStem.name,   branch: p.day.earthlyBranch.name },
    hour:  { stem: p.time.heavenlyStem.name,  branch: p.time.earthlyBranch.name },
  }
  const natal = toChart(await calculateNatalChart(natalInput))
  const age = 31  // 2026

  console.log('\n╔════════════════════════════════════════════════════════════╗')
  console.log('║  1995-02-09 06:40 KST — fusion 전체 분석                   ║')
  console.log('║  사주: ' + `${p.year.heavenlyStem.name}${p.year.earthlyBranch.name}/${p.month.heavenlyStem.name}${p.month.earthlyBranch.name}/${p.day.heavenlyStem.name}${p.day.earthlyBranch.name}/${p.time.heavenlyStem.name}${p.time.earthlyBranch.name}`.padEnd(50) + '║')
  console.log('╚════════════════════════════════════════════════════════════╝')

  const input = { saju: simplePillars, astro: natal, age, birthYear: 1995 }

  // ──────────────────────────────────────────────────────────
  // 1) 년 (2026)
  // ──────────────────────────────────────────────────────────
  console.log('\n════════════════════════════════════════════════════════════')
  console.log('  [년] 2026년')
  console.log('════════════════════════════════════════════════════════════')
  const yearRes = await buildCalendarYear(input, 2026)
  console.log(`년점수: ${yearRes.yearScore}점 | tone: ${yearRes.yearTone} | grade: ${yearRes.yearGrade}`)
  console.log(`narrative: ${yearRes.yearNarrative}`)
  console.log('\n18테마 연 평균:')
  for (const [k, v] of Object.entries(yearRes.yearlyDomains)) {
    const bar = '█'.repeat(Math.round((v as number) / 5)).padEnd(20, '░')
    console.log(`  ${k.padEnd(12)} ${bar} ${v}`)
  }
  console.log('\n월별 점수:')
  for (const m of yearRes.months) {
    const bar = '█'.repeat(Math.round(m.score / 5)).padEnd(20, '░')
    console.log(`  ${String(m.month).padStart(2)}월  ${bar} ${m.score}점 [${m.grade}] ${m.label}`)
  }
  console.log(`\n★ 좋은 달: ${yearRes.bestMonths.map(m => `${m.month}월(${m.score})`).join(', ')}`)
  console.log(`⚠ 주의 달: ${yearRes.cautionMonths.map(m => `${m.month}월(${m.score})`).join(', ')}`)
  console.log(`Do:    ${yearRes.advice.do.join(', ')}`)
  console.log(`Avoid: ${yearRes.advice.avoid.join(', ')}`)

  // ──────────────────────────────────────────────────────────
  // 2) 달 (2026-05)
  // ──────────────────────────────────────────────────────────
  console.log('\n════════════════════════════════════════════════════════════')
  console.log('  [달] 2026-05')
  console.log('════════════════════════════════════════════════════════════')
  const monthRes = await buildCalendarMonth(input, 2026, 5)
  console.log(`월점수: ${Math.round(monthRes.monthScore * 100)}점 | tone: ${monthRes.monthTone} | grade: ${monthRes.monthGrade}`)
  console.log(`narrative: ${monthRes.monthNarrative}`)
  console.log('\n6 핵심 테마 월 평균:')
  for (const [k, v] of Object.entries(monthRes.monthlyDomains)) {
    const bar = '█'.repeat(Math.round((v as number) * 20)).padEnd(20, '░')
    console.log(`  ${k.padEnd(12)} ${bar} ${(v as number * 100).toFixed(0)}`)
  }
  console.log('\n31일 grid:')
  for (const d of monthRes.days) {
    const star = d.grade === 'auspicious' ? '★' : d.grade === 'inauspicious' ? '⚠' : ' '
    console.log(`  ${star} ${d.date.slice(8)}일 ${String(d.score).padStart(3)}점 [${d.grade.padEnd(13)}] ${d.label}`)
  }
  console.log(`\n★ 좋은 날 TOP 5:`)
  for (const d of monthRes.highlights.bestDays) {
    console.log(`   ${d.date} ${d.score}점 — ${d.label}`)
  }
  console.log(`⚠ 주의 날:`)
  for (const d of monthRes.highlights.cautionDays.slice(0, 5)) {
    console.log(`   ${d.date} ${d.score}점 — ${d.label}`)
  }
  console.log(`Do:    ${monthRes.advice.do.join(', ')}`)
  console.log(`Avoid: ${monthRes.advice.avoid.join(', ')}`)

  // ──────────────────────────────────────────────────────────
  // 3) 일 (2026-05-15)
  // ──────────────────────────────────────────────────────────
  console.log('\n════════════════════════════════════════════════════════════')
  console.log('  [일] 2026-05-15')
  console.log('════════════════════════════════════════════════════════════')
  const dayRes = await buildCalendarDay(
    { ...input, bestDaysOfMonth: monthRes.highlights.bestDays },
    '2026-05-15',
  )
  console.log(`일진: ${dayRes.iljin ?? '-'} | 천을귀인: ${dayRes.isCheoneulGwiin ? '✓' : '-'}`)
  console.log('\n18테마 점수:')
  for (const [k, v] of Object.entries(dayRes.domainScores)) {
    const bar = '█'.repeat(Math.round((v as number) * 20)).padEnd(20, '░')
    console.log(`  ${k.padEnd(12)} ${bar} ${(v as number * 100).toFixed(0)}`)
  }
  console.log('\n핵심 통찰:')
  for (const i of dayRes.topInsights.slice(0, 7)) console.log(`  • ${i}`)
  console.log(`\nDo:    ${dayRes.advice.do.join(', ')}`)
  console.log(`Avoid: ${dayRes.advice.avoid.join(', ')}`)

  // ──────────────────────────────────────────────────────────
  // 4) 시 (2026-05-15 24시간)
  // ──────────────────────────────────────────────────────────
  console.log('\n════════════════════════════════════════════════════════════')
  console.log('  [시] 2026-05-15 24슬롯')
  console.log('════════════════════════════════════════════════════════════')
  const hourlyRes = await buildCalendarHourly(input, '2026-05-15')
  for (const s of hourlyRes.slots) {
    const bar = '█'.repeat(Math.round(s.score / 5)).padEnd(20, '░')
    const star = s.tone === 'strong-positive' ? '★' : s.tone === 'strong-negative' ? '⚠' : ' '
    const sj = s.hourPillar ? `${s.hourPillar.stem}${s.hourPillar.branch}` : '----'
    const ph = (s.planetaryHour ?? '---').padEnd(7)
    console.log(`  ${star} ${String(s.hour).padStart(2)}시 시주:${sj} 행성시:${ph} ${bar} ${String(s.score).padStart(3)} ${s.label}`)
  }
  console.log('\n★ 좋은 시간 TOP 5:')
  for (const s of hourlyRes.bestHours) {
    console.log(`   ${String(s.hour).padStart(2)}시 ${s.score}점 — ${s.topDomain ?? '-'}`)
  }
  console.log('⚠ 피할 시간:')
  for (const s of hourlyRes.worstHours) {
    console.log(`   ${String(s.hour).padStart(2)}시 ${s.score}점`)
  }
  console.log('\n테마별 최적 시간:')
  for (const [theme, info] of Object.entries(hourlyRes.bestByDomain)) {
    if (info) console.log(`  ${theme.padEnd(12)} → ${String(info.hour).padStart(2)}시 (${info.score}점)`)
  }
}, 300000)
