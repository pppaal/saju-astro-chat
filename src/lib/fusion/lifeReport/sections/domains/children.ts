// src/lib/fusion/lifeReport/sections/domains/children.ts
// Children / 자녀 deterministic narrative builder.
// Includes a count-estimation algorithm combining saju + astrology signals.

import type { BuilderInput, DomainNarrative, Paragraph } from '../../types'
import {
  categoryCount,
  countSibsin,
  geokgukType,
  isStageStrong,
  isStageWeak,
  relationPhraseEn,
  relationPhraseKo,
  timeBranch,
  timeStage,
  timeStem,
} from '../../signals/sajuSignals'
import {
  aspectBetween,
  aspectsOf,
  ceres,
  getPlanet,
  houseCusp,
  pallas,
  planetsInHouse,
} from '../../signals/astroSignals'
import { houseLabel, paragraph, signLabel } from '../../templates/sentences'

interface ChildEstimate {
  min: number
  max: number
  confidence: 'high' | 'medium' | 'low'
  score: number
}

function estimateChildCount(input: BuilderInput): ChildEstimate {
  const { saju, astro } = input
  let score = 0

  // 사주 식상 강도 (0-5점)
  const sib = countSibsin(saju)
  const sikSangCount = sib.식신 + sib.상관
  score += Math.min(5, sikSangCount * 1.5)

  // 시주 12운성 (-2 ~ +2)
  const ts = timeStage(saju)
  if (isStageStrong(ts)) score += 2
  else if (isStageWeak(ts)) score -= 2

  // 점성 5집 행성 수 (0-3점)
  const fifth = planetsInHouse(astro, 5)
  score += Math.min(3, fifth.length * 1.5)

  // Moon in 5th or aspecting 5th ruler (+1)
  const moon = getPlanet(astro, 'Moon')
  if (moon && moon.house === 5) score += 1

  // Jupiter contact with 5th (+1) — sit in 5th or rule 5th
  const jupiter = getPlanet(astro, 'Jupiter')
  if (jupiter && jupiter.house === 5) score += 1.5
  else if (jupiter && aspectsOf(astro, 'Jupiter').some(
    (a) =>
      (a.type === 'trine' || a.type === 'sextile' || a.type === 'conjunction') &&
      (a.from?.house === 5 || a.to?.house === 5)
  )) score += 1

  // Saturn contact with 5th (-1) — sit in 5th or hard aspect
  const saturn = getPlanet(astro, 'Saturn')
  if (saturn && saturn.house === 5) score -= 1.5
  else if (saturn && aspectsOf(astro, 'Saturn').some(
    (a) =>
      (a.type === 'square' || a.type === 'opposition') &&
      (a.from?.house === 5 || a.to?.house === 5)
  )) score -= 1

  // Pallas (wise nurturing) +0.5
  if (pallas(astro)?.house === 5) score += 0.5
  // Ceres (nurturing) +0.5
  if (ceres(astro)?.house === 5) score += 0.5

  // Geokguk 식신격 +1
  const gk = geokgukType(saju)
  if (gk.includes('식신') || gk.includes('상관')) score += 1

  // Map score → range
  if (score >= 8) return { min: 3, max: 5, confidence: 'high', score }
  if (score >= 5) return { min: 2, max: 3, confidence: 'medium', score }
  if (score >= 2) return { min: 1, max: 2, confidence: 'medium', score }
  return { min: 0, max: 1, confidence: 'low', score }
}

