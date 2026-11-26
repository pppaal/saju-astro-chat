/**
 * dayViewModel — Daily 탭: 히어로, '왜 오늘' 행(= day.reason), 사다리(구조 칸), DO/EASE, 분야별,
 * 교차 행. 사다리 칸 모양(라벨·기간·SAJU·STARS)도 여기서 본다.
 */
import { describe, it, expect } from 'vitest'
import {
  buildDayViewModel,
  toLadderRows,
  toTimingRow,
  ladderRangeLabel,
} from '@/lib/calendar-view/dayViewModel'
import type { DestinyDay } from '@/types/calendar'
import type { EvidenceRung } from '@/lib/calendar-engine/derivers/evidenceLadder'
import { makeV9Day, dayRungs, TODAY_REASON } from './_v9Month'

const HANGUL = /[ㄱ-ㆎ가-힣]/
/** 줄바꿈 없는 공백(U+00A0) — STARS 보조 줄의 값 조각 안(QA VC-8). */
const NB = '\u00A0'
const nb = (t: string) => t.replace(/ /g, NB)
/** 조각 사이 구분 — 점 앞은 NBSP, 뒤는 보통 공백(줄이 '·' 로 열리지 않게, QA R-VC-6). */
const SEP = `${NB}· `
/** 조각마다 공백을 NBSP 로, 조각 사이는 SEP(astroDetailSub 모양). */
const sub = (...parts: string[]) => parts.map(nb).join(SEP)

describe('buildDayViewModel', () => {
  it("히어로·'왜'·사다리·DO/EASE·분야별·교차 — 한 화면 데이터", () => {
    const vm = buildDayViewModel(makeV9Day(), { lang: 'en', sex: '여' })
    expect(vm.iso).toBe('2026-11-19')
    expect(vm.hero.label).toBe('Today · Thursday')
    expect(vm.hero.toneWord).toBe('A steady day')
    expect(vm.hero.windWord).toBe('Calm')
    expect(vm.hero.line).toBe('A steady, uneventful day — good for the basics.')
    expect(vm.why).toEqual(toTimingRow(TODAY_REASON, 'en'))
    expect(vm.ladder.map((r) => r.scale)).toEqual(['decadal', 'yearly', 'monthly', 'daily'])
    expect(vm.tryThis?.do).toHaveLength(3)
    expect(vm.tryThis?.ease.length).toBeGreaterThanOrEqual(2)
    expect(vm.byArea?.areas).toHaveLength(6)
    // 맨 위 교차 = '왜' 근거(구조 칸 포함), 같은 페어는 한 번만.
    expect(vm.crossings[0]).toEqual(vm.why)
    expect(vm.crossings).toHaveLength(2)
    expect(vm.crossings[1]).toMatchObject({
      saju: { hanja: '偏財', text: 'Indirect Wealth' },
      stars: { glyph: 'mars', text: 'Mars' },
      mark: 'down',
      note: 'Impulse leaks into spending.',
    })
  })

  it('가장 센 교차가 흉이면 조심 쪽 — "받쳐주는 흐름" 문구 없음 (DayTier 감사 #8 이식)', () => {
    const day = {
      ...makeV9Day(),
      reason: undefined,
      topReasons: [],
      topReasonsEn: [],
      cautions: [],
      cautionsEn: [],
      crossActivations: [
        {
          id: 'x',
          sajuSide: '겁재',
          astroSide: '화성',
          sajuKo: '겁재',
          astroKo: '화성',
          meaning: '경쟁과 충동의 결이 두 배로 강해져요. 큰 돈과 관계 결정은 한 박자 늦추세요.',
          meaningEn: 'Rivalry and impulse double up — slow big money and relationship calls.',
          polarity: -2,
          weight: 0.5,
          layer: 'daily',
        },
      ],
    } as DestinyDay
    const vm = buildDayViewModel(day, { lang: 'ko' })
    expect(vm.hero.why).not.toContain('받쳐주는 흐름이 같이 와요')
    expect(vm.why).toBeNull()
    expect(vm.crossings[0]).toMatchObject({ mark: 'down', saju: { hanja: '劫財', text: '겁재' } })
  })

  it('EN 화면 문구에 한글이 없다', () => {
    const vm = buildDayViewModel(makeV9Day(), { lang: 'en' })
    const strip = JSON.stringify({ ...vm, byArea: null })
    expect(HANGUL.test(strip)).toBe(false)
  })

  it('미성년 — 화면 문구를 minorSafe 로 정화(성인 도메인 → 연령 적합)', () => {
    const day = makeV9Day({ isMinor: true })
    const vm = buildDayViewModel(day, { lang: 'en' })
    expect(vm.why?.note).toBe('Good for recognition from teachers and grown-ups, and the stage')
    const adult = buildDayViewModel(makeV9Day(), { lang: 'en' })
    expect(adult.why?.note).toBe('Favours recognition from above, promotion, and the formal stage')
  })
})

