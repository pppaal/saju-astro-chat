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
      (a) => a.to === 'Ascendant' || a.to === 'MC' || a.from === 'Ascendant' || a.from === 'MC',
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
})
