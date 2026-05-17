/**
 * Synastry formatter — 두 사람의 점성 비교를 사용자 요청 포맷으로 출력.
 *
 * 사용자 케이스:
 *   A: 1995-02-09 06:40 남자 서울
 *   B: 1991-02-03 00:35 여자 서울
 *
 * 출력 형식 (한 줄씩):
 *   Sun in Aquarius Conjunction Sun in Aquarius (Orb: 6°22')
 *   Partner A's Sun in the 4th Partner B's house
 *   Partner B's Sun in the 1st Partner A's house
 *
 * 실행: npx tsx scripts/synastry-format.ts
 */

import { calculateNatalChart } from '../src/lib/astrology/foundation/astrologyService'
import { extendChartWithExtraPoints } from '../src/lib/astrology/foundation/extraPoints'
import { calculateSynastry } from '../src/lib/astrology/foundation/synastry'
import type { ExtendedChart, ExtraPoint, PlanetBase, Chart, AspectType } from '../src/lib/astrology/foundation/types'

const PERSON_A = {
  year: 1995, month: 2, date: 9, hour: 6, minute: 40,
  latitude: 37.5665, longitude: 126.978, timeZone: 'Asia/Seoul' as const,
}
const PERSON_B = {
  year: 1991, month: 2, date: 3, hour: 0, minute: 35,
  latitude: 37.5665, longitude: 126.978, timeZone: 'Asia/Seoul' as const,
}

// ── 한국어 사인 → 영문 ────────────────────────────────────────
const SIGN_KO_TO_EN: Record<string, string> = {
  '양자리': 'Aries', '황소자리': 'Taurus', '쌍둥이자리': 'Gemini', '게자리': 'Cancer',
  '사자자리': 'Leo', '처녀자리': 'Virgo', '천칭자리': 'Libra', '전갈자리': 'Scorpio',
  '사수자리': 'Sagittarius', '염소자리': 'Capricorn', '물병자리': 'Aquarius', '물고기자리': 'Pisces',
}
const sign = (ko: string) => SIGN_KO_TO_EN[ko] ?? ko

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
const label = (name: string) => PLANET_LABEL[name] ?? name

function orbToDegMin(orb: number): string {
  const deg = Math.floor(orb)
  const min = Math.round((orb - deg) * 60)
  return `${deg}°${String(min).padStart(2, '0')}'`
}

/** ExtraPoint → PlanetBase 변환 (calculateSynastry는 PlanetBase[]만 받음) */
function extraToPlanet(name: string, ep: ExtraPoint | undefined): PlanetBase | null {
  if (!ep) return null
  return {
    name,
    longitude: ep.longitude,
    latitude: 0,
    sign: ep.sign,
    degree: ep.degree,
    minute: ep.minute,
    formatted: ep.formatted,
    house: ep.house,
    retrograde: false,
  }
}

async function buildExtended(p: typeof PERSON_A): Promise<Chart> {
  const natal = await calculateNatalChart(p)
  const jdUT = natal.meta?.jdUT
  if (jdUT == null) throw new Error('natal.meta.jdUT missing')
  const ex = extendChartWithExtraPoints(natal, jdUT, p.latitude, p.longitude)

  // extra points를 chart.planets에 흡수해서 calculateSynastry가 다 보게 함
  const extraPlanets: PlanetBase[] = []
  const chiron = extraToPlanet('Chiron', ex.chiron)
  const lilith = extraToPlanet('Lilith', ex.lilith)
  const fortune = extraToPlanet('PartOfFortune', ex.partOfFortune)
  const vertex = extraToPlanet('Vertex', ex.vertex)
  for (const ep of [chiron, lilith, fortune, vertex]) if (ep) extraPlanets.push(ep)

  // South Node = True Node + 180°
  const trueNode = natal.planets.find((p) => p.name === 'True Node')
  if (trueNode) {
    const southLon = (trueNode.longitude + 180) % 360
    const signIdx = Math.floor(southLon / 30)
    const SIGNS_KO = ['양자리','황소자리','쌍둥이자리','게자리','사자자리','처녀자리','천칭자리','전갈자리','사수자리','염소자리','물병자리','물고기자리']
    extraPlanets.push({
      name: 'South Node',
      longitude: southLon,
      latitude: 0,
      sign: SIGNS_KO[signIdx] as PlanetBase['sign'],
      degree: Math.floor(southLon - signIdx * 30),
      minute: 0,
      formatted: '',
      house: 0,
      retrograde: false,
    })
  }

  return {
    ...natal,
    planets: [...natal.planets, ...extraPlanets],
  }
}

async function main() {
  const [chartA, chartB] = await Promise.all([buildExtended(PERSON_A), buildExtended(PERSON_B)])
  const synastry = calculateSynastry({ chartA, chartB })

  // ── aspect lines ───────────────────────────────────────────
  for (const asp of synastry.aspects) {
    const fromName = label(asp.from.name)
    const toName = label(asp.to.name)
    const fromSign = sign(asp.from.sign)
    const toSign = sign(asp.to.sign)
    const aspectName = ASPECT_TITLE[asp.type] ?? asp.type
    console.log(`${fromName} in ${fromSign} ${aspectName} ${toName} in ${toSign} (Orb: ${orbToDegMin(asp.orb)})`)
  }

  // ── house overlay A → B ────────────────────────────────────
  for (const o of synastry.houseOverlaysAtoB) {
    console.log(`Partner A's ${label(o.planet)} in the ${ordinal(o.inHouse)} Partner B's house`)
  }
  // ── house overlay B → A ────────────────────────────────────
  for (const o of synastry.houseOverlaysBtoA) {
    console.log(`Partner B's ${label(o.planet)} in the ${ordinal(o.inHouse)} Partner A's house`)
  }
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0])
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
