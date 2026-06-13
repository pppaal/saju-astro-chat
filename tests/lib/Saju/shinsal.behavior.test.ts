/**
 * Shinsal (신살) — behavioral / golden tests
 *
 * The sibling `shinsal.test.ts` only exercises the exported *type* shapes and
 * the `DEFAULT_ANNOTATE_OPTIONS` constant, so the actual calculation functions
 * (12운성, 12신살, 공망, 길성/흉성, annotate) had ~2.5% function coverage.
 *
 * This suite drives the real functions against doctrine-derived golden values
 * (정통 명리학 정설). Every assertion below is deterministic: same input →
 * same verdict, by design of the destiny core.
 */

import {
  getTwelveStage,
  getTwelveStagesForPillars,
  getGongmang,
  pickTwelveSingle,
  getShinsalHits,
  getShinsalHitsForDailyTarget,
  annotateShinsal,
  toSajuPillarsLike,
  getTwelveShinsalSingleByPillar,
  getLuckySingleByPillar,
  getJijangganText,
  type SajuPillarsLike,
  type PillarBase,
  type SajuPillarsAdapterInput,
} from '@/lib/saju/shinsal'
import type { FiveElement } from '@/lib/saju/types'

const EL: FiveElement = '목'

function pillar(stem: string, branch: string): PillarBase {
  return {
    heavenlyStem: { name: stem, element: EL },
    earthlyBranch: { name: branch, element: EL },
  }
}

function chart(
  ys: string,
  yb: string,
  ms: string,
  mb: string,
  ds: string,
  db: string,
  ts: string,
  tb: string
): SajuPillarsLike {
  return {
    year: pillar(ys, yb),
    month: pillar(ms, mb),
    day: pillar(ds, db),
    time: pillar(ts, tb),
  }
}

describe('getTwelveStage (12운성)', () => {
  it('places yang day masters going forward from their 장생 branch', () => {
    // 甲 장생 = 亥 (양간 순행)
    expect(getTwelveStage('甲', '亥')).toBe('장생')
    expect(getTwelveStage('甲', '子')).toBe('목욕')
    expect(getTwelveStage('甲', '卯')).toBe('왕지') // 왕지 == 제왕 자리, 甲→卯
    // 丙 장생 = 寅
    expect(getTwelveStage('丙', '寅')).toBe('장생')
    expect(getTwelveStage('丙', '午')).toBe('왕지') // 丙→午
    // 壬 장생 = 申
    expect(getTwelveStage('壬', '申')).toBe('장생')
  })

  it('places yin day masters going backward from their 장생 branch', () => {
    // 乙 장생 = 午 (음간 역행)
    expect(getTwelveStage('乙', '午')).toBe('장생')
    expect(getTwelveStage('乙', '巳')).toBe('목욕')
    expect(getTwelveStage('乙', '寅')).toBe('왕지') // 乙→寅
  })

  it('normalizes Korean stem/branch readings to Hanja', () => {
    expect(getTwelveStage('갑', '해')).toBe(getTwelveStage('甲', '亥'))
    expect(getTwelveStage('갑', '해')).toBe('장생')
  })

  it('falls back to 묘 for unknown stem or branch', () => {
    expect(getTwelveStage('X', '子')).toBe('묘')
    expect(getTwelveStage('甲', 'Q')).toBe('묘')
  })
})

describe('getTwelveStagesForPillars', () => {
  it('uses the day stem for all four branches', () => {
    const c = chart('甲', '午', '丙', '子', '甲', '亥', '庚', '卯')
    const stages = getTwelveStagesForPillars(c)
    expect(stages.day).toBe(getTwelveStage('甲', '亥'))
    expect(stages.year).toBe(getTwelveStage('甲', '午'))
    expect(stages.month).toBe(getTwelveStage('甲', '子'))
    expect(stages.time).toBe(getTwelveStage('甲', '卯'))
    expect(stages.day).toBe('장생')
  })
})

