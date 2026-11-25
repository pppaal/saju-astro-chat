import {
  calculateElementScores,
  calculateStrengthScore,
  calculateGeokgukScore,
  calculateYongsinFitScore,
  computeStrengthScore,
  toStrengthCoreInput,
  strengthBandOf,
  strengthClassOf,
  STRENGTH_CENTER_OFFSET,
  type ScoreItem,
  type ElementScore,
  type StrengthScore,
} from '@/lib/saju/strengthScore'
import type { SajuPillars, PillarData, SajuPillarsInput } from '@/lib/saju/types'
import { calculateSajuData } from '@/lib/saju/saju'
import { determineYongsin } from '@/lib/saju/yongsin'
import { collectSajuFacts } from '@/lib/destiny/sajuFacts'

// Helper to create mock pillar data
function createPillarData(stem: string, branch: string): PillarData {
  return {
    heavenlyStem: { name: stem },
    earthlyBranch: { name: branch },
  } as PillarData
}

// Helper to create mock pillars
function createMockPillars(
  year: [string, string],
  month: [string, string],
  day: [string, string],
  time: [string, string]
): SajuPillars {
  return {
    year: createPillarData(year[0], year[1]),
    month: createPillarData(month[0], month[1]),
    day: createPillarData(day[0], day[1]),
    time: createPillarData(time[0], time[1]),
  } as SajuPillars
}

