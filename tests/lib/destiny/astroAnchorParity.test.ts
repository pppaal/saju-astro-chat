/**
 * 시간 미상 앵커 — 점성 진입점도 사주와 같은 규칙 (G8 carryover, CONVENTIONS §5).
 *
 * G1 은 사주(collectSajuFacts·calculateSajuData)가 birthTimeUnknown 이면 넘어온 시각
 * 문자열('03:00' 등)이 아니라 정오 앵커를 쓰게 했다. 점성 쪽 진입점 — collectAstroFacts,
 * 캘린더 buildNatalContext 의 natalInput, 통합 리포트 buildReportContext 의 input,
 * 운명상담사 SR·진행 입력, 궁합 compatAstroFacts — 는 빈 값만 정오로 바꿔, 남은 시각이
 * 행성 위치·리턴·진행을 움직였다. 이제 모두 astroAnchorTime 하나를 쓴다.
 */
import { describe, it, expect } from 'vitest'
import { astroAnchorTime, TIME_UNKNOWN_ANCHOR } from '@/lib/saju/birthTimeAnchor'
import { buildNatalContext } from '@/lib/calendar-engine/context/build'
import { buildReportContext } from '@/lib/report/buildReportContext'

describe('astroAnchorTime', () => {
  it('flag true → noon, whatever the time string', () => {
    for (const t of ['03:00', '23:30', '00:00', '01:45 PM', '', null, undefined]) {
      expect(astroAnchorTime(t, true)).toBe(TIME_UNKNOWN_ANCHOR)
    }
  })
  it('blank → noon even without a flag', () => {
    expect(astroAnchorTime('', undefined)).toBe('12:00')
    expect(astroAnchorTime('   ', false)).toBe('12:00')
    expect(astroAnchorTime(null)).toBe('12:00')
  })
  it("known time stays (incl. a real midnight '00:00' — no legacy heuristic here)", () => {
    expect(astroAnchorTime('03:00', false)).toBe('03:00')
    expect(astroAnchorTime('00:00', undefined)).toBe('00:00')
    expect(astroAnchorTime(' 07:15 ', undefined)).toBe('07:15')
  })
})

const BIRTH = {
  birthDate: '1990-05-15',
  gender: 'male' as const,
  latitude: 37.5665,
  longitude: 126.978,
  timeZone: 'Asia/Seoul',
}

describe('time unknown: a stale time string does not reach the astro inputs', () => {
  it('calendar buildNatalContext — natalInput is the noon anchor', async () => {
    const stale = await buildNatalContext({ ...BIRTH, birthTime: '03:00', birthTimeUnknown: true })
    expect(stale.input.hour).toBe(12)
    expect(stale.input.minute).toBe(0)
    const known = await buildNatalContext({ ...BIRTH, birthTime: '03:00' })
    expect(known.input.hour).toBe(3)
  })

  it('report buildReportContext — input hour is the noon anchor', async () => {
    const stale = await buildReportContext({
      ...BIRTH,
      birthTime: '03:00',
      birthTimeUnknown: true,
    })
    expect(stale.input.hour).toBe(12)
    expect(stale.input.minute).toBe(0)
    const known = await buildReportContext({ ...BIRTH, birthTime: '03:00' })
    expect(known.input.hour).toBe(3)
  })
})
