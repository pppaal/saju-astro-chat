/**
 * 시주(時柱) 시진 — 진태양시 보정 회귀.
 *
 * forecast 시진 경계가 본명 시주와 *동일 공식*으로 시계↔태양 차를 반영하는지 고정.
 *   시계분 = 진태양시분 − round((경도 − 표준자오선)×4),  표준자오선 = tzOffset×15
 * 균시차(EoT)는 본명과 마찬가지로 적용 안 함(평균태양시) → 분 단위 결정론.
 * 中 중국 서부처럼 넓은 타임존에서 시진이 통째로 이동하는 게 핵심(전세계 정확도).
 *
 * @vitest-environment node
 */
import { describe, it, expect, vi } from 'vitest'

vi.unmock('swisseph')
vi.unmock('@/lib/astrology/foundation/ephe')

import { buildNatalContext } from '@/lib/calendar-engine/context/build'
import { buildCalendar } from '@/lib/calendar-engine'

const DATE = '2030-04-20' // 중국·한국 DST 없음 → tzOffset 고정, 분 결정론

async function maoWindow(loc: { latitude: number; longitude: number; timeZone: string }) {
  const natal = await buildNatalContext({
    birthDate: '1995-02-09', birthTime: '06:40', gender: 'male', calendarType: 'solar', ...loc,
  })
  const cells = await buildCalendar(
    natal, { start: DATE, end: DATE, granularity: 'hour' },
    { enabledExtractors: ['pillar-sibsin'] as never[] }
  )
  const mao = cells.flatMap((c) => c.signals).find((s) => /卯.*시진/.test(s.name))
  expect(mao, '卯시 시진 신호가 있어야 함').toBeTruthy()
  return mao!.active.start.slice(11, 16) // 'HH:MM'
}

describe('saju-hour 진태양시 보정 (전세계 일관)', () => {
  it(
    '서울(126.98°E, KST 135°) — 卯시 경계가 ~−32분 이동(05:32)',
    async () => {
      // round((126.98 − 135)×4) = round(−32.09) = −32 → 시계 05:00 + 32 = 05:32
      expect(await maoWindow({ latitude: 37.57, longitude: 126.98, timeZone: 'Asia/Seoul' })).toBe('05:32')
    },
    60000
  )

  it(
    '카슈가르(76°E, 베이징시간 120°) — 넓은 타임존이라 시진이 ~+3시간 이동(07:56)',
    async () => {
      // round((76 − 120)×4) = −176 → 시계 05:00 + 176분 = 07:56. 보정 없으면 05:00 (≈3시간 오차)
      expect(await maoWindow({ latitude: 39.47, longitude: 75.99, timeZone: 'Asia/Shanghai' })).toBe('07:56')
    },
    60000
  )

  it(
    '경도 없으면 보정 0 — 시계 시각 그대로(05:00)',
    async () => {
      // longitude 누락 시 옛 동작 보존. (buildNatalContext 는 lat/lon 필수라 직접 보장이
      //  어려워, 보정 공식의 경계만 확인: 표준자오선 위 도시는 보정 0.)
      // 동경 135°(KST 표준자오선) 정위치 가상도시 → correction 0 → 05:00.
      expect(await maoWindow({ latitude: 35, longitude: 135, timeZone: 'Asia/Seoul' })).toBe('05:00')
    },
    60000
  )
})
