// Saju + Astrology doctrine 정확성 회귀 테스트.
//
// 2026-05 audit (PR #813 / #816 / #821 / #823) 에서 발견된 회귀들이 다시
// 들어오지 않게 doctrinal 값 hardcode 로 hook 한다. 기존 테스트들이
// "valid stage 중 하나면 OK" 식의 얕은 assertion 이라 잘못된 계산이
// 통과하던 문제 보강.

import { describe, it, expect } from 'vitest'
import { getTwelveStage } from '@/lib/saju/shinsal'
import { getShinsalHits, getShinsalHitsForDailyTarget, toSajuPillarsLike } from '@/lib/saju/shinsal'
import { calculateSajuData } from '@/lib/saju/saju'
import { analyzeRelations } from '@/lib/saju/relations'
import { calculateZodiacalReleasing } from '@/lib/astrology/foundation/zodiacalReleasing'
import { angleDiff } from '@/lib/astrology/foundation/utils'
import { normalizeGender } from '@/lib/utils/gender'

describe('saju 12운성 — 정통 doctrine (음간 역행 포함)', () => {
  // 정통 명리학 일간별 長生 출발지:
  //  양간(甲丙戊庚壬) 순행 / 음간(乙丁己辛癸) 역행.
  //  甲 亥 / 乙 午 / 丙 寅 / 丁 酉 / 戊 寅 / 己 酉 / 庚 巳 / 辛 子 / 壬 申 / 癸 卯
  const longSheng: Array<[string, string]> = [
    ['甲', '亥'],
    ['乙', '午'],
    ['丙', '寅'],
    ['丁', '酉'],
    ['戊', '寅'],
    ['己', '酉'],
    ['庚', '巳'],
    ['辛', '子'],
    ['壬', '申'],
    ['癸', '卯'],
  ]
  for (const [stem, branch] of longSheng) {
    it(`일간 ${stem} 의 ${branch} 지지 = 장생`, () => {
      expect(getTwelveStage(stem, branch)).toBe('장생')
    })
  }

  it('음간 辛 의 12운성은 역행 — 辛 + 戌 = 衰 (子→亥→戌 = 3번째 = 관대? 음간 역행 검증)', () => {
    // 辛 장생 = 子. 음간 역행이므로 子→亥(목욕)→戌(관대)
    expect(getTwelveStage('辛', '戌')).toBe('관대')
  })

  it('음간 乙 의 帝旺 — 乙 장생 = 午, 역행 4번째 = 寅 (帝旺)', () => {
    // 乙 장생 = 午. 역행 4번째: 午(0=장생)→巳(1=목욕)→辰(2=관대)→卯(3=임관)→寅(4=왕지)
    expect(getTwelveStage('乙', '寅')).toBe('왕지')
  })

  it('양간 甲 의 帝旺 — 甲 장생 = 亥, 순행 4번째 = 卯 (帝旺)', () => {
    // 甲 장생 = 亥. 순행: 亥(0)→子(1)→丑(2)→寅(3)→卯(4=왕지)
    expect(getTwelveStage('甲', '卯')).toBe('왕지')
  })
})

