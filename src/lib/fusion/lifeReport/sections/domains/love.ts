// src/lib/fusion/lifeReport/sections/domains/love.ts
// Love / 사랑·배우자·이상형 deterministic narrative builder.

import type { BuilderInput, DomainNarrative, Paragraph } from '../../types'
import {
  categoryCount,
  countSibsin,
  currentDaeun,
  dayBranch,
  findDaeunByCategory,
} from '../../signals/sajuSignals'
import {
  aspectBetween,
  getPlanet,
  houseCusp,
  juno,
  partOfFortune,
  planetsInHouse,
  vertex,
} from '../../signals/astroSignals'
import {
  aspectQuality,
  houseLabel,
  paragraph,
  signLabel,
} from '../../templates/sentences'

const BRANCH_FLAVOR_KO: Record<string, string> = {
  子: '예민하고 깊은',
  丑: '책임감 있고 다정한',
  寅: '활기차고 모험적인',
  卯: '부드럽고 우아한',
  辰: '책임감 있고 든든한',
  巳: '지적이고 감각적인',
  午: '뜨겁고 표현 잘하는',
  未: '온화하고 헌신적인',
  申: '명민하고 자유로운',
  酉: '예리하고 깔끔한',
  戌: '신의 있고 보호적인',
  亥: '꿈 많고 헌신적인',
}
const BRANCH_FLAVOR_EN: Record<string, string> = {
  子: 'sensitive and deep',
  丑: 'responsible and warm',
  寅: 'lively and adventurous',
  卯: 'gentle and graceful',
  辰: 'responsible and grounding',
  巳: 'sharp-minded and sensual',
  午: 'warm and expressive',
  未: 'soft and devoted',
  申: 'quick-witted and free',
  酉: 'precise and clean',
  戌: 'loyal and protective',
  亥: 'dreamy and devoted',
}