export function buildChildren(input: BuilderInput): DomainNarrative {
  const { saju, astro } = input
  const sajuUsed: string[] = []
  const astroUsed: string[] = []
  const fusionUsed: string[] = [] // children has no fusion domain

  const sib = countSibsin(saju)
  const cat = categoryCount(sib)
  sajuUsed.push('sibsin.count')

  const tStem = timeStem(saju)
  const tBranch = timeBranch(saju)
  if (tStem || tBranch) sajuUsed.push('pillars.time.stem', 'pillars.time.branch')

  const ts = timeStage(saju)
  if (ts) sajuUsed.push('twelveStages.time')

  const gk = geokgukType(saju)
  if (gk) sajuUsed.push('geokguk')

  const fifth = planetsInHouse(astro, 5)
  if (fifth.length > 0) astroUsed.push('houses.5.planets')
  const fifthCusp = houseCusp(astro, 5)
  if (fifthCusp) astroUsed.push('houses.5.cusp')

  const moon = getPlanet(astro, 'Moon')
  const jupiter = getPlanet(astro, 'Jupiter')
  const saturn = getPlanet(astro, 'Saturn')
  if (moon) astroUsed.push('planets.moon')
  if (jupiter) astroUsed.push('planets.jupiter')
  if (saturn) astroUsed.push('planets.saturn')

  const ce = ceres(astro)
  const pa = pallas(astro)
  if (ce) astroUsed.push('asteroids.ceres')
  if (pa) astroUsed.push('asteroids.pallas')

  // Estimate
  const est = estimateChildCount(input)

  // ── Paragraph 1: 자녀 운의 큰 그림
  const sikSangTotal = cat.식상
  const p1ko = paragraph([
    sikSangTotal >= 2
      ? '당신은 자녀와의 인연이 깊이 있는 사람이에요.'
      : sikSangTotal === 0
        ? '자녀와의 인연은 의식적으로 만들어가는 흐름이에요.'
        : '자녀와의 인연은 잔잔하고 안정적으로 흘러요.',
    `표현과 창조의 결이 ${childCountFlavorKo(sikSangTotal)} 흘러서, ${childFlavorKo(sikSangTotal)}.`,
    fifth.length > 0
      ? `창조 영역에 ${fifth.map((p) => planetLabelChildrenKo(p.name)).join(', ')}이 머물러, 자녀·창작·놀이의 색이 또렷하게 활성화돼 있어요.`
      : '창조 영역이 비어 있어, 자녀운은 다른 기운이 함께 받쳐줘요.',
  ])
  const p1en = paragraph([
    sikSangTotal >= 2
      ? 'Your bond with children is naturally deep.'
      : sikSangTotal === 0
        ? 'Your bond with children grows through conscious choice.'
        : 'Your bond with children runs calm and stable.',
    `Your creative-expression dynamic comes through as ${sikSangTotal} strong stream${sikSangTotal === 1 ? '' : 's'} — ${childFlavorEn(sikSangTotal)}.`,
    fifth.length > 0
      ? `With ${fifth.map((p) => p.name).join(', ')} inside the 5th house, the seat of children, creation and play is fully active.`
      : 'With an empty 5th house, the children-related markers are carried by other placements.',
  ])

  // ── Paragraph 2: 자녀 수 추정 + 시주 분석
  const p2ko = paragraph([
    `자녀 수 추정: ${est.min === est.max ? `${est.min}명 부근` : `${est.min}~${est.max}명`} (확신도 ${confLabelKo(est.confidence)}).`,
    '표현과 창조의 결, 그리고 별의 자녀 영역을 함께 보면 이 범위가 나와요.',
    `시간의 기둥에 해당하는 자녀 영역은 ${stageFlavorKo(ts)}.`,
    '한 가지 결만으로 정확한 수가 결정되지 않으니 참고용으로 봐주세요.',
  ])
  const p2en = paragraph([
    `Estimated count: ${est.min === est.max ? `around ${est.min}` : `${est.min}–${est.max}`} (confidence ${est.confidence}).`,
    'Combining your creative-expression dynamic with the natal 5th house gives this range.',
    `Your late-life pillar marks the area of children itself; ${stageFlavorEn(ts)}.`,
    'The chart alone cannot fix an exact number — treat this as guidance, not a verdict.',
  ])

  // ── Paragraph 3: 자녀 관계의 결 (advanced)
  const deepKo: string[] = []
  const deepEn: string[] = []
  if (jupiter && jupiter.house === 5) {
    deepKo.push('확장의 별이 창조 영역에 있어, 자녀가 행운과 확장의 통로가 되는 배치예요.')
    deepEn.push('Jupiter in the 5th places children at the channel of luck and expansion.')
  } else if (jupiter && jupiter.house) {
    deepKo.push(`확장의 별이 ${childrenHouseHintKo(jupiter.house)} 영역에서 자녀운을 간접적으로 받쳐줘요.`)
    deepEn.push(`Jupiter supports your child-related markers indirectly from your ${houseLabel(jupiter.house, 'en')}.`)
  }
  if (saturn && saturn.house === 5) {
    deepKo.push('책임의 별이 창조 영역에 있어, 자녀가 늦게 오거나 적은 수로 깊은 관계를 만드는 흐름이에요.')
    deepEn.push('Saturn in the 5th delays or condenses children — fewer in number, deeper in bond.')
  }
  if (moon && moon.house === 5) {
    deepKo.push('감정의 별이 창조 영역에 있어, 자녀와의 정서 교감이 깊어요.')
    deepEn.push('Moon in the 5th brings deep emotional attunement with children.')
  }
  if (pa) {
    deepKo.push(`지혜로운 양육의 별이 ${signLabel(pa.sign, 'ko')}에 머물러, 지혜롭게 키우는 성향이 있어요.`)
    deepEn.push(`Pallas in ${signLabel(pa.sign, 'en')} ${houseLabel(pa.house, 'en')} gives a wise-nurturing grain.`)
  }
  if (ce) {
    deepKo.push(`양육의 별이 ${signLabel(ce.sign, 'ko')}에 자리잡아, ${ceresFlavorKo(ce.house)} 양육 스타일이 흘러요.`)
    deepEn.push(`Ceres in ${signLabel(ce.sign, 'en')} ${houseLabel(ce.house, 'en')} brings ${ceresFlavorEn(ce.house)} nurturing.`)
  }
  if (gk.includes('식신')) {
    deepKo.push('인생의 큰 패턴이 여유로운 표현과 창조의 흐름이라, 자녀를 키우는 일 자체가 자기 표현의 연장이에요.')
    deepEn.push('Your life-pattern is one of easeful expression and creation — raising children is itself an extension of self-expression.')
  }
  // Calendar-engine: 5th-house profection year (자녀의 행운점 활성) + harmonics 5 (창조의 결)
  const prof = input.calendarSignals?.profectionCurrent
  if (prof?.house === 5) {
    fusionUsed.push('calendarSignals.profections')
    deepKo.push('올해는 창조 영역이 활성돼 있어, 임신·출산·자녀와의 결합 흐름이 다른 어느 해보다 가까이 와 있어요.')
    deepEn.push('This year activates house 5 — conception, birth and child-bonding flows are closer than in any other year.')
  }
  const h5 = input.calendarSignals?.harmonics?.[5]
  if (h5 && h5.strength >= 40) {
    fusionUsed.push('calendarSignals.harmonics.5')
    deepKo.push('창의의 깊은 자질이 강하게 깔려 있어, 자녀가 있든 없든 ‘다음 세대로 무엇을 흘려보낼지’가 평생의 과제로 묻혀 있어요.')
    deepEn.push('Harmonics 5 runs strongly — whether or not biological children appear, "what you pass to the next generation" remains a lifelong grain.')
  }
  // Saju relations — time pillar weighted (자녀 자리 = 시주)
  const relKoChildren = relationPhraseKo(input.calendarSignals?.sajuRelations, {
    preferPillar: 'time',
  })
  const relEnChildren = relationPhraseEn(input.calendarSignals?.sajuRelations, {
    preferPillar: 'time',
  })
  if (relKoChildren) {
    sajuUsed.push('calendarSignals.sajuRelations')
    deepKo.push(`${relKoChildren} 자녀와의 인연 색이 일찍부터 정해져 있는 흐름이에요.`)
    if (relEnChildren) deepEn.push(`${relEnChildren} The colour of the child-bond is pre-set early.`)
  }
  const p3ko = paragraph(deepKo.length ? deepKo : [
    '자녀와의 인연은 일상의 흐름을 따라 자연스럽게 흘러요. 큰 드라마보다 잔잔한 연속이 특징이에요.'
  ])
  const p3en = paragraph(deepEn.length ? deepEn : [
    'Because the 5th-house and creative-expression signals sit in a steady alignment, your child-related markers follow the calm grain of daily life.'
  ])

  const paragraphs: Paragraph[] = [
    { ko: p1ko, en: p1en },
    { ko: p2ko, en: p2en },
    { ko: p3ko, en: p3en },
  ]

  return {
    id: 'children',
    title: { ko: '자녀', en: 'Children' },
    paragraphs,
    signals: { saju: sajuUsed, astro: astroUsed, fusion: fusionUsed },
    estimatedChildCount: {
      min: est.min,
      max: est.max,
      confidence: est.confidence,
    },
  }
}

