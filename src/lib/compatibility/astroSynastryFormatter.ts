/**
 * 점성 시너스트리 라인 포맷.
 *
 * 두 사람의 natal chart (Sun~Pluto + Asc + MC + True Node + ExtraPoints
 * (Chiron/Lilith/Fortune/Vertex) + South Node 계산)를 받아 LLM이 그대로
 * 읽는 한 줄짜리 라인 list를 생성한다.
 *
 * 출력 형식:
 *   Sun in Aquarius Conjunction Sun in Aquarius (Orb: 6°22')
 *   Partner A's Sun in the 4th Partner B's house
 *   Partner B's Sun in the 1st Partner A's house
 *
 * dev 검증: scripts/synastry-format.ts (95.02.09 06:40 男 + 91.02.03
 * 00:35 女 케이스에서 132 라인 출력 확인).
 */

import { extendChartWithExtraPoints } from '@/lib/astrology/foundation/extraPoints'
import { calculateSynastry } from '@/lib/astrology/foundation/synastry'
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

const ASPECT_TITLE: Record<AspectType, string> = {
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

const SIGNS_KO = [
  '양자리','황소자리','쌍둥이자리','게자리','사자자리','처녀자리',
  '천칭자리','전갈자리','사수자리','염소자리','물병자리','물고기자리',
] as const

const sign = (ko: string) => SIGN_KO_TO_EN[ko] ?? ko
const label = (name: string) => PLANET_LABEL[name] ?? name

function orbToDegMin(orb: number): string {
  const deg = Math.floor(orb)
  const min = Math.round((orb - deg) * 60)
  return `${deg}°${String(min).padStart(2, '0')}'`
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0])
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
 * natal chart에 ExtraPoints(Chiron/Lilith/Fortune/Vertex) + South Node를
 * planets[]에 흡수시킨 확장 chart 반환. calculateSynastry는 PlanetBase[]만
 * 보므로 이렇게 합쳐야 모든 포인트가 cross에 잡힌다.
 */
function expandChart(chart: Chart, latitude: number, longitude: number): Chart {
  const jdUT = chart.meta?.jdUT
  if (jdUT == null) return chart

  const extras: PlanetBase[] = []
  try {
    const ex = extendChartWithExtraPoints(chart, jdUT, latitude, longitude)
    const chiron = extraToPlanet('Chiron', ex.chiron)
    const lilith = extraToPlanet('Lilith', ex.lilith)
    const fortune = extraToPlanet('PartOfFortune', ex.partOfFortune)
    const vertex = extraToPlanet('Vertex', ex.vertex)
    for (const ep of [chiron, lilith, fortune, vertex]) if (ep) extras.push(ep)
  } catch {
    // ExtraPoints 실패 시 본체만으로 진행
  }

  // South Node = True Node + 180°
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

export interface AstroSynastryInput {
  chartA: Chart
  chartB: Chart
  latA: number
  lonA: number
  latB: number
  lonB: number
  /** A/B 실명. 있으면 행성 소유(누구의 달·화성인지)를 이름에 고정한다. */
  nameA?: string | null
  nameB?: string | null
}

/**
 * 점성 synastry 라인 list를 한 string으로 반환 (LLM 직접 injection용).
 * 입력 chart가 비어 있으면 빈 string.
 */
export function formatAstroSynastry(input: AstroSynastryInput): string {
  if (!input.chartA || !input.chartB) return ''

  const chartA = expandChart(input.chartA, input.latA, input.lonA)
  const chartB = expandChart(input.chartB, input.latB, input.lonB)
  const synastry = calculateSynastry({ chartA, chartB })

  // 행성 소유를 이름에 고정한다. 예전 aspect 줄은 "Moon Square Mars"처럼
  // 누구의 달·화성인지 라벨이 아예 없어서, 모델이 소유·방향을 멋대로
  // 추측(상대방 것이라 단정)하는 사고가 났다. from=A, to=B로 명시한다.
  const nmA = (input.nameA || '').trim()
  const nmB = (input.nameB || '').trim()
  const labelA = nmA ? `A(${nmA})` : 'A'
  const labelB = nmB ? `B(${nmB})` : 'B'

  const out: string[] = ['== 시너스트리 (점성 cross) ==']
  out.push(
    `[고정 매핑 — 절대 바꾸지 말 것] A = ${nmA || 'A'} · B = ${nmB || 'B'} (각 줄의 앞쪽 행성 = ${labelA} 것, 뒤쪽 행성 = ${labelB} 것)`
  )
  out.push('')
  out.push(`[Cross aspects — ${labelA}의 행성 ↔ ${labelB}의 행성·포인트]`)
  for (const asp of synastry.aspects) {
    const fromSign = asp.from.sign ? sign(asp.from.sign) : '?'
    const toSign = asp.to.sign ? sign(asp.to.sign) : '?'
    out.push(
      `${labelA}'s ${label(asp.from.name)} in ${fromSign} ${ASPECT_TITLE[asp.type] ?? asp.type} ${labelB}'s ${label(asp.to.name)} in ${toSign} (Orb: ${orbToDegMin(asp.orb)})`,
    )
  }
  out.push('')
  out.push(`[House overlay — ${labelA}의 행성이 ${labelB}의 어느 house에]`)
  for (const o of synastry.houseOverlaysAtoB) {
    out.push(`${labelA}'s ${label(o.planet)} in ${labelB}'s ${ordinal(o.inHouse)} house`)
  }
  out.push('')
  out.push(`[House overlay — ${labelB}의 행성이 ${labelA}의 어느 house에]`)
  for (const o of synastry.houseOverlaysBtoA) {
    out.push(`${labelB}'s ${label(o.planet)} in ${labelA}'s ${ordinal(o.inHouse)} house`)
  }

  return out.join('\n')
}
