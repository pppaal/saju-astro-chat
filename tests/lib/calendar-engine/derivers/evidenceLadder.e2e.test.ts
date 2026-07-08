import { describe, it, expect } from 'vitest'
import { calculateSajuData } from '@/lib/saju/saju'
import { buildNatalContext } from '@/lib/calendar-engine/context/build'
import { buildCalendar } from '@/lib/calendar-engine'
import { deriveEvidenceLadder } from '@/lib/calendar-engine/derivers/evidenceLadder'

// 진짜 buildCalendar 산출 셀에서 사다리가 실제로 채워지는지 관측(스모크).
const LOC = { lat: 37.5665, lon: 126.978, tz: 'Asia/Seoul' }
const BIRTH = { birthDate: '1990-05-15', birthTime: '10:30', gender: 'male' as const }
const RANGE = {
  start: '2026-07-01T00:00:00.000Z',
  end: '2026-07-31T23:59:59.000Z',
  granularity: 'day' as const,
}

describe('evidenceLadder — 실 빌드 스모크', () => {
  it('실제 셀에서 4개 시간층 사다리가 채워지고 결론에 전문어가 없다', async () => {
    const saju = calculateSajuData(BIRTH.birthDate, BIRTH.birthTime, BIRTH.gender, 'solar', LOC.tz)
    const natal = await buildNatalContext(
      {
        birthDate: BIRTH.birthDate,
        birthTime: BIRTH.birthTime,
        gender: BIRTH.gender,
        latitude: LOC.lat,
        longitude: LOC.lon,
        timeZone: LOC.tz,
      },
      { saju }
    )
    const cells = await buildCalendar(natal, RANGE, { includeEvidence: true })
    const mid = cells[Math.floor(cells.length / 2)]

    const ladder = deriveEvidenceLadder(mid.signals, 'ko')
    // pillar-sibsin 이 4층을 다 emit 하므로 사다리는 여러 칸이 차야 한다.
    expect(ladder.length).toBeGreaterThanOrEqual(3)
    // 각 칸: 결론 비어있지 않고, 칩이 최소 1개.
    for (const r of ladder) {
      expect(r.conclusion.length).toBeGreaterThan(0)
      expect(r.chips.length).toBeGreaterThan(0)
    }
    // 최소 한 칸엔 사주 칩이 있다(backbone).
    expect(ladder.some((r) => r.chips.some((c) => c.source === 'saju'))).toBe(true)
  }, 60_000)
})
