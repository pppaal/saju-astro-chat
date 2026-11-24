// deriveCounts — 사주에서 오행 수를 뽑는 순수 함수 (src/lib/report/elementCounts.ts).
// 예전 ElementRadar 컴포넌트 테스트에서 컴포넌트 렌더 부분을 빼고 옮겨 왔다.
import { describe, it, expect } from 'vitest'
import { deriveCounts } from '@/lib/report/elementCounts'

describe('deriveCounts', () => {
  it('returns all zeros for nullish / non-object input', () => {
    expect(deriveCounts(undefined)).toEqual({ wood: 0, fire: 0, earth: 0, metal: 0, water: 0 })
    expect(deriveCounts(null)).toEqual({ wood: 0, fire: 0, earth: 0, metal: 0, water: 0 })
    expect(deriveCounts(42)).toEqual({ wood: 0, fire: 0, earth: 0, metal: 0, water: 0 })
  })

  it('reads counts from fiveElements with english keys', () => {
    expect(
      deriveCounts({ fiveElements: { wood: 2, fire: 1, earth: 3, metal: 0, water: 1 } })
    ).toEqual({ wood: 2, fire: 1, earth: 3, metal: 0, water: 1 })
  })

  it('reads counts from fiveElements with korean keys', () => {
    expect(deriveCounts({ fiveElements: { 목: 1, 화: 2, 토: 1, 금: 1, 수: 1 } })).toEqual({
      wood: 1,
      fire: 2,
      earth: 1,
      metal: 1,
      water: 1,
    })
  })

  it('ignores unknown keys / non-number values in fiveElements', () => {
    expect(deriveCounts({ fiveElements: { wood: 2, junk: 9, fire: 'x' } })).toEqual({
      wood: 2,
      fire: 0,
      earth: 0,
      metal: 0,
      water: 0,
    })
  })

  it('falls back to counting pillars (pillars.* shape)', () => {
    const saju = {
      pillars: {
        year: {
          heavenlyStem: { element: 'wood' },
          earthlyBranch: { element: 'water' },
        },
        day: {
          heavenlyStem: { element: '화' },
          earthlyBranch: { element: '토' },
        },
      },
    }
    expect(deriveCounts(saju)).toEqual({ wood: 1, fire: 1, earth: 1, metal: 0, water: 1 })
  })

  it('falls back to counting legacy *Pillar shape', () => {
    const saju = {
      yearPillar: { heavenlyStem: { element: '목' }, earthlyBranch: { element: '목' } },
      monthPillar: { heavenlyStem: { element: 'metal' } },
    }
    expect(deriveCounts(saju)).toEqual({ wood: 2, fire: 0, earth: 0, metal: 1, water: 0 })
  })

  it('returns zeros when no element data resolvable', () => {
    expect(deriveCounts({ pillars: {} })).toEqual({
      wood: 0,
      fire: 0,
      earth: 0,
      metal: 0,
      water: 0,
    })
  })
})
