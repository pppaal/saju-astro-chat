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
    // 헤드라인 총점 — 40~97 숫자 + 등급 라벨
    expect(typeof view.overallScore).toBe('number')
    expect(view.overallScore!).toBeGreaterThanOrEqual(40)
    expect(view.overallScore!).toBeLessThanOrEqual(97)
    expect(typeof view.overallGrade).toBe('string')
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
    // 끌림 우세 → pos 훅(원본 또는 커플 해시로 고른 대체 변형 중 하나)
    expect([
      '말 끝을 서로 채우는 사이 — 대화가 안 끊겨.',
      '눈빛만 봐도 아는 사이 — 설명이 필요 없어.',
    ]).toContain(talk.hook)
    // 점수 칩 — 0~100 숫자 + 차원 라벨
    expect(typeof talk.score).toBe('number')
    expect(talk.score!).toBeGreaterThanOrEqual(0)
    expect(talk.score!).toBeLessThanOrEqual(100)
    expect(talk.scoreCaption).toBe('소통')
    const friction = view.themes.find((th) => th.id === 'friction')!
    // 마찰만 → neg 훅(원본 또는 대체 변형)
    expect(['자존심·주도권에서 제대로 맞붙어.', '누가 위냐를 두고 불꽃 튀는 쌍이야.']).toContain(
      friction.hook
    )
    expect(friction.scoreCaption).toBe('마찰')
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
    expect(view.themes).toHaveLength(0)
    expect(view.overallScore).toBeNull() // 신호 0 → 총점 없음
    expect(view.verdict).toBeNull()
    expect(view.glossary.length).toBeGreaterThan(5)
  })

  it('exposes score drivers — what lifted vs weighed the headline score', () => {
    const view = buildFreeCompatNarrative(fullReport(), {
      labelA: '준영',
      labelB: '민지',
      lang: 'ko',
    })
    const d = view.scoreDrivers
    expect(d).not.toBeNull()
    expect(d!.lifts.length).toBeGreaterThanOrEqual(1)
    expect(d!.weighs.length).toBeGreaterThanOrEqual(1)
    // 라벨은 비지 않은 문자열, 점수는 0~100 정수.
    for (const x of [...d!.lifts, ...d!.weighs]) {
      expect(typeof x.label).toBe('string')
      expect(x.label.length).toBeGreaterThan(0)
      expect(Number.isInteger(x.score)).toBe(true)
      expect(x.score).toBeGreaterThanOrEqual(0)
      expect(x.score).toBeLessThanOrEqual(100)
    }
    // 드라이버는 실제 테마 점수와 일치해야 한다(=총점 산출원). lifts = 끌림축 최고,
    // weighs 는 끌림축 최저를 포함.
    const pos = view.themes.filter((t) => t.id !== 'friction' && typeof t.score === 'number')
    const maxPos = Math.max(...pos.map((t) => t.score!))
    const minPos = Math.min(...pos.map((t) => t.score!))
    expect(d!.lifts[0].score).toBe(maxPos)
    expect(d!.weighs.some((w) => w.score === minPos)).toBe(true)
    // lifts 는 내림차순.
    if (d!.lifts.length === 2) expect(d!.lifts[0].score).toBeGreaterThanOrEqual(d!.lifts[1].score)
    // 같은 테마가 lifts 와 weighs 에 동시에 나오면 안 된다("올린 요인 X · 내린
    // 요인 X" 자기모순). 평균 기준 분리(> mean vs < mean)라 구조적으로 disjoint.
    const liftLabels = new Set(d!.lifts.map((x) => x.label))
    for (const w of d!.weighs) {
      expect(liftLabels.has(w.label), `${w.label} 가 lifts/weighs 양쪽에 노출됨`).toBe(false)
    }
  })

  it('has no score drivers when there is no score (no signals)', () => {
    const bare: CompatReport = {
      synView: null,
      dayMaster: null,
      spouseStars: [],
      pillarRelations: [],
    }
    const view = buildFreeCompatNarrative(bare, { labelA: 'A', labelB: 'B', lang: 'ko' })
    expect(view.scoreDrivers).toBeNull()
  })

  it('밴드 카피: 충 2~3건엔 "거의 없어"류 카피가 붙지 않고, 0~1건과 문구가 달라진다', () => {
    // 예전엔 v≥50 이라 충 3건(eastern_chung=55)에도 "충이 거의 없어" 가 붙어
    // 같은 리포트의 매듭 섹션(충 3건 나열)과 자기모순이었다. 임계 85 로
    // clash≤1(값 ≥85) 일 때만 high("거의 없어")가 되게 고쳤다. (카피 본문은
    // GENERATED 변형이라 정확 문자열 대신 "거의 없어" 유무 + high/low 분기 전환을
    // 검사한다.)
    const bandsText = (chung: number) => {
      const r: CompatReport = {
        synView: null,
        dayMaster: null,
        spouseStars: [],
        pillarRelations: [],
        band: { eastern_chung: chung },
      }
      const view = buildFreeCompatNarrative(r, { labelA: 'A', labelB: 'B', lang: 'ko' })
      return view.sections.find((s) => s.id === 'bands')!.paragraphs.join(' ')
    }
    const clash3 = bandsText(55) // 충 3건
    const clash2 = bandsText(70) // 충 2건
    const clash1 = bandsText(85) // 충 1건
    // 2~3건엔 "거의 없어" 라는 절대적 무충돌 카피가 붙으면 안 된다.
    expect(clash3).not.toContain('거의 없어')
    expect(clash2).not.toContain('거의 없어')
    // 1건(임계 통과)은 low 문구와 달라진다(high 분기 전환 확인).
    expect(clash1).not.toBe(clash3)
  })

  it('밴드 카피: synastry_tension 긴장 2건(60)엔 "거의 없어"류가 붙지 않는다', () => {
    const r: CompatReport = {
      synView: null,
      dayMaster: null,
      spouseStars: [],
      pillarRelations: [],
      band: { synastry_tension: 60 }, // 긴장 2건 (100−tens×20)
    }
    const view = buildFreeCompatNarrative(r, { labelA: 'A', labelB: 'B', lang: 'ko' })
    const text = view.sections.find((s) => s.id === 'bands')!.paragraphs.join(' ')
    expect(text).not.toContain('거의 없어')
  })
})
