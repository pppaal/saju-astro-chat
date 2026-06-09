/**
 * Composite Chart 시너스트리.
 *
 * 두 사람의 natal chart 를 받아 *관계 자체의 차트* (composite) 를 계산하고
 * 그 안의 내부 aspect 를 추출한다. 점성 정통의 "두 사람이 함께 만드는
 * 하나의 entity" 관점.
 *
 * Composite 계산: 각 행성·앵글의 longitude 를 두 차트의 cyclic midpoint
 * (최단호) 로. (350°, 10°) 의 midpoint 는 0° (180° 아님).
 *
 * 출력: synastry (cross aspect) 와 다른 각도 — composite 의 Sun-Venus,
 * Sun-Moon, Mars-Venus 같은 *관계 entity 자체* 의 톤을 보여줌.
 */

import type { Chart, PlanetBase, ZodiacKo } from '@/lib/astrology/foundation/types'
import { findNatalAspects } from '@/lib/astrology/foundation/aspects'

// 관계 해석에 핵심인 점들만 composite — 외행성(목성~명왕성·노드) 은
// generational 라 두 사람만의 신호로 약함. 루미너리 + 개인 행성 + ASC/MC.
const COMPOSITE_POINTS = new Set([
  'Sun',
  'Moon',
  'Mercury',
  'Venus',
  'Mars',
  'Ascendant',
  'MC',
])

// 한글 행성명 (synastry formatter 와 동일 톤).
const PLANET_KO: Record<string, string> = {
  Sun: '태양',
  Moon: '달',
  Mercury: '수성',
  Venus: '금성',
  Mars: '화성',
  Ascendant: '상승점',
  MC: '중천점',
}

// aspect 심볼 (synastry formatter 와 동일).
// 기호 대신 한국어 뜻 직접 노출 — 깨진 □ 박스 + LLM 디코드 오역 방지
// (synastry formatter 와 동일 정책).
const ASP_SYM: Record<string, string> = {
  Conjunction: '[결합]',
  Opposition: '[대립]',
  Trine: '[조화]',
  Square: '[긴장]',
  Sextile: '[협력]',
}

// ZodiacKo 타입은 영어 12 zodiac (Aries..Pisces). 한글 노출용 별도 매핑.
const ZODIAC_EN: ZodiacKo[] = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
]
const ZODIAC_KO_LABEL: Record<ZodiacKo, string> = {
  Aries: '양자리', Taurus: '황소', Gemini: '쌍둥이', Cancer: '게', Leo: '사자',
  Virgo: '처녀', Libra: '천칭', Scorpio: '전갈', Sagittarius: '사수',
  Capricorn: '염소', Aquarius: '물병', Pisces: '물고기',
}

interface CompositeInput {
  chartA: Chart
  chartB: Chart
  nameA?: string | null
  nameB?: string | null
}

/**
 * 두 longitude 의 cyclic midpoint (0-360 도, 최단호 기준).
 *   midpoint(350, 10) = 0 (NOT 180)
 *   midpoint(0, 180) = 90 또는 270 — 동일거리, 작은 쪽 채택.
 */
function cyclicMidpoint(a: number, b: number): number {
  const A = ((a % 360) + 360) % 360
  const B = ((b % 360) + 360) % 360
  let diff = B - A
  if (diff > 180) diff -= 360
  else if (diff < -180) diff += 360
  return ((A + diff / 2) % 360 + 360) % 360
}

function signFromLongitude(lon: number): { sign: ZodiacKo; degree: number; minute: number } {
  const norm = ((lon % 360) + 360) % 360
  const signIdx = Math.floor(norm / 30)
  const inSign = norm - signIdx * 30
  return {
    sign: ZODIAC_EN[signIdx] ?? 'Aries',
    degree: Math.floor(inSign),
    minute: Math.floor((inSign - Math.floor(inSign)) * 60),
  }
}

/**
 * 두 차트의 composite (midpoint) chart 를 만든 후 내부 aspect 를 찾아
 * 사람이 읽기 쉬운 라인 list 로 반환. 결과 0 줄이면 빈 string.
 */