describe('toTimingRow — 근거 → 교차 행', () => {
  it('SAJU 한자·값, STARS 기호·값·보조 줄(위치·어스펙트·orb), 부호 → 마크', () => {
    expect(toTimingRow(TODAY_REASON, 'en')).toEqual({
      saju: { hanja: '正官', text: 'Direct Officer' },
      stars: {
        glyph: 'sun',
        text: 'Sun',
        sub: sub('Transit', '26° Scorpio', 'trine natal Venus', 'orb 0.3°'),
      },
      mark: 'up',
      note: 'Favours recognition from above, promotion, and the formal stage',
      astroDetail: TODAY_REASON.astroDetail,
    })
    const ko = toTimingRow(TODAY_REASON, 'ko')
    expect(ko.saju.text).toBe('정관')
    expect(ko.stars.sub).toBe(sub('트랜짓', '전갈자리 26°', '본명 금성 트라인', '오브 0.3°'))
  })

  it('부호 0 근거는 마크 없음(합의·방향을 지어내지 않는다)', () => {
    expect(toTimingRow({ ...TODAY_REASON, polarity: 0 }, 'en').mark).toBeUndefined()
  })
})

describe('toLadderRows — 사다리 칸', () => {
  it('en — 라벨·기간·SAJU·STARS(ZR 랏 · 품위 + 회귀 사건 · 트랜짓)', () => {
    const rows = toLadderRows(dayRungs('en'), 'en')
    expect(rows.map((r) => [r.label, r.range])).toEqual([
      ['10-yr cycle', '2021–2030'],
      ['This year', '2026'],
      ['This month', 'Nov 2026'],
      ['Today', '11.19'],
    ])
    expect(rows[0].saju).toEqual({ hanja: '正財', text: 'Direct Wealth' })
    // ZR — 랏마다 한 줄, 별자리 뒤에 그 별자리의 전통 지배 행성 기호(황소 ♀ · 물병 ♄ — FIX9b F7, VC-9).
    // 랏 이름·별자리는 한 덩어리(줄바꿈 없는 공백, VC-8) — 줄은 기호 뒤 기간 앞에서만 갈린다.
    expect(rows[0].stars).toEqual({
      text: 'Zodiacal releasing',
      sub: `${nb('Spirit in Taurus')} 2024–32${SEP}${nb('Fortune in Aquarius')} 2024–54`,
      subLines: [
        { text: nb('Spirit in Taurus'), glyph: 'venus', tail: '2024–32' },
        { text: nb('Fortune in Aquarius'), glyph: 'saturn', tail: '2024–54' },
      ],
    })
    expect(rows[1].stars).toEqual({
      glyph: 'saturn',
      text: 'Saturn',
      sub: `${nb('In fall')}${SEP}${nb('in Aries')}${SEP}First Saturn return`,
    })
    expect(rows[2].stars).toBeNull()
    expect(rows[3].stars).toEqual({
      glyph: 'sun',
      text: 'Sun △ Venus',
      sub: sub('Transit Sun', 'natal Venus'),
    })
    expect(rows[3].now).toBe(true)
    expect(HANGUL.test(JSON.stringify(rows))).toBe(false)
  })

  it('ko — 같은 구조를 한국어로', () => {
    const rows = toLadderRows(dayRungs('ko'), 'ko')
    expect(rows[0]).toMatchObject({ label: '10년 대운', range: '2021–2030' })
    expect(rows[0].saju).toEqual({ hanja: '正財', text: '정재' })
    expect(rows[0].stars?.sub).toBe(
      `${nb('영혼 황소자리')} 2024–32${SEP}${nb('운명 물병자리')} 2024–54`
    )
    expect(rows[0].stars?.subLines?.map((l) => l.glyph)).toEqual(['venus', 'saturn'])
    // 품위는 음역(폴) 대신 쉬운 말 + 괄호 용어(QA R-CA-5).
    expect(rows[1].stars?.sub).toBe(`${nb('약한 자리(추락)')}${SEP}양자리${SEP}첫 토성 회귀`)
    expect(rows[2].range).toBe('2026년 11월')
    expect(rows[3].stars).toMatchObject({
      text: '태양 △ 금성',
      sub: sub('트랜짓 태양', '본명 금성'),
    })
  })

  it("오늘이 아닌 날 — 일 칸 'This day' / '이날', NOW 점 없음, 결론의 '오늘'은 그날 말로(QA VC-3)", () => {
    const en = toLadderRows(dayRungs('en'), 'en', { isToday: false })
    expect(en[3]).toMatchObject({ label: 'This day', range: '11.19', now: false })
    expect(en[3].sentence).not.toMatch(/\btoday\b/i)
    expect(en.some((r) => r.now)).toBe(false)
    // 다른 칸은 그대로.
    expect(en.slice(0, 3).map((r) => r.label)).toEqual(['10-yr cycle', 'This year', 'This month'])
    const ko = toLadderRows(dayRungs('ko'), 'ko', { isToday: false })
    expect(ko[3]).toMatchObject({ label: '이날', now: false })
    expect(ko[3].sentence).not.toContain('오늘')
  })

  it('10년 기간 = 대운이 시작하는 해부터 열 해(창 끝은 range.end), 기간이 없으면 빈 라벨', () => {
    const [dec] = dayRungs('en')
    expect(ladderRangeLabel(dec, 'en')).toBe('2021–2030')
    expect(ladderRangeLabel({ ...dec, range: undefined }, 'en')).toBe('')
  })
})

