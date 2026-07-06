// @vitest-environment node
/**
 * assembleLifetime — /destiny 경량 어셈블러.
 *
 * 계약: ① 연 cells 없이 lifetime 을 완결(natal + 곡선 + now) ② 세운 한 줄
 * (thisYear)은 입춘 SSOT 로 ③ 대운층 사주×점성 교차(decadeCross)는 1일 evidence
 * 셀의 decadal 층만, 페어 중복 제거·상충(0) 제외.
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { calculateSajuData } from '@/lib/saju/saju'
import { buildNatalContext } from '@/lib/calendar-engine/context/build'
import { buildCalendar } from '@/lib/calendar-engine'
import { assembleLifetime } from '@/app/calendar/assembleLifetime'
import type { NatalContext } from '@/lib/calendar-engine/context/types'
import type { CalendarCell } from '@/lib/calendar-engine/types'

const BIRTH = {
  birthDate: '1995-02-09',
  birthTime: '06:40',
  gender: 'male' as const,
  latitude: 37.5665,
  longitude: 126.978,
  timeZone: 'Asia/Seoul',
}
const NOW = new Date('2026-07-06T03:00:00Z')

let natal: NatalContext
let focus: CalendarCell | null

beforeAll(async () => {
  const saju = calculateSajuData(
    BIRTH.birthDate,
    BIRTH.birthTime,
    BIRTH.gender,
    'solar',
    BIRTH.timeZone
  )
  natal = await buildNatalContext(BIRTH, { saju })
  const cells = await buildCalendar(
    natal,
    { start: '2026-07-06T00:00:00.000Z', end: '2026-07-06T23:59:59.999Z', granularity: 'day' },
    { includeEvidence: true }
  )
  focus = cells[0] ?? null
}, 60000)

async function run() {
  return assembleLifetime({
    natal,
    lang: 'ko',
    birthYear: 1995,
    targetYear: 2026,
    sex: '남',
    birthDisplay: '1995.2.9 06:40',
    whoBirthLine: '1995.2.9 06:40',
    place: '서울',
    now: NOW,
    todayIso: '2026-07-06',
    focusDayCell: focus,
  })
}

describe('assembleLifetime', () => {
  it('연 cells 없이 lifetime 핵심을 완결한다', async () => {
    const { lifetime, user, topbar } = await run()
    expect(lifetime.daewoon.length).toBeGreaterThan(0)
    expect(lifetime.lifePattern?.ko).toBeTruthy()
    expect(lifetime.lifeCurve?.points.length).toBeGreaterThan(10)
    expect(topbar.ilganHanja).toBe('辛')
    expect(user.ilgan.hanja).toBe('辛')
  }, 60000)

  it('세운 한 줄(thisYear) — 2026 = 丙午, 辛일간 기준 정관', async () => {
    const { lifetime } = await run()
    expect(lifetime.thisYear?.gz).toBe('丙午')
    expect(lifetime.thisYear?.sibsin).toBe('정관')
    expect(lifetime.thisYear?.area.length).toBeGreaterThan(0)
    expect(lifetime.thisYear?.areaEn.length).toBeGreaterThan(0)
  }, 60000)

  it('세운 입춘 경계 SSOT — 1/1~입춘 구간은 활성 사주년(그레고리 근사 아님)', async () => {
    // 2024 입춘 ≈ 2/4. 2024-01-15 는 아직 사주년 2023(癸卯) — 그레고리 근사 甲辰 아님.
    // (assembleTiers 에서 이관: 세운 SSOT 는 이제 thisYear 가 담당.)
    const { lifetime } = await assembleLifetime({
      natal,
      lang: 'ko',
      birthYear: 1995,
      targetYear: 2024,
      sex: '남',
      birthDisplay: '1995.2.9 06:40',
      whoBirthLine: '1995.2.9 06:40',
      place: '서울',
      now: new Date('2024-01-15T12:00:00Z'),
      todayIso: '2024-01-15',
      focusDayCell: null,
    })
    expect(lifetime.thisYear?.gz).toBe('癸卯')
  }, 60000)

  it('대운 교차(decadeCross) — decadal 층만, 페어 중복 없음, polarity≠0', async () => {
    const { lifetime } = await run()
    const dc = lifetime.decadeCross ?? []
    expect(dc.length).toBeGreaterThan(0)
    // 페어 중복 없음.
    const keys = dc.map((c) => `${c.saju}|${c.astro}`)
    expect(new Set(keys).size).toBe(keys.length)
    // 상충 무력화(0)는 제외 — 방향 있는 교차만.
    for (const c of dc) {
      expect(c.polarity).not.toBe(0)
      expect(c.meaning.length).toBeGreaterThan(0)
      // 페어 머리("정재 × 토성 —")는 stripCrossPair 로 제거돼 본문만 남는다.
      expect(c.meaning.includes('×')).toBe(false)
    }
    // 甲戌 정재 대운이라 정재×토성 교차가 포함된다(실측).
    expect(dc.some((c) => c.saju === '정재')).toBe(true)
  }, 60000)

  it('focusDayCell 없으면 decadeCross 는 빈 배열(연 셀 빌드 안 함)', async () => {
    const { lifetime } = await assembleLifetime({
      natal,
      lang: 'ko',
      birthYear: 1995,
      targetYear: 2026,
      sex: '남',
      birthDisplay: '1995.2.9 06:40',
      whoBirthLine: '1995.2.9 06:40',
      place: '서울',
      now: NOW,
      todayIso: '2026-07-06',
      focusDayCell: null,
    })
    expect(lifetime.decadeCross).toEqual([])
    // 세운은 셀 무관이라 여전히 채워진다.
    expect(lifetime.thisYear?.gz).toBe('丙午')
  }, 60000)
})
