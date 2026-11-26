/**
 * v9.2 캘린더 샘플 — 실제 천체력으로 프로덕션과 같은 길(달 cells 만 · evidence 없는 월 셀 +
 * evidence 있는 오늘 셀 · 주입된 now)을 거쳐 assembleTiers → 월/일 뷰모델을 만들고, 엔진이
 * 말하는 값을 본다. 샘플: 1997-03-21 14:30 여 · 서울, now = 2026-11-19 12:00 KST.
 *
 * 계획서의 '11/4/4/11'·'Sun □ Moon 은 11-17' 등은 엔진 수정 전 디자인 목업 값이다 — 여기선
 * 지금 엔진(HEAD)의 출력을 고정한다. 엔진이 바뀌어 값이 달라지면 이 테스트가 알려 준다.
 *
 * native swisseph 가 없으면 로컬에선 skip, CI · destiny 릴리스 게이트에선 실패
 * (tests/helpers/realEphemeris.ts).
 *
 * @vitest-environment node
 */
import { it, expect, vi, beforeAll } from 'vitest'

vi.unmock('swisseph')
vi.unmock('@/lib/astrology/foundation/ephe')

const { describeRealEphemeris } = await import('../../helpers/realEphemeris')
const { buildNatalContext } = await import('@/lib/calendar-engine/context/build')
const { buildCalendar } = await import('@/lib/calendar-engine')
const { assembleTiers } = await import('@/app/calendar/assembleTiers')
const { buildMonthViewModel } = await import('@/lib/calendar-view/monthViewModel')
const { buildDayViewModel } = await import('@/lib/calendar-view/dayViewModel')
const { withTransitPositions, natalPointLongitudes } =
  await import('@/lib/calendar-view/astroDetail')
const { assembleDayTier } = await import('@/app/calendar/assembleDayTier')

type Assembled = Awaited<ReturnType<typeof assembleTiers>>
type MonthCells = Awaited<ReturnType<typeof buildCalendar>>

/** 마지막 assembleSample 의 월 셀(evidence 없음 — 프로덕션 월 캐시 모양). */
let sampleMonthCells: MonthCells = []
/** 마지막 assembleSample 의 본명 컨텍스트. */
let sampleNatal: Awaited<ReturnType<typeof buildNatalContext>>

const NOW_ISO = '2026-11-19T03:00:00.000Z'
const BIRTH = {
  birthDate: '1997-03-21',
  birthTime: '14:30',
  gender: 'female' as const,
  latitude: 37.5665,
  longitude: 126.978,
  timeZone: 'Asia/Seoul',
}
const SEOUL = { latitude: 37.5665, longitude: 126.978, timeZone: 'Asia/Seoul' }
const HANGUL = /[ㄱ-ㆎ가-힣]/

async function assembleSample(lang: 'ko' | 'en'): Promise<Assembled> {
  const now = new Date(NOW_ISO)
  const natal = await buildNatalContext({ ...BIRTH, now })
  sampleNatal = natal
  // 프로덕션(loadTierData)과 같은 모집단 — 그 달 cells 만(evidence 없음) + 오늘 셀(evidence).
  const cells = await buildCalendar(
    natal,
    { start: '2026-11-01T00:00:00.000Z', end: '2026-11-30T23:59:59.999Z', granularity: 'day' },
    { includeEvidence: false }
  )
  sampleMonthCells = cells
  const [focusDayCell] = await buildCalendar(
    natal,
    { start: '2026-11-19T00:00:00.000Z', end: '2026-11-19T23:59:59.999Z', granularity: 'day' },
    { includeEvidence: true }
  )
  return assembleTiers({
    natal,
    cells,
    lang,
    birthYear: 1997,
    targetYear: 2026,
    targetMonth: 11,
    targetDay: 19,
    targetDayIso: '2026-11-19',
    sex: '여',
    birthDisplay: '1997.3.21 14:30',
    whoBirthLine: '1997.3.21 14:30',
    place: lang === 'ko' ? '서울' : 'Seoul',
    focusDayCell,
    now,
  })
}