describe('saju 12신살 — 三合국 anchor doctrine', () => {
  // 寅午戌 group (일지 寅/午/戌): 劫殺=亥, 將星=午, 驛馬=申, 華蓋=戌.
  // 申子辰 group: 劫殺=巳, 將星=子, 驛馬=寅, 華蓋=辰.
  // 巳酉丑 group: 劫殺=寅, 將星=酉, 驛馬=亥, 華蓋=丑.
  // 亥卯未 group: 劫殺=申, 將星=卯, 驛馬=巳, 華蓋=未.
  type PillarsLike = Parameters<typeof getShinsalHits>[0]
  function pillars(dayBranch: string): PillarsLike {
    // 일지만 의미 있으면 충분 — 12신살은 일지 anchor.
    const stem = { name: '甲', element: '木', yin_yang: '양' as const, koreanName: '갑', polarity: '+' as const }
    const branch = (b: string) => ({
      name: b,
      element: '土',
      yin_yang: '양' as const,
      koreanName: b,
      animal: '',
      season: '',
    })
    return {
      year: { heavenlyStem: stem, earthlyBranch: branch('子') },
      month: { heavenlyStem: stem, earthlyBranch: branch('子') },
      day: { heavenlyStem: stem, earthlyBranch: branch(dayBranch) },
      time: { heavenlyStem: stem, earthlyBranch: branch('子') },
    } as PillarsLike
  }

  function checkSpiritAtBranch(
    dayBranch: string,
    targetBranch: string,
    expectedKind: string
  ) {
    // 일지 dayBranch 의 사주에 targetBranch 지지를 두면 expectedKind 가 hit 에 포함돼야.
    // 위 pillars() 가 year/month/time 을 子 로 채우므로 子 가 expectedKind 와 다른
    // 신살로 잡힐 수 있음. 일지 외 지지가 target 인 fixture 가 깔끔.
    type Branch = ReturnType<typeof Object>
    const stem = { name: '甲', element: '木', yin_yang: '양' as const, koreanName: '갑', polarity: '+' as const }
    const branch = (b: string): Branch => ({
      name: b,
      element: '土',
      yin_yang: '양' as const,
      koreanName: b,
      animal: '',
      season: '',
    })
    const p = {
      year: { heavenlyStem: stem, earthlyBranch: branch(targetBranch) },
      month: { heavenlyStem: stem, earthlyBranch: branch(targetBranch) },
      day: { heavenlyStem: stem, earthlyBranch: branch(dayBranch) },
      time: { heavenlyStem: stem, earthlyBranch: branch(targetBranch) },
    } as PillarsLike
    const hits = getShinsalHits(p)
    const kinds = hits.map((h) => h.kind as string)
    expect(kinds).toContain(expectedKind)
  }

  // 寅午戌 group: 일지 子 (申子辰 group) 와 비교 위해 일지를 각 group 대표로.
  it('일지 寅 (寅午戌 group) — 申 지지 = 驛馬', () => {
    checkSpiritAtBranch('寅', '申', '역마')
  })
  it('일지 子 (申子辰 group) — 寅 지지 = 驛馬', () => {
    checkSpiritAtBranch('子', '寅', '역마')
  })
  it('일지 酉 (巳酉丑 group) — 亥 지지 = 驛馬', () => {
    checkSpiritAtBranch('酉', '亥', '역마')
  })
  it('일지 卯 (亥卯未 group) — 巳 지지 = 驛馬', () => {
    checkSpiritAtBranch('卯', '巳', '역마')
  })

  it('일지 午 (寅午戌 group) — 戌 지지 = 華蓋', () => {
    checkSpiritAtBranch('午', '戌', '화개')
  })
  it('일지 辰 (申子辰 group) — 辰 지지 = 華蓋 (자기 자리)', () => {
    checkSpiritAtBranch('辰', '辰', '화개')
  })
})

describe('saju 대운 방향 — 음양남녀 doctrine', () => {
  // 양년 + 남자 = 순행 / 음년 + 여자 = 순행
  // 양년 + 여자 = 역행 / 음년 + 남자 = 역행
  // 1995-02-09 출생 = 乙亥년 (음년).
  //   남자 → 역행
  //   여자 → 순행
  it('1995 음년 출생 남자 → 대운 역행 (첫 대운 = 월주 직전)', () => {
    const r = calculateSajuData('1995-02-09', '06:40', 'male', 'solar', 'Asia/Seoul')
    // 1995 = 乙(陰)亥년 + 남자 = 역행. 월주 戊寅 직전인 丁丑부터.
    expect(r.unse.daeun[0]?.ganji).toBe('丁丑')
  })

  it('1995 음년 출생 여자 → 대운 순행 (첫 대운 = 월주 다음)', () => {
    const r = calculateSajuData('1995-02-09', '06:40', 'female', 'solar', 'Asia/Seoul')
    // 1995 = 乙(陰)亥년 + 여자 = 순행. 월주 戊寅 다음인 己卯부터.
    expect(r.unse.daeun[0]?.ganji).toBe('己卯')
  })

  it('남자 vs 여자 첫 대운 ganji 가 달라야 — 회귀 hook', () => {
    const m = calculateSajuData('1995-02-09', '06:40', 'male', 'solar', 'Asia/Seoul')
    const f = calculateSajuData('1995-02-09', '06:40', 'female', 'solar', 'Asia/Seoul')
    expect(m.unse.daeun[0]?.ganji).not.toBe(f.unse.daeun[0]?.ganji)
  })

  it('"F" 단축 입력이 "female" 로 정규화 (PR #813)', () => {
    // 7개 API 엔드포인트가 이 normalizer 통과 후 calculateSajuData 에
    // 전달한다. 이전엔 lowercase==='female' 매칭만 해서 'F' / 'f' 가 'male'
    // 로 분류되던 회귀.
    expect(normalizeGender('F')).toBe('female')
    expect(normalizeGender('Female')).toBe('female')
    expect(normalizeGender('female')).toBe('female')
    expect(normalizeGender('f')).toBe('female')
    expect(normalizeGender('M')).toBe('male')
    expect(normalizeGender('Male')).toBe('male')
    expect(normalizeGender('male')).toBe('male')
  })
})

