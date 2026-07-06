/**
 * keyDay 푸시 — 톤·본문이 웹 캘린더와 *같은 권위*인지 잠그는 회귀 가드(감사 #5).
 *
 * 예전엔 derivedScore>=50(6층 합산 절대값)으로 톤을 갈라, 웹 그리드(층별 점수 +
 * CALENDAR_BANDS)가 빨간 날에 "큰 날 ✨" 푸시가 나가는 모순이 가능했다. 이제
 * 톤 = reconcileCellOneLine(...).dayTone.tone, 본문 = 그 oneLine 그대로여야 한다.
 */
import { describe, it, expect, vi } from 'vitest'
import { makeCell, makeSignal } from '../../components/calendar/adapters/_fixtures'

// 2026-06 월 cells — 오늘(6/15)이 salience 1위(큰 날)가 되게 구성.
const cells = [
  makeCell({
    datetime: '2026-06-13T00:00:00.000Z',
    derivedScore: 55,
    salience: 0.1,
    signals: [makeSignal({ kind: 'pillar-sibsin', layer: 'daily', polarity: 1, weight: 0.5 })],
  }),
  makeCell({
    datetime: '2026-06-14T00:00:00.000Z',
    derivedScore: 45,
    salience: 0.2,
    signals: [makeSignal({ kind: 'pillar-sibsin', layer: 'daily', polarity: -1, weight: 0.5 })],
  }),
  makeCell({
    datetime: '2026-06-15T00:00:00.000Z',
    // 절대점수는 높지만(옛 축이면 무조건 "큰 날 ✨"), 톤은 화해 결과를 따라야 한다.
    derivedScore: 52,
    salience: 0.9,
    topReasons: ['좋은 것'],
    cautions: ['조심할 것'],
    signals: [makeSignal({ kind: 'pillar-sibsin', layer: 'daily', polarity: -2, weight: 0.9 })],
  }),
  makeCell({
    datetime: '2026-06-16T00:00:00.000Z',
    derivedScore: 60,
    salience: 0.3,
    signals: [makeSignal({ kind: 'pillar-sibsin', layer: 'daily', polarity: 2, weight: 0.7 })],
  }),
]

vi.mock('@/lib/calendar-engine/persistence', () => ({
  getOrBuildNatalContext: vi.fn(async () => ({}) as never),
  getOrBuildMonthCells: vi.fn(async () => cells),
}))
vi.mock('@/lib/datetime/timezone', async (importOriginal) => {
  const orig = await importOriginal<typeof import('@/lib/datetime/timezone')>()
  return { ...orig, getNowInTimezone: () => ({ year: 2026, month: 6, day: 15 }) }
})

import { buildKeyDayPayload } from '@/lib/push/keyDay'
import { deriveLayeredScores } from '@/lib/calendar-engine/derivers/layeredScore'
import { reconcileCellOneLine } from '@/components/calendar/adapters/toDay'

const BIRTH = {
  birthDate: '1995-02-09',
  birthTime: '06:40',
  gender: 'male' as const,
  latitude: 37.5665,
  longitude: 126.978,
  timeZone: 'Asia/Seoul',
}

describe('buildKeyDayPayload — 웹과 단일 권위', () => {
  it('본문 = 웹 일 화면 oneLine, 제목 톤 = 화해 verdict (감사 #5)', async () => {
    const payload = await buildKeyDayPayload(BIRTH, 'ko')
    expect(payload).not.toBeNull()

    const layered = deriveLayeredScores(cells as never)
    const today = cells.find((c) => c.datetime.startsWith('2026-06-15'))!
    const unified = reconcileCellOneLine(today as never, layered.daily.get('2026-06-15')?.score)

    expect(payload!.body).toBe(unified.oneLine)
    const tone = unified.dayTone.tone
    const expectedTitle =
      tone === 'positive'
        ? '오늘은 당신의 큰 날 ✨'
        : tone === 'caution'
          ? '오늘은 살펴야 할 날 ⚠️'
          : '오늘은 기복 있는 큰 날 🌗'
    expect(payload!.title).toBe(expectedTitle)
    // 옛 축(derivedScore 52 >= 50 → 무조건 ✨)으로의 회귀 차단: 이 픽스처의 그날
    // 신호는 흉 우세라 positive 제목이 나오면 안 된다.
    expect(payload!.title).not.toBe('오늘은 당신의 큰 날 ✨')
  })

  it('EN 로케일 — 본문 = oneLineEn', async () => {
    const payload = await buildKeyDayPayload(BIRTH, 'en')
    expect(payload).not.toBeNull()
    const layered = deriveLayeredScores(cells as never)
    const today = cells.find((c) => c.datetime.startsWith('2026-06-15'))!
    const unified = reconcileCellOneLine(today as never, layered.daily.get('2026-06-15')?.score)
    expect(payload!.body).toBe(unified.oneLineEn)
  })
})
