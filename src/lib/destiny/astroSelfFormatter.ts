/**
 * 운명 상담사용 한 사람 점성 self-cross 라인 포맷.
 *
 * 카테고리:
 *   1. 행성·angle in 사인·house (16 포인트: Sun~Pluto + Asc + MC + True Node
 *      + ExtraPoints (Chiron/Lilith/Fortune/Vertex) + South Node)
 *   2. Natal aspects (orb 포함)
 *   3. Current transit aspects (오늘 행성 → natal)
 *   4. Profection (해 단위 house — 나이 % 12)
 *
 * skipAngles(= placeUnreliable: 출생시각 *또는* 출생지 미상) 면 모든 블록에서 앵글·앵글
 * 파생점(행운점·버텍스)과 하우스를 뺀다 — 본명 위치·각, 항성 합, 트랜짓 대상, 일·월식
 * 대상과 식점 하우스까지(placeMask 단일 판정, CALCULATION_SPEC §6, 재감사 AC-2·CNS-2).
 *
 * 검증: tests/lib/destiny/astroSelfFormatter.test.ts.
 */

import { calculateTransitChart, findTransitAspects } from '@/lib/astrology/foundation/transit'
import { extendChartWithExtraPoints } from '@/lib/astrology/foundation/extraPoints'
import { findNatalAspects } from '@/lib/astrology/foundation/aspects'
import { calculateSolarReturn, calculateLunarReturn } from '@/lib/astrology/foundation/returns'
import { calculateSecondaryProgressions } from '@/lib/astrology/foundation/progressions'
import { findFixedStarConjunctions } from '@/lib/astrology/foundation/fixedStars'
import { findEclipseImpact, getUpcomingEclipses } from '@/lib/astrology/foundation/eclipses'
import { isPlaceDependentPoint } from '@/lib/astrology/foundation/placeMask'
import type { NatalInput } from '@/lib/astrology/foundation/types'
import { SIGN_KO_TO_EN } from '@/lib/astrology/signLabels'
import { getDateComponentsInTimezone, getWeekdayInTimezone } from '@/lib/datetime'

// 요일 ruler — Chaldean order의 day-of-week 매핑
const DAY_RULER = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'] as const
// 0=일요일
import type { AspectType, Chart, ExtraPoint, PlanetBase } from '@/lib/astrology/foundation/types'

const SIGNS_KO = [
  '양자리',
  '황소자리',
  '쌍둥이자리',
  '게자리',
  '사자자리',
  '처녀자리',
  '천칭자리',
  '전갈자리',
  '사수자리',
  '염소자리',
  '물병자리',
  '물고기자리',
] as const

const ASPECT_NAME: Record<AspectType, string> = {
  conjunction: 'Conjunction',
  opposition: 'Opposition',
  trine: 'Trine',
  square: 'Square',
  sextile: 'Sextile',
  quincunx: 'Quincunx',
  semisextile: 'Semisextile',
  quintile: 'Quintile',
  biquintile: 'Biquintile',
  sesquiquadrate: 'Sesquiquadrate',
}

const PLANET_LABEL: Record<string, string> = {
  Sun: 'Sun',
  Moon: 'Moon',
  Mercury: 'Mercury',
  Venus: 'Venus',
  Mars: 'Mars',
  Jupiter: 'Jupiter',
  Saturn: 'Saturn',
  Uranus: 'Uranus',
  Neptune: 'Neptune',
  Pluto: 'Pluto',
  'True Node': 'Node',
  Ascendant: 'Ascendant',
  MC: 'MC',
  Chiron: 'Chiron',
  Lilith: 'Lilith',
  PartOfFortune: 'Fortune',
  Vertex: 'Vertex',
}

const sign = (ko: string) => SIGN_KO_TO_EN[ko] ?? ko
const label = (name: string) => PLANET_LABEL[name] ?? name

/** 오브(도) → "D°MM'". 총 분을 먼저 반올림한 뒤 도로 올림 — 2.995° 는 "3°00'"
 *  ("2°60'" 금지 — 감사 ASTRO-14). */
export function orbToDegMin(orb: number): string {
  const totalMin = Math.round(Math.abs(orb) * 60)
  const deg = Math.floor(totalMin / 60)
  const min = totalMin % 60
  return `${deg}°${String(min).padStart(2, '0')}'`
}

