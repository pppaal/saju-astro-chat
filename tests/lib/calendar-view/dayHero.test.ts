/**
 * dayHero — DayTier 에서 뺀 히어로 파생(톤 권위·바람 단어·후크·평이 근거·'왜'·행동). DayTier 의
 * 렌더 테스트(tests/components/calendar/tiers/DayTier.test.tsx)가 표시 동일성을, 여기선 규칙을 본다.
 */
import { describe, it, expect } from 'vitest'
import { buildDayHero, buildDayDomains, retimeDayText } from '@/lib/calendar-view/dayHero'
import { dayShareHook } from '@/lib/share/shareHook'
import type { DestinyDay } from '@/types/calendar'
import { makeV9Day, SAMPLE_SEED } from './_v9Month'

describe('buildDayHero — 톤 권위', () => {
  it('day.dayTone 이 권위 — mixed·flat 이면 잔잔/무난, 점수 색은 verdict.band', () => {
    const h = buildDayHero(makeV9Day(), { lang: 'en' })
    expect(h.verdict.tone).toBe('mixed')
    expect(h.volatile).toBe(false)
    expect(h.toneWord).toBe('Calm')
    expect(h.heroToneWord).toBe('A steady day')
    expect(h.dayBand).toBe('mid')
    expect(h.scoreBand).toBe('mid')
    const ko = buildDayHero(makeV9Day(), { lang: 'ko' })
    expect(ko.toneWord).toBe('잔잔')
    expect(ko.heroToneWord).toBe('무난한 날')
  })

  it('volatile mixed → 변덕 / 기복 있는 날', () => {
    const day = makeV9Day({
      dayTone: {
        band: 'mid',
        tone: 'mixed',
        tense: true,
        bright: false,
        flavor: 'volatile',
        score: 41,
      },
    })
    const h = buildDayHero(day, { lang: 'ko' })
    expect(h.toneWord).toBe('변덕')
    expect(h.heroToneWord).toBe('기복 있는 날')
  })

  it('dayTone 이 없으면(구 캐시) reconcileDayTone 폴백 — 점수 72 는 좋은 날', () => {
    const day = makeV9Day({ dayTone: undefined, score: 72, cautions: [], cautionsEn: [] })
    const h = buildDayHero(day, { lang: 'en' })
    expect(h.verdict.tone).toBe('positive')
    expect(h.toneWord).toBe('Tailwind')
    expect(h.heroToneWord).toBe('A good day')
    expect(h.dayBand).toBe('good')
  })

  it('후크 = 공유 카드와 같은 소스(톤·점수·본명 시드·일-of-month)', () => {
    const day = makeV9Day()
    const h = buildDayHero(day, { lang: 'en' })
    expect(h.hook).toEqual(
      dayShareHook({ tone: 'mixed', score: 44, seed: SAMPLE_SEED, daySalt: 19, ko: false })
    )
  })
})

describe('buildDayHero — 교차·근거', () => {
  it('맨 위 교차는 day.reason, 같은 페어의 다른 행은 빠진다 (계획 B1 #4)', () => {
    const h = buildDayHero(makeV9Day(), { lang: 'en' })
    expect(h.reasonRow?.id).toBe('reason:정관|태양')
    expect(h.crossRows[0]).toBe(h.reasonRow)
    expect(h.crossRows.filter((c) => c.sajuKo === '정관' && c.astroKo === '태양')).toHaveLength(1)
    expect(h.crossRows[0].sajuSide).toBe('Direct Officer')
  })

  it('가장 센 교차가 흉(−)이면 조심 목록으로 — "받쳐주는 흐름" 금지 (감사 #8)', () => {
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
    const h = buildDayHero(day, { lang: 'ko' })
    expect(h.happeningLines).toHaveLength(0)
    expect(h.cautionLines.join(' ')).toContain('경쟁과 충동의 결이 두 배로')
    expect(h.why).not.toContain('받쳐주는 흐름이 같이 와요')
    expect(h.why).toBe('오늘은 살짝 거스르는 기운이 깔려 있어요.')
    expect(buildDayHero(day, { lang: 'ko', isToday: false }).why).toBe(
      '이날은 살짝 거스르는 기운이 깔려 있어요.'
    )
  })

  it('행동 처방 — 십신으로, 미성년이면 정화', () => {
    const h = buildDayHero(makeV9Day(), { lang: 'en' })
    expect(h.actions?.do.length).toBe(3)
    expect(typeof h.actions?.tipEn).toBe('string')
    expect(buildDayHero(makeV9Day({ iljinSibsin: '—' }), { lang: 'en' }).actions).toBeNull()
  })

  it('buildDayDomains — 6 분야, 십신을 모르면 null', () => {
    const d = buildDayDomains(makeV9Day(), { lang: 'en', sex: '여', dayBand: 'mid' })
    expect(d?.domains).toHaveLength(6)
    expect(
      buildDayDomains(makeV9Day({ iljinSibsin: '—' }), { lang: 'en', sex: '여', dayBand: 'mid' })
    ).toBeNull()
  })
})

describe('retimeDayText — 오늘이 아닌 날의 상대 날짜 말 (QA COPY-1)', () => {
  it('EN — today · tomorrow · yesterday · tonight · tomorrow-you, 문장 첫 글자 대소문자 유지', () => {
    expect(retimeDayText('Today, the Moon is the signal.', false)).toBe(
      'That day, the Moon is the signal.'
    )
    expect(retimeDayText('Decide today on big money, but pay tomorrow.', false)).toBe(
      'Decide that day on big money, but pay the next day.'
    )
    expect(retimeDayText('Eating well is part of today’s skill.', false)).toBe(
      'Eating well is part of that day’s skill.'
    )
    expect(retimeDayText('Guard sleep first; hand tonight’s worries to tomorrow-you.', false)).toBe(
      'Guard sleep first; hand that night’s worries to future you.'
    )
    expect(retimeDayText('Tomorrow morning, yesterday’s plan.', false)).toBe(
      'The next morning, the day before’s plan.'
    )
  })
  it('KO — 오늘 → 이날, 내일 → 다음 날, 어제 → 전날', () => {
    expect(retimeDayText('오늘 만든 것은 내일의 밑천이 됩니다.', true)).toBe(
      '이날 만든 것은 다음 날의 밑천이 됩니다.'
    )
    // '어제'는 받침이 없어 '전날'로 바꾸면 조사도 받침에 맞춘다.
    expect(retimeDayText('어제와 결이 달라지는 날', true)).toBe('전날과 결이 달라지는 날')
    expect(retimeDayText('어제 막혔던 게 오늘은 풀려. 어제는 어제가 아니다. 어제를', true)).toBe(
      '전날 막혔던 게 이날은 풀려. 전날은 전날이 아니다. 전날을'
    )
  })
})
