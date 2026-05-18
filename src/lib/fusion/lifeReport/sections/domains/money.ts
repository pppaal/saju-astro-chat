// src/lib/fusion/lifeReport/sections/domains/money.ts
// Money / 재물·돈 deterministic narrative builder.

import type { BuilderInput, DomainNarrative, Paragraph } from '../../types'
import {
  categoryCount,
  countSibsin,
  currentDaeun,
  findDaeunByCategory,
  geokgukType,
  isJonggeok,
  jonggeokType,
  luckyShinsalNames,
} from '../../signals/sajuSignals'
import {
  aspectBetween,
  aspectsOf,
  getPlanet,
  houseCusp,
  partOfFortune,
  planetsInHouse,
  solarReturnPlanetsInHouse,
} from '../../signals/astroSignals'
import {
  aspectQuality,
  houseLabel,
  paragraph,
  signLabel,
} from '../../templates/sentences'

export function buildMoney(input: BuilderInput): DomainNarrative {
  const { saju, astro, fusion } = input
  const sajuUsed: string[] = []
  const astroUsed: string[] = []
  const fusionUsed: string[] = []

  const sib = countSibsin(saju)
  const cat = categoryCount(sib)
  sajuUsed.push('sibsin.count', 'sibsin.categoryCount')

  const gk = geokgukType(saju)
  if (gk) sajuUsed.push('geokguk')

  const jong = isJonggeok(saju) ? jonggeokType(saju) : ''
  if (jong) sajuUsed.push('ultraAdvanced.jonggeok')

  const lucky = luckyShinsalNames(saju)
  if (lucky.length > 0) sajuUsed.push('shinsal.luckyList')

  const wealthDaeun = findDaeunByCategory(saju, '재성')
  const cur = currentDaeun(saju)
  if (cur) sajuUsed.push('cycles.currentDaeun')
  if (wealthDaeun) sajuUsed.push('cycles.daeunCycles')

  const jupiter = getPlanet(astro, 'Jupiter')
  const venus = getPlanet(astro, 'Venus')
  if (jupiter) astroUsed.push('planets.jupiter')
  if (venus) astroUsed.push('planets.venus')

  const second = houseCusp(astro, 2)
  const eighth = houseCusp(astro, 8)
  if (second) astroUsed.push('houses.2')
  if (eighth) astroUsed.push('houses.8')

  const secondPlanets = planetsInHouse(astro, 2)
  const eighthPlanets = planetsInHouse(astro, 8)
  if (secondPlanets.length > 0) astroUsed.push('houses.2.planets')
  if (eighthPlanets.length > 0) astroUsed.push('houses.8.planets')

  const pof = partOfFortune(astro)
  const pofIn2nd = pof?.house === 2
  const pofIn8th = pof?.house === 8
  if (pof) astroUsed.push('partOfFortune')

  const jupiterAspects = jupiter ? aspectsOf(astro, 'Jupiter') : []
  const jupiterVenus =
    jupiter && venus ? aspectBetween(astro, 'Jupiter', 'Venus') : undefined

  // SR money — Jupiter or Venus in 2/8 this year
  const sr2 = solarReturnPlanetsInHouse(astro, 2)
  const sr8 = solarReturnPlanetsInHouse(astro, 8)
  if (sr2.length || sr8.length) astroUsed.push('solarReturn.houses')

  const moneyConfirms = fusion?.byDomain?.money?.confirms ?? []
  if (moneyConfirms.length > 0)
    fusionUsed.push(...moneyConfirms.slice(0, 3).map((m) => m.rule.id))

  // ── Paragraph 1
  const wealthTotal = cat.재성
  const p1ko = paragraph([
    wealthFlavorKo(wealthTotal, sib.정재, sib.편재),
    second && second.sign
      ? `점성의 2집은 ${signLabel(second.sign, 'ko')}에서 시작해서, 돈을 ${secondSignFlavorKo(second.sign)}으로 다루는 결이에요.`
      : '',
    jupiter
      ? `행운의 별 목성이 ${signLabel(jupiter.sign, 'ko')}·${houseLabel(jupiter.house, 'ko')}에 있어 ${jupiterFlavorKo(jupiter.house)}의 확장이 있어요.`
      : '',
  ])
  const p1en = paragraph([
    wealthFlavorEn(wealthTotal, sib.정재, sib.편재),
    second && second.sign
      ? `Your 2nd house opens in ${signLabel(second.sign, 'en')}, so you handle money in a ${secondSignFlavorEn(second.sign)} way.`
      : '',
    jupiter
      ? `Jupiter, the planet of luck, sits in ${signLabel(jupiter.sign, 'en')} ${houseLabel(jupiter.house, 'en')}, expanding ${jupiterFlavorEn(jupiter.house)}.`
      : '',
  ])

  // ── Paragraph 2: 시기
  const timingKo: string[] = []
  const timingEn: string[] = []
  if (cur && cur.sibsin) {
    timingKo.push(`지금 흐르는 ${cur.sibsin} 대운이 돈의 흐름에 ${daeunMoneyFlavorKo(cur.sibsin)}을 만들어요.`)
    timingEn.push(`Your current ${cur.sibsin} daeun ${daeunMoneyFlavorEn(cur.sibsin)} for money.`)
  }
  if (wealthDaeun && (!cur || cur.age !== wealthDaeun.age)) {
    timingKo.push(`${wealthDaeun.age}세 부근 재성 대운이 돈의 큰 흐름이 열리는 구간이에요.`)
    timingEn.push(`Around age ${wealthDaeun.age}, the wealth (재성) daeun opens the larger money flow.`)
  }
  if (sr2.length > 0) {
    timingKo.push(`올해 Solar Return은 2집에 ${sr2.join('·')}이 들어와, 자기 자원의 해에요.`)
    timingEn.push(`This year's Solar Return puts ${sr2.join(', ')} in the 2nd — a year of personal resource.`)
  }
  if (sr8.length > 0) {
    timingKo.push(`그리고 SR 8집에 ${sr8.join('·')}이 있어 공동 자원·투자의 결도 열려 있어요.`)
    timingEn.push(`SR 8th carries ${sr8.join(', ')} as well — shared resources and investment are active.`)
  }
  if (timingKo.length === 0) {
    timingKo.push('대운과 진행은 잔잔한 자원 축적 구간이에요.')
    timingEn.push('Your daeun and progressions sit in a quiet accumulation stretch.')
  }
  const p2ko = paragraph(timingKo)
  const p2en = paragraph(timingEn)

  // ── Paragraph 3: 심화
  const deepKo: string[] = []
  const deepEn: string[] = []
  if (jong === '종재격') {
    deepKo.push('사주가 종재격이라, 재성에 모든 기운이 모이는 큰 재물 그릇이에요.')
    deepEn.push('Your saju runs as 종재격 (following-wealth) — all energy converges into a large money vessel.')
  } else if (gk.includes('재격')) {
    deepKo.push(`격국이 ${gk}이라, 돈을 직업과 자기 자리로 연결시키는 패턴이에요.`)
    deepEn.push(`Your geokguk is ${gk}, fusing money into career and seat.`)
  }
  if (pofIn2nd) {
    deepKo.push('Part of Fortune이 2집에 있어, 자기 자원이 곧 행운의 통로에요.')
    deepEn.push('Part of Fortune in the 2nd — personal resource is the literal channel of luck.')
  } else if (pofIn8th) {
    deepKo.push('Part of Fortune이 8집에 있어, 공동 자원·유산·투자로 행운이 열려요.')
    deepEn.push('Part of Fortune in the 8th — luck flows through shared resources, inheritance, investment.')
  }
  if (jupiterVenus) {
    deepKo.push(`목성과 금성이 ${aspectQuality(jupiterVenus.type, 'ko')} 풍요와 미감이 손잡고 자원에 닿아요.`)
    deepEn.push(`Jupiter-Venus ${aspectQuality(jupiterVenus.type, 'en')} — abundance and beauty hold hands at your resources.`)
  }
  const jupHardSquare = jupiterAspects.find(
    (a) => a.type === 'square' || a.type === 'opposition'
  )
  if (jupHardSquare) {
    deepKo.push(
      `목성이 ${jupHardSquare.to.name === 'Jupiter' ? jupHardSquare.from.name : jupHardSquare.to.name}와 ${aspectQuality(jupHardSquare.type, 'ko')} 있어 과한 확장은 조절해야 해요.`
    )
    deepEn.push(
      `Jupiter ${aspectQuality(jupHardSquare.type, 'en')} the other point, so over-expansion needs tempering.`
    )
  }
  if (lucky.length > 0) {
    deepKo.push(`사주 신살에는 ${lucky.slice(0, 3).join('·')}이 있어 재물 흐름을 잔잔히 도와요.`)
    deepEn.push(`Your saju 신살 includes ${lucky.slice(0, 3).join(' / ')}, quietly supporting the money flow.`)
  }
  if (moneyConfirms.length > 0) {
    deepKo.push(`그리고 ${moneyConfirms[0].rule.narrative.confirm}`)
    deepEn.push(`Additionally, ${moneyConfirms[0].rule.meaning}.`)
  }
  const p3ko = paragraph(deepKo.length ? deepKo : [
    '왜냐하면 자원 신호들이 평탄하게 정렬되어 있어, 큰 폭의 변동보다는 꾸준한 누적의 길이 어울려요.'
  ])
  const p3en = paragraph(deepEn.length ? deepEn : [
    'Because the wealth signals sit in a balanced array, steady accumulation fits better than wide swings.'
  ])

  // ── Paragraph 4: 실행 가이드
  const guideKo: string[] = ['일상 가이드 한 줄:']
  const guideEn: string[] = ['Daily handle:']
  if (sib.정재 >= sib.편재) {
    guideKo.push('정기적 수입의 안정 라인을 먼저 굳히고, 그 위에서 확장하세요.')
    guideEn.push('Lock the stable income line first, then expand on top of it.')
  } else {
    guideKo.push('한 곳에 묶지 말고 분산된 자원 흐름을 만드세요. 편재는 다채로움을 좋아해요.')
    guideEn.push('Do not pin everything to one source — spread the flow. 편재 likes variety.')
  }
  if (wealthDaeun) {
    guideKo.push(`${wealthDaeun.age}세 직전에 자원 그릇을 키워두면 흐름이 자연스럽게 따라옵니다.`)
    guideEn.push(`Enlarge the resource vessel just before age ${wealthDaeun.age} — the flow follows.`)
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
    id: 'money',
    title: { ko: '재물·돈', en: 'Money & Wealth' },
    paragraphs,
    signals: { saju: sajuUsed, astro: astroUsed, fusion: fusionUsed },
  }
}

