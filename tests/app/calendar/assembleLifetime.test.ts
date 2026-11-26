// @vitest-environment node
/**
 * assembleLifetime — /destiny 경량 어셈블러.
 *
 * 계약: ① 연 cells 없이 lifetime 을 완결(natal + 곡선 + now) ② 세운 한 줄
 * (thisYear)은 입춘 SSOT 로 ③ 대운층 사주×점성 교차(decadeCross)는 1일 evidence
 * 셀의 decadal 층만, 페어 중복 제거·상충(0) 제외 ④ 정직성 게이트(계획 B3 #8, 엔진
 * 감사 X7) — 사주 부모가 대운, 점성 부모가 10년 층 천체(행성시·시진 금지), 두 부모
 * 모두 교차와 같은 비영 부호일 때만 행이 된다.
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { calculateSajuData } from '@/lib/saju/saju'
import { buildNatalContext } from '@/lib/calendar-engine/context/build'
import { buildCalendar } from '@/lib/calendar-engine'
import { assembleLifetime, buildDecadeCross } from '@/app/calendar/assembleLifetime'
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

  it('立春 이 든 현지 날 = 캘린더 셀과 같은 새 세운 (재감사 TP-4 · G3, 오너 결정 17)', async () => {
    // 立春 2025-02-03T14:10Z = 서울 02-03 23:10 → 서울 02-03 셀부터 乙巳. 예전 Life 는
    // `${todayIso}T12:00Z`(=서울 21:00, 立春 전)로 甲辰 을 말해 캘린더 셀과 갈렸다.
    const thisYearOn = async (todayIso: string) =>
      (
        await assembleLifetime({
          natal,
          lang: 'ko',
          birthYear: 1995,
          targetYear: 2025,
          sex: '남',
          birthDisplay: '1995.2.9 06:40',
          whoBirthLine: '1995.2.9 06:40',
          place: '서울',
          now: new Date(`${todayIso}T03:00:00Z`),
          todayIso,
          focusDayCell: null,
        })
      ).lifetime.thisYear?.gz
    const cells = await buildCalendar(
      natal,
      { start: '2025-02-02T00:00:00.000Z', end: '2025-02-03T23:59:59.999Z', granularity: 'day' },
      { includeEvidence: false, enabledExtractors: ['pillar-sibsin'] }
    )
    const cellYear = (date: string) =>
      cells
        .find((c) => c.datetime.startsWith(date))!
        .signals.filter((s) => s.id.startsWith('saju.pillar-sibsin.') && s.layer === 'yearly')
        .map((s) => s.name.split(' ')[0])
    expect(await thisYearOn('2025-02-02')).toBe('甲辰')
    expect(cellYear('2025-02-02')).toEqual(['甲辰'])
    expect(await thisYearOn('2025-02-03')).toBe('乙巳')
    expect(cellYear('2025-02-03')).toEqual(['乙巳'])
  }, 60000)

  // 이 파일은 전역 swisseph 모의(0.1°/일 톱니) 위에서 돈다 — 모의는 가짜 회귀 군집을 만들어
  // 어떤 10년 교차가 '그날 있다'는 값은 모의의 산물이다(G6 지적). 그래서 여기선 모의와 무관한
  // 불변식만 본다: 행은 그 셀의 decadal 교차에서만, 같은 페어·같은 비영 부호로, 중복 없이,
  // 최대 4행. 상충 0 교차는 행이 되지 않는다. 실제 하늘의 값(이 표본은 2026-07-06 에 10년 교차
  // 없음·Life 빈 상태, 1990-05-15 2013-08-08 정인 × 목성 +2)은 assembleLifetime.real.node.test.ts.
  it('대운 교차(decadeCross) — decadal 층만, 페어 중복 없음, polarity≠0 (모의 무관 불변식)', async () => {
    const { lifetime } = await run()
    const dc = lifetime.decadeCross ?? []
    const decadal = (focus?.signals ?? []).filter(
      (s) => s.kind === 'cross-activation' && s.layer === 'decadal'
    )
    const pairOf = (r: { saju: string; astro: string }) => `${r.saju} × ${r.astro}`
    for (const r of dc) {
      expect(r.polarity).not.toBe(0)
      expect(
        decadal.some((s) => s.name.startsWith(pairOf(r)) && s.polarity === r.polarity),
        pairOf(r)
      ).toBe(true)
    }
    expect(new Set(dc.map(pairOf)).size).toBe(dc.length)
    expect(dc.length).toBeLessThanOrEqual(4)
    for (const s of decadal.filter((x) => x.polarity === 0)) {
      expect(dc.some((r) => s.name.startsWith(pairOf(r)))).toBe(false)
    }
  }, 60000)

  it('focusDayCell 의 결과는 같은 셀의 buildDecadeCross 와 같다(게이트 한 곳)', async () => {
    const { lifetime } = await run()
    expect(lifetime.decadeCross).toEqual(buildDecadeCross(focus))
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

// ── 정직성 게이트(계획 B3 #8, 엔진 감사 X7) — 합성 셀로 부모 조건을 하나씩 ──
type Sig = CalendarCell['signals'][number]
const WIN = {
  start: '2026-07-06T00:00:00Z',
  peak: '2026-07-06T12:00:00Z',
  end: '2026-07-06T23:59:59Z',
}

/** 사주 부모 — 대운(decadal saju-pillar)·월운(monthly)·시진(hourly saju-hour). */
function sajuParent(
  id: string,
  layer: Sig['layer'],
  polarity: number,
  module = 'saju-pillar',
  sibsin = '정재'
): Sig {
  return {
    id,
    source: 'saju',
    kind: 'pillar-sibsin',
    name: `${id} (${sibsin})`,
    polarity,
    layer,
    active: WIN,
    weight: 1,
    evidence: { module, sibsin },
  } as Sig
}