describe('saju 신살 글자표 — audit 2026-06 교정 회귀', () => {
  // getShinsalHitsForDailyTarget(natalDayStem, natalDayBranch, targetBranch, ...)
  const kinds = (stem: string, dayBranch: string, target: string) =>
    getShinsalHitsForDailyTarget(stem, dayBranch, target).map((h) => h.kind as string)

  describe('금여성(金輿) — 일간별 (이전 辰·酉 고정 버그)', () => {
    // 정설: 甲辰 乙巳 丙未 丁申 戊未 己申 庚戌 辛亥 壬丑 癸寅
    const table: Array<[string, string]> = [
      ['甲', '辰'], ['乙', '巳'], ['丙', '未'], ['丁', '申'], ['戊', '未'],
      ['己', '申'], ['庚', '戌'], ['辛', '亥'], ['壬', '丑'], ['癸', '寅'],
    ]
    for (const [stem, br] of table) {
      it(`일간 ${stem} → ${br} = 금여성`, () => {
        expect(kinds(stem, '子', br)).toContain('금여성')
      })
    }
    it('일간 甲 → 酉 는 금여성 아님 (이전 버그)', () => {
      expect(kinds('甲', '子', '酉')).not.toContain('금여성')
    })
  })

  describe('천주귀인(天廚) — 식신 건록 (戊己壬癸 교정)', () => {
    // 정설: 甲巳 乙午 丙巳 丁午 戊申 己酉 庚亥 辛子 壬寅 癸卯
    const table: Array<[string, string]> = [
      ['戊', '申'], ['己', '酉'], ['壬', '寅'], ['癸', '卯'],
    ]
    for (const [stem, br] of table) {
      it(`일간 ${stem} → ${br} = 천주귀인`, () => {
        expect(kinds(stem, '子', br)).toContain('천주귀인')
      })
    }
    it('일간 戊 → 巳 는 천주귀인 아님 (이전 버그)', () => {
      expect(kinds('戊', '子', '巳')).not.toContain('천주귀인')
    })
  })

  describe('암록(暗祿) — 건록의 六合 (전면 교정)', () => {
    // 정설: 甲亥 乙戌 丙申 丁未 戊申 己未 庚巳 辛辰 壬寅 癸丑
    const table: Array<[string, string]> = [
      ['甲', '亥'], ['乙', '戌'], ['丙', '申'], ['丁', '未'], ['戊', '申'],
      ['己', '未'], ['庚', '巳'], ['辛', '辰'], ['壬', '寅'], ['癸', '丑'],
    ]
    for (const [stem, br] of table) {
      it(`일간 ${stem} → ${br} = 암록`, () => {
        expect(kinds(stem, '子', br)).toContain('암록')
      })
    }
    it('일간 甲 → 酉 는 암록 아님 (이전 버그)', () => {
      expect(kinds('甲', '子', '酉')).not.toContain('암록')
    })
  })

  describe('양인(羊刃) — 양간 전용 (음간 가짜 양인 제거)', () => {
    it('양간 甲 → 卯 = 양인', () => {
      expect(kinds('甲', '子', '卯')).toContain('양인')
    })
    it('음간 辛 → 酉 는 양인 아님 (이전 버그: 앞 양간값 복사)', () => {
      expect(kinds('辛', '丑', '酉')).not.toContain('양인')
    })
    it('음간 乙 → 卯 는 양인 아님', () => {
      expect(kinds('乙', '子', '卯')).not.toContain('양인')
    })
  })

  describe('원진(怨嗔) — 子未 丑午 寅酉 卯申 辰亥 巳戌', () => {
    it('일지 寅 → 酉 = 원진', () => {
      expect(kinds('甲', '寅', '酉')).toContain('원진')
    })
    it('일지 寅 → 巳 는 원진 아님 (이전 해(害) 복붙 버그)', () => {
      expect(kinds('甲', '寅', '巳')).not.toContain('원진')
    })
    it('일지 辰 → 亥 = 원진', () => {
      expect(kinds('甲', '辰', '亥')).toContain('원진')
    })
  })
})