function childFlavorKo(n: number): string {
  if (n === 0) return '자녀운은 다른 기운들이 함께 받쳐줘요'
  if (n === 1) return '자녀와 안정적인 인연이 한 갈래로 이어져요'
  if (n === 2) return '자녀와의 인연이 자연스럽게 자리잡아요'
  return '자녀 인연이 풍성하게 흘러요'
}

// 표현·창조 결의 강도를 "겹" 없이 자연 한국어로
function childCountFlavorKo(n: number): string {
  if (n === 0) return '비어 있고'
  if (n === 1) return '한 갈래로 잔잔하게'
  if (n === 2) return '두 갈래로 또렷하게'
  return '풍성하게'
}
function childFlavorEn(n: number): string {
  if (n === 0) return 'other signals carry the child-related thread'
  if (n === 1) return 'a single, stable thread of bond'
  if (n === 2) return 'a clear, flowing bond'
  return 'a rich, abundant signal'
}

function confLabelKo(c: 'high' | 'medium' | 'low'): string {
  if (c === 'high') return '높음'
  if (c === 'medium') return '중간'
  return '낮음'
}

function stageFlavorKo(stage: string | undefined): string {
  if (!stage) return '일상에 자연스럽게 자리잡는 분위기예요'
  if (['장생', '관대', '임관', '왕지', '건록', '제왕'].includes(stage))
    return '강하게 살아 있는 기운이에요'
  if (['병', '사', '묘', '절', '태'].includes(stage))
    return '휴식과 비움의 흐름이 있어요'
  return '잔잔한 기운이 흘러요'
}
function stageFlavorEn(stage: string | undefined): string {
  if (!stage) return 'the bond with children settles naturally into daily life'
  if (['장생', '관대', '임관', '왕지', '건록', '제왕'].includes(stage))
    return 'this house of children carries strong, alive energy'
  if (['병', '사', '묘', '절', '태'].includes(stage))
    return 'this house of children carries rest and emptying energy'
  return 'a calm energy fills this house of children'
}

