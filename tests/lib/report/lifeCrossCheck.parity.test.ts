/**
 * 인생 흐름의 '사주 × 별자리, 축별로' = 통합 리포트의 교차 판정 (A4).
 *
 * /destiny 는 캘린더 본명 컨텍스트(buildNatalContext)를, 리포트는 buildReportContext 를 쓴다.
 * toCrossContext 가 리포트에만 있는 칸(성별 · 12운성 · 통근 · 공망 · 조후 · 관살혼잡 ·
 * placeUnreliable · 하우스 가림)을 읽는 시점에 채우면, 같은 판정 함수(buildCrossRows)가 두
 * 컨텍스트에서 깊은 비교로 같은 행을 내야 한다 — 행 · 톤 · 문구 · 집계 전부.
 *
 *  - 샘플 1997-03-21 14:30 여 서울, now 2026-11-19 (홈 사주 카드 · Life 샘플)
 *  - 1992-03-15 09:20 여 서울 (리포트 실데이터 고정 차트)
 *  - 시간 미상 1990-07-04 여 서울 (삼주 · ASC 없음)
 *  - 출생지 미상 1988-11-02 08:10 남 (서울 기준점 · ASC 없음)
 *
 * 실제 Swiss Ephemeris(node 환경). native swisseph 가 없으면 로컬에선 skip, CI 에선 실패한다.
 *
 * @vitest-environment node
 */
import { it, expect, vi } from 'vitest'

vi.unmock('swisseph')
vi.unmock('@/lib/astrology/foundation/ephe')

const { describeRealEphemeris } = await import('../../helpers/realEphemeris')
const { buildNatalContext } = await import('@/lib/calendar-engine/context/build')
const { buildReportContext } = await import('@/lib/report/buildReportContext')
const { buildCrossRows } = await import('@/lib/report/integratedAdapter')
const { tallyCrossRows } = await import('@/lib/report/natalCross')
const { toCrossContext, buildLifeCrossCheck, reportBirthQuery } =
  await import('@/lib/report/lifeCrossCheck')
const { resolveBirthTimeAnchor } = await import('@/lib/saju/birthTimeAnchor')

const NOW = new Date('2026-11-19T03:00:00Z')
const SEOUL = { latitude: 37.5665, longitude: 126.978, timeZone: 'Asia/Seoul' }

interface Case {
  name: string
  birthDate: string
  /** 쿼리 time — 미상이면 undefined(리포트 페이지와 같은 앵커 규칙). */
  time?: string
  gender: 'male' | 'female'
  cityUnknown?: boolean
}

const CASES: Case[] = [
  { name: 'sample 1997-03-21 14:30 F', birthDate: '1997-03-21', time: '14:30', gender: 'female' },
  { name: '1992-03-15 09:20 F', birthDate: '1992-03-15', time: '09:20', gender: 'female' },
  { name: 'time unknown 1990-07-04 F', birthDate: '1990-07-04', gender: 'female' },
  {
    name: 'city unknown 1988-11-02 08:10 M',
    birthDate: '1988-11-02',
    time: '08:10',
    gender: 'male',
    cityUnknown: true,
  },
]

/** 리포트 페이지(src/app/(main)/integrated-report/page.tsx)와 같은 ctx 조립. */
async function reportSide(c: Case) {
  const { time, timeUnknown } = resolveBirthTimeAnchor(c.time, c.time ? false : true)
  const ctx = (await buildReportContext({
    birthDate: c.birthDate,
    birthTime: time,
    gender: c.gender,
    ...SEOUL,
    birthTimeUnknown: timeUnknown,
    birthCityUnknown: c.cityUnknown === true,
    now: NOW,
  })) as unknown as Record<string, unknown>
  ctx.input = {
    ...(ctx.input as object),
    birthTimeUnknown: timeUnknown,
    birthCityUnknown: c.cityUnknown === true,
    gender: c.gender,
    timeZone: SEOUL.timeZone,
  }
  return ctx
}

/** /destiny(loadLifetimeData)와 같은 본명 — 로더의 가드 값으로 buildNatalContext. */
async function lifeSide(c: Case) {
  const { time, timeUnknown } = resolveBirthTimeAnchor(c.time, c.time ? false : true)
  const natal = await buildNatalContext({
    birthDate: c.birthDate,
    birthTime: time,
    gender: c.gender,
    ...SEOUL,
    birthTimeUnknown: timeUnknown,
    birthCityUnknown: c.cityUnknown === true,
    now: NOW,
  })
  return { natal, timeUnknown, time }
}

