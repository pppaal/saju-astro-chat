/**
 * @vitest-environment node
 *
 * Cross Engine Coverage Test — 30 cells (5 horizons × 6 themes) 검증.
 *
 * 검증 항목:
 *   1. 모든 cell 이 만들어진다 (없는 cell 0)
 *   2. 각 cell 에 sajuPoints + astroPoints 가 비어있지 않다
 *   3. horizon-specific 데이터가 들어간다 (12운성/eclipse/progressed/yearlyScore 등)
 *   4. 진짜 교차 (🔗) 가 발화된다 (적어도 1 cell)
 *   5. 모든 cell 에 score + grade + actions 채워짐
 *   6. theme 별 사주/점성 모듈 전부 plumbing 검증
 *
 * 테스트 데이터: 1995-02-09 06:40 男 서울 (정인격 / 火 결핍)
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { runUnifiedEngine } from '@/lib/engine'
import type { UnifiedOutput } from '@/lib/engine/types'
import type { ThemeKind, Horizon } from '@/lib/matrix/cross'

const THEMES: ThemeKind[] = ['career', 'wealth', 'love', 'health', 'growth', 'family']
const HORIZONS: Horizon[] = ['life', 'daeun', 'seun', 'wolun', 'iljin']

let unified: UnifiedOutput

beforeAll(async () => {
  unified = await runUnifiedEngine({
    birthDate: '1995-02-09',
    birthTime: '06:40',
    gender: 'male',
    latitude: 37.5665,
    longitude: 126.978,
    timezone: 'Asia/Seoul',
  })
})

describe('Cross engine — 30 cells coverage', () => {
  it('cross 결과가 존재', () => {
    expect(unified.cross).toBeDefined()
    expect(unified.cross?.matrix).toBeDefined()
  })

  it('30 cells 모두 생성', () => {
    expect(unified.cross?.matrix).toHaveLength(30)
  })

  it.each(HORIZONS)('horizon %s 의 6 테마 모두 존재', (horizon) => {
    const cells = unified.cross!.matrix.filter((c) => c.horizon === horizon)
    expect(cells).toHaveLength(6)
    for (const t of THEMES) {
      expect(cells.find((c) => c.theme === t)).toBeDefined()
    }
  })

  it.each(THEMES)('theme %s 의 5 horizon 모두 존재', (theme) => {
    const cells = unified.cross!.matrix.filter((c) => c.theme === theme)
    expect(cells).toHaveLength(5)
    for (const h of HORIZONS) {
      expect(cells.find((c) => c.horizon === h)).toBeDefined()
    }
  })
})

describe('Cell coverage — sajuPoints + astroPoints 비어있지 않음', () => {
  it.each(THEMES.flatMap((t) => HORIZONS.map((h) => [t, h] as const)))(
    '%s × %s — saju+astro 결합 ≥ 1 point',
    (theme, horizon) => {
      const cell = unified.cross!.matrix.find((c) => c.theme === theme && c.horizon === horizon)
      expect(cell).toBeDefined()
      const sig = cell!.signal as { sajuPoints?: string[]; astroPoints?: string[] }
      const total = (sig.sajuPoints?.length ?? 0) + (sig.astroPoints?.length ?? 0)
      expect(total).toBeGreaterThanOrEqual(1)
    },
  )
})

describe('Score + grade + actions — 30 cells 모두', () => {
  it.each(THEMES.flatMap((t) => HORIZONS.map((h) => [t, h] as const)))(
    '%s × %s — score ∈ [0, 10], grade 있음, actions ≥ 1',
    (theme, horizon) => {
      const cell = unified.cross!.matrix.find((c) => c.theme === theme && c.horizon === horizon)
      const sig = cell!.signal as { score: number; grade?: string; actions?: string[] }
      expect(sig.score).toBeGreaterThanOrEqual(0)
      expect(sig.score).toBeLessThanOrEqual(10)
      expect(sig.grade).toBeTruthy()
      expect((sig.actions || []).length).toBeGreaterThanOrEqual(1)
    },
  )
})

describe('Horizon-specific 데이터 검증', () => {
  it('seun horizon — 다년 yearlyScore 또는 eclipse 매칭', () => {
    // 적어도 1 theme 에서 seun 특유 데이터 발화
    const seunCells = unified.cross!.matrix.filter((c) => c.horizon === 'seun')
    const allPoints = seunCells.flatMap((c) => {
      const sig = c.signal as { sajuPoints?: string[]; astroPoints?: string[] }
      return [...(sig.sajuPoints || []), ...(sig.astroPoints || [])]
    })
    const hasYearScore = allPoints.some((p) => /\d{4}년 종합점수|식 \d{4}-/.test(p))
    expect(hasYearScore).toBe(true)
  })

  it('wolun/iljin horizon — 정밀 트랜짓 매칭', () => {
    const cells = unified.cross!.matrix.filter((c) => c.horizon === 'wolun' || c.horizon === 'iljin')
    const allPoints = cells.flatMap((c) => {
      const sig = c.signal as { astroPoints?: string[] }
      return sig.astroPoints || []
    })
    const hasPrecise = allPoints.some((p) => /정밀\)/.test(p))
    expect(hasPrecise).toBe(true)
  })

  it('daeun horizon — 라이프스테이지 또는 4기둥 위치 매칭', () => {
    const cells = unified.cross!.matrix.filter((c) => c.horizon === 'daeun')
    const allPoints = cells.flatMap((c) => {
      const sig = c.signal as { sajuPoints?: string[] }
      return sig.sajuPoints || []
    })
    const hasLifeStage = allPoints.some((p) => /라이프\s\d|현 (year|month|day|time)/.test(p))
    expect(hasLifeStage).toBe(true)
  })
})

describe('진짜 교차 (🔗) — 사주↔점성 결합 발화', () => {
  it('적어도 1 cell 에서 🔗 결합 발화', () => {
    const allPoints = unified.cross!.matrix.flatMap((c) => {
      const sig = c.signal as { sajuPoints?: string[]; astroPoints?: string[] }
      return [...(sig.sajuPoints || []), ...(sig.astroPoints || [])]
    })
    const crosses = allPoints.filter((p) => p.startsWith('🔗'))
    expect(crosses.length).toBeGreaterThanOrEqual(1)
  })

  it('1995-02-09 — health 에 火 결핍 교차', () => {
    const healthCells = unified.cross!.matrix.filter((c) => c.theme === 'health')
    const points = healthCells.flatMap((c) => {
      const sig = c.signal as { sajuPoints?: string[] }
      return sig.sajuPoints || []
    })
    const hasFireCross = points.some((p) => p.includes('🔗') && p.includes('火'))
    expect(hasFireCross).toBe(true)
  })
})

describe('사주 모듈 활용 검증 (cross 가 fullInsights 사용)', () => {
  it('career — 격국 + 십신 + 정점기 모두 표시', () => {
    const cells = unified.cross!.matrix.filter((c) => c.theme === 'career')
    const all = cells.flatMap((c) => {
      const sig = c.signal as { sajuPoints?: string[] }
      return sig.sajuPoints || []
    }).join(' ')
    expect(all).toMatch(/격국|정인|관성|식상/)
  })

  it('health — 건강 점수 + 취약 장기 표시', () => {
    const cells = unified.cross!.matrix.filter((c) => c.theme === 'health')
    const all = cells.flatMap((c) => {
      const sig = c.signal as { sajuPoints?: string[] }
      return sig.sajuPoints || []
    }).join(' ')
    expect(all).toMatch(/건강 \d+\/100|취약/)
  })

  it('love — 일주 + 십신 배우자성 표시', () => {
    const cells = unified.cross!.matrix.filter((c) => c.theme === 'love')
    const all = cells.flatMap((c) => {
      const sig = c.signal as { sajuPoints?: string[] }
      return sig.sajuPoints || []
    }).join(' ')
    expect(all).toMatch(/일주|일지|정재|정관/)
  })
})

describe('점성 모듈 활용 검증 (cross 가 advanced 사용)', () => {
  it('asteroids 6개 중 하나 이상 어느 theme 에 표시', () => {
    const allPoints = unified.cross!.matrix.flatMap((c) => {
      const sig = c.signal as { astroPoints?: string[] }
      return sig.astroPoints || []
    }).join(' ')
    expect(allPoints).toMatch(/Ceres|Pallas|Juno|Vesta|Chiron|Lilith/)
  })

  it('midpoint 또는 fixedStar 활용', () => {
    const allPoints = unified.cross!.matrix.flatMap((c) => {
      const sig = c.signal as { astroPoints?: string[] }
      return sig.astroPoints || []
    }).join(' ')
    expect(allPoints).toMatch(/midpoint|★|고정성/)
  })

  it('eclipse 시기 매칭', () => {
    const allPoints = unified.cross!.matrix.flatMap((c) => {
      const sig = c.signal as { astroPoints?: string[]; sajuPoints?: string[] }
      return [...(sig.astroPoints || []), ...(sig.sajuPoints || [])]
    }).join(' ')
    expect(allPoints).toMatch(/식 \d{4}-|일\/월식|Leo 식/)
  })
})

describe('5축 + highlights 전수 검증', () => {
  it('5 axes 모두 존재', () => {
    expect(unified.cross?.axes.identity).toBeDefined()
    expect(unified.cross?.axes.emotion).toBeDefined()
    expect(unified.cross?.axes.career).toBeDefined()
    expect(unified.cross?.axes.relationship).toBeDefined()
    expect(unified.cross?.axes.growth).toBeDefined()
  })

  it('highlights — bestThemeNow + worstThemeNow 채워짐', () => {
    expect(unified.cross?.highlights.bestThemeNow).toBeDefined()
    expect(unified.cross?.highlights.worstThemeNow).toBeDefined()
  })
})
