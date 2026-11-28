// 조후용신(궁통보감) — DB 무결성 + 조회/평가/조화 로직.
//
// johuYongsinData.ts 분리(2026-06) 전에는 데이터 1,500줄이 분모를 채워
// 커버리지가 ~95% 로 보였지만, 실제 로직 함수 3개는 테스트가 전혀 없었다
// (분리 후 실측 10.66%). 상담사·캘린더·리포트가 모두 소비하는 판정이라
// 회귀를 골든으로 잠근다.

import { describe, it, expect } from 'vitest'
import {
  MONTH_CLIMATE,
  JOHU_YONGSIN_DB,
  getJohuYongsin,
  evaluateJohuNeed,
  harmonizeYongsin,
} from '@/lib/saju/johuYongsin'

const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
const BRANCHES = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑']
const ELEMENTS = new Set(['목', '화', '토', '금', '수'])

describe('JOHU_YONGSIN_DB 무결성', () => {
  it('일간 10 × 월지 12 = 120 케이스가 정확히 1번씩 존재', () => {
    expect(JOHU_YONGSIN_DB).toHaveLength(120)
    const seen = new Set<string>()
    for (const e of JOHU_YONGSIN_DB) {
      const key = `${e.daymaster}-${e.month}`
      expect(seen.has(key), `중복 케이스: ${key}`).toBe(false)
      seen.add(key)
    }
    for (const s of STEMS) {
      for (const b of BRANCHES) {
        expect(seen.has(`${s}-${b}`), `누락 케이스: ${s}-${b}`).toBe(true)
      }
    }
  })

  it('모든 케이스의 용신은 유효한 오행, rating 은 1~5', () => {
    for (const e of JOHU_YONGSIN_DB) {
      expect(ELEMENTS.has(e.primaryYongsin), `${e.daymaster}-${e.month} primary`).toBe(true)
      if (e.secondaryYongsin) {
        expect(ELEMENTS.has(e.secondaryYongsin), `${e.daymaster}-${e.month} secondary`).toBe(true)
      }
      expect(e.rating).toBeGreaterThanOrEqual(1)
      expect(e.rating).toBeLessThanOrEqual(5)
      expect(e.reasoning.length, `${e.daymaster}-${e.month} reasoning 비어 있음`).toBeGreaterThan(0)
      expect(
        e.reasoning_en.length,
        `${e.daymaster}-${e.month} reasoning_en 비어 있음`
      ).toBeGreaterThan(0)
    }
  })

  it('MONTH_CLIMATE 는 12지지 전부에 한/영 필드를 가진다', () => {
    for (const b of BRANCHES) {
      const c = MONTH_CLIMATE[b]
      expect(c, `월지 ${b} 누락`).toBeDefined()
      expect(c.season.length).toBeGreaterThan(0)
      expect(c.season_en.length).toBeGreaterThan(0)
      expect(c.climate.length).toBeGreaterThan(0)
      expect(c.climate_en.length).toBeGreaterThan(0)
      expect(c.temperature.length).toBeGreaterThan(0)
      expect(c.temperature_en.length).toBeGreaterThan(0)
    }
  })
})

describe('getJohuYongsin', () => {
  it('존재하는 (일간, 월지) 조합은 해당 엔트리를 돌려준다', () => {
    const hit = getJohuYongsin('甲', '寅')
    expect(hit).not.toBeNull()
    expect(hit!.daymaster).toBe('甲')
    expect(hit!.month).toBe('寅')
  })

  it('golden: 한겨울 병화(丙·子)는 임수로 강휘상영 — 수(水) 용신', () => {
    // 궁통보감 대표 케이스: 丙(태양)는 겨울에 壬水로 강휘상영(태양이 호수에 빛남).
    // 데이터 교체/오타 회귀를 잠그는 골든. (丁火 등불은 겨울에도 甲木 — 아래 가드.)
    const hit = getJohuYongsin('丙', '子')
    expect(hit).not.toBeNull()
    expect(hit!.climate).toBe('한')
    expect(hit!.primaryYongsin).toBe('수')
    expect(hit!.rating).toBeGreaterThanOrEqual(4)
  })

  it('golden: 丙火 겨울 3개월(亥/子/丑) 모두 수(水), 丁火 겨울은 목(木) 유지', () => {
    for (const m of ['亥', '子', '丑']) {
      expect(getJohuYongsin('丙', m)!.primaryYongsin).toBe('수')
      // 丁(음화·등불)은 겨울에도 甲木(땔감) — 丙과 구분.
      expect(getJohuYongsin('丁', m)!.primaryYongsin).toBe('목')
    }
  })

  it('없는 조합(잘못된 글자)은 null', () => {
    expect(getJohuYongsin('X', '寅')).toBeNull()
    expect(getJohuYongsin('甲', '?')).toBeNull()
  })
})

describe('evaluateJohuNeed', () => {
  it('rating 을 DB 그대로 반영하고 4 이상이면 urgent', () => {
    for (const e of JOHU_YONGSIN_DB) {
      const need = evaluateJohuNeed(e.daymaster, e.month)
      expect(need.rating).toBe(e.rating)
      expect(need.urgent).toBe(e.rating >= 4)
      expect(need.description.length).toBeGreaterThan(0)
      expect(need.description_en.length).toBeGreaterThan(0)
    }
  })

  it('정보 없는 조합은 rating 0 / urgent false', () => {
    const need = evaluateJohuNeed('X', 'Y')
    expect(need.rating).toBe(0)
    expect(need.urgent).toBe(false)
  })
})

describe('harmonizeYongsin', () => {
  it('조후·억부가 같으면 excellent, 그 오행이 primary', () => {
    const r = harmonizeYongsin('화', '화', 3)
    expect(r.harmony).toBe('excellent')
    expect(r.primary).toBe('화')
    expect(r.secondary).toBe('화')
  })

  it('조후 필요도 4 이상이면 조후용신 우선', () => {
    const r = harmonizeYongsin('화', '수', 4)
    expect(r.harmony).toBe('good')
    expect(r.primary).toBe('화')
    expect(r.secondary).toBe('수')
  })

  it('조후 필요도 낮으면 억부용신 우선', () => {
    const r = harmonizeYongsin('화', '수', 2)
    expect(r.harmony).toBe('good')
    expect(r.primary).toBe('수')
    expect(r.secondary).toBe('화')
  })
})
