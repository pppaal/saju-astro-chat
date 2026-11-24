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
import {
  isBirthTimeUnknown,
  resolveBirthTimeAnchor,
  TIME_UNKNOWN_ANCHOR,
} from '@/lib/saju/birthTimeAnchor'
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

  it("tri-state: 명시 플래그 false 면 '00:00' 을 실제 자정 출생으로 신뢰", () => {
    // 플래그가 DB/URL/폼에서 보존된 새 데이터 — '00:00' 은 진짜 자정.
    expect(resolveBirthTimeAnchor('00:00', false)).toEqual({ time: '00:00', timeUnknown: false })
    expect(isBirthTimeUnknown('00:00', false)).toBe(false)
    // 단 빈 시각은 플래그와 무관하게 미상 (앎을 주장해도 계산할 시각이 없다).
    expect(resolveBirthTimeAnchor('', false)).toEqual({
      time: TIME_UNKNOWN_ANCHOR,
      timeUnknown: true,
    })
    // null 플래그(레거시 DB 행) = 미지정 → 휴리스틱.
    expect(isBirthTimeUnknown('00:00', null)).toBe(true)
    expect(isBirthTimeUnknown('08:30', null)).toBe(false)
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

  // 2026-10: 일주가 민용일 기준으로 고쳐지면서 이 테스트의 의미가 바뀌었다.
  //
  // 예전엔 "자정 앵커는 -32분 보정으로 일주가 전날(己丑)로 밀린다" 를 **위험으로
  // 문서화**하고 그게 정오 앵커를 쓰는 근거의 절반이었다. 그런데 그 밀림 자체가
  // 버그였다(일주는 민용일 경계여야 한다 — CONVENTIONS.md §1). 고친 뒤로는
  // **앵커가 무엇이든 일주가 같다** — 더 강한 보장이므로 그걸 불변식으로 박는다.
  //
  // 정오 앵커의 근거는 남은 쪽(아래 절입일 월주 + ASC/하우스 중간값)으로 유지된다.
  it('일주는 앵커와 무관하다 — 민용일 기준이므로 (2026-10 수정)', () => {
    const noon = dayGanji('1992-03-15', TIME_UNKNOWN_ANCHOR)
    expect(noon).toBe('庚寅') // 1992-03-15 의 민용일 일주
    expect(dayGanji('1992-03-15', '00:00')).toBe(noon)
    expect(dayGanji('1992-03-15', '23:59')).toBe(noon)
  })

  // **이쪽은 여전히 유효하다** — 절기(절입)는 천문 사건이라 진태양시 보정이
  // 적용되는 게 맞다. 일주(달력 count)와 달리 월주·년주는 보정된 instant 를
  // 기준으로 판정한다. 정오 앵커를 쓰는 진짜 근거가 여기다.
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
