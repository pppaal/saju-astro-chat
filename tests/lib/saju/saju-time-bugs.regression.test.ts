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

describe('Saju 진경도(진태양시) 보정 — longitude 옵션', () => {
  it('longitude 미전달 시 기존 한국 LMT 동작 보존 (회귀 보호)', () => {
    // longitude 없으면 옛 동작 그대로. 1990-05-15 10:00 KST → 巳.
    const r = calculateSajuData('1990-05-15', '10:00', 'female', 'solar', 'Asia/Seoul')
    expect(r.timePillar.earthlyBranch.name).toBe('巳')
  })

  it('longitude 같이 전달하면 도시별로 시지가 달라질 수 있다 (서울 vs 부산)', () => {
    // KST 표준자오선 135°E. 서울 ≈ 126.98°E → 보정 (126.98-135)*4 = -32분.
    // 부산 ≈ 129.07°E → 보정 (129.07-135)*4 = -24분. 9분 차이.
    // 11:24 시계시 →
    //   서울: 11:24-32=10:52 → 巳(09-11)? 아니 PLAIN 巳=09-11 → 10:52 → 巳.
    //   부산: 11:24-24=11:00 → PLAIN 午=11-13 → 11:00 → 午.
    const seoul = calculateSajuData(
      '1990-05-15',
      '11:24',
      'female',
      'solar',
      'Asia/Seoul',
      false,
      126.98
    )
    const busan = calculateSajuData(
      '1990-05-15',
      '11:24',
      'female',
      'solar',
      'Asia/Seoul',
      false,
      129.07
    )
    expect(seoul.timePillar.earthlyBranch.name).toBe('巳')
    expect(busan.timePillar.earthlyBranch.name).toBe('午')
  })

  it('미국 동부 (NYC ≈ -74°W, EST 표준자오선 -75°E) → 보정 ~+4분', () => {
    // 2000-06-15 11:00 America/New_York. EDT(UTC-4) → 표준자오선 -60°E.
    // NYC lon -74 → 보정 = (-74 - (-60)) * 4 = -56분 → 11:00 - 56 = 10:04.
    // PLAIN 巳 = 09-11 → 10:04 → 巳.
    const r = calculateSajuData(
      '2000-06-15',
      '11:00',
      'male',
      'solar',
      'America/New_York',
      false,
      -74
    )
    expect(r.timePillar.earthlyBranch.name).toBe('巳')
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

/**
 * 자시(子時) 학파 회귀 — 우리는 子正(자정 기준) 학파 채택.
 *
 * 명리학파 차이:
 *  - 子正派(조자, 早子): 자정 00:00 기준으로 일주가 바뀐다. 23-24시 출생은 전날 일주,
 *    00-01시 출생은 다음날 일주. 둘 다 시지는 子.
 *  - 子初派(야자, 夜子): 23:00 기준으로 일주가 바뀐다. 23시 넘으면 무조건 다음날 일주.
 *
 * 우리 구현 = 子正派 (한국에서 가장 일반적). 다른 학파 도구와 다른 결과가 나올 수
 * 있는데, 이걸 명시적으로 잠가둔다. 누가 子初派로 바꾸려 하면 이 테스트가 깨진다.
 */
describe('자시(子時) 일주 경계 — 子正派 회귀 (한국 LMT 보정 포함)', () => {
  it('1990-05-15 23:30 KST → 5/15 일주(庚辰) + 子시 (자정 안 넘음)', () => {
    const r = calculateSajuData('1990-05-15', '23:30', 'male', 'solar', 'Asia/Seoul')
    expect(r.dayPillar.heavenlyStem.name).toBe('庚')
    expect(r.dayPillar.earthlyBranch.name).toBe('辰')
    expect(r.timePillar.earthlyBranch.name).toBe('子')
  })

  it('1990-05-16 00:00 KST → 5/16 일주(辛巳) + 子시 (자정 넘음)', () => {
    const r = calculateSajuData('1990-05-16', '00:00', 'male', 'solar', 'Asia/Seoul')
    expect(r.dayPillar.heavenlyStem.name).toBe('辛')
    expect(r.dayPillar.earthlyBranch.name).toBe('巳')
    expect(r.timePillar.earthlyBranch.name).toBe('子')
  })

  it('1990-05-16 00:30 KST → 여전히 5/16 일주(辛巳) + 子시', () => {
    const r = calculateSajuData('1990-05-16', '00:30', 'male', 'solar', 'Asia/Seoul')
    expect(r.dayPillar.heavenlyStem.name).toBe('辛')
    expect(r.dayPillar.earthlyBranch.name).toBe('巳')
    expect(r.timePillar.earthlyBranch.name).toBe('子')
  })
})

/**
 * 한국 DST(KDT) 시대 전환 순간 회귀.
 *
 * 1987 한국 DST 기간: 1987-05-10 ~ 1987-10-11.
 *  - 봄 전환 (1987-05-10): 02:00 KST → 03:00 KDT (1시간 점프, "건너뛴 시각")
 *  - 가을 전환 (1987-10-11): 03:00 KDT → 02:00 KST (1시간 중복, "모호한 시각")
 *
 * 전환 순간 자체에 출생 신고가 들어왔을 때 사주가 깨지지 않고 일관되게 계산되어야
 * 한다. 정확한 "철학적 정답" 보다 — 일관/안정 동작을 잠그는 목적.
 */
describe('한국 DST 전환 순간 출생 — 일관성 회귀', () => {
  it('1987-05-10 01:30 (DST 시작 직전 KST) 계산 성공', () => {
    const r = calculateSajuData('1987-05-10', '01:30', 'male', 'solar', 'Asia/Seoul')
    expect(r.dayPillar.heavenlyStem.name).toBeDefined()
    expect(r.timePillar.earthlyBranch.name).toBeDefined()
  })

  it('1987-05-10 03:30 (DST 점프 직후 KDT) 계산 성공 + 일주 일관', () => {
    const before = calculateSajuData('1987-05-10', '01:30', 'male', 'solar', 'Asia/Seoul')
    const after = calculateSajuData('1987-05-10', '03:30', 'male', 'solar', 'Asia/Seoul')
    // 같은 날 출생이라 일주 동일.
    expect(after.dayPillar.heavenlyStem.name).toBe(before.dayPillar.heavenlyStem.name)
    expect(after.dayPillar.earthlyBranch.name).toBe(before.dayPillar.earthlyBranch.name)
  })

  it('1987-10-11 02:30 (DST 종료 모호 시각) throw 안 되고 결정적으로 계산', () => {
    const r1 = calculateSajuData('1987-10-11', '02:30', 'male', 'solar', 'Asia/Seoul')
    const r2 = calculateSajuData('1987-10-11', '02:30', 'male', 'solar', 'Asia/Seoul')
    // 같은 입력 두 번 호출 시 결정적이어야 함 (랜덤/시드 의존 X).
    expect(r1.dayPillar.heavenlyStem.name).toBe(r2.dayPillar.heavenlyStem.name)
    expect(r1.timePillar.earthlyBranch.name).toBe(r2.timePillar.earthlyBranch.name)
  })

  it('1987-10-11 03:30 (DST 종료 후 KST) 계산 성공', () => {
    const r = calculateSajuData('1987-10-11', '03:30', 'male', 'solar', 'Asia/Seoul')
    expect(r.dayPillar.heavenlyStem.name).toBeDefined()
    expect(r.timePillar.earthlyBranch.name).toBeDefined()
  })
})