export function buildLove(input: BuilderInput): DomainNarrative {
  const { saju, astro, fusion } = input
  const sajuUsed: string[] = []
  const astroUsed: string[] = []
  const fusionUsed: string[] = []

  const sib = countSibsin(saju)
  const cat = categoryCount(sib)
  sajuUsed.push('sibsin.count', 'sibsin.categoryCount')

  const jeongGwan = sib.정관
  const pyenGwan = sib.편관
  const jeongJae = sib.정재
  const pyenJae = sib.편재
  const isFemale = saju.input.gender === 'female'

  const dBranch = dayBranch(saju)
  if (dBranch) sajuUsed.push('pillars.day.branch')

  const venus = getPlanet(astro, 'Venus')
  const mars = getPlanet(astro, 'Mars')
  const moon = getPlanet(astro, 'Moon')
  if (venus) astroUsed.push('planets.venus')
  if (mars) astroUsed.push('planets.mars')
  if (moon) astroUsed.push('planets.moon')

  const seventh = houseCusp(astro, 7)
  if (seventh) astroUsed.push('houses.7')
  const seventhPlanets = planetsInHouse(astro, 7)
  if (seventhPlanets.length > 0) astroUsed.push('houses.7.planets')

  const asc = astro.ascendant
  if (asc) astroUsed.push('ascendant')

  const j = juno(astro)
  if (j) astroUsed.push('asteroids.juno')
  const vx = vertex(astro)
  if (vx) astroUsed.push('vertex')
  const pof = partOfFortune(astro)
  const pofInSeventh = pof?.house === 7
  if (pof) astroUsed.push('partOfFortune')

  const venusSaturn = venus && getPlanet(astro, 'Saturn')
    ? aspectBetween(astro, 'Venus', 'Saturn')
    : undefined
  const venusMars = venus && mars ? aspectBetween(astro, 'Venus', 'Mars') : undefined
  const vertexVenus = vx && venus ? aspectBetween(astro, 'Vertex', 'Venus') : undefined

  // Timing — sibsin daeun for partner
  const partnerCat = isFemale ? '관성' : '재성'
  const partnerDaeun = findDaeunByCategory(saju, partnerCat)
  const cur = currentDaeun(saju)
  if (cur) sajuUsed.push('cycles.currentDaeun')
  if (partnerDaeun) sajuUsed.push('cycles.daeunCycles')

  // SR sun in 7th = relationship year
  const srPlanets = astro.solarReturn?.chart?.planets ?? []
  const srSunInSeventh = srPlanets.some((p) => p.name === 'Sun' && p.house === 7)
  if (srSunInSeventh) astroUsed.push('solarReturn.sun.house7')

  // Fusion love confirms
  const loveConfirms = fusion?.byDomain?.love?.confirms ?? []
  if (loveConfirms.length > 0) {
    fusionUsed.push(...loveConfirms.slice(0, 3).map((m) => m.rule.id))
  }

  // ── Paragraph 1
  const styleKo = pickLoveStyleKo(cat, jeongGwan, pyenGwan, jeongJae, pyenJae, isFemale)
  const styleEn = pickLoveStyleEn(cat, jeongGwan, pyenGwan, jeongJae, pyenJae, isFemale)
  const venusBlurb = venus
    ? `점성의 금성이 ${signLabel(venus.sign, 'ko')}·${houseLabel(venus.house, 'ko')}에 있어 ${venusFlavorKo(venus.sign, venus.house)}이 사랑의 색깔이에요.`
    : ''
  const venusBlurbEn = venus
    ? `Venus in ${signLabel(venus.sign, 'en')} (${houseLabel(venus.house, 'en')}) gives love the flavor of ${venusFlavorEn(venus.sign, venus.house)}.`
    : ''
  const p1ko = paragraph([styleKo, venusBlurb])
  const p1en = paragraph([styleEn, venusBlurbEn])

  // ── Paragraph 2: 배우자 인상
  const branchFlavor = BRANCH_FLAVOR_KO[dBranch] || '독특한'
  const branchFlavorEn = BRANCH_FLAVOR_EN[dBranch] || 'distinctive'
  const seventhSignKo = seventh?.sign ? signLabel(seventh.sign, 'ko') : '하늘'
  const seventhSignEn = seventh?.sign ? signLabel(seventh.sign, 'en') : 'the sky'

  const p2ko = paragraph([
    `배우자상은 ${branchFlavor} 사람이에요.`,
    `일지 ${dBranch}는 ${branchFlavor} 동반자를 끌어와요.`,
    seventh
      ? `점성의 7집은 ${seventhSignKo}에서 시작해서, 파트너에게서 ${seventhSignFlavorKo(seventh.sign)}을 바라게 해요.`
      : '',
    seventhPlanets.length > 0
      ? `7집 안에 ${seventhPlanets.map((p) => p.name).join('·')}이 들어있어, 관계가 인생의 한가운데로 들어와요.`
      : '',
  ])
  const p2en = paragraph([
    `Your spouse archetype reads as ${branchFlavorEn}.`,
    `The day branch ${dBranch} draws in a ${branchFlavorEn} companion.`,
    seventh
      ? `Your 7th house opens in ${seventhSignEn}, so you ask for ${seventhSignFlavorEn(seventh.sign)} from a partner.`
      : '',
    seventhPlanets.length > 0
      ? `With ${seventhPlanets.map((p) => p.name).join(', ')} inside the 7th, relationships sit at the center of your life-stage.`
      : '',
  ])

  // ── Paragraph 3: 고급 지표 (vertex, juno, PoF, aspects)
  const deepKo: string[] = []
  const deepEn: string[] = []
  if (vertexVenus) {
    deepKo.push(
      `Vertex와 금성이 ${aspectQuality(vertexVenus.type, 'ko')} 운명적 만남을 한 번 강하게 기록해 둔 패턴이에요.`
    )
    deepEn.push(
      `Vertex and Venus ${aspectQuality(vertexVenus.type, 'en')}, marking one fated encounter into the chart.`
    )
  } else if (vx) {
    deepKo.push(
      `Vertex가 ${signLabel(vx.sign, 'ko')}·${houseLabel(vx.house, 'ko')}에 있어 그 자리가 운명적 만남의 좌표가 돼요.`
    )
    deepEn.push(
      `Your Vertex sits in ${signLabel(vx.sign, 'en')} ${houseLabel(vx.house, 'en')}, marking the coordinate of fated encounter.`
    )
  }
  if (j) {
    deepKo.push(
      `결혼별 Juno는 ${signLabel(j.sign, 'ko')}·${houseLabel(j.house, 'ko')}에 있어, 결혼 자체에 ${junoFlavorKo(j.house)}이 흐르게 해요.`
    )
    deepEn.push(
      `Juno (marriage asteroid) sits in ${signLabel(j.sign, 'en')} ${houseLabel(j.house, 'en')}, so marriage carries the tone of ${junoFlavorEn(j.house)}.`
    )
  }
  if (pofInSeventh) {
    deepKo.push(`Part of Fortune이 7집에 자리해서, 파트너십이 곧 행운의 통로가 되는 배치에요.`)
    deepEn.push(`Part of Fortune sits in the 7th — partnership is itself the channel of luck.`)
  }
  if (venusSaturn) {
    deepKo.push(
      `금성과 토성이 ${aspectQuality(venusSaturn.type, 'ko')} 성숙한 파트너, 시간이 깊어지는 사랑을 만들어요.`
    )
    deepEn.push(
      `Venus-Saturn ${aspectQuality(venusSaturn.type, 'en')}, producing a mature partner and love that deepens with time.`
    )
  }
  if (venusMars) {
    deepKo.push(
      `금성·화성 어스펙트가 ${aspectQuality(venusMars.type, 'ko')} 끌림과 욕망의 결을 분명히 해요.`
    )
    deepEn.push(
      `Venus-Mars ${aspectQuality(venusMars.type, 'en')}, defining the grain of attraction and desire.`
    )
  }
  if (loveConfirms.length > 0) {
    deepKo.push(`그리고 ${loveConfirms[0].rule.narrative.confirm}`)
    deepEn.push(`Additionally, ${loveConfirms[0].rule.meaning}.`)
  }
  const p3ko = paragraph(deepKo.length ? deepKo : [
    '왜냐하면 사랑의 고급 신호들이 잔잔히 정렬되어 있어, 큰 운명적 흔들림보다는 일상 안에서 천천히 깊어지는 흐름이에요.'
  ])
  const p3en = paragraph(deepEn.length ? deepEn : [
    'Because the deeper love signals sit in a calm alignment, this lifetime favors a slow deepening over a fated lightning-strike.'
  ])

  // ── Paragraph 4: 타이밍
  const timingKo: string[] = ['결정적 시기:']
  const timingEn: string[] = ['Decisive windows:']
  if (partnerDaeun) {
    timingKo.push(
      `${partnerDaeun.age}세 대운(${partnerCat} 시작)이 ${isFemale ? '배우자' : '인연'}의 문을 정식으로 열어줘요.`
    )
    timingEn.push(
      `Age ${partnerDaeun.age} daeun (${partnerCat} cycle) formally opens the door to ${isFemale ? 'spouse' : 'partnership'}.`
    )
  }
  if (cur && cur.sibsin) {
    timingKo.push(`지금 흐르는 ${cur.sibsin} 대운도 관계의 결을 천천히 다듬어줘요.`)
    timingEn.push(`Your current ${cur.sibsin} daeun is also tuning the relational grain.`)
  }
  if (srSunInSeventh) {
    timingKo.push(`올해 Solar Return 태양이 7집에 들어, 한 해 동안 관계가 무게중심을 잡아요.`)
    timingEn.push(`This year's Solar Return Sun lands in the 7th — relationship becomes the center-of-mass for the year.`)
  }
  if (timingKo.length === 1) {
    timingKo.push('대운 흐름이 점차 익는 구간이라, 한 해 한 해 신호가 모이고 있어요.')
    timingEn.push('Your daeun is in a ripening stretch — signals accumulate season by season.')
  }
  const p4ko = paragraph(timingKo)
  const p4en = paragraph(timingEn)

  const paragraphs: Paragraph[] = [
    { ko: p1ko, en: p1en },
    { ko: p2ko, en: p2en },
    { ko: p3ko, en: p3en },
    { ko: p4ko, en: p4en },
  ]

  return {
    id: 'love',
    title: { ko: '사랑·배우자', en: 'Love & Partnership' },
    paragraphs,
    signals: { saju: sajuUsed, astro: astroUsed, fusion: fusionUsed },
  }
}

