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
    const view = buildFreeCompatNarrative(fullReport(), {
      labelA: '준영',
      labelB: '민지',
      lang: 'ko',
    })
    expect(view.verdict?.tone).toBe('aligned')
    expect(view.verdict?.text).toContain('한목소리')
    expect(view.verdict?.expansion.length).toBeGreaterThan(10)
    expect(view.intro.length).toBeGreaterThan(10)
    expect(view.closing.length).toBeGreaterThan(10)
  })

  it('emits the expected sections in order with names filled in', () => {
    const view = buildFreeCompatNarrative(fullReport(), {
      labelA: '준영',
      labelB: '민지',
      lang: 'ko',
    })
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
    const view = buildFreeCompatNarrative(fullReport(), {
      labelA: '준영',
      labelB: '민지',
      lang: 'ko',
    })
    for (const s of view.sections) {
      for (const p of s.paragraphs) {
        expect(p).not.toMatch(NO_PLACEHOLDER)
      }
    }
    expect(view.intro).not.toMatch(NO_PLACEHOLDER)
  })

  it('flags the day-pillar spouse-star as the strongest signal', () => {
    const view = buildFreeCompatNarrative(fullReport(), {
      labelA: '준영',
      labelB: '민지',
      lang: 'ko',
    })
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
    const view = buildFreeCompatNarrative(fullReport(), {
      labelA: 'Alex',
      labelB: 'Sam',
      lang: 'en',
    })
    expect(view.verdict?.expansion).toMatch(/[A-Za-z]/)
    const grain = view.sections.find((s) => s.id === 'grain')!
    // element label localized to English (금 → Metal, 목 → Wood)
    const joined = grain.paragraphs.join('\n')
    expect(joined).toMatch(/Metal|Wood/)
    // no Korean syllables in EN render of grain section
    expect(joined).not.toMatch(/[가-힣]/)
  })

  it('applies correct Korean particles after vowel-ending elements/flavors', () => {
    const r: CompatReport = {
      synView: {
        aspects: [
          {
            // 외행성끼리(Uranus×Neptune)는 리치카피 사전에 없어 fallback 합성기를 탄다
            // — vowel 종성 flavor(자극·변화)의 조사(과/와) 처리를 검증하기 위함.
            a: '천왕성',
            b: '해왕성',
            aKey: 'Uranus',
            bKey: 'Neptune',
            type: 'square',
            label: '긴장',
            tone: 'tension',
            orb: 2,
            strength: '강하게',
            meaning: '',
          },
        ],
        overlaysAtoB: [],
        overlaysBtoA: [],
        harmony: 0,
        tension: 1,
      },
      dayMaster: {
        aStem: '丙',
        aEl: '화',
        bStem: '癸',
        bEl: '수',
        relation: 'generate',
        relationLabel: '',
        bToA: null,
        aToB: null,
      },
      spouseStars: [],
      pillarRelations: [],
    }
    const view = buildFreeCompatNarrative(r, { labelA: 'A', labelB: 'B', lang: 'ko' })
    const all = view.sections.flatMap((s) => s.paragraphs).join('\n')
    // generate template "{aEl}과 {bEl}이" → 화 ends in vowel → 화와, 수 ends in vowel → 수가
    expect(all).toContain('화와')
    expect(all).toContain('수가')
    expect(all).not.toContain('화과')
    expect(all).not.toContain('수이')
    // aspect fallback "{flavor}과 {flavor}이" → 자극·변화 ends in vowel → 변화와
    expect(all).toContain('변화와')
    expect(all).not.toContain('변화과')
  })

  it('never leaks Hangul into EN theme cards (sik-sin/pyeon-gwan romanized)', () => {
    const r: CompatReport = {
      synView: null,
      dayMaster: {
        aStem: '丙',
        aEl: '화',
        bStem: '癸',
        bEl: '수',
        relation: 'generate',
        relationLabel: '',
        bToA: '편관',
        aToB: '식신',
      },
      spouseStars: [],
      pillarRelations: [],
    }
    const view = buildFreeCompatNarrative(r, { labelA: 'Mina', labelB: 'Joon', lang: 'en' })
    const all = view.themes.flatMap((th) => th.paragraphs).join('\n')
    expect(all).not.toMatch(/[가-힣]/)
    expect(all).toMatch(/sik-sin|pyeon-gwan/)
  })

  it('gives each theme a punchy hook and drops the bolted-on geometry tails', () => {
    const asp = (
      aKey: string,
      bKey: string,
      tone: 'harmony' | 'tension'
    ): NonNullable<CompatReport['synView']>['aspects'][number] => ({
      a: aKey,
      b: bKey,
      aKey,
      bKey,
      type: tone === 'harmony' ? 'trine' : 'square',
      label: tone === 'harmony' ? '조화' : '긴장',
      tone,
      orb: 1,
      strength: '강하게',
      meaning: '',
    })
    const r: CompatReport = {
      synView: {
        // 수성 조화 → talk(끌림 우세); 화성·토성 긴장 → friction
        aspects: [asp('Mercury', 'Moon', 'harmony'), asp('Mars', 'Saturn', 'tension')],
        overlaysAtoB: [],
        overlaysBtoA: [],
        harmony: 1,
        tension: 1,
      },
      dayMaster: null,
      spouseStars: [],
      pillarRelations: [],
    }
    const view = buildFreeCompatNarrative(r, { labelA: 'A', labelB: 'B', lang: 'ko' })
    const talk = view.themes.find((th) => th.id === 'talk')!
    expect(talk.hook).toBe('말 척척 통하는 사이 — 대화가 안 끊겨.') // 끌림 우세 → pos 훅
    const friction = view.themes.find((th) => th.id === 'friction')!
    expect(friction.hook).toBe('주로 자존심·주도권에서 부딪혀.') // 마찰만 → neg 훅
    // 기계적 기하 꼬리("물 흐르듯…", "서로 각을 세워…")는 더 이상 안 붙는다
    const all = view.themes.flatMap((th) => th.paragraphs).join('\n')
    expect(all).not.toContain('물 흐르듯 힘 안 들이고')
    expect(all).not.toContain('서로 각을 세워')
  })

  it('keeps both-direction overlays on the same house number (no cross-direction drop)', () => {
    const r: CompatReport = {
      synView: {
        aspects: [],
        // 같은 5번 방에 A→B(금성), B→A(화성) 둘 다 — 방향별로 따로 세야 둘 다 남는다.
        overlaysAtoB: [{ planet: '금성', planetKey: 'Venus', house: 5, meaning: '' }],
        overlaysBtoA: [{ planet: '화성', planetKey: 'Mars', house: 5, meaning: '' }],
        harmony: 0,
        tension: 0,
      },
      dayMaster: null,
      spouseStars: [],
      pillarRelations: [],
    }
    const view = buildFreeCompatNarrative(r, { labelA: 'A', labelB: 'B', lang: 'ko' })
    const all = view.themes.flatMap((th) => th.paragraphs).join('\n')
    expect(all).toContain('A의 금성')
    expect(all).toContain('B의 화성')
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
