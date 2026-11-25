// tests/lib/report/lifeStrategy.en.test.ts
//
// "운을 내 편으로" EN 필드(계획 B3) — EN 화면이 한글 색·방향·띠를 찍지 않게, 엔진
// 어휘(getLuckyColors·getLuckyDirection·천을귀인 SSOT) 옆의 ko→en 표에서만 영문을 낸다.
// 표본 값은 엔진에서 다시 계산한다(E4 뒤 표본 용신은 금 — 옛 시안의 목 값을 베끼지 않는다).

import { describe, it, expect, beforeAll } from 'vitest'
import { buildLifeStrategy } from '@/lib/report/lifeStrategy'
import {
  getLuckyColors,
  getLuckyDirection,
  getLuckyNumbers,
  LUCKY_COLOR_EN,
  LUCKY_DIRECTION_EN,
} from '@/lib/saju/yongsin'
import { calculateSajuData } from '@/lib/saju/saju'
import { buildNatalContext } from '@/lib/calendar-engine/context/build'
import type { FiveElement } from '@/lib/saju/types'
import type { NatalContext } from '@/lib/calendar-engine/context/types'

const HANGUL = /[가-힣]/
const ELEMENTS: FiveElement[] = ['목', '화', '토', '금', '수']
const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']

describe('개운 색·방향 ko→en 표 (yongsin.ts)', () => {
  it('getLuckyColors·getLuckyDirection 의 모든 한글 값에 한글 없는 영문이 있다', () => {
    for (const el of ELEMENTS) {
      for (const c of getLuckyColors(el)) {
        expect(LUCKY_COLOR_EN[c], `${el} ${c}`).toBeTruthy()
        expect(LUCKY_COLOR_EN[c]).not.toMatch(HANGUL)
      }
      const d = getLuckyDirection(el)
      expect(LUCKY_DIRECTION_EN[d], `${el} ${d}`).toBeTruthy()
      expect(LUCKY_DIRECTION_EN[d]).not.toMatch(HANGUL)
    }
  })

  it('목 → Green·Teal·Light green / East (ko 값은 그대로)', () => {
    expect(getLuckyColors('목')).toEqual(['초록', '청록', '연두'])
    expect(getLuckyColors('목').map((c) => LUCKY_COLOR_EN[c])).toEqual([
      'Green',
      'Teal',
      'Light green',
    ])
    expect(getLuckyDirection('목')).toBe('동쪽')
    expect(LUCKY_DIRECTION_EN['동쪽']).toBe('East')
  })
})

describe('buildLifeStrategy — EN 필드', () => {
  it('다섯 오행 × 열 일간 — colorsEn·directionEn·animalsEn 에 한글 없음, ko 와 짝이 맞다', () => {
    for (const el of ELEMENTS) {
      for (const stem of STEMS) {
        const s = buildLifeStrategy({
          yongsin: {
            primaryYongsin: el,
            luckyColors: getLuckyColors(el),
            luckyDirection: getLuckyDirection(el),
            luckyNumbers: getLuckyNumbers(el),
          },
          dayStemHanja: stem,
        })!
        const lucky = s.lucky!
        expect(lucky.colorsEn).toHaveLength(lucky.colors.length)
        for (const c of lucky.colorsEn) expect(c).not.toMatch(HANGUL)
        expect(lucky.directionEn).toBeTruthy()
        expect(lucky.directionEn).not.toMatch(HANGUL)
        expect(lucky.element?.ko).toBe(el)
        expect(lucky.element?.en).not.toMatch(HANGUL)
        const guin = s.guin!
        expect(guin.branches).toHaveLength(2)
        expect(guin.animalsEn).toHaveLength(guin.animals.length)
        for (const a of guin.animalsEn) expect(a).not.toMatch(HANGUL)
      }
    }
  })

  it('번역 없는 색은 colorsEn 에서 빠진다(한글을 EN 으로 흘리지 않음)', () => {
    const s = buildLifeStrategy({
      yongsin: { luckyColors: ['네이비', '흰색'], luckyDirection: '북북동' },
    })!
    expect(s.lucky!.colors).toEqual(['네이비', '흰색'])
    expect(s.lucky!.colorsEn).toEqual(['White'])
    expect(s.lucky!.directionEn).toBe('')
    expect(s.lucky!.element).toBeUndefined()
  })

  it('천을귀인 지지·띠 ko/en — 辛 → 寅·午 → Tiger·Horse', () => {
    const s = buildLifeStrategy({ dayStemHanja: '辛' })!
    expect(s.guin).toEqual({
      branches: ['寅', '午'],
      animals: ['호랑이띠', '말띠'],
      animalsEn: ['Tiger', 'Horse'],
    })
  })
})

describe('표본 1997-03-21 14:30 F 서울 — 엔진 값으로', () => {
  let natal: NatalContext
  beforeAll(async () => {
    const birth = {
      birthDate: '1997-03-21',
      birthTime: '14:30',
      gender: 'female' as const,
      latitude: 37.5665,
      longitude: 126.978,
      timeZone: 'Asia/Seoul',
    }
    const saju = calculateSajuData(
      birth.birthDate,
      birth.birthTime,
      birth.gender,
      'solar',
      birth.timeZone,
      false,
      birth.longitude
    )
    natal = await buildNatalContext(birth, { saju })
  }, 60000)

  it('용신 금 → White·Silver·Gold / West, 壬 일간 천을귀인 卯·巳 → Rabbit·Snake', () => {
    // toLifetime 과 같은 입력(analyses.yongsin + dayMaster.name).
    const s = buildLifeStrategy({
      yongsin: natal.saju.analyses?.yongsin,
      dayStemHanja: natal.saju.dayMaster?.name,
    })!
    expect(s.lucky!.element).toEqual({ ko: '금', hanja: '金', en: 'Metal' })
    expect(s.lucky!.colors).toEqual(['흰색', '은색', '금색'])
    expect(s.lucky!.colorsEn).toEqual(['White', 'Silver', 'Gold'])
    expect(s.lucky!.directionEn).toBe('West')
    expect(s.guin!.branches).toEqual(['卯', '巳'])
    expect(s.guin!.animalsEn).toEqual(['Rabbit', 'Snake'])
    for (const v of [...s.lucky!.colorsEn, s.lucky!.directionEn, ...s.guin!.animalsEn])
      expect(v).not.toMatch(HANGUL)
  })
})
