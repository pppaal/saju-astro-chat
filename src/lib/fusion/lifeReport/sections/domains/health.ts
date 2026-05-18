// src/lib/fusion/lifeReport/sections/domains/health.ts
// Health / 건강 deterministic narrative builder.

import type { BuilderInput, DomainNarrative, Paragraph } from '../../types'
import {
  fiveElements,
  relationPhraseEn,
  relationPhraseKo,
  unluckyShinsalNames,
  weakElements,
  yongsinPrimary,
} from '../../signals/sajuSignals'
import {
  aspectBetween,
  aspectsOf,
  chiron,
  getPlanet,
  outOfBoundsPlanets,
  planetsInHouse,
} from '../../signals/astroSignals'
import {
  aspectQuality,
  elementLabel,
  houseLabel,
  iGa,
  paragraph,
  planetLabel,
  signLabel,
} from '../../templates/sentences'

export function buildHealth(input: BuilderInput): DomainNarrative {
  const { saju, astro, fusion } = input
  const sajuUsed: string[] = []
  const astroUsed: string[] = []
  const fusionUsed: string[] = []

  const fe = fiveElements(saju)
  if (Object.keys(fe).length > 0) sajuUsed.push('fiveElements')
  const weak = weakElements(saju)

  const yongsin = yongsinPrimary(saju)
  if (yongsin) sajuUsed.push('advanced.yongsin')

  const unlucky = unluckyShinsalNames(saju)
  if (unlucky.length > 0) sajuUsed.push('shinsal.unluckyList')

  const sixthPlanets = planetsInHouse(astro, 6)
  if (sixthPlanets.length > 0) astroUsed.push('houses.6.planets')

  const ch = chiron(astro)
  if (ch) astroUsed.push('chiron')

  const mars = getPlanet(astro, 'Mars')
  const saturn = getPlanet(astro, 'Saturn')
  const marsSaturn =
    mars && saturn ? aspectBetween(astro, 'Mars', 'Saturn') : undefined
  if (mars) astroUsed.push('planets.mars')
  if (saturn) astroUsed.push('planets.saturn')

  const oob = outOfBoundsPlanets(astro)
  if (oob.length > 0) astroUsed.push('declinations.outOfBounds')

  const eclipses = astro.eclipses?.nearestSolar
  if (eclipses?.degree !== undefined) astroUsed.push('eclipses.nearestSolar')

  const healthConfirms = fusion?.byDomain?.health?.confirms ?? []
  if (healthConfirms.length > 0)
    fusionUsed.push(...healthConfirms.slice(0, 3).map((m) => m.rule.id))

  // ── Paragraph 1: 큰 그림 — 오행/건강
  const weakLabels = weak.map((w) => elementLabel(w, 'ko'))
  const weakLabelsEn = weak.map((w) => elementLabel(w, 'en'))
  const p1ko = paragraph([
    '건강의 큰 결은 다섯 가지 기운(목·화·토·금·수)의 균형에서 출발해요.',
    weak.length > 0
      ? `${weakLabels.join('·')}의 기운이 약해서 ${organKo(weak)} 쪽이 평소 보살핌이 필요해요.`
      : '다섯 기운이 비교적 고르게 분포돼 있어, 한쪽으로 치우치는 약점은 적어요.',
    yongsin
      ? `삶의 균형추가 되는 결은 '${yongsin}'이라, ${yongsinFlavorKo(yongsin)}이 일상의 보강 방향이에요.`
      : '',
  ])
  const p1en = paragraph([
    'The large grain of your health begins with five-element balance.',
    weak.length > 0
      ? `Weak in ${weakLabelsEn.join('/')}, so ${organEn(weak)} need ongoing care.`
      : 'Your five elements sit relatively even, so no single weakness dominates.',
    yongsin
      ? `Your yongsin is ${yongsin}, so ${yongsinFlavorEn(yongsin)} is the daily reinforcement direction.`
      : '',
  ])

  // ── Paragraph 2: 점성 — 일터 건강 + Mars/Saturn
  const sixthFlavor = sixthPlanets.length > 0
    ? (() => {
        const flavor = sixthHouseFlavorKo(sixthPlanets)
        return `일상과 건강의 자리에 ${sixthPlanets.map((p) => planetLabel(p.name, 'ko')).join(', ')}이 자리해서, 일상의 ${flavor}${iGa(flavor)} 건강 신호로 이어져요.`
      })()
    : '일상과 건강의 자리는 비어 있어, 건강 신호는 다른 자리의 별들이 함께 짊어져요.'
  const sixthFlavorEn = sixthPlanets.length > 0
    ? `With ${sixthPlanets.map((p) => p.name).join(', ')} inside the 6th, daily ${sixthHouseFlavorEn(sixthPlanets)} carries your health signal.`
    : `Your 6th is empty — health is carried jointly by other placements.`

  const p2ko = paragraph([
    sixthFlavor,
    marsSaturn
      ? `행동의 별과 책임의 별이 ${aspectQuality(marsSaturn.type, 'ko')}, 스트레스가 ${marsSaturnFlavorKo(marsSaturn.type)} 결로 누적될 수 있어요.`
      : '',
  ])
  const p2en = paragraph([
    sixthFlavorEn,
    marsSaturn
      ? `Mars-Saturn ${aspectQuality(marsSaturn.type, 'en')}, so stress can accumulate in a ${marsSaturnFlavorEn(marsSaturn.type)} grain.`
      : '',
  ])

  // ── Paragraph 3: 심화 — Chiron, OOB, eclipse
  const deepKo: string[] = []
  const deepEn: string[] = []
  if (ch) {
    deepKo.push(
      `상처와 치유의 결이 ${signLabel(ch.sign, 'ko')}의 톤으로 자리해서, ${chironFlavorKo(ch.house)} 영역이 상처와 치유로 함께 묶여 있어요.`
    )
    deepEn.push(
      `Chiron in ${signLabel(ch.sign, 'en')} ${houseLabel(ch.house, 'en')} marks ${chironFlavorEn(ch.house)} as a wound-and-healing thread.`
    )
  }
  if (oob.length > 0) {
    deepKo.push(
      `또 ${oob.map(planetLabelHealthKo).join(', ')}이 일반 궤도 밖으로 나가 있어서, 평균을 넘는 특이한 건강 패턴이 나올 수 있어요.`
    )
    deepEn.push(
      `Furthermore, ${oob.join(', ')} run out-of-bounds in declination, which can produce health patterns that exceed the average range.`
    )
  }
  if (eclipses?.degree !== undefined) {
    deepKo.push('태어난 시기 가까이 있던 일식·월식의 흔적이 신체 리듬에 미세한 부하를 남기는 결이에요.')
    deepEn.push(`A nearby natal eclipse leaves a subtle imprint on your body rhythms.`)
  }
  if (unlucky.length > 0) {
    deepKo.push('무리가 누적되지 않도록 평소 회복 루틴이 필요한 결이 함께 있어요.')
    deepEn.push(`Your 신살 includes ${unlucky.slice(0, 3).join(' / ')} — keep a recovery routine to prevent overload buildup.`)
  }
  if (healthConfirms.length > 0) {
    deepKo.push(`그리고 ${healthConfirms[0].rule.narrative.confirm}`)
    deepEn.push(`Additionally, ${healthConfirms[0].rule.meaning}.`)
  }
  // Saju relations — 형(reshape) / 충(clash) often surface as body-stress
  // patterns. Bias the pick toward those kinds.
  const relKoHealth = relationPhraseKo(input.calendarSignals?.sajuRelations, {
    preferKind: '형',
  })
    ?? relationPhraseKo(input.calendarSignals?.sajuRelations, {
      preferKind: '충',
    })
  const relEnHealth = relationPhraseEn(input.calendarSignals?.sajuRelations, {
    preferKind: '형',
  })
    ?? relationPhraseEn(input.calendarSignals?.sajuRelations, {
      preferKind: '충',
    })
  if (relKoHealth) {
    sajuUsed.push('calendarSignals.sajuRelations')
    deepKo.push(relKoHealth.replace('흐름이 있어요.', '결이 있어서, 무리가 쌓이면 그 자리부터 신호가 먼저 와요.'))
    if (relEnHealth) deepEn.push(relEnHealth.replace(/\.$/, ' — overload signals tend to surface from that axis first.'))
  }
  const p3ko = paragraph(deepKo.length ? deepKo : [
    '건강의 결은 극단보다는 일상의 작은 누적이 만들어요.'
  ])
  const p3en = paragraph(deepEn.length ? deepEn : [
    'Because the deeper health signals sit in a calm alignment, your grain comes from small daily accumulation, not extremes.'
  ])

  // ── Paragraph 4: 가이드
  const guideKo: string[] = ['일상 가이드 한 줄:']
  const guideEn: string[] = ['Daily handle:']
  if (weak.includes('목') || weak.includes('wood')) {
    guideKo.push('간·담을 보호하세요. 분노·과로 누적이 가장 큰 부담이에요.')
    guideEn.push('Protect the liver/gallbladder — anger and overwork are the heaviest loads.')
  }
  if (weak.includes('화') || weak.includes('fire')) {
    guideKo.push('심장·혈류 관리에 신경 쓰세요. 휴식 부족이 직접 신호로 와요.')
    guideEn.push('Mind the heart and circulation — under-rest signals quickly.')
  }
  if (weak.includes('토') || weak.includes('earth')) {
    guideKo.push('소화기 관리에 신경 쓰세요. 끼니 규칙이 곧 회복 루틴이에요.')
    guideEn.push('Mind digestion — regular meals are themselves recovery.')
  }
  if (weak.includes('금') || weak.includes('metal')) {
    guideKo.push('호흡기·면역을 보호하세요. 환절기에 신호가 분명해요.')
    guideEn.push('Protect lungs and immunity — seasonal shifts surface the signal.')
  }
  if (weak.includes('수') || weak.includes('water')) {
    guideKo.push('신장·수분에 신경 쓰세요. 두려움 누적도 같은 라인을 따라요.')
    guideEn.push('Mind kidneys and hydration — accumulated fear runs the same line.')
  }
  if (guideKo.length === 1) {
    guideKo.push('오행이 균형이라, 한 가지 큰 관리보다 골고루 작은 루틴이 더 잘 맞아요.')
    guideEn.push('Your elements are even — many small routines fit better than one heavy regimen.')
  }
  // Calendar-engine: Lot of Necessity (약함의 자리)
  const necessity = input.calendarSignals?.arabicParts?.Necessity
  if (necessity) {
    fusionUsed.push('calendarSignals.arabicParts.Necessity')
    guideKo.push(
      `약함의 자리(필연의 점)가 차트에 자리해서, 부담을 미루지 않고 작게 자주 풀어주는 흐름이 가장 무리가 없어요.`,
    )
    guideEn.push(
      `Your Lot of Necessity sits in the chart — releasing pressure little and often, rather than postponing it, is the gentlest path.`,
    )
  }
  const p4ko = paragraph(guideKo)
  const p4en = paragraph(guideEn)

  const paragraphs: Paragraph[] = [
    { ko: p1ko, en: p1en },
    { ko: p2ko, en: p2en },
    { ko: p3ko, en: p3en },
    { ko: p4ko, en: p4en },
  ]

  return {
    id: 'health',
    title: { ko: '건강', en: 'Health' },
    paragraphs,
    signals: { saju: sajuUsed, astro: astroUsed, fusion: fusionUsed },
  }
}

