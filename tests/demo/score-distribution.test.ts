import { it } from 'vitest'
import { calculateSajuData } from '@/lib/saju/saju'
import { calculateNatalChart, toChart } from '@/lib/astrology/foundation/astrologyService'
import { buildCalendarMonth } from '@/lib/fusion/adapters'
import type { SimpleSajuPillars } from '@/lib/saju/themes/types'
import type { NatalInput } from '@/lib/astrology/foundation/types'

it('점수 분포 분석: 1995-02-09 06:40, 6개월 × 30일 × 6 테마', async () => {
  const natalInput: NatalInput = {
    year: 1995, month: 2, date: 9,
    hour: 6, minute: 40,
    latitude: 37.5665, longitude: 126.978,
    timeZone: 'Asia/Seoul',
  }
  const sajuRes = calculateSajuData('1995-02-09', '06:40', 'male', 'solar', 'Asia/Seoul')
  const p = sajuRes.pillars
  const simplePillars: SimpleSajuPillars = {
    year:  { stem: p.year.heavenlyStem.name,  branch: p.year.earthlyBranch.name },
    month: { stem: p.month.heavenlyStem.name, branch: p.month.earthlyBranch.name },
    day:   { stem: p.day.heavenlyStem.name,   branch: p.day.earthlyBranch.name },
    hour:  { stem: p.time.heavenlyStem.name,  branch: p.time.earthlyBranch.name },
  }
  const natalData = await calculateNatalChart(natalInput)
  const natalChart = toChart(natalData)
  const age = 31

  // 6개월 분석 (2026-04 ~ 2026-09) — natalInput 빼서 빠르게
  const months: number[] = [4, 5, 6, 7, 8, 9]
  const allScores: number[] = []
  const allMonthScores: { month: number; monthScore: number; monthTone: string; daySpread: number; uniqueScores: number }[] = []
  const allTones: Record<string, number> = {}
  const dayScoreVariance: number[] = []

  for (const m of months) {
    const cm = await buildCalendarMonth(
      { saju: simplePillars, astro: natalChart, age },  // natalInput 생략 → daily transit 없이 빠르게
      2026, m,
    )

    const dayDomainScores: number[] = []  // 30일 × 6 테마 = 180개
    const dayTopScores: number[] = []     // 30개 (각 날 topDomain 점수)

    for (const d of cm.days) {
      for (const v of Object.values(d.domainScores)) {
        dayDomainScores.push(v as number)
        allScores.push(v as number)
      }
      const top = d.topDomain ? (d.domainScores[d.topDomain] ?? 0) : 0
      dayTopScores.push(top)
      allTones[d.tone] = (allTones[d.tone] ?? 0) + 1
    }

    const mean = dayTopScores.reduce((a, b) => a + b, 0) / dayTopScores.length
    const variance = dayTopScores.reduce((a, b) => a + (b - mean) ** 2, 0) / dayTopScores.length
    const stddev = Math.sqrt(variance)
    const unique = new Set(dayDomainScores.map(v => v.toFixed(2))).size
    dayScoreVariance.push(stddev)

    allMonthScores.push({
      month: m,
      monthScore: cm.monthScore,
      monthTone: cm.monthTone,
      daySpread: stddev,
      uniqueScores: unique,
    })
  }

  console.log('\n========== 점수 분포 분석 ==========')
  console.log('\n[1] 월별 점수 / tone / 일변동')
  console.log('  월   monthScore  monthTone     일점수표준편차  고유값수')
  for (const r of allMonthScores) {
    console.log(`  ${r.month}월  ${(r.monthScore * 100).toFixed(1).padStart(5)}점     ${r.monthTone.padEnd(15)} ${r.daySpread.toFixed(3)}           ${r.uniqueScores}`)
  }

  console.log('\n[2] 6 단계 점수 빈도 (180 × 6달 = 1080개)')
  const bucket: Record<string, number> = { '0.00': 0, '0.25': 0, '0.40': 0, '0.50': 0, '0.70': 0, '1.00': 0 }
  for (const s of allScores) {
    const k = s.toFixed(2)
    bucket[k] = (bucket[k] ?? 0) + 1
  }
  for (const [k, v] of Object.entries(bucket)) {
    const pct = (v / allScores.length) * 100
    const bar = '█'.repeat(Math.round(pct / 2))
    console.log(`  ${k}  ${String(v).padStart(4)} (${pct.toFixed(1)}%)  ${bar}`)
  }

  console.log('\n[3] 일 tone 분포 (30일 × 6달 = 180일)')
  for (const [k, v] of Object.entries(allTones)) {
    const pct = (v / 180) * 100
    const bar = '█'.repeat(Math.round(pct / 2))
    console.log(`  ${k.padEnd(20)} ${String(v).padStart(3)} (${pct.toFixed(1)}%)  ${bar}`)
  }

  console.log('\n[4] 월간 점수 비교 (분포 폭)')
  const ms = allMonthScores.map(r => r.monthScore * 100)
  const msMin = Math.min(...ms), msMax = Math.max(...ms)
  console.log(`  최저: ${msMin.toFixed(1)}점, 최고: ${msMax.toFixed(1)}점, 폭: ${(msMax - msMin).toFixed(1)}점`)
  console.log(`  → 6개월 monthScore 범위가 ${(msMax - msMin).toFixed(1)}점이면 ${msMax - msMin < 5 ? '⚠ 좁음 (월 변별 약함)' : msMax - msMin < 15 ? '○ 보통' : '✓ 충분'}`)

  console.log('\n[5] 일내 점수 변동 (각 달 내 daily top score 표준편차)')
  const avgDaySpread = dayScoreVariance.reduce((a, b) => a + b, 0) / dayScoreVariance.length
  console.log(`  평균 표준편차: ${avgDaySpread.toFixed(3)}`)
  console.log(`  → 일 변동 0.05 미만 = ⚠ 거의 같음, 0.05~0.15 = ○ 조금, 0.15+ = ✓ 변별 있음`)
}, 60000)
