import { it } from 'vitest'
import { calculateSajuData } from '@/lib/Saju/saju'
import { calculateNatalChart, toChart } from '@/lib/astrology/foundation/astrologyService'
import { buildCalendarMonth } from '@/lib/fusion/adapters'
import type { SimpleSajuPillars } from '@/lib/Saju/themes/types'

it('사람말 + 점수 분포: 1995-02-09 06:40 남자 / 2026-05', async () => {
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
  const daeunList = sajuRes.daeWoon.list.map((d) => ({
    stem: d.heavenlyStem, branch: d.earthlyBranch, startAge: d.age,
  }))
  const fusionInput = { saju: simplePillars, astro: natalChart, natalInput, age: 31, birthYear: 1995, daeunList }

  const monthRes = await buildCalendarMonth(fusionInput, 2026, 5)

  console.log('\n╔══════════════════════════════════════════════════════════╗')
  console.log('║  2026년 5월 — 1995-02-09 06:40 남자                       ║')
  console.log('╚══════════════════════════════════════════════════════════╝\n')

  console.log('이번 달 평균 점수: ' + Math.round(monthRes.monthScore * 100) + '점\n')

  // 31일 — 사람말 신호 + 점수
  console.log('━━━━━━━━━━━━━ 31일 사람말 신호 ━━━━━━━━━━━━━')
  for (const d of monthRes.days) {
    const day = d.date.slice(8)
    console.log(`  ${day}일  ${String(d.score).padStart(3)}점   ${d.signalSummary}`)
  }

  // 분포 — signalSummary 별 카운트
  console.log('\n━━━━━━━━━━━━━ 사람말 분포 (31일) ━━━━━━━━━━━━━')
  const buckets: Record<string, number> = {}
  for (const d of monthRes.days) {
    buckets[d.signalSummary] = (buckets[d.signalSummary] ?? 0) + 1
  }
  for (const [k, v] of Object.entries(buckets).sort((a, b) => b[1] - a[1])) {
    const pct = Math.round((v / monthRes.days.length) * 100)
    const bar = '█'.repeat(v).padEnd(15, ' ')
    console.log(`  ${k.padEnd(40)} ${bar} ${v}일 (${pct}%)`)
  }

  // 점수 분포
  console.log('\n━━━━━━━━━━━━━ 점수 분포 (31일) ━━━━━━━━━━━━━')
  const ranges = [
    { label: '★ 길일 (70+)',     min: 70, max: 100 },
    { label: '○ 좋음 (58~69)',   min: 58, max: 69 },
    { label: '・ 보통 (42~57)',   min: 42, max: 57 },
    { label: '⚠ 조심 (30~41)',   min: 30, max: 41 },
    { label: '✖ 흉일 (0~29)',    min: 0,  max: 29 },
  ]
  for (const r of ranges) {
    const count = monthRes.days.filter(d => d.score >= r.min && d.score <= r.max).length
    const bar = '█'.repeat(count).padEnd(15, ' ')
    console.log(`  ${r.label.padEnd(20)} ${bar} ${count}일`)
  }

  // 4 핵심 테마
  console.log('\n━━━━━━━━━━━━━ 보여줄 4개 테마 ━━━━━━━━━━━━━')
  const themes = [
    { key: 'love',   label: '관계·연애' },
    { key: 'money',  label: '재물' },
    { key: 'career', label: '직업' },
    { key: 'health', label: '건강' },
  ]
  for (const t of themes) {
    const v = Math.round((monthRes.monthlyDomains[t.key as 'love'] ?? 0) * 100)
    const bar = '█'.repeat(Math.round(v / 5)).padEnd(20, '░')
    console.log(`  ${t.label.padEnd(8)} ${bar} ${v}`)
  }

  console.log('\n━━━━━━━━━━━━━ 월간 종합 분석 리포트 ━━━━━━━━━━━━━')
  for (const line of monthRes.monthNarrative.split('. ')) {
    if (line.trim()) console.log(`  ${line}${line.endsWith('.') ? '' : '.'}`)
  }
}, 60000)
