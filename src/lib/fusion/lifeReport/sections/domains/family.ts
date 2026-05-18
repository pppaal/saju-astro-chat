// src/lib/fusion/lifeReport/sections/domains/family.ts
// Family / 가족·관계 deterministic narrative builder.

import type { BuilderInput, DomainNarrative, Paragraph } from '../../types'
import {
  categoryCount,
  countSibsin,
  gongmangAffectedPillars,
} from '../../signals/sajuSignals'
import {
  aspectBetween,
  aspectsOf,
  ceres,
  getPlanet,
  houseCusp,
  vesta,
} from '../../signals/astroSignals'
import {
  aspectQuality,
  houseLabel,
  paragraph,
  signLabel,
} from '../../templates/sentences'

export function buildFamily(input: BuilderInput): DomainNarrative {
  const { saju, astro, fusion } = input
  const sajuUsed: string[] = []
  const astroUsed: string[] = []
  const fusionUsed: string[] = []

  const sib = countSibsin(saju)
  const cat = categoryCount(sib)
  sajuUsed.push('sibsin.count', 'sibsin.categoryCount')

  const inseong = cat.인성 // 인성 = 어머니
  const bijeon = cat.비겁 // 비겁 = 형제

  const yearStem = saju.pillars.year.stem
  const yearBranch = saju.pillars.year.branch
  const monthStem = saju.pillars.month.stem
  const monthBranch = saju.pillars.month.branch
  if (yearStem || yearBranch) sajuUsed.push('pillars.year')
  if (monthStem || monthBranch) sajuUsed.push('pillars.month')

  const gongmangPillars = gongmangAffectedPillars(saju)
  const yearOrMonthGongmang =
    gongmangPillars.includes('year') || gongmangPillars.includes('month')
  if (gongmangPillars.length > 0) sajuUsed.push('ultraAdvanced.gongmang')

  const sun = getPlanet(astro, 'Sun') // 아버지
  const moon = getPlanet(astro, 'Moon') // 어머니
  if (sun) astroUsed.push('planets.sun')
  if (moon) astroUsed.push('planets.moon')

  const fourth = houseCusp(astro, 4)
  if (fourth) astroUsed.push('houses.4')
  const ic = astro.houses?.[3] // IC = 4th cusp
  if (ic) astroUsed.push('IC')

  const ce = ceres(astro)
  const ves = vesta(astro)
  if (ce) astroUsed.push('asteroids.ceres')
  if (ves) astroUsed.push('asteroids.vesta')

  const moonAspects = moon ? aspectsOf(astro, 'Moon') : []
  const sunMoon =
    sun && moon ? aspectBetween(astro, 'Sun', 'Moon') : undefined
  const moonSaturn = moon ? aspectBetween(astro, 'Moon', 'Saturn') : undefined

  const familyConfirms = fusion?.byDomain?.family?.confirms ?? []
  if (familyConfirms.length > 0)
    fusionUsed.push(...familyConfirms.slice(0, 3).map((m) => m.rule.id))

  // ── Paragraph 1
  const p1ko = paragraph([
    inseong >= 2
      ? '당신은 어머니와 돌봄 라인의 인연이 자연스럽게 깊은 사람이에요.'
      : inseong === 0
        ? '어머니와 돌봄 라인의 인연은 의식적인 노력으로 자라요.'
        : '당신은 가족과의 결을 잔잔하게 가져가는 사람이에요.',
    `돌봄의 결은 ${inseong}겹, 동료의 결은 ${bijeon}겹으로 ${familyShapeKo(inseong, bijeon)}.`,
    fourth
      ? `가정과 뿌리의 자리는 ${signLabel(fourth.sign, 'ko')}의 결로 시작해서, 가정 분위기가 ${fourthSignFlavorKo(fourth.sign)}이에요.`
      : '',
  ])
  const p1en = paragraph([
    inseong >= 2
      ? 'Your bond with the mother / care-line runs naturally deep.'
      : inseong === 0
        ? 'Your bond with the mother / care-line is built through conscious effort.'
        : 'Your family grain runs as a quiet, steady undercurrent.',
    `Saju shows 인성=${inseong}, 비겁=${bijeon} — ${familyShapeEn(inseong, bijeon)}.`,
    fourth
      ? `Your 4th house opens in ${signLabel(fourth.sign, 'en')}, so the grain of home is ${fourthSignFlavorEn(fourth.sign)}.`
      : '',
  ])

  // ── Paragraph 2: 부모상·형제
  const p2ko = paragraph([
    sun
      ? `아버지상은 ${signLabel(sun.sign, 'ko')}의 결로 자리한 태양처럼, ${parentSignFlavorKo(sun.sign)} 사람이에요.`
      : '',
    moon
      ? `어머니상은 ${signLabel(moon.sign, 'ko')}의 결로 흐르는 달처럼, ${parentSignFlavorKo(moon.sign)} 사람이에요.`
      : '',
    bijeon >= 2
      ? '동료의 결이 풍성해서, 형제와 동등한 관계가 인생에 큰 자리를 차지해요.'
      : bijeon === 0
        ? '동료의 결이 잔잔해서, 동등한 관계는 의식적으로 만들어가는 결이에요.'
        : '',
  ])
  const p2en = paragraph([
    sun
      ? `Your father-image reads like the Sun in ${signLabel(sun.sign, 'en')} ${houseLabel(sun.house, 'en')}: ${parentSignFlavorEn(sun.sign)}.`
      : '',
    moon
      ? `Your mother-image reads like the Moon in ${signLabel(moon.sign, 'en')} ${houseLabel(moon.house, 'en')}: ${parentSignFlavorEn(moon.sign)}.`
      : '',
    bijeon >= 2
      ? 'Rich 비겁 means siblings and peer-equals occupy a large seat in your life.'
      : bijeon === 0
        ? 'With no 비겁, peer-equal bonds form by conscious choice rather than default.'
        : '',
  ])

  // ── Paragraph 3: 심화
  const deepKo: string[] = []
  const deepEn: string[] = []
  if (sunMoon) {
    deepKo.push(
      `부모의 두 축이 되는 태양과 달이 ${aspectQuality(sunMoon.type, 'ko')}, ${sunMoonFlavorKo(sunMoon.type)} 가정 분위기가 일찍 만들어져 있었어요.`
    )
    deepEn.push(
      `Because the parental axis (Sun-Moon) ${aspectQuality(sunMoon.type, 'en')}, a ${sunMoonFlavorEn(sunMoon.type)} family atmosphere was set early.`
    )
  }
  if (moonSaturn) {
    deepKo.push(
      `감정의 별과 책임의 별이 ${aspectQuality(moonSaturn.type, 'ko')}, 어머니나 정서 라인에 책임의 무게가 일찍 실린 결이에요.`
    )
    deepEn.push(
      `Moon-Saturn ${aspectQuality(moonSaturn.type, 'en')} placed responsibility-weight on the mother/emotion line early.`
    )
  }
  if (yearOrMonthGongmang) {
    deepKo.push('조상과 부모의 자리에 비어 있는 결이 있어, 조부모와 부모 라인 인연이 얇거나 일찍 떨어지는 결이 있을 수 있어요.')
    deepEn.push('A 공망 (void) sits on the year or month pillar — ancestor / parent line can feel thinner or separates earlier.')
  }
  if (ves) {
    deepKo.push(`헌신의 별이 ${signLabel(ves.sign, 'ko')}의 결로 자리해서, 가족에 헌신하는 결이 있어요.`)
    deepEn.push(`Vesta in ${signLabel(ves.sign, 'en')} ${houseLabel(ves.house, 'en')} brings family-devotion as a thread.`)
  }
  if (ce) {
    deepKo.push(`양육의 별이 ${signLabel(ce.sign, 'ko')}의 결로 자리해서, ${ceresMomFlavorKo(ce.house)} 양육의 결이 새겨져 있어요.`)
    deepEn.push(`Ceres in ${signLabel(ce.sign, 'en')} ${houseLabel(ce.house, 'en')} sets a ${ceresMomFlavorEn(ce.house)} nurturing imprint.`)
  }
  if (familyConfirms.length > 0) {
    deepKo.push(`그리고 ${familyConfirms[0].rule.narrative.confirm}`)
    deepEn.push(`Additionally, ${familyConfirms[0].rule.meaning}.`)
  }
  const p3ko = paragraph(deepKo.length ? deepKo : [
    '이번 생의 가족 결은 큰 드라마보다 잔잔한 누적으로 빚어져요.'
  ])
  const p3en = paragraph(deepEn.length ? deepEn : [
    'Because family signals sit in a calm array, this life favors a quiet continuity over high drama.'
  ])

  const paragraphs: Paragraph[] = [
    { ko: p1ko, en: p1en },
    { ko: p2ko, en: p2en },
    { ko: p3ko, en: p3en },
  ]

  return {
    id: 'family',
    title: { ko: '가족·관계', en: 'Family & Roots' },
    paragraphs,
    signals: { saju: sajuUsed, astro: astroUsed, fusion: fusionUsed },
  }
}

