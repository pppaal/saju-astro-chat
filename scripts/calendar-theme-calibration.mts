/**
 * themeScore 캘리브레이션 시뮬 (standalone — 실제 천체력, vitest 목킹 우회).
 *
 * 왜 필요한가:
 *   derivedScore 는 normalizeAvgToScore(avg, BIAS=1.75, SCALE=16) 로 recenter
 *   되어 있는데(96차트 시뮬로 측정), themeScore 는 아직 (avg − 0) × 24 — bias
 *   미측정 + scale 눈대중(임시값). 이 스크립트로 themeScore 의 raw per-theme
 *   avg 분포를 실제 천체력으로 뽑아 bias/scale 을 데이터로 확정한다.
 *
 * 측정 대상:
 *   per-theme raw avg = Σ(polarity·weight·layerWeight) / Σ(weight·layerWeight)
 *   (themeScores.ts 의 버킷 수식 그대로 — 정규화 직전 값)
 *
 * 실행: npx tsx scripts/calendar-theme-calibration.mts
 */

const LAYER_WEIGHT: Record<string, number> = {
  decadal: 1.0,
  yearly: 0.85,
  monthly: 0.7,
  daily: 0.55,
  hourly: 0.4,
  instant: 0.5,
}

const THEMES = ['love', 'money', 'career', 'health', 'growth'] as const

// 합성 본명 차트 — 연/월/일/시/위치 분산 (분포 측정용 표본)
function makeCharts(): Array<{
  birthDate: string
  birthTime: string
  gender: 'male' | 'female'
  latitude: number
  longitude: number
  timeZone: string
}> {
  const locations = [
    { latitude: 37.5665, longitude: 126.978, timeZone: 'Asia/Seoul' },
    { latitude: 35.1796, longitude: 129.0756, timeZone: 'Asia/Seoul' },
    { latitude: 40.7128, longitude: -74.006, timeZone: 'America/New_York' },
  ]
  const years = [
    1955, 1958, 1962, 1965, 1969, 1972, 1976, 1979, 1983, 1986, 1988, 1990, 1992, 1994, 1996, 1998,
    2000, 2002,
  ]
  const monthDays = [
    [1, 9],
    [3, 21],
    [5, 15],
    [7, 4],
    [9, 28],
    [11, 17],
  ]
  const times = ['04:30', '09:15', '14:30', '21:45']
  const charts: Array<{
    birthDate: string
    birthTime: string
    gender: 'male' | 'female'
    latitude: number
    longitude: number
    timeZone: string
  }> = []
  let i = 0
  for (const y of years) {
    const [m, d] = monthDays[i % monthDays.length]
    const loc = locations[i % locations.length]
    const t = times[i % times.length]
    charts.push({
      birthDate: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      birthTime: t,
      gender: i % 2 === 0 ? 'male' : 'female',
      ...loc,
    })
    i++
  }
  return charts
}

function pct(sorted: number[], p: number): number {
  if (sorted.length === 0) return NaN
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.round((p / 100) * (sorted.length - 1))))
  return sorted[idx]
}

function stats(values: number[]) {
  const s = [...values].sort((a, b) => a - b)
  const n = s.length
  const mean = n ? s.reduce((a, b) => a + b, 0) / n : NaN
  return {
    n,
    mean,
    p5: pct(s, 5),
    p10: pct(s, 10),
    p25: pct(s, 25),
    median: pct(s, 50),
    p75: pct(s, 75),
    p90: pct(s, 90),
    p95: pct(s, 95),
  }
}

function fmt(v: number): string {
  return Number.isFinite(v) ? v.toFixed(2) : 'n/a'
}