function organKo(weak: string[]): string {
  const parts: string[] = []
  for (const w of weak) {
    if (w === '목' || w === 'wood') parts.push('간·담')
    else if (w === '화' || w === 'fire') parts.push('심장·소장')
    else if (w === '토' || w === 'earth') parts.push('비위·소화기')
    else if (w === '금' || w === 'metal') parts.push('폐·대장·호흡기')
    else if (w === '수' || w === 'water') parts.push('신장·방광')
  }
  if (parts.length === 0) return '특정 장기'
  return parts.join('과 ')
}
function organEn(weak: string[]): string {
  const parts: string[] = []
  for (const w of weak) {
    if (w === '목' || w === 'wood') parts.push('liver/gallbladder')
    else if (w === '화' || w === 'fire') parts.push('heart/small intestine')
    else if (w === '토' || w === 'earth') parts.push('digestion/spleen')
    else if (w === '금' || w === 'metal') parts.push('lungs/large intestine')
    else if (w === '수' || w === 'water') parts.push('kidney/bladder')
  }
  if (parts.length === 0) return 'specific organs'
  return parts.join(' and ')
}

function yongsinFlavorKo(y: string): string {
  if (y.includes('목')) return '간 보호와 새싹 같은 활동 (산책·식물)'
  if (y.includes('화')) return '심장 보호와 표현 활동 (햇볕·예술)'
  if (y.includes('토')) return '소화 보호와 안정 (규칙·뿌리)'
  if (y.includes('금')) return '폐 보호와 정돈 (호흡·정리)'
  if (y.includes('수')) return '신장 보호와 흐름 (수분·휴식)'
  return '평형의 회복'
}
function yongsinFlavorEn(y: string): string {
  if (y.includes('목') || y.includes('wood')) return 'liver-care and sprout-like activity (walks, plants)'
  if (y.includes('화') || y.includes('fire')) return 'heart-care and expressive activity (sun, art)'
  if (y.includes('토') || y.includes('earth')) return 'digestion and stability (regular meals, roots)'
  if (y.includes('금') || y.includes('metal')) return 'lung-care and order (breathing, tidying)'
  if (y.includes('수') || y.includes('water')) return 'kidney-care and flow (hydration, rest)'
  return 'restoration of balance'
}

