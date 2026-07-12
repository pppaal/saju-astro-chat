import { describe, it, expect } from 'vitest'
import { sanitizeAstro } from '@/app/api/compatibility/report/route'

// 시너스트리 엔진의 planetsA×planetsB 이중 루프(O(n×m))에 상한이 없어, 공개
// 토큰만으로 거대한 planets 배열을 실어 2차식 CPU 를 유발할 수 있던 갭의 회귀.
// sanitizeAstro 가 planets/houses 를 넉넉한 상한으로 자르되 정상 입력·타 필드는
// 보존하는지 검증한다.
describe('sanitizeAstro — planets/houses 상한 (compat/report DoS 가드)', () => {
  it('행성 배열을 40개로 자른다', () => {
    const huge = { planets: Array.from({ length: 5000 }, (_, i) => ({ longitude: i })) }
    const out = sanitizeAstro(huge) as { planets: unknown[] }
    expect(out.planets).toHaveLength(40)
  })

  it('하우스 배열을 24개로 자른다', () => {
    const huge = {
      planets: [{ longitude: 1 }],
      houses: Array.from({ length: 1000 }, (_, i) => ({ cusp: i })),
    }
    const out = sanitizeAstro(huge) as { houses: unknown[] }
    expect(out.houses).toHaveLength(24)
  })

  it('정상 크기 차트(행성 ~14·하우스 12)는 자르지 않고 다른 필드도 보존한다', () => {
    const chart = {
      planets: Array.from({ length: 14 }, (_, i) => ({ name: `p${i}`, longitude: i })),
      houses: Array.from({ length: 12 }, (_, i) => ({ cusp: i })),
      ascendant: { longitude: 15 },
      mc: { longitude: 285 },
    }
    const out = sanitizeAstro(chart) as typeof chart
    expect(out.planets).toHaveLength(14)
    expect(out.houses).toHaveLength(12)
    expect(out.ascendant).toEqual({ longitude: 15 })
    expect(out.mc).toEqual({ longitude: 285 })
  })

  it('planets/houses 가 배열이 아니면 원본을 그대로 통과시킨다(엔진이 null 처리)', () => {
    const notChart = { planets: 'nope', foo: 1 }
    expect(sanitizeAstro(notChart)).toBe(notChart)
  })

  it('null/비객체 입력은 안전하게 null 로 정규화한다', () => {
    expect(sanitizeAstro(null)).toBeNull()
    expect(sanitizeAstro(undefined)).toBeNull()
    expect(sanitizeAstro('string')).toBe('string')
  })
})
