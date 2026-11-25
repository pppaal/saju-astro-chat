/**
 * 통합 리포트 실데이터 파이프라인 — 진짜 천체력 위의 값 고정 (destiny release gate).
 *
 * 예전 이 파일은 전역 swisseph 목(모든 차트의 태양이 같은 자리) 위에서 "값이 있다·몇 개
 * 이상이다"만 봤다 — 기둥이나 교차 톤이 틀려도 개수만 맞으면 통과했다(엔진 감사 F11).
 * 이제 node 환경에서 swisseph 목을 풀고, 운영 페이지와 같은 경로(buildReportContext →
 * natalToReportData / buildCrossRows)로 정확한 값을 고정한다:
 *
 *  1. 1992-03-15 09:20 여 서울 — 명식·오행·행성 자리·ASC/MC·교차 18행 톤.
 *  2. 기준 차트 R01·R06·R11·R13·R16·R17 — 교차 행 톤 전부(F11, stage E16). E1–E14·F1–F3
 *     이후 엔진으로 계산하고 평가기 규칙에 대조해 검토했다. 오행 족 다섯 행(정체성·욕망·
 *     공망/카르마·성장 방향·음양 리듬)은 아래 '규칙 대조' 테스트가 독립 입력(골든 명식,
 *     astronomy-engine 태양·달·진교점·섹트)으로 다시 계산해 같은 톤인지 본다.
 *
 * 기준 시각 NOW 는 고정(미성년 판정·대운이 시계에 새지 않게). native swisseph 가 없으면
 * 로컬에선 skip, CI·release gate 에선 실패한다(tests/helpers/realEphemeris.ts).
 *
 * @vitest-environment node
 */
import { it, expect, vi } from 'vitest'
import * as Astronomy from 'astronomy-engine'
import golden from '../../golden/engine-golden.json'

vi.unmock('swisseph')
vi.unmock('@/lib/astrology/foundation/ephe')

const { describeRealEphemeris } = await import('../../helpers/realEphemeris')
const { buildNatalContext } = await import('@/lib/calendar-engine/context/build')
const { buildReportContext } = await import('@/lib/report/buildReportContext')
const { getTwelveStagesForPillars } = await import('@/lib/saju/shinsal')
const { natalToReportData, buildCrossRows } = await import('@/lib/report/integratedAdapter')

const NOW = new Date('2026-11-24T03:00:00Z')

type Birth = {
  date: string
  time: string
  tz: string
  lat: number
  lon: number
  gender: 'male' | 'female'
}
type Row = { key?: string; tone: string; karmaAxis?: boolean }
type Pillar = { heavenlyStem: { name: string }; earthlyBranch: { name: string } }
type Planet = { name?: string; sign?: string; longitude?: number }

/** 운영 페이지(src/app/(main)/integrated-report/page.tsx)와 같은 ctx 조립. */
async function reportCtx(b: Birth) {
  const ctx = (await buildReportContext({
    birthDate: b.date,
    birthTime: b.time,
    gender: b.gender,
    latitude: b.lat,
    longitude: b.lon,
    timeZone: b.tz,
  })) as unknown as Record<string, any>
  ctx.input = { ...ctx.input, gender: b.gender, timeZone: b.tz, name: '내담자', isoUTC: '' }
  return ctx
}

/** 행 → 'key=tone' (karmaAxis 행은 '(k)' 꼬리). 실패 diff 를 읽기 쉽게. */
const fmtRows = (rows: Row[]) => rows.map((r) => `${r.key}=${r.tone}${r.karmaAxis ? '(k)' : ''}`)

const gz = (p: Pillar | undefined) => (p ? p.heavenlyStem.name + p.earthlyBranch.name : '--')