describe('buildDayViewModel — 공유 재료 · 시진 줄 · 상담 질문 (A7)', () => {
  const HOURS: NonNullable<DestinyDay['hourCrossings']> = [
    {
      when: '05:15–07:15 (묘시)',
      whenEn: '05:15–07:15 (Rabbit hour)',
      clockStart: '05:15',
      clockEnd: '07:15',
      sibsin: '상관',
      tone: 'caution',
      risingSignKo: '천칭자리',
      risingSignEn: 'Libra',
      narrative: '말이 앞서기 쉬운 시간.',
      narrativeEn: 'Words run ahead of you.',
      strength: 0.6,
    },
    {
      when: '07:15–09:15 (진시)',
      whenEn: '07:15–09:15 (Dragon hour)',
      clockStart: '07:15',
      clockEnd: '09:15',
      sibsin: '정관',
      tone: 'good',
      risingSignKo: '전갈자리',
      risingSignEn: 'Scorpio',
      narrative: '공식 일을 처리하기 좋은 시간.',
      narrativeEn: 'Good for formal business.',
      strength: 0.8,
    },
    {
      when: '09:15–11:15 (사시)',
      whenEn: '09:15–11:15 (Snake hour)',
      clockStart: '09:15',
      clockEnd: '11:15',
      sibsin: '편관',
      tone: 'good',
      risingSignKo: '',
      risingSignEn: '',
      narrative: '편한 시간.',
      narrativeEn: 'An easy hour.',
      strength: 0.8,
    },
  ]

  it('공유 재료 — 점수 · 톤 · 후크 · 이달 곡선(오늘 자리)', () => {
    const day = makeV9Day({
      monthScores: [
        { day: 18, score: 41, today: false },
        { day: 19, score: 44, today: true },
        { day: 20, score: 30, today: false },
      ],
    })
    const vm = buildDayViewModel(day, { lang: 'en', sex: '여' })
    expect(vm.hero.share).toEqual({
      dateLabel: 'November 19 2026',
      shortDate: 'Nov 19',
      score: 44,
      tone: 'mixed',
      headline: vm.hero.headline,
      ...(vm.hero.subline ? { subline: vm.hero.subline } : {}),
      curve: [41, 44, 30],
      markerIndex: 1,
    })
    const ko = buildDayViewModel(day, { lang: 'ko', sex: '여' })
    expect(ko.hero.share.dateLabel).toBe('11월 19일 목')
    // 곡선이 짧으면 곡선·자리 없음.
    const bare = buildDayViewModel(makeV9Day(), { lang: 'en', sex: '여' })
    expect(bare.hero.share.curve).toBeUndefined()
    expect(bare.hero.share.markerIndex).toBeUndefined()
  })

  it('시진 줄 — 실제 창 · 시진 이름 · 상승궁 나란히, 절정(같은 세기면 이른 시각)에만 생활 문장', () => {
    const vm = buildDayViewModel(makeV9Day({ hourCrossings: HOURS }), { lang: 'en', sex: '여' })
    expect(vm.hours).toEqual([
      {
        window: '05:15–07:15',
        name: 'Rabbit hour',
        rising: 'Libra rising',
        tone: 'caution',
        peak: true,
        narrative: 'Words run ahead of you.',
      },
      {
        window: '07:15–09:15',
        name: 'Dragon hour',
        rising: 'Scorpio rising',
        tone: 'good',
        peak: true,
        narrative: 'Good for formal business.',
      },
      {
        window: '09:15–11:15',
        name: 'Snake hour',
        rising: '',
        tone: 'good',
        peak: false,
        narrative: '',
      },
    ])
    const ko = buildDayViewModel(makeV9Day({ hourCrossings: HOURS }), { lang: 'ko', sex: '여' })
    expect(ko.hours[0]).toMatchObject({ name: '묘시', rising: '상승궁 천칭자리' })
    expect(buildDayViewModel(makeV9Day(), { lang: 'en', sex: '여' }).hours).toEqual([])
  })

  it('상담 질문 — 오늘이면 today, 다른 날이면 그 날짜', () => {
    expect(buildDayViewModel(makeV9Day(), { lang: 'en', sex: '여' }).cta.question).toBe(
      'Help me read today in more detail.'
    )
    const other = buildDayViewModel(makeV9Day({ date: '2026-11-24' }), {
      lang: 'ko',
      sex: '여',
      isToday: false,
    })
    expect(other.cta.question).toBe('11월 24일의 운 흐름을 더 자세히 봐주세요.')
  })
})

