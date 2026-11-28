// tests/lib/saju/sibsinProfile.test.ts
//
// 십성 사전 — 10개 색인 페이지의 콘텐츠 엔진 + 일주 60페이지와의 링크 그래프.
//
// 이 표면을 만든 이유가 두 개라 둘 다 테스트한다:
//  (1) 페이지마다 내용이 실제로 달라야 한다 — 일간 쌍 55개를 접은 이유가
//      "55쌍 중 사실집합 15개"였으므로, 같은 실수를 반복하지 않는지 검사한다.
//  (2) 일주 60페이지의 "배우자궁 ○○" 용어가 실제로 이 페이지들로 닿아야 한다.

import { describe, it, expect } from 'vitest'
import {
  SIBSIN_ORDER,
  allSibsinSlugs,
  sibsinBySlug,
  sibsinProfile,
  sibsinSlugOf,
} from '@/lib/saju/sibsinProfile'
import { allIljuGanji, iljuProfile } from '@/lib/saju/iljuProfile'
import { sibseongFor } from '@/lib/compatibility/sajuSynastryData'

describe('십성 10개 — 기본 정합성', () => {
  it('10개이고 슬러그가 유일하다', () => {
    expect(SIBSIN_ORDER).toHaveLength(10)
    const slugs = allSibsinSlugs()
    expect(slugs).toHaveLength(10)
    expect(new Set(slugs).size).toBe(10)
    for (const s of slugs) expect(s, s).toMatch(/^[a-z]+$/)
  })

  it('왕복한다 — slug → 프로필 → 같은 slug', () => {
    for (const s of allSibsinSlugs()) {
      const p = sibsinBySlug(s)
      expect(p, s).not.toBeNull()
      expect(p!.slug).toBe(s)
    }
  })

  it('없는 이름·슬러그는 null', () => {
    expect(sibsinProfile('없는십성')).toBeNull()
    expect(sibsinBySlug('nope')).toBeNull()
    expect(sibsinSlugOf('없는십성')).toBeNull()
  })

  it('배우자성 판정이 성별로 갈린다 — 재성 2개(남), 관성 2개(여)', () => {
    const all = SIBSIN_ORDER.map((n) => sibsinProfile(n)!)
    const male = all.filter((p) => p.isSpouseStarForMale).map((p) => p.name)
    const female = all.filter((p) => p.isSpouseStarForFemale).map((p) => p.name)
    expect(male.sort()).toEqual(['정재', '편재'])
    expect(female.sort()).toEqual(['정관', '편관'])
    // 한 십성이 양쪽 배우자성일 수는 없다.
    for (const p of all) {
      expect(p.isSpouseStarForMale && p.isSpouseStarForFemale, p.name).toBe(false)
    }
  })
})

describe('stemPairs — 일간마다 정확히 1개', () => {
  it('십성마다 10쌍이고 일간이 전부 다르다', () => {
    for (const n of SIBSIN_ORDER) {
      const p = sibsinProfile(n)!
      expect(p.stemPairs, n).toHaveLength(10)
      expect(new Set(p.stemPairs.map((x) => x.dayStem)).size, n).toBe(10)
    }
  })

  it('각 쌍이 실제로 그 십성을 만든다 (sibseongFor SSOT 와 일치)', () => {
    for (const n of SIBSIN_ORDER) {
      const p = sibsinProfile(n)!
      for (const pair of p.stemPairs) {
        expect(
          sibseongFor(pair.dayStem, pair.otherStem),
          `${n} ${pair.dayStem}→${pair.otherStem}`
        ).toBe(n)
      }
    }
  })

  it('10십성 × 10쌍 = 100 으로 일간 조합 전체를 정확히 덮는다', () => {
    const seen = new Set<string>()
    for (const n of SIBSIN_ORDER) {
      for (const pair of sibsinProfile(n)!.stemPairs) {
        seen.add(`${pair.dayStem}${pair.otherStem}`)
      }
    }
    expect(seen.size).toBe(100)
  })
})

describe('iljuWithSeat — 일주 60페이지와의 링크 그래프', () => {
  it('10십성의 일주 목록이 겹치지 않고 합쳐서 60개다', () => {
    const buckets = SIBSIN_ORDER.map((n) => sibsinProfile(n)!.iljuWithSeat.map((p) => p.ganji))
    const total = buckets.flat()
    expect(total).toHaveLength(60)
    expect(new Set(total).size).toBe(60)
  })

  it('일주의 배우자궁 십성과 양방향으로 맞는다', () => {
    for (const g of allIljuGanji()) {
      const ilju = iljuProfile(g)!
      const sib = sibsinProfile(ilju.spouseSeat.sibsin)!
      expect(
        sib.iljuWithSeat.map((p) => p.ganji),
        g
      ).toContain(g)
    }
  })

  it('일주 페이지가 쓰는 모든 배우자궁 용어에 목적지가 있다 (막다른 골목 금지)', () => {
    // 이 표면을 만든 이유 — /saju/ilju 60개가 "배우자궁 편인" 같은 문장을
    // 쓰는데 그 용어 페이지가 없으면 링크 그래프에 빠진 노드가 생긴다.
    for (const g of allIljuGanji()) {
      const ilju = iljuProfile(g)!
      expect(sibsinSlugOf(ilju.spouseSeat.sibsin), `${g} ${ilju.spouseSeat.sibsin}`).toBeTruthy()
    }
  })
})

describe('페이지 고유성 — 일간 쌍 55개를 접은 실수를 반복하지 않는다', () => {
  it('10페이지의 뜻풀이가 전부 다르고 충분히 길다', () => {
    const all = SIBSIN_ORDER.map((n) => sibsinProfile(n)!)
    const ko = all.map((p) => p.gloss.ko)
    const en = all.map((p) => p.gloss.en)
    expect(new Set(ko).size).toBe(10)
    expect(new Set(en).size).toBe(10)
    for (const p of all) {
      expect(p.gloss.ko.length, p.name).toBeGreaterThan(50)
      expect(p.gloss.en.length, p.name).toBeGreaterThan(50)
      // 언어가 섞이지 않는다.
      expect(p.gloss.en, p.name).not.toMatch(/[가-힣]/)
    }
  })

  it('페이지별 사실집합이 10/10 고유하다', () => {
    // 일간 쌍은 (오행관계 × 음양)으로 수렴해 55쌍 중 15개뿐이었다. 십성은
    // 계열·배우자성·일주 목록이 모두 달라 수렴하지 않아야 한다.
    const facts = SIBSIN_ORDER.map((n) => {
      const p = sibsinProfile(n)!
      return [
        p.groupKo,
        p.isSpouseStarForMale,
        p.isSpouseStarForFemale,
        p.iljuWithSeat.length,
        p.iljuWithSeat.map((x) => x.ganji).join(','),
      ].join('|')
    })
    expect(new Set(facts).size).toBe(10)
  })

  it('계열은 5개로 묶이고 각 2개씩이다 (비겁·식상·재성·관성·인성)', () => {
    const groups = SIBSIN_ORDER.map((n) => sibsinProfile(n)!.groupKo)
    const counts = groups.reduce((a: Record<string, number>, g) => {
      a[g] = (a[g] ?? 0) + 1
      return a
    }, {})
    expect(Object.keys(counts).sort()).toEqual(['관성', '식상', '인성', '재성', '비겁'].sort())
    for (const [g, c] of Object.entries(counts)) expect(c, g).toBe(2)
  })
})
