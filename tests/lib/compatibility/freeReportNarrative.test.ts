/**
 * buildFreeCompatNarrative — 무료 궁합 리포트 빌더.
 *
 * 결정적 facts(CompatReport) → 초보자용 섹션 산문(FreeReportView) 변환을 커버.
 *  - verdict tone + 확장 카피
 *  - 섹션 생성/생략 (빈 신호는 섹션 없음)
 *  - 자리표시자({A}/{aEl}) 치환 — 누수 없음
 *  - 일주(배우자 자리) 강한 신호 표시
 *  - ko/en 언어 분기
 */

import { describe, it, expect } from 'vitest'
import { buildFreeCompatNarrative } from '@/lib/compatibility/freeReport/buildNarrative'
import type { CompatReport } from '@/lib/compatibility/compatReport'

function fullReport(): CompatReport {
  return {
    crossVerdict: { tone: 'aligned', text: '사주도 별자리도 한목소리로 끌려요.' },
    band: {
      eastern_hap: 60,
      eastern_chung: 80,
      elements_match: 40,
      synastry_harmonic: 70,
      synastry_tension: 30,
    },
    dayMaster: {
      aStem: '甲',
      aEl: '목',
      bStem: '庚',
      bEl: '금',
      relation: 'bControlsA',
      relationLabel: '금극목',
      bToA: '정관',
      aToB: '정재',
    },
    spouseStars: [
      {
        from: 'A',
        sibsin: '정재',
        role: '처성(안정·가정)',
        pillar: '일',
        isDayPillar: true,
        source: 'branch',
        char: '酉',
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
    synView: {
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
          strength: '또렷이',
          meaning: '추진과 통제가 부딪는 자리',
        },
      ],
      overlaysAtoB: [{ planet: '금성', planetKey: 'Venus', house: 7, meaning: '동반자·결혼' }],
      overlaysBtoA: [],
      harmony: 5,
      tension: 2,
    },
    elementBalance: {
      merged: { 목: 3, 화: 5, 토: 2, 금: 3, 수: 1 },
      a: {},
      b: {},
      range: 4,
      balanced: false,
      strongest: '화',
      weakest: '수',
    },
  }
}

const NO_PLACEHOLDER = /\{[a-zA-Z]+\}/

describe('buildFreeCompatNarrative', () => {
  it('builds a verdict with tone-matched expansion', () => {
    const view = buildFreeCompatNarrative(fullReport(), { labelA: '준영', labelB: '민지', lang: 'ko' })
    expect(view.verdict?.tone).toBe('aligned')
    expect(view.verdict?.text).toContain('한목소리')
    expect(view.verdict?.expansion.length).toBeGreaterThan(10)
    expect(view.intro.length).toBeGreaterThan(10)
    expect(view.closing.length).toBeGreaterThan(10)
  })

  it('emits the expected sections in order with names filled in', () => {
    const view = buildFreeCompatNarrative(fullReport(), { labelA: '준영', labelB: '민지', lang: 'ko' })
    const ids = view.sections.map((s) => s.id)
    expect(ids).toEqual(['bands', 'grain', 'hearts', 'stage', 'partner', 'knots'])
    const grain = view.sections.find((s) => s.id === 'grain')!
    const joined = grain.paragraphs.join('\n')
    // day-master controls direction + element labels resolved (금극목 → 민지의 금이 준영의 목을)
    expect(joined).toContain('민지')
    expect(joined).toContain('준영')
    expect(joined).toContain('금')
    expect(joined).toContain('목')
  })

  it('never leaks {placeholder} tokens into any paragraph', () => {
    const view = buildFreeCompatNarrative(fullReport(), { labelA: '준영', labelB: '민지', lang: 'ko' })
    for (const s of view.sections) {
      for (const p of s.paragraphs) {
        expect(p).not.toMatch(NO_PLACEHOLDER)
      }
    }
    expect(view.intro).not.toMatch(NO_PLACEHOLDER)
  })

  it('flags the day-pillar spouse-star as the strongest signal', () => {
    const view = buildFreeCompatNarrative(fullReport(), { labelA: '준영', labelB: '민지', lang: 'ko' })
    const partner = view.sections.find((s) => s.id === 'partner')!
    expect(partner.paragraphs.join('\n')).toContain('배우자 자리')
  })

  it('orders aspects harmony-before-tension', () => {
    const view = buildFreeCompatNarrative(fullReport(), { labelA: 'A', labelB: 'B', lang: 'ko' })
    const hearts = view.sections.find((s) => s.id === 'hearts')!
    expect(hearts.paragraphs[0]).toContain('조화')
    expect(hearts.paragraphs[1]).toContain('긴장')
  })

  it('renders English copy when lang=en', () => {
    const view = buildFreeCompatNarrative(fullReport(), { labelA: 'Alex', labelB: 'Sam', lang: 'en' })
    expect(view.verdict?.expansion).toMatch(/[A-Za-z]/)
    const grain = view.sections.find((s) => s.id === 'grain')!
    // element label localized to English (금 → Metal, 목 → Wood)
    const joined = grain.paragraphs.join('\n')
    expect(joined).toMatch(/Metal|Wood/)
    // no Korean syllables in EN render of grain section
    expect(joined).not.toMatch(/[가-힣]/)
  })

  it('omits sections whose signals are absent', () => {
    const bare: CompatReport = {
      synView: null,
      dayMaster: null,
      spouseStars: [],
      pillarRelations: [],
    }
    const view = buildFreeCompatNarrative(bare, { labelA: 'A', labelB: 'B', lang: 'ko' })
    expect(view.sections).toHaveLength(0)
    expect(view.verdict).toBeNull()
    expect(view.glossary.length).toBeGreaterThan(5)
  })
})
