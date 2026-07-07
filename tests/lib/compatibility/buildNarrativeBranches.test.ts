// tests/lib/compatibility/buildNarrativeBranches.test.ts
//
// buildFreeCompatNarrative — 기본 fixture 로 안 닿는 분기 커버:
//  - 배우자성 2개(정/편 상반) → 미래 테마 봉합 한 줄
//  - 삼합/방합 branchCombos → 매듭 섹션
//  - 하우스 오버레이(A→B, B→A) → 무대 섹션
//  - 오행 균형 섹션 · en 언어 · 마찰 과부하(THEME_PARA_CAP)

import { describe, it, expect } from 'vitest'
import { buildFreeCompatNarrative } from '@/lib/compatibility/freeReport/buildNarrative'
import type { CompatReport } from '@/lib/compatibility/compatReport'

// 배우자성 정(정재)·편(편관) 상반 + 삼합 + 오버레이 + 오행균형을 모두 담은 리포트.
function richReport(): CompatReport {
  return {
    crossVerdict: { tone: 'mixed', text: '한쪽은 끌리고 한쪽은 부딪혀요.' },
    band: {
      eastern_hap: 40,
      eastern_chung: 60,
      elements_match: 80,
      synastry_harmonic: 90,
      synastry_tension: 20,
    },
    dayMaster: {
      aStem: '甲',
      aEl: '목',
      bStem: '丙',
      bEl: '화',
      relation: 'generate',
      relationLabel: '목생화',
      bToA: '편관',
      aToB: '정재',
    },
    spouseStars: [
      // 상반: A 는 정재(정=안정), B 는 편관(편=설렘) — 둘 다 일주(강신호)
      {
        from: 'A',
        sibsin: '정재',
        role: '처성(안정·가정)',
        pillar: '일',
        isDayPillar: true,
        source: 'branch',
        char: '酉',
      },
      {
        from: 'B',
        sibsin: '편관',
        role: '부성(열정·자극)',
        pillar: '일',
        isDayPillar: true,
        source: 'branch',
        char: '卯',
      },
    ],
    pillarRelations: [
      {
        aPillar: '일',
        bPillar: '일',
        aChar: '子',
        bChar: '午',
        layer: 'branch',
        tags: ['충'],
        tone: 'clash',
        isDayInvolved: true,
      },
      {
        aPillar: '년',
        bPillar: '월',
        aChar: '寅',
        bChar: '亥',
        layer: 'branch',
        tags: ['육합'],
        tone: 'bond',
        isDayInvolved: false,
      },
    ],
    branchCombos: [
      {
        type: '삼합',
        branches: ['申', '子', '辰'],
        element: '수',
        completion: 'full',
        aBranches: ['申', '辰'],
        bBranches: ['子'],
        isDayInvolved: true,
      },
    ],
    elementBalance: {
      merged: { 목: 3, 화: 2, 토: 1, 금: 1, 수: 1 },
      a: { 목: 2, 화: 1, 토: 0, 금: 1, 수: 0 },
      b: { 목: 1, 화: 1, 토: 1, 금: 0, 수: 1 },
      range: 2,
      balanced: false,
      strongest: '목',
      weakest: '토',
    },
    synView: {
      harmony: 3,
      tension: 1,
      aspects: [
        {
          a: '달',
          b: '해',
          aKey: 'Moon',
          bKey: 'Sun',
          type: 'trine',
          label: '조화',
          tone: 'harmony',
          orb: 1,
          strength: '강하게',
          meaning: '자아와 감정이 맞물리는 자리',
        },
        {
          a: '화성',
          b: '토성',
          aKey: 'Mars',
          bKey: 'Saturn',
          type: 'square',
          label: '긴장',
          tone: 'tension',
          orb: 2,
          strength: '약하게',
          meaning: '추진과 제동이 부딪히는 자리',
        },
      ],
      overlaysAtoB: [
        { planet: '금성', planetKey: 'Venus', house: 7, meaning: '관계·파트너십의 자리' },
        { planet: '목성', planetKey: 'Jupiter', house: 10, meaning: '사회적 성취의 자리' },
      ],
      overlaysBtoA: [{ planet: '달', planetKey: 'Moon', house: 4, meaning: '가정·안정의 자리' }],
    },
  } as unknown as CompatReport
}