export function formatCompositeChart(input: CompositeInput): string {
  const { chartA, chartB } = input
  if (!chartA?.planets || !chartB?.planets) return ''

  const byNameA = new Map(chartA.planets.map((p) => [p.name, p]))
  const byNameB = new Map(chartB.planets.map((p) => [p.name, p]))

  const compPlanets: PlanetBase[] = []
  for (const name of COMPOSITE_POINTS) {
    let aPt: PlanetBase | undefined
    let bPt: PlanetBase | undefined
    if (name === 'Ascendant') {
      aPt = chartA.ascendant
      bPt = chartB.ascendant
    } else if (name === 'MC') {
      aPt = chartA.mc
      bPt = chartB.mc
    } else {
      aPt = byNameA.get(name)
      bPt = byNameB.get(name)
    }
    if (!aPt || !bPt) continue
    const lon = cyclicMidpoint(aPt.longitude, bPt.longitude)
    const { sign, degree, minute } = signFromLongitude(lon)
    compPlanets.push({
      name,
      longitude: lon,
      sign,
      degree,
      minute,
      formatted: `${ZODIAC_KO_LABEL[sign]} ${degree}°${minute}'`,
      house: 0, // composite house 는 정통상 별도 계산 필요 — 미사용으로 0.
    })
  }
  if (compPlanets.length < 3) return ''

  // composite chart 를 Chart 모양으로 감싸 findNatalAspects 재활용.
  // ascendant/mc 는 위 compPlanets 에 이미 들어있어 dummy 로 채움.
  const composite: Chart = {
    planets: compPlanets,
    ascendant:
      compPlanets.find((p) => p.name === 'Ascendant') ??
      ({ name: 'Ascendant', longitude: 0, sign: 'Aries', degree: 0, minute: 0, formatted: '', house: 1 } satisfies PlanetBase),
    mc:
      compPlanets.find((p) => p.name === 'MC') ??
      ({ name: 'MC', longitude: 0, sign: 'Aries', degree: 0, minute: 0, formatted: '', house: 10 } satisfies PlanetBase),
    houses: [],
  }

  // tight orb 만 — composite 은 entity 톤이라 노이즈 cut. ≤3° = critical, ≤5° = important.
  const hits = findNatalAspects(composite, { maxResults: 30 })

  const nmA = (input.nameA || '').trim()
  const nmB = (input.nameB || '').trim()
  const pairLabel = nmA && nmB ? `${nmA}·${nmB}` : nmA || nmB || 'A·B'

  const critical: string[] = []
  const important: string[] = []
  // 각 줄을 [C] prefix 로 시작 — composite 은 entity 의 내부 aspect 라
  // synastry (A·B cross) 와 *완전히 다른 종류* 의 신호. 줄만 떼어보면
  // "달 ☍ 수성" 이 A·B synastry 처럼 보여 LLM 이 잘못 인용할 위험.
  const lineOf = (h: (typeof hits)[number]): string =>
    `[C] ${PLANET_KO[h.from.name] ?? h.from.name} ${ASP_SYM[h.type] ?? h.type} ${PLANET_KO[h.to.name] ?? h.to.name} ${h.orb.toFixed(1)}°`

  for (const h of hits) {
    if (h.orb <= 3) critical.push(lineOf(h))
    else if (h.orb <= 5) important.push(lineOf(h))
  }
  if (critical.length === 0 && important.length === 0) return ''

  // composite 행성 위치 한 줄 (sign 위주 — entity 의 "성격" 노출).
  const placementLine = compPlanets
    .filter((p) => p.name !== 'Ascendant' && p.name !== 'MC')
    .map((p) => `${PLANET_KO[p.name] ?? p.name} ${ZODIAC_KO_LABEL[p.sign]}`)
    .join(' · ')

  // Sun-Moon midpoint (정통 점성의 "결혼점·관계 핵점") — 단순 강조용.
  const compSun = compPlanets.find((p) => p.name === 'Sun')
  const compMoon = compPlanets.find((p) => p.name === 'Moon')
  let marriagePointLine = ''
  if (compSun && compMoon) {
    const mp = cyclicMidpoint(compSun.longitude, compMoon.longitude)
    const { sign, degree } = signFromLongitude(mp)
    marriagePointLine = `[Sun-Moon midpoint = 결혼점·관계 핵점] ${ZODIAC_KO_LABEL[sign]} ${degree}° — 관계의 가장 단단한 정서 축`
  }

  const out: string[] = []
  out.push(`== Composite (관계 entity) — ${pairLabel} ==`)
  out.push(`[배치] ${placementLine}`)
  if (marriagePointLine) out.push(marriagePointLine)
  if (critical.length) {
    out.push('[CRITICAL · orb≤3°]')
    out.push(...critical)
  }
  if (important.length) {
    out.push('[IMPORTANT · orb≤5°]')
    out.push(...important.slice(0, 8)) // overflow cap
  }
  return out.join('\n')
}