async function main() {
  // tsx 정적 named-import 가 이 모듈 export 를 못 잡아 dynamic import 사용.
  const { buildNatalContext } = (await import('../src/lib/calendar-engine/context/build')) as {
    buildNatalContext: (input: {
      birthDate: string
      birthTime: string
      gender: 'male' | 'female'
      latitude: number
      longitude: number
      timeZone: string
    }) => Promise<unknown>
  }
  const { buildCalendar } = (await import('../src/lib/calendar-engine/index')) as {
    buildCalendar: (
      natal: unknown,
      range: { start: string; end: string; granularity: 'day' | 'hour' }
    ) => Promise<
      Array<{
        signals: Array<{
          themes: string[]
          polarity: number
          weight: number
          layer: string
        }>
        themeScores: Record<string, number>
      }>
    >
  }

  const charts = makeCharts()
  const rawByTheme: Record<string, number[]> = { love: [], money: [], career: [], health: [], growth: [] }
  const rawGlobal: number[] = []
  // 현재 정규화(50+avg*24, clamp 0..100) 기준 클리핑 측정
  const curByTheme: Record<string, number[]> = { love: [], money: [], career: [], health: [], growth: [] }
  let clip0 = 0
  let clip100 = 0
  let curTotal = 0

  console.log(`[calibration] charts=${charts.length}, range=2026 full year (daily)\n`)

  for (let ci = 0; ci < charts.length; ci++) {
    const natal = await buildNatalContext(charts[ci])
    const cells = await buildCalendar(natal, {
      start: '2026-01-01T00:00:00.000Z',
      end: '2026-12-31T23:59:59.999Z',
      granularity: 'day',
    })

    for (const cell of cells) {
      // raw per-theme avg 재계산 (themeScores.ts 버킷 수식 그대로)
      const buckets = new Map<string, { sum: number; weight: number }>()
      for (const s of cell.signals) {
        if (!s.themes || s.themes.length === 0) continue
        const lw = LAYER_WEIGHT[s.layer] ?? 0.5
        const w = s.weight * lw
        for (const theme of s.themes) {
          const b = buckets.get(theme) ?? { sum: 0, weight: 0 }
          b.sum += s.polarity * w
          b.weight += w
          buckets.set(theme, b)
        }
      }
      for (const theme of THEMES) {
        const b = buckets.get(theme)
        if (!b || b.weight === 0) continue
        const avg = b.sum / b.weight
        rawByTheme[theme].push(avg)
        rawGlobal.push(avg)
      }
      // 현재 정규화 결과 (클리핑 측정)
      for (const theme of THEMES) {
        const v = cell.themeScores[theme]
        if (v == null) continue
        curByTheme[theme].push(v)
        curTotal++
        if (v <= 0) clip0++
        if (v >= 100) clip100++
      }
    }
    process.stdout.write(`  chart ${ci + 1}/${charts.length} done\r`)
  }
  console.log('\n')

  // ── raw avg 분포 (정규화 직전) ──
  console.log('=== raw per-theme avg 분포 (정규화 직전) ===')
  console.log('theme     n      mean    p5     p10    p25    median  p75    p90    p95')
  for (const theme of THEMES) {
    const st = stats(rawByTheme[theme])
    console.log(
      `${theme.padEnd(8)} ${String(st.n).padEnd(6)} ${fmt(st.mean).padStart(6)} ${fmt(st.p5).padStart(6)} ${fmt(st.p10).padStart(6)} ${fmt(st.p25).padStart(6)} ${fmt(st.median).padStart(7)} ${fmt(st.p75).padStart(6)} ${fmt(st.p90).padStart(6)} ${fmt(st.p95).padStart(6)}`
    )
  }
  const g = stats(rawGlobal)
  console.log(
    `${'GLOBAL'.padEnd(8)} ${String(g.n).padEnd(6)} ${fmt(g.mean).padStart(6)} ${fmt(g.p5).padStart(6)} ${fmt(g.p10).padStart(6)} ${fmt(g.p25).padStart(6)} ${fmt(g.median).padStart(7)} ${fmt(g.p75).padStart(6)} ${fmt(g.p90).padStart(6)} ${fmt(g.p95).padStart(6)}`
  )

  // ── 현재 정규화 (50 + avg×24, clamp) 클리핑 ──
  console.log('\n=== 현재 themeScore (50 + avg×24, clamp 0..100) ===')
  console.log('theme     n      mean    p10    median  p90')
  for (const theme of THEMES) {
    const st = stats(curByTheme[theme])
    console.log(
      `${theme.padEnd(8)} ${String(st.n).padEnd(6)} ${fmt(st.mean).padStart(6)} ${fmt(st.p10).padStart(6)} ${fmt(st.median).padStart(7)} ${fmt(st.p90).padStart(6)}`
    )
  }
  console.log(
    `clipping: ${clip0}/${curTotal} (${((clip0 / curTotal) * 100).toFixed(1)}%) at 0,  ${clip100}/${curTotal} (${((clip100 / curTotal) * 100).toFixed(1)}%) at 100`
  )

  // ── 제안: per-theme bias = median, per-theme scale = TARGET_BAND/(p90-p10) ──
  // 각 도메인 바를 자기 baseline(50)으로 recenter + 동일 변별 밴드로 정규화 →
  // 바끼리 percentile 비교 가능. sparse 테마(health) 과증폭 방지 위해 밴드 후보별
  // 클리핑 확인.
  for (const TARGET_BAND of [24, 28, 32]) {
    console.log(`\n=== 제안: per-theme bias=median, scale=${TARGET_BAND}/(p90-p10) ===`)
    console.log('theme     bias    scale   median  p10    p90    min    max    clip0%  clip100%')
    for (const theme of THEMES) {
      const st = stats(rawByTheme[theme])
      const bias = st.median
      const span = st.p90 - st.p10
      const scale = span > 0 ? TARGET_BAND / span : 24
      const scored = rawByTheme[theme].map((avg) =>
        Math.max(0, Math.min(100, Math.round(50 + (avg - bias) * scale)))
      )
      const ss = stats(scored)
      const mn = Math.min(...scored)
      const mx = Math.max(...scored)
      const c0 = ((scored.filter((v) => v <= 0).length / scored.length) * 100).toFixed(1)
      const c100 = ((scored.filter((v) => v >= 100).length / scored.length) * 100).toFixed(1)
      console.log(
        `${theme.padEnd(8)} ${fmt(bias).padStart(6)} ${fmt(scale).padStart(6)} ${fmt(ss.median).padStart(7)} ${fmt(ss.p10).padStart(6)} ${fmt(ss.p90).padStart(6)} ${String(mn).padStart(6)} ${String(mx).padStart(6)} ${c0.padStart(6)} ${c100.padStart(8)}`
      )
    }
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