function familyShapeKo(inseong: number, bijeon: number): string {
  if (inseong >= 2 && bijeon >= 2) return '돌봄의 결과 동료의 결이 둘 다 풍부한 그릇이에요'
  if (inseong >= 2) return '돌봄 라인이 두텁고 형제 라인은 잔잔해요'
  if (bijeon >= 2) return '형제와 동료 라인이 두텁고 돌봄은 잔잔해요'
  if (inseong === 0 && bijeon === 0) return '가족 신호가 가벼워서, 본인이 새 가족을 만드는 결이에요'
  return '돌봄과 동등의 결이 균형 있게 흘러요'
}
function familyShapeEn(inseong: number, bijeon: number): string {
  if (inseong >= 2 && bijeon >= 2) return 'both care and peer-bonds run rich'
  if (inseong >= 2) return 'a thick care-line with a quieter sibling-line'
  if (bijeon >= 2) return 'a thick peer-line with a quieter care-line'
  if (inseong === 0 && bijeon === 0) return 'light family-signal — you build your own new family'
  return 'care and peer-bond run in a balanced grain'
}

const FOURTH_SIGN_FLAVOR_KO: Record<string, string> = {
  Aries: '직접적이고 자율적인 결',
  Taurus: '안정과 풍요의 결',
  Gemini: '대화가 흐르는 결',
  Cancer: '정서적으로 깊은 결',
  Leo: '드라마가 살아 있는 결',
  Virgo: '세심하게 정리된 결',
  Libra: '균형과 미감의 결',
  Scorpio: '깊고 비밀스러운 결',
  Sagittarius: '시야가 열린 결',
  Capricorn: '책임과 구조의 결',
  Aquarius: '독립적인 결',
  Pisces: '꿈과 공감의 결',
}
const FOURTH_SIGN_FLAVOR_EN: Record<string, string> = {
  Aries: 'direct and autonomous',
  Taurus: 'stable and abundant',
  Gemini: 'conversational',
  Cancer: 'emotionally deep',
  Leo: 'dramatic and alive',
  Virgo: 'precisely arranged',
  Libra: 'balanced and aesthetic',
  Scorpio: 'deep and private',
  Sagittarius: 'wide-horizon',
  Capricorn: 'responsible and structured',
  Aquarius: 'independent',
  Pisces: 'dreamy and empathic',
}
function fourthSignFlavorKo(s: string | undefined): string {
  return (s && FOURTH_SIGN_FLAVOR_KO[s]) ?? '독특한 결의 가정'
}
function fourthSignFlavorEn(s: string | undefined): string {
  return (s && FOURTH_SIGN_FLAVOR_EN[s]) ?? 'singular'
}

