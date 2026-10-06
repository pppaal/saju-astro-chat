// tests/lib/compatibility/timeSensitivity.test.ts
//
// 출생시각 민감도 — 2인 초대 루프의 근거를 계산하는 엔진.
//
// 무료 궁합은 A 가 상대 생시를 **추측해서** 넣는다. 그 리포트를 공유해도
// 받은 사람은 자기 정확한 시간을 줄 이유가 없다 — 루프가 여기서 샌다.
// 그런데 생시는 리포트를 실제로 뒤집으므로(91여 실측: 00:35↔09:35 에서 시주
// 甲子↔己巳, ASC 전갈↔물고기, 상대 달 오버레이 8H↔2H, 상대가 보는 처성 2↔1개)
// "N개가 불확실하다"를 정직하게 보여주고 초대 근거로 쓴다.
//
// classifySensitivity 는 순수 함수라 에페메리스 없이 전수 검증한다.

import { describe, it, expect } from 'vitest'
import {
  candidateTimes,
  classifySensitivity,
  factsFor,
  houseOfLongitude,
  type SensitivityFacts,
} from '@/lib/compatibility/timeSensitivity'
import type { Chart } from '@/lib/astrology/foundation/types'

const facts = (over: Partial<SensitivityFacts> = {}): SensitivityFacts => ({
  hourPillar: '甲子',
  ascSign: 'Scorpio',
  overlayHouses: { Sun: 4, Moon: 8 },
  spouseStarSeenByUnknown: 2,
  spouseStarSeenByPartner: 2,
  ...over,
})

describe('houseOfLongitude', () => {
  const cusps = Array.from({ length: 12 }, (_, i) => i * 30) // 0,30,...,330

  it('구간에 속한 하우스를 준다', () => {
    expect(houseOfLongitude(cusps, 0)).toBe(1)
    expect(houseOfLongitude(cusps, 29.9)).toBe(1)
    expect(houseOfLongitude(cusps, 30)).toBe(2)
    expect(houseOfLongitude(cusps, 359.9)).toBe(12)
  })

  it('0° 를 넘어 감싸는 하우스도 처리한다', () => {
    // 1H 커스프 350° → 1H 는 350~20° 구간
    const wrapped = Array.from({ length: 12 }, (_, i) => (350 + i * 30) % 360)
    expect(houseOfLongitude(wrapped, 355)).toBe(1)
    expect(houseOfLongitude(wrapped, 5)).toBe(1)
    expect(houseOfLongitude(wrapped, 25)).toBe(2)
  })

  it('커스프가 12개가 아니면 0 — 조용히 틀린 하우스를 주지 않는다', () => {
    expect(houseOfLongitude([0, 30], 15)).toBe(0)
    expect(houseOfLongitude([], 15)).toBe(0)
  })
})

describe('candidateTimes', () => {
  it('기본 1시간 간격 24개 — 시주(2시간 지지)를 모두 덮는다', () => {
    const t = candidateTimes()
    expect(t).toHaveLength(24)
    expect(t[0]).toEqual({ hour: 0, minute: 0 })
    expect(t[23]).toEqual({ hour: 23, minute: 0 })
  })

  it('간격을 넓힐 수 있다', () => {
    expect(candidateTimes(2)).toHaveLength(12)
    expect(candidateTimes(6)).toHaveLength(4)
  })
})

