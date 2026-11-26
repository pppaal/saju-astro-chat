/**
 * 인생 흐름 뷰모델(A4) + Life 데이터 층(assembleLifetime 의 v9.2 필드).
 *
 *  1. 샘플 1997-03-21 14:30 여 서울, now 2026-11-19 — /destiny 와 같은 길(buildNatalContext →
 *     그날 셀 → assembleLifetime)을 실제 천체력으로:
 *     · 강점 글자: 재물 [丁 연, 丁 시] · 명예 [丑, 戌, 未] · 배움 [] · 재능 [卯] · 추진 [癸],
 *       개수 = sibsinRadar(엔진 categoryCount). 시간 미상이면 시주 글자 없음 · 추정.
 *     · 다음 인생 마디 {2033, 35, 'The last expansion window before midlife.'} — 대운 경계 아님,
 *       'next major turn' 문구 없음(FIX9b E7). 홈 다이얼(SAMPLE_DIAL.turn)과 같은 값.
 *     · 공유 블록의 사주 타입 · 인생 모양 = 홈 사주 카드(SAMPLE_CARD).
 *     · 뷰모델 en 에 한글 없음 · LIFE TURN 은 丁未 행 · 시간표 캡션 · 겹침 빈 상태(결정 13).
 *     · 결정론: 같은 now 로 두 번 → 깊은 비교로 같음.
 *  2. 순수 — 겹침 행이 있을 때의 칸 · 캡션, 빈 상태, 시간 미상 캡션, 부(副) 경로.
 *  3. 가드 — lifeCrossCheck · lifetimeViewModel 소스에 new Date() 없음.
 *
 * @vitest-environment node
 */
import { it, expect, vi, describe } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

vi.unmock('swisseph')
vi.unmock('@/lib/astrology/foundation/ephe')

const { describeRealEphemeris } = await import('../../helpers/realEphemeris')
const { buildNatalContext } = await import('@/lib/calendar-engine/context/build')
const { buildCalendar } = await import('@/lib/calendar-engine')
const { assembleLifetime } = await import('@/app/calendar/assembleLifetime')
const { buildLifetimeViewModel, splitLastWord, LIFE_READ_YEARS } =
  await import('@/lib/calendar-view/lifetimeViewModel')
const { SAMPLE_CARD, SAMPLE_DIAL } = await import('@/app/(main)/home/sampleCard')

type Lifetime = Awaited<ReturnType<typeof assembleLifetime>>['lifetime']
type User = Awaited<ReturnType<typeof assembleLifetime>>['user']

const NOW = new Date('2026-11-19T03:00:00Z')
const TODAY = '2026-11-19'
const SAMPLE = {
  birthDate: '1997-03-21',
  birthTime: '14:30',
  gender: 'female' as const,
  latitude: 37.5665,
  longitude: 126.978,
  timeZone: 'Asia/Seoul',
}
const HANGUL = /[가-힣]/

async function sampleLife(opts: { timeUnknown?: boolean } = {}) {
  const timeUnknown = opts.timeUnknown === true
  const natal = await buildNatalContext({
    ...SAMPLE,
    birthTime: timeUnknown ? '12:00' : SAMPLE.birthTime,
    birthTimeUnknown: timeUnknown,
    now: NOW,
  })
  const [cell] = await buildCalendar(
    natal,
    { start: `${TODAY}T00:00:00.000Z`, end: `${TODAY}T23:59:59.999Z`, granularity: 'day' },
    { includeEvidence: true }
  )
  const run = () =>
    assembleLifetime({
      natal,
      lang: 'en',
      birthYear: 1997,
      targetYear: 2026,
      sex: '여',
      birthDisplay: timeUnknown ? '1997.3.21' : '1997.3.21 14:30',
      whoBirthLine: timeUnknown ? '1997.3.21' : '1997.3.21 14:30',
      place: 'Seoul',
      now: NOW,
      todayIso: TODAY,
      focusDayCell: cell ?? null,
      gender: 'female',
      timeUnknown,
      cityUnknown: false,
    })
  return { first: await run(), second: await run() }
}

