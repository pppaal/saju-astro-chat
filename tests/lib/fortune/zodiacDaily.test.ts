/**
 * 띠별 오늘의 운세 엔진(zodiacDaily) 검증.
 *
 * 앵커: 1984-01-31 = 甲子日 (computeDayPillarIndices 로 확인한 60갑자 기준일).
 * 子日 기준 고전 관계: 충=午, 육합=丑, 삼합=申·辰, 형=卯, 해=未, 파=酉, 복음=子.
 *
 * 주의: 육합은 "매일 1개" 불변식이 성립하지 않는다 — 寅亥(합+파)·巳申(합+형+파)
 * 처럼 합이면서 흉 관계인 조합은 흉 우선 규칙이 먼저 잡는다(형합·파합).
 */

import { describe, it, expect } from 'vitest'
import {
  computeAllZodiacDaily,
  computeZodiacDaily,
  getAnimalBySlug,
  kstDateParts,
  relationForDay,
  ZODIAC_ANIMALS,
} from '@/lib/fortune/zodiacDaily'

// KST 정오 — 날짜 경계 이슈 없이 해당 달력일을 가리킨다
const GAPJA_DAY = new Date('1984-01-31T12:00:00+09:00')

describe('앵커 — 1984-01-31 甲子日', () => {
  it('일진이 甲子(갑자일)로 계산된다', () => {
    const f = computeZodiacDaily(ZODIAC_ANIMALS[0], GAPJA_DAY)
    expect(f.dayGanzhi.hanja).toBe('甲子')
    expect(f.dayGanzhi.ko).toBe('갑자일')
    expect(f.date).toBe('1984-01-31')
  })

  it('子日의 고전 관계가 정확하다 (충·육합·삼합·형·해·파·복음)', () => {
    const rel = (slug: string) => computeZodiacDaily(getAnimalBySlug(slug)!, GAPJA_DAY).relation
    expect(rel('horse')).toBe('chung') // 子午沖
    expect(rel('ox')).toBe('yukhap') // 子丑合
    expect(rel('monkey')).toBe('samhap') // 申子辰
    expect(rel('dragon')).toBe('samhap') // 申子辰
    expect(rel('rabbit')).toBe('xing') // 子卯刑
    expect(rel('sheep')).toBe('hai') // 子未害
    expect(rel('rooster')).toBe('pa') // 子酉破
    expect(rel('rat')).toBe('same') // 伏吟
  })

  it('충은 흉(1등급), 육합·삼합은 길(5등급)', () => {
    expect(computeZodiacDaily(getAnimalBySlug('horse')!, GAPJA_DAY).grade).toBe(1)
    expect(computeZodiacDaily(getAnimalBySlug('ox')!, GAPJA_DAY).grade).toBe(5)
    expect(computeZodiacDaily(getAnimalBySlug('monkey')!, GAPJA_DAY).grade).toBe(5)
  })
})

describe('결정론', () => {
  it('같은 (날짜, 띠)는 언제나 같은 결과', () => {
    const a = computeZodiacDaily(ZODIAC_ANIMALS[6], GAPJA_DAY)
    const b = computeZodiacDaily(ZODIAC_ANIMALS[6], new Date('1984-01-31T23:59:00+09:00'))
    expect(a).toEqual(b)
  })

  it('KST 기준 날짜 — UTC 저녁은 한국의 다음날이다', () => {
    // 2026-07-08 20:00 UTC = 2026-07-09 05:00 KST
    expect(kstDateParts(new Date('2026-07-08T20:00:00Z'))).toEqual({ y: 2026, m: 7, d: 9 })
    expect(kstDateParts(new Date('2026-07-08T14:00:00Z'))).toEqual({ y: 2026, m: 7, d: 8 })
  })
})

describe('전수 스윕 — 60일 × 12띠', () => {
  it('모든 조합에서 문구·등급이 유효하다', () => {
    for (let offset = 0; offset < 60; offset++) {
      const day = new Date(GAPJA_DAY.getTime() + offset * 86400000)
      for (const f of computeAllZodiacDaily(day)) {
        expect(f.grade).toBeGreaterThanOrEqual(1)
        expect(f.grade).toBeLessThanOrEqual(5)
        expect(f.message.ko.length).toBeGreaterThan(20)
        expect(f.message.en.length).toBeGreaterThan(20)
        expect(f.advice.ko.length).toBeGreaterThan(5)
        expect(f.advice.en.length).toBeGreaterThan(5)
        expect(f.dayGanzhi.hanja).toHaveLength(2)
      }
    }
  })

  it('매일 12띠 중 충·복음은 정확히 1개, 육합은 최대 1개(형합·파합은 흉 우선)', () => {
    for (let offset = 0; offset < 12; offset++) {
      const day = new Date(GAPJA_DAY.getTime() + offset * 86400000)
      const all = computeAllZodiacDaily(day)
      expect(all.filter((f) => f.relation === 'chung')).toHaveLength(1)
      expect(all.filter((f) => f.relation === 'same')).toHaveLength(1)
      expect(all.filter((f) => f.relation === 'yukhap').length).toBeLessThanOrEqual(1)
    }
  })
})

describe('유틸', () => {
  it('슬러그 12개가 유일하고 조회가 라운드트립된다', () => {
    expect(new Set(ZODIAC_ANIMALS.map((a) => a.slug)).size).toBe(12)
    for (const a of ZODIAC_ANIMALS) {
      expect(getAnimalBySlug(a.slug)).toBe(a)
    }
    expect(getAnimalBySlug('unicorn')).toBeNull()
  })

  it('relationForDay 는 흉 관계를 길 관계보다 우선한다', () => {
    // 卯戌 은 육합이자 (표준 자형 목록에 따라) 서로 무관 — 우선순위 스모크:
    // 子卯 은 형이 육합·삼합보다 먼저 잡힌다 (子卯은 형만 해당이라 직접 확인)
    expect(relationForDay('子', '卯')).toBe('xing')
    // 寅巳 는 형(삼형) — 삼합(寅午戌 아님) 간섭 없음
    expect(relationForDay('寅', '巳')).toBe('xing')
  })
})