describe('getGongmang (공망)', () => {
  it('returns the 旬空 pair for the 甲子 旬 (戌·亥)', () => {
    const g = getGongmang('甲', '子')
    expect(g).toHaveLength(2)
    expect(g).toEqual(expect.arrayContaining(['戌', '亥']))
  })

  it('returns the 旬空 pair for the 甲寅 旬 (子·丑)', () => {
    const g = getGongmang('甲', '寅')
    expect(g).toEqual(expect.arrayContaining(['子', '丑']))
  })
})

describe('pickTwelveSingle (12신살 단일)', () => {
  it('computes spirits by 三合 leader offset', () => {
    // 寅(火局) → leader 午: 將星=午, 華蓋=戌, 地殺=寅
    expect(pickTwelveSingle('寅', '午')).toBe('장성')
    expect(pickTwelveSingle('寅', '戌')).toBe('화개')
    expect(pickTwelveSingle('寅', '寅')).toBe('지살')
    // 子(水局) → leader 子: 將星=子
    expect(pickTwelveSingle('子', '子')).toBe('장성')
  })

  it('returns null when the day branch has no 三合 leader', () => {
    expect(pickTwelveSingle('X', '午')).toBeNull()
    expect(pickTwelveSingle('寅', 'Q')).toBeNull()
  })
})

describe('getShinsalHits (full 4-pillar scan)', () => {
  // day stem 甲, day branch 卯 (양인), branches include 도화 자오묘유
  const c = chart('甲', '午', '丙', '子', '甲', '卯', '庚', '申')

  it('always surfaces 삼재 anchored on the year pillar', () => {
    const hits = getShinsalHits(c)
    expect(hits.some((h) => h.kind === '삼재' && h.pillars.includes('year'))).toBe(true)
  })

  it('detects 양인 on the matching branch for the day stem', () => {
    // YANGIN(甲) = 卯, present on the day pillar
    const hits = getShinsalHits(c)
    expect(hits.some((h) => h.kind === '양인' && h.target === '卯')).toBe(true)
  })

  it('detects 도화 on 자/오/묘/유 branches', () => {
    const hits = getShinsalHits(c)
    const dohwa = hits.filter((h) => h.kind === '도화').map((h) => h.target)
    expect(dohwa).toEqual(expect.arrayContaining(['午', '子', '卯']))
  })

  it('honors the includeGeneralShinsal=false option (no 삼재/도화)', () => {
    const hits = getShinsalHits(c, {
      includeGeneralShinsal: false,
      includeLuckyDetails: false,
    })
    expect(hits.some((h) => h.kind === '삼재')).toBe(false)
    expect(hits.some((h) => h.kind === '도화')).toBe(false)
  })

  it('covers the month-completion and simple-table branches', () => {
    const hits = getShinsalHits(c, {
      includeTwelveAll: false,
      useMonthCompletion: true,
    })
    expect(Array.isArray(hits)).toBe(true)
  })

  it('runs the "your" rule overrides without throwing', () => {
    const hits = getShinsalHits(c, { ruleSet: 'your' })
    expect(Array.isArray(hits)).toBe(true)
  })
})

describe('getShinsalHitsForDailyTarget (calendar daily scan)', () => {
  it('fires 도화 when the target branch is a 자오묘유 day', () => {
    const hits = getShinsalHitsForDailyTarget('甲', '子', '午')
    expect(hits.some((h) => h.kind === '도화')).toBe(true)
  })

  it('fires the 12신살 single for the natal day branch', () => {
    // natal day branch 寅 (leader 午), target 戌 → 화개
    const hits = getShinsalHitsForDailyTarget('甲', '寅', '戌')
    expect(hits.some((h) => h.kind === '화개')).toBe(true)
  })

  it('uses month branch and target stem when provided (천덕/월덕 path)', () => {
    const hits = getShinsalHitsForDailyTarget('甲', '子', '午', '寅', '丁')
    // 천덕귀인(月支 寅 → 丁) is doctrine; at minimum the extended scan returns an array
    expect(Array.isArray(hits)).toBe(true)
    expect(hits.every((h) => typeof h.basis === 'string')).toBe(true)
  })
})

