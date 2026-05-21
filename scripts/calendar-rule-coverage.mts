/**
 * monthly 룰 커버리지 감사 (standalone — 실제 천체력).
 *
 * 왜 필요한가:
 *   interpretation/rules.ts 에 monthly 룰이 207개. 이 중 상당수는 특정 십신
 *   조합 + 용신 부합 + 신살 동시 조건이라 실제론 거의 안 켜질 수 있음. 룰이
 *   안 켜지면 작성 노동만 늘고 사용자는 못 봄. 합성 차트 × 2026 전년을 돌려
 *   "어느 룰이 며칠/몇 차트-월 만에 한 번 켜지나"를 데이터로 본다.
 *
 *   엔진이 결정적이라 프로덕션 텔레메트리(DB·생일 프라이버시) 없이 오프라인
 *   감사로 충분 — 죽은 룰을 먼저 찾고 조건 완화/병합한 뒤, 정말 필요하면
 *   그때 프로덕션 텔레메트리를 붙인다.
 *
 * 두 지표:
 *   pre-cap  = 룰 조건이 만족됨 (SECTION_CAP 가리기 전). "조건이 켜지나?"
 *   surfaced = matchedRuleIds (캡·dedup 후 실제 노출). "사용자가 보나?"
 *
 * 실행: npx tsx scripts/calendar-rule-coverage.mts
 */

type Rule = { id: string; scope: string; section: string; priority: number }

function makeCharts() {
  const locations = [
    { latitude: 37.5665, longitude: 126.978, timeZone: 'Asia/Seoul' },
    { latitude: 35.1796, longitude: 129.0756, timeZone: 'Asia/Seoul' },
    { latitude: 40.7128, longitude: -74.006, timeZone: 'America/New_York' },
    { latitude: 51.5074, longitude: -0.1278, timeZone: 'Europe/London' },
  ]
  const years = [
    1955, 1959, 1963, 1967, 1971, 1974, 1977, 1980, 1983, 1986, 1988, 1990, 1992, 1994, 1996, 1998,
    2000, 2002, 2004, 2006,
  ]
  const monthDays = [
    [1, 9],
    [2, 27],
    [4, 14],
    [6, 2],
    [8, 19],
    [10, 7],
    [11, 23],
  ]
  const times = ['02:10', '06:40', '11:25', '15:50', '20:05', '23:30']
  const genders: Array<'male' | 'female'> = ['male', 'female']
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
    charts.push({
      birthDate: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      birthTime: times[i % times.length],
      gender: genders[i % 2],
      ...locations[i % locations.length],
    })
    i++
  }
  return charts
}