// ── helpers
function pickLoveStyleKo(
  cat: Record<string, number>,
  jg: number,
  pg: number,
  jj: number,
  pj: number,
  isFemale: boolean
): string {
  if (isFemale && jg >= 1 && pg === 0)
    return '당신은 안정과 깊이를 중시하는 관계형이에요. 정관이 한 자리에 있어 한 사람과의 진중한 관계로 운이 흘러요.'
  if (isFemale && pg >= 2)
    return '당신은 강렬하고 본능적인 끌림에 반응하는 관계형이에요. 편관이 강해 자극적인 만남이 잦지만, 안정 구간이 따로 필요해요.'
  if (!isFemale && jj >= 1 && pj === 0)
    return '당신은 안정과 신뢰를 우선하는 사랑형이에요. 정재가 한 자리에 있어 한 사람과 길게 가는 관계가 어울려요.'
  if (!isFemale && pj >= 2)
    return '당신은 자유롭고 변화에 끌리는 사랑형이에요. 편재가 강해 다양한 만남을 거치며 자기 결을 찾아가요.'
  if (cat.관성 === 0 && isFemale)
    return '관성이 잠잠해서 결혼·관계의 형식보다 자기 자신을 먼저 채우는 흐름이에요.'
  if (cat.재성 === 0 && !isFemale)
    return '재성이 잠잠해서 관계의 형식보다 자기 작업을 먼저 채우는 흐름이에요.'
  return '당신은 관계의 깊이와 가능성을 동시에 보는 사람이에요.'
}
function pickLoveStyleEn(
  cat: Record<string, number>,
  jg: number,
  pg: number,
  jj: number,
  pj: number,
  isFemale: boolean
): string {
  if (isFemale && jg >= 1 && pg === 0)
    return 'You value steadiness and depth in love. A single 정관 keeps your luck running toward one serious bond.'
  if (isFemale && pg >= 2)
    return 'You respond to intense, instinctive attraction. Strong 편관 brings stimulating encounters but you need a separate steady zone.'
  if (!isFemale && jj >= 1 && pj === 0)
    return 'You favor stability and trust in love. A single 정재 fits a long, steady bond.'
  if (!isFemale && pj >= 2)
    return 'You move toward freedom and variety. Strong 편재 lets you find your grain through many meetings.'
  if (cat.관성 === 0 && isFemale)
    return 'With 관성 quiet, this season prioritizes filling yourself before the form of partnership.'
  if (cat.재성 === 0 && !isFemale)
    return 'With 재성 quiet, this season prioritizes your own work before the form of partnership.'
  return 'You hold depth and possibility in love at once.'
}

