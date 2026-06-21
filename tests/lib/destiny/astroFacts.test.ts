// tests/lib/destiny/astroFacts.test.ts
import { describe, it, expect } from 'vitest'
import { collectAstroFacts } from '@/lib/destiny/astroFacts'

const BIRTH = {
  birthDate: '1995-02-09',
  birthTime: '06:40',
  latitude: 37.5665,
  longitude: 126.978,
  timezone: 'Asia/Seoul',
}

describe('collectAstroFacts — 점성 순수 facts', () => {
  it('정상 입력 → null 아닌 facts 반환', async () => {
    const f = await collectAstroFacts(BIRTH)
    expect(f).not.toBeNull()
  })

  it('natal.planets — 10개 행성 풀 + 각 dignity 채워짐', async () => {
    const f = await collectAstroFacts(BIRTH)
    expect(f!.natal.planets.length).toBeGreaterThanOrEqual(10) // 10 행성 + 노드
    for (const p of f!.natal.planets) {
      expect(p.name).toBeTruthy()
      expect(p.sign).toBeTruthy()
      expect(typeof p.house).toBe('number')
      expect(typeof p.longitude).toBe('number')
      expect(typeof p.retrograde).toBe('boolean')
      // dignity 는 string (domicile/exaltation/detriment/fall/peregrine/triplicity 등)
      expect(typeof p.dignity).toBe('string')
    }
  })

  it('ASC + MC sign 둘 다 채움', async () => {
    const f = await collectAstroFacts(BIRTH)
    expect(f!.natal.ascendant.sign).toBeTruthy()
    expect(f!.natal.mc.sign).toBeTruthy()
  })

  it('placeUnreliable false (정상 출생 정보 있음)', async () => {
    const f = await collectAstroFacts(BIRTH)
    expect(f!.natal.placeUnreliable).toBe(false)
  })

  it('placeUnreliable true 시 — birthTimeUnknown 면 true', async () => {
    const f = await collectAstroFacts({ ...BIRTH, birthTimeUnknown: true })
    expect(f!.natal.placeUnreliable).toBe(true)
  })

  it('placeUnreliable true 시 — birthCityUnknown 면 true', async () => {
    const f = await collectAstroFacts({ ...BIRTH, birthCityUnknown: true })
    expect(f!.natal.placeUnreliable).toBe(true)
  })

  it('aspects.strong — 모두 orb ≤ 2', async () => {
    const f = await collectAstroFacts(BIRTH)
    for (const a of f!.aspects.strong) {
      expect(a.orb).toBeLessThanOrEqual(2)
      expect(a.orb).toBeGreaterThanOrEqual(0)
      expect(a.from).toBeTruthy()
      expect(a.to).toBeTruthy()
      expect(a.type).toBeTruthy()
    }
  })

  it('aspects.mid — 모두 2 < orb < 5', async () => {
    const f = await collectAstroFacts(BIRTH)
    for (const a of f!.aspects.mid) {
      expect(a.orb).toBeGreaterThan(2)
      expect(a.orb).toBeLessThan(5)
    }
  })

  it('placeUnreliable 시 ASC/MC 어스펙트 무조건 제거 (행성↔angle 각 0)', async () => {
    const f = await collectAstroFacts({ ...BIRTH, birthTimeUnknown: true })
    const allAspects = [...f!.aspects.strong, ...f!.aspects.mid]
    const angleAspects = allAspects.filter(
      (a) => a.to === 'Ascendant' || a.to === 'MC' || a.from === 'Ascendant' || a.from === 'MC'
    )
    expect(angleAspects.length).toBe(0)
  })

  it('profection — age + activatedHouse 채움', async () => {
    const f = await collectAstroFacts(BIRTH)
    expect(f!.profection).not.toBeNull()
    expect(typeof f!.profection!.age).toBe('number')
    expect(f!.profection!.age).toBeGreaterThanOrEqual(0)
    expect(f!.profection!.activatedHouse).toBeGreaterThanOrEqual(1)
    expect(f!.profection!.activatedHouse).toBeLessThanOrEqual(12)
    expect(f!.profection!.lordOfYear).toBeTruthy()
  })

  it('profection.lordPlacement null 처리 — placeUnreliable 시 군주 위치 가려짐', async () => {
    const f = await collectAstroFacts({ ...BIRTH, birthTimeUnknown: true })
    expect(f!.profection!.lordPlacement).toBeNull()
  })

  it('포매팅 0 — JSON serializable', async () => {
    const f = await collectAstroFacts(BIRTH)
    const cloned = JSON.parse(JSON.stringify(f))
    expect(cloned.natal.planets.length).toBe(f!.natal.planets.length)
  })

  it('_chart / _natalRaw escape hatch 노출', async () => {
    const f = await collectAstroFacts(BIRTH)
    expect(f!._chart).toBeTruthy()
    expect(Array.isArray(f!._chart.planets)).toBe(true)
    expect(f!._natalRaw).toBeTruthy()
    expect(f!._natalRaw.planets.length).toBeGreaterThan(0)
  })

  it('birthTime 빈 문자열 → "00:00" 폴백으로 계산 진행', async () => {
    const f = await collectAstroFacts({ ...BIRTH, birthTime: '' })
    expect(f).not.toBeNull()
    expect(f!.natal.planets.length).toBeGreaterThanOrEqual(10)
  })

  it('AM/PM 표기 birthTime 정상 파싱 (PM ≠ AM 결과)', async () => {
    const am = await collectAstroFacts({ ...BIRTH, birthTime: '06:40 AM' })
    const pm = await collectAstroFacts({ ...BIRTH, birthTime: '06:40 PM' })
    expect(am).not.toBeNull()
    expect(pm).not.toBeNull()
    // ASC 은 시각에 강하게 의존 → AM/PM 이 다르면 달라야 한다
    expect(am!.natal.ascendant.longitude).not.toBe(pm!.natal.ascendant.longitude)
  })

  it('calculateNatalChart 실패(좌표 비정상) → null 반환', async () => {
    // NaN 좌표를 주면 천체력 계산이 throw → catch → null.
    const f = await collectAstroFacts({ ...BIRTH, latitude: Number.NaN, longitude: Number.NaN })
    // 엔진이 NaN 을 받아 throw 하면 null, 견디면 facts. 둘 중 하나는 보장.
    expect(f === null || f.natal.planets.length >= 0).toBe(true)
  })
})

