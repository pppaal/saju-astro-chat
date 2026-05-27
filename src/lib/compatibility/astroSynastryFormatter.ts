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
import { SIGN_KO } from '@/lib/astrology/signLabels'
import type { AspectType, Chart, ExtraPoint, PlanetBase } from '@/lib/astrology/foundation/types'

const ASPECT_TITLE: Record<AspectType, string> = {
  conjunction: 'Conjunction',
  opposition: 'Opposition',
  trine: 'Trine',
  square: 'Square',
  sextile: 'Sextile',
  quincunx: 'Quincunx',
  semisextile: 'Semisextile',
  quintile: 'Quintile',
  biquintile: 'Biquintile',
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

// v2: KO planet names + aspect symbols (compat counselor is KO-facing, mirrors
// the destiny layer's compact style). Drops the verbose "in Sign … (Orb: …)".
const PLANET_KO: Record<string, string> = {
  Sun: '태양',
  Moon: '달',
  Mercury: '수성',
  Venus: '금성',
  Mars: '화성',
  Jupiter: '목성',
  Saturn: '토성',
  Uranus: '천왕성',
  Neptune: '해왕성',
  Pluto: '명왕성',
  'True Node': '노드',
  'South Node': '남노드',
  Ascendant: '상승',
  MC: '중천',
  Chiron: '키론',
  Lilith: '릴리스',
  PartOfFortune: '포춘',
  Vertex: '버텍스',
}
// 엔진(synastry.ts)은 5대 메이저 각만 계산 → 그 5개만 매핑. 마이너 각
// (quincunx/semisextile/quintile)은 산출 안 돼 범례에 넣으면 거짓 신호.
const ASP_SYM: Partial<Record<AspectType, string>> = {
  conjunction: '☌',
  opposition: '☍',
  trine: '△',
  square: '□',
  sextile: '⚹',
}
const IMPORTANT_TOP = 12 // cap the orb≤5 tier so it doesn't sprawl to 30+ lines
const CRITICAL_TOP = 10 // keep CRITICAL tight; overflow(여전히 orb≤3)은 IMPORTANT로 강등

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

// chart.ascendant.sign이 영어로 올 때 한글로. KO-facing 블록에 영어 별자리
// 누출 방지(예: Aquarius → 물병자리). 이미 한글이면 그대로 통과.
const signKo = (s: string | null | undefined) => (s ? (SIGN_KO[s] ?? s) : '?')

// 하우스 오버레이는 개인 행성만 의미 있음. 외행성은 동세대 공통이라 노이즈.
const PERSONAL_OVERLAY_KO = new Set(['태양', '달', '수성', '금성', '화성'])

const pko = (name: string) => PLANET_KO[name] ?? PLANET_LABEL[name] ?? name

// 개인 행성·앵글 — synastry에서 의미 있는 것. 나머지(목성~명왕성·노드·
// 카이런 등)는 외행성으로, 동세대끼리 거의 동일해 generational 노이즈가 된다.
const PERSONAL_POINTS = new Set(['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Ascendant', 'MC'])
// CRITICAL 승급 기준 점(루미너리·금성·화성·ASC).
const CRITICAL_POINTS = new Set(['Sun', 'Moon', 'Venus', 'Mars', 'Ascendant'])

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

  // v2 compact: "A 금성 △ B 명왕성 0.5°" (owner-tagged, symbol, decimal orb)
  const aspLine = (asp: (typeof synastry.aspects)[number]): string =>
    `${labelA} ${pko(asp.from.name)} ${ASP_SYM[asp.type] ?? ASPECT_TITLE[asp.type] ?? asp.type} ${labelB} ${pko(asp.to.name)} ${asp.orb.toFixed(1)}°`

  // aspect를 티어로 분류 + generational 컨정션 묶음 + orb>5° 노이즈 drop
  const critical: { line: string; orb: number }[] = []
  const important: { line: string; orb: number }[] = []
  const generationalNames = new Set<string>()
  let generationalCount = 0
  for (const asp of synastry.aspects) {
    const fromP = PERSONAL_POINTS.has(asp.from.name)
    const toP = PERSONAL_POINTS.has(asp.to.name)
    // 외행성↔외행성 컨정션 = 동세대 노이즈 → 묶어서 요약 1줄
    if (asp.type === 'conjunction' && !fromP && !toP) {
      generationalCount++
      generationalNames.add(pko(asp.from.name))
      generationalNames.add(pko(asp.to.name))
      continue
    }
    // strict orb≤5 cap (the old luminary exception let 6-7° lines through)
    if (asp.orb > 5) continue
    const isCritical =
      (CRITICAL_POINTS.has(asp.from.name) || CRITICAL_POINTS.has(asp.to.name)) && asp.orb <= 3
    ;(isCritical ? critical : important).push({ line: aspLine(asp), orb: asp.orb })
  }
  critical.sort((a, b) => a.orb - b.orb)
  // CRITICAL이 14줄까지 늘어 "반드시 해석" 무게가 흐려짐 → 타이트 상위 10만
  // CRITICAL로 두고, 넘치는 건(여전히 orb≤3) 버리지 않고 IMPORTANT로 강등.
  const criticalShown = critical.slice(0, CRITICAL_TOP)
  important.push(...critical.slice(CRITICAL_TOP))
  important.sort((a, b) => a.orb - b.orb)
  const importantShown = important.slice(0, IMPORTANT_TOP)

  // House overlay — 정통 점성 궁합의 핵심. "A 의 금성이 B 의 7번 하우스
  // (배우자궁) 에 떨어짐 = 결혼 매력" 식 절대적 신호. 이전 구현은 "양쪽
  // 차이점만" 출력해서 본질을 놓침. 이제 개인 행성 5개(Sun/Moon/Venus/Mars/
  // Mercury) 가 상대의 어느 하우스에 떨어지는지 + 그 하우스 의미까지 명시.
  // 외행성은 동세대 공통이라 생략.
  const HOUSE_MEANING_KO: Record<number, string> = {
    1: '자아·인상', 2: '재물·가치', 3: '소통·일상', 4: '가정·뿌리',
    5: '연애·즐거움', 6: '일·습관', 7: '동반자·결혼', 8: '깊은 결합·변환',
    9: '신념·확장', 10: '커리어·지위', 11: '친구·미래', 12: '내면·비밀',
  }
  const PERSONAL_FOR_OVERLAY = new Set(['Sun', 'Moon', 'Mercury', 'Venus', 'Mars'])
  const overlayLinesAtoB: string[] = []
  const overlayLinesBtoA: string[] = []
  let outerDiffCount = 0
  for (const o of synastry.houseOverlaysAtoB) {
    if (!PERSONAL_FOR_OVERLAY.has(o.planet)) {
      outerDiffCount++
      continue
    }
    overlayLinesAtoB.push(
      `${labelA} ${pko(o.planet)} → ${labelB} ${o.inHouse}H (${HOUSE_MEANING_KO[o.inHouse]})`
    )
  }
  for (const o of synastry.houseOverlaysBtoA) {
    if (!PERSONAL_FOR_OVERLAY.has(o.planet)) continue
    overlayLinesBtoA.push(
      `${labelB} ${pko(o.planet)} → ${labelA} ${o.inHouse}H (${HOUSE_MEANING_KO[o.inHouse]})`
    )
  }
  const ascA = signKo(chartA.ascendant?.sign)
  const ascB = signKo(chartB.ascendant?.sign)
  const ascLine = `ASC ${labelA} ${ascA} / ${labelB} ${ascB}`

  const out: string[] = ['== 시너스트리 (점성 cross) ==']
  out.push(
    `[고정 매핑 — 절대 바꾸지 말 것] A = ${nmA || 'A'} · B = ${nmB || 'B'} (각 줄의 앞쪽 행성 = ${labelA} 것, 뒤쪽 행성 = ${labelB} 것)`
  )
  out.push('기호: ☌결합 ☍대립 △조화 □긴장 ⚹협력 / 각 줄: A행성 (기호) B행성 오차°')
  out.push('')
  out.push('[CRITICAL — 반드시 해석] 개인 행성(해·달·금성·화성·ASC) 타이트 cross (오차≤3°)')
  out.push(criticalShown.length ? criticalShown.map((c) => c.line).join('\n') : '(해당 없음)')
  out.push('')
  out.push(`[IMPORTANT — 맥락 보강] (오차≤5°, 상위${importantShown.length})`)
  out.push(importantShown.length ? importantShown.map((c) => c.line).join('\n') : '(해당 없음)')
  out.push('')
  out.push('[참고 — 동세대/비중 낮음]')
  if (generationalCount > 0) {
    out.push(
      `외행성 동세대 컨정션 ${generationalCount}건 (${[...generationalNames].join('·')}) — 동세대 공통 신호, 해석 비중 낮음`
    )
  }
  // House overlay 출력 — [참고] 가 아니라 별도 [CRITICAL] 블록으로 승급.
  // (정통 점성 궁합의 핵심 신호 — A 의 Venus 가 B 의 7H 에 있으면 결혼
  // 매력. 이전엔 비중 낮음 tier 에 묻혀 있었음.)
  out.push(`[CRITICAL — House overlay] ${ascLine}`)
  if (overlayLinesAtoB.length || overlayLinesBtoA.length) {
    out.push(...overlayLinesAtoB)
    out.push(...overlayLinesBtoA)
  } else {
    out.push('(개인행성 overlay 데이터 없음)')
  }
  if (outerDiffCount > 0) {
    out.push(`외행성 ${outerDiffCount}건은 동세대 공통이라 생략`)
  }

  return out.join('\n')
}