const VENUS_SIGN_FLAVOR_KO: Record<string, string> = {
  Aries: '솔직하고 빠른 끌림',
  Taurus: '감각과 안정',
  Gemini: '대화와 가벼움',
  Cancer: '돌봄과 안전감',
  Leo: '드라마와 표현',
  Virgo: '섬세한 헌신',
  Libra: '균형과 미감',
  Scorpio: '깊이와 강도',
  Sagittarius: '자유와 모험',
  Capricorn: '책임과 시간',
  Aquarius: '독립과 친구 같은 사랑',
  Pisces: '환상과 동화',
}
const VENUS_SIGN_FLAVOR_EN: Record<string, string> = {
  Aries: 'frank, fast attraction',
  Taurus: 'sensation and stability',
  Gemini: 'conversation and lightness',
  Cancer: 'caring and safety',
  Leo: 'drama and expression',
  Virgo: 'fine-grained devotion',
  Libra: 'balance and aesthetics',
  Scorpio: 'depth and intensity',
  Sagittarius: 'freedom and adventure',
  Capricorn: 'responsibility and time',
  Aquarius: 'independence and friend-love',
  Pisces: 'fantasy and merging',
}
function venusFlavorKo(sign: string, _h: number): string {
  return VENUS_SIGN_FLAVOR_KO[sign] ?? '독특한 결'
}
function venusFlavorEn(sign: string, _h: number): string {
  return VENUS_SIGN_FLAVOR_EN[sign] ?? 'a singular note'
}