function wealthFlavorKo(total: number, jeong: number, pyen: number): string {
  if (total >= 3) return '당신은 자원과 결과로 인생을 풀어내는 사람이에요. 사주 안 재성이 풍성해, 돈이 곧 표현 도구가 돼요.'
  if (total === 2)
    return jeong >= pyen
      ? '당신은 안정적 수입의 결로 자원을 쌓아가는 사람이에요.'
      : '당신은 다양한 수입 라인을 만들어내는 사람이에요.'
  if (total === 1)
    return jeong >= pyen
      ? '당신은 한 줄기 안정 수입을 깊이 만드는 결이에요.'
      : '당신은 부수입·기회 포착에 더 강한 결이에요.'
  return '재성이 잠잠해, 돈은 다른 신호들이 함께 짊어지는 구조에요. 직업·인성 라인이 자원의 통로가 돼요.'
}
function wealthFlavorEn(total: number, jeong: number, pyen: number): string {
  if (total >= 3) return 'You build life through resource and outcome. Rich 재성 makes money a literal medium of expression.'
  if (total === 2)
    return jeong >= pyen
      ? 'You build resources through stable, recurring income.'
      : 'You build resources by spinning up multiple income lines.'
  if (total === 1)
    return jeong >= pyen
      ? 'You deepen a single steady income line.'
      : 'You shine at side-income and opportunistic capture.'
  return 'With 재성 quiet, money is carried by other signals — career and 인성 act as the resource channel.'
}

