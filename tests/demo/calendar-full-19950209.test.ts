import { it } from 'vitest'
import { calculateSajuData } from '@/lib/Saju/saju'
import { calculateNatalChart, toChart } from '@/lib/astrology/foundation/astrologyService'
import { buildCalendarMonth, buildCalendarDay } from '@/lib/fusion/adapters'
import type { SimpleSajuPillars } from '@/lib/Saju/themes/types'
import type { NatalInput } from '@/lib/astrology/foundation/types'

it('demo full: 1995-02-09 06:40 사주+점성 모든 layer cross', async () => {
  const natalInput: NatalInput = {
    year: 1995, month: 2, date: 9,
    hour: 6, minute: 40,
    latitude: 37.5665, longitude: 126.978,
    timeZone: 'Asia/Seoul',
  }

  // 사주
  const sajuRes = calculateSajuData('1995-02-09', '06:40', 'male', 'solar', 'Asia/Seoul')
  const p = sajuRes.pillars
  const simplePillars: SimpleSajuPillars = {
    year:  { stem: p.year.heavenlyStem.name,  branch: p.year.earthlyBranch.name },
    month: { stem: p.month.heavenlyStem.name, branch: p.month.earthlyBranch.name },
    day:   { stem: p.day.heavenlyStem.name,   branch: p.day.earthlyBranch.name },
    hour:  { stem: p.time.heavenlyStem.name,  branch: p.time.earthlyBranch.name },
  }
  console.log('\n===== 사주 1995-02-09 06:40 KST =====')
  console.log(`${p.year.heavenlyStem.name}${p.year.earthlyBranch.name} / ${p.month.heavenlyStem.name}${p.month.earthlyBranch.name} / ${p.day.heavenlyStem.name}${p.day.earthlyBranch.name} / ${p.time.heavenlyStem.name}${p.time.earthlyBranch.name}`)

  // 점성 — 실제 Swiss Ephemeris
  const natalData = await calculateNatalChart(natalInput)
  const natalChart = toChart(natalData)
  console.log('\n===== 점성 natal chart =====')
  console.log('ASC:', natalChart.ascendant.formatted)
  console.log('Sun:', natalChart.planets.find(p => p.name === 'Sun')?.formatted)
  console.log('Moon:', natalChart.planets.find(p => p.name === 'Moon')?.formatted)

  const age = 31  // 2026 - 1995 = 31

  // 월별 + Solar Return + Lunar Return + 매일 Daily transit (모든 layer wire)
  console.log('\n===== 2026-05 월별 (full layers) =====')
  const month = await buildCalendarMonth(
    { saju: simplePillars, astro: natalChart, natalInput, age },
    2026, 5,
  )
  console.log(`월점수: ${(month.monthScore * 100).toFixed(0)} | tone: ${month.monthTone}`)
  console.log(`narrative: ${month.monthNarrative}`)
  console.log('TOP 5:')
  for (const d of month.highlights.bestDays) {
    console.log(`  ★ ${d.date} ${d.label} (${d.topDomain} ${(d.domainScores[d.topDomain!] ?? 0).toFixed(2)})`)
  }
  console.log('처음 7일:')
  for (const d of month.days.slice(0, 7)) {
    console.log(`  ${d.date}: tone=${d.tone.padEnd(20)} top=${d.topDomain ?? '-'}  | ${d.label}`)
  }

  // 일별 5/15
  const day = await buildCalendarDay(
    { saju: simplePillars, astro: natalChart, natalInput, age, bestDaysOfMonth: month.highlights.bestDays },
    '2026-05-15',
  )
  console.log('\n===== 2026-05-15 일별 (full layers) =====')
  for (const [k, v] of Object.entries(day.domainScores).slice(0, 6)) {
    const bar = '█'.repeat(Math.round((v as number) * 10)).padEnd(10, '░')
    console.log(`  ${k.padEnd(12)} ${bar} ${(v as number).toFixed(2)}`)
  }
  console.log('Top insights:')
  for (const i of day.topInsights.slice(0, 4)) console.log(`  • ${i}`)
  console.log('Do:', day.advice.do.slice(0, 3).join(', '))
  console.log('Avoid:', day.advice.avoid.slice(0, 3).join(', '))
}, 120000)