/** 화면 데이터의 모든 문자열(재귀). */
function strings(v: unknown, out: string[] = []): string[] {
  if (typeof v === 'string') out.push(v)
  else if (Array.isArray(v)) v.forEach((x) => strings(x, out))
  else if (v && typeof v === 'object') Object.values(v).forEach((x) => strings(x, out))
  return out
}

describeRealEphemeris('Life 데이터 층 — 샘플 (real ephemeris)', () => {
  it('강점 글자 · 개수 = sibsinRadar · 시주 글자 포함(추정 아님)', async () => {
    const { first } = await sampleLife()
    const radar = first.lifetime.sibsinRadar!
    const chars = Object.fromEntries(
      radar.map((a) => [a.labelEn, a.chars?.map((c) => `${c.ch} ${c.pillar}`)])
    )
    expect(chars).toEqual({
      Wealth: ['丁 year', '丁 hour'],
      Status: ['丑 year', '戌 day', '未 hour'],
      Support: [],
      Creativity: ['卯 month'],
      Drive: ['癸 month'],
    })
    for (const a of radar) expect(a.chars?.length).toBe(a.count)
    expect(radar.some((a) => a.estimated)).toBe(false)
  }, 120000)

  it('시간 미상: 시주 글자 없음 · 개수 = 세 기둥 categoryCount · 추정 플래그', async () => {
    const { first } = await sampleLife({ timeUnknown: true })
    const radar = first.lifetime.sibsinRadar!
    const all = radar.flatMap((a) => a.chars ?? [])
    expect(all.some((c) => c.pillar === 'hour')).toBe(false)
    for (const a of radar) {
      expect(a.chars?.length).toBe(a.count)
      expect(a.estimated).toBe(true)
    }
    const vm = buildLifetimeViewModel(first, { lang: 'en' })
    expect(vm.strengths?.estimated).toBe(true)
    expect(vm.strengths?.caption).toMatch(/Birth time unknown/)
    expect(vm.strengths?.caption).not.toMatch(/hour pillar/)
    // 상단 칩 · 폴리오 — 시간 미상이면 시각 없이.
    expect(first.topbar.birthLine).toBe('1997.3.21')
    expect(first.topbar.birthDate).toBe('1997.3.21')
  }, 120000)

  it('시간 미상(QA-2): 태양 · 달은 별자리만(°′ 없음) · 그날 달이 사자→처녀라 리포트와 같은 안내 · 판정 그대로', async () => {
    const { first } = await sampleLife({ timeUnknown: true })
    const cc = first.lifetime.crossCheck!
    // 정오 앵커의 달은 사자자리 27°(14:30 이면 28°17′) — 현지 18시 무렵 처녀자리로 넘어간다.
    expect(cc.moonSignMayDiffer).toBe(true)
    expect(cc.rows.en.find((r) => r.key === 'identity')?.starsSub).toEqual([
      { body: 'Sun', sign: 'Aries' },
    ])
    expect(cc.rows.en.find((r) => r.key === 'needs')?.starsSub).toEqual([
      { body: 'Moon', sign: 'Leo' },
    ])
    // 판정 · 집계는 그대로 — evalNeeds 는 정오 앵커 달 별자리(CALCULATION_SPEC §6).
    expect(cc.rows.en.find((r) => r.key === 'needs')?.verdict).toBeTruthy()
    const t = cc.tally
    expect(t.same + t.supportive + t.twoPulls + t.unrelated).toBe(t.total)

    const en = buildLifetimeViewModel(first, { lang: 'en' }).traits!
    const ko = buildLifetimeViewModel(first, { lang: 'ko' }).traits!
    expect(en.rows.find((r) => r.key === 'identity')?.stars?.sub).toBe('Sun Aries')
    expect(en.rows.find((r) => r.key === 'needs')?.stars?.sub).toBe('Moon Leo')
    expect(ko.rows.find((r) => r.key === 'identity')?.stars?.sub).toBe('태양 양자리')
    expect(ko.rows.find((r) => r.key === 'needs')?.stars?.sub).toBe('달 사자자리')
    for (const vm of [en, ko]) {
      const subs = vm.rows.flatMap((r) => [
        r.stars?.sub ?? '',
        ...(r.stars?.points ?? []).map((p) => p.text),
      ])
      expect(subs.join(' | ')).not.toMatch(/\d+°/)
    }
    expect(en.caveat).toBe('Without a birth time, your Moon sign may differ.')
    expect(ko.caveat).toBe('태어난 시각을 몰라 달의 별자리도 바뀔 수 있어요.')
  }, 120000)

  it('시각을 알면 도 · 분 그대로이고 안내 없음', async () => {
    const { first } = await sampleLife()
    expect(first.lifetime.crossCheck?.moonSignMayDiffer).toBeUndefined()
    expect(buildLifetimeViewModel(first, { lang: 'en' }).traits?.caveat).toBeNull()
  }, 120000)

  it('moonChangesSignOnBirthDay — 1997-03-21 서울은 바뀌고(사자→처녀), 1997-03-22 는 하루 내내 처녀', async () => {
    const { moonChangesSignOnBirthDay } = await import('@/lib/report/lifeCrossCheck')
    const natalOn = (birthDate: string) =>
      buildNatalContext({
        ...SAMPLE,
        birthDate,
        birthTime: '12:00',
        birthTimeUnknown: true,
        now: NOW,
      })
    expect(moonChangesSignOnBirthDay(await natalOn('1997-03-21'))).toBe(true)
    expect(moonChangesSignOnBirthDay(await natalOn('1997-03-22'))).toBe(false)
  }, 120000)

  it("다음 인생 마디 {2033, 35} — 'The last expansion window before midlife.', 홈 다이얼과 같음", async () => {
    const { first } = await sampleLife()
    const turn = first.lifetime.nextLifeTurn
    expect(turn).toEqual({
      year: 2033,
      age: 35,
      label: '세 번째 목성 회귀 — 인생 중반 직전의 확장',
      labelEn: 'Third Jupiter return',
      meaningCore: '인생 중반에 들어서기 직전, 마지막 큰 확장의 기회예요.',
      meaningCoreEn: 'The last expansion window before midlife.',
    })
    expect(SAMPLE_DIAL.turn).toEqual({ year: turn!.year, age: turn!.age })
    expect(JSON.stringify(first)).not.toMatch(/next major turn/i)
  }, 120000)

  it('공유 블록 = 홈 사주 카드(사주 타입 · 인생 모양) · 화면 기둥은 연 · 월 · 일', async () => {
    const { first } = await sampleLife()
    const share = first.lifetime.share!
    expect(share.crossType).toEqual(SAMPLE_CARD.typeName)
    expect(share.lifeShape).toEqual(SAMPLE_CARD.lifeShape)
    expect(share.screenPillars).toEqual([
      SAMPLE_CARD.pillars.year,
      SAMPLE_CARD.pillars.month,
      SAMPLE_CARD.pillars.day,
    ])
    expect(first.topbar).toMatchObject({
      birthDate: '1997.3.21',
      birthLine: '1997.3.21 14:30',
      ilganHanja: '壬',
    })
  }, 120000)

  it('뷰모델 en: 한글 없음 · LIFE TURN 은 丁未 행 · 시간표 캡션 · 겹침 빈 상태 · 축 집계', async () => {
    const { first } = await sampleLife()
    const vm = buildLifetimeViewModel(first, { lang: 'en', todayIso: TODAY })
    // share.pillars 는 카드 데이터(roman · hangul 둘 다 — SajuCard 가 locale 로 고른다)라 뺀다.
    const { share, ...screen } = vm
    const hangul = strings({ ...screen, share: { ...share, pillars: [] } }).filter((s) =>
      HANGUL.test(s)
    )
    expect(hangul).toEqual([])
    expect(share?.pillars.map((p) => p.roman)).toEqual(['Jeongchuk', 'Gyemyo', 'Imsul'])

    // 히어로
    expect(vm.hero.shape).toBe('Ups and downs')
    expect(vm.hero.h1).toEqual({ lead: 'Ups and', last: 'downs' })
    expect(vm.hero.range).toEqual({ from: 1997, to: 1997 + LIFE_READ_YEARS, label: '1997–2081' })
    expect(vm.hero.lede).toBe('Rides the waves.')
    expect(vm.hero.now).toEqual({ age: 29, year: 2026, note: 'Living your young adulthood' })
    expect(vm.hero.nextTurn).toEqual({
      age: 35,
      year: 2033,
      label: 'Third Jupiter return',
      note: 'The last expansion window before midlife.',
    })
    expect(vm.reading?.lead).toBe(
      'For you, good stretches and hard stretches swing back and forth in a big way.'
    )

    // 겹침 — 샘플은 정직성 게이트 통과 행이 없다 → 빈 상태(결정 13).
    expect(vm.overlap.rows).toEqual([])
    expect(vm.overlap.empty).toMatch(/^No overlapping signal this decade\./)
    expect(vm.overlap.rangeLabel).toBe('This decade · 2021–2030')

    // 축별 교차
    expect(vm.traits?.tally).toEqual({
      same: 7,
      supportive: 6,
      twoPulls: 3,
      unrelated: 0,
      total: 16,
    })
    expect(vm.traits?.rows.map((r) => r.key)).toEqual([
      'identity',
      'temperament',
      'relations',
      'fortune',
      'needs',
    ])
    const identity = vm.traits!.rows[0]
    expect(identity.saju).toEqual({
      text: 'Water',
      w: 'fluid and permeating',
      sub: 'Day master 壬',
    })
    expect(identity.stars?.sub).toBe('Sun 0°38′ Aries · ASC 10°02′ Leo')
    expect(vm.traits!.rows[4].stars?.sub).toBe('Moon 28°17′ Leo')
    expect(vm.traits!.rows[2].phrase).toBe('Unions in your saju, soft aspects in your chart.')
    expect(vm.traits?.moreLabel).toBe('18 traits in your full report')

    // 강점
    expect(vm.strengths?.heading).toBe('Your strongest thread is Status.')
    expect(vm.strengths?.rows.find((r) => r.strongest)?.label).toBe('Status')
    expect(vm.strengths?.caption).toContain('hidden hour pillar 丁未')
    expect(vm.strengths?.elements.map((e) => `${e.label} ${e.count}`)).toEqual([
      'Wood 1',
      'Fire 2',
      'Earth 3',
      'Metal 0',
      'Water 2',
    ])

    // 10년 시간표
    const turnRow = vm.decades.rows.find((r) => r.lifeTurn)
    expect(turnRow?.gz).toBe('丁未')
    expect(turnRow?.lifeTurn).toEqual({ label: 'LIFE TURN', year: 2033, age: 35 })
    expect(vm.decades.rows.filter((r) => r.lifeTurn)).toHaveLength(1)
    expect(vm.decades.caption).toBe('Themes name a decade’s topic, not its quality.')
    const nowRow = vm.decades.rows.find((r) => r.state === 'now')
    expect(nowRow).toMatchObject({
      gz: '丙午',
      years: '2021–2030',
      theme: 'Opportunity & money',
      roman: 'Byeongo · age 24–33',
      element: 'fire',
    })
    expect(nowRow?.yrow).toEqual({
      text: '2026 runs on 丙午 too.',
      link: 'See it day by day',
      href: '/calendar',
    })
    expect(vm.decades.rows.map((r) => r.state)).toEqual([
      'past',
      'past',
      'now',
      'future',
      'future',
      'future',
      'future',
      'future',
      'far',
      'far',
    ])

    // 곡선 — 0–84세로 자르고 표지(지금 · 다음 마루 · 주의 저점) · 대운 띠.
    expect(vm.curve?.points.every((p) => p.age <= LIFE_READ_YEARS)).toBe(true)
    expect(vm.curve?.markers).toEqual(
      expect.arrayContaining([
        { kind: 'now', age: 29, year: 2026 },
        { kind: 'crest', age: 56, year: 2053 },
        { kind: 'dip', age: 39, year: 2036 },
      ])
    )
    expect(vm.curve?.eras[0]).toEqual({ from: 2001, to: 2011, element: 'wood', gz: '甲辰' })
    expect(vm.curve?.eras.at(-1)?.to).toBe(2081)
    expect(vm.curve?.heading).toEqual({
      main: 'Right now the flow is even.',
      sub: 'Next crest around 56.',
    })

    // 전략 — EN 필드 · 재물 h3/p 분리
    expect(vm.strategy?.lucky).toEqual({
      label: 'Lucky colors · Metal 金',
      colors: 'White · Silver · Gold',
      direction: 'West',
      numbers: '4 · 9',
    })
    expect(vm.strategy?.allies?.animals).toBe('Rabbit · Snake')
    expect(vm.strategy?.allies?.tiles).toEqual([
      { ch: '卯', el: 'wood' },
      { ch: '巳', el: 'fire' },
    ])
    expect(vm.strategy?.wealth).toEqual({
      h3: 'Position is your wealth.',
      p: 'You build steadily inside a role or org.',
    })
    expect(vm.share?.typeName).toBe('steady-building Free Spirit')
  }, 120000)

  it('뷰모델 ko: 같은 구조 · 한글 문구', async () => {
    const { first } = await sampleLife()
    const vm = buildLifetimeViewModel(first, { lang: 'ko' })
    expect(vm.hero.now.note).toBe('청년기를 지나는 중')
    expect(vm.decades.rows.find((r) => r.lifeTurn)?.lifeTurn?.label).toBe('인생 전환')
    expect(vm.decades.caption).toBe('주제는 그 10년의 화제를 말할 뿐, 좋고 나쁨을 말하지 않아요.')
    expect(vm.overlap.empty).toMatch(/^이번 10년엔 겹치는 신호가 없어요\./)
    expect(vm.strengths?.heading).toBe('가장 센 결은 명예·직장이에요.')
    expect(vm.traits?.rows[0].stars?.sub).toBe('태양 양자리 0°38′ · 상승 사자자리 10°02′')
  }, 120000)

  it('결정론: 같은 now 로 두 번 assembleLifetime → 깊은 비교로 같음', async () => {
    const { first, second } = await sampleLife()
    expect(second).toEqual(first)
    expect(buildLifetimeViewModel(second, { lang: 'en' })).toEqual(
      buildLifetimeViewModel(first, { lang: 'en' })
    )
  }, 120000)
})

