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
 * dev 검증: scripts/destiny-counselor-lines-example.ts.
 */

import { calculateTransitChart, findTransitAspects } from '@/lib/astrology/foundation/transit'
import { extendChartWithExtraPoints } from '@/lib/astrology/foundation/extraPoints'
import { findNatalAspects } from '@/lib/astrology/foundation/aspects'
import { calculateSolarReturn, calculateLunarReturn } from '@/lib/astrology/foundation/returns'
import { calculateSecondaryProgressions } from '@/lib/astrology/foundation/progressions'
import { findFixedStarConjunctions } from '@/lib/astrology/foundation/fixedStars'
import { findEclipseImpact, getUpcomingEclipses } from '@/lib/astrology/foundation/eclipses'
import type { NatalInput } from '@/lib/astrology/foundation/types'

// 요일 ruler — Chaldean order의 day-of-week 매핑
const DAY_RULER = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'] as const
// 0=일요일
import type { AspectType, Chart, ExtraPoint, PlanetBase } from '@/lib/astrology/foundation/types'
// 별자리 한국어→영문 — 정본(astrology/signLabels) 재사용. 로컬 복사본 제거.
import { SIGN_KO_TO_EN } from '@/lib/astrology/signLabels'

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

function orbToDegMin(orb: number): string {
  const deg = Math.floor(orb)
  const min = Math.round((orb - deg) * 60)
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
  /** 섹션 헤더 라벨 — default '점성' (둘 사람 비교 시 'A 점성' / 'B 점성' 등) */
  label?: string
  /**
   * 출생 도시 미상일 때 ASC/MC/houses 출력을 모두 생략한다.
   * 이 값들은 정확한 출생 좌표 없이는 계산이 무의미한데, 그동안 default
   * Seoul 좌표로 계산된 결과가 그대로 LLM 에 들어가 "위치 의존 결론
   * 금지" 룰과 충돌하던 버그를 막기 위함.
   */
  skipAngles?: boolean
}

export async function formatAstroSelf(input: AstroSelfInput): Promise<string> {
  if (!input.chart) return ''
  const chart = expandChart(input.chart, input.latitude, input.longitude)
  const skipAngles = !!input.skipAngles
  const ANGLE_NAMES = new Set(['Ascendant', 'MC'])
  const out: string[] = [`== ${input.label ?? '점성'} ==`, '']
  if (skipAngles) {
    out.push('# 출생지 미상 — house / Ascendant / MC 데이터 생략.')
    out.push('')
  }

  // 행성 in 사인 (cityKnown 이면 ASC/MC + house 도 같이)
  out.push(skipAngles ? '[행성 in 사인]' : '[행성·angle in 사인 · house]')
  const planetPoints = skipAngles ? chart.planets : [...chart.planets, chart.ascendant, chart.mc]
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
  const natalAspects = findNatalAspects(chart, { includeMinor: true, maxResults: 80 })
  for (const asp of natalAspects) {
    if (skipAngles && (ANGLE_NAMES.has(asp.from.name) || ANGLE_NAMES.has(asp.to.name))) continue
    const fromSign = signByName.get(asp.from.name) ?? '?'
    const toSign = signByName.get(asp.to.name) ?? '?'
    out.push(
      `${label(asp.from.name)} in ${fromSign} ${ASPECT_NAME[asp.type] ?? asp.type} ${label(asp.to.name)} in ${toSign} (Orb: ${orbToDegMin(asp.orb)})`
    )
  }
  out.push('')

  // Fixed Stars — 본명 행성·angle과 1° 이내 합인 항성
  try {
    const birthYear = (input.now ?? new Date()).getFullYear()
    const starConjs = findFixedStarConjunctions(chart, birthYear, 1.0).slice(0, 10)
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
    const nowIso = (input.now ?? new Date()).toISOString()
    const transitChart = await calculateTransitChart({
      iso: nowIso,
      latitude: input.latitude,
      longitude: input.longitude,
      timeZone: input.timeZone,
    })
    const transitAspects = findTransitAspects(
      transitChart,
      chart,
      ['conjunction', 'sextile', 'square', 'trine', 'opposition'],
      2.0
    ).slice(0, 30)
    if (transitAspects.length > 0) {
      out.push(`[Current transits — 행성 (오늘) → natal, ${nowIso.slice(0, 10)}]`)
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
      const impacts = findEclipseImpact(chart, upcoming, 3.0).slice(0, 8)
      if (impacts.length > 0) {
        out.push('[Upcoming Eclipses — 본명 차트에 임팩트 (orb 3°)]')
        for (const imp of impacts) {
          out.push(
            `${imp.eclipse.type === 'solar' ? '일식' : '월식'} ${imp.eclipse.date} ${sign(imp.eclipse.sign)} ${imp.eclipse.degree}° ${imp.aspectType} ${label(imp.affectedPoint)} (House ${imp.house}, orb ${imp.orb.toFixed(2)}°)`
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
    try {
      const sr = await calculateSolarReturn({
        natal: input.natalInput,
        year: nowDate.getFullYear(),
      })
      out.push(`[Solar Return — ${nowDate.getFullYear()}]`)
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
    try {
      const lr = await calculateLunarReturn({
        natal: input.natalInput,
        year: nowDate.getFullYear(),
        month: nowDate.getMonth() + 1,
      })
      out.push(
        `[Lunar Return — ${nowDate.getFullYear()}-${String(nowDate.getMonth() + 1).padStart(2, '0')}]`
      )
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
      const nowDate = input.now ?? new Date()
      const prog = await calculateSecondaryProgressions({
        natal: input.natalInput,
        targetDate: nowDate.toISOString().slice(0, 10),
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
  const nowDate = input.now ?? new Date()
  const dayRuler = DAY_RULER[nowDate.getDay()]
  out.push(`[현재 시점 행성 신호]`)
  out.push(`오늘 (${nowDate.toISOString().slice(0, 10)}) 요일 ruler: ${dayRuler} (행성시 base)`)

  // Lunar phase (electional용 단순화) — Sun · Moon 각도로 phase 추정
  // chart에 있는 Sun/Moon 위치는 *natal*이라 의미 없음. transit chart에서 가져옴.
  // calculateTransitChart 결과는 위 transit aspects 계산 때 만들었지만 scope 밖.
  // 여기선 다시 호출하지 않고 day ruler만으로 마무리 — electional은 day ruler가 핵심.
  out.push('')

  return out.join('\n')
}
