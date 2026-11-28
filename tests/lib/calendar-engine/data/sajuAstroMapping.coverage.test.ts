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
import { SHINSAL_POLARITY } from '@/lib/calendar-engine/extractors/saju-shinsal'

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

  it('전체 56쌍 이상 유지(축소 회귀 방지 — 천을귀인×목성 은퇴 뒤, 오너 결정 14)', () => {
    expect(SAJU_ASTRO_MAPPINGS.length).toBeGreaterThanOrEqual(56)
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

  it('매핑 부호는 고정 극성 부모 아래 도달 가능 — 신살 극성과 반대 부호 행 없음 (엔진 감사 X6)', () => {
    // 신살 부모는 극성이 고정(도화 +1·역마 0·건록 +2·양인 −2·천을귀인 +3)이라, 그와 반대
    // 부호인 매핑은 두 부모가 동의할 수 없어 절대 부호가 서지 않는다(예: 은퇴한 도화×화성 −1).
    for (const m of SAJU_ASTRO_MAPPINGS) {
      const fixed = SHINSAL_POLARITY[m.saju]
      if (fixed === undefined || fixed === 0 || m.polarity === 0) continue
      expect(Math.sign(m.polarity), `${m.saju}×${m.astro}`).toBe(Math.sign(fixed))
    }
    expect(lookupCrossMapping('도화', 'Mars')).toBeUndefined()
  })

  it('신살(일 층 전용) × 일 밴드 없는 행성 — 캘린더에서 발화하지 않는 행은 리포트 대표 매핑 건록×목성뿐', () => {
    // 교차 layer 는 좁은 부모 층이라(엔진 감사 X7) 신살(daily) × 목성(monthly~) 은 daily →
    // 목성 밴드 밖. 건록×목성은 리포트 대표 매핑(crossOnly 아님)으로 남는다. 천을귀인×목성은
    // crossOnly 라 캘린더 전용이었는데 캘린더에서 발화할 수 없어 은퇴했다(오너 결정 14).
    const shinsal = new Set(Object.keys(SHINSAL_POLARITY))
    const dead = SAJU_ASTRO_MAPPINGS.filter(
      (m) =>
        shinsal.has(m.saju) &&
        !crossLayerAllowed(m.astro, 'daily') &&
        !crossLayerAllowed(m.astro, 'hourly')
    )
    expect(dead.map((m) => `${m.saju}|${m.astro}`)).toEqual(['건록|Jupiter'])
    // 캘린더에서 죽은 행이 남는다면 리포트가 읽는 행이어야 한다 — crossOnly(캘린더 전용) 금지.
    for (const m of dead) expect(m.crossOnly, `${m.saju}|${m.astro}`).not.toBe(true)
  })

  it('천을귀인 × 목성은 캘린더 매핑에 없다 — 대체 페어도 없음 (오너 결정 14)', () => {
    expect(lookupCrossMapping('천을귀인', 'Jupiter')).toBeUndefined()
    expect(SAJU_ASTRO_MAPPINGS.filter((m) => m.saju === '천을귀인')).toEqual([])
  })

  it('외행성(천왕·해왕·명왕) 매핑은 장주기 전용 — 일/월 밴드 발화 금지', () => {
    for (const planet of ['Uranus', 'Neptune', 'Pluto']) {
      expect(crossLayerAllowed(planet, 'daily'), `${planet} daily`).toBe(false)
      expect(crossLayerAllowed(planet, 'monthly'), `${planet} monthly`).toBe(false)
      expect(crossLayerAllowed(planet, 'decadal'), `${planet} decadal`).toBe(true)
    }
  })
})