// ─── 순수 — 손으로 만든 페이로드 ────────────────────────────────────────────

function fixture(over: Partial<Lifetime> = {}): { lifetime: Lifetime; user: User } {
  const daewoon = [
    { hanja: '甲辰', kr: '갑진', en: 'gapjin', start: 2001, sibsin: '식신', startAge: 4 },
    { hanja: '乙巳', kr: '을사', en: 'eulsa', start: 2011, sibsin: '상관', startAge: 14 },
    { hanja: '丙午', kr: '병오', en: 'byeongo', start: 2021, sibsin: '편재', startAge: 24 },
    { hanja: '丁未', kr: '정미', en: 'jeongmi', start: 2031, sibsin: '정재', startAge: 34 },
  ].map((d) => ({
    gz: { hanja: d.hanja, kr: d.kr, en: d.en },
    start: d.start,
    end: d.start + 10,
    startAge: d.startAge,
    endAge: d.startAge + 10,
    sibsin: d.sibsin,
    known: true,
    now: d.start === 2021,
  }))
  const lifetime = {
    birthYear: 1997,
    currentYear: 2026,
    nowAge: 29,
    daewoon,
    lifeStages: [],
    milestones: [],
    ...over,
  } as Lifetime
  const user = {
    ilgan: { hanja: '壬', kr: '임수', en: 'Im · Yang Water', element: '수' },
    elements: { 목: 1, 화: 2, 토: 3, 금: 0, 수: 2 },
  } as unknown as User
  return { lifetime, user }
}

