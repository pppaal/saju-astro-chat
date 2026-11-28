// tests/lib/saju/ilganCompat.test.ts
//
// 일간×일간 궁합 — 55개 SEO 페이지의 콘텐츠 엔진.
// 페이지가 자동 생성되므로 엔진이 틀리면 55페이지가 같이 틀린다.
//
// 핵심 불변식: 오행 관계는 **대칭**, 십성은 **방향이 있다**. 辛×甲 은 금극목
// 하나지만 辛→甲 은 정재, 甲→辛 은 정관이다. 이 비대칭이 뒤집히면
// "남자에게 남편성" 같은 모순이 그대로 55페이지에 박힌다(이 세션에서 실제로
// 났던 사고 — spouseStarsFor SSOT 가 생긴 이유).

import { describe, it, expect } from 'vitest'
import {
  ILGAN_ORDER,
  allIlganPairSlugs,
  canonicalIlganSlug,
  ilganCompat,
  ilganCompatBySlug,
  ilganPairsFor,
} from '@/lib/saju/ilganCompat'
import { sibseongFor, STEM_EL } from '@/lib/compatibility/sajuSynastryData'

describe('정규 쌍 — 중복 색인 방지', () => {
  it('55개(C(10,2)=45 + 동일 10)이고 중복이 없다', () => {
    const all = allIlganPairSlugs()
    expect(all).toHaveLength(55)
    expect(new Set(all).size).toBe(55)
  })

  it('역순 입력도 같은 정규 슬러그를 준다', () => {
    expect(canonicalIlganSlug('辛', '甲')).toBe(canonicalIlganSlug('甲', '辛'))
    expect(canonicalIlganSlug('甲', '辛')).toBe('gap-sin')
  })

  it('역순 슬러그로 조회해도 정규 결과가 나온다 (canonical 처리의 근거)', () => {
    const fwd = ilganCompatBySlug('gap-sin')!
    const rev = ilganCompatBySlug('sin-gap')!
    expect(rev.slug).toBe(fwd.slug)
    expect(rev.a.han).toBe(fwd.a.han)
    expect(rev.aToB).toBe(fwd.aToB)
  })

  it('슬러그는 소문자 영문 + 하이픈 하나', () => {
    for (const s of allIlganPairSlugs()) {
      expect(s, s).toMatch(/^[a-z]+-[a-z]+$/)
    }
  })

  it('없는 슬러그는 null — 404 로 보낸다', () => {
    expect(ilganCompatBySlug('nope-nope')).toBeNull()
    expect(ilganCompatBySlug('gap')).toBeNull()
    expect(ilganCompatBySlug('gap-sin-im')).toBeNull()
    expect(ilganCompat('甲', '子')).toBeNull() // 지지는 일간이 아니다
  })
})

describe('오행 관계 — 대칭이어야 한다', () => {
  it('A×B 와 B×A 의 관계가 서로 뒤집힌 짝이다', () => {
    const flip: Record<string, string> = {
      same: 'same',
      aControlsB: 'bControlsA',
      bControlsA: 'aControlsB',
      aGeneratesB: 'bGeneratesA',
      bGeneratesA: 'aGeneratesB',
    }
    for (const x of ILGAN_ORDER) {
      for (const y of ILGAN_ORDER) {
        // ilganCompat 는 정규 정렬하므로, 관계는 정렬된 a/b 기준으로 읽는다.
        const p = ilganCompat(x, y)!
        const q = ilganCompat(y, x)!
        expect(p.relation, `${x}${y}`).toBe(q.relation)
        expect(flip[p.relation], `${x}${y}`).toBeDefined()
      }
    }
  })

  it('같은 오행이면 same, 아니면 생·극 중 하나로 반드시 판정된다', () => {
    for (const x of ILGAN_ORDER) {
      for (const y of ILGAN_ORDER) {
        const p = ilganCompat(x, y)!
        if (STEM_EL[p.a.han] === STEM_EL[p.b.han]) {
          expect(p.relation, `${x}${y}`).toBe('same')
        } else {
          expect(p.relation, `${x}${y}`).not.toBe('same')
        }
      }
    }
  })
})

describe('십성 — 방향이 있다', () => {
  it('aToB/bToA 가 sibseongFor SSOT 와 일치한다', () => {
    for (const s of allIlganPairSlugs()) {
      const p = ilganCompatBySlug(s)!
      expect(p.aToB, s).toBe(sibseongFor(p.a.han, p.b.han))
      expect(p.bToA, s).toBe(sibseongFor(p.b.han, p.a.han))
    }
  })

  it('같은 일간끼리는 양쪽 다 비견 (음양이 같으므로)', () => {
    for (const x of ILGAN_ORDER) {
      const p = ilganCompat(x, x)!
      expect(p.isSame, x).toBe(true)
      expect(p.aToB, x).toBe('비견')
      expect(p.bToA, x).toBe('비견')
    }
  })
})