function extraToPlanet(name: string, ep: ExtraPoint | undefined): PlanetBase | null {
  if (!ep) return null
  return {
    name,
    longitude: ep.longitude,
    sign: ep.sign,
    degree: ep.degree,
    minute: ep.minute,
    formatted: ep.formatted,
    house: ep.house,
    retrograde: false,
  }
}

/**
 * chart에 ExtraPoints + South Node 흡수해서 자세한 라인 출력 가능.
 */
function expandChart(chart: Chart, latitude: number, longitude: number): Chart {
  const jdUT = chart.meta?.jdUT
  if (jdUT == null) return chart

  const extras: PlanetBase[] = []
  try {
    const ex = extendChartWithExtraPoints(chart, jdUT, latitude, longitude)
    for (const ep of [
      extraToPlanet('Chiron', ex.chiron),
      extraToPlanet('Lilith', ex.lilith),
      extraToPlanet('PartOfFortune', ex.partOfFortune),
      extraToPlanet('Vertex', ex.vertex),
    ])
      if (ep) extras.push(ep)
  } catch {
    /* skip */
  }

  const trueNode = chart.planets.find((p) => p.name === 'True Node')
  if (trueNode) {
    const southLon = (trueNode.longitude + 180) % 360
    const signIdx = Math.floor(southLon / 30)
    extras.push({
      name: 'South Node',
      longitude: southLon,
      sign: SIGNS_KO[signIdx] as PlanetBase['sign'],
      degree: Math.floor(southLon - signIdx * 30),
      minute: 0,
      formatted: '',
      house: 0,
      retrograde: false,
    })
  }

  return { ...chart, planets: [...chart.planets, ...extras] }
}

export interface AstroSelfInput {
  chart: Chart
  latitude: number
  longitude: number
  timeZone: string
  /** 만 나이 (Profection 계산용; calculateProfection 과 같은 컨벤션) — 없으면 skip */
  age?: number
  /** 현재 시간 (transit aspects 기준) — default now */
  now?: Date
  /** Solar Return / Lunar Return 계산용 natal input — 없으면 SR/LR skip */
  natalInput?: NatalInput
  /**
   * Lunar Return 블록 계산 여부 — default true(하위호환). 운명상담사는
   * slimAstroSelf 로 LR 블록을 *항상* 버리므로(소비처 0), false 로 넘겨
   * 매 호출 calculateLunarReturn(무거운 ephemeris) 헛계산을 없앤다.
   */
  includeLunarReturn?: boolean
  /** 섹션 헤더 라벨 — default '점성' (둘 사람 비교 시 'A 점성' / 'B 점성' 등) */
  label?: string
  /**
   * placeUnreliable(출생시각 또는 출생지 미상)일 때 ASC/MC·앵글 파생점(행운점·버텍스)·
   * 하우스 출력을 모든 블록에서 생략한다 — 본명 위치·각, 항성 합, 트랜짓·일식의 본명 대상,
   * 식점 하우스, SR/LR/진행 앵글, 프로펙션. 이 값들은 정오 앵커·존 기준점 좌표로 계산된
   * 날조라 LLM 에 들어가면 [Meta] 의 "ASC/MC/하우스 인용 금지" 와 충돌한다(재감사 AC-2·CNS-2).
   */
  skipAngles?: boolean
}