/** 뷰모델 안의 모든 문자열 값(키 이름 제외). */
function stringsOf(x: unknown, out: string[] = []): string[] {
  if (typeof x === 'string') out.push(x)
  else if (Array.isArray(x)) x.forEach((v) => stringsOf(v, out))
  else if (x && typeof x === 'object') Object.values(x).forEach((v) => stringsOf(v, out))
  return out
}

describe("오늘이 아닌 날의 일간 — '오늘'이라 부르지 않는다 (QA VC-3 · CODE-3 · COPY-1)", () => {
  // 지난 날 11.24 를 오늘(11.26)이 아닌 날로 연 화면 — 엔진 문장에 '오늘'이 든 날이 되게 여러 시드.
  const MOON_DAY: Partial<DestinyDay> = {
    date: '2026-11-24',
    transits: [
      { body: 'Moon', aspect: '사각', target: '본명 Mars', polarity: -2 } as never,
      { body: 'Venus', aspect: '삼각', target: '본명 Sun', polarity: 2 } as never,
    ],
    hourMoon: [
      {
        when: '11:32–13:32 (오시)',
        whenEn: '11:32–13:32 (Horse hour)',
        hour: 12,
        moonSignKo: '양자리',
        moonSignEn: 'Aries',
        aspectKo: '삼각',
        aspectEn: 'trine',
        natalPointKo: '금성',
        natalPointEn: 'Venus',
        body: 'Venus',
        polarity: 2,
        tone: 'good',
        meaning: '',
        meaningEn: '',
      },
    ] as DestinyDay['hourMoon'],
  }

  it('EN — 어떤 문자열에도 today/tomorrow 가 없다(후크 · 한 끗 · DO/EASE · 분야 · 교차 · 사다리)', () => {
    for (const seed of [0, 1, 2, 3, 5, 8, 13, 21]) {
      for (const tone of ['positive', 'mixed', 'caution'] as const) {
        const vm = buildDayViewModel(
          makeV9Day({
            ...MOON_DAY,
            seed,
            dayTone: { band: 'mid', tone, tense: false, bright: false, flavor: 'flat', score: 70 },
          }),
          { lang: 'en', sex: '여', isToday: false }
        )
        const leaks = stringsOf(vm).filter((t) => /\b(today|tomorrow)\b/i.test(t))
        expect(leaks).toEqual([])
      }
    }
  })

  it("KO — '오늘' · '내일'이 없다", () => {
    for (const seed of [0, 1, 2, 3, 5, 8, 13, 21]) {
      for (const tone of ['positive', 'mixed', 'caution'] as const) {
        const vm = buildDayViewModel(
          makeV9Day({
            ...MOON_DAY,
            seed,
            dayTone: { band: 'mid', tone, tense: false, bright: false, flavor: 'flat', score: 70 },
          }),
          { lang: 'ko', sex: '여', isToday: false }
        )
        const leaks = stringsOf(vm).filter((t) => /오늘|내일/.test(t))
        expect(leaks).toEqual([])
      }
    }
  })

  it('오늘을 열면 예전 문구 그대로(오늘 풀 · 오늘 라벨)', () => {
    const vm = buildDayViewModel(makeV9Day(MOON_DAY), { lang: 'en', sex: '여', isToday: true })
    expect(vm.ladder[3]).toMatchObject({ label: 'Today', now: true })
    expect(vm.hero.label.startsWith('Today · ')).toBe(true)
    // 같은 날을 오늘로 열면 엔진 문장의 'today' 가 남는다 — 위 두 검사가 빈 검사가 아니다.
    expect(stringsOf(vm).filter((t) => /\btoday\b/i.test(t)).length).toBeGreaterThan(0)
  })

  it('공유 시트 제목의 짧은 날짜 — Nov 24 / 11월 24일', () => {
    const en = buildDayViewModel(makeV9Day(MOON_DAY), { lang: 'en', sex: '여', isToday: false })
    expect(en.hero.share.shortDate).toBe('Nov 24')
    const ko = buildDayViewModel(makeV9Day(MOON_DAY), { lang: 'ko', sex: '여', isToday: false })
    expect(ko.hero.share.shortDate).toBe('11월 24일')
  })
})

