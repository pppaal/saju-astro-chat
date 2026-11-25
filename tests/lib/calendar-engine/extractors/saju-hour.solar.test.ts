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
import { hourSegmentsForCivilDay } from '@/lib/calendar-engine/extractors/saju-hour'
import { computeDayStem } from '@/lib/calendar-engine/extractors/saju-shinsal'
import { calculateSajuData } from '@/lib/saju/saju'
import { solarTimeCorrectionMinutes } from '@/lib/saju/timezone'
import { STEMS, BRANCHES, TIME_STEM_LOOKUP } from '@/lib/saju/constants'

const DATE = '2030-04-20' // 중국·한국 DST 없음 → tzOffset 고정, 분 결정론

type Natal = Awaited<ReturnType<typeof buildNatalContext>>

async function maoWindow(
  loc: { latitude: number; longitude: number; timeZone: string },
  patch?: (natal: Natal) => Natal
) {
  const built = await buildNatalContext({
    birthDate: '1995-02-09',
    birthTime: '06:40',
    gender: 'male',
    calendarType: 'solar',
    ...loc,
  })
  const natal = patch ? patch(built) : built
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

  it('표준자오선 정위치(135°E, KST) 가상도시 → 보정 0 → 05:00', async () => {
    expect(await maoWindow({ latitude: 35, longitude: 135, timeZone: 'Asia/Seoul' })).toBe('05:00')
  }, 60000)

  it('경도 미상이면 본명 시주와 같은 기본값 — 존 기준 경도(서울 126.978 → 05:32, OD-2)', async () => {
    // 예전엔 경도·타임존이 없으면 보정 0(시계 05:00)이라 본명 시주(서울 −32분)와 갈렸다.
    const seoul = { latitude: 37.57, longitude: 126.98, timeZone: 'Asia/Seoul' }
    const noLon = await maoWindow(seoul, (n) => ({
      ...n,
      astro: { ...n.astro, location: { ...n.astro.location, longitude: undefined as never } },
    }))
    expect(noLon).toBe('05:32')
    const noLocation = await maoWindow(seoul, (n) => ({
      ...n,
      astro: { ...n.astro, location: undefined as never },
    }))
    expect(noLocation).toBe('05:32')
  }, 60000)
})

