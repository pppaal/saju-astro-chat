import { describe, it, expect } from 'vitest'
import { createHash } from 'node:crypto'
import { calculateSajuData } from '@/lib/saju/saju'
import { buildNatalContext } from '@/lib/calendar-engine/context/build'
import { buildCalendar } from '@/lib/calendar-engine'
import type { CalendarCell } from '@/lib/calendar-engine/types'

/**
 * buildCalendar 결정론 골든.
 *
 * 엔진은 순수·재현가능해야 한다(CLAUDE.md) — 같은 본명·같은 범위·같은 now 면
 * 셀 출력이 byte-identical. 이 테스트가 그 불변식을 못 깨게 잠근다:
 *   (1) 같은 입력 2회 빌드 → 셀 digest 동일(비결정성 회귀 차단)
 *   (2) digest 가 고정 golden 과 일치(의도치 않은 산식 변화 감지 — 의도 변경 시 갱신)
 *   (3) 점수 분포 invariant(0~100 범위 + 변별력 있음)
 */

const LOC = { lat: 37.5665, lon: 126.978, tz: 'Asia/Seoul' }
const BIRTH = { birthDate: '1990-05-15', birthTime: '10:30', gender: 'male' as const }
const RANGE = {
  start: '2026-06-01T00:00:00.000Z',
  end: '2026-06-30T23:59:59.000Z',
  granularity: 'day' as const,
}

async function build(): Promise<CalendarCell[]> {
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
  return buildCalendar(natal, RANGE, { includeEvidence: false })
}

// 셀의 *수치 골격*만 digest — datetime + 점수 + 현저도. (해석 텍스트는 제외:
// 결정론의 핵심은 점수/현저도. 텍스트 변경으로 골든이 깨지지 않게.)
function digest(cells: CalendarCell[]): string {
  const skeleton = cells.map((c) => [
    c.datetime,
    Math.round(c.derivedScore),
    Math.round(c.salience * 1000),
  ])
  return createHash('sha1').update(JSON.stringify(skeleton)).digest('hex')
}

describe('buildCalendar 결정론 골든', () => {
  it('같은 입력 2회 빌드 → 셀 수치 골격 동일 (결정론)', async () => {
    const a = await build()
    const b = await build()
    expect(a.length).toBe(b.length)
    expect(digest(a)).toBe(digest(b))
  }, 60_000)

  it('점수 분포 invariant — 0~100 범위 + 변별력(sd>0)', async () => {
    const cells = await build()
    expect(cells.length).toBeGreaterThan(20)
    const scores = cells.map((c) => c.derivedScore)
    for (const s of scores) {
      expect(s).toBeGreaterThanOrEqual(0)
      expect(s).toBeLessThanOrEqual(100)
    }
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length
    const sd = Math.sqrt(scores.reduce((a, b) => a + (b - mean) ** 2, 0) / scores.length)
    expect(sd).toBeGreaterThan(0) // 전부 같은 점수면 변별 불가 — 회귀
  }, 60_000)

  it('digest 가 고정 golden 과 일치 (의도치 않은 산식 변화 감지)', async () => {
    // 의도적 산식/룰 변경 시에만 이 값을 갱신한다(Saju determinism-golden 과 동일 규약).
    // 2026-07 갱신(v5): 교차 매핑 31→57쌍 확장(일/월 근거 커버리지 — 달·태양·
    // 수성·금성·화성·천을귀인). 새 cross-activation 신호가 점수 골격에 합류하며
    // digest 변경. 의도된 커버리지 확장에 따른 정당한 갱신.
    // 2026-07 갱신(v6): ZR 정통화 — 나이 앵커 출생년 1/1→실제 생일(A-2) +
    // Loosing-of-the-Bond Valens 점프 규칙(A-1). ZR 신호 창·이벤트가 이동하며
    // digest 변경. 의도된 정통 규칙 교정에 따른 정당한 갱신.
    // 2026-07 갱신(v7): 자시(子時) 이중계상 교정(C2) — 자시가 자정을 넘겨 두 날
    // 셀에 걸리던 것을, 각 셀이 그날 생성 시진만 갖도록 dedup. 새벽 꼬리(전날 자시)
    // 가 hourly 층에서 빠지며 일점수 골격 이동. 의도된 이중계상 제거에 따른 정당한 갱신.
    const GOLDEN = '459f88d1deb8346dd11234e68538268970bb2f60'
    expect(digest(await build())).toBe(GOLDEN)
  }, 60_000)
})