/** 점성 부모 — 라이프사이클(decadal)·행성시(planetary-hour). */
function astroParent(
  id: string,
  layer: Sig['layer'],
  polarity: number,
  kind = 'lifecycle',
  planet = 'Saturn'
): Sig {
  return {
    id,
    source: 'astro',
    kind,
    name: id,
    polarity,
    layer,
    active: WIN,
    weight: 1,
    evidence: { module: `astro-${kind}`, planets: [planet] },
  } as Sig
}

function crossOf(
  saju: string,
  astro: string,
  layer: Sig['layer'],
  polarity: number,
  parentIds: string[] | undefined,
  keys = { sajuKey: '정재', astroKey: 'Saturn' }
): Sig {
  const name = `${keys.sajuKey} × ${keys.astroKey === 'Saturn' ? '토성' : '목성'}`
  return {
    id: `cross.${saju}.${astro}.${layer}.${polarity}`,
    source: 'saju',
    kind: 'cross-activation',
    name,
    korean: `${name} — 본문 ${polarity}`,
    english: `${keys.sajuKey} × ${keys.astroKey} — body ${polarity}`,
    polarity,
    layer,
    active: WIN,
    weight: 0.5,
    evidence: {
      module: 'cross-activation',
      detail: { ...keys, ...(parentIds ? { parentIds } : {}) },
    },
  } as Sig
}

const cellWith = (signals: Sig[]): CalendarCell =>
  ({ datetime: '2026-07-06T00:00:00.000Z', signals }) as unknown as CalendarCell

