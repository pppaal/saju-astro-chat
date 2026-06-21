import { describe, it, expect } from 'vitest'
import { toDecade } from '@/components/calendar/adapters/toDecade'
import { makeNatal, makeSignal } from './_fixtures'

// 대운 픽스처 — 한자 천간/지지 (saju 유틸이 한자 기대).
const DAEUN = [
  { startAge: 4, startYear: 1994, stem: '丙', branch: '寅' },
  { startAge: 14, startYear: 2004, stem: '丁', branch: '卯' },
  { startAge: 24, startYear: 2014, stem: '戊', branch: '辰' },
  { startAge: 34, startYear: 2024, stem: '己', branch: '巳' },
]

function natalWithDaeun(over = {}) {
  return makeNatal({
    dayMasterName: '甲', // 일간 甲 (목)
    daeun: DAEUN,
    pillars: {
      day: { earthlyBranch: { name: '子' } },
      month: { earthlyBranch: { name: '午' } },
    },
    ...over,
  })
}

describe('toDecade — 현재 대운 → destinypal decade', () => {
  describe('null 가드', () => {
    it('대운 리스트가 비면 null', () => {
      expect(toDecade(makeNatal({ daeun: [] }))).toBeNull()
    })
    it('일간이 없으면 null', () => {
      const natal = makeNatal({ daeun: DAEUN, dayMasterName: '' })
      // dayMaster.name='' → falsy → null
      expect(toDecade(natal)).toBeNull()
    })
  })

  describe('현재 대운 선택', () => {
    it('currentAge 가 들어있는 [startAge, startAge+10) 대운을 고른다', () => {
      const d = toDecade(natalWithDaeun(), { currentAge: 30, currentYear: 2020 })!
      // age 30 → 24~34 대운 (戊辰)
      expect(d.ageFrom).toBe(24)
      expect(d.ageTo).toBe(34)
      expect(d.start).toBe(2014)
      expect(d.end).toBe(2024)
      expect(d.gz.hanja).toBe('戊辰')
    })

    it('경계값 startAge 포함 (>=)', () => {
      const d = toDecade(natalWithDaeun(), { currentAge: 24, currentYear: 2014 })!
      expect(d.ageFrom).toBe(24)
    })

    it('어떤 대운에도 안 맞으면 첫 대운 폴백', () => {
      const d = toDecade(natalWithDaeun(), { currentAge: 200 })!
      expect(d.ageFrom).toBe(4)
    })

    it('currentAge/currentYear 미지정 시 첫 대운', () => {
      const d = toDecade(natalWithDaeun())!
      expect(d.ageFrom).toBe(4)
      expect(d.start).toBe(1994)
    })
  })

  describe('십신 + 테마', () => {
    it('대운 천간 십신을 일간 기준으로 (甲 일간 × 丙 = 식신)', () => {
      // 1994 대운 丙寅, 일간 甲 → 丙 은 식신
      const d = toDecade(natalWithDaeun(), { currentAge: 5 })!
      expect(d.sibsin).toBe('식신')
      expect(d.theme).toBe('표현·창작의 무대')
      expect(d.themeEn).toBe('Creativity · Output')
      expect(d.headline).toContain('식신 대운')
    })

    it('테마 사전에 없는 십신은 폴백 문구', () => {
      // 일간을 한글로 두면 getSibsinKo='' → safeSibsin '—' → 사전 미스
      const d = toDecade(natalWithDaeun({ dayMasterName: '갑' }), { currentAge: 5 })!
      expect(d.sibsin).toBe('—')
      expect(d.theme).toBe('— 흐름')
      expect(d.headline).toContain('대운')
    })
  })

  describe('years[10] 스파인', () => {
    it('시작연도부터 10개 세운 + now 플래그 + 점수', () => {
      const scores = [10, 20, 30, 40, 50, 60, 70, 80, 90, 99]
      const d = toDecade(natalWithDaeun(), {
        currentAge: 30,
        currentYear: 2020,
        yearScores: scores,
      })!
      expect(d.years).toHaveLength(10)
      expect(d.years[0].year).toBe(2014)
      expect(d.years[9].year).toBe(2023)
      expect(d.years.map((y) => y.score)).toEqual(scores)
      // now = currentYear(2020) → index 6
      expect(d.years.find((y) => y.now)?.year).toBe(2020)
      expect(d.years.filter((y) => y.now)).toHaveLength(1)
    })

    it('yearScores 미지정 시 모두 50', () => {
      const d = toDecade(natalWithDaeun(), { currentAge: 30, currentYear: 2020 })!
      expect(d.years.every((y) => y.score === 50)).toBe(true)
    })

    it('각 해 세운 간지는 연도 고유 (computeSewoonGanji) — 1994=甲戌', () => {
      const d = toDecade(natalWithDaeun(), { currentAge: 5 })!
      // 1994 offset 10 → stem idx 0(甲)? offset%10=0 → 甲, branch (10%12)=10 → 戌
      expect(d.years[0].year).toBe(1994)
      expect(d.years[0].gz.hanja).toBe('甲戌')
      // 각 해 sibsin 도 일간 기준
      expect(d.years[0].sibsin).toBe('비견') // 甲 vs 甲
    })
  })

  describe('sewoonNow', () => {
    it('focusYear 의 세운이 years 안에 있으면 sewoonNow 채움', () => {
      const d = toDecade(natalWithDaeun(), { currentAge: 30, currentYear: 2020 })!
      expect(d.focusYear).toBe(2020)
      expect(d.sewoonNow).toBeDefined()
      // 2020 offset 36 → stem 36%10=6 庚, branch 36%12=0 子 → 庚子
      expect(d.sewoonNow!.gz.hanja).toBe('庚子')
    })

    it('focusYear 가 years 범위 밖이면 sewoonNow undefined', () => {
      const d = toDecade(natalWithDaeun(), {
        currentAge: 30,
        currentYear: 2020,
        focusYear: 1900,
      })!
      expect(d.focusYear).toBe(1900)
      expect(d.sewoonNow).toBeUndefined()
    })
  })

  describe('pillar 정통화', () => {
    it('천간/지지 한자 + 십신 + 오행 라벨', () => {
      const d = toDecade(natalWithDaeun(), { currentAge: 5 })! // 丙寅
      expect(d.pillar.cheongan.hanja).toBe('丙')
      expect(d.pillar.cheongan.sibsin).toBe('식신')
      expect(d.pillar.cheongan.el).toBe('화(火)')
      expect(d.pillar.jiji.hanja).toBe('寅')
      expect(d.pillar.jiji.el).toBe('목(木)')
      // jiji sibsin: 일간 甲(목) vs 寅(목) 같은 오행 → 비견
      expect(d.pillar.jiji.sibsin).toBe('비견')
    })
  })

  describe('hapchung / unseong (auto-derive)', () => {
    it('대운 지지가 본명 지지와 충/합 없으면 중립 라인', () => {
      // 대운 辰(2024) vs 본명 day 子, month 午 — 子辰? 충 아님; 中立 또는 합
      const d = toDecade(natalWithDaeun(), { currentAge: 34 })!
      expect(d.hapchung.title).toBeDefined()
      expect(d.hapchung.body.length).toBeGreaterThan(0)
    })

    it('대운 子(첫 대운으로 강제) — 본명 午 와 子午충', () => {
      const daeun = [{ startAge: 4, startYear: 1994, stem: '甲', branch: '子' }]
      const d = toDecade(
        natalWithDaeun({ daeun, pillars: { month: { earthlyBranch: { name: '午' } } } }),
        { currentAge: 5 }
      )!
      expect(d.hapchung.title).toContain('충')
    })

    it('unseong 은 12운성 단계 + 본문', () => {
      const d = toDecade(natalWithDaeun(), { currentAge: 5 })!
      expect(d.unseong.title).toBeTruthy()
      expect(d.unseong.body).toContain('대운 자리')
    })

    it('opts.hapchung / opts.unseong 직주입이 auto 보다 우선', () => {
      const d = toDecade(natalWithDaeun(), {
        currentAge: 5,
        hapchung: { title: '주입H', body: 'hbody' },
        unseong: { title: '주입U', body: 'ubody' },
      })!
      expect(d.hapchung).toEqual({ title: '주입H', body: 'hbody' })
      expect(d.unseong).toEqual({ title: '주입U', body: 'ubody' })
    })
  })

  describe('crossActivations', () => {
    it('decadal layer cross-activation 만 추출, polarity 절대값 내림차순', () => {
      const signals = [
        makeSignal({
          kind: 'cross-activation',
          layer: 'decadal',
          name: '정재 × 금성',
          id: 'c1',
          polarity: 1,
          korean: '재물 페어',
          evidence: { module: 'x', detail: { sajuKey: '정재', astroKey: 'Venus' } },
        }),
        makeSignal({
          kind: 'cross-activation',
          layer: 'decadal',
          name: '편관 × 토성',
          id: 'c2',
          polarity: -3,
          evidence: { module: 'x', detail: { meaning: '압박 페어' } },
        }),
        // yearly layer → 제외
        makeSignal({
          kind: 'cross-activation',
          layer: 'yearly',
          name: '제외',
          id: 'c3',
          polarity: 2,
        }),
        // 다른 kind → 제외
        makeSignal({ kind: 'shinsal', layer: 'decadal', name: '도화', id: 's1', polarity: 1 }),
      ]
      const d = toDecade(natalWithDaeun(), { currentAge: 5, decadalSignals: signals })!
      expect(d.crossActivations).toHaveLength(2)
      // 정렬: |−3| > |1|
      expect(d.crossActivations[0].name).toBe('편관 × 토성')
      expect(d.crossActivations[0].polarity).toBe(-3)
      expect(d.crossActivations[0].meaning).toBe('압박 페어')
      expect(d.crossActivations[1].name).toBe('정재 × 금성')
      expect(d.crossActivations[1].sajuLine).toBe('정재')
      expect(d.crossActivations[1].astroLine).toBe('Venus')
      expect(d.crossActivations[1].meaning).toBe('재물 페어') // korean 우선
    })

    it('같은 이름 dedup — 더 강한 polarity 를 대표로', () => {
      const signals = [
        makeSignal({
          kind: 'cross-activation',
          layer: 'decadal',
          name: '동일',
          id: 'a',
          polarity: 1,
        }),
        makeSignal({
          kind: 'cross-activation',
          layer: 'decadal',
          name: '동일',
          id: 'b',
          polarity: -2,
        }),
      ]
      const d = toDecade(natalWithDaeun(), { currentAge: 5, decadalSignals: signals })!
      expect(d.crossActivations).toHaveLength(1)
      expect(d.crossActivations[0].polarity).toBe(-2)
      // 대표 signalId 는 첫 등장(a)
      expect(d.crossActivations[0].signalId).toBe('a')
    })

    it('신호 없으면 빈 배열', () => {
      const d = toDecade(natalWithDaeun(), { currentAge: 5 })!
      expect(d.crossActivations).toEqual([])
    })
  })

  describe('body / narrative / astro / geokguk', () => {
    it('body 기본값은 [headline]', () => {
      const d = toDecade(natalWithDaeun(), { currentAge: 5 })!
      expect(d.body).toEqual([d.headline])
    })
    it('opts.body / narrative / astroMarks 통과', () => {
      const d = toDecade(natalWithDaeun(), {
        currentAge: 5,
        body: ['b1', 'b2'],
        narrative: [{ tag: 't', body: 'n' }],
        astroMarks: [{ label: 'Jupiter', date: '2030', body: 'return' }],
      })!
      expect(d.body).toEqual(['b1', 'b2'])
      expect(d.narrative).toEqual([{ tag: 't', body: 'n' }])
      expect(d.astro).toEqual([{ label: 'Jupiter', date: '2030', body: 'return' }])
    })
    it('astro / narrative 기본 빈 배열', () => {
      const d = toDecade(natalWithDaeun(), { currentAge: 5 })!
      expect(d.astro).toEqual([])
      expect(d.narrative).toEqual([])
    })
    it('geokgukStatus — analyses 결손 시 undefined', () => {
      const d = toDecade(natalWithDaeun({ analyses: {} }), { currentAge: 5 })!
      expect(d.geokgukStatus).toBeUndefined()
    })
    it('geokgukStatus — primary "미정" 은 undefined 처리', () => {
      const d = toDecade(natalWithDaeun({ analyses: { geokguk: { primary: '미정' } } }), {
        currentAge: 5,
      })!
      expect(d.geokgukStatus).toBeUndefined()
    })
    it('geokgukStatus — 성격 + positive', () => {
      const d = toDecade(
        natalWithDaeun({
          analyses: {
            geokguk: {
              primary: '식신격',
              statusResult: { status: '성격', factors: { positive: ['재성 생조'] } },
            },
          },
        }),
        { currentAge: 5 }
      )!
      expect(d.geokgukStatus).toBe('식신격 · 성격 (재성 생조)')
    })
  })
})
