import { describe, it, expect } from 'vitest'
import {
  groupByTheme,
  buildHealthCard,
  THEME_DEFS,
  type ThemeRowLike,
} from '@/components/report/integrated/reportThemes'

const row = (category: string, tone: ThemeRowLike['tone'] = 'complement'): ThemeRowLike => ({
  category,
  tone,
  reason: `reason for ${category}`,
})

describe('reportThemes — groupByTheme', () => {
  it('교차 카테고리를 6개 큰 테마로 묶고 THEME_DEFS 순서를 지킨다', () => {
    const rows = [
      row('정체성'),
      row('연애·매력'),
      row('관계'),
      row('강점'),
      row('재물 그릇'),
      row('성장 방향'),
    ]
    const groups = groupByTheme(rows)
    const keys = groups.map((g) => g.def.key)
    // self < love < work < money < growth (순서 보존)
    expect(keys).toEqual(['self', 'love', 'work', 'money', 'growth'])
    // 연애 테마엔 연애·매력 + 관계 둘 다
    expect(groups.find((g) => g.def.key === 'love')!.rows).toHaveLength(2)
  })

  it('EN 카테고리 라벨도 동일 테마로 매핑된다', () => {
    const groups = groupByTheme([row('Identity'), row('Wealth Capacity')])
    expect(groups.map((g) => g.def.key)).toEqual(['self', 'money'])
  })

  it('빈 테마는 제외한다', () => {
    const groups = groupByTheme([row('정체성')])
    expect(groups).toHaveLength(1)
    expect(groups[0].def.key).toBe('self')
  })

  it('THEME_DEFS 는 health 포함 6개', () => {
    expect(THEME_DEFS).toHaveLength(6)
    expect(THEME_DEFS.map((d) => d.key)).toContain('health')
  })
})

describe('reportThemes — buildHealthCard', () => {
  it('결핍 오행이 있으면 tension + 해당 장부 경향을 짚는다', () => {
    const c = buildHealthCard({ wood: 3, fire: 0, earth: 2, metal: 2, water: 1 }, 'fire', 'ko')!
    expect(c.tone).toBe('tension')
    expect(c.reason).toContain('심장') // fire 결핍 → 심장·소장
    expect(c.reason).toContain('의학적 진단이 아니') // 면책
  })

  it('오행이 고르면 resonant(균형형)', () => {
    const c = buildHealthCard({ wood: 2, fire: 2, earth: 2, metal: 1, water: 1 }, 'water', 'ko')!
    expect(c.tone).toBe('resonant')
    expect(c.reason).toContain('균형형')
  })

  it('EN 은 한글이 새지 않는다', () => {
    const c = buildHealthCard({ wood: 0, fire: 6, earth: 1, metal: 1, water: 0 }, 'water', 'en')!
    expect(/[가-힣]/.test(c.reason)).toBe(false)
    expect(c.reason).toContain('medical diagnosis')
  })

  it('데이터 없으면 null', () => {
    expect(buildHealthCard(undefined, 'fire', 'ko')).toBeNull()
    expect(
      buildHealthCard({ wood: 0, fire: 0, earth: 0, metal: 0, water: 0 }, 'fire', 'ko')
    ).toBeNull()
  })
})
