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
const { withTransitPositions } = await import('@/lib/calendar-view/astroDetail')

type Assembled = Awaited<ReturnType<typeof assembleTiers>>

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
  // 프로덕션(loadTierData)과 같은 모집단 — 그 달 cells 만(evidence 없음) + 오늘 셀(evidence).
  const cells = await buildCalendar(
    natal,
    { start: '2026-11-01T00:00:00.000Z', end: '2026-11-30T23:59:59.999Z', granularity: 'day' },
    { includeEvidence: false }
  )
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

  it("11-17 '왜' 근거 — 상관(傷官) × 태양 ▼, 점성 부모 Sun □ Moon(월 셀 이름에서)", () => {
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
    // 월 셀엔 evidence 가 없어 orb 를 지어내지 않는다.
    expect(r.astroDetail).not.toHaveProperty('orb')
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
      SEOUL
    )
    expect(sun.transitSign).toBe('Scorpio')
    expect(sun.transitDeg).toBe(26)
  })

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