describe('strengthScore', () => {
  describe('calculateElementScores', () => {
    it('calculates element scores for all five elements', () => {
      const pillars = createMockPillars(
        ['甲', '子'], // 갑자 (목, 수)
        ['丙', '寅'], // 병인 (화, 목)
        ['戊', '午'], // 무오 (토, 화)
        ['庚', '申'] // 경신 (금, 금)
      )

      const scores = calculateElementScores(pillars)

      expect(scores).toHaveLength(5)
      expect(scores.map((s) => s.element)).toEqual(['목', '화', '토', '금', '수'])
    })

    it('returns valid ratios that sum to approximately 1', () => {
      const pillars = createMockPillars(['甲', '寅'], ['甲', '卯'], ['甲', '寅'], ['甲', '卯'])

      const scores = calculateElementScores(pillars)
      const totalRatio = scores.reduce((sum, s) => sum + s.ratio, 0)

      expect(totalRatio).toBeCloseTo(1, 1)
    })

    it('gives higher scores to dominant elements', () => {
      // All wood (목) pillars
      const pillars = createMockPillars(
        ['甲', '寅'], // 갑인 (목, 목)
        ['乙', '卯'], // 을묘 (목, 목)
        ['甲', '寅'], // 갑인 (목, 목)
        ['乙', '卯'] // 을묘 (목, 목)
      )

      const scores = calculateElementScores(pillars)
      const woodScore = scores.find((s) => s.element === '목')

      expect(woodScore).toBeDefined()
      expect(woodScore!.ratio).toBeGreaterThan(0.5)
    })

    it('returns positive raw scores', () => {
      const pillars = createMockPillars(['甲', '子'], ['丙', '寅'], ['戊', '午'], ['庚', '申'])

      const scores = calculateElementScores(pillars)

      scores.forEach((score) => {
        expect(score.raw).toBeGreaterThanOrEqual(0)
      })
    })
  })

  describe('calculateStrengthScore', () => {
    it('returns strength score with all required properties', () => {
      const pillars = createMockPillars(['甲', '子'], ['丙', '寅'], ['戊', '午'], ['庚', '申'])

      const score = calculateStrengthScore(pillars)

      expect(score.total).toBeGreaterThanOrEqual(0)
      expect(score.total).toBeLessThanOrEqual(100)
      expect(score.level).toBeDefined()
      expect(score.supportScore).toBeGreaterThanOrEqual(0)
      expect(score.resistScore).toBeGreaterThanOrEqual(0)
      expect(score.items).toBeInstanceOf(Array)
    })

    it('assigns correct strength levels based on total score', () => {
      // Create a strong day master scenario
      const strongPillars = createMockPillars(
        ['甲', '寅'], // 목
        ['甲', '卯'], // 목 (월지 득령)
        ['甲', '寅'], // 갑목 일간
        ['甲', '卯'] // 목
      )

      const strongScore = calculateStrengthScore(strongPillars)
      expect(['극신강', '신강']).toContain(strongScore.level)
    })

    it('calculates balance as supportScore minus resistScore', () => {
      const pillars = createMockPillars(['甲', '子'], ['丙', '寅'], ['戊', '午'], ['庚', '申'])

      const score = calculateStrengthScore(pillars)

      expect(score.balance).toBe(score.supportScore - score.resistScore)
    })

    it('includes detailed score items', () => {
      const pillars = createMockPillars(['甲', '子'], ['丙', '寅'], ['戊', '午'], ['庚', '申'])

      const score = calculateStrengthScore(pillars)

      expect(score.items.length).toBeGreaterThan(0)
      score.items.forEach((item) => {
        expect(item.category).toBeDefined()
        expect(item.name).toBeDefined()
        expect(typeof item.score).toBe('number')
        expect(item.weight).toBeGreaterThanOrEqual(0)
        expect(item.weight).toBeLessThanOrEqual(1)
      })
    })

    it('uses custom month branch when provided', () => {
      const pillars = createMockPillars(
        ['甲', '子'],
        ['丙', '寅'],
        ['甲', '午'], // 갑목 일간
        ['庚', '申']
      )

      // 卯월 (목) - 득령
      const scoreWithMao = calculateStrengthScore(pillars, '卯')
      // 酉월 (금) - 실령
      const scoreWithYou = calculateStrengthScore(pillars, '酉')

      // 목 일간이 목월에서는 득령, 금월에서는 실령
      expect(scoreWithMao.supportScore).toBeGreaterThan(scoreWithYou.supportScore)
    })
  })

  describe('calculateGeokgukScore', () => {
    it('returns geokguk score with purity and stability', () => {
      const pillars = createMockPillars(['甲', '子'], ['丙', '寅'], ['戊', '午'], ['庚', '申'])

      const score = calculateGeokgukScore(pillars, '식신격')

      expect(score.type).toBe('식신격')
      expect(score.purity).toBeGreaterThanOrEqual(0)
      expect(score.purity).toBeLessThanOrEqual(100)
      expect(score.stability).toBeGreaterThanOrEqual(0)
      expect(score.stability).toBeLessThanOrEqual(100)
    })

    it('detects 충 (clash) and marks it in items', () => {
      // 子午충 포함
      const pillarsWithChung = createMockPillars(
        ['甲', '子'], // 자
        ['丙', '午'], // 오 (자오충)
        ['戊', '辰'],
        ['庚', '申']
      )

      const scoreWithChung = calculateGeokgukScore(pillarsWithChung, 'test')
      const hasChungItem = scoreWithChung.items.some((item) => item.category === '충')

      expect(hasChungItem).toBe(true)
    })

    it('detects 합 (combination) and increases stability', () => {
      // 子丑합 포함
      const pillarsWithHap = createMockPillars(
        ['甲', '子'], // 자
        ['丙', '丑'], // 축 (자축합)
        ['戊', '辰'],
        ['庚', '申']
      )

      const score = calculateGeokgukScore(pillarsWithHap, 'test')
      const hasHapItem = score.items.some((item) => item.category === '합')

      expect(hasHapItem).toBe(true)
    })

    it('includes score items explaining the calculation', () => {
      const pillars = createMockPillars(['甲', '子'], ['丙', '寅'], ['戊', '午'], ['庚', '申'])

      const score = calculateGeokgukScore(pillars, '편관격')

      expect(score.items).toBeInstanceOf(Array)
      score.items.forEach((item) => {
        expect(item.category).toBeDefined()
        expect(item.description).toBeDefined()
      })
    })
  })

  describe('calculateYongsinFitScore', () => {
    it('returns yongsin fit score with all properties', () => {
      const pillars = createMockPillars(['甲', '子'], ['丙', '寅'], ['戊', '午'], ['庚', '申'])

      const score = calculateYongsinFitScore(pillars, '수', '중강')

      expect(score.yongsin).toBe('수')
      expect(score.fitScore).toBeGreaterThanOrEqual(0)
      expect(score.fitScore).toBeLessThanOrEqual(100)
      expect(score.presenceScore).toBeGreaterThanOrEqual(0)
      expect(score.effectiveScore).toBeGreaterThanOrEqual(0)
    })

    it('gives higher presence score when yongsin element is abundant', () => {
      // 수(水) 많은 사주
      const waterPillars = createMockPillars(
        ['壬', '子'], // 임자 (수, 수)
        ['癸', '亥'], // 계해 (수, 수)
        ['壬', '子'],
        ['癸', '亥']
      )

      // 수 없는 사주
      const noWaterPillars = createMockPillars(
        ['甲', '寅'],
        ['丙', '午'],
        ['戊', '辰'],
        ['庚', '申']
      )

      const waterScore = calculateYongsinFitScore(waterPillars, '수', '중강')
      const noWaterScore = calculateYongsinFitScore(noWaterPillars, '수', '중강')

      expect(waterScore.presenceScore).toBeGreaterThan(noWaterScore.presenceScore)
    })

    it('increases effective score when yongsin is visible in stems', () => {
      // 용신(금)이 천간에 투출
      const visibleYongsin = createMockPillars(
        ['庚', '子'], // 경(금) 천간에 있음
        ['辛', '寅'], // 신(금) 천간에 있음
        ['戊', '午'],
        ['甲', '申']
      )

      // 용신(금)이 천간에 없음
      const hiddenYongsin = createMockPillars(
        ['甲', '申'], // 금은 지지에만
        ['丙', '酉'],
        ['戊', '午'],
        ['壬', '申']
      )

      const visibleScore = calculateYongsinFitScore(visibleYongsin, '금', '중강')
      const hiddenScore = calculateYongsinFitScore(hiddenYongsin, '금', '중강')

      expect(visibleScore.effectiveScore).toBeGreaterThan(hiddenScore.effectiveScore)
    })
  })
})

