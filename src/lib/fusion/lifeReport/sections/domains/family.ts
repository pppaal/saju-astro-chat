// src/lib/fusion/lifeReport/sections/domains/family.ts
// Family / 가족·관계 deterministic narrative builder.

import type { BuilderInput, DomainNarrative, Paragraph } from '../../types'
import {
  categoryCount,
  countSibsin,
  extractSibsinPositions,
  findPillarOfSibsinCategory,
  gongmangAffectedPillars,
  relationPhraseEn,
  relationPhraseKo,
} from '../../signals/sajuSignals'
import {
  aspectBetween,
  aspectPairEntriesForPairs,
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
  varyRepeatedEndings,
} from '../../templates/sentences'
import { pickVariation, twelveStagePool, sibsinCategoryPool } from '../../pools'
import { findAsteroidEntry } from '@/lib/astrology/asteroidDictionary'
import type { ZodiacName } from '@/lib/astrology/interpretations'

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
  const yearOrMonthGongmang = gongmangPillars.includes('year') || gongmangPillars.includes('month')
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
  const sunMoon = sun && moon ? aspectBetween(astro, 'Sun', 'Moon') : undefined
  const moonSaturn = moon ? aspectBetween(astro, 'Moon', 'Saturn') : undefined

  const familyConfirms = fusion?.byDomain?.family?.confirms ?? []
  if (familyConfirms.length > 0)
    fusionUsed.push(...familyConfirms.slice(0, 3).map((m) => m.rule.id))

  // ── Paragraph 1
  const p1ko = paragraph([
    inseong >= 2
      ? '당신은 어머니와 돌봄 라인의 인연이 자연스럽게 깊은 느낌이에요.'
      : inseong === 0
        ? '어머니와 돌봄 라인의 인연은 의식적인 노력으로 자라요.'
        : '당신은 가족과의 인연을 차분하게 이어가시는 분이에요.',
    `돌봄 기운은 ${familyCountFlavorKo(inseong)}, 동료 기운은 ${familyCountFlavorKo(bijeon)} 자리해요. ${familyShapeKo(inseong, bijeon)}.`,
    fourth
      ? `가정 영역은 ${signLabel(fourth.sign, 'ko')}의 분위기를 띠어, 집안 공기가 ${fourthSignFlavorKo(fourth.sign)}.`
      : '',
  ])
  const p1en = paragraph([
    inseong >= 2
      ? 'Your bond with the mother and caregiver line runs naturally deep.'
      : inseong === 0
        ? 'Your bond with the mother and caregiver line is built through conscious effort.'
        : 'Your family line runs as a quiet, steady undercurrent.',
    `Your chart shows ${familyShapeEn(inseong, bijeon)}.`,
    fourth
      ? `Your 4th house begins in ${signLabel(fourth.sign, 'en')}, so the feel of home is ${fourthSignFlavorEn(fourth.sign)}.`
      : '',
  ])

  // ── Paragraph 2: 부모상·형제
  // 십신 위치 — 인성/비겁이 어느 기둥에 있는지 확인해서, 어머니/형제 인연의
  // 깊이를 본명 기둥 자리로 자연 통합.
  const positions = extractSibsinPositions(saju)
  if (positions.length > 0) sajuUsed.push('sibsin.positions')
  // 인성이 월주에 (천간 기준) 있으면 어머니 인연이 명식의 무게중심에 와요.
  const inseongPos = findPillarOfSibsinCategory(positions, '인성', { visibleOnly: true })
  const bijeonPos = findPillarOfSibsinCategory(positions, '비겁', { visibleOnly: true })
  const inseongLineKo = inseongPos
    ? inseongPos.pillarKey === 'month'
      ? '청년 자리에 어머니·돌봄의 기운이 놓여서, 어머니 인연이 삶의 무게중심에 와 있어요.'
      : `${pillarKoNatural(inseongPos.pillarKey)}에 어머니·돌봄의 기운이 놓여서, 어머니나 돌봄 라인이 그 자리부터 흘러 들어와요.`
    : ''
  const bijeonLineKo =
    bijeonPos && bijeon >= 2
      ? `${pillarKoNatural(bijeonPos.pillarKey)}에 형제·동료의 기운이 또렷이 자리잡아, 형제·동료 라인이 인생 한 축으로 자리해요.`
      : ''
  const inseongLineEn = inseongPos
    ? inseongPos.pillarKey === 'month'
      ? 'With the caregiver line sitting at your young-adulthood seat, the mother and caregiver line sit at the centre of your chart.'
      : `Because the caregiver line sits at your ${familyPillarSeatEn(inseongPos.pillarKey)}, the mother and caregiver line enter from that seat.`
    : ''
  const bijeonLineEn =
    bijeonPos && bijeon >= 2
      ? `With the sibling-and-peer line sitting at your ${familyPillarSeatEn(bijeonPos.pillarKey)}, sibling and peer ties hold a whole axis of your life.`
      : ''
  const p2ko = paragraph([
    sun
      ? `아버지상은 ${signLabel(sun.sign, 'ko')}에 자리한 태양처럼, ${parentSignFlavorKo(sun.sign)} 스타일이에요.`
      : '',
    moon
      ? `어머니상은 ${signLabel(moon.sign, 'ko')}의 분위기로 흐르는 달처럼, ${parentSignFlavorKo(moon.sign)} 분이에요.`
      : '',
    inseongLineKo,
    bijeonLineKo,
    bijeon >= 2
      ? '동료이 풍성해서, 형제와 동등한 관계가 인생에 큰 자리를 차지해요.'
      : bijeon === 0
        ? '동료이 잔잔해서, 동등한 관계는 의식적으로 만들어가는 흐름이에요.'
        : '',
  ])
  const p2en = paragraph([
    sun
      ? `Your father-image reads through your Sun in ${signLabel(sun.sign, 'en')} (${houseLabel(sun.house, 'en')}) — ${parentSignFlavorEn(sun.sign)}.`
      : '',
    moon
      ? `Your mother-image reads through your Moon in ${signLabel(moon.sign, 'en')} (${houseLabel(moon.house, 'en')}) — ${parentSignFlavorEn(moon.sign)}.`
      : '',
    inseongLineEn,
    bijeonLineEn,
    bijeon >= 2
      ? 'A rich sibling-and-peer line means brothers, sisters, and close friends hold a large place in your life.'
      : bijeon === 0
        ? 'With the sibling-and-peer line quiet, equal-footed bonds form by conscious choice rather than by default.'
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
      `Because your parental axis (Sun-Moon) ${aspectQuality(sunMoon.type, 'en')}, a ${sunMoonFlavorEn(sunMoon.type)} family atmosphere took shape early.`
    )
  }
  if (moonSaturn) {
    deepKo.push(
      `당신의 달과 토성이 ${aspectQuality(moonSaturn.type, 'ko')}, 어머니나 정서 라인에 책임의 무게가 일찍부터 함께 있어요.`
    )
    deepEn.push(
      `Your Moon-Saturn ${aspectQuality(moonSaturn.type, 'en')} placed the weight of responsibility on your mother or your emotional life early on.`
    )
  }
  if (yearOrMonthGongmang) {
    deepKo.push(
      '조상과 부모의 자리에 비어 있는 영역이 있어, 조부모와 부모 라인 인연이 얇거나 일찍 떨어지는 흐름이 있을 수 있어요.'
    )
    deepEn.push(
      'An empty space sits in your year or month pillar — your ties to ancestors and parents may feel thinner than most, or separate earlier in life.'
    )
  }
  // 소행성 양육(Ceres) — 가족 도메인엔 양육의 별 한 문장만 DB 사전으로.
  // 헌신(Vesta)은 신성 의미가 강해 spirituality 도메인에서 사용. raw 하우스
  // jargon(asteroidHouseLine)·중복 inline 묘사는 제거해 절제.
  if (ce?.sign) {
    const ceEntry = findAsteroidEntry('Ceres', ce.sign as ZodiacName)
    if (ceEntry) {
      astroUsed.push('asteroidDictionary.ceres')
      deepKo.push(firstSentenceFamily(ceEntry.ko))
      deepEn.push(firstSentenceFamily(ceEntry.en))
    }
  }
  if (familyConfirms.length > 0) {
    deepKo.push(`그리고 ${familyConfirms[0].rule.narrative.confirm}`)
    deepEn.push(`Additionally, ${familyConfirms[0].rule.meaning}.`)
  }
  // Calendar-engine: Lot of Victory (인연의 행운점) — 친구·후원의 결
  const victory = input.calendarSignals?.arabicParts?.Victory
  if (victory) {
    fusionUsed.push('calendarSignals.arabicParts.Victory')
    deepKo.push(
      '인연의 행운점이 차트에 들어와, 가족 너머의 ‘제 2의 가족’ 인연이 평생의 자원이 돼요.'
    )
    deepEn.push(
      `Your Lot of Victory is active — the chosen family you build beyond blood becomes a resource for the rest of your life.`
    )
  }
  // Saju hyeongchung — 가족 갈등·결합 패턴
  const hc = input.calendarSignals?.sajuHyeongchung
  if (hc?.hasInteractions && hc.hapCount + hc.chungCount > 0) {
    fusionUsed.push('calendarSignals.sajuHyeongchung')
    const tone =
      hc.hapCount > hc.chungCount
        ? '사주 안에 결합의 흐름이 강해서, 가족 인연이 갈수록 단단해지는 분위기예요.'
        : '사주 안에 단절·결정의 흐름이 강해서, 가족과의 거리감을 인정한 뒤에야 진짜 연결이 풀려요.'
    const toneEn =
      hc.hapCount > hc.chungCount
        ? 'A note of union runs through your chart — family bonds grow firmer over time.'
        : 'A note of separation runs through your chart — real connection opens only after you acknowledge the distance.'
    deepKo.push(tone)
    deepEn.push(toneEn)
  }
  // Saju relations — year pillar (조상/뿌리) axis
  const relKoFamily = relationPhraseKo(input.calendarSignals?.sajuRelations, {
    preferPillar: 'year',
  })
  const relEnFamily = relationPhraseEn(input.calendarSignals?.sajuRelations, {
    preferPillar: 'year',
  })
  if (relKoFamily) {
    sajuUsed.push('calendarSignals.sajuRelations')
    deepKo.push(`${relKoFamily} 부모·조상 라인의 인연이 본인의 인생에 한 층 깊게 닿아 있어요.`)
    if (relEnFamily)
      deepEn.push(
        `${relEnFamily} The line of your parents and ancestors reaches into your own life one layer deeper than most.`
      )
  }
  // aspectPair DB — 정서 축의 각(달-토성/달-화성). 가정 정서 분위기에 한 문장.
  const familyAspect = aspectPairEntriesForPairs(
    astro,
    [
      ['Moon', 'Saturn'],
      ['Moon', 'Mars'],
    ],
    1
  )[0]
  if (familyAspect) {
    astroUsed.push('aspectPairDictionary.family')
    deepKo.push(firstSentenceFamily(familyAspect.ko))
    deepEn.push(firstSentenceFamily(familyAspect.en))
  }
  // 12-stage × family variation pool.
  const dayMasterStemF = saju.pillars.day.stem || ''
  const dayBranchF = saju.pillars.day.branch || ''
  const stageF = saju.ultraAdvanced?.iljuDeep?.twelveStage
  const stageFamilyVar = pickVariation(twelveStagePool(stageF, 'family'), [
    `day_master:${dayMasterStemF}`,
    `day_branch:${dayBranchF}`,
    `stage:${stageF ?? ''}`,
  ])
  if (stageFamilyVar) {
    sajuUsed.push('pools.twelveStage.family')
    deepKo.push(/[.!?]$/.test(stageFamilyVar) ? stageFamilyVar : `${stageFamilyVar}.`)
  }
  // Sibsin category × family
  let dominantCatF = ''
  {
    let maxV = -1
    const sibCat: Record<string, number> = {
      비겁: 0,
      식상: 0,
      재성: 0,
      관성: 0,
      인성: 0,
    }
    const stemSibsin = [
      saju.pillars.year.sibsin,
      saju.pillars.month.sibsin,
      saju.pillars.time.sibsin,
    ]
    const toCat: Record<string, string> = {
      비견: '비겁',
      겁재: '비겁',
      식신: '식상',
      상관: '식상',
      편재: '재성',
      정재: '재성',
      편관: '관성',
      정관: '관성',
      편인: '인성',
      정인: '인성',
    }
    for (const s of stemSibsin) {
      const c = s ? toCat[s] : undefined
      if (c) sibCat[c]++
    }
    for (const [k, v] of Object.entries(sibCat)) {
      if (v > maxV) {
        maxV = v
        dominantCatF = k
      }
    }
  }
  const familyCatVar = pickVariation(sibsinCategoryPool(dominantCatF, 'family'), [
    `day_master:${dayMasterStemF}`,
    `category:${dominantCatF}`,
    `day_branch:${dayBranchF}`,
  ])
  if (familyCatVar) {
    sajuUsed.push('pools.sibsinCategory.family')
    deepKo.push(/[.!?]$/.test(familyCatVar) ? familyCatVar : `${familyCatVar}.`)
  }
  // Lot of Basis — 가정 기반·뿌리의 점
  const basis = input.calendarSignals?.arabicPartsExtra?.Basis
  if (basis) {
    fusionUsed.push('calendarSignals.arabicPartsExtra.Basis')
    deepKo.push(
      `가정 기반의 점이 ${signLabel(basis.sign, 'ko')}에 놓여, 뿌리 삼는 자리도 같은 흐름을 따라요.`
    )
    deepEn.push(
      `Your Lot of Basis sits in ${signLabel(basis.sign, 'en')} — the foundation you root yourself in carries that same flavor.`
    )
  }

  const p3ko = paragraph(
    deepKo.length ? varyRepeatedEndings(deepKo) : ['이번 생의 가족 분위기는 큰 드라마보다 잔잔한 누적으로 빚어져요.']
  )
  const p3en = paragraph(
    deepEn.length
      ? deepEn
      : [
          'Because your family signals sit in a calm arrangement, this lifetime favors a quiet continuity over high drama.',
        ]
  )

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

