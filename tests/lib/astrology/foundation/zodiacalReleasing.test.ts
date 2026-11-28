// @vitest-environment node
// tests/lib/astrology/foundation/zodiacalReleasing.test.ts
import { describe, it, expect } from 'vitest'
import {
  calculateZodiacalReleasing,
  calculateZRSubPeriods,
  calculateZRSubPeriodsL3,
  calculateZRSubPeriodsL4,
  getActiveZRPeriod,
  getActiveZRSub,
  annotateZRMarkers,
} from '@/lib/astrology/foundation/zodiacalReleasing'

describe('zodiacalReleasing — Fortune ZR + L2/L3/L4 sub-period + Peak/Loosing-of-Bond', () => {
  describe('L1 calculation (existing)', () => {
    it('starts from Aries and uses Mars 15y as first chapter', () => {
      const periods = calculateZodiacalReleasing('Aries', 90)
      expect(periods[0]).toMatchObject({
        level: 1,
        sign: 'Aries',
        ruler: 'Mars',
        durationYears: 15,
        startYear: 0,
        endYear: 15,
      })
    })

    it('moves zodiac order on transition', () => {
      const periods = calculateZodiacalReleasing('Aries', 30)
      expect(periods[0].sign).toBe('Aries')
      expect(periods[1].sign).toBe('Taurus')
      expect(periods[1].ruler).toBe('Venus')
      expect(periods[1].durationYears).toBe(8)
    })
  })

  describe('annotateZRMarkers — Peak on L1 (LB 는 L1 마커가 아님 — 감사 A-1)', () => {
    it('flags 1/4/7/10th-from-start as peak; L1 loosing 은 항상 false', () => {
      const periods = calculateZodiacalReleasing('Aries', 200)
      const marked = annotateZRMarkers('Aries', periods)
      // 1st (Aries itself) is peak
      const aries = marked.find((p) => p.sign === 'Aries')!
      expect(aries.isPeak).toBe(true)
      // 4th = Cancer
      const cancer = marked.find((p) => p.sign === 'Cancer')!
      expect(cancer.isPeak).toBe(true)
      // 7th = Libra → angular peak. (예전 오정의: 7번째를 LB 로 표시 — LB 는
      // 하위 시퀀스의 반대편 점프 사건이지 챕터 위치가 아니다.)
      const libra = marked.find((p) => p.sign === 'Libra')!
      expect(libra.isLoosingOfTheBond).toBe(false)
      expect(libra.isPeak).toBe(true)
      // 10th = Capricorn
      const capricorn = marked.find((p) => p.sign === 'Capricorn')!
      expect(capricorn.isPeak).toBe(true)
      // 2nd = Taurus — not peak
      const taurus = marked.find((p) => p.sign === 'Taurus')!
      expect(taurus.isPeak).toBe(false)
      expect(taurus.isLoosingOfTheBond).toBe(false)
      // L1 전체에서 LB 마커는 존재하지 않는다.
      expect(marked.every((p) => !p.isLoosingOfTheBond)).toBe(true)
    })
  })

  describe('L2 sub-period — months scale', () => {
    it('L2 covers one full L1 by total duration', () => {
      const l1 = calculateZodiacalReleasing('Aries', 30)[0] // Aries L1 (15 years)
      const l2 = calculateZRSubPeriods(l1)
      // Sum of L2 durations should equal L1 duration
      const totalL2 = l2.reduce((sum, p) => sum + p.durationYears, 0)
      expect(totalL2).toBeCloseTo(l1.durationYears, 5)
      // First L2 sign = parent sign
      expect(l2[0].sign).toBe('Aries')
      // First L2 duration = 15 months = 1.25 years (Aries ruler Mars=15)
      expect(l2[0].durationYears).toBeCloseTo(15 / 12, 5)
    })

    it('L2 starts at parent start age', () => {
      const periods = calculateZodiacalReleasing('Aries', 60)
      const taurusL1 = periods[1] // Taurus 15..23
      const l2 = calculateZRSubPeriods(taurusL1)
      expect(l2[0].startYear).toBeCloseTo(taurusL1.startYear, 5)
    })

    it('L2 peak marked relative to parent L1 sign; 7th 는 LB 아님(점프 사건만 LB)', () => {
      const l1 = calculateZodiacalReleasing('Aries', 30)[0] // Aries L1
      const l2 = calculateZRSubPeriods(l1)
      const aries = l2.find((p) => p.sign === 'Aries')!
      const libra = l2.find((p) => p.sign === 'Libra')
      expect(aries.isPeak).toBe(true)
      // Aries L1(15년=180개월)은 12궁 한 바퀴(211개월)를 못 채우므로 점프 없음 —
      // 7번째(Libra)는 angular peak 일 뿐 LB 가 아니다(감사 A-1 교정).
      expect(libra).toBeDefined()
      expect(libra!.isPeak).toBe(true)
      expect(libra!.isLoosingOfTheBond).toBe(false)
      expect(l2.every((p) => !p.isLoosingOfTheBond)).toBe(true)
    })

    it('Loosing of the bond — 긴 챕터(Aquarius 30년)는 한 바퀴(211개월) 후 반대편(Leo)으로 점프', () => {
      // Aquarius 시작 → L1[0] = Aquarius 30년(360개월). 12궁 합 211개월을 다 돌면
      // Aquarius 를 반복하지 않고 반대편 Leo 로 점프(Valens LB). 그 L2 가 LB 마커.
      const l1 = calculateZodiacalReleasing('Aquarius', 40)[0]
      expect(l1.sign).toBe('Aquarius')
      expect(l1.durationYears).toBe(30)
      const l2 = calculateZRSubPeriods(l1)
      // 첫 12개: Aquarius 부터 황도 순서 한 바퀴.
      expect(l2[0].sign).toBe('Aquarius')
      expect(l2[11].sign).toBe('Capricorn')
      // 13번째: 부모(Aquarius) 반복 대신 반대편 Leo — LB.
      expect(l2[12].sign).toBe('Leo')
      expect(l2[12].isLoosingOfTheBond).toBe(true)
      // 한 바퀴 총합 = 211개월.
      const firstLap = l2.slice(0, 12).reduce((s, p) => s + p.durationYears, 0)
      expect(firstLap).toBeCloseTo(211 / 12, 5)
      // 점프 이후에도 황도 순서 유지(Leo → Virgo → …).
      expect(l2[13].sign).toBe('Virgo')
      // 총 길이는 부모와 일치(마지막 조각은 잘림).
      const total = l2.reduce((s, p) => s + p.durationYears, 0)
      expect(total).toBeCloseTo(30, 5)
    })
  })

  describe('L3 sub-period — 위 층의 1/12 (행성년 1 = 2.5일, OD-11)', () => {
    it('L3 nested under L2: Mars L3 = 15 × 2.5일 = 37.5일', () => {
      const l1 = calculateZodiacalReleasing('Aries', 30)[0]
      const l2 = calculateZRSubPeriods(l1)[0] // Aries L2 (1.25 years)
      const l3 = calculateZRSubPeriodsL3(l2)
      // First L3 sign = L2 parent sign
      expect(l3[0].sign).toBe(l2.sign)
      // 첫 L3 = 화성(Aries) 15단위 × 2.5일 = 37.5일. (예전 1일 단위 = 15일 — 엔진 감사 ASTRO-6)
      expect(l3[0].durationYears * 365.25).toBeCloseTo(37.5, 6)
      // L3 start equals L2 start
      expect(l3[0].startYear).toBeCloseTo(l2.startYear, 5)
      // 총 길이는 부모 L2 와 같다(마지막 조각은 잘림).
      const total = l3.reduce((s, p) => s + p.durationYears, 0)
      expect(total).toBeCloseTo(l2.durationYears, 8)
    })

    it('L3 결 풀림은 한 바퀴(211 × 2.5일 ≈ 17.33개월)보다 긴 L2 에서만', () => {
      const lapYears = (211 * 2.5) / 365.25
      for (const start of ['Aries', 'Leo', 'Capricorn', 'Aquarius', 'Gemini'] as const) {
        for (const l1 of calculateZodiacalReleasing(start, 60)) {
          for (const l2 of calculateZRSubPeriods(l1)) {
            const lb = calculateZRSubPeriodsL3(l2).filter((p) => p.isLoosingOfTheBond)
            if (l2.durationYears <= lapYears) expect(lb, `${start}/${l2.sign}`).toEqual([])
          }
        }
      }
    })

    it('긴 L2(물병 30개월)는 한 바퀴 뒤 반대편(사자)으로 L3 결 풀림', () => {
      const l1 = calculateZodiacalReleasing('Aquarius', 40)[0]
      const l2 = calculateZRSubPeriods(l1)[0] // Aquarius L2 (30 months)
      expect(l2.sign).toBe('Aquarius')
      const l3 = calculateZRSubPeriodsL3(l2)
      expect(l3[11].sign).toBe('Capricorn')
      expect(l3[12].sign).toBe('Leo')
      expect(l3[12].isLoosingOfTheBond).toBe(true)
      // 첫 결 풀림은 한 바퀴(211 × 2.5일) 뒤.
      expect((l3[12].startYear - l2.startYear) * 365.25).toBeCloseTo(527.5, 6)
      // 결 풀림은 언제나 반대편 sign 으로의 점프다(사자 → 물병 반복 대신 다시 사자 —
      // 물병 30단위 L2 만 두 번째 귀환까지 간다).
      expect(l3.filter((p) => p.isLoosingOfTheBond).every((p) => p.sign === 'Leo')).toBe(true)
    })
  })

  describe('L4 sub-period — L3 의 1/12 (행성년 1 = 5시간)', () => {
    it('L4 nested under L3: Mars L4 = 15 × 5시간 = 75시간', () => {
      const l1 = calculateZodiacalReleasing('Aries', 30)[0]
      const l2 = calculateZRSubPeriods(l1)[0]
      const l3 = calculateZRSubPeriodsL3(l2)[0]
      const l4 = calculateZRSubPeriodsL4(l3)
      expect(l4[0].durationYears * 365.25 * 24).toBeCloseTo(75, 6)
      // 층마다 1/12 — L3 첫 칸 / L4 첫 칸 = 12.
      expect(l3.durationYears / l4[0].durationYears).toBeCloseTo(12, 8)
    })
  })

  describe('getActiveZRSub — drill down at an age', () => {
    it('returns L1/L2/L3/L4 chain at a given fractional age', () => {
      const periods = calculateZodiacalReleasing('Aries', 90)
      const active = getActiveZRSub(periods, 0.001) // very early — under Aries L1/L2/L3/L4
      expect(active.l1?.sign).toBe('Aries')
      expect(active.l2?.sign).toBe('Aries')
      expect(active.l3?.sign).toBe('Aries')
      expect(active.l4?.sign).toBe('Aries')
    })

    it('returns empty when age is past projection', () => {
      const periods = calculateZodiacalReleasing('Aries', 30)
      const active = getActiveZRSub(periods, 999)
      expect(active.l1).toBeUndefined()
    })
  })

  describe('getActiveZRPeriod (existing API)', () => {
    it('finds active L1 chapter for given age', () => {
      const periods = calculateZodiacalReleasing('Aries', 60)
      const active = getActiveZRPeriod(periods, 16)
      expect(active?.sign).toBe('Taurus') // 15..23
    })
  })

  describe('Fortune ZR (uses same calculator with Fortune sign)', () => {
    it('produces independent sequence from same engine when started from Fortune sign', () => {
      const spirit = calculateZodiacalReleasing('Aries', 30)
      const fortune = calculateZodiacalReleasing('Cancer', 30)
      expect(spirit[0].sign).toBe('Aries')
      expect(fortune[0].sign).toBe('Cancer')
      expect(fortune[0].ruler).toBe('Moon')
      expect(fortune[0].durationYears).toBe(25)
    })
  })
})