describe('saju 삼재(三災) — 띠별 3년 (3개 그룹 밀림 교정)', () => {
  // 정설: 申子辰生→寅卯辰, 巳酉丑生→亥子丑, 寅午戌生→申酉戌, 亥卯未生→巳午未
  const stem = { name: '甲', element: '木', yin_yang: '양' as const, koreanName: '갑', polarity: '+' as const }
  const mk = (yearBranch: string) => {
    const b = (n: string) => ({ name: n, element: '土', yin_yang: '양' as const, koreanName: n, animal: '', season: '' })
    return {
      year: { heavenlyStem: stem, earthlyBranch: b(yearBranch) },
      month: { heavenlyStem: stem, earthlyBranch: b('寅') },
      day: { heavenlyStem: stem, earthlyBranch: b('寅') },
      time: { heavenlyStem: stem, earthlyBranch: b('寅') },
    } as Parameters<typeof getShinsalHits>[0]
  }
  const samjaeTarget = (yearBranch: string) => {
    const hit = getShinsalHits(mk(yearBranch)).find((h) => h.kind === '삼재')
    return hit?.target ?? ''
  }
  it('申(申子辰)생 → 삼재 寅卯辰', () => {
    expect(samjaeTarget('申')).toBe('寅,卯,辰')
  })
  it('酉(巳酉丑)생 → 삼재 亥子丑', () => {
    expect(samjaeTarget('酉')).toBe('亥,子,丑')
  })
  it('午(寅午戌)생 → 삼재 申酉戌', () => {
    expect(samjaeTarget('午')).toBe('申,酉,戌')
  })
  it('亥(亥卯未)생 → 삼재 巳午未 (이전 亥子丑 버그)', () => {
    expect(samjaeTarget('亥')).toBe('巳,午,未')
  })
})

describe('saju relations — audit 2026-06 교정 회귀', () => {
  const mk = (
    year: [string, string], month: [string, string], day: [string, string], time: [string, string]
  ) => ({
    pillars: {
      year: { heavenlyStem: year[0], earthlyBranch: year[1] },
      month: { heavenlyStem: month[0], earthlyBranch: month[1] },
      day: { heavenlyStem: day[0], earthlyBranch: day[1] },
      time: { heavenlyStem: time[0], earthlyBranch: time[1] },
    },
  })
  const kindsBetween = (input: ReturnType<typeof mk>) =>
    analyzeRelations(input).map((h) => h.kind as string)

  it('원진: 寅↔酉 성립', () => {
    expect(kindsBetween(mk(['甲', '寅'], ['甲', '酉'], ['甲', '子'], ['甲', '子']))).toContain('원진')
  })
  it('원진: 寅↔巳 는 원진 아님 (해 복붙 버그)', () => {
    const hits = analyzeRelations(mk(['甲', '寅'], ['甲', '巳'], ['甲', '子'], ['甲', '子']))
    expect(hits.filter((h) => h.kind === '원진' && (h.detail?.includes('寅') || h.detail?.includes('巳')))).toHaveLength(0)
  })
  it('자형: 辰辰 성립', () => {
    expect(kindsBetween(mk(['甲', '辰'], ['甲', '辰'], ['甲', '子'], ['甲', '子']))).toContain('지지형')
  })
  it('자형: 子子 는 형 아님 (자형 12종 → 4종 교정)', () => {
    // 필러는 형 관계를 안 만드는 巳/丑 사용. 子子 자형만 격리 검사.
    const hits = analyzeRelations(mk(['甲', '子'], ['甲', '子'], ['丙', '巳'], ['丁', '丑']))
    expect(hits.filter((h) => h.kind === '지지형' && h.detail?.includes('子'))).toHaveLength(0)
  })
  it('천간충 기본: 戊↔甲 은 충 아님 (기본 4모드)', () => {
    const hits = analyzeRelations(mk(['戊', '子'], ['甲', '丑'], ['丙', '寅'], ['丙', '卯']))
    expect(hits.filter((h) => h.kind === '천간충')).toHaveLength(0)
  })
  it('천간충 기본: 甲↔庚 은 충 성립', () => {
    expect(kindsBetween(mk(['甲', '子'], ['庚', '丑'], ['丙', '寅'], ['丙', '卯']))).toContain('천간충')
  })
})