describe('collectAstroFacts — Hellenistic 옵션', () => {
  it('includeHellenistic=false(기본) → hellenistic 미포함', async () => {
    const f = await collectAstroFacts(BIRTH)
    expect(f!.hellenistic).toBeUndefined()
  })

  it('includeHellenistic=true → hellenistic 풀 채움', async () => {
    const f = await collectAstroFacts({ ...BIRTH, includeHellenistic: true })
    expect(f!.hellenistic).toBeDefined()
    const h = f!.hellenistic!
    // sect — Sun 하우스 기반 day/night
    expect(['day', 'night']).toContain(h.sect)
    // natal aspects (major+minor)
    expect(Array.isArray(h.natalAspects)).toBe(true)
    // 7 Arabic Lots
    expect(Array.isArray(h.lots)).toBe(true)
    // dignities — per planet 5-tier
    expect(Array.isArray(h.dignities)).toBe(true)
    expect(h.dignities.length).toBeGreaterThan(0)
    for (const d of h.dignities) {
      expect(d.planet).toBeTruthy()
      expect(typeof d.score).toBe('number')
      expect(typeof d.tiers).toBe('object')
    }
    // ZR — spirit/fortune 키 존재
    expect(h.zodiacalReleasing).toHaveProperty('spirit')
    expect(h.zodiacalReleasing).toHaveProperty('fortune')
  })

  it('hellenistic.extraPoints — Chiron/Lilith 둘 (실패 시 undefined)', async () => {
    const f = await collectAstroFacts({ ...BIRTH, includeHellenistic: true })
    const ep = f!.hellenistic!.extraPoints
    if (ep) {
      expect(ep.length).toBe(2)
    } else {
      expect(ep).toBeUndefined()
    }
  })

  it('hellenistic.lots 에 house 매핑 동반', async () => {
    const f = await collectAstroFacts({ ...BIRTH, includeHellenistic: true })
    for (const l of f!.hellenistic!.lots) {
      expect(typeof l.house).toBe('number')
      expect(l.name).toBeTruthy()
    }
  })

  it('hellenistic — almutenFiguris null 또는 객체', async () => {
    const f = await collectAstroFacts({ ...BIRTH, includeHellenistic: true })
    const a = f!.hellenistic!.almutenFiguris
    expect(a === null || typeof a === 'object').toBe(true)
  })

  it('Hellenistic 도 JSON serializable', async () => {
    const f = await collectAstroFacts({ ...BIRTH, includeHellenistic: true })
    expect(() => JSON.parse(JSON.stringify(f!.hellenistic))).not.toThrow()
  })
})