// DB 텍스트(2-3문장)에서 첫 문장만 추출 — 섹션 절제를 위해 1문장으로 한정.
function firstSentenceFamily(text: string): string {
  const trimmed = text.trim()
  const m = trimmed.match(/^[^.!?]*[.!?]/)
  return (m ? m[0] : trimmed).trim()
}

// 사주 raw 기둥명 대신 인생 시기 라벨로 자연 한국어화.
function pillarKoNatural(key: 'year' | 'month' | 'day' | 'time'): string {
  if (key === 'year') return '초년 자리'
  if (key === 'month') return '청년 자리'
  if (key === 'day') return '중년 자리'
  return '만년 자리'
}

function familyShapeKo(inseong: number, bijeon: number): string {
  if (inseong >= 2 && bijeon >= 2) return '돌봄과 동료 라인이 둘 다 풍부한 그릇이에요'
  if (inseong >= 2) return '돌봄 라인이 두텁고, 형제 라인은 잔잔히 이어져요'
  if (bijeon >= 2) return '형제와 동료 라인이 두텁고, 돌봄은 잔잔히 이어져요'
  if (inseong === 0 && bijeon === 0)
    return '가족 인연이 가벼워서, 본인이 새 가족을 만들어가는 자리예요'
  return '돌봄과 동등이 균형 있게 자리해요'
}