function sixthHouseFlavorKo(planets: Array<{ name: string }>): string {
  const names = planets.map((p) => p.name)
  if (names.includes('Mars')) return '추진력과 과로의 결'
  if (names.includes('Saturn')) return '책임과 구조의 무게'
  if (names.includes('Mercury')) return '신경과 디테일의 결'
  if (names.includes('Moon')) return '감정과 식습관의 결'
  if (names.includes('Sun')) return '활력과 정체성의 결'
  return '일상의 결'
}
function sixthHouseFlavorEn(planets: Array<{ name: string }>): string {
  const names = planets.map((p) => p.name)
  if (names.includes('Mars')) return 'drive and over-exertion'
  if (names.includes('Saturn')) return 'responsibility weight and structure'
  if (names.includes('Mercury')) return 'nerves and detail'
  if (names.includes('Moon')) return 'emotional rhythms and food habit'
  if (names.includes('Sun')) return 'vitality and identity'
  return 'daily grain'
}

function marsSaturnFlavorKo(type: string): string {
  if (type === 'trine' || type === 'sextile') return '안정적인 인내의'
  if (type === 'square' || type === 'opposition') return '근육과 관절에 과부하가 쌓이는'
  if (type === 'conjunction') return '깊고 농축된 노동의'
  return '미묘한'
}

