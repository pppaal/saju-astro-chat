/**
 * saju-astro-mapping — 근거 커버리지·무결성 가드.
 *
 * "왜 이런 날" 근거는 이 매핑에서 나온다. 커버리지가 얇으면 그날 가장 센
 * 신호가 매핑 밖이라 근거가 비고 일반 문구로 떨어진다(2026-07 감사).
 * 이 테스트는 ① 십신 10종 전부가 빠른 행성(일/월 밴드) 매핑을 2개 이상
 * 갖는다 ② 페어 중복 없음 ③ 문구 형식·로케일 완결성을 강제한다 —
 * 매핑을 지우거나 형식을 깨면 CI 에서 잡힌다.
 */
import { describe, it, expect } from 'vitest'
import {
  SAJU_ASTRO_MAPPINGS,
  lookupCrossMapping,
  crossLayerAllowed,
} from '@/lib/calendar-engine/data/saju-astro-mapping'

const SIBSIN_10 = [
  '비견',
  '겁재',
  '식신',
  '상관',
  '편재',
  '정재',
  '편관',
  '정관',
  '편인',
  '정인',
] as const

// 일/월 밴드에서 발화 가능한 빠른 행성(CROSS_LAYER_BAND 기준).
const FAST_PLANETS = new Set(['Sun', 'Moon', 'Mercury', 'Venus', 'Mars'])

describe('saju-astro-mapping — 커버리지', () => {
  it('십신 10종 전부, 빠른 행성(일/월 밴드) 매핑이 2개 이상', () => {
    for (const sibsin of SIBSIN_10) {
      const fast = SAJU_ASTRO_MAPPINGS.filter((m) => m.saju === sibsin && FAST_PLANETS.has(m.astro))
      expect(
        fast.length,
        `${sibsin}: 일/월 근거 매핑 ${fast.length}개 (<2)`
      ).toBeGreaterThanOrEqual(2)
    }
  })

  it('달(Moon) 매핑 5개 이상 — 가장 자주 발화하는 일간 트랜짓', () => {
    const moon = SAJU_ASTRO_MAPPINGS.filter((m) => m.astro === 'Moon')
    expect(moon.length).toBeGreaterThanOrEqual(5)
    // Moon 은 daily 전용 밴드 — monthly 에서 발화하지 않는다.
    expect(crossLayerAllowed('Moon', 'daily')).toBe(true)
    expect(crossLayerAllowed('Moon', 'monthly')).toBe(false)
  })

  it('전체 57쌍 이상 유지(축소 회귀 방지)', () => {
    expect(SAJU_ASTRO_MAPPINGS.length).toBeGreaterThanOrEqual(57)
  })
})

describe('saju-astro-mapping — 무결성', () => {
  it('(saju, astro) 페어 중복 없음', () => {
    const seen = new Set<string>()
    for (const m of SAJU_ASTRO_MAPPINGS) {
      const key = `${m.saju}|${m.astro}`
      expect(seen.has(key), `중복 페어: ${key}`).toBe(false)
      seen.add(key)
    }
  })

  it('모든 매핑: 문구 형식(페어 머리 + em-dash) + 양 로케일 + polarity 범위', () => {
    for (const m of SAJU_ASTRO_MAPPINGS) {
      // "X × Y — 문장" 형식 — stripCrossPair(머리 제거)가 이 형식에 의존한다.
      expect(m.meaning.ko, `${m.saju}×${m.astro} ko`).toMatch(/×.*—/)
      expect(m.meaning.en, `${m.saju}×${m.astro} en`).toMatch(/×.*—/)
      expect(m.meaning.ko.length).toBeGreaterThan(15)
      expect(m.meaning.en.length).toBeGreaterThan(15)
      expect(Math.abs(m.polarity)).toBeLessThanOrEqual(3)
      expect(['A', 'B', 'C']).toContain(m.grade)
    }
  })

  it('lookupCrossMapping — 인덱스가 전 매핑을 커버', () => {
    for (const m of SAJU_ASTRO_MAPPINGS) {
      expect(lookupCrossMapping(m.saju, m.astro)).toBe(m)
    }
    expect(lookupCrossMapping('없는키', 'Venus')).toBeUndefined()
    expect(lookupCrossMapping(undefined, undefined)).toBeUndefined()
  })

  it('외행성(천왕·해왕·명왕) 매핑은 장주기 전용 — 일/월 밴드 발화 금지', () => {
    for (const planet of ['Uranus', 'Neptune', 'Pluto']) {
      expect(crossLayerAllowed(planet, 'daily'), `${planet} daily`).toBe(false)
      expect(crossLayerAllowed(planet, 'monthly'), `${planet} monthly`).toBe(false)
      expect(crossLayerAllowed(planet, 'decadal'), `${planet} decadal`).toBe(true)
    }
  })
})