// ─────────────────────────────────────────────────────────────────────────────
// 1. 1992-03-15 09:20 여 서울 — 리포트 데이터 + 교차
// ─────────────────────────────────────────────────────────────────────────────
describeRealEphemeris('통합 리포트 — 실데이터 파이프라인 (real ephemeris)', () => {
  const B1992: Birth = {
    date: '1992-03-15',
    time: '09:20',
    tz: 'Asia/Seoul',
    lat: 37.5665,
    lon: 126.978,
    gender: 'female',
  }

  it('1992-03-15 09:20 여 서울 — 명식·행성·앵글·교차 톤 고정', async () => {
    const ctx = await reportCtx(B1992)
    const rd = natalToReportData(ctx, 'ko', NOW)
    const cross = buildCrossRows(ctx, 'ko', NOW)

    // 명식: 1992 壬申년, 경칩(3/5) 뒤 癸卯월, 일주 庚寅(JDN, 2000-01-01 = 戊午 기준),
    // 시주 = 평균태양시 08:48 → 辰시, 乙庚日 → 庚辰.
    const P = rd.saju.pillars
    expect((['year', 'month', 'day', 'hour'] as const).map((k) => P[k].stem + P[k].branch)).toEqual(
      ['壬申', '癸卯', '庚寅', '庚辰']
    )
    expect(rd.saju.dayMaster).toBe('庚')
    expect(rd.saju.fiveElements).toEqual({ wood: 2, fire: 0, earth: 1, metal: 3, water: 2 })

    // 행성 자리(사인 약어·하우스) — 진짜 천체력. 목 위에선 전부 같은 사인이었다.
    expect(rd.astro.planets.map((p) => `${p.name} ${p.sign} ${p.house}`)).toEqual([
      'Sun Pis 11',
      'Moon Leo 4',
      'Mercury Ari 12',
      'Venus Pis 11',
      'Mars Aqu 10',
      'Jupiter Vir 5',
      'Saturn Aqu 10',
      'Uranus Cap 9',
      'Neptune Cap 9',
      'Pluto Sco 7',
      'True Node Cap 8',
    ])
    expect(rd.astro.planets.every((p) => !!p.glyph)).toBe(true)
    expect(rd.astro.ascendant.sign).toBe('Taurus')
    expect(rd.astro.ascendant.lon).toBeCloseTo(51.955, 2)
    expect(rd.astro.mc.sign).toBe('Aquarius')
    expect(rd.astro.mc.lon).toBeCloseTo(302.562, 2)
    expect(rd.astro.houses).toHaveLength(12)

    expect(fmtRows(cross.rows)).toEqual([
      'identity=complement',
      'needs=tension',
      'socialRole=complement',
      'fortune=complement',
      'relations=complement',
      'strength=complement',
      'temperament=complement',
      'energy=resonant',
      'drive=neutral',
      'keyTrait=complement',
      'romance=resonant',
      'expression=resonant',
      'movement=resonant',
      'spirit=complement',
      'wealth=resonant',
      'karma=neutral(k)',
      'growth=complement(k)',
      'yinYang=resonant',
    ])
    expect(cross.synthesis).toBeTruthy()
  })

  it('placeUnreliable: _chart 폴백 ASC/MC/하우스가 리포트로 새지 않는다 (ENGINE-AUDIT B)', async () => {
    const ctx = (await buildNatalContext({
      birthDate: B1992.date,
      birthTime: B1992.time,
      gender: B1992.gender,
      latitude: B1992.lat,
      longitude: B1992.lon,
      timeZone: B1992.tz,
    })) as unknown as Record<string, unknown>
    const saju = ctx.saju as Record<string, unknown>
    saju.twelveStages = getTwelveStagesForPillars(saju.pillars as never)
    ;(ctx as Record<string, unknown>).input = {
      ...(ctx.input as object),
      gender: 'female',
      timeZone: 'Asia/Seoul',
    }
    // 출생시각/출생지 미상 시뮬레이션: _chart 에는 폴백 각/하우스가 차 있어도 가려야 한다.
    ;(ctx.astro as Record<string, unknown>).placeUnreliable = true

    const rd = natalToReportData(ctx, 'ko', NOW)
    const cross = buildCrossRows(ctx, 'ko', NOW)

    // ASC/MC/하우스는 전부 비워짐 (가짜 폴백 비노출)
    expect(rd.astro.ascendant.sign).toBeNull()
    expect(rd.astro.ascendant.lon).toBeNull()
    expect(rd.astro.mc.sign).toBeNull()
    expect(rd.astro.houses).toEqual([])
    // 행성 sign 은 유지되지만 house 는 전부 0(UNKNOWN)
    expect(rd.astro.planets).toHaveLength(11)
    expect(rd.astro.planets.every((p) => p.house === 0)).toBe(true)
    // MC 의존 사회역할 행은 생략됨
    expect(cross.rows.some((r) => r.key === 'socialRole')).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 2. 기준 차트 교차 행 톤 (F11, stage E16)
// ─────────────────────────────────────────────────────────────────────────────
type RefChart = {
  id: string
  /** 같은 출생의 사주 골든(tests/golden/engine-golden.json saju.cases). */
  sajuGolden: string
  birth: Birth
  /** 고정 입력 — 실패 시 어느 입력이 움직였는지 바로 보이게. */
  inputs: {
    pillars: string
    sun: string
    moon: string
    northNode: string
    yongsin: string
    strength: 'strong' | 'medium' | 'weak'
    sect: 'day' | 'night'
    gongmang: string
  }
  rows: string[]
}

const SEOUL = { tz: 'Asia/Seoul', lat: 37.5665, lon: 126.978 }
const REF: RefChart[] = [
  {
    id: 'R01',
    sajuGolden: 'G02',
    birth: { date: '1990-05-15', time: '10:30', ...SEOUL, gender: 'male' },
    inputs: {
      pillars: '庚午 辛巳 庚辰 辛巳',
      sun: 'Taurus',
      moon: 'Capricorn',
      northNode: 'Aquarius',
      yongsin: '수',
      strength: 'medium',
      sect: 'day',
      gongmang: '申酉',
    },
    rows: [
      'identity=complement',
      'needs=tension',
      'socialRole=resonant',
      'relations=complement',
      'strength=complement',
      'temperament=complement',
      'energy=resonant',
      'drive=neutral',
      'keyTrait=complement',
      'romance=complement',
      'expression=complement',
      'movement=complement',
      'spirit=resonant',
      'wealth=complement',
      'karma=neutral(k)',
      'growth=resonant(k)',
      'yinYang=resonant',
    ],
  },
  {
    id: 'R06',
    sajuGolden: 'G08',
    birth: { date: '1991-01-01', time: '00:01', ...SEOUL, gender: 'male' },
    inputs: {
      pillars: '庚午 戊子 辛未 戊子',
      sun: 'Capricorn',
      moon: 'Cancer',
      northNode: 'Capricorn',
      yongsin: '토',
      strength: 'medium',
      sect: 'night',
      gongmang: '戌亥',
    },
    rows: [
      'identity=complement',
      'needs=tension',
      'socialRole=complement',
      'fortune=resonant',
      'relations=complement',
      'strength=complement',
      'temperament=resonant',
      'energy=resonant',
      'drive=neutral',
      'keyTrait=complement',
      'romance=resonant',
      'expression=resonant',
      'movement=complement',
      'spirit=resonant',
      'wealth=complement',
      'karma=resonant(k)',
      'growth=tension(k)',
      'yinYang=resonant',
    ],
  },
  {
    id: 'R11',
    sajuGolden: 'G14',
    birth: {
      date: '1990-06-15',
      time: '14:30',
      tz: 'America/Los_Angeles',
      lat: 34.0522,
      lon: -118.2437,
      gender: 'male',
    },
    inputs: {
      pillars: '庚午 壬午 辛亥 乙未',
      sun: 'Gemini',
      moon: 'Pisces',
      northNode: 'Aquarius',
      yongsin: '수',
      strength: 'weak',
      sect: 'day',
      gongmang: '寅卯',
    },
    rows: [
      'identity=tension',
      'needs=resonant',
      'socialRole=tension',
      'relations=resonant',
      'strength=complement',
      'temperament=complement',
      'energy=resonant',
      'drive=tension',
      'keyTrait=complement',
      'romance=complement',
      'expression=resonant',
      'movement=complement',
      'spirit=complement',
      'wealth=complement',
      'karma=neutral(k)',
      'growth=resonant(k)',
      'yinYang=complement',
    ],
  },
  {
    id: 'R13',
    sajuGolden: 'G16',
    birth: {
      date: '1980-12-21',
      time: '12:00',
      tz: 'Australia/Sydney',
      lat: -33.8688,
      lon: 151.2093,
      gender: 'female',
    },
    inputs: {
      pillars: '庚申 戊子 戊辰 戊午',
      sun: 'Sagittarius',
      moon: 'Gemini',
      northNode: 'Leo',
      yongsin: '화',
      strength: 'medium',
      sect: 'day',
      gongmang: '戌亥',
    },
    rows: [
      'identity=complement',
      'needs=complement',
      'socialRole=complement',
      'fortune=tension',
      'relations=complement',
      'strength=resonant',
      'temperament=complement',
      'energy=resonant',
      'drive=neutral',
      'keyTrait=complement',
      'romance=resonant',
      'expression=resonant',
      'movement=complement',
      'spirit=resonant',
      'wealth=complement',
      'karma=neutral(k)',
      'growth=complement(k)',
      'yinYang=resonant',
    ],
  },
  {
    // 제품 샘플. E4 이후 용신 금 → 달 사자(火)와 火剋金 = tension (예전 목 용신일 땐 complement).
    id: 'R16',
    sajuGolden: 'G01',
    birth: { date: '1997-03-21', time: '14:30', ...SEOUL, gender: 'female' },
    inputs: {
      pillars: '丁丑 癸卯 壬戌 丁未',
      sun: 'Aries',
      moon: 'Leo',
      northNode: 'Virgo',
      yongsin: '금',
      strength: 'weak',
      sect: 'day',
      gongmang: '子丑',
    },
    rows: [
      'identity=tension',
      'needs=tension',
      'socialRole=complement',
      'fortune=resonant',
      'relations=resonant',
      'strength=resonant',
      'temperament=complement',
      'energy=complement',
      'drive=tension',
      'keyTrait=resonant',
      'romance=resonant',
      'expression=complement',
      'movement=complement',
      'spirit=complement',
      'wealth=resonant',
      'karma=resonant(k)',
      'growth=complement(k)',
      'yinYang=resonant',
    ],
  },
  {
    // 2024 출생 — NOW 기준 만 2세(미성년)라 연애·재물 행은 생략된다. 시주 申(17:20)은
    // 상승 사자, 일몰(≈17:56) 전이라 낮 차트.
    id: 'R17',
    sajuGolden: 'G04',
    birth: { date: '2024-02-04', time: '17:20', ...SEOUL, gender: 'female' },
    inputs: {
      pillars: '癸卯 乙丑 戊戌 庚申',
      sun: 'Aquarius',
      moon: 'Sagittarius',
      northNode: 'Aries',
      yongsin: '화',
      strength: 'strong',
      sect: 'day',
      gongmang: '辰巳',
    },
    rows: [
      'identity=tension',
      'needs=resonant',
      'fortune=complement',
      'relations=resonant',
      'strength=complement',
      'temperament=resonant',
      'energy=resonant',
      'drive=resonant',
      'keyTrait=tension',
      'expression=complement',
      'movement=resonant',
      'spirit=complement',
      'karma=neutral(k)',
      'growth=resonant(k)',
      'yinYang=resonant',
    ],
  },
]

const ctxCache = new Map<string, Promise<Record<string, any>>>()
const ctxOf = (c: RefChart) => {
  if (!ctxCache.has(c.id)) ctxCache.set(c.id, reportCtx(c.birth))
  return ctxCache.get(c.id)!
}

function observed(ctx: Record<string, any>) {
  const S = ctx.saju
  const A = ctx.astro
  const planets: Planet[] = A.chart?.planets ?? A.planets ?? []
  const find = (n: string) => planets.find((p) => p.name === n)
  const node = planets.find((p) => /node/i.test(p.name ?? '') && !/south/i.test(p.name ?? ''))
  const P = S.pillars as Record<string, Pillar>
  return {
    pillars: ['year', 'month', 'day', 'time'].map((k) => gz(P[k])).join(' '),
    sun: find('Sun')?.sign,
    moon: find('Moon')?.sign,
    northNode: node?.sign,
    yongsin: S.yongsin?.primary,
    strength: S.strength,
    sect: A.sect,
    gongmang: ((S.analyses?.gongmang?.gongmangBranches ?? S.gongmang ?? []) as string[]).join(''),
  }
}

// ── 독립 기준: 오행 족 판정 (natalCrossVerdict.elementVerdict 와 같은 족) ──
type El = 'wood' | 'fire' | 'earth' | 'metal' | 'water'
const ELS: El[] = ['wood', 'fire', 'earth', 'metal', 'water']
const STEM_EL: Record<string, El> = {
  甲: 'wood',
  乙: 'wood',
  丙: 'fire',
  丁: 'fire',
  戊: 'earth',
  己: 'earth',
  庚: 'metal',
  辛: 'metal',
  壬: 'water',
  癸: 'water',
}
const BRANCH_EL: Record<string, El> = {
  寅: 'wood',
  卯: 'wood',
  巳: 'fire',
  午: 'fire',
  辰: 'earth',
  戌: 'earth',
  丑: 'earth',
  未: 'earth',
  申: 'metal',
  酉: 'metal',
  亥: 'water',
  子: 'water',
}
const YANG_STEMS = new Set(['甲', '丙', '戊', '庚', '壬'])
const SIGNS = [
  'Aries',
  'Taurus',
  'Gemini',
  'Cancer',
  'Leo',
  'Virgo',
  'Libra',
  'Scorpio',
  'Sagittarius',
  'Capricorn',
  'Aquarius',
  'Pisces',
]
/** 별자리 → 오행. 공기는 cross 계약대로 木 근사(natalCrossShared.signToSajuElement). */
const SIGN_EL: El[] = ['fire', 'earth', 'wood', 'water']
const signEl = (sign: string) => SIGN_EL[SIGNS.indexOf(sign) % 4]
const YONGSIN_EL: Record<string, El> = {
  목: 'wood',
  화: 'fire',
  토: 'earth',
  금: 'metal',
  수: 'water',
}
const GEN: Record<El, El> = {
  wood: 'fire',
  fire: 'earth',
  earth: 'metal',
  metal: 'water',
  water: 'wood',
}
const CTL: Record<El, El> = {
  wood: 'earth',
  fire: 'metal',
  earth: 'water',
  metal: 'wood',
  water: 'fire',
}
/** 같음 → resonant · 생(어느 방향이든) → complement · 극(어느 방향이든) → tension. */
const elementTone = (a: El, b: El) =>
  a === b
    ? 'resonant'
    : GEN[a] === b || GEN[b] === a
      ? 'complement'
      : CTL[a] === b || CTL[b] === a
        ? 'tension'
        : 'neutral'

const STEMS = '甲乙丙丁戊己庚辛壬癸'
const BRANCHES = '子丑寅卯辰巳午未申酉戌亥'
/** 旬空 — 일주가 속한 旬(甲으로 시작하는 10일)에 빠진 두 지지. */
function gongmangOf(dayPillar: string): string {
  const s = STEMS.indexOf(dayPillar[0])
  const b = BRANCHES.indexOf(dayPillar[1])
  const xunStartBranch = (((b - s) % 12) + 12) % 12
  return BRANCHES[(xunStartBranch + 10) % 12] + BRANCHES[(xunStartBranch + 11) % 12]
}
const signOf = (lon: number) => SIGNS[Math.floor((((lon % 360) + 360) % 360) / 30)]
const cuspMargin = (lon: number) => {
  const x = (((lon % 360) + 360) % 360) % 30
  return Math.min(x, 30 - x)
}
/** 진(접촉) 교점 — 달의 지심 상태 벡터(astronomy-engine)를 진황도로 돌려 각운동량 h 의
 *  승교점 방향 atan2(h_x, −h_y). scripts/golden/build-engine-golden.mts 와 같은 정의. */
function trueNodeLon(date: Date) {
  const st = Astronomy.GeoMoonState(date)
  const rot = Astronomy.Rotation_EQJ_ECT(date)
  const r = Astronomy.RotateVector(rot, new Astronomy.Vector(st.x, st.y, st.z, st.t))
  const v = Astronomy.RotateVector(rot, new Astronomy.Vector(st.vx, st.vy, st.vz, st.t))
  const hx = r.y * v.z - r.z * v.y
  const hy = r.z * v.x - r.x * v.z
  return ((((Math.atan2(hx, -hy) * 180) / Math.PI) % 360) + 360) % 360
}

describeRealEphemeris('release gate — 기준 차트 교차 행 톤 (engine audit F11, stage E16)', () => {
  const SAJU = golden.saju.cases as unknown as Array<{
    id: string
    instant: { utc: string }
    proposed: { pillars: string[] }
  }>

  for (const c of REF) {
    it(`${c.id} ${c.birth.date} ${c.birth.time} ${c.birth.tz} — 입력과 교차 행 전부`, async () => {
      const ctx = await ctxOf(c)
      expect(observed(ctx)).toEqual(c.inputs)
      expect(fmtRows(buildCrossRows(ctx, 'en', NOW).rows)).toEqual(c.rows)
    })

    it(`${c.id} 오행 족 다섯 행이 독립 입력의 평가기 규칙과 같다`, async () => {
      const g = SAJU.find((x) => x.id === c.sajuGolden)!
      const pillars = g.proposed.pillars
      // 명식은 사주 골든(독립 기준)과 같아야 한다.
      expect(c.inputs.pillars).toBe(pillars.join(' '))

      const t = new Date(g.instant.utc)
      const sun = signOf(Astronomy.SunPosition(t).elon)
      const moon = signOf(Astronomy.EclipticGeoMoon(t).lon)
      const obs = new Astronomy.Observer(c.birth.lat, c.birth.lon, 0)
      const eq = Astronomy.Equator(Astronomy.Body.Sun, t, obs, true, true)
      const sect = Astronomy.Horizon(t, obs, eq.ra, eq.dec).altitude > 0 ? 'day' : 'night'
      const nodeLon = trueNodeLon(t)
      // 사인 경계 바로 옆이면 두 천체력의 미세 차가 사인을 뒤집을 수 있다 — 기준 차트는 아님.
      expect(cuspMargin(nodeLon), 'true node too close to a cusp').toBeGreaterThan(0.1)
      const northNode = signOf(nodeLon)
      expect({ sun, moon, northNode, sect }).toEqual({
        sun: c.inputs.sun,
        moon: c.inputs.moon,
        northNode: c.inputs.northNode,
        sect: c.inputs.sect,
      })

      const dm = pillars[2][0]
      const counts = Object.fromEntries(ELS.map((e) => [e, 0])) as Record<El, number>
      for (const p of pillars) {
        counts[STEM_EL[p[0]]]++
        counts[BRANCH_EL[p[1]]]++
      }
      const weakest = ELS.reduce((a, e) => (counts[e] < counts[a] ? e : a), ELS[0])
      const gongmang = gongmangOf(pillars[2])
      expect(gongmang).toBe(c.inputs.gongmang)
      const voidEls = new Set([...gongmang].map((b) => BRANCH_EL[b]))
      const southNode = SIGNS[(SIGNS.indexOf(northNode) + 6) % 12]

      const expected = {
        identity: elementTone(STEM_EL[dm], signEl(sun)),
        needs: elementTone(YONGSIN_EL[c.inputs.yongsin], signEl(moon)),
        karma: voidEls.has(signEl(southNode)) ? 'resonant(k)' : 'neutral(k)',
        growth: `${elementTone(weakest, signEl(northNode))}(k)`,
        yinYang: YANG_STEMS.has(dm) === (sect === 'day') ? 'resonant' : 'complement',
      }
      const pinned = Object.fromEntries(
        c.rows
          .map((r) => r.split('='))
          .filter(([k]) => k in expected)
          .map(([k, v]) => [k, v])
      )
      expect(pinned).toEqual(expected)
    })
  }
})
