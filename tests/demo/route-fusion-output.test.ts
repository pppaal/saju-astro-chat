import { it } from 'vitest'
import { calculateSajuData } from '@/lib/Saju/saju'
import { calculateNatalChart, toChart } from '@/lib/astrology/foundation/astrologyService'
import { buildCalendarDay, buildCalendarHourly, buildCalendarMonth } from '@/lib/fusion/adapters'
import type { SimpleSajuPillars } from '@/lib/Saju/themes/types'

it('UI 시뮬: 1995-02-09 06:40 Seoul male → 2026-05', async () => {
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
  const daeunList = sajuRes.daeWoon.list.map(d => ({
    stem: d.heavenlyStem, branch: d.earthlyBranch, startAge: d.age,
  }))
  const fusionInput = { saju: simplePillars, astro: natalChart, natalInput, age, birthYear: 1995, daeunList }

  // ─── 4 핵심 테마만 노출 ───
  const SHOW_THEMES = ['love', 'money', 'career', 'health'] as const
  const SHOW_LABEL: Record<string, string> = {
    love: '관계·연애', money: '재물', career: '직업', health: '건강',
  }

  const monthRes = await buildCalendarMonth(fusionInput, 2026, 5)
  const dayRes = await buildCalendarDay(fusionInput, '2026-05-15')
  const hourlyRes = await buildCalendarHourly(fusionInput, '2026-05-15')

  console.log('\n╔═════════════════════════════════════════════════════════╗')
  console.log('║  1995-02-09 06:40 KST 남자 → 2026-05                    ║')
  console.log('╚═════════════════════════════════════════════════════════╝')

  // ════════════════════════════════════════════════════════
  // Monthly 탭
  // ════════════════════════════════════════════════════════
  console.log('\n──────────────────────────── [ Monthly ] ────────────────────────────')
  console.log(`\n월 평균  ${Math.round(monthRes.monthScore * 100)}점   [${monthRes.monthGrade}]\n`)

  console.log('▸ 31일 grid (캘린더 셀):')
  let row = ''
  for (const d of monthRes.days) {
    const day = parseInt(d.date.slice(8), 10)
    const mark = d.grade === 'auspicious' ? '●' : d.grade === 'inauspicious' ? '○' : ' '
    row += `${mark}${String(day).padStart(2)}(${d.score})  `
    if (day % 7 === 0) { console.log('  ' + row); row = '' }
  }
  if (row) console.log('  ' + row)
  console.log('  (● 길일  ○ 주의일)')

  console.log('\n▸ 4 테마 월 평균:')
  for (const t of SHOW_THEMES) {
    const v = Math.round((monthRes.monthlyDomains[t] ?? 0) * 100)
    const bar = '█'.repeat(Math.round(v / 5)).padEnd(20, '░')
    console.log(`  ${SHOW_LABEL[t].padEnd(8)} ${bar} ${v}`)
  }

  console.log('\n▸ 월간 종합 분석 리포트:')
  for (const line of monthRes.monthNarrative.split('. ')) {
    if (line.trim()) console.log(`  ${line}${line.endsWith('.') ? '' : '.'}`)
  }

  // ════════════════════════════════════════════════════════
  // Daily 탭 (2026-05-15)
  // ════════════════════════════════════════════════════════
  console.log('\n──────────────────────────── [ Daily 2026-05-15 ] ────────────────────────────')
  console.log(`\n일진: ${dayRes.iljin ?? '-'}`)

  console.log('\n▸ 4 테마 점수:')
  for (const t of SHOW_THEMES) {
    const v = Math.round((dayRes.domainScores[t] ?? 0) * 100)
    const bar = '█'.repeat(Math.round(v / 5)).padEnd(20, '░')
    console.log(`  ${SHOW_LABEL[t].padEnd(8)} ${bar} ${v}`)
  }

  console.log('\n▸ 좋은 시간 (BEST 4):')
  for (const s of hourlyRes.bestHours.slice(0, 4)) {
    const ampm = s.hour === 0 ? '자정 0시' : s.hour < 12 ? `오전 ${s.hour}시` :
                 s.hour === 12 ? '정오 12시' : `오후 ${s.hour - 12}시`
    const hp = s.hourPillar ? `${s.hourPillar.stem}${s.hourPillar.branch}` : '----'
    const ph = (s.planetaryHour ?? '-').padEnd(7)
    console.log(`  ${ampm.padEnd(8)} ${String(s.score).padStart(3)}점   시주:${hp} · ${ph}`)
  }

  console.log('\n▸ 주의 시간 (WORST 2):')
  for (const s of hourlyRes.worstHours.slice(0, 2)) {
    const ampm = s.hour === 0 ? '자정 0시' : s.hour < 12 ? `오전 ${s.hour}시` :
                 s.hour === 12 ? '정오 12시' : `오후 ${s.hour - 12}시`
    const hp = s.hourPillar ? `${s.hourPillar.stem}${s.hourPillar.branch}` : '----'
    const ph = (s.planetaryHour ?? '-').padEnd(7)
    console.log(`  ${ampm.padEnd(8)} ${String(s.score).padStart(3)}점   시주:${hp} · ${ph}`)
  }

  console.log('\n▸ 권장 행동:')
  for (const a of dayRes.advice.do) console.log(`  • ${a}`)
  console.log('\n▸ 주의 행동:')
  for (const a of dayRes.advice.avoid) console.log(`  • ${a}`)

  // ════════════════════════════════════════════════════════
  // Stats 탭 — 4주차
  // ════════════════════════════════════════════════════════
  console.log('\n──────────────────────────── [ Stats — 4주차 ] ────────────────────────────')
  const weeks: Array<{ wk: number; saju: number; astro: number; days: number }> = []
  for (let w = 0; w < 4; w++) {
    const start = w * 7
    const end = w === 3 ? monthRes.days.length : start + 7   // 마지막 주는 나머지 다
    const slice = monthRes.days.slice(start, end)
    if (slice.length === 0) continue
    const avgScore = slice.reduce((a, b) => a + b.score, 0) / slice.length
    weeks.push({
      wk: w + 1,
      saju: Math.round(avgScore * 0.85 + (w % 2 ? -3 : 4)),   // saju side proxy
      astro: Math.round(avgScore * 1.05 + (w % 2 ? 5 : -3)),  // astro side proxy
      days: slice.length,
    })
  }
  console.log('\n▸ 주차별 사주 vs 점성 (라인 차트):')
  console.log('  주차      사주    점성     일수')
  for (const w of weeks) {
    const sBar = '█'.repeat(Math.round(w.saju / 5)).padEnd(20, '░')
    console.log(`  ${w.wk}주차    ${String(w.saju).padStart(3)}     ${String(w.astro).padStart(3)}      ${w.days}일   ${sBar}`)
  }

  // 슈퍼 타이밍 = 사주+점성 둘 다 높고 가까운 주
  let superW = weeks[0]
  let superScore = 0
  for (const w of weeks) {
    const combined = (w.saju + w.astro) / 2 - Math.abs(w.saju - w.astro) * 0.3
    if (combined > superScore) { superScore = combined; superW = w }
  }
  console.log(`\n▸ 슈퍼 타이밍: ${superW.wk}주차 (사주·점성 가장 강하게 교차)`)
}, 60000)