async function main() {
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
      range: { start: string; end: string; granularity: 'day' | 'hour' },
      // includeEvidence 必須 — shinsalName/sibsin/dignity/sign 조건은 evidence.detail
      // 을 읽는데, 미지정 시 stripEvidence 로 날아가 false-negative (프로덕션 route 는
      // includeEvidence:true 로 호출).
      options?: { includeEvidence?: boolean }
    ) => Promise<Array<{ datetime: string }>>
  }
  const { buildInterpretation } = (await import(
    '../src/lib/calendar-engine/interpretation/matcher'
  )) as {
    buildInterpretation: (args: {
      natal: unknown
      cells: Array<{ datetime: string }>
      scope?: 'monthly' | 'yearly' | 'daily' | 'lifetime'
      debug?: boolean
    }) => { matchedRuleIds: string[]; allMatchedRuleIds?: string[] }
  }
  const { RULES } = (await import('../src/lib/calendar-engine/interpretation/rules')) as {
    RULES: Rule[]
  }

  const monthlyRules = RULES.filter((r) => r.scope === 'monthly')
  const ruleById = new Map(monthlyRules.map((r) => [r.id, r]))
  const preCap = new Map<string, number>() // ruleId → chart-month 매칭 수
  const surfaced = new Map<string, number>() // ruleId → 노출 수
  for (const r of monthlyRules) {
    preCap.set(r.id, 0)
    surfaced.set(r.id, 0)
  }

  const charts = makeCharts()
  let chartMonths = 0
  console.log(
    `[coverage] charts=${charts.length} × 12 months = ${charts.length * 12} chart-months, monthly rules=${monthlyRules.length}\n`
  )

  for (let ci = 0; ci < charts.length; ci++) {
    const natal = await buildNatalContext(charts[ci])
    const cells = await buildCalendar(
      natal,
      {
        start: '2026-01-01T00:00:00.000Z',
        end: '2026-12-31T23:59:59.999Z',
        granularity: 'day',
      },
      { includeEvidence: true }
    )
    // 월별 분할
    const byMonth = new Map<string, Array<{ datetime: string }>>()
    for (const c of cells) {
      const ym = c.datetime.slice(0, 7)
      const arr = byMonth.get(ym) ?? []
      arr.push(c)
      byMonth.set(ym, arr)
    }
    for (const [, monthCells] of byMonth) {
      const interp = buildInterpretation({ natal, cells: monthCells, scope: 'monthly', debug: true })
      chartMonths++
      const seenPre = new Set(interp.allMatchedRuleIds ?? [])
      const seenSurf = new Set(interp.matchedRuleIds ?? [])
      for (const id of seenPre) preCap.set(id, (preCap.get(id) ?? 0) + 1)
      for (const id of seenSurf) surfaced.set(id, (surfaced.get(id) ?? 0) + 1)
    }
    process.stdout.write(`  chart ${ci + 1}/${charts.length} done\r`)
  }
  console.log('\n')

  // ── 요약 ──
  const neverPre = monthlyRules.filter((r) => (preCap.get(r.id) ?? 0) === 0)
  const matchedButHidden = monthlyRules.filter(
    (r) => (preCap.get(r.id) ?? 0) > 0 && (surfaced.get(r.id) ?? 0) === 0
  )
  const rarePre = monthlyRules
    .filter((r) => {
      const c = preCap.get(r.id) ?? 0
      return c > 0 && c / chartMonths < 0.02 // 2% 미만 = 50 chart-month 에 한 번 미만
    })
    .sort((a, b) => (preCap.get(a.id) ?? 0) - (preCap.get(b.id) ?? 0))

  console.log('═══════════════════════ 요약 ═══════════════════════')
  console.log(`전체 monthly 룰:            ${monthlyRules.length}`)
  console.log(
    `pre-cap 한 번이라도 매칭:   ${monthlyRules.length - neverPre.length}  (${(((monthlyRules.length - neverPre.length) / monthlyRules.length) * 100).toFixed(0)}%)`
  )
  console.log(
    `❌ 조건이 한 번도 안 켜짐:   ${neverPre.length}  (${((neverPre.length / monthlyRules.length) * 100).toFixed(0)}%)  ← 조건 완화/병합 후보`
  )
  console.log(
    `⚠️  매칭되나 캡에 가려 미노출: ${matchedButHidden.length}  ← section 캡 경쟁에서 항상 짐`
  )
  console.log('')

  // section 별 dead 분포
  const deadBySection = new Map<string, number>()
  for (const r of neverPre) deadBySection.set(r.section, (deadBySection.get(r.section) ?? 0) + 1)
  console.log('── 조건 never-match 룰의 section 분포 ──')
  for (const [sec, n] of [...deadBySection.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${sec.padEnd(20)} ${n}`)
  }
  console.log('')

  console.log('── ❌ never-match 룰 ID (최대 60) ──')
  for (const r of neverPre.slice(0, 60)) {
    console.log(`  ${r.id}   [${r.section}, p${r.priority}]`)
  }
  if (neverPre.length > 60) console.log(`  …외 ${neverPre.length - 60}개`)
  console.log('')

  console.log('── ⚠️ 매칭되나 항상 캡에 가려 미노출 (최대 40) ──')
  for (const r of matchedButHidden.slice(0, 40)) {
    const c = preCap.get(r.id) ?? 0
    console.log(
      `  ${r.id}   [${r.section}, p${r.priority}]   pre-cap ${c} (${((c / chartMonths) * 100).toFixed(0)}%)`
    )
  }
  console.log('')

  console.log('── 🔸 희귀 매칭 (pre-cap < 2% chart-months, 최대 40) ──')
  for (const r of rarePre.slice(0, 40)) {
    const c = preCap.get(r.id) ?? 0
    const s = surfaced.get(r.id) ?? 0
    console.log(
      `  ${r.id}   [${r.section}]   pre-cap ${c}/${chartMonths}, surfaced ${s}`
    )
  }
  void ruleById
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
