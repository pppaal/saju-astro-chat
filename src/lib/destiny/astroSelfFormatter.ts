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
import type { NatalInput } from '@/lib/astrology/foundation/types'

// 요일 ruler — Chaldean order의 day-of-week 매핑
const DAY_RULER = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'] as const
// 0=일요일
import type {
  AspectType,
  Chart,
  ExtraPoint,
  PlanetBase,
} from '@/lib/astrology/foundation/types'

const SIGN_KO_TO_EN: Record<string, string> = {
  '양자리': 'Aries', '황소자리': 'Taurus', '쌍둥이자리': 'Gemini', '게자리': 'Cancer',
  '사자자리': 'Leo', '처녀자리': 'Virgo', '천칭자리': 'Libra', '전갈자리': 'Scorpio',
  '사수자리': 'Sagittarius', '염소자리': 'Capricorn', '물병자리': 'Aquarius', '물고기자리': 'Pisces',
}

const SIGNS_KO = [
  '양자리','황소자리','쌍둥이자리','게자리','사자자리','처녀자리',
  '천칭자리','전갈자리','사수자리','염소자리','물병자리','물고기자리',
] as const

const ASPECT_NAME: Record<AspectType, string> = {
  conjunction: 'Conjunction', opposition: 'Opposition', trine: 'Trine',
  square: 'Square', sextile: 'Sextile', quincunx: 'Quincunx',
  semisextile: 'Semisextile', quintile: 'Quintile', biquintile: 'Biquintile',
}

const PLANET_LABEL: Record<string, string> = {
  Sun: 'Sun', Moon: 'Moon', Mercury: 'Mercury', Venus: 'Venus', Mars: 'Mars',
  Jupiter: 'Jupiter', Saturn: 'Saturn', Uranus: 'Uranus', Neptune: 'Neptune',
  Pluto: 'Pluto', 'True Node': 'Node', Ascendant: 'Ascendant', MC: 'MC',
  Chiron: 'Chiron', Lilith: 'Lilith', PartOfFortune: 'Fortune', Vertex: 'Vertex',
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
    ]) if (ep) extras.push(ep)
  } catch { /* skip */ }

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
  /** 한국 나이 (Profection 계산용) — 없으면 skip */
  koreanAge?: number
  /** 현재 시간 (transit aspects 기준) — default now */
  now?: Date
  /** Solar Return / Lunar Return 계산용 natal input — 없으면 SR/LR skip */
  natalInput?: NatalInput
}

export async function formatAstroSelf(input: AstroSelfInput): Promise<string> {
  if (!input.chart) return ''
  const chart = expandChart(input.chart, input.latitude, input.longitude)
  const out: string[] = ['== 점성 self-cross ==', '']

  // 행성 in 사인·house
  out.push('[행성·angle in 사인 · house]')
  for (const pl of [...chart.planets, chart.ascendant, chart.mc]) {
    const houseStr = pl.house > 0 ? `, House ${pl.house}` : ''
    out.push(`${label(pl.name)} in ${sign(pl.sign)} ${pl.degree}°${pl.minute.toString().padStart(2, '0')}'${houseStr}${pl.retrograde ? ' R' : ''}`)
  }
  out.push('')

  // Natal aspects
  const signByName = new Map<string, string>()
  for (const pl of [...chart.planets, chart.ascendant, chart.mc]) {
    signByName.set(pl.name, sign(pl.sign))
  }
  out.push('[Natal aspects — 행성·angle 사이]')
  const natalAspects = findNatalAspects(chart, { includeMinor: true, maxResults: 80 })
  for (const asp of natalAspects) {
    const fromSign = signByName.get(asp.from.name) ?? '?'
    const toSign = signByName.get(asp.to.name) ?? '?'
    out.push(`${label(asp.from.name)} in ${fromSign} ${ASPECT_NAME[asp.type] ?? asp.type} ${label(asp.to.name)} in ${toSign} (Orb: ${orbToDegMin(asp.orb)})`)
  }
  out.push('')

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
      2.0,
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
        out.push(`${label(asp.from.name)} (transit) in ${fromSign} ${ASPECT_NAME[asp.type as AspectType] ?? asp.type} natal ${label(asp.to.name)} in ${toSign} (Orb: ${orbToDegMin(asp.orb)})`)
      }
      out.push('')
    }
  } catch { /* skip — transit ephemeris 실패 시 */ }

  // Solar Return / Lunar Return — natalInput 있으면 계산
  if (input.natalInput) {
    const nowDate = input.now ?? new Date()
    try {
      const sr = await calculateSolarReturn({ natal: input.natalInput, year: nowDate.getFullYear() })
      out.push(`[Solar Return — ${nowDate.getFullYear()}]`)
      if (sr.ascendant?.sign) out.push(`Asc: ${sign(sr.ascendant.sign)} ${sr.ascendant.degree}°`)
      if (sr.mc?.sign) out.push(`MC: ${sign(sr.mc.sign)} ${sr.mc.degree}°`)
      for (const pl of sr.planets) {
        out.push(`${label(pl.name)} in ${sign(pl.sign)} ${pl.degree}°, House ${pl.house}${pl.retrograde ? ' R' : ''}`)
      }
      out.push('')
    } catch { /* skip */ }
    try {
      const lr = await calculateLunarReturn({ natal: input.natalInput, year: nowDate.getFullYear(), month: nowDate.getMonth() + 1 })
      out.push(`[Lunar Return — ${nowDate.getFullYear()}-${String(nowDate.getMonth() + 1).padStart(2, '0')}]`)
      if (lr.ascendant?.sign) out.push(`Asc: ${sign(lr.ascendant.sign)} ${lr.ascendant.degree}°`)
      if (lr.mc?.sign) out.push(`MC: ${sign(lr.mc.sign)} ${lr.mc.degree}°`)
      for (const pl of lr.planets) {
        out.push(`${label(pl.name)} in ${sign(pl.sign)} ${pl.degree}°, House ${pl.house}${pl.retrograde ? ' R' : ''}`)
      }
      out.push('')
    } catch { /* skip */ }
  }

  // Profection — 해 단위 house ((나이 % 12) + 1)
  if (typeof input.koreanAge === 'number' && input.koreanAge > 0) {
    const profectionHouse = (input.koreanAge % 12) + 1  // 0세 1H, 1세 2H, ... 12세 1H 반복
    out.push(`[Profection — 이번 해 (${input.koreanAge}세) 활성 house]`)
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
        lines.push(`Progressed ${label(pl.name)}: ${sign(pl.sign)} ${pl.degree}°${pl.minute.toString().padStart(2, '0')}'${pl.retrograde ? ' R' : ''}`)
      }
      if (prog.ascendant?.sign) lines.push(`Progressed Asc: ${sign(prog.ascendant.sign)} ${prog.ascendant.degree}°`)
      if (prog.mc?.sign) lines.push(`Progressed MC: ${sign(prog.mc.sign)} ${prog.mc.degree}°`)
      if (lines.length > 0) {
        out.push(`[Secondary Progression — 사용자 1년 = 행성 1일 진행]`)
        out.push(...lines)
        out.push('')
      }
    } catch { /* skip */ }
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