const SECOND_SIGN_FLAVOR_KO: Record<string, string> = {
  Aries: '빠른 결단',
  Taurus: '꾸준한 축적',
  Gemini: '여러 줄기 흐름',
  Cancer: '저축과 보호',
  Leo: '과감한 표현',
  Virgo: '디테일한 관리',
  Libra: '균형과 미감 소비',
  Scorpio: '깊고 사적인 운용',
  Sagittarius: '시야 넓은 투자',
  Capricorn: '엄격한 축적',
  Aquarius: '독특한 시스템',
  Pisces: '직관적 흐름',
}
const SECOND_SIGN_FLAVOR_EN: Record<string, string> = {
  Aries: 'fast-decision',
  Taurus: 'patient-accumulation',
  Gemini: 'multi-channel',
  Cancer: 'savings-and-protection',
  Leo: 'bold-expressive',
  Virgo: 'detail-managed',
  Libra: 'balance-and-aesthetic',
  Scorpio: 'deep-private',
  Sagittarius: 'wide-vision',
  Capricorn: 'strict-accumulation',
  Aquarius: 'unique-systemic',
  Pisces: 'intuitive-flow',
}
function secondSignFlavorKo(s: string): string {
  return SECOND_SIGN_FLAVOR_KO[s] ?? '독특한 방식'
}
function secondSignFlavorEn(s: string): string {
  return SECOND_SIGN_FLAVOR_EN[s] ?? 'singular'
}

