// tests/lib/compatibility/overlayCopy.test.ts
//
// 무료 궁합 리포트 "서로의 삶에서 켜지는 무대"(하우스 오버레이) 품질 가드.
//
// 이전 증상(실측):
//   · 방향별로 하우스 설명을 따로 펴서 A→B 12H 와 B→A 12H 가 토씨까지 같은 문단을
//     두 번 냈다 — 13문단 중 8문단이 완전 중복(62%).
//   · 하우스 사전이 12키뿐이라 금성이 오든 토성이 오든 같은 문장이 나왔다
//     ("행성 이름만 불리고 의미엔 안 들어간다").

import { describe, it, expect } from 'vitest'
import { PLANET_HOUSE, HOUSE_SHORT, OVERLAY_HOUSE } from '@/lib/compatibility/freeReport/content'

describe('PLANET_HOUSE — 행성×하우스 고유 카피', () => {
  it('키 형식은 `${planetKey}|${house}` 이고 ko/en 이 모두 채워져 있다', () => {
    const keys = Object.keys(PLANET_HOUSE)
    expect(keys.length).toBeGreaterThan(0)
    for (const k of keys) {
      expect(k).toMatch(/^[A-Za-z]+\|([1-9]|1[0-2])$/)
      const v = PLANET_HOUSE[k]
      expect(v.ko.trim().length).toBeGreaterThan(10)
      expect(v.en.trim().length).toBeGreaterThan(10)
    }
  })

  it('같은 하우스라도 행성이 다르면 문장이 다르다(제네릭 방지)', () => {
    // 7하우스에 여러 행성 항목이 있어야 하고, 서로 달라야 한다.
    const h7 = Object.entries(PLANET_HOUSE).filter(([k]) => k.endsWith('|7'))
    expect(h7.length).toBeGreaterThanOrEqual(3)
    const kos = new Set(h7.map(([, v]) => v.ko))
    expect(kos.size).toBe(h7.length)
  })

  it('하우스 설명(OVERLAY_HOUSE)과도 겹치지 않는다', () => {
    for (const [k, v] of Object.entries(PLANET_HOUSE)) {
      const house = Number(k.split('|')[1])
      expect(v.ko).not.toBe(OVERLAY_HOUSE[house]?.ko)
    }
  })
})

describe('HOUSE_SHORT — 반복 하우스 지칭용 짧은 이름', () => {
  it('1~12 전부 있고 서로 다르다', () => {
    for (let h = 1; h <= 12; h++) {
      expect(HOUSE_SHORT[h]).toBeDefined()
      expect(HOUSE_SHORT[h].ko.length).toBeGreaterThan(1)
    }
    const kos = new Set(Array.from({ length: 12 }, (_, i) => HOUSE_SHORT[i + 1].ko))
    expect(kos.size).toBe(12)
  })
})