describe('배우자성 — 성별로 갈린다 (남=재성, 여=관성)', () => {
  it('재성/관성 판정이 십성과 정확히 대응한다', () => {
    for (const s of allIlganPairSlugs()) {
      const p = ilganCompatBySlug(s)!
      expect(p.aAsMaleSeesSpouse, s).toBe(p.aToB === '정재' || p.aToB === '편재')
      expect(p.aAsFemaleSeesSpouse, s).toBe(p.aToB === '정관' || p.aToB === '편관')
      expect(p.bAsMaleSeesSpouse, s).toBe(p.bToA === '정재' || p.bToA === '편재')
      expect(p.bAsFemaleSeesSpouse, s).toBe(p.bToA === '정관' || p.bToA === '편관')
    }
  })

  it('한 사람이 남자 처성·여자 부성을 동시에 보지 않는다 (재성과 관성은 배타)', () => {
    for (const s of allIlganPairSlugs()) {
      const p = ilganCompatBySlug(s)!
      expect(p.aAsMaleSeesSpouse && p.aAsFemaleSeesSpouse, s).toBe(false)
      expect(p.bAsMaleSeesSpouse && p.bAsFemaleSeesSpouse, s).toBe(false)
    }
  })
})

describe('상호 정배우자성 — 약 10% 라는 주장을 검산한다', () => {
  it('극 + 음양 다름이면 성립하고, 정규 쌍 55개 중 10건이다', () => {
    const hits = allIlganPairSlugs()
      .map((s) => ilganCompatBySlug(s)!)
      .filter((p) => p.mutualPrimarySpouse)

    // 분모를 두 가지로 셀 수 있으니 분명히 해둔다:
    //
    //  (1) 순서 무관 일간 쌍 55개 중 **10개**. 일간 10개 각각에 "내가 극하고
    //      음양이 다른" 상대가 정확히 1개 있고, 극은 한 방향이라 그 쌍이
    //      중복 계산되지 않는다 → 10쌍.
    //
    //  (2) (남자 일간, 여자 일간) 순서 있는 조합 100개 중 **10개 = 10%**.
    //      위 10쌍 각각에서 성별 배치 2가지 중 1가지만 성립한다 — 甲(여)×辛(남)
    //      이면 辛은 甲을 정재(남자 처성 ✓), 甲은 辛을 정관(여자 부성 ✓)으로
    //      보지만, 甲(남)×辛(여)이면 甲이 辛을 정관으로 보는데 남자 배우자성은
    //      재성이라 성립하지 않는다.
    //
    // 리포트에서 "일간 조합 100 중 10, 약 10%" 라고 말한 건 (2) 기준이다.
    expect(hits).toHaveLength(10)
    for (const p of hits) {
      // 상호 정재-정관이면 반드시 극 관계이고 음양이 다르다.
      expect(['aControlsB', 'bControlsA'], p.slug).toContain(p.relation)
      expect(p.a.yinYang, p.slug).not.toBe(p.b.yinYang)
      expect([p.aToB, p.bToA].sort(), p.slug).toEqual(['정관', '정재'])
    }
  })

  it('甲×辛 은 상호 정배우자성이다 (손검산)', () => {
    const p = ilganCompat('辛', '甲')!
    expect(p.slug).toBe('gap-sin')
    expect(p.a.han).toBe('甲') // 정규 정렬
    expect(p.relation).toBe('bControlsA') // 辛(금)이 甲(목)을 극
    expect(p.aToB).toBe('정관') // 甲 입장에서 辛 = 정관
    expect(p.bToA).toBe('정재') // 辛 입장에서 甲 = 정재
    expect(p.mutualPrimarySpouse).toBe(true)
    expect(p.aAsFemaleSeesSpouse).toBe(true) // 甲 이 여자면 辛 이 부성
    expect(p.bAsMaleSeesSpouse).toBe(true) // 辛 이 남자면 甲 이 처성
    expect(p.stemChung).toBe(false) // 甲 의 충은 庚
  })
})

describe('천간합·충 — SSOT 대칭', () => {
  it('천간합은 5쌍, 천간충은 4쌍 (정규 쌍 기준)', () => {
    const all = allIlganPairSlugs().map((s) => ilganCompatBySlug(s)!)
    expect(all.filter((p) => p.stemHap).length).toBe(5)
    expect(all.filter((p) => p.stemChung).length).toBe(4)
  })

  it('甲己 합토, 乙辛 충', () => {
    expect(ilganCompat('甲', '己')!.stemHap).toEqual({ element: '토' })
    expect(ilganCompat('乙', '辛')!.stemChung).toBe(true)
  })

  it('같은 일간끼리는 합도 충도 아니다', () => {
    for (const x of ILGAN_ORDER) {
      const p = ilganCompat(x, x)!
      expect(p.stemHap, x).toBeNull()
      expect(p.stemChung, x).toBe(false)
    }
  })
})

describe('ilganPairsFor — 일주 페이지 교차 링크', () => {
  it('일간마다 10개 쌍, 전부 정규 슬러그', () => {
    const valid = new Set(allIlganPairSlugs())
    for (const x of ILGAN_ORDER) {
      const pairs = ilganPairsFor(x)
      expect(pairs, x).toHaveLength(10)
      for (const s of pairs) expect(valid.has(s), `${x} → ${s}`).toBe(true)
    }
  })

  it('일간이 아니면 빈 배열', () => {
    expect(ilganPairsFor('子')).toEqual([])
  })
})