describe('분야별 — 달 절정 시각 클로즈 없음, 두 천체 이름 (결정 QA-4 · QA COPY-12)', () => {
  const day = makeV9Day({
    transits: [{ body: 'Moon', aspect: '사각', target: '본명 Mars', polarity: -3 } as never],
    hourMoon: [
      {
        when: '15:32–17:32 (신시)',
        whenEn: '15:32–17:32 (Monkey hour)',
        hour: 16,
        moonSignKo: '양자리',
        moonSignEn: 'Aries',
        aspectKo: '삼각',
        aspectEn: 'trine',
        natalPointKo: '금성',
        natalPointEn: 'Venus',
        body: 'Venus',
        polarity: 2,
        tone: 'good',
        meaning: '',
        meaningEn: '',
      },
    ] as DestinyDay['hourMoon'],
  })

  it('본문에 시진 창(15:32–17:32)을 싣지 않는다 — 시각은 시진별 줄 하나에서만', () => {
    for (const lang of ['en', 'ko'] as const) {
      const vm = buildDayViewModel(day, { lang, sex: '여' })
      const bodies = vm.byArea!.areas.map((a) => a.body).join(' ')
      expect(bodies).not.toMatch(/\d{2}:\d{2}/)
    }
  })

  it("강한 트랜짓 산문은 두 천체를 이름한다 — 'the Moon–Mars square' / '달–화성 스퀘어'", () => {
    const en = buildDayViewModel(day, { lang: 'en', sex: '여' })
    expect(en.byArea!.areas.map((a) => a.body).join(' ')).toContain('the Moon–Mars square')
    const ko = buildDayViewModel(day, { lang: 'ko', sex: '여' })
    // 같은 화면의 STARS 보조 줄 · 사다리와 같은 이름(QA R-CA-4 — 한 것에 한 이름).
    expect(ko.byArea!.areas.map((a) => a.body).join(' ')).toContain('달–화성 스퀘어')
  })

  it('DO · EASE 항목은 대문자로 시작한다(EN)', () => {
    const vm = buildDayViewModel(day, { lang: 'en', sex: '여' })
    for (const t of [...vm.tryThis!.do, ...vm.tryThis!.ease]) expect(t[0]).toBe(t[0].toUpperCase())
  })
})