// 자시(子時) — CONVENTIONS §1: 일주는 자정(민용일)에 바뀌고 時干은 그날 일간에서. 민용일 D 의
// 子 는 [D 00:00, 子 끝) 과 [子 시작, D+1 00:00) 두 조각, 둘 다 D 일간의 時柱(엔진 감사 X3·F1).
// 어느 창도 자정을 넘지 않으니 셀에는 그날 시진만 붙는다(감사 C2 이중계상도 조각 weight 합 0.4).
describe('saju-hour 자시 — 민용일 두 조각 (CONVENTIONS §1)', () => {
  const natalP = buildNatalContext({
    birthDate: '1995-02-09',
    birthTime: '06:40',
    gender: 'male',
    calendarType: 'solar',
    latitude: 37.57,
    longitude: 126.98,
    timeZone: 'Asia/Seoul',
  })

  it('day 셀은 그날 시진만 갖고, 어느 시진 창도 자정을 넘지 않는다', async () => {
    const cells = await buildCalendar(
      await natalP,
      { start: '2030-04-18', end: '2030-04-22', granularity: 'day' },
      { enabledExtractors: ['pillar-sibsin'] as never[] }
    )
    for (const c of cells) {
      const cellDay = c.datetime.slice(0, 10)
      const hourSigs = c.signals.filter((s) => s.id.startsWith('saju.hour.'))
      for (const s of hourSigs) {
        expect(s.id.slice(10, 20), `${cellDay} 셀에 다른 날(${s.id}) 시진이 섞임`).toBe(cellDay)
        expect(s.active.start.slice(0, 10)).toBe(cellDay)
        expect(s.active.end.slice(0, 10)).toBe(cellDay)
        expect(Date.parse(s.active.end)).toBeGreaterThan(Date.parse(s.active.start))
      }
      // 같은 時柱의 조각 weight 합은 시진 하나(0.4) — 자정 분할이 hourly 층을 부풀리지 않는다.
      const byPillar = new Map<string, number>()
      for (const s of hourSigs) {
        const k = s.evidence.pillars?.[0] ?? s.name
        byPillar.set(k, (byPillar.get(k) ?? 0) + s.weight)
      }
      for (const [k, w] of byPillar) expect(w, `${cellDay} ${k}`).toBeCloseTo(0.4, 5)
    }
  }, 60000)

  it('2030-04-20 00:10 → 丙子(정관), 2030-04-19 23:40 → 甲子(정재) — 본명 시주와 같은 時柱', async () => {
    const natal = await natalP
    const cells = await buildCalendar(
      natal,
      { start: '2030-04-19', end: '2030-04-20', granularity: 'day' },
      { enabledExtractors: ['pillar-sibsin'] as never[] }
    )
    const ziOf = (day: string) =>
      cells
        .find((c) => c.datetime.startsWith(day))!
        .signals.filter((s) => s.id.startsWith('saju.hour.') && s.name.includes('子'))
    // 04-20 새벽 子 = 그날(乙) 일간 → 丙子. 04-19 밤 子 = 그날(甲) 일간 → 甲子.
    const dawn = ziOf('2030-04-20').find((s) => s.active.start.endsWith('T00:00:00.000Z'))
    const late = ziOf('2030-04-19').find((s) => s.active.end.endsWith('T23:59:59.999Z'))
    expect(dawn?.name).toBe('丙子 (정관) 시진')
    expect(dawn?.active.end.slice(11, 16)).toBe('01:32')
    expect(late?.name).toBe('甲子 (정재) 시진')
    expect(late?.active.start.slice(11, 16)).toBe('23:32')
    const natal1 = calculateSajuData(
      '2030-04-20',
      '00:10',
      'male',
      'solar',
      'Asia/Seoul',
      false,
      126.98
    )
    const natal2 = calculateSajuData(
      '2030-04-19',
      '23:40',
      'male',
      'solar',
      'Asia/Seoul',
      false,
      126.98
    )
    expect(`${natal1.timePillar.heavenlyStem.name}${natal1.timePillar.earthlyBranch.name}`).toBe(
      '丙子'
    )
    expect(`${natal2.timePillar.heavenlyStem.name}${natal2.timePillar.earthlyBranch.name}`).toBe(
      '甲子'
    )
  }, 60000)

  it('속성: 임의 시계 시각의 캘린더 시진 時柱 = calculateSajuData 의 시주 (여러 경도)', () => {
    let seed = 20261125
    const rnd = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0
      return seed / 2 ** 32
    }
    const places = [
      { lon: 126.98, tz: 'Asia/Seoul' },
      { lon: 129.08, tz: 'Asia/Seoul' },
      { lon: 139.69, tz: 'Asia/Tokyo' }, // 표준자오선 동쪽 — 子 가 22:41 부터
      { lon: 75.99, tz: 'Asia/Shanghai' }, // 보정 −176분 — 자정을 감싸는 지지가 亥
      { lon: -0.13, tz: 'Europe/London' },
    ]
    for (let i = 0; i < 300; i++) {
      const p = places[i % places.length]
      // DST 없는 날(1월)만 — 보정분이 하루 안에서 바뀌지 않게.
      const day = `20${String(20 + Math.floor(rnd() * 10))}-01-${String(1 + Math.floor(rnd() * 28)).padStart(2, '0')}`
      const minute = Math.floor(rnd() * 1440)
      const hh = String(Math.floor(minute / 60)).padStart(2, '0')
      const mm = String(minute % 60).padStart(2, '0')
      const date = new Date(`${day}T00:00:00.000Z`)
      const corr = solarTimeCorrectionMinutes(date, p.lon, p.tz)
      const seg = hourSegmentsForCivilDay(corr).find(
        (s) => minute >= s.startMin && minute < s.endMin
      )!
      const dayStem = computeDayStem(date)!
      const first = STEMS.findIndex((s) => s.name === TIME_STEM_LOOKUP[dayStem])
      const cal = `${STEMS[(first + seg.branchIdx) % 10].name}${BRANCHES[seg.branchIdx].name}`
      const natal = calculateSajuData(day, `${hh}:${mm}`, 'male', 'solar', p.tz, false, p.lon)
      const want = `${natal.timePillar.heavenlyStem.name}${natal.timePillar.earthlyBranch.name}`
      expect(cal, `${day} ${hh}:${mm} ${p.tz} lon ${p.lon}`).toBe(want)
    }
  })

  it('시진 조각은 하루 [0, 1440) 분을 빈틈·겹침 없이 덮는다', () => {
    for (const corr of [-176, -130, -32, -23, 0, 19, 45, 90]) {
      const segs = hourSegmentsForCivilDay(corr)
      expect(segs[0].startMin).toBe(0)
      expect(segs[segs.length - 1].endMin).toBe(1440)
      for (let i = 1; i < segs.length; i++) expect(segs[i].startMin).toBe(segs[i - 1].endMin)
      const split = segs.filter((s) => s.part !== 'whole')
      expect(split.map((s) => s.part).sort()).toEqual(['early', 'late'])
      expect(new Set(split.map((s) => s.branchIdx)).size).toBe(1)
    }
  })
})