// ───────────────────────────────────────────────────────────────────────────
// 엔진 감사 E4 — 강약 스케일 (SD-09, SD-08, OD-7)
// ───────────────────────────────────────────────────────────────────────────

const simpleOf = (gz: string): SajuPillarsInput => {
  const p = gz.split(' ')
  return {
    year: { stem: p[0][0], branch: p[0][1] },
    month: { stem: p[1][0], branch: p[1][1] },
    day: { stem: p[2][0], branch: p[2][1] },
    time: { stem: p[3][0], branch: p[3][1] },
  }
}
const scoreOf = (gz: string) => computeStrengthScore(toStrengthCoreInput(simpleOf(gz)))

/**
 * 시드 고정 실제 생일 모집단 — 감사 스크립트(engine/vsd/r.ts)와 같은 생성기
 * (seed 12345, 1941–2048, 서울, lon 126.978). STRENGTH_CENTER_OFFSET 보정 근거.
 */
function seededBirths(n: number) {
  let seed = 12345
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    return seed / 0x7fffffff
  }
  const pad = (x: number) => String(x).padStart(2, '0')
  const out: Array<{ birthDate: string; birthTime: string; gender: 'male' | 'female' }> = []
  for (let i = 0; i < n; i++) {
    const y = 1941 + Math.floor(rnd() * 108)
    const m = 1 + Math.floor(rnd() * 12)
    const d = 1 + Math.floor(rnd() * 28)
    const hh = Math.floor(rnd() * 24)
    const mm = Math.floor(rnd() * 60)
    const gender = rnd() < 0.5 ? 'male' : 'female'
    out.push({ birthDate: `${y}-${pad(m)}-${pad(d)}`, birthTime: `${pad(hh)}:${pad(mm)}`, gender })
  }
  return out
}
const NOW = new Date('2026-11-24T00:00:00Z')
function simpleFromBirth(b: { birthDate: string; birthTime: string; gender: 'male' | 'female' }) {
  const raw = calculateSajuData(
    b.birthDate,
    b.birthTime,
    b.gender,
    'solar',
    'Asia/Seoul',
    false,
    126.978,
    NOW
  ) as unknown as {
    pillars: Record<string, { heavenlyStem: { name: string }; earthlyBranch: { name: string } }>
  }
  const P = raw.pillars
  const pick = (k: string) => ({ stem: P[k].heavenlyStem.name, branch: P[k].earthlyBranch.name })
  return { year: pick('year'), month: pick('month'), day: pick('day'), time: pick('time') }
}