describeRealEphemeris('lifeCrossCheck — Life 의 축별 교차 = 리포트 교차 (real ephemeris)', () => {
  for (const c of CASES) {
    it(`${c.name}: buildCrossRows(toCrossContext(natal)) = buildCrossRows(reportContext) · ko/en · 집계`, async () => {
      const report = await reportSide(c)
      const { natal, timeUnknown } = await lifeSide(c)
      const ctx = toCrossContext(natal, {
        gender: c.gender,
        timeUnknown,
        cityUnknown: c.cityUnknown === true,
        now: NOW,
      })
      for (const lang of ['en', 'ko'] as const) {
        const life = buildCrossRows(ctx, lang, NOW)
        const rep = buildCrossRows(report, lang, NOW)
        expect(life.rows, `${c.name} ${lang} rows`).toEqual(rep.rows)
        expect(life.synthesis, `${c.name} ${lang} synthesis`).toBe(rep.synthesis)
      }
      const check = buildLifeCrossCheck(natal, {
        gender: c.gender,
        timeUnknown,
        cityUnknown: c.cityUnknown === true,
        now: NOW,
        lang: 'en',
      })
      const repRows = buildCrossRows(report, 'en', NOW).rows
      expect(check.tally).toEqual(tallyCrossRows(repRows))
      expect(check.reportTraitCount).toBe(repRows.length)
      // 다섯 축 행 = 리포트의 같은 축 행(톤 · 축 이름).
      for (const r of check.rows.en) {
        const rep = repRows.find((x) => x.key === r.key)
        expect(rep, r.key).toBeTruthy()
        expect(r.verdict).toBe(rep!.tone)
        expect(r.axis).toBe(rep!.category)
      }
    }, 120000)
  }

  it('샘플: 다섯 축 · 칸 · 요지 · 보조 줄 · 집계 7·6·3·0(16) · 리포트 링크', async () => {
    const c = CASES[0]
    const { natal, timeUnknown, time } = await lifeSide(c)
    const check = buildLifeCrossCheck(natal, {
      gender: 'female',
      timeUnknown,
      cityUnknown: false,
      now: NOW,
      lang: 'en',
      birth: {
        birthDate: c.birthDate,
        birthTime: time,
        timeUnknown,
        cityUnknown: false,
        ...SEOUL,
        gender: 'female',
        place: 'Seoul',
      },
    })
    expect(check.rows.en.map((r) => `${r.key}:${r.verdict}`)).toEqual([
      'identity:tension',
      'temperament:complement',
      'relations:resonant',
      'fortune:resonant',
      'needs:tension',
    ])
    const [identity, temperament, relations, fortune, needs] = check.rows.en
    expect(identity.saju).toEqual({ text: 'Water', w: 'fluid and permeating' })
    expect(identity.stars).toEqual({ text: 'Fire', w: 'expressive and fiery' })
    expect(identity.sajuSub).toEqual({ dayMaster: '壬' })
    // 태양 + 상승(달은 욕망 행으로).
    expect(identity.starsSub).toEqual([
      { body: 'Sun', sign: 'Aries', deg: 0, min: 38 },
      { body: 'Ascendant', sign: 'Leo', deg: 10, min: 2 },
    ])
    expect(needs.starsSub).toEqual([{ body: 'Moon', sign: 'Leo', deg: 28, min: 17 }])
    expect(temperament.starsSub).toBeUndefined()
    // 칸이 없는 축은 엔진의 한 문장 요지.
    expect(relations.saju).toBeUndefined()
    expect(relations.gist).toBe('Unions in your saju, soft aspects in your chart.')
    expect(fortune.gist).toMatch(/favored on both sides\.$/)
    // ko 행도 같은 축 · 같은 판정, 한글 문구.
    expect(check.rows.ko.map((r) => r.verdict)).toEqual(check.rows.en.map((r) => r.verdict))
    expect(check.rows.ko[2].gist).toBe('사주엔 합(合), 별자리엔 부드러운 각.')
    expect(check.tally).toEqual({ same: 7, supportive: 6, twoPulls: 3, unrelated: 0, total: 16 })
    expect(check.fullReportHref).toBe(
      '/integrated-report?lang=en&date=1997-03-21&time=14%3A30&tu=0&lat=37.5665&lng=126.978&tz=Asia%2FSeoul&gender=female&place=Seoul'
    )
  }, 120000)

  it('시간 미상: 상승궁 없음(태양만) · 리포트 링크에 time 없이 tu=1', async () => {
    const c = CASES[2]
    const { natal, timeUnknown } = await lifeSide(c)
    expect(timeUnknown).toBe(true)
    const check = buildLifeCrossCheck(natal, {
      gender: 'female',
      timeUnknown,
      cityUnknown: false,
      now: NOW,
      lang: 'ko',
    })
    const identity = check.rows.en.find((r) => r.key === 'identity')
    expect(identity?.starsSub?.map((p) => p.body)).toEqual(['Sun'])
    expect(check.fullReportHref).toContain('tu=1')
    expect(check.fullReportHref).not.toContain('time=')
    expect(check.fullReportHref).toContain('lang=ko')
  }, 120000)

  it('출생지 미상: 상승궁 없음 · 리포트 링크에 좌표 없음', async () => {
    const c = CASES[3]
    const { natal, timeUnknown } = await lifeSide(c)
    const check = buildLifeCrossCheck(natal, {
      gender: 'male',
      timeUnknown,
      cityUnknown: true,
      now: NOW,
      lang: 'en',
    })
    const identity = check.rows.en.find((r) => r.key === 'identity')
    expect(identity?.starsSub?.some((p) => p.body === 'Ascendant')).toBe(false)
    expect(check.fullReportHref).not.toMatch(/[?&]lat=/)
    expect(check.fullReportHref).toContain('time=08%3A10')
  }, 120000)
})

it('reportBirthQuery — buildReportBirthQuery 와 같은 규약(이름 제외)', () => {
  const q = reportBirthQuery(
    {
      birthDate: '1995-02-09',
      birthTime: '00:00',
      timeUnknown: false,
      cityUnknown: false,
      latitude: 40.7,
      longitude: -74,
      timeZone: 'America/New_York',
      gender: 'male',
    },
    'en'
  )
  expect(q).toBe(
    'lang=en&date=1995-02-09&time=00%3A00&tu=0&lat=40.7&lng=-74&tz=America%2FNew_York&gender=male'
  )
})