const CERES_HOUSE_FLAVOR_KO: Record<number, string> = {
  1: '자기 모습을 통한',
  2: '안정과 자원으로의',
  3: '대화로 가르치는',
  4: '집·뿌리 중심의',
  5: '놀이와 창작 중심의',
  6: '일상의 돌봄으로',
  7: '파트너와 함께 짓는',
  8: '깊은 변화 속의',
  9: '여행·신념을 통한',
  10: '공적 자리에서의',
  11: '공동체와 함께하는',
  12: '내적·치유적인',
}
const CERES_HOUSE_FLAVOR_EN: Record<number, string> = {
  1: 'through your own presence',
  2: 'stability- and resource-based',
  3: 'teaching-through-conversation',
  4: 'home- and roots-centered',
  5: 'through play and creation',
  6: 'daily-care',
  7: 'co-built with a partner',
  8: 'through deep transformation',
  9: 'through travel and belief',
  10: 'from a public seat',
  11: 'community-anchored',
  12: 'inward and healing',
}
function ceresFlavorKo(h: number): string {
  return CERES_HOUSE_FLAVOR_KO[h] ?? '독자적인 색의'
}
function ceresFlavorEn(h: number): string {
  return CERES_HOUSE_FLAVOR_EN[h] ?? 'a singular style of'
}

// children 섹션에서 사용하는 행성명 자연어
function planetLabelChildrenKo(name: string): string {
  const map: Record<string, string> = {
    Sun: '태양', Moon: '달', Mercury: '수성', Venus: '금성', Mars: '화성',
    Jupiter: '목성', Saturn: '토성', Uranus: '천왕성', Neptune: '해왕성', Pluto: '명왕성',
  }
  return map[name] ?? name
}

// children 섹션 하우스 의미
function childrenHouseHintKo(h: number): string {
  const map: Record<number, string> = {
    1: '정체성',
    2: '재산',
    3: '소통',
    4: '가정',
    5: '창조',
    6: '일상',
    7: '관계',
    8: '심층',
    9: '확장',
    10: '사회 무대',
    11: '공동체',
    12: '내면',
  }
  return map[h] || '독자적인'
}