describe('E4 강약 스케일 — 일간 자기 비겁 제외 + 중심 보정 (SD-09, OD-7)', () => {
  it('일간 천간 자신은 비겁으로 세지 않는다 — 다른 목이 하나도 없으면 비겁 0', () => {
    const s = scoreOf('庚申 庚申 甲申 庚申')
    expect(s.items.find((i) => i.category === '비겁')!.score).toBe(0)
  })

  it('庚申 庚申 甲申 庚申 (목 없는 甲) → 극신약 (≤ 20)', () => {
    const s = scoreOf('庚申 庚申 甲申 庚申')
    expect(s.total).toBeLessThanOrEqual(20)
    expect(s.level).toBe('극신약')
  })

  it('total = 50 + STRENGTH_CENTER_OFFSET + balance (clamp 전)', () => {
    const s = scoreOf('丁丑 癸卯 壬戌 丁未')
    expect(s.total).toBe(Math.max(0, Math.min(100, 50 + STRENGTH_CENTER_OFFSET + s.balance)))
  })

  it('시드 4000 실제 생일 모집단의 중앙값이 50±2, 강·약 꼬리가 둘 다 존재', () => {
    const totals = seededBirths(4000).map(
      (b) => computeStrengthScore(toStrengthCoreInput(simpleFromBirth(b))).total
    )
    const sorted = [...totals].sort((a, b) => a - b)
    const median = (sorted[1999] + sorted[2000]) / 2
    expect(Math.abs(median - 50)).toBeLessThanOrEqual(2)
    const cls = totals.map((t) => strengthClassOf(strengthBandOf(t)))
    const share = (c: string) => cls.filter((x) => x === c).length / totals.length
    // 예전(중앙값 62.5): strong 54% / weak 13%. 보정 후 두 꼬리가 대칭에 가깝다.
    expect(share('strong')).toBeLessThan(0.45)
    expect(share('weak')).toBeGreaterThan(0.25)
    expect(totals.filter((t) => t <= 20).length).toBeGreaterThan(0) // 극신약 도달 가능
  }, 60_000)
})

describe('E4 5단계 단일 매핑 — strengthBandOf / strengthClassOf (SD-08)', () => {
  it.each([
    [100, '극신강'],
    [80, '극신강'],
    [79.5, '신강'],
    [60, '신강'],
    [59.5, '중화'],
    [40, '중화'],
    [39.5, '신약'],
    [20.5, '신약'],
    [20, '극신약'],
    [0, '극신약'],
  ])('%s → %s (CONVENTIONS §10 표)', (total, band) => {
    expect(strengthBandOf(total)).toBe(band)
  })

  it('3분류: {극신강,신강}→strong · 중화→medium · {신약,극신약}→weak', () => {
    expect(strengthClassOf('극신강')).toBe('strong')
    expect(strengthClassOf('신강')).toBe('strong')
    expect(strengthClassOf('중화')).toBe('medium')
    expect(strengthClassOf('신약')).toBe('weak')
    expect(strengthClassOf('극신약')).toBe('weak')
    expect(strengthClassOf('')).toBe('medium')
  })

  it('StrengthScore.level 은 strengthBandOf(total) 와 같다', () => {
    for (const gz of ['丁丑 癸卯 壬戌 丁未', '甲寅 甲卯 甲寅 甲卯', '庚申 庚申 甲申 庚申']) {
      const s = scoreOf(gz)
      expect(s.level).toBe(strengthBandOf(s.total))
    }
  })

  it('시드 400 차트: sajuFacts.strength · yongsin.daymasterStrength · 캘린더(strengthClassOf) 3분류 일치', () => {
    const KO = { strong: '신강', medium: '중화', weak: '신약' } as const
    const bad: string[] = []
    for (const b of seededBirths(400)) {
      const facts = collectSajuFacts({ ...b, timezone: 'Asia/Seoul', longitude: 126.978, now: NOW })
      const yong = determineYongsin(simpleFromBirth(b)).daymasterStrength
      // 캘린더 build.ts 는 strengthClassOf(yongsin.daymasterStrength) 를 쓴다
      const calendar = strengthClassOf(yong)
      if (facts.strength !== KO[calendar])
        bad.push(`${b.birthDate} ${b.birthTime}: facts ${facts.strength} vs ${yong}`)
    }
    expect(bad).toEqual([])
  }, 60_000)
})