const SEVENTH_SIGN_FLAVOR_KO: Record<string, string> = {
  Aries: '솔직함과 추진력',
  Taurus: '안정과 신뢰',
  Gemini: '대화와 명민함',
  Cancer: '돌봄과 가족적 안전감',
  Leo: '드라마와 따뜻함',
  Virgo: '세심함과 도움',
  Libra: '균형과 미감',
  Scorpio: '깊이와 진정성',
  Sagittarius: '시야와 자유',
  Capricorn: '책임과 무게',
  Aquarius: '독립과 동료감',
  Pisces: '공감과 부드러움',
}
const SEVENTH_SIGN_FLAVOR_EN: Record<string, string> = {
  Aries: 'frankness and drive',
  Taurus: 'stability and trust',
  Gemini: 'conversation and quickness',
  Cancer: 'care and family-safety',
  Leo: 'drama and warmth',
  Virgo: 'fine attention and help',
  Libra: 'balance and beauty',
  Scorpio: 'depth and honesty',
  Sagittarius: 'breadth and freedom',
  Capricorn: 'responsibility and gravitas',
  Aquarius: 'independence and friend-feel',
  Pisces: 'empathy and softness',
}
function seventhSignFlavorKo(sign: string | undefined): string {
  return (sign && SEVENTH_SIGN_FLAVOR_KO[sign]) ?? '독특한 결'
}
function seventhSignFlavorEn(sign: string | undefined): string {
  return (sign && SEVENTH_SIGN_FLAVOR_EN[sign]) ?? 'a singular grain'
}

const JUNO_HOUSE_FLAVOR_KO: Record<number, string> = {
  1: '자기 정체성을 같이 짓는 결혼',
  2: '재정 안정을 함께 짓는 결혼',
  3: '대화·이웃 같은 결혼',
  4: '가정과 뿌리 중심의 결혼',
  5: '창작·자녀 중심의 결혼',
  6: '일상·돌봄 중심의 결혼',
  7: '정통적이고 공식적인 결혼',
  8: '깊은 변혁을 거치는 결혼',
  9: '신념·가르침을 공유하는 결혼',
  10: '사회적 무게를 함께 짓는 결혼',
  11: '친구 같은·미래 비전 결혼',
  12: '내면·치유 중심의 결혼',
}
const JUNO_HOUSE_FLAVOR_EN: Record<number, string> = {
  1: 'marriage that builds identity together',
  2: 'marriage built on shared finances',
  3: 'marriage that lives in conversation',
  4: 'marriage centered on home and roots',
  5: 'marriage around creation and children',
  6: 'marriage in daily care and craft',
  7: 'classic, formal partnership',
  8: 'marriage through deep transformation',
  9: 'marriage of shared belief and teaching',
  10: 'marriage that carries social weight together',
  11: 'friend-style, future-oriented marriage',
  12: 'inward, healing-centered marriage',
}
function junoFlavorKo(h: number): string {
  return JUNO_HOUSE_FLAVOR_KO[h] ?? '독자적인 결혼의 결'
}
function junoFlavorEn(h: number): string {
  return JUNO_HOUSE_FLAVOR_EN[h] ?? 'a singular marital grain'
}
