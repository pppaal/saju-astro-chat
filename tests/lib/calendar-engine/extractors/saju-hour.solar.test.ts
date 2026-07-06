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
    birthDate: '1995-02-09',
    birthTime: '06:40',
    gender: 'male',
    calendarType: 'solar',
    ...loc,
  })
  const cells = await buildCalendar(
    natal,
    { start: DATE, end: DATE, granularity: 'hour' },
    { enabledExtractors: ['pillar-sibsin'] as never[] }
  )
  const mao = cells.flatMap((c) => c.signals).find((s) => /卯.*시진/.test(s.name))
  expect(mao, '卯시 시진 신호가 있어야 함').toBeTruthy()
  return mao!.active.start.slice(11, 16) // 'HH:MM'
}

describe('saju-hour 진태양시 보정 (전세계 일관)', () => {
  it('서울(126.98°E, KST 135°) — 卯시 경계가 ~−32분 이동(05:32)', async () => {
    // round((126.98 − 135)×4) = round(−32.09) = −32 → 시계 05:00 + 32 = 05:32
    expect(await maoWindow({ latitude: 37.57, longitude: 126.98, timeZone: 'Asia/Seoul' })).toBe(
      '05:32'
    )
  }, 60000)

  it('카슈가르(76°E, 베이징시간 120°) — 넓은 타임존이라 시진이 ~+3시간 이동(07:56)', async () => {
    // round((76 − 120)×4) = −176 → 시계 05:00 + 176분 = 07:56. 보정 없으면 05:00 (≈3시간 오차)
    expect(await maoWindow({ latitude: 39.47, longitude: 75.99, timeZone: 'Asia/Shanghai' })).toBe(
      '07:56'
    )
  }, 60000)

  it('경도 없으면 보정 0 — 시계 시각 그대로(05:00)', async () => {
    // longitude 누락 시 옛 동작 보존. (buildNatalContext 는 lat/lon 필수라 직접 보장이
    //  어려워, 보정 공식의 경계만 확인: 표준자오선 위 도시는 보정 0.)
    // 동경 135°(KST 표준자오선) 정위치 가상도시 → correction 0 → 05:00.
    expect(await maoWindow({ latitude: 35, longitude: 135, timeZone: 'Asia/Seoul' })).toBe('05:00')
  }, 60000)
})

// 자시(子時)는 23~01시로 자정을 넘겨 두 날 셀에 걸린다 — day 그래뉼래리티에서 각
// 셀이 *그날 생성된* 시진만 갖도록 dedup 됐는지(감사 C2 이중계상 방지) 확인한다.
describe('saju-hour 자시 자정 넘김 이중계상 방지 (C2)', () => {
  it('day 셀은 그날 생성 시진만 갖는다 — 전날 자시 새벽 꼬리가 안 섞인다', async () => {
    const natal = await buildNatalContext({
      birthDate: '1995-02-09',
      birthTime: '06:40',
      gender: 'male',
      calendarType: 'solar',
      latitude: 37.57,
      longitude: 126.98,
      timeZone: 'Asia/Seoul',
    })
    const cells = await buildCalendar(
      natal,
      { start: '2030-04-18', end: '2030-04-22', granularity: 'day' },
      { enabledExtractors: ['pillar-sibsin'] as never[] }
    )
    for (const c of cells) {
      const cellDay = c.datetime.slice(0, 10)
      const hourSigs = c.signals.filter((s) => s.id.startsWith('saju.hour.'))
      // 붙은 시진은 전부 이 셀 소속 날짜여야 한다(전날 자시 꼬리 제거).
      for (const s of hourSigs) {
        expect(s.id.slice(10, 20), `${cellDay} 셀에 다른 날(${s.id}) 시진이 섞임`).toBe(cellDay)
      }
      // 하루엔 12지지 시진 각 1개 — 같은 지지가 두 번(자기 것 + 전날 꼬리) 나오면 안 됨.
      const branches = hourSigs.map((s) => s.id.slice(21)) // '子.甲' 등
      expect(new Set(branches).size).toBe(branches.length)
    }
  }, 60000)
})
