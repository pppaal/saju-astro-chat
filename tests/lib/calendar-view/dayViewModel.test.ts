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
import { makeV9Day, dayRungs, TODAY_REASON } from './_v9Month'

const HANGUL = /[ㄱ-ㆎ가-힣]/

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
        sub: 'Transit · 26° Scorpio · trine natal Venus · orb 0.3°',
      },
      mark: 'up',
      note: 'Favours recognition from above, promotion, and the formal stage',
      astroDetail: TODAY_REASON.astroDetail,
    })
    const ko = toTimingRow(TODAY_REASON, 'ko')
    expect(ko.saju.text).toBe('정관')
    expect(ko.stars.sub).toBe('트랜짓 · 전갈자리 26° · 본명 금성 트라인 · 오브 0.3°')
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
    expect(rows[0].stars).toEqual({
      text: 'Zodiacal releasing',
      sub: 'Spirit in Taurus 2024–32 · Fortune in Aquarius 2024–54',
    })
    expect(rows[1].stars).toEqual({
      glyph: 'saturn',
      text: 'Saturn',
      sub: 'In fall · in Aries · First Saturn return',
    })
    expect(rows[2].stars).toBeNull()
    expect(rows[3].stars).toEqual({
      glyph: 'sun',
      text: 'Sun △ Venus',
      sub: 'Transit Sun · natal Venus',
    })
    expect(rows[3].now).toBe(true)
    expect(HANGUL.test(JSON.stringify(rows))).toBe(false)
  })

  it('ko — 같은 구조를 한국어로', () => {
    const rows = toLadderRows(dayRungs('ko'), 'ko')
    expect(rows[0]).toMatchObject({ label: '10년 대운', range: '2021–2030' })
    expect(rows[0].saju).toEqual({ hanja: '正財', text: '정재' })
    expect(rows[0].stars?.sub).toBe('영혼 황소자리 2024–32 · 운명 물병자리 2024–54')
    expect(rows[1].stars?.sub).toBe('폴(추락) · 양자리 · 첫 토성 회귀')
    expect(rows[2].range).toBe('2026년 11월')
    expect(rows[3].stars).toMatchObject({ text: '태양 △ 금성', sub: '트랜짓 태양 · 본명 금성' })
  })

  it('10년 기간 = 대운이 시작하는 해부터 열 해(창 끝은 range.end), 기간이 없으면 빈 라벨', () => {
    const [dec] = dayRungs('en')
    expect(ladderRangeLabel(dec, 'en')).toBe('2021–2030')
    expect(ladderRangeLabel({ ...dec, range: undefined }, 'en')).toBe('')
  })
})