describe('시진 줄 — 중립 시진도 줄로(결정 QA-4)', () => {
  it("tone 'neutral' 은 그대로 싣고 절정이 되지 않는다", () => {
    const neutral = {
      when: '11:15–13:15 (오시)',
      whenEn: '11:15–13:15 (Horse hour)',
      clockStart: '11:15',
      clockEnd: '13:15',
      sibsin: '',
      tone: 'neutral' as const,
      risingSignKo: '사수자리',
      risingSignEn: 'Sagittarius',
      strength: 0,
    }
    const vm = buildDayViewModel(makeV9Day({ hourCrossings: [neutral] }), {
      lang: 'en',
      sex: '여',
    })
    expect(vm.hours).toEqual([
      {
        window: '11:15–13:15',
        name: 'Horse hour',
        rising: 'Sagittarius rising',
        tone: 'neutral',
        peak: false,
        narrative: '',
      },
    ])
  })
})

describe('겹치는 흐름 — STARS 보조 줄(QA VC-5)', () => {
  it('교차 행의 점성 구조가 있으면 왜 행과 같은 보조 줄', () => {
    const day = makeV9Day()
    day.crossActivations[1] = {
      ...day.crossActivations[1],
      astroDetail: {
        transitPlanet: 'Mars',
        sourceKind: 'transit',
        aspect: 'square',
        natalPoint: 'Moon',
        transitSign: 'Leo',
        transitDeg: 27,
        orb: 1.12,
      },
    }
    const vm = buildDayViewModel(day, { lang: 'en', sex: '여' })
    const mars = vm.crossings.find((c) => c.stars.text === 'Mars')!
    expect(mars.stars.sub).toBe(sub('Transit', '27° Leo', 'square natal Moon', 'orb 1.1°'))
    expect(mars.astroDetail?.natalPoint).toBe('Moon')
  })
})

describe('toLadderRows — 항성 합 STARS 칸 (R-VC-3)', () => {
  const rung = (lang: 'ko' | 'en'): EvidenceRung => ({
    scale: 'daily',
    scaleLabel: lang === 'ko' ? '오늘' : 'Today',
    conclusion:
      lang === 'ko'
        ? '화성 컨정션 레굴루스 흐름이 오늘의 결을 잡아요'
        : 'Mars conjunct Regulus sets the tone for today',
    polarity: 2,
    chips: [{ text: lang === 'ko' ? '화성 ☌ 레굴루스' : 'Mars ☌ Regulus', source: 'astro' }],
    range: { start: '2026-11-27', end: '2026-11-27' },
    astro: { kind: 'fixed-star', planet: 'Mars', star: { en: 'Regulus', ko: '레굴루스' } },
  })

  it('en — 행성 ☌ 별 + 보조 줄(트랜짓 행성 · 항성 이름)', () => {
    const [row] = toLadderRows([rung('en')], 'en')
    expect(row.stars).toEqual({
      glyph: 'mars',
      text: 'Mars ☌ Regulus',
      sub: sub('Transit Mars', 'fixed star Regulus'),
    })
    expect(JSON.stringify(row.stars)).not.toMatch(HANGUL)
  })

  it('ko — 같은 구조를 한글로', () => {
    const [row] = toLadderRows([rung('ko')], 'ko')
    expect(row.stars).toEqual({
      glyph: 'mars',
      text: '화성 ☌ 레굴루스',
      sub: sub('트랜짓 화성', '항성 레굴루스'),
    })
  })

  it('별 이름이 없는 옛 구조는 칩 폴백', () => {
    const r = rung('en')
    const [row] = toLadderRows([{ ...r, astro: { kind: 'fixed-star', planet: 'Mars' } }], 'en')
    expect(row.stars).toEqual({ glyph: 'mars', text: 'Mars ☌ Regulus' })
  })
})