describe('buildDecadeCross — 정직성 게이트', () => {
  const DAEUN_P = sajuParent('saju.pillar-sibsin.daeun-stem.2020.甲', 'decadal', 1)
  const DAEUN_N = sajuParent('saju.pillar-sibsin.daeun-branch.2025.戌', 'decadal', -1)
  const DAEUN_0 = sajuParent('saju.pillar-sibsin.daeun-stem.2010.乙', 'decadal', 0)
  const WOLUN_N = sajuParent('saju.pillar-sibsin.wolun.2026-07.己亥', 'monthly', -2)
  const HOUR_P = sajuParent('saju.hour.2026-07-06.酉', 'hourly', 1, 'saju-hour')
  const SAT_P = astroParent('astro.lifecycle.saturn_return_1', 'decadal', 1)
  const SAT_N = astroParent('astro.lifecycle.saturn_return_2', 'decadal', -1)
  const SAT_HOUR = astroParent('astro.planetary-hour.Saturn.H05', 'hourly', 1, 'planetary-hour')
  const parents = [DAEUN_P, DAEUN_N, DAEUN_0, WOLUN_N, HOUR_P, SAT_P, SAT_N, SAT_HOUR]
  const run = (...crosses: Sig[]) => buildDecadeCross(cellWith([...parents, ...crosses]))
  const rows = (...crosses: Sig[]) =>
    run(...crosses).map((c) => `${c.saju}|${c.astro}|${c.polarity}`)

  it('(a) 월운 부모의 decadal 태그 교차는 제외 — 정관 × 토성 ← 己亥 월운 −2 같은 행', () => {
    expect(rows(crossOf('wolun', 'sat', 'decadal', -1, [WOLUN_N.id, SAT_N.id]))).toEqual([])
  })

  it('(b) +1 교차인데 부모가 −/− 면 제외', () => {
    expect(rows(crossOf('daeun', 'sat', 'decadal', 1, [DAEUN_N.id, SAT_N.id]))).toEqual([])
  })

  it('(c) 대운 + × 10년 층 천체 + 의 decadal +2 교차는 남는다', () => {
    const dc = run(crossOf('daeun', 'sat', 'decadal', 2, [DAEUN_P.id, SAT_P.id]))
    expect(dc.map((c) => `${c.saju}|${c.astro}|${c.polarity}`)).toEqual(['정재|토성|2'])
    expect(dc[0].sajuEn).toBeTruthy()
    expect(dc[0].astroEn).toBe('Saturn')
    // 페어 머리("정재 × 토성 —")는 stripCrossPair 로 제거돼 본문만 남는다.
    expect(dc[0].meaning).toBe('본문 2')
    expect(dc[0].meaningEn).toBe('body 2')
  })

  it('−/− 부모의 −1 교차도 같은 방향이라 남는다', () => {
    expect(rows(crossOf('daeun', 'sat', 'decadal', -1, [DAEUN_N.id, SAT_N.id]))).toEqual([
      '정재|토성|-1',
    ])
  })

  it('한쪽 부모가 0 이면 제외 — 대운 극성 0 × 토성 + (계획 B3 표본의 정재 × 토성)', () => {
    expect(rows(crossOf('daeun0', 'sat', 'decadal', 1, [DAEUN_0.id, SAT_P.id]))).toEqual([])
  })

  it('시진(hourly) 사주 부모나 행성시 점성 부모는 제외(엔진 감사 X7·X5)', () => {
    expect(rows(crossOf('hour', 'sat', 'decadal', 1, [HOUR_P.id, SAT_P.id]))).toEqual([])
    expect(rows(crossOf('daeun', 'phour', 'decadal', 1, [DAEUN_P.id, SAT_HOUR.id]))).toEqual([])
  })

  it('decadal 층이 아니거나 polarity 0 이면 제외', () => {
    expect(rows(crossOf('daeun', 'sat', 'yearly', 1, [DAEUN_P.id, SAT_P.id]))).toEqual([])
    expect(rows(crossOf('daeun', 'sat', 'decadal', 0, [DAEUN_P.id, SAT_P.id]))).toEqual([])
  })

  it('부모를 셀에서 찾지 못하면(evidence 없는 셀) 근거 불명이라 제외 — fail-closed', () => {
    expect(rows(crossOf('none', 'sat', 'decadal', 1, undefined))).toEqual([])
    expect(rows(crossOf('gone', 'sat', 'decadal', 1, ['saju.missing', SAT_P.id]))).toEqual([])
  })

  it('같은 페어는 가장 센 |polarity| 1개, 최대 4행·센 순', () => {
    const JUP_P = astroParent(
      'astro.lifecycle.jupiter_return_3',
      'decadal',
      1,
      'lifecycle',
      'Jupiter'
    )
    const dc = buildDecadeCross(
      cellWith([
        ...parents,
        JUP_P,
        crossOf('daeun', 'sat', 'decadal', 1, [DAEUN_P.id, SAT_P.id]),
        crossOf('daeun', 'sat2', 'decadal', 2, [DAEUN_P.id, SAT_P.id]),
        crossOf('daeun', 'jup', 'decadal', 1, [DAEUN_P.id, JUP_P.id], {
          sajuKey: '정인',
          astroKey: 'Jupiter',
        }),
      ])
    )
    expect(dc.map((c) => `${c.saju}|${c.astro}|${c.polarity}`)).toEqual([
      '정재|토성|2',
      '정인|목성|1',
    ])
  })

  it('셀 없으면 빈 배열', () => {
    expect(buildDecadeCross(null)).toEqual([])
  })
})