describe('lifetimeViewModel — 순수', () => {
  it('겹침 행: SAJU 한자 · STARS 생애 마디 · 품위 · 본명 도 · ▲ · 캡션(트랜짓 · 본명)', () => {
    const { lifetime, user } = fixture({
      decadeCross: [
        {
          saju: '정재',
          sajuEn: 'Direct Wealth',
          sajuHanja: '正財',
          sajuSource: { pillar: 'daeun', part: 'stem', gz: '丁未' },
          astro: '토성',
          astroEn: 'Saturn',
          astroEvent: { ko: '첫 토성 회귀', en: 'First Saturn return' },
          natal: { sign: 'Aries', deg: 9, min: 2 },
          dignity: 'fall',
          transit: { sign: 'Aries', deg: 8, min: 21 },
          meaning: '꾸준한 가치가 시간과 함께 단단해져요.',
          meaningEn: 'steady value hardens with time.',
          polarity: 2,
        },
      ],
    })
    const en = buildLifetimeViewModel({ lifetime, user }, { lang: 'en', todayIso: '2026-11-19' })
    expect(en.overlap.empty).toBeNull()
    expect(en.overlap.rows).toEqual([
      {
        saju: { text: 'Direct Wealth', hanja: '正財' },
        stars: { text: 'Saturn', glyph: 'saturn', sub: 'First Saturn return · in fall · 9° Aries' },
        mark: 'up',
        note: 'Steady value hardens with time.',
      },
    ])
    expect(en.overlap.caption).toBe(
      'Transit Saturn stands at 8°21′ Aries (Nov 19, 2026), natal Saturn at 9°02′ Aries.'
    )
    expect(strings(en).filter((s) => HANGUL.test(s))).toEqual([])
    const ko = buildLifetimeViewModel({ lifetime, user }, { lang: 'ko', todayIso: '2026-11-19' })
    expect(ko.overlap.rows[0].stars.sub).toBe('첫 토성 회귀 · 추락 · 양자리 9°')
    expect(ko.overlap.caption).toBe(
      '트랜짓 토성은 양자리 8°21′(2026년 11월 19일), 본명 토성은 양자리 9°02′에 있어요.'
    )
  })

  it('겹침 없음 → 빈 상태(결정 13) · 캡션 없음', () => {
    const vm = buildLifetimeViewModel(fixture({ decadeCross: [] }), { lang: 'en' })
    expect(vm.overlap.rows).toEqual([])
    expect(vm.overlap.empty).toBeTruthy()
    expect(vm.overlap.caption).toBeNull()
  })

  it('정점이 있으면 그 해 행에 정점 절 · 없는 섹션은 null', () => {
    const vm = buildLifetimeViewModel(
      fixture({
        lifePattern: {
          key: 'late-bloomer',
          ko: '대기만성형',
          en: 'Late bloomer',
          line: '',
          lineEn: '',
          lead: '머리',
          leadEn: 'Lead.',
          body: '본문',
          bodyEn: 'Body.',
          tagline: '늦게 피어 오래가는',
          taglineEn: 'Blooms late, lasts long',
          peak: {
            age: 36,
            year: 2033,
            past: false,
            note: '특히 2033년(36세) 무렵부터…',
            noteEn: 'It opens widest around 2033 (age 36) onward.',
          },
          daeun: [],
        },
      }),
      { lang: 'en', calendarHref: '/calendar?date=1997-03-21' }
    )
    expect(vm.hero.h1).toEqual({ lead: 'Late', last: 'bloomer' })
    expect(vm.hero.lede).toBe('Blooms late, lasts long.')
    expect(vm.reading).toEqual({ lead: 'Lead.', body: 'Body.' })
    expect(vm.decades.rows.find((r) => r.peakNote)?.gz).toBe('丁未')
    expect(vm.decades.rows.find((r) => r.state === 'now')?.yrow).toBeUndefined() // thisYear 없음
    expect(vm.traits).toBeNull()
    expect(vm.strengths).toBeNull()
    expect(vm.curve).toBeNull()
    expect(vm.strategy).toBeNull()
    expect(vm.share).toBeNull()
    expect(vm.hero.nextTurn).toBeNull()
  })

  it('splitLastWord — 한 단어면 lead 가 빈 문자열', () => {
    expect(splitLastWord('굴곡형')).toEqual({ lead: '', last: '굴곡형' })
    expect(splitLastWord('Smooth path')).toEqual({ lead: 'Smooth', last: 'path' })
  })
})

describe('결정론 가드', () => {
  it('lifeCrossCheck · lifetimeViewModel 은 시계를 읽지 않는다(new Date() 없음)', () => {
    const root = path.resolve(__dirname, '../../../src')
    for (const f of ['lib/report/lifeCrossCheck.ts', 'lib/calendar-view/lifetimeViewModel.ts']) {
      const src = readFileSync(path.join(root, f), 'utf8')
      expect(src, f).not.toMatch(/new Date\(/)
      expect(src, f).not.toMatch(/Date\.now\(/)
    }
  })
})
