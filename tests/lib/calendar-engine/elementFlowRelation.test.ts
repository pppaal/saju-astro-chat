/**
 * saju-element-flow elementRelation — 일진 오행(from) vs 본명 일간(to) 의 십성/극성.
 *
 * 회귀: 직전엔 극하는/극받는 관계의 십성·polarity 가 뒤바뀌어 있었다.
 *  - 일진이 일간을 극함(=官星 압박)이 '재성/0' 으로 잘못 → polarity!==0 필터에 걸려 *사라짐*
 *  - 일간이 일진을 극함(=財星 중립)이 '관성/-2' 로 잘못 떴다.
 * core/sibsin SSOT 기준으로 바로잡은 방향을 잠근다.
 */
import { describe, it, expect } from 'vitest'
import { elementRelation } from '@/lib/calendar-engine/extractors/saju/saju-element-flow'

describe('elementRelation — 십성 방향 (일간 기준)', () => {
  it('일진이 일간을 극함 = 官星 압박 (label 관성, polarity -2)', () => {
    // from=금(일진) 극 to=목(일간): 金剋木
    const r = elementRelation('금', '목')
    expect(r).toMatchObject({ kind: 'control', polarity: -2 })
    expect(r?.label).toContain('관성')
  })

  it('일간이 일진을 극함 = 財星 중립 (label 재성, polarity 0)', () => {
    // from=토(일진) ← to=목(일간) 극: 木剋土
    const r = elementRelation('토', '목')
    expect(r).toMatchObject({ kind: 'be-controlled', polarity: 0 })
    expect(r?.label).toContain('재성')
  })

  it('일진이 일간을 생함 = 印星 (polarity +2)', () => {
    // from=수(일진) 생 to=목(일간): 水生木
    const r = elementRelation('수', '목')
    expect(r?.polarity).toBe(2)
    expect(r?.label).toContain('인성')
  })

  it('동일 오행 = 比劫 (polarity +1)', () => {
    expect(elementRelation('목', '목')).toMatchObject({ kind: 'same', polarity: 1 })
  })
})