const JUPITER_HOUSE_FLAVOR_KO: Record<number, string> = {
  1: '자기 자신',
  2: '자원과 가치',
  3: '학습과 소통',
  4: '집과 뿌리',
  5: '창작과 자녀',
  6: '일터와 건강',
  7: '파트너십',
  8: '공동 자원',
  9: '시야와 여행',
  10: '공적 자리',
  11: '동료와 비전',
  12: '내면과 비밀',
}
const JUPITER_HOUSE_FLAVOR_EN: Record<number, string> = {
  1: 'the self',
  2: 'resources and value',
  3: 'learning and conversation',
  4: 'home and roots',
  5: 'creation and children',
  6: 'work and health',
  7: 'partnership',
  8: 'shared resources',
  9: 'vision and travel',
  10: 'the public seat',
  11: 'allies and future vision',
  12: 'inner life and secrets',
}
function jupiterFlavorKo(h: number): string {
  return JUPITER_HOUSE_FLAVOR_KO[h] ?? '독자적 영역'
}
function jupiterFlavorEn(h: number): string {
  return JUPITER_HOUSE_FLAVOR_EN[h] ?? 'a singular domain'
}

function daeunMoneyFlavorKo(sibsin: string): string {
  if (sibsin.includes('재')) return '확장의 흐름'
  if (sibsin.includes('식') || sibsin.includes('상')) return '결과물을 자원으로 바꾸는 흐름'
  if (sibsin.includes('관')) return '책임을 통한 안정의 흐름'
  if (sibsin.includes('인')) return '학습 투자가 자원이 되는 흐름'
  if (sibsin.includes('비') || sibsin.includes('겁')) return '협업·동업의 흐름'
  return '잔잔한 결'
}
function daeunMoneyFlavorEn(sibsin: string): string {
  if (sibsin.includes('재')) return 'opens an expansion line'
  if (sibsin.includes('식') || sibsin.includes('상')) return 'turns output into resource'
  if (sibsin.includes('관')) return 'stabilizes through responsibility'
  if (sibsin.includes('인')) return 'turns study into capital'
  if (sibsin.includes('비') || sibsin.includes('겁')) return 'opens collaboration / partnership'
  return 'runs as a steady undercurrent'
}
