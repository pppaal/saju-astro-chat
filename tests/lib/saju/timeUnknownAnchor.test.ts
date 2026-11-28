/**
 * 시간 미상이면 어떤 시각 문자열이 와도 정오 앵커 (재감사 SP-2 · SDR-08, CONVENTIONS §5, OD-5).
 *
 * 미상 플래그가 우선이다(birthTimeAnchor tri-state: "시각이 남아 있어도 미상 우선"). 예전엔
 * calculateSajuData 가 빈 문자열만 정오로 바꿔, 저장된 시각 + 미상 플래그를 넘기면 그 시각으로
 * 절입을 판정했다 — 절입일 출생의 년·월주·대운수·격국이 화면마다 갈렸다.
 *
 * 기대값(엔진 코드 미사용 — 재감사 판정 스크립트의 독립 도출, astronomy-engine 節 instant):
 *  - 1988-07-07 서울 남자: 小暑 1988-07-06T21:32:53Z. 정오 KDT(+10) = 02:00Z 는 小暑 뒤 →
 *    戊辰 己未 癸亥, 순행 대운수 floor(31.22/3)=10 (立秋 1988-08-07T07:20:40Z), 정오 자리표시
 *    시주 丁巳. '03:00' 은 小暑 전이라 예전엔 月 戊午·대운수 1 이 나왔다.
 *  - 2023-02-04 서울 남자: 立春 2023-02-04 11:42 KST. 정오는 立春 뒤 → 癸卯 甲寅 癸巳, 격국
 *    상관격, 자리표시 시주 戊午. '04:00' 은 立春 전이라 예전엔 壬寅 癸丑·잡기격이 나왔다.
 */
import { describe, expect, it } from 'vitest'
import { calculateSajuData } from '@/lib/saju/saju'
import { collectSajuFacts } from '@/lib/destiny/sajuFacts'

const NOW = new Date('2026-11-25T03:00:00Z')
const TIMES = ['03:00', '23:30', '', '12:00', '04:00', '11:00'] as const

type P = { heavenlyStem: { name: string }; earthlyBranch: { name: string } }
const gz = (p: P) => p.heavenlyStem.name + p.earthlyBranch.name

function calc(date: string, time: string) {
  return calculateSajuData(date, time, 'male', 'solar', 'Asia/Seoul', false, undefined, NOW, {
    timeUnknown: true,
  })
}
function facts(date: string, time: string) {
  return collectSajuFacts({
    birthDate: date,
    birthTime: time,
    birthTimeUnknown: true,
    gender: 'male',
    timezone: 'Asia/Seoul',
    now: NOW,
  })
}

describe('calculateSajuData(opts.timeUnknown) — 시각 문자열과 무관하게 정오 앵커', () => {
  it('1988-07-07 (小暑일): 모든 시각이 戊辰 己未 癸亥 + 자리표시 丁巳 + 대운수 10', () => {
    for (const t of TIMES) {
      const r = calc('1988-07-07', t)
      expect(
        [r.yearPillar, r.monthPillar, r.dayPillar].map(gz),
        `time ${JSON.stringify(t)}`
      ).toEqual(['戊辰', '己未', '癸亥'])
      expect(gz(r.timePillar)).toBe('丁巳')
      expect(r.daeWoon.startAge).toBe(10)
      expect(r.daeWoon.isForward).toBe(true)
      expect(r.meta?.birthUtc).toBe('1988-07-07T02:00:00.000Z')
      expect(r.timeUnknown).toBe(true)
    }
  })

  it('출력 전체가 같다 — "03:00"·"23:30"·"" 는 정오 미상과 byte 동일', () => {
    const ref = JSON.stringify(calc('1988-07-07', '12:00'))
    for (const t of ['03:00', '23:30', '']) {
      expect(JSON.stringify(calc('1988-07-07', t))).toBe(ref)
    }
  })

  it('플래그 없이 시각을 알면 그 시각으로 계산한다 (회귀 아님: 03:00 은 小暑 전 戊午)', () => {
    const known = calculateSajuData(
      '1988-07-07',
      '03:00',
      'male',
      'solar',
      'Asia/Seoul',
      false,
      undefined,
      NOW
    )
    expect(gz(known.monthPillar)).toBe('戊午')
    expect(known.daeWoon.startAge).toBe(1)
    expect(known.timeUnknown).toBeUndefined()
  })
})

describe('collectSajuFacts({ birthTimeUnknown: true }) — 시각 문자열과 무관', () => {
  it('2023-02-04 (立春일): 모든 시각이 癸卯 甲寅 癸巳 · 상관격 · 시주 없음', () => {
    const ref = facts('2023-02-04', '12:00')
    expect(
      [ref.pillars.year, ref.pillars.month, ref.pillars.day].map((p) => p.stem + p.branch)
    ).toEqual(['癸卯', '甲寅', '癸巳'])
    expect(ref.geokguk).toBe('상관격')
    expect(ref.pillars.time).toBeNull()
    for (const t of TIMES) {
      const f = facts('2023-02-04', t)
      expect(f.pillars, `time ${JSON.stringify(t)}`).toEqual(ref.pillars)
      expect(f.geokguk).toBe(ref.geokguk)
      expect(f.yongsin).toEqual(ref.yongsin)
      expect(f.strength).toBe(ref.strength)
      expect(f.daeun).toEqual(ref.daeun)
      expect(f.fiveElements).toEqual(ref.fiveElements)
      expect(f._raw.timePillar.heavenlyStem.name + f._raw.timePillar.earthlyBranch.name).toBe(
        '戊午'
      )
    }
  })

  it('1988-07-07: "03:00"·"23:30"·"" 의 facts 가 정오 미상과 같다', () => {
    const ref = facts('1988-07-07', '12:00')
    expect(ref.pillars.month.stem + ref.pillars.month.branch).toBe('己未')
    for (const t of ['03:00', '23:30', '']) {
      const f = facts('1988-07-07', t)
      expect(f.pillars).toEqual(ref.pillars)
      expect(f.daeun).toEqual(ref.daeun)
      expect(f.geokguk).toBe(ref.geokguk)
    }
  })
})
