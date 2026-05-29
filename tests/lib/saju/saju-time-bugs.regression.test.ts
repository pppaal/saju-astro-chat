/**
 * Saju time/date 4 버그 회귀 테스트.
 *
 * 모든 fixture 는 audit 단계에서 확인된 출생-일시 → 기대 간지/대운수 매핑.
 *
 * - B1: 1990-01-04 10:00 KST 출생 — 입춘 이전(子월)인데 大雪 lookup 이
 *       Gregorian year 를 사용해 1989/12 대신 1990/12 를 쓰던 버그. 정상화되면
 *       대운수는 reasonable 한 값(~1-10 범위) 이어야 한다.
 * - B2: lunar 2020 윤4월 15일 → solar 2020-06-06 변환이 lunarLeap=true 전달되어야 함.
 *       (lunarLeap 무시 시 평4월로 해석되어 solar 2020-05-07 로 잘못 변환된다.)
 *       → 일주(日柱) 가 평4월 해석 vs 윤4월 해석 사이에서 달라야 한다.
 * - B3: 시지(時支) 산정의 한국 LMT(+30분) 보정이 적절한 케이스에서만 적용되는지.
 *   · 1957-09-15 23:15 Asia/Seoul (KMT 시대) → 子時
 *   · 1987-08-15 01:45 Asia/Seoul (KDT 시대) → 子時
 *   · 2000-06-15 23:15 America/New_York → 子時
 * - 회귀 보호: 1990-05-15 10:00 Asia/Seoul (평범한 현대 한국 출생) → 巳時.
 */

import { describe, expect, it } from 'vitest'
import { calculateSajuData } from '../../../src/lib/saju/saju'

describe('Saju time/date 4 bugs — 회귀 테스트', () => {
  describe('B1: 입춘 이전 1월 출생의 대운 절기 lookup year', () => {
    it('1990-01-04 10:00 KST 출생 대운수가 비정상적으로 크지 않아야 한다', () => {
      const r = calculateSajuData('1990-01-04', '10:00', 'male', 'solar', 'Asia/Seoul')
      // 1990-01-04 는 소한(1990-01-06) 이전이므로 사주월=子월(12), 사주년=己巳년(1989).
      // 대설(1989-12-07 또는 1990-12-07) 중 1989-12-07 를 써야 정상. 1990-12-07
      // 을 쓰면 양남 순행이라 가정 시 ~340일 → 대운수가 ~113 이 되어 비정상.
      expect(r.daeWoon.startAge).toBeGreaterThanOrEqual(1)
      expect(r.daeWoon.startAge).toBeLessThanOrEqual(15)
      // 사주월 확인: 子월(子=쥐 = 11번 index)
      expect(r.monthPillar.earthlyBranch.name).toBe('子')
    })
  })

  describe('B2: 음력 윤달 lunarLeap 전달', () => {
    it('lunar 2020 윤4월 15일 vs 평4월 15일 → 양력 변환이 다르고, 일주도 다르다', () => {
      const leap = calculateSajuData('2020-04-15', '12:00', 'male', 'lunar', 'Asia/Seoul', true)
      const plain = calculateSajuData('2020-04-15', '12:00', 'male', 'lunar', 'Asia/Seoul', false)
      // 평4월 15 → solar 2020-05-07, 윤4월 15 → solar 2020-06-06. 30일 차이 →
      // 일주(60갑자, jdn 직접 계산)가 반드시 달라야 한다.
      const leapDay = `${leap.dayPillar.heavenlyStem.name}${leap.dayPillar.earthlyBranch.name}`
      const plainDay = `${plain.dayPillar.heavenlyStem.name}${plain.dayPillar.earthlyBranch.name}`
      expect(leapDay).not.toBe(plainDay)
    })
  })

  describe('B3: 시지 한국 LMT 보정 분기', () => {
    it('1957-11-15 23:15 Asia/Seoul (KMT 시대, 비-DST) → 子時', () => {
      // 주의: 원래 audit 노트는 "1957-09-15" 였으나, IANA 데이터상 1957-09-15 는
      // 1957 한국 DST(1957-05-05 ~ 1957-09-22) 기간에 속한다. KMT 와 DST 가
      // 중첩된 케이스의 정답은 현장에서 갈리므로(전통가들이 DST 무시 vs IANA
      // 일관 분기), 보수적으로 "KMT 만, DST 외부" 인 11월 사례로 회귀를 잠근다.
      // 1957-11-15 23:15 KMT(UTC+8:30, DST 비활성) → 시계 = 127.5°E 태양시 →
      // plain 子=23:00-01:00 범위 → 23:15 → 子.
      // (구버전: 무조건 LMT +30 → 子=23:30-01:30 → 23:15 → 亥)
      const r = calculateSajuData('1957-11-15', '23:15', 'male', 'solar', 'Asia/Seoul')
      expect(r.timePillar.earthlyBranch.name).toBe('子')
    })

    it('1987-08-15 01:45 Asia/Seoul (KDT 시대) → 子時', () => {
      const r = calculateSajuData('1987-08-15', '01:45', 'male', 'solar', 'Asia/Seoul')
      // 1987 한국 DST(KDT, UTC+10) 기간. 시계 01:45 → 실제 KST 00:45.
      // DST 보정(-60min) 후 LMT 또는 plain 子 범위 (00:45) → 子.
      // (구버전: 보정 없이 LMT 子=23:30-01:30 → 01:45 → 丑)
      expect(r.timePillar.earthlyBranch.name).toBe('子')
    })

    it('2000-06-15 23:15 America/New_York → 子時 (한국 LMT 비적용)', () => {
      const r = calculateSajuData('2000-06-15', '23:15', 'male', 'solar', 'America/New_York')
      // 미국 출생에 한국 +30 LMT 를 적용해선 안 됨. plain 子=23-01 → 子.
      // (구버전: 무조건 LMT → 23:15 → 亥)
      expect(r.timePillar.earthlyBranch.name).toBe('子')
    })

    it('회귀 보호: 1990-05-15 10:00 Asia/Seoul (평범한 현대 한국) → 巳時', () => {
      const r = calculateSajuData('1990-05-15', '10:00', 'female', 'solar', 'Asia/Seoul')
      // 현대 한국, 비-DST, 비-KMT → LMT(+30) 적용 → 巳=09:30-11:30 → 10:00 → 巳.
      expect(r.timePillar.earthlyBranch.name).toBe('巳')
    })
  })
})

describe('Saju cache key v2 — lunarLeap + timezone 분리', () => {
  it('CacheKeys.saju 는 lunarLeap 과 timezone 을 구분한다', async () => {
    const { CacheKeys } = await import('../../../src/lib/cache/redis-cache')
    const a = CacheKeys.saju('2020-04-15', '12:00', 'M', 'lunar', 'Asia/Seoul', false)
    const b = CacheKeys.saju('2020-04-15', '12:00', 'M', 'lunar', 'Asia/Seoul', true)
    const c = CacheKeys.saju('2020-04-15', '12:00', 'M', 'lunar', 'America/New_York', false)
    expect(a).not.toBe(b)
    expect(a).not.toBe(c)
    expect(b).not.toBe(c)
    expect(a.startsWith('saju:v2:')).toBe(true)
  })
})
