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
  // day stem 甲, day branch 卯 (양인; 亥卯未 → 도화 = 子), branches include 午·子·卯
  const c = chart('甲', '午', '丙', '子', '甲', '卯', '庚', '申')

  it('never surfaces a natal 삼재 (삼재 is a period shinsal — SD-17)', () => {
    const hits = getShinsalHits(c)
    expect(hits.some((h) => h.kind === '삼재')).toBe(false)
  })

  it('detects 양인 on the matching branch for the day stem', () => {
    // YANGIN(甲) = 卯, present on the day pillar
    const hits = getShinsalHits(c)
    expect(hits.some((h) => h.kind === '양인' && h.target === '卯')).toBe(true)
  })

  it('detects 도화 only at the 日支 三合 年殺 position (卯 → 子), not on every 자오묘유', () => {
    const hits = getShinsalHits(c)
    const dohwa = hits.filter((h) => h.kind === '도화').map((h) => h.target)
    expect(dohwa).toEqual(['子'])
  })

  it('honors the includeGeneralShinsal=false option (no 삼재/도화)', () => {
    const hits = getShinsalHits(c, {
      includeGeneralShinsal: false,
      includeLuckyDetails: false,
    })
    expect(hits.some((h) => h.kind === '삼재')).toBe(false)
    expect(hits.some((h) => h.kind === '도화')).toBe(false)
  })

  it('covers the simple-table branch (same 12신살 verdicts as includeTwelveAll)', () => {
    const twelveKinds = new Set(['겁살', '재살', '천살', '지살', '년살', '월살'])
    const pick = (hits: ReturnType<typeof getShinsalHits>) =>
      hits
        .filter((h) => twelveKinds.has(h.kind) || /^(장성|반안|역마|육해|화개|망신)$/.test(h.kind))
        .map((h) => `${h.pillars.join('+')}:${h.kind}`)
        .sort()
    expect(pick(getShinsalHits(c, { includeTwelveAll: false }))).toEqual(pick(getShinsalHits(c)))
  })

  it('현침 is deterministic across repeated calls (no module-global override state)', () => {
    // 예전엔 'your' 룰셋 오버라이드가 모듈 전역 현침 표를 복원 없이 변이시켜 이후 호출까지
    // 未 로 오염됐다(요청 순서 의존 = 결정론 위반). 룰셋 옵션은 G13 에서 지웠고 현침은 한 규칙
    // (결정 18). 辛 일간 + 午 시지 차트: 현침이 午 에서 발동, 몇 번을 불러도 같다.
    const hyeonStd = chart('甲', '子', '甲', '子', '辛', '巳', '甲', '午')
    const hyeonAt = (hits: ReturnType<typeof getShinsalHits>) =>
      hits
        .filter((h) => h.kind === '현침')
        .flatMap((h) => h.target ?? [])
        .sort()
    const before = getShinsalHits(hyeonStd)
    getShinsalHits(hyeonStd, { includeTwelveAll: false })
    const after = getShinsalHits(hyeonStd)
    expect(hyeonAt(after)).toEqual(hyeonAt(before))
    expect(hyeonAt(before)).toContain('午')
    expect(hyeonAt(before)).not.toContain('未')
  })

  it('辛 + 未 has no 현침 on 未 (owner decision 18, no 未 school)', () => {
    const c2 = chart('甲', '子', '甲', '子', '辛', '巳', '甲', '未')
    const hyeon = getShinsalHits(c2)
      .filter((h) => h.kind === '현침')
      .flatMap((h) => h.target ?? [])
    expect(hyeon).not.toContain('未')
  })
})

describe('getShinsalHitsForDailyTarget (calendar daily scan)', () => {
  it("fires 도화 only on the natal day branch's 年殺 day (子 → 酉), not on every 자오묘유", () => {
    expect(getShinsalHitsForDailyTarget('甲', '子', '酉').some((h) => h.kind === '도화')).toBe(true)
    expect(getShinsalHitsForDailyTarget('甲', '子', '午').some((h) => h.kind === '도화')).toBe(
      false
    )
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
    // 12신살: 일지 卯(장성 卯) — 년지 午 = 육해 → '육해살', 월지 子 = 년살 → '년살'(이중 '살' 없음)
    expect(annot.byPillar?.year.twelveShinsal).toEqual(['육해살'])
    expect(annot.byPillar?.month.twelveShinsal).toEqual(['년살'])
    // 삼재는 본명에 붙지 않는다
    expect(annot.byPillar?.year.generalShinsal).not.toContain('삼재살')
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

  it('covers the simple-table branch', () => {
    const c = chart('甲', '子', '丙', '寅', '甲', '寅', '庚', '申')
    const single = getTwelveShinsalSingleByPillar(c, { includeTwelveAll: false })
    // 일지 寅(寅午戌, 장성 午) → 申 = 역마; 子 = 재살(이미 '살' 로 끝나 그대로)
    expect(single.time).toBe('역마살')
    expect(single.year).toBe('재살')
  })
})

describe('getLuckySingleByPillar', () => {
  it("marks a pillar '길성' when a 길성 lands there, '' otherwise", () => {
    // day stem 甲: 午 → 태극귀인 (길성, 甲乙 태극귀인=子午), 寅 → none.
    // (천문성은 戌亥 라 이 차트엔 안 뜸 — 길성 판정은 태극귀인이 단독으로.)
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