describeRealEphemeris('v9.2 캘린더 샘플(1997-03-21 14:30 여 · 서울, 2026-11-19)', () => {
  let en: Assembled
  beforeAll(async () => {
    en = await assembleSample('en')
  }, 120_000)

  it('서버 표지 — 오늘 19일, 지난 날 = 1~18, cell.focus 와 별개', () => {
    expect(en.month.todayDay).toBe(19)
    expect(en.month.calendar.filter((c) => c.isToday).map((c) => c.d)).toEqual([19])
    expect(en.month.calendar.filter((c) => c.past).map((c) => c.d)).toEqual(
      Array.from({ length: 18 }, (_, i) => i + 1)
    )
    expect(en.month.focusDay).toBe(19)
  })

  it('월 뷰모델 — 카운트 = verdict(좋음 9 · 조심 4 · 피함 3 · 잔잔 14), 막대 past d<19 · 오늘 19, BEST 24', () => {
    const vm = buildMonthViewModel(en.month, en.day, { lang: 'en', nowIso: NOW_ISO })
    const v = en.month.verdict!
    expect(vm.counts).toEqual({
      good: v.goodN,
      caution: v.cautionN,
      avoid: v.avoidN,
      calm: v.calmN,
    })
    expect(vm.counts).toEqual({ good: 9, caution: 4, avoid: 3, calm: 14 })
    expect(vm.counts.good + vm.counts.caution + vm.counts.avoid + vm.counts.calm).toBe(30)
    expect(vm.bars.filter((b) => b.past).map((b) => b.d)).toEqual(
      Array.from({ length: 18 }, (_, i) => i + 1)
    )
    expect(vm.bars.filter((b) => b.isToday).map((b) => b.d)).toEqual([19])
    expect(vm.bestAnnotation).toEqual({ d: 24, label: 'BEST · 24' })
    expect(vm.h2.best).toBe('The 24th is the best.')
    // 큰 날 판정 = 그리드 마크.
    for (const k of vm.keyDays) {
      const cell = en.month.calendar.find((c) => c.ds === k.ds)!
      const want =
        cell.mark === 'best'
          ? 'Best day'
          : cell.mark === 'good'
            ? 'Good day'
            : cell.mark === 'caution'
              ? 'Caution'
              : cell.mark === 'avoid'
                ? 'Avoid'
                : 'Calm day'
      expect(k.verdict).toBe(want)
    }
  })

  it("11-17 '왜' 근거 — 상관(傷官) × 태양 ▼, 점성 부모 Sun □ Moon(교차의 엔진 부모 참조에서)", () => {
    const r = en.month.calendar.find((c) => c.d === 17)!.reason!
    expect(r.saju).toBe('상관')
    expect(r.sajuHanja).toBe('傷官')
    expect(r.polarity).toBeLessThan(0)
    expect(r.astroDetail).toMatchObject({
      transitPlanet: 'Sun',
      sourceKind: 'transit',
      aspect: 'square',
      natalPoint: 'Moon',
    })
    // evidence 없는 월 셀에서도 orb — 그날 정오 차트에서 잰 값(QA-3, 아래 테스트).
    expect(r.astroDetail?.orb).toEqual(expect.any(Number))
    expect(r.astroDetail!.orb!).toBeLessThan(10)
  })

  it('부모 참조 — 월 셀(evidence 없음)의 모든 교차가 crossParents 를 싣고, 근거가 있는 날은 전부 점성 구조', () => {
    expect(sampleMonthCells).toHaveLength(30)
    const missing: string[] = []
    let crosses = 0
    for (const cell of sampleMonthCells) {
      for (const s of cell.signals) {
        if (s.kind !== 'cross-activation') continue
        crosses++
        expect(s.evidence.detail).toEqual({}) // 월 캐시 모양 — evidence 는 비어 있다
        const ids = new Set(cell.signals.map((x) => x.id))
        const ref = s.crossParents
        if (!ref || !ids.has(ref.saju) || !ids.has(ref.astro))
          missing.push(`${cell.datetime.slice(0, 10)} ${s.id}`)
      }
    }
    expect(crosses).toBeGreaterThan(0)
    expect(missing).toEqual([])
    const withReason = en.month.calendar.filter((c) => c.reason)
    expect(withReason.length).toBeGreaterThan(0)
    expect(withReason.filter((c) => !c.reason!.astroDetail).map((c) => c.d)).toEqual([])
    expect(withReason.filter((c) => c.reason!.astroDetail!.sourceKind === 'unknown')).toEqual([])
  })

  it('오늘 근거는 evidence 셀로 — orb 와 트랜짓 위치, 월 셀과 일 티어가 같은 근거', () => {
    const cellReason = en.month.calendar.find((c) => c.d === 19)!.reason!
    const dayReason = en.day.reason!
    expect(dayReason.astroDetail?.orb).toEqual(expect.any(Number))
    expect(dayReason.astroDetail?.transitSign).toEqual(expect.any(String))
    expect(cellReason.astroDetail).toEqual(dayReason.astroDetail)
    expect(cellReason.saju).toBe(dayReason.saju)
  })

  it('11-19 현지 정오 트랜짓 태양은 전갈자리(트랜짓 추출기와 같은 차트 키)', async () => {
    const [sun] = await withTransitPositions(
      [{ dateIso: '2026-11-19', detail: { transitPlanet: 'Sun', sourceKind: 'transit' } }],
      SEOUL,
      natalPointLongitudes(sampleNatal.astro)
    )
    expect(sun.transitSign).toBe('Scorpio')
    expect(sun.transitDeg).toBe(26)
  })

  // ── QA-3 / VC-1: STARS 보조 줄의 orb 는 보여 주는 트랜짓 도와 같은 순간(그날 현지 정오) ──
  // 본명 달 28°17′ 사자자리 · 본명 태양 0°38′ 양자리(FIX9b E1). 예전엔 구간 최소 orb 를 붙여
  // 19일 · 29일 모두 'orb 0.1°', 24일 'orb 0.2°' 였다.
  const near = (v: number | undefined, want: number) => {
    expect(v).toEqual(expect.any(Number))
    expect(Math.abs((v as number) - want)).toBeLessThanOrEqual(0.1)
  }
  const cellDetail = (d: number) => en.month.calendar.find((c) => c.d === d)!.reason!.astroDetail!

  it('11-19 화성 ☌ 본명 달 — 정오 27° 사자자리 · orb ≈1.1°(월 셀 = 일 티어)', () => {
    const det = cellDetail(19)
    expect(det).toMatchObject({
      transitPlanet: 'Mars',
      aspect: 'conjunction',
      natalPoint: 'Moon',
      transitSign: 'Leo',
      transitDeg: 27,
    })
    near(det.orb, 1.1)
    expect(en.day.reason?.astroDetail).toEqual(det)
    const dayVm = buildDayViewModel(en.day, { lang: 'en', sex: '여', isToday: true })
    expect(dayVm.why?.stars?.sub).toBe('Transit · 27° Leo · conjunct natal Moon · orb 1.1°')
  })

  it('11-29 화성 ☌ 본명 달 — 정오 1° 처녀자리 · orb ≈2.9°(큰 날 행 문구까지)', () => {
    const det = cellDetail(29)
    expect(det).toMatchObject({
      transitPlanet: 'Mars',
      aspect: 'conjunction',
      natalPoint: 'Moon',
      transitSign: 'Virgo',
      transitDeg: 1,
    })
    near(det.orb, 2.9)
    const vm = buildMonthViewModel(en.month, en.day, { lang: 'en', nowIso: NOW_ISO })
    const row = vm.keyDays.find((k) => k.ds === '11-29')
    expect(JSON.stringify(row)).toContain('Transit · 1° Virgo · conjunct natal Moon · orb 2.9°')
  })

  it('11-24 태양 △ 본명 태양 — 정오 1° 사수자리 · orb ≈1.2°', () => {
    const det = cellDetail(24)
    expect(det).toMatchObject({
      transitPlanet: 'Sun',
      aspect: 'trine',
      natalPoint: 'Sun',
      transitSign: 'Sagittarius',
      transitDeg: 1,
    })
    near(det.orb, 1.2)
  })

  it('같은 트랜짓 구간(화성 ☌ 달)이라도 날마다 orb 가 다르다 — 구간 최소값 한 개가 아니다', () => {
    const marsMoon = en.month.calendar
      .filter((c) => c.d >= 18 && c.reason?.astroDetail?.transitPlanet === 'Mars')
      .filter((c) => c.reason!.astroDetail!.natalPoint === 'Moon')
      .map((c) => c.reason!.astroDetail!.orb)
    expect(marsMoon.length).toBeGreaterThanOrEqual(4)
    expect(new Set(marsMoon).size).toBe(marsMoon.length)
    // 근거가 있는 모든 날(고른 날 읽기 포함) — 트랜짓 부모면 위치와 orb 를 함께 싣는다.
    for (const c of en.month.calendar) {
      const det = c.reason?.astroDetail
      if (!det?.aspect) continue
      expect(det.transitSign, c.ds).toEqual(expect.any(String))
      expect(det.orb, c.ds).toEqual(expect.any(Number))
    }
  })

  it('/api/calendar/day 경로(assembleDayTier 단독) — 11-29 근거의 orb 도 같은 순간 ≈2.9°', async () => {
    const [focus] = await buildCalendar(
      sampleNatal,
      { start: '2026-11-29T00:00:00.000Z', end: '2026-11-29T23:59:59.999Z', granularity: 'day' },
      { includeEvidence: true }
    )
    const day = await assembleDayTier({
      natal: sampleNatal,
      cells: sampleMonthCells,
      lang: 'en',
      targetDayIso: '2026-11-29',
      focusDayCell: focus,
      now: new Date(NOW_ISO),
    })
    expect(day.reason?.astroDetail).toEqual(cellDetail(29))
    near(day.reason?.astroDetail?.orb, 2.9)
  }, 120_000)

  it('사다리 — 이번 달은 오늘의 4칸, 10년 = 대운 2021–2030, 올해 칸에 첫 토성 회귀, EN 칸에 한글 없음', () => {
    const vm = buildMonthViewModel(en.month, en.day, { lang: 'en', nowIso: NOW_ISO })
    expect(vm.ladderSource).toBe('day')
    expect(vm.ladder.map((r) => r.scale)).toEqual(['decadal', 'yearly', 'monthly', 'daily'])
    const rungs = en.day.evidenceLadderEn!
    expect(rungs[0].range).toEqual({ start: '2021-03-21', end: '2031-03-20' })
    expect(vm.ladder[0].range).toBe('2021–2030')
    expect(rungs[1].astro?.event).toMatchObject({
      kind: 'saturn_return_1',
      en: 'First Saturn return',
    })
    expect(vm.ladder[1].stars?.sub).toMatch(/First Saturn return/)
    const shown = rungs.map((r) => ({
      ...r,
      saju: r.saju && { en: r.saju.en, hanja: r.saju.hanja },
      astro: r.astro && { ...r.astro, event: r.astro.event?.en },
    }))
    expect(HANGUL.test(JSON.stringify(shown))).toBe(false)
    expect(HANGUL.test(JSON.stringify(vm.ladder))).toBe(false)
  })

  it('EN 월·일 뷰모델에 한글이 없다', () => {
    const month = buildMonthViewModel(en.month, en.day, { lang: 'en', nowIso: NOW_ISO })
    const day = buildDayViewModel(en.day, { lang: 'en', sex: '여' })
    expect(HANGUL.test(JSON.stringify(month))).toBe(false)
    expect(HANGUL.test(JSON.stringify({ ...day, byArea: null }))).toBe(false)
  })

  it('결정론 — 같은 nowIso 면 어셈블·뷰모델이 깊은 동일', async () => {
    const again = await assembleSample('en')
    expect(again.month).toEqual(en.month)
    expect(buildMonthViewModel(again.month, again.day, { lang: 'en', nowIso: NOW_ISO })).toEqual(
      buildMonthViewModel(en.month, en.day, { lang: 'en', nowIso: NOW_ISO })
    )
  }, 120_000)
})
