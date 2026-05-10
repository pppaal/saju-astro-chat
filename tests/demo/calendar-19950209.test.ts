import { it } from 'vitest'
import { calculateSajuData } from '@/lib/Saju/saju'
import { buildCalendarMonth, buildCalendarDay } from '@/lib/fusion/adapters'
import type { Chart } from '@/lib/astrology/foundation/types'
import type { SimpleSajuPillars } from '@/lib/Saju/themes/types'

it('demo: 1995-02-09 06:40 calendar 출력', () => {
  const result = calculateSajuData('1995-02-09', '06:40', 'male', 'solar', 'Asia/Seoul')
  const p = result.pillars

  console.log('\n===== 사주 1995-02-09 06:40 (KST) =====')
  console.log('년주:', p.year.heavenlyStem.name + p.year.earthlyBranch.name)
  console.log('월주:', p.month.heavenlyStem.name + p.month.earthlyBranch.name)
  console.log('일주:', p.day.heavenlyStem.name + p.day.earthlyBranch.name)
  console.log('시주:', p.time.heavenlyStem.name + p.time.earthlyBranch.name)

  const simplePillars: SimpleSajuPillars = {
    year:  { stem: p.year.heavenlyStem.name,  branch: p.year.earthlyBranch.name },
    month: { stem: p.month.heavenlyStem.name, branch: p.month.earthlyBranch.name },
    day:   { stem: p.day.heavenlyStem.name,   branch: p.day.earthlyBranch.name },
    hour:  { stem: p.time.heavenlyStem.name,  branch: p.time.earthlyBranch.name },
  }

  // 점성 mock chart (Swiss Ephemeris 호출 부담 줄임)
  const chart: Chart = {
    ascendant: { name: 'Ascendant', longitude: 330, sign: 'Pisces', degree: 0, minute: 0, formatted: 'Pisces 0', house: 1 },
    mc:        { name: 'MC',        longitude: 240, sign: 'Sagittarius', degree: 0, minute: 0, formatted: 'Sag 0', house: 10 },
    houses: Array.from({ length: 12 }, (_, i) => ({
      index: i + 1, cusp: (330 + i * 30) % 360, sign: 'Pisces', formatted: '',
    })) as never,
    planets: [
      { name: 'Sun',     longitude: 320, sign: 'Aquarius',    degree: 20, minute: 0, formatted: '', house: 12 },
      { name: 'Moon',    longitude: 50,  sign: 'Taurus',      degree: 20, minute: 0, formatted: '', house: 3 },
      { name: 'Mercury', longitude: 305, sign: 'Aquarius',    degree: 5,  minute: 0, formatted: '', house: 12 },
      { name: 'Venus',   longitude: 280, sign: 'Capricorn',   degree: 10, minute: 0, formatted: '', house: 11 },
      { name: 'Mars',    longitude: 75,  sign: 'Gemini',      degree: 15, minute: 0, formatted: '', house: 4 },
      { name: 'Jupiter', longitude: 240, sign: 'Sagittarius', degree: 0,  minute: 0, formatted: '', house: 10 },
      { name: 'Saturn',  longitude: 335, sign: 'Pisces',      degree: 5,  minute: 0, formatted: '', house: 1 },
    ],
  }

  // 월별
  const month = buildCalendarMonth({ saju: simplePillars, astro: chart }, 2026, 5)
  console.log('\n===== 2026-05 월별 =====')
  console.log(`월점수: ${(month.monthScore * 100).toFixed(0)} | tone: ${month.monthTone}`)
  console.log(`월narrative: ${month.monthNarrative}`)
  console.log('월별 도메인 점수:')
  for (const [k, v] of Object.entries(month.monthlyDomains)) {
    console.log(`  ${k.padEnd(12)} ${(v as number).toFixed(2)}`)
  }
  console.log('TOP 5:')
  for (const d of month.highlights.bestDays) {
    console.log(`  ★ ${d.date} ${d.label} (${d.topDomain} ${(d.domainScores[d.topDomain!] ?? 0).toFixed(2)})`)
  }
  console.log('처음 7일:')
  for (const d of month.days.slice(0, 7)) {
    console.log(`  ${d.date}: tone=${d.tone.padEnd(20)} top=${d.topDomain ?? '-'}  | ${d.label}`)
  }

  // 일별
  const day = buildCalendarDay(
    { saju: simplePillars, astro: chart, bestDaysOfMonth: month.highlights.bestDays },
    '2026-05-15',
  )
  console.log('\n===== 2026-05-15 일별 =====')
  console.log('도메인 점수 (0~1):')
  for (const [k, v] of Object.entries(day.domainScores)) {
    const bar = '█'.repeat(Math.round((v as number) * 10)).padEnd(10, '░')
    console.log(`  ${k.padEnd(12)} ${bar} ${(v as number).toFixed(2)}`)
  }
  console.log('핵심 통찰:')
  for (const i of day.topInsights) console.log(`  • ${i}`)
  console.log('Do:', day.advice.do.join(', '))
  console.log('Avoid:', day.advice.avoid.join(', '))
  console.log('이 달 TOP 3:')
  for (const b of day.bestDaysOfMonth ?? []) {
    console.log(`  ★ ${b.date} ${b.label} (${b.score.toFixed(2)})`)
  }
})
