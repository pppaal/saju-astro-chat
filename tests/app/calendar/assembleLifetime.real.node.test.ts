/**
 * assembleLifetime — Life '이 10년의 겹침'(decadeCross)을 실제 천체력으로 (G12).
 *
 * assembleLifetime.test.ts 는 전역 swisseph 모의(0.1°/일 톱니) 위에서 돌아, 그 파일의
 * '정재 × 토성|0' 10년 교차 기대값은 모의가 만든 가짜 토성 회귀 군집에 기대고 있었다(G6
 * 지적). 실제 하늘에서 1995-02-09 06:40 서울의 첫 토성 회귀는 2024-03-18(통과 창
 * 2024-03-09..03-26)이라 2026-07-06 셀엔 생애 주기 신호도, 10년 교차도 없다. 그래서 그
 * 기대값을 여기로 옮겨 실제 하늘의 값으로 고정하고, 모의 파일에는 모의와 무관한 불변식만 둔다.
 *
 *  - 1995-02-09 06:40 서울, 2026-07-06: 생애 주기 신호 0 · decadal 교차 0 · Life 겹침 = 빈 상태
 *    (오너 결정 13). 실제 첫 토성 회귀일엔 그 신호가 있고(창 = 마일스톤 창), 대운 천간 부모가
 *    토성 매핑에 없어 겹침 행은 여전히 없다.
 *  - 1990-05-15 06:40 서울, 2013-08-08(두 번째 목성 회귀): Life 겹침 = 정인 × 목성 +2 한 행 —
 *    assembleLifetime 이 그 셀의 buildDecadeCross 와 같은 행을 ko/en 으로 싣는다.
 *
 * 실제 Swiss Ephemeris(node 환경, swisseph unmock). native swisseph 가 없으면 로컬에선 skip,
 * CI·destiny 릴리스 게이트(ops:destiny:release — 'real.node' 패턴)에선 실패한다.
 *
 * @vitest-environment node
 */
import { it, expect, vi } from 'vitest'

vi.unmock('swisseph')
vi.unmock('@/lib/astrology/foundation/ephe')

const { describeRealEphemeris } = await import('../../helpers/realEphemeris')

const { buildNatalContext } = await import('@/lib/calendar-engine/context/build')
const { buildCalendar } = await import('@/lib/calendar-engine')
const { calculateOuterPlanetMilestones } =
  await import('@/lib/calendar-engine/lifecycle/outerMilestones')
const { assembleLifetime, buildDecadeCross } = await import('@/app/calendar/assembleLifetime')

type Natal = Awaited<ReturnType<typeof buildNatalContext>>
type Cell = Awaited<ReturnType<typeof buildCalendar>>[number]

const SEOUL = { latitude: 37.5665, longitude: 126.978, timeZone: 'Asia/Seoul' }

async function dayCell(natal: Natal, day: string): Promise<Cell> {
  const cells = await buildCalendar(
    natal,
    { start: `${day}T00:00:00.000Z`, end: `${day}T23:59:59.999Z`, granularity: 'day' },
    { includeEvidence: true }
  )
  return cells[0]
}
const decadalCrosses = (c: Cell) =>
  c.signals
    .filter((s) => s.kind === 'cross-activation' && s.layer === 'decadal')
    .map((s) => `${s.name}|${s.polarity}`)

async function life(natal: Natal, cell: Cell, day: string, birthYear: number, lang: 'ko' | 'en') {
  const { lifetime } = await assembleLifetime({
    natal,
    lang,
    birthYear,
    targetYear: Number(day.slice(0, 4)),
    sex: '남',
    birthDisplay: '',
    whoBirthLine: '',
    place: 'Seoul',
    now: new Date(`${day}T03:00:00Z`),
    todayIso: day,
    focusDayCell: cell,
  })
  return lifetime
}

describeRealEphemeris('assembleLifetime — decade overlap on the real sky', () => {
  it('1995-02-09 서울, 2026-07-06: 생애 주기·10년 교차 없음 → Life 겹침 빈 상태 (모의의 정재 × 토성 아님)', async () => {
    const day = '2026-07-06'
    const natal = await buildNatalContext({
      birthDate: '1995-02-09',
      birthTime: '06:40',
      gender: 'male',
      ...SEOUL,
      now: new Date(`${day}T03:00:00Z`),
    })
    const cell = await dayCell(natal, day)
    expect(cell.signals.filter((s) => s.kind === 'lifecycle')).toEqual([])
    expect(decadalCrosses(cell)).toEqual([])
    expect((await life(natal, cell, day, 1995, 'ko')).decadeCross).toEqual([])

    // 실제 첫 토성 회귀 — 2024-03-18. 그날 셀엔 회귀 신호가 마일스톤 창 그대로 있다.
    const sat = (await calculateOuterPlanetMilestones(natal)).find(
      (m) => m.kind === 'saturn_return_1'
    )!
    expect(sat.exactDateISO).toBe('2024-03-18')
    expect(sat.window.start.slice(0, 10)).toBe('2024-03-09')
    expect(sat.window.end.slice(0, 10)).toBe('2024-03-26')
    const returnDay = await dayCell(natal, sat.exactDateISO)
    const sig = returnDay.signals.find((s) => s.id === 'astro.lifecycle.saturn_return_1')
    expect(sig?.active.start).toBe(sat.window.start)
    expect(sig?.active.end).toBe(sat.window.end)
    // 乙亥 대운(21–30)의 천간 부모가 토성 매핑에 없어 10년 교차 행은 생기지 않는다.
    expect(decadalCrosses(returnDay)).toEqual([])
    expect((await life(natal, returnDay, sat.exactDateISO, 1995, 'ko')).decadeCross).toEqual([])
  }, 180_000)

  it('1990-05-15 서울, 2013-08-08: Life 겹침 = 정인 × 목성 +2 (= 그 셀의 buildDecadeCross, ko/en)', async () => {
    const day = '2013-08-08'
    const natal = await buildNatalContext({
      birthDate: '1990-05-15',
      birthTime: '06:40',
      gender: 'male',
      ...SEOUL,
      now: new Date(`${day}T03:00:00Z`),
    })
    const cell = await dayCell(natal, day)
    const ko = await life(natal, cell, day, 1990, 'ko')
    const en = await life(natal, cell, day, 1990, 'en')
    expect(ko.decadeCross).toEqual(buildDecadeCross(cell))
    expect(en.decadeCross).toEqual(ko.decadeCross)
    expect(ko.decadeCross).toEqual([
      expect.objectContaining({
        saju: '정인',
        sajuEn: 'Direct Resource',
        astro: '목성',
        astroEn: 'Jupiter',
        polarity: 2,
      }),
    ])
    expect(ko.decadeCross?.[0].meaningEn).not.toMatch(/[가-힣]/)
  }, 180_000)
})