// 가족 인연의 강도를 "겹" 없이 자연 한국어로
function familyCountFlavorKo(n: number): string {
  if (n === 0) return '비어 있게'
  if (n === 1) return '한 갈래로 가볍게'
  if (n === 2) return '두 갈래로 또렷하게'
  return '풍성하게'
}
function familyShapeEn(inseong: number, bijeon: number): string {
  if (inseong >= 2 && bijeon >= 2) return 'both caregiving and peer bonds run rich'
  if (inseong >= 2) return 'a thick caregiver line with a quieter sibling bond'
  if (bijeon >= 2) return 'a thick sibling-and-peer line with a quieter caregiver line'
  if (inseong === 0 && bijeon === 0) return 'a light family signal — you build your own new family'
  return 'caregiving and peer bonds run in a balanced weave'
}

// 사주 raw 기둥 키 → natural English seat label (family 섹션 전용).
function familyPillarSeatEn(key: 'year' | 'month' | 'day' | 'time'): string {
  if (key === 'year') return 'early-life seat'
  if (key === 'month') return 'young-adulthood seat'
  if (key === 'day') return 'middle-life seat'
  return 'late-life seat'
}

const FOURTH_SIGN_FLAVOR_KO: Record<string, string> = {
  Aries: '직접적이고 자율적이에요',
  Taurus: '안정과 풍요로 가득해요',
  Gemini: '대화가 자연스럽게 흘러요',
  Cancer: '정서적으로 깊고 따뜻해요',
  Leo: '드라마가 살아 있어요',
  Virgo: '세심하게 정리돼 있어요',
  Libra: '균형 잡히고 우아해요',
  Scorpio: '깊고 비밀스러워요',
  Sagittarius: '시야가 활짝 열려 있어요',
  Capricorn: '책임과 구조로 단단해요',
  Aquarius: '독립적이고 자유로워요',
  Pisces: '꿈과 공감으로 흘러요',
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
  return (s && FOURTH_SIGN_FLAVOR_KO[s]) ?? '독특한 분위기로 흘러요'
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
  return PARENT_SIGN_FLAVOR_KO[s] ?? '독특한 분위기의'
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