/** 순간 at 의 timeZone 민용 날짜 'YYYY-MM-DD'. */
function localDateIn(at: Date, timeZone: string): string {
  const p = getDateComponentsInTimezone(at, timeZone)
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`
}

export async function formatAstroSelf(input: AstroSelfInput): Promise<string> {
  if (!input.chart) return ''
  const chart = expandChart(input.chart, input.latitude, input.longitude)
  const skipAngles = !!input.skipAngles
  // skipAngles 면 이 점이 낀 줄은 전부 뺀다(앵글 + 행운점·버텍스 — placeMask 단일 판정).
  const masked = (name: string) => skipAngles && isPlaceDependentPoint(name)
  const out: string[] = [`== ${input.label ?? '점성'} ==`, '']
  if (skipAngles) {
    out.push('# 출생시각·출생지 미상 — house / Ascendant / MC 데이터 생략.')
    out.push('')
  }

  // 행성 in 사인 (cityKnown 이면 ASC/MC + house 도 같이)
  out.push(skipAngles ? '[행성 in 사인]' : '[행성·angle in 사인 · house]')
  const planetPoints = skipAngles
    ? chart.planets.filter((p) => !masked(p.name))
    : [...chart.planets, chart.ascendant, chart.mc]
  for (const pl of planetPoints) {
    const houseStr = !skipAngles && pl.house > 0 ? `, House ${pl.house}` : ''
    out.push(
      `${label(pl.name)} in ${sign(pl.sign)} ${pl.degree}°${pl.minute.toString().padStart(2, '0')}'${houseStr}${pl.retrograde ? ' R' : ''}`
    )
  }
  out.push('')

  // Natal aspects (skipAngles 면 ASC/MC 포함된 aspect 제외)
  const signByName = new Map<string, string>()
  for (const pl of [...chart.planets, chart.ascendant, chart.mc]) {
    signByName.set(pl.name, sign(pl.sign))
  }
  out.push(skipAngles ? '[Natal aspects — 행성 사이]' : '[Natal aspects — 행성·angle 사이]')
  const natalAspects = findNatalAspects(chart, { maxResults: 80 })
  for (const asp of natalAspects) {
    if (masked(asp.from.name) || masked(asp.to.name)) continue
    const fromSign = signByName.get(asp.from.name) ?? '?'
    const toSign = signByName.get(asp.to.name) ?? '?'
    out.push(
      `${label(asp.from.name)} in ${fromSign} ${ASPECT_NAME[asp.type] ?? asp.type} ${label(asp.to.name)} in ${toSign} (Orb: ${orbToDegMin(asp.orb)})`
    )
  }
  out.push('')

  // Fixed Stars — 본명 행성·angle과 1° 이내 합인 항성.
  // 항성 카탈로그(J2000)를 *출생연도* 로 세차보정해 본명(출생 epoch) 행성과
  // 대조해야 한다. 예전엔 now 의 연도로 보정해(변수명은 birthYear 인데 현재년을
  // 담음) 출생-현재 차이(×50.3″/년 ≈ 36년이면 0.5°)만큼 어긋나 경계 합이 들쭉
  // 날쭉했다. natalInput.year(출생연도) 사용; 없으면 epoch 불명이라 skip.
  try {
    const birthYear = input.natalInput?.year
    if (birthYear == null) throw new Error('no birth year for fixed-star precession')
    const starConjs = findFixedStarConjunctions(chart, birthYear, 1.0, {
      includeAngles: !skipAngles,
    })
      .filter((c) => !masked(c.planet))
      .slice(0, 10)
    if (starConjs.length > 0) {
      out.push('[Fixed Stars — 본명 행성·angle ↔ 항성 합 (orb 1°)]')
      for (const c of starConjs) {
        out.push(
          `${label(c.planet)} ↔ ${c.star.name} (${c.star.name_ko}) — orb ${c.orb.toFixed(2)}°`
        )
      }
      out.push('')
    }
  } catch {
    /* skip */
  }

  // Current transit aspects
  try {
    // 'Z' 가 붙은 절대 순간 — isoToJD 가 접미사를 존중하므로 사용자 tz 가 시각을
    // 다시 해석하지 않는다(옛 경로는 UTC 를 현지 벽시계로 읽어 서울 9시간 이르게,
    // LA 8시간 늦게 계산 — 감사 ASTRO-4). 운명상담사는 그 날짜의 출생 tz 정오
    // (counselorDayAnchor — 캘린더 셀의 트랜짓 표본과 같은 순간)를 넘긴다(재감사 CNS-1).
    const nowIso = (input.now ?? new Date()).toISOString()
    const transitChart = await calculateTransitChart({
      iso: nowIso,
      latitude: input.latitude,
      longitude: input.longitude,
      timeZone: input.timeZone,
    })
    // placeUnreliable 면 본명 앵글·앵글 파생점을 대상으로 한 트랜짓은 날조 각이라 뺀다
    // (findTransitAspects 는 본명 ASC·MC 를 늘 대상에 넣는다 — 재감사 AC-2·CNS-2).
    const transitAspects = findTransitAspects(
      transitChart,
      chart,
      ['conjunction', 'sextile', 'square', 'trine', 'opposition'],
      2.0
    )
      .filter((asp) => !masked(asp.to.name))
      .slice(0, 30)
    if (transitAspects.length > 0) {
      // 머리말 날짜는 그 순간의 차트 tz 날짜 — UTC 날짜(toISOString)는 UTC+12..+14 의
      // 현지 정오에서 전날이다.
      out.push(
        `[Current transits — 행성 (오늘) → natal, ${localDateIn(new Date(nowIso), input.timeZone)}]`
      )
      // transit chart의 행성 sign 매핑
      const transitSignByName = new Map<string, string>()
      for (const pl of [...transitChart.planets, transitChart.ascendant, transitChart.mc]) {
        transitSignByName.set(pl.name, sign(pl.sign))
      }
      for (const asp of transitAspects) {
        const fromSign = transitSignByName.get(asp.from.name) ?? '?'
        const toSign = signByName.get(asp.to.name) ?? '?'
        out.push(
          `${label(asp.from.name)} (transit) in ${fromSign} ${ASPECT_NAME[asp.type as AspectType] ?? asp.type} natal ${label(asp.to.name)} in ${toSign} (Orb: ${orbToDegMin(asp.orb)})`
        )
      }
      out.push('')
    }
  } catch {
    /* skip — transit ephemeris 실패 시 */
  }

  // Eclipses — 다가오는 일식·월식 중 본명 차트에 임팩트 있는 것만
  try {
    const upcoming = getUpcomingEclipses(input.now ?? new Date(), 4)
    if (upcoming.length > 0) {
      // placeUnreliable 면 본명 앵글 대상 임팩트를 빼고 식점 하우스도 적지 않는다 — 하우스는
      // 폴백 커스프의 산물이다(재감사 AC-2·CNS-2). 하우스 미매칭(0)도 적지 않는다.
      const impacts = findEclipseImpact(chart, upcoming, 3.0)
        .filter((imp) => !masked(imp.affectedPoint))
        .slice(0, 8)
      if (impacts.length > 0) {
        out.push('[Upcoming Eclipses — 본명 차트에 임팩트 (orb 3°)]')
        for (const imp of impacts) {
          const houseStr = !skipAngles && imp.house > 0 ? `House ${imp.house}, ` : ''
          out.push(
            `${imp.eclipse.type === 'solar' ? '일식' : '월식'} ${imp.eclipse.date} ${sign(imp.eclipse.sign)} ${imp.eclipse.degree}° ${imp.aspectType} ${label(imp.affectedPoint)} (${houseStr}orb ${imp.orb.toFixed(2)}°)`
          )
        }
        out.push('')
      }
    }
  } catch {
    /* skip */
  }

  // Solar Return / Lunar Return — natalInput 있으면 계산
  if (input.natalInput) {
    const nowDate = input.now ?? new Date()
    // 대상 연/월은 서버-로컬 getFullYear/getMonth 가 아니라 사용자 tz 기준으로
    // 뽑는다. 예전엔 연말·월말 경계에서 UTC 서버와 KST 서버가 다른 연/월을
    // 계산해(예: 2025-12-31T20:00Z = KST 1/1) 완전히 다른 리턴 차트가 컨텍스트에
    // 들어가는 결정론 누수가 있었다.
    const nowParts = getDateComponentsInTimezone(nowDate, input.timeZone)
    const nowYear = nowParts.year
    const nowMonth = nowParts.month // 1-12
    try {
      const sr = await calculateSolarReturn({
        natal: input.natalInput,
        year: nowYear,
      })
      out.push(`[Solar Return — ${nowYear}]`)
      if (!skipAngles && sr.ascendant?.sign)
        out.push(`Asc: ${sign(sr.ascendant.sign)} ${sr.ascendant.degree}°`)
      if (!skipAngles && sr.mc?.sign) out.push(`MC: ${sign(sr.mc.sign)} ${sr.mc.degree}°`)
      for (const pl of sr.planets) {
        const houseStr = !skipAngles ? `, House ${pl.house}` : ''
        out.push(
          `${label(pl.name)} in ${sign(pl.sign)} ${pl.degree}°${houseStr}${pl.retrograde ? ' R' : ''}`
        )
      }
      out.push('')
    } catch {
      /* skip */
    }
    // includeLunarReturn=false 면 LR 계산 자체를 건너뛴다(상담사는 slim 이 어차피
    // LR 블록을 버려 소비처가 0). default true 로 다른 호출자 동작은 그대로.
    if (input.includeLunarReturn !== false) {
      try {
        const lr = await calculateLunarReturn({
          natal: input.natalInput,
          year: nowYear,
          month: nowMonth,
        })
        out.push(`[Lunar Return — ${nowYear}-${String(nowMonth).padStart(2, '0')}]`)
        if (!skipAngles && lr.ascendant?.sign)
          out.push(`Asc: ${sign(lr.ascendant.sign)} ${lr.ascendant.degree}°`)
        if (!skipAngles && lr.mc?.sign) out.push(`MC: ${sign(lr.mc.sign)} ${lr.mc.degree}°`)
        for (const pl of lr.planets) {
          const houseStr = !skipAngles ? `, House ${pl.house}` : ''
          out.push(
            `${label(pl.name)} in ${sign(pl.sign)} ${pl.degree}°${houseStr}${pl.retrograde ? ' R' : ''}`
          )
        }
        out.push('')
      } catch {
        /* skip */
      }
    }
  }

  // Profection — 해 단위 house. house 기반이라 skipAngles 면 전체 skip.
  // 만 나이 기준 (calculateProfection 과 동일): 만 0세 1H, 1세 2H, ... 11세 12H, 12세 1H 반복.
  if (!skipAngles && typeof input.age === 'number' && input.age >= 0) {
    const profectionHouse = (input.age % 12) + 1
    out.push(`[Profection — 이번 해 (만 ${input.age}세) 활성 house]`)
    out.push(`해 단위 활성 house: ${profectionHouse}H (시점·자아 강조 영역)`)
    out.push('')
  }

  // ── Secondary Progression — natalInput 있으면 ────────────────
  if (input.natalInput) {
    try {
      // 진행 목표일 = 그 순간의 차트 tz 날짜(UTC 날짜는 UTC+12..+14 정오에서 하루 이르다).
      const prog = await calculateSecondaryProgressions({
        natal: input.natalInput,
        targetDate: localDateIn(input.now ?? new Date(), input.timeZone),
      })
      // 주요 행성만 (Sun~Mars + Asc + MC)
      const major = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars']
      const lines: string[] = []
      for (const pl of prog.planets) {
        if (!major.includes(pl.name)) continue
        lines.push(
          `Progressed ${label(pl.name)}: ${sign(pl.sign)} ${pl.degree}°${pl.minute.toString().padStart(2, '0')}'${pl.retrograde ? ' R' : ''}`
        )
      }
      if (!skipAngles && prog.ascendant?.sign)
        lines.push(`Progressed Asc: ${sign(prog.ascendant.sign)} ${prog.ascendant.degree}°`)
      if (!skipAngles && prog.mc?.sign)
        lines.push(`Progressed MC: ${sign(prog.mc.sign)} ${prog.mc.degree}°`)
      if (lines.length > 0) {
        out.push(`[Secondary Progression — 사용자 1년 = 행성 1일 진행]`)
        out.push(...lines)
        out.push('')
      }
    } catch {
      /* skip */
    }
  }

  // ── Planetary Hour / Day Ruler — 오늘 요일 기반 ─────────────
  // 요일과 표시 날짜 모두 사용자 tz 기준으로 뽑아 일관되게 한다. 예전엔 요일이
  // 서버-로컬 getDay(), 날짜가 UTC(toISOString) 라 (a) 서버 TZ 에 따라 요일
  // ruler 가 달라지고 (b) 자정 경계에서 "날짜와 요일이 안 맞는" 조합이 LLM
  // 컨텍스트에 들어갔다.
  const rulerNow = input.now ?? new Date()
  const rulerParts = getDateComponentsInTimezone(rulerNow, input.timeZone)
  const rulerDateStr = `${rulerParts.year}-${String(rulerParts.month).padStart(2, '0')}-${String(rulerParts.day).padStart(2, '0')}`
  const dayRuler = DAY_RULER[getWeekdayInTimezone(rulerNow, input.timeZone)]
  out.push(`[현재 시점 행성 신호]`)
  out.push(`오늘 (${rulerDateStr}) 요일 ruler: ${dayRuler} (행성시 base)`)

  // Lunar phase (electional용 단순화) — Sun · Moon 각도로 phase 추정
  // chart에 있는 Sun/Moon 위치는 *natal*이라 의미 없음. transit chart에서 가져옴.
  // calculateTransitChart 결과는 위 transit aspects 계산 때 만들었지만 scope 밖.
  // 여기선 다시 호출하지 않고 day ruler만으로 마무리 — electional은 day ruler가 핵심.
  out.push('')

  return out.join('\n')
}