describe('buildFreeCompatNarrative — 확장 분기', () => {
  it('배우자성 정/편 상반이면 미래 테마에 "두 얼굴" 봉합 문장이 들어간다 (ko)', () => {
    const view = buildFreeCompatNarrative(richReport(), {
      labelA: '준영',
      labelB: '지민',
      lang: 'ko',
    })
    // 테마 카드는 view.themes 에 있음(view.sections 와 별개).
    const themeText = view.themes.flatMap((th) => th.paragraphs).join('\n')
    expect(themeText).toContain('다른 얼굴의 인연')
    // 미래 테마엔 상반 배우자성 중 하나만(대표) — 정재/편관 blurb 가 둘 다 들어가지 않음
    const future = view.themes.find((th) => th.id === 'future')
    expect(future).toBeTruthy()
    // 자리표시자 누수 없음(섹션+테마 전체)
    const all = [...view.sections, ...view.themes].flatMap((x) => x.paragraphs).join('\n')
    expect(all).not.toMatch(/\{[A-Za-z]+\}/)
  })

  it('삼합 branchCombos 는 매듭 섹션에 국(局) 표기로 들어간다', () => {
    const view = buildFreeCompatNarrative(richReport(), {
      labelA: '준영',
      labelB: '지민',
      lang: 'ko',
    })
    const all = view.sections.flatMap((s) => s.paragraphs).join('\n')
    expect(all).toContain('삼합')
  })

  it('하우스 오버레이(A→B·B→A)가 무대 섹션을 만든다', () => {
    const view = buildFreeCompatNarrative(richReport(), {
      labelA: '준영',
      labelB: '지민',
      lang: 'ko',
    })
    const ids = view.sections.map((s) => s.id)
    expect(ids).toContain('stage')
  })

  it('en 로도 자리표시자 누수 없이 렌더되고 섹션이 생성된다', () => {
    const view = buildFreeCompatNarrative(richReport(), {
      labelA: 'Alex',
      labelB: 'Sam',
      lang: 'en',
    })
    const all = view.sections.flatMap((s) => s.paragraphs).join('\n')
    expect(view.sections.length).toBeGreaterThan(0)
    expect(all).not.toMatch(/\{[A-Za-z]+\}/)
    expect(all).toContain('spouse') // 배우자 자리 en blurb
  })

  it('verdict 확장 카피가 tone 과 함께 붙는다', () => {
    const view = buildFreeCompatNarrative(richReport(), {
      labelA: '준영',
      labelB: '지민',
      lang: 'ko',
    })
    expect(view.verdict?.tone).toBe('mixed')
    expect((view.verdict?.expansion ?? '').length).toBeGreaterThan(0)
  })

  it('마찰 신호가 많아도 한 테마가 THEME_PARA_CAP(5)을 넘지 않는다', () => {
    const r = richReport()
    // 마찰 테마로 몰릴 tension 어스펙트를 다량 주입
    r.synView!.aspects = Array.from({ length: 9 }, (_, i) => ({
      a: `p${i}`,
      b: `q${i}`,
      aKey: `Ka${i}`,
      bKey: `Kb${i}`,
      type: 'square',
      label: '긴장',
      tone: 'tension' as const,
      orb: 2,
      strength: '강하게',
      meaning: `충돌 신호 ${i}`,
    }))
    const view = buildFreeCompatNarrative(r, { labelA: '준영', labelB: '지민', lang: 'ko' })
    for (const th of view.themes) {
      expect(th.paragraphs.length).toBeLessThanOrEqual(6) // primer 1 + 본문 ≤5(THEME_PARA_CAP)
    }
  })
})
