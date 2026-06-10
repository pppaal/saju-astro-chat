/**
 * 10년 드릴 — 향후 10년을 년→월→일→시로. 년 단위 루프(메모리 평탄, 진행 출력).
 * 첫 해로 base-rate 를 잡아 cellSurprise("드문×강한 겹침")로 큰 날을 랭크.
 * 실행: npx tsx scripts/run-decade.ts
 */
import { buildNatalContext } from '@/lib/calendar-engine/context/build'
import { buildCalendar } from '@/lib/calendar-engine'
import {
  computeBaseRates,
  cellSurprise,
  type BaseRateTable,
} from '@/lib/calendar-engine/derivers/surprise'
import type { CalendarCell } from '@/lib/calendar-engine/types'

const BIRTH = {
  birthDate: '1995-02-09',
  birthTime: '06:40',
  gender: 'male' as const,
  latitude: 37.5665,
  longitude: 126.978,
  timeZone: 'Asia/Seoul',
  calendarType: 'solar' as const,
}
const YEARS = [2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035]

const d10 = (iso: string) => iso.slice(0, 10)
const bar = (n: number, max: number, w = 26) =>
  '█'.repeat(Math.round((n / (max || 1)) * w)).padEnd(w, '·')

interface DaySummary {
  iso: string
  surprise: number
  fav: number
  top: Array<{ name: string; source: string; importance: number; polarity: number }>
  patterns: string[]
}

function scoreYear(cells: CalendarCell[], rates: BaseRateTable): DaySummary[] {
  return cells.map((c) => {
    const sp = cellSurprise(c, rates, 6)
    return {
      iso: c.datetime,
      surprise: sp.total,
      fav: c.derivedScore,
      top: sp.top.map((t) => ({
        name: t.name,
        source: t.source,
        importance: t.importance,
        polarity: t.polarity,
      })),
      patterns: (c.matchedPatterns ?? []).map((p: any) => p.label ?? p.name ?? p.id),
    }
  })
}

async function main() {
  const natal = await buildNatalContext(BIRTH)

  // 첫 해로 base-rate (일 단위 신호 P 추정엔 365셀로 충분)
  const firstCells = await buildCalendar(natal, {
    start: '2026-01-01',
    end: '2026-12-31',
    granularity: 'day',
  })
  const rates = computeBaseRates(firstCells)

  const yearAgg: Array<{ year: number; intensity: number; fav: number; peak: DaySummary }> = []
  const allDays: DaySummary[] = []

  for (const y of YEARS) {
    const cells =
      y === 2026
        ? firstCells
        : await buildCalendar(natal, { start: `${y}-01-01`, end: `${y}-12-31`, granularity: 'day' })
    const days = scoreYear(cells, rates)
    allDays.push(...days)
    const intensity = days.reduce((a, d) => a + d.surprise, 0)
    const favAvg = Math.round(days.reduce((a, d) => a + d.fav, 0) / days.length)
    const peak = days.reduce((a, d) => (d.surprise > a.surprise ? d : a), days[0])
    yearAgg.push({ year: y, intensity, fav: favAvg, peak })
    console.error(`  ${y} done`)
  }

  // ───── ① 년 ─────
  const maxY = Math.max(...yearAgg.map((y) => y.intensity))
  console.log('━'.repeat(72))
  console.log('① 년 — 10년 강도(드문×강한 겹침 합) · 평균 우호도 · 그 해 최대의 날')
  console.log('━'.repeat(72))
  for (const y of yearAgg)
    console.log(
      `${y.year}  ${bar(y.intensity, maxY)}  우호 ${String(y.fav).padStart(3)}  ▲ ${d10(y.peak.iso)} (${y.peak.surprise})`
    )
  const topYear = [...yearAgg].sort((a, b) => b.intensity - a.intensity)[0].year

  // ───── ② 월 (top 해) ─────
  const monthMap = new Map<
    string,
    { intensity: number; favSum: number; n: number; peak: DaySummary }
  >()
  for (const d of allDays.filter((d) => d.iso.startsWith(String(topYear)))) {
    const k = d.iso.slice(0, 7)
    const a = monthMap.get(k) ?? { intensity: 0, favSum: 0, n: 0, peak: d }
    a.intensity += d.surprise
    a.favSum += d.fav
    a.n += 1
    if (d.surprise > a.peak.surprise) a.peak = d
    monthMap.set(k, a)
  }
  const months = [...monthMap.entries()]
    .map(([k, a]) => ({
      month: k,
      intensity: a.intensity,
      fav: Math.round(a.favSum / a.n),
      peak: a.peak,
    }))
    .sort((a, b) => a.month.localeCompare(b.month))
  const maxM = Math.max(...months.map((m) => m.intensity))
  console.log('\n' + '━'.repeat(72))
  console.log(`② 월 — 가장 강한 해 ${topYear}년의 12개월`)
  console.log('━'.repeat(72))
  for (const m of months)
    console.log(
      `${m.month}  ${bar(m.intensity, maxM)}  우호 ${String(m.fav).padStart(3)}  ▲ ${d10(m.peak.iso)} (${m.peak.surprise})`
    )
  const topMonth = [...months].sort((a, b) => b.intensity - a.intensity)[0].month

  // ───── ③ 일 (top 달) ─────
  const dayList = allDays
    .filter((d) => d.iso.startsWith(topMonth))
    .sort((a, b) => b.surprise - a.surprise)
  console.log('\n' + '━'.repeat(72))
  console.log(`③ 일 — ${topMonth} 의 큰 날 top 6 (사주×점성 겹침)`)
  console.log('━'.repeat(72))
  for (const d of dayList.slice(0, 6)) {
    console.log(
      `\n  ${d10(d.iso)}  큰날 ${d.surprise} · 우호 ${d.fav}${d.patterns.length ? ' · [' + d.patterns.join(', ') + ']' : ''}`
    )
    for (const tp of d.top.slice(0, 4))
      console.log(
        `     · ${tp.name}  (${tp.source}, 기여 ${tp.importance.toFixed(2)}, pol ${tp.polarity > 0 ? '+' : ''}${tp.polarity})`
      )
  }
  const topDay = d10(dayList[0].iso)

  // ───── ④ 시 (top 날을 hour 재빌드) ─────
  console.log('\n' + '━'.repeat(72))
  console.log(`④ 시 — 가장 큰 날 ${topDay} 의 시각별`)
  console.log('━'.repeat(72))
  const hourCells = await buildCalendar(natal, { start: topDay, end: topDay, granularity: 'hour' })
  const h = hourCells
    .map((c) => ({ iso: c.datetime, sp: cellSurprise(c, rates, 5), fav: c.derivedScore }))
    .sort((a, b) => a.iso.localeCompare(b.iso))
  if (h.length <= 1) {
    console.log('  (이 날 신호 대부분이 일(日) 단위라 시각이 한 버킷으로 모임 — 시주/행성시 등')
    console.log('   시 전용 신호만 시각을 가른다. 활성 신호:')
    for (const tp of h[0]?.sp.top ?? [])
      console.log(`     · ${tp.name} (${tp.source}, pol ${tp.polarity})`)
  } else {
    for (const x of h)
      console.log(
        `  ${x.iso.slice(11, 13)}시  우호 ${String(x.fav).padStart(3)}  ${x.sp.top
          .slice(0, 2)
          .map((t) => t.name)
          .join(', ')}`
      )
  }
  console.log('\n' + '━'.repeat(72))
}

main().catch((e) => {
  console.error('실패:', e)
  process.exit(1)
})
