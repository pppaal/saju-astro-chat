/**
 * 프로토타입용 데이터 덤프 — 1995 차트의 인생→10년→월→일→시 4단계를
 * 하나의 JSON 으로. prototype/data.json 에 기록. (엔진은 서버 전용이라 1회 덤프 후
 * 브라우저 프로토타입이 정적으로 읽음.)
 * 실행: npx tsx scripts/dump-prototype-data.ts
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { buildNatalContext } from '@/lib/calendar-engine/context/build'
import { buildCalendar } from '@/lib/calendar-engine'
import { deriveLifetimeFlow } from '@/lib/calendar-engine/derivers/lifetimeFlow'
import { calculateOuterPlanetMilestones } from '@/lib/astrology/foundation/planetReturns'
import {
  computeBaseRates,
  cellSurprise,
  signalImportance,
  type BaseRateTable,
} from '@/lib/calendar-engine/derivers/surprise'

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
const dayNum = (iso: string) => Math.floor(Date.parse(iso.slice(0, 10) + 'T00:00:00Z') / 86400000)

async function main() {
  const natal = await buildNatalContext(BIRTH)

  // ── 본명 요약 ──
  const p = natal.saju?.pillars
  const gz = (x: any) => (x ? `${x.heavenlyStem?.name ?? ''}${x.earthlyBranch?.name ?? ''}` : '?')
  const chart = natal.astro?.chart
  const planet = (n: string) => chart?.planets?.find((x) => x.name === n)
  const ys = (natal.saju as any)?.yongsin
  const summary = {
    birth: '1995-02-09 06:40 서울 남자',
    pillars: { year: gz(p?.year), month: gz(p?.month), day: gz(p?.day), time: gz(p?.time) },
    dayMaster: natal.saju?.dayMaster?.name,
    strength: natal.saju?.strength,
    yongsin: [ys?.primary, ys?.secondary].filter(Boolean).join('·'),
    sun: planet('Sun')?.sign,
    moon: planet('Moon')?.sign,
    asc: chart?.ascendant?.sign,
    mc: chart?.mc?.sign,
  }

  // ── L1 인생 흐름 ──
  const milestones = calculateOuterPlanetMilestones({
    year: 1995,
    month: 2,
    date: 9,
    hour: 6,
    minute: 40,
    latitude: BIRTH.latitude,
    longitude: BIRTH.longitude,
    timeZone: BIRTH.timeZone,
  })
  const flow = deriveLifetimeFlow(natal, 'ko', milestones)

  // ── 10년 일별 (base-rate = 2026 한 해로 통일해 척도 비교 가능) ──
  const firstCells = await buildCalendar(natal, {
    start: '2026-01-01',
    end: '2026-12-31',
    granularity: 'day',
  })
  const rates: BaseRateTable = computeBaseRates(firstCells)
  type Day = { iso: string; sal: number; fav: number; top: any[]; patterns: string[] }
  const allDays: Day[] = []
  for (const y of YEARS) {
    const cells =
      y === 2026
        ? firstCells
        : await buildCalendar(natal, { start: `${y}-01-01`, end: `${y}-12-31`, granularity: 'day' })
    for (const c of cells) {
      const sp = cellSurprise(c, rates, 6)
      allDays.push({
        iso: c.datetime,
        sal: sp.total,
        fav: c.derivedScore,
        top: sp.top.map((t) => ({
          name: t.name,
          source: t.source,
          importance: t.importance,
          polarity: t.polarity,
        })),
        patterns: (c.matchedPatterns ?? []).map((m: any) => m.label ?? m.name ?? m.id),
      })
    }
    console.error(`  ${y} done`)
  }

  // L2 년 롤업
  const decade = YEARS.map((y) => {
    const ds = allDays.filter((d) => d.iso.startsWith(String(y)))
    const sal = ds.reduce((a, d) => a + d.sal, 0)
    const fav = Math.round(ds.reduce((a, d) => a + d.fav, 0) / ds.length)
    const peak = ds.reduce((a, d) => (d.sal > a.sal ? d : a), ds[0])
    return {
      year: y,
      salience: Math.round(sal),
      fav,
      peakDay: peak.iso.slice(0, 10),
      peakSal: Math.round(peak.sal * 10) / 10,
    }
  })
  const topYear = [...decade].sort((a, b) => b.salience - a.salience)[0].year

  // L3 월 롤업 (top 해)
  const monthMap = new Map<string, Day[]>()
  for (const d of allDays.filter((d) => d.iso.startsWith(String(topYear)))) {
    const k = d.iso.slice(0, 7)
    ;(monthMap.get(k) ?? monthMap.set(k, []).get(k)!).push(d)
  }
  const months = [...monthMap.entries()]
    .map(([month, ds]) => ({
      month,
      salience: Math.round(ds.reduce((a, d) => a + d.sal, 0)),
      fav: Math.round(ds.reduce((a, d) => a + d.fav, 0) / ds.length),
      peakDay: ds.reduce((a, d) => (d.sal > a.sal ? d : a), ds[0]).iso.slice(0, 10),
    }))
    .sort((a, b) => a.month.localeCompare(b.month))
  const topMonth = [...months].sort((a, b) => b.salience - a.salience)[0].month

  // L4 일 (top 달의 모든 날 — 현저도/우호도/교차신호)
  const monthDays = allDays
    .filter((d) => d.iso.startsWith(topMonth))
    .map((d) => ({
      date: d.iso.slice(0, 10),
      salience: Math.round(d.sal * 10) / 10,
      fav: d.fav,
      patterns: d.patterns,
      signals: d.top.slice(0, 5).map((t) => ({
        name: t.name,
        source: t.source,
        polarity: t.polarity,
        importance: Math.round(t.importance * 10) / 10,
      })),
    }))
    .sort((a, b) => a.date.localeCompare(b.date))

  // 정점일 (정확각 근접 타이브레이크)
  const winCells = await buildCalendar(natal, {
    start: `${topMonth}-01`,
    end: `${topMonth}-28`,
    granularity: 'day',
  })
  const SIGMA = 2.5
  const peakDay = winCells
    .map((c) => {
      const di = dayNum(c.datetime)
      let s = 0
      for (const sig of c.signals) {
        const imp = signalImportance(sig, rates)
        if (imp <= 0) continue
        const pk = sig.active?.peak ?? sig.active?.start ?? c.datetime
        s += imp * Math.exp(-(((di - dayNum(pk)) / SIGMA) ** 2))
      }
      return { date: c.datetime.slice(0, 10), refined: s }
    })
    .sort((a, b) => b.refined - a.refined)[0].date

  // L4 시 (정점일 12시진)
  const hourCells = await buildCalendar(
    natal,
    { start: peakDay, end: peakDay, granularity: 'hour' },
    { enabledExtractors: ['pillar-sibsin', 'planetary-hour'] as any }
  )
  const SIJIN = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해']
  const RANGES = [
    '23-01',
    '01-03',
    '03-05',
    '05-07',
    '07-09',
    '09-11',
    '11-13',
    '13-15',
    '15-17',
    '17-19',
    '19-21',
    '21-23',
  ]
  const sijinMap = new Map<number, any>()
  for (const c of hourCells.filter((c) => c.datetime.slice(0, 10) === peakDay)) {
    const hh = Number(c.datetime.slice(11, 13))
    const idx = hh === 23 || hh === 0 ? 0 : Math.floor((hh + 1) / 2)
    const sj = c.signals.find((s) => /시진/.test(s.name))
    const ph = c.signals.find((s) => s.kind === 'planetary-hour')
    if (!sijinMap.has(idx) || (sj && !sijinMap.get(idx).ganji)) {
      sijinMap.set(idx, {
        branch: SIJIN[idx],
        range: RANGES[idx],
        ganji: sj ? String(sj.korean ?? sj.name).replace(' 시진', '') : '',
        polarity: sj?.polarity ?? 0,
        planet: ph ? (ph.korean ?? ph.name) : '',
      })
    }
  }
  const sijin = [...Array(12)].map(
    (_, i) =>
      sijinMap.get(i) ?? { branch: SIJIN[i], range: RANGES[i], ganji: '', polarity: 0, planet: '' }
  )

  const out = {
    summary,
    lifetime: flow,
    decade,
    topYear,
    year: { year: topYear, months },
    topMonth,
    month: { month: topMonth, days: monthDays },
    peakDay,
    day: { date: peakDay, sijin },
  }
  mkdirSync('prototype', { recursive: true })
  writeFileSync('prototype/data.json', JSON.stringify(out, null, 2))
  console.error(
    `\n✅ prototype/data.json 기록 (topYear ${topYear}, topMonth ${topMonth}, peakDay ${peakDay})`
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