const PARENT_SIGN_FLAVOR_KO: Record<string, string> = {
  Aries: '추진력 있고 활기찬',
  Taurus: '안정적이고 든든한',
  Gemini: '말 많고 명민한',
  Cancer: '정 많고 보호적인',
  Leo: '따뜻하고 빛나는',
  Virgo: '꼼꼼하고 헌신적인',
  Libra: '예의 있고 균형 잡힌',
  Scorpio: '깊고 강한',
  Sagittarius: '시야 넓고 자유로운',
  Capricorn: '책임감 있고 엄격한',
  Aquarius: '독립적이고 별난',
  Pisces: '공감과 감성의',
}
const PARENT_SIGN_FLAVOR_EN: Record<string, string> = {
  Aries: 'driven and lively',
  Taurus: 'stable and reliable',
  Gemini: 'talkative and quick',
  Cancer: 'caring and protective',
  Leo: 'warm and radiant',
  Virgo: 'meticulous and devoted',
  Libra: 'gracious and balanced',
  Scorpio: 'deep and strong',
  Sagittarius: 'far-sighted and free',
  Capricorn: 'responsible and strict',
  Aquarius: 'independent and unusual',
  Pisces: 'empathic and emotional',
}
function parentSignFlavorKo(s: string): string {
  return PARENT_SIGN_FLAVOR_KO[s] ?? '독특한 결의'
}
function parentSignFlavorEn(s: string): string {
  return PARENT_SIGN_FLAVOR_EN[s] ?? 'singular'
}

function sunMoonFlavorKo(type: string): string {
  if (type === 'trine' || type === 'sextile') return '조화로운'
  if (type === 'square' || type === 'opposition') return '긴장이 있는'
  if (type === 'conjunction') return '응축된 단일'
  return '미묘한'
}
function sunMoonFlavorEn(type: string): string {
  if (type === 'trine' || type === 'sextile') return 'harmonious'
  if (type === 'square' || type === 'opposition') return 'tense'
  if (type === 'conjunction') return 'tightly fused'
  return 'subtle'
}

const CERES_MOM_HOUSE_FLAVOR_KO: Record<number, string> = {
  1: '자기 자신을 드러내는',
  2: '안정·자원으로의',
  3: '대화 중심의',
  4: '뿌리·정 중심의',
  5: '놀이·창작 중심의',
  6: '돌봄·헌신의',
  7: '동반자와 같이 하는',
  8: '깊은 변화 속의',
  9: '시야·가르침의',
  10: '공적 무게가 있는',
  11: '동료감 있는',
  12: '치유·내면의',
}
const CERES_MOM_HOUSE_FLAVOR_EN: Record<number, string> = {
  1: 'self-expressive',
  2: 'stability- and resource-rooted',
  3: 'conversation-centered',
  4: 'rooted in home and affection',
  5: 'play- and creation-centered',
  6: 'service-and-devotion',
  7: 'partner-paired',
  8: 'transformative',
  9: 'horizon- and teaching-based',
  10: 'public-weighted',
  11: 'friend-feel',
  12: 'healing and inward',
}
function ceresMomFlavorKo(h: number): string {
  return CERES_MOM_HOUSE_FLAVOR_KO[h] ?? '독특한 결의'
}
function ceresMomFlavorEn(h: number): string {
  return CERES_MOM_HOUSE_FLAVOR_EN[h] ?? 'singular'
}