describe("saju 신살 'your' 룰 — SSOT 오염 차단 (audit 2026-06)", () => {
  const stem = { name: '辛', element: '金' }
  const branch = (n: string) => ({ name: n, element: '土' })
  const yourPillars = {
    yearPillar: { heavenlyStem: stem, earthlyBranch: branch('子') },
    monthPillar: { heavenlyStem: stem, earthlyBranch: branch('子') },
    dayPillar: { heavenlyStem: stem, earthlyBranch: branch('未') },
    timePillar: { heavenlyStem: stem, earthlyBranch: branch('子') },
  }
  const dailyHyeonchimAt未 = () =>
    getShinsalHitsForDailyTarget('辛', '子', '未').some((h) => h.kind === '현침')

  it("standard 일진은 'your' 호출 전후로 동일 (오염 없음)", () => {
    const before = dailyHyeonchimAt未()
    // /api/saju 와 동일하게 ruleSet:'your' 를 한 번 호출
    getShinsalHits(toSajuPillarsLike(yourPillars as never), { ruleSet: 'your' })
    const after = dailyHyeonchimAt未()
    expect(after).toBe(before)
  })

  it('standard 현침: 辛 일간 + 未 는 현침 아님 (辛 현침=午)', () => {
    expect(dailyHyeonchimAt未()).toBe(false)
  })

  it("'your' 현침 오버라이드는 그대로 동작: 辛 일간 + 未 = 현침", () => {
    const hits = getShinsalHits(toSajuPillarsLike(yourPillars as never), { ruleSet: 'your' })
    expect(hits.some((h) => h.kind === '현침' && h.target === '未')).toBe(true)
  })
})

describe('astrology Zodiacal Releasing — 행성년수 (Saturn 30)', () => {
  it('Capricorn 시작 (ruler 土星) 첫 L1 period = 30년', () => {
    const periods = calculateZodiacalReleasing('Capricorn', 35)
    expect(periods[0]?.ruler).toBe('Saturn')
    expect(periods[0]?.durationYears).toBe(30)
  })
  it('Leo 시작 (ruler 태양) 첫 period = 19년 (회귀 hook)', () => {
    const periods = calculateZodiacalReleasing('Leo', 25)
    expect(periods[0]?.durationYears).toBe(19)
  })
})

describe('astrology angleDiff — standard convention (PR #816)', () => {
  // 이전 회귀: angleDiff 가 `180 - shortest` 를 반환해 transit aspect
  // 검출에서 conjunction ↔ opposition / sextile ↔ trine 가 통째로 swap.
  it('conjunction (0°) = 0', () => {
    expect(angleDiff(100, 100)).toBe(0)
    expect(angleDiff(0, 360)).toBe(0)
  })
  it('opposition (180°) = 180', () => {
    expect(angleDiff(0, 180)).toBe(180)
  })
  it('sextile (60°) = 60', () => {
    expect(angleDiff(0, 60)).toBe(60)
  })
  it('trine (120°) = 120', () => {
    expect(angleDiff(0, 120)).toBe(120)
  })
  it('square (90°) = 90', () => {
    expect(angleDiff(0, 90)).toBe(90)
  })
  it('shortest path across 360° wrap', () => {
    expect(angleDiff(350, 10)).toBe(20)
  })
})
