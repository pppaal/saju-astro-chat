// Saju + Astrology doctrine 정확성 회귀 테스트.
//
// 2026-05 audit (PR #813 / #816 / #821 / #823) 에서 발견된 회귀들이 다시
// 들어오지 않게 doctrinal 값 hardcode 로 hook 한다. 기존 테스트들이
// "valid stage 중 하나면 OK" 식의 얕은 assertion 이라 잘못된 계산이
// 통과하던 문제 보강.

import { describe, it, expect } from 'vitest'
import { getTwelveStage } from '@/lib/saju/shinsal'
import { getShinsalHits } from '@/lib/saju/shinsal'
import { calculateSajuData } from '@/lib/saju/saju'
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