describe('classifySensitivity', () => {
  it('샘플이 없으면 빈 결과 — 0으로 나누지 않는다', () => {
    const r = classifySensitivity([])
    expect(r).toEqual({
      sampleCount: 0,
      stable: [],
      volatile: [],
      totalFields: 0,
      volatileFields: 0,
    })
  })

  it('모든 샘플이 같으면 전부 stable, volatile 0', () => {
    const r = classifySensitivity([facts(), facts(), facts()])
    expect(r.volatileFields).toBe(0)
    expect(r.volatile).toHaveLength(0)
    expect(r.stable.length).toBe(r.totalFields)
    // 시주·ASC·배우자성 양방향 + 행성 2개 = 6
    expect(r.totalFields).toBe(6)
  })

  it('달라지는 필드만 volatile 로 분류한다', () => {
    const r = classifySensitivity([facts({ hourPillar: '甲子' }), facts({ hourPillar: '己巳' })])
    expect(r.volatile.map((f) => f.key)).toEqual(['hourPillar'])
    expect(r.volatileFields).toBe(1)
    expect(r.stable.map((f) => f.key)).not.toContain('hourPillar')
  })

  it('행성별 오버레이를 개별 필드로 센다 — 달만 바뀌는 걸 뭉개지 않는다', () => {
    const r = classifySensitivity([
      facts({ overlayHouses: { Sun: 4, Moon: 8 } }),
      facts({ overlayHouses: { Sun: 4, Moon: 2 } }),
    ])
    expect(r.volatile.map((f) => f.key)).toEqual(['overlay:Moon'])
    expect(r.stable.map((f) => f.key)).toContain('overlay:Sun')
  })

  it('배우자성은 양방향을 따로 센다 — 한 방향만 재면 변동을 놓친다', () => {
    // 91여 실측: 그 사람이 상대를 보는 개수는 불변(일간·상대글자 고정)인데
    // 상대가 그 사람을 보는 개수는 시주가 바뀌어 2↔1 로 변했다.
    const r = classifySensitivity([
      facts({ spouseStarSeenByUnknown: 2, spouseStarSeenByPartner: 2 }),
      facts({ spouseStarSeenByUnknown: 2, spouseStarSeenByPartner: 1 }),
    ])
    expect(r.volatile.map((f) => f.key)).toEqual(['spouseStarSeenByPartner'])
    expect(r.stable.map((f) => f.key)).toContain('spouseStarSeenByUnknown')
  })

  it('변동이 큰 것부터 정렬한다', () => {
    const r = classifySensitivity([
      facts({ hourPillar: 'A', ascSign: 'X' }),
      facts({ hourPillar: 'B', ascSign: 'X' }),
      facts({ hourPillar: 'C', ascSign: 'Y' }),
    ])
    expect(r.volatile[0].key).toBe('hourPillar') // 3가지
    expect(r.volatile[0].distinctValues).toBe(3)
    expect(r.volatile[1].key).toBe('ascSign') // 2가지
  })

  it('최빈값과 비율을 준다 — "대개 이렇지만 확정은 아니다"', () => {
    const r = classifySensitivity([
      facts({ hourPillar: '甲子' }),
      facts({ hourPillar: '甲子' }),
      facts({ hourPillar: '甲子' }),
      facts({ hourPillar: '己巳' }),
    ])
    const f = r.volatile.find((x) => x.key === 'hourPillar')!
    expect(f.mode.value).toBe('甲子')
    expect(f.mode.share).toBeCloseTo(0.75)
  })

  it('샘플마다 행성 집합이 달라도 합집합으로 센다', () => {
    const r = classifySensitivity([
      facts({ overlayHouses: { Sun: 4 } }),
      facts({ overlayHouses: { Sun: 4, Moon: 8 } }),
    ])
    // Moon 은 한 샘플에만 있으므로 '' 와 '8' 두 값 → volatile
    expect(r.volatile.map((f) => f.key)).toContain('overlay:Moon')
    expect(r.totalFields).toBe(6)
  })

  it('모든 필드에 ko/en 라벨이 있다 — 키가 그대로 노출되지 않는다', () => {
    const r = classifySensitivity([facts(), facts({ hourPillar: '己巳' })])
    for (const f of [...r.stable, ...r.volatile]) {
      expect(f.label.ko, f.key).toBeTruthy()
      expect(f.label.en, f.key).toBeTruthy()
      expect(f.label.ko, f.key).not.toBe(f.key)
      expect(f.label.en, f.key).not.toMatch(/[가-힣]/)
    }
  })

  it('stable + volatile = totalFields (누락 없음)', () => {
    const r = classifySensitivity([
      facts({ hourPillar: 'A', overlayHouses: { Sun: 1, Moon: 2, Venus: 3 } }),
      facts({ hourPillar: 'B', overlayHouses: { Sun: 1, Moon: 9, Venus: 3 } }),
    ])
    expect(r.stable.length + r.volatile.length).toBe(r.totalFields)
  })
})

describe('factsFor', () => {
  const chart = (ascSign: string, cusps: number[]): Chart =>
    ({
      ascendant: { sign: ascSign, longitude: cusps[0] },
      houses: cusps.map((cusp) => ({ cusp })),
      planets: [],
    }) as unknown as Chart

  const cusps = Array.from({ length: 12 }, (_, i) => i * 30)

  it('상대 행성을 미상인 쪽 하우스에 떨어뜨린다', () => {
    const f = factsFor(
      chart('Scorpio', cusps),
      [
        { name: 'Sun', longitude: 95 },
        { name: 'Moon', longitude: 215 },
      ],
      '甲子',
      { seenByUnknown: 2, seenByPartner: 1 }
    )
    expect(f.ascSign).toBe('Scorpio')
    expect(f.hourPillar).toBe('甲子')
    expect(f.overlayHouses).toEqual({ Sun: 4, Moon: 8 })
    expect(f.spouseStarSeenByPartner).toBe(1)
  })

  it('10행성만 센다 — 노드·특수점은 제외(세대 공통이라 커플 신호가 아님)', () => {
    const f = factsFor(
      chart('Aries', cusps),
      [
        { name: 'Sun', longitude: 10 },
        { name: 'True Node', longitude: 10 },
        { name: 'Chiron', longitude: 10 },
      ],
      '甲子',
      { seenByUnknown: 0, seenByPartner: 0 }
    )
    expect(Object.keys(f.overlayHouses)).toEqual(['Sun'])
  })

  it('경도 없는 행성은 건너뛴다 — 0H 로 오염시키지 않는다', () => {
    const f = factsFor(
      chart('Aries', cusps),
      [{ name: 'Sun' }, { name: 'Moon', longitude: 40 }],
      '甲子',
      { seenByUnknown: 0, seenByPartner: 0 }
    )
    expect(f.overlayHouses).toEqual({ Moon: 2 })
  })
})