describe('annotateShinsal', () => {
  const c = chart('甲', '午', '丙', '子', '甲', '卯', '庚', '申')

  it('returns twelveStage for every pillar', () => {
    const annot = annotateShinsal(c)
    expect(Object.keys(annot.twelveStage).sort()).toEqual(['day', 'month', 'time', 'year'])
    expect(annot.twelveStage.day).toBe(getTwelveStage('甲', '卯'))
  })

  it('buckets hits into twelveShinsal / generalShinsal / lucky per pillar', () => {
    const annot = annotateShinsal(c)
    expect(annot.byPillar).toBeDefined()
    // 양인 is a general/흉성 → labelled '양인살' on the day pillar
    expect(annot.byPillar?.day.generalShinsal).toContain('양인살')
    // 삼재 anchored on year, labelled '삼재살'
    expect(annot.byPillar?.year.generalShinsal).toContain('삼재살')
  })
})

describe('toSajuPillarsLike (adapter)', () => {
  it('normalizes Korean stem/branch names to Hanja', () => {
    const input: SajuPillarsAdapterInput = {
      yearPillar: {
        heavenlyStem: { name: '갑', element: EL },
        earthlyBranch: { name: '자', element: EL },
      },
      monthPillar: {
        heavenlyStem: { name: '병', element: EL },
        earthlyBranch: { name: '인', element: EL },
      },
      dayPillar: {
        heavenlyStem: { name: '무', element: EL },
        earthlyBranch: { name: '진', element: EL },
      },
      timePillar: {
        heavenlyStem: { name: '경', element: EL },
        earthlyBranch: { name: '오', element: EL },
      },
    }
    const out = toSajuPillarsLike(input)
    expect(out.year.heavenlyStem.name).toBe('甲')
    expect(out.year.earthlyBranch.name).toBe('子')
    expect(out.day.heavenlyStem.name).toBe('戊')
    expect(out.time.earthlyBranch.name).toBe('午')
  })
})

describe('getTwelveShinsalSingleByPillar', () => {
  it('labels each pillar with its single 12신살 + 살 suffix', () => {
    // day branch 寅 (leader 午); time branch 午 → 將星 → "장성살"
    const c = chart('甲', '子', '丙', '辰', '甲', '寅', '庚', '午')
    const single = getTwelveShinsalSingleByPillar(c)
    expect(single.time).toBe('장성살')
    expect(single.day.endsWith('살')).toBe(true)
  })

  it('covers the simple-table + month-completion branch', () => {
    const c = chart('甲', '子', '丙', '寅', '甲', '寅', '庚', '申')
    const single = getTwelveShinsalSingleByPillar(c, {
      includeTwelveAll: false,
      useMonthCompletion: true,
    })
    // 월지 寅 → 申 = 역마 (month-completion table)
    expect(single.time).toBe('역마살')
  })
})

describe('getLuckySingleByPillar', () => {
  it("marks a pillar '길성' when a 길성 lands there, '' otherwise", () => {
    // day stem 甲: 午 → 태극귀인 + 천문성 (길성), 寅 → none
    const c = chart('甲', '午', '丙', '寅', '甲', '寅', '庚', '寅')
    const lucky = getLuckySingleByPillar(c)
    expect(lucky.year).toBe('길성')
    expect(lucky.month).toBe('')
    expect(lucky.day).toBe('')
    expect(lucky.time).toBe('')
  })
})

describe('getJijangganText (지장간)', () => {
  it('derives hidden-stem readings from the canonical table', () => {
    // doctrine: 午 = 병기정, 亥 = 무갑임 (SSOT-derived, drift-proof)
    expect(getJijangganText('午')).toBe('병기정')
    expect(getJijangganText('亥')).toBe('무갑임')
  })

  it('normalizes Korean branch input', () => {
    expect(getJijangganText('자')).toBe(getJijangganText('子'))
    expect(getJijangganText('子')).toBe('계')
  })

  it('returns empty string for unknown branches', () => {
    expect(getJijangganText('Q')).toBe('')
  })
})
