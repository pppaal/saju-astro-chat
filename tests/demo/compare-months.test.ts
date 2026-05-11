import { it } from 'vitest'
import { calculateSajuData } from '@/lib/Saju/saju'
import { calculateNatalChart, toChart } from '@/lib/astrology/foundation/astrologyService'
import { buildCalendarMonth } from '@/lib/fusion/adapters'
import type { SimpleSajuPillars } from '@/lib/Saju/themes/types'

it('월별 비교 (좋은 달 vs 흉한 달): 1995-02-09 06:40 남자', async () => {
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
  const daeunList = sajuRes.daeWoon.list.map(d => ({
    stem: d.heavenlyStem, branch: d.earthlyBranch, startAge: d.age,
  }))
  const fusionInput = { saju: simplePillars, astro: natalChart, natalInput, age: 31, birthYear: 1995, daeunList }

  // 다른 4달 비교
  const months = [5, 8, 10, 12]
  for (const m of months) {
    const cm = await buildCalendarMonth(fusionInput, 2026, m)

    console.log(`\n══════════ 2026-${String(m).padStart(2, '0')} ══════════`)
    console.log(`평균: ${Math.round(cm.monthScore * 100)}점`)
    const minD = cm.days.reduce((a, b) => a.score < b.score ? a : b)
    const maxD = cm.days.reduce((a, b) => a.score > b.score ? a : b)
    console.log(`최저: ${minD.score}점 (${minD.date.slice(8)}일)  최고: ${maxD.score}점 (${maxD.date.slice(8)}일)`)

    const ranges = [
      { label: '★ 길일 70+',     min: 70, max: 100 },
      { label: '○ 좋음 58~69',   min: 58, max: 69 },
      { label: '・ 보통 42~57',  min: 42, max: 57 },
      { label: '⚠ 조심 30~41',   min: 30, max: 41 },
      { label: '✖ 흉일  ~29',    min: 0,  max: 29 },
    ]
    for (const r of ranges) {
      const count = cm.days.filter(d => d.score >= r.min && d.score <= r.max).length
      if (count === 0) continue
      const bar = '█'.repeat(count).padEnd(15, ' ')
      console.log(`  ${r.label.padEnd(15)} ${bar} ${count}일`)
    }
    // signalSummary 분포
    const sig: Record<string, number> = {}
    for (const d of cm.days) sig[d.signalSummary] = (sig[d.signalSummary] ?? 0) + 1
    console.log('  사람말:')
    for (const [k, v] of Object.entries(sig).sort((a, b) => b[1] - a[1])) {
      console.log(`    ${k}  ${v}일`)
    }
  }
}, 90000)