function planetLabelHealthKo(name: string): string {
  const map: Record<string, string> = {
    Sun: '태양', Moon: '달', Mercury: '수성', Venus: '금성', Mars: '화성',
    Jupiter: '목성', Saturn: '토성', Uranus: '천왕성', Neptune: '해왕성', Pluto: '명왕성',
  }
  return map[name] ?? name
}
function marsSaturnFlavorEn(type: string): string {
  if (type === 'trine' || type === 'sextile') return 'patient-stable'
  if (type === 'square' || type === 'opposition') return 'muscle/joint/overload'
  if (type === 'conjunction') return 'deep-concentrated labor'
  return 'subtle'
}

const CHIRON_HOUSE_FLAVOR_KO: Record<number, string> = {
  1: '자기 정체성',
  2: '자원·가치감',
  3: '말과 학습',
  4: '뿌리·가정',
  5: '창작·자녀·표현',
  6: '일터·신체',
  7: '관계',
  8: '깊이·통합',
  9: '신념·시야',
  10: '공적 자리',
  11: '공동체',
  12: '내면·은둔',
}
const CHIRON_HOUSE_FLAVOR_EN: Record<number, string> = {
  1: 'identity',
  2: 'resource and self-worth',
  3: 'speech and learning',
  4: 'roots and home',
  5: 'creation, children, expression',
  6: 'work and body',
  7: 'relationship',
  8: 'depth and integration',
  9: 'belief and vision',
  10: 'public seat',
  11: 'community',
  12: 'inner / hidden life',
}
function chironFlavorKo(h: number): string {
  return CHIRON_HOUSE_FLAVOR_KO[h] ?? '독자적 영역'
}
function chironFlavorEn(h: number): string {
  return CHIRON_HOUSE_FLAVOR_EN[h] ?? 'a singular domain'
}
