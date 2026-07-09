/**
 * 시간 미상 정오 앵커 SSOT — resolveBirthTimeAnchor 규약 + 엔진 레벨 회귀.
 *
 * 회귀 배경: 시간 모름을 '00:00'(자정)으로 계산하는 경로(궁합·운명상담사·캘린더
 * 세션)가 있었다. calculateSajuData 는 진태양시(경도) 보정을 출생 인스턴트 전체에
 * 적용하므로(서울 -32분), 자정 앵커는 인스턴트가 전날 23:28 로 밀려 **일주가
 * 전날 간지**가 됐고, 절입일(예: 1988-07-07 소서)엔 **월주까지** 어긋났다.
 * 통합리포트만 정오 앵커라 같은 사람의 사주가 화면마다 달랐다("궁합 사주가
 * 틀리다" 버그). 정오는 보정이 날짜 경계를 절대 못 넘는 안전한 앵커다.
 */
import { describe, it, expect } from 'vitest'
import { resolveBirthTimeAnchor, TIME_UNKNOWN_ANCHOR } from '@/lib/saju/birthTimeAnchor'
import { calculateSajuData } from '@/lib/saju/saju'

describe('resolveBirthTimeAnchor — 판정 규약', () => {
  it("빈 값 / '00:00' / 명시 플래그는 전부 미상 → 정오 앵커", () => {
    expect(resolveBirthTimeAnchor(undefined)).toEqual({
      time: TIME_UNKNOWN_ANCHOR,
      timeUnknown: true,
    })
    expect(resolveBirthTimeAnchor(null)).toEqual({ time: TIME_UNKNOWN_ANCHOR, timeUnknown: true })
    expect(resolveBirthTimeAnchor('')).toEqual({ time: TIME_UNKNOWN_ANCHOR, timeUnknown: true })
    expect(resolveBirthTimeAnchor('  ')).toEqual({ time: TIME_UNKNOWN_ANCHOR, timeUnknown: true })
    expect(resolveBirthTimeAnchor('00:00')).toEqual({
      time: TIME_UNKNOWN_ANCHOR,
      timeUnknown: true,
    })
    // 플래그가 서면 시각이 있어도 미상이 우선 — 폼이 시각을 안 지운 상태 방어.
    expect(resolveBirthTimeAnchor('08:30', true)).toEqual({
      time: TIME_UNKNOWN_ANCHOR,
      timeUnknown: true,
    })
  })

  it('실제 시각은 그대로 통과 (자정 직후 포함)', () => {
    expect(resolveBirthTimeAnchor('23:30')).toEqual({ time: '23:30', timeUnknown: false })
    expect(resolveBirthTimeAnchor('00:01')).toEqual({ time: '00:01', timeUnknown: false })
    expect(resolveBirthTimeAnchor(' 06:40 ', false)).toEqual({ time: '06:40', timeUnknown: false })
  })
})

describe('정오 앵커 — 엔진 레벨 회귀 (진태양시 보정 × 날짜 경계)', () => {
  const SEOUL_LON = 126.978
  const TZ = 'Asia/Seoul'
  // 원국(네 기둥)은 now 와 무관하지만, 결정론을 위해 고정 주입.
  const NOW = new Date('2026-07-09T00:00:00Z')
  const dayGanji = (date: string, time: string) => {
    const r = calculateSajuData(date, time, 'male', 'solar', TZ, undefined, SEOUL_LON, NOW)
    return `${r.dayPillar.heavenlyStem.name}${r.dayPillar.earthlyBranch.name}`
  }
  const monthGanji = (date: string, time: string) => {
    const r = calculateSajuData(date, time, 'male', 'solar', TZ, undefined, SEOUL_LON, NOW)
    return `${r.monthPillar.heavenlyStem.name}${r.monthPillar.earthlyBranch.name}`
  }

  it('정오 앵커의 일주는 생일 당일 간지 (자정 앵커는 전날로 밀린다)', () => {
    // 1992-03-15 의 일주는 庚寅. 자정 앵커는 -32분 보정으로 전날(己丑)이 된다.
    expect(dayGanji('1992-03-15', TIME_UNKNOWN_ANCHOR)).toBe('庚寅')
    expect(dayGanji('1992-03-15', '00:00')).toBe('己丑') // 자정 앵커의 위험 문서화
  })

  it('절입일엔 자정 앵커가 월주까지 밀린다 — 정오 앵커는 절입 후 월주 유지', () => {
    // 1988-07-07 은 소서(未월 절입)일. 정오는 절입 후(己未월), 자정-32분은 절입 전(戊午월).
    expect(monthGanji('1988-07-07', TIME_UNKNOWN_ANCHOR)).toBe('己未')
    expect(monthGanji('1988-07-07', '00:00')).toBe('戊午')
  })

  it('정오 앵커는 같은 날 낮 시각들과 같은 일주 — 날짜의 안정 대표값', () => {
    for (const t of ['06:00', '09:30', '15:00', '18:00']) {
      expect(dayGanji('1992-03-15', t)).toBe(dayGanji('1992-03-15', TIME_UNKNOWN_ANCHOR))
    }
  })
})
