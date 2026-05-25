// src/lib/fusion/lifeReport/sections/domains/love.ts
// Love / 사랑·배우자·이상형 deterministic narrative builder.

import type { BuilderInput, DomainNarrative, Paragraph } from '../../types'
import {
  categoryCount,
  countSibsin,
  currentDaeun,
  dayBranch,
  extractSibsinPatterns,
  findDaeunByCategory,
  relationPhraseEn,
  relationPhraseKo,
  sibsinPatternsForDomain,
} from '../../signals/sajuSignals'
import {
  aspectBetween,
  aspectPairEntriesForPairs,
  aspectPairEntryMajor,
  aspectsOf,
  fixedStarOn,
  getPlanet,
  houseCusp,
  juno,
  partOfFortune,
  planetsInHouse,
  vertex,
} from '../../signals/astroSignals'
import {
  aspectQuality,
  eulReul,
  houseLabel,
  iGa,
  paragraph,
  signLabel,
  varyRepeatedEndings,
} from '../../templates/sentences'
import { findSignCombination } from '@/lib/astrology/signCombinations'
import { findAsteroidEntry } from '@/lib/astrology/asteroidDictionary'
import type { ZodiacName } from '@/lib/astrology/interpretations'
import {
  appendToPara,
  pickVariation,
  twelveStagePool,
  sibsinCategoryPool,
  planetSignPool,
  iljuPool,
  planetHouseLine,
} from '../../pools'

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
  const isFemale = saju.input?.gender === 'female'

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

  const venusSaturn =
    venus && getPlanet(astro, 'Saturn') ? aspectBetween(astro, 'Venus', 'Saturn') : undefined
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
  const styleKo = pickLoveStyleKo(
    cat,
    jeongGwan,
    pyenGwan,
    jeongJae,
    pyenJae,
    isFemale,
    saju.pillars.day.stem || ''
  )
  const styleEn = pickLoveStyleEn(cat, jeongGwan, pyenGwan, jeongJae, pyenJae, isFemale)
  const venusBlurb = venus
    ? `당신의 금성은 ${signLabel(venus.sign, 'ko')}에 있어서, ${venusFlavorKo(venus.sign, venus.house)}이 당신의 사랑 색이에요.`
    : ''
  const venusBlurbEn = venus
    ? `Venus in ${signLabel(venus.sign, 'en')} (${houseLabel(venus.house, 'en')}) brings ${venusFlavorEn(venus.sign, venus.house)} to your love life.`
    : ''
  // Variation pools — dominant sibsin category × love + Moon × sign × love.
  const dayMasterStem = saju.pillars.day.stem || ''
  const dominantCat = pickDominantCategoryLove(cat)
  const loveCategoryVar = pickVariation(sibsinCategoryPool(dominantCat, 'love'), [
    `day_master:${dayMasterStem}`,
    `category:${dominantCat}`,
    `gender:${isFemale ? 'f' : 'm'}`,
  ])
  const moonSignVar = pickVariation(planetSignPool('Moon', moon?.sign, 'love'), [
    `day_master:${dayMasterStem}`,
    `moon_sign:${moon?.sign ?? ''}`,
    `day_branch:${dBranch}`,
  ])
  // ASC × love (PR #345 — Big 3 sign 완성)
  const ascSignVar = pickVariation(planetSignPool('Ascendant', asc?.sign, 'love'), [
    `day_master:${dayMasterStem}`,
    `asc_sign:${asc?.sign ?? ''}`,
    `day_branch:${dBranch}`,
  ])
  // Venus × love (PR #347 — Venus 가 love 의 핵심 행성)
  const venusSignVar = pickVariation(planetSignPool('Venus', venus?.sign, 'love'), [
    `day_master:${dayMasterStem}`,
    `venus_sign:${venus?.sign ?? ''}`,
    `day_branch:${dBranch}`,
  ])
  // Mars × love (PR #347 — Mars 가 love 의 욕망 축)
  const marsSignVar = pickVariation(planetSignPool('Mars', mars?.sign, 'love'), [
    `day_master:${dayMasterStem}`,
    `mars_sign:${mars?.sign ?? ''}`,
    `day_branch:${dBranch}`,
  ])
  // Moon × house — 정서가 어느 무대에서 풀리는지 (PR #346)
  const moonHouseVar = planetHouseLine('Moon', moon?.house, 'ko')
  // Venus × house — 매력이 어느 무대에서 풀리는지 (this PR)
  const venusHouseVar = planetHouseLine('Venus', venus?.house, 'ko')
  // Mars × house — 욕망이 어느 무대에서 분출되는지 (this PR)
  const marsHouseVar = planetHouseLine('Mars', mars?.house, 'ko')
  if (loveCategoryVar) sajuUsed.push('pools.sibsinCategory.love')
  if (moonSignVar) astroUsed.push('pools.planetSign.moon.love')
  if (ascSignVar) astroUsed.push('pools.planetSign.asc.love')
  if (venusSignVar) astroUsed.push('pools.planetSign.venus.love')
  if (marsSignVar) astroUsed.push('pools.planetSign.mars.love')
  if (moonHouseVar) astroUsed.push('pools.planetHouse.moon')
  if (venusHouseVar) astroUsed.push('pools.planetHouse.venus')
  if (marsHouseVar) astroUsed.push('pools.planetHouse.mars')
  let p1ko = paragraph([styleKo, venusBlurb])
  p1ko = appendToPara(p1ko, loveCategoryVar)
  // 결정론 유지: 두 변이가 의미상 같은 결을 동시에 말하거나, 이미 sibsin
  // 변이가 "사이/관계가 ~한다" 톤을 끝맺어 P1에 충분히 사랑 색이 깔린
  // 경우, moonSign 쪽은 생략해 P1 안에서의 cadence 중복을 막음.
  const moonSignDedup = (() => {
    if (!moonSignVar) return moonSignVar
    const themes = [
      '친구 같은',
      '꿈을 나누',
      '서로를 존중',
      '서로에게 녹아',
      '독립적인',
      '동등한',
      '깊은 공감',
      '편안한 사랑',
      '대화가 풍부',
      '균형 있는 사랑',
    ]
    const dup = themes.some((t) => p1ko.includes(t) && moonSignVar.includes(t))
    // sibsin 변이가 이미 P1 끝에 사랑 톤을 깔았으면 moonSign은 생략해
    // "X한 사이가 ~. Y한 관계가 ~." 식 이중 구조를 막음.
    const sibsinAlreadyClosesLoveTone =
      !!loveCategoryVar &&
      /(사이|관계|사랑)[^.]{0,20}(어울려|풀려|편해|깊어|채워|살아)/.test(loveCategoryVar) &&
      /(사이|관계|사랑)[^.]{0,20}(어울려|풀려|편해|깊어|채워|살아)/.test(moonSignVar)
    return dup || sibsinAlreadyClosesLoveTone ? '' : moonSignVar
  })()
  // P1 — keep to max 2 pool variations (sibsin category + Moon sign) so
  // the basic identity paragraph stays short. The remaining pool lines
  // (Venus, Mars, ASC, planet-house) move into P3 as deep-grain layer.
  p1ko = appendToPara(p1ko, moonSignDedup)
  const p1en = paragraph([styleEn, venusBlurbEn])

  // ── Paragraph 2: 배우자 인상
  const branchFlavor = BRANCH_FLAVOR_KO[dBranch] || '독특한'
  const branchFlavorEn = BRANCH_FLAVOR_EN[dBranch] || 'distinctive'
  const seventhSignKo = seventh?.sign ? signLabel(seventh.sign, 'ko') : ''
  const seventhSignEn = seventh?.sign ? signLabel(seventh.sign, 'en') : ''
  const seventhFlavorKo = seventh?.sign ? seventhSignFlavorKo(seventh.sign) : ''

  const p2ko = paragraph([
    `당신을 향해 다가오는 동반자는 ${branchFlavor} 사람이에요.`,
    seventh && seventhSignKo
      ? `관계 영역은 ${seventhSignKo}의 분위기로 시작해서, 파트너에게서 ${seventhFlavorKo}${eulReul(seventhFlavorKo)} 자연스럽게 바라게 돼요.`
      : '',
    seventhPlanets.length > 0
      ? `관계 영역 안에 ${seventhPlanets.map((p) => planetLabelKo(p.name)).join(', ')}이 머물러, 관계가 인생의 한가운데로 들어와요.`
      : '',
  ])
  const p2en = paragraph([
    `Your core nature tends to draw in a ${branchFlavorEn} kind of companion.`,
    seventh && seventhSignEn
      ? `Your 7th house begins in ${seventhSignEn}, so you naturally ask for ${seventhSignFlavorEn(seventh.sign)} from a partner.`
      : '',
    seventhPlanets.length > 0
      ? `With ${seventhPlanets.map((p) => p.name).join(', ')} sitting in your 7th house, relationships sit right at the center of your life.`
      : '',
  ])

  // ── Paragraph 3: 고급 지표 (vertex, juno, PoF, aspects)
  const deepKo: string[] = []
  const deepEn: string[] = []
  // Pool variations displaced from P1 — capped at 2 lines max so P3 does
  // not bloat. Priority: Venus sign → Mars sign → ASC sign → planet-house.
  {
    const extraLove: string[] = []
    for (const v of [
      venusSignVar,
      marsSignVar,
      ascSignVar,
      venusHouseVar,
      marsHouseVar,
      moonHouseVar,
    ]) {
      if (!v) continue
      if (extraLove.length >= 2) break
      extraLove.push(/[.!?]$/.test(v) ? v : `${v}.`)
    }
    for (const line of extraLove) deepKo.push(line)
  }
  // Venus × Mars 조합 DB (사랑 × 욕망) — 끌림의 결을 한 문장으로 그라운딩.
  const venusMarsCombo =
    venus?.sign && mars?.sign
      ? findSignCombination('venus_mars', venus.sign as ZodiacName, mars.sign as ZodiacName)
      : null
  if (venusMarsCombo) {
    astroUsed.push('signCombinations.venus_mars')
    deepKo.push(firstSentenceLove(venusMarsCombo.ko))
    deepEn.push(firstSentenceLove(venusMarsCombo.en))
  }
  // Juno(결혼의 별) × sign DB — 원하는 결합의 결을 한 문장으로.
  const junoEntry = j?.sign ? findAsteroidEntry('Juno', j.sign as ZodiacName) : null
  if (junoEntry) {
    astroUsed.push('asteroidDictionary.juno')
    deepKo.push(firstSentenceLove(junoEntry.ko))
    deepEn.push(firstSentenceLove(junoEntry.en))
  }
  // Moon × ASC (감정 × 외관) 조합 DB — 감정이 겉으로 드러나는 방식은 관계의
  // 첫 분위기를 좌우하므로 love 도메인에서 한 문장 사용.
  const moonAscCombo =
    moon?.sign && asc?.sign
      ? findSignCombination('moon_asc', moon.sign as ZodiacName, asc.sign as ZodiacName)
      : null
  if (moonAscCombo) {
    astroUsed.push('signCombinations.moon_asc')
    deepKo.push(`사랑할 때는 ${firstSentenceLove(moonAscCombo.ko)}`)
    deepEn.push(`In love, ${lowerFirst(firstSentenceLove(moonAscCombo.en))}`)
  }
  if (vertexVenus) {
    deepKo.push(
      `운명적 만남의 점과 금성이 ${aspectQuality(vertexVenus.type, 'ko')}, 운명적인 한 번의 만남이 새겨져 있어요.`
    )
    deepEn.push(
      `Your Vertex and Venus ${aspectQuality(vertexVenus.type, 'en')}, which writes one fated encounter into the chart.`
    )
  } else if (vx) {
    deepKo.push(
      `운명적 만남의 점이 ${signLabel(vx.sign, 'ko')}에 있어, 그 색을 따라가는 만남이 한 번 와요.`
    )
    deepEn.push(
      `Your Vertex sits in ${signLabel(vx.sign, 'en')} (${houseLabel(vx.house, 'en')}), marking the point where a fated encounter is most likely to enter.`
    )
  }
  if (j) {
    deepKo.push(
      `주노(결혼)는 ${signLabel(j.sign, 'ko')}에 놓여, 결혼 자체에 ${junoFlavorKo(j.house)}이 흐르게 해요.`
    )
    deepEn.push(
      `Juno, the asteroid of marriage, sits in ${signLabel(j.sign, 'en')} (${houseLabel(j.house, 'en')}), so marriage itself carries the tone of ${junoFlavorEn(j.house)}.`
    )
  }
  if (pofInSeventh) {
    deepKo.push('행운의 점이 관계 영역에 있어, 파트너십이 곧 행운의 통로가 되는 배치예요.')
    deepEn.push(
      `Your Part of Fortune sits in the 7th house — partnership is itself the channel through which luck arrives.`
    )
  }
  if (venusSaturn) {
    const vsEntry = aspectPairEntryMajor('Venus', 'Saturn', venusSaturn.type)
    if (vsEntry) {
      astroUsed.push('aspectPairDictionary.venus_saturn')
      deepKo.push(firstSentenceLove(vsEntry.ko))
      deepEn.push(firstSentenceLove(vsEntry.en))
    } else {
      deepKo.push(
        `당신의 금성과 토성이 ${aspectQuality(venusSaturn.type, 'ko')}, 성숙한 파트너와 시간이 갈수록 깊어지는 사랑을 만들어요.`
      )
      deepEn.push(
        `Your Venus and Saturn ${aspectQuality(venusSaturn.type, 'en')}, which tends to bring a mature partner and a love that grows deeper with time.`
      )
    }
  }
  if (venusMars) {
    const vmEntry = aspectPairEntryMajor('Venus', 'Mars', venusMars.type)
    if (vmEntry) {
      astroUsed.push('aspectPairDictionary.venus_mars')
      deepKo.push(firstSentenceLove(vmEntry.ko))
      deepEn.push(firstSentenceLove(vmEntry.en))
    } else {
      deepKo.push(
        `당신의 금성과 화성이 ${aspectQuality(venusMars.type, 'ko')} 있어, 끌림과 욕망의 톤이 또렷해요.`
      )
      deepEn.push(
        `Your Venus and Mars ${aspectQuality(venusMars.type, 'en')}, giving a clear character to the way attraction and desire show up in your life.`
      )
    }
  }
  // aspectPair DB — 애정 축의 각(태양-금성/달-금성/금성-목성/금성-명왕).
  // 금성-토성·금성-화성은 위에서 별도 처리하므로 제외. 가장 좁은 각 1개만.
  const loveAspect = aspectPairEntriesForPairs(
    astro,
    [
      ['Sun', 'Venus'],
      ['Moon', 'Venus'],
      ['Venus', 'Jupiter'],
      ['Venus', 'Pluto'],
    ],
    1
  )[0]
  if (loveAspect) {
    astroUsed.push('aspectPairDictionary.love')
    deepKo.push(firstSentenceLove(loveAspect.ko))
    deepEn.push(firstSentenceLove(loveAspect.en))
  }
  if (loveConfirms.length > 0) {
    deepKo.push(`그리고 ${loveConfirms[0].rule.narrative.confirm}`)
    deepEn.push(`Additionally, ${loveConfirms[0].rule.meaning}.`)
  }
  const loveConflicts = fusion?.byDomain?.love?.conflicts ?? []
  if (loveConflicts[0]?.rule.narrative.conflict) {
    deepKo.push(`다만 ${loveConflicts[0].rule.narrative.conflict}`)
    deepEn.push(`That said, ${loveConflicts[0].rule.meaning}.`)
  }
  // Venus/Mars midpoint (열정의 점) — attraction & desire axis.
  const passionMid = input.calendarSignals?.midpoints?.find((m) => m.id === 'Venus/Mars')
  if (passionMid) {
    astroUsed.push('midpoints.venusMars')
    deepKo.push(
      `열정의 점(금성·화성 미드포인트)은 ${signLabel(passionMid.sign, 'ko')}에 있어, 끌림과 열정이 그 색으로 피어나요.`
    )
    deepEn.push(
      `Your Venus/Mars midpoint — the point of passion — sits in ${signLabel(passionMid.sign, 'en')}, coloring how attraction and desire ignite.`
    )
  }
  // Saju relations — 합 weighted (love is union-coloured)
  const relKoLove = relationPhraseKo(input.calendarSignals?.sajuRelations, {
    preferKind: '합',
    preferPillar: 'day',
    usedKeys: input.relUsed?.ko,
  })
  const relEnLove = relationPhraseEn(input.calendarSignals?.sajuRelations, {
    preferKind: '합',
    preferPillar: 'day',
    usedKeys: input.relUsed?.en,
  })
  if (relKoLove) {
    sajuUsed.push('calendarSignals.sajuRelations')
    deepKo.push(`${relKoLove} 한 사람과의 결합이 인생 흐름에 굵게 새겨져요.`)
    if (relEnLove)
      deepEn.push(
        `${relEnLove} Partnership leaves a strong imprint on the larger arc of your life.`
      )
  }
  // 12-stage × love + 60갑자 일주 × love variations.
  const iljuNameLove = saju.ultraAdvanced?.iljuDeep?.ilju
  const stageLove = saju.ultraAdvanced?.iljuDeep?.twelveStage
  const stageLoveVar = pickVariation(twelveStagePool(stageLove, 'love'), [
    `day_master:${dayMasterStem}`,
    `day_branch:${dBranch}`,
    `stage:${stageLove ?? ''}`,
  ])
  if (stageLoveVar) {
    sajuUsed.push('pools.twelveStage.love')
    deepKo.push(/[.!?]$/.test(stageLoveVar) ? stageLoveVar : `${stageLoveVar}.`)
  }
  const iljuLoveVar = pickVariation(iljuPool(iljuNameLove, 'love'), [
    `ilju:${iljuNameLove ?? ''}`,
    `day_master:${dayMasterStem}`,
    `day_branch:${dBranch}`,
  ])
  if (iljuLoveVar) {
    sajuUsed.push('pools.ilju.love')
    deepKo.push(/[.!?]$/.test(iljuLoveVar) ? iljuLoveVar : `${iljuLoveVar}.`)
  }
  // Fixed stars near Venus / Mars — 사랑에 별빛이 더해지는 결.
  const fxOnVenus = venus ? fixedStarOn(astro, 'Venus') : []
  if (fxOnVenus.length > 0) {
    astroUsed.push('fixedStars(Venus)')
    const fxV = fxOnVenus.join('·')
    deepKo.push(`금성과 함께 자리한 별 ${fxV}${iGa(fxV)} 사랑에 특별한 분위기를 더해요.`)
    deepEn.push(
      `The fixed star${fxOnVenus.length > 1 ? 's' : ''} ${fxOnVenus.join(', ')} sit${fxOnVenus.length > 1 ? '' : 's'} alongside your Venus, etching a distinctive quality into how you love.`
    )
  }
  const fxOnMars = mars ? fixedStarOn(astro, 'Mars') : []
  if (fxOnMars.length > 0) {
    astroUsed.push('fixedStars(Mars)')
    const fxM = fxOnMars.join('·')
    deepKo.push(`화성에 닿는 별빛 ${fxM}${iGa(fxM)} 끌림의 분위기를 한층 진하게 만들어요.`)
    deepEn.push(
      `The fixed star${fxOnMars.length > 1 ? 's' : ''} ${fxOnMars.join(', ')} touch${fxOnMars.length > 1 ? '' : 'es'} your Mars, making the pull of attraction richer and more intense.`
    )
  }
  // Sibsin combination patterns relevant to love (재성/관성 grouping).
  const patternsLove = extractSibsinPatterns(saju)
  const loveSibsinPatterns = sibsinPatternsForDomain(patternsLove, 'love')
  if (loveSibsinPatterns.length > 0) {
    sajuUsed.push('sibsin.patterns')
    const top = loveSibsinPatterns[0]
    if (top.name === '재성과다') {
      deepKo.push('재성 기운이 강하게 몰려서, 사랑에서도 손에 잡히는 결과·약속을 선호하게 돼요.')
      deepEn.push(
        'A heavy current of resource-seeking runs through your chart — in love too, you tend to favor tangible commitments and concrete outcomes.'
      )
    } else if (top.name === '관살혼잡') {
      deepKo.push(
        '관성 기운이 두 갈래로 흘러, 사랑에서도 두 방향의 끌림이 같이 살아 있을 수 있어요.'
      )
      deepEn.push(
        'Two threads of the authority current run together in your chart — in love, two directions of attraction can coexist at the same time.'
      )
    } else if (top.name === '균형사주') {
      deepKo.push(
        '사주 자질이 고르게 분포해서, 사랑도 한쪽으로 치우치지 않고 무난히 흐르는 편이에요.'
      )
      deepEn.push(
        'Your inner currents sit in balance, so love too tends to flow evenly without any single quality taking over.'
      )
    }
  }
  // Minor aspect — Venus-Mars quincunx/semisextile colours the attraction grain.
  if (
    venusMars &&
    (venusMars.type === 'quincunx' ||
      venusMars.type === 'semisextile' ||
      venusMars.type === 'quintile')
  ) {
    deepKo.push(
      `당신의 금성과 화성이 ${aspectQuality(venusMars.type, 'ko')} 있어서, 끌림에 ${venusMarsMinorFlavorKo(venusMars.type)}이 함께해요.`
    )
    deepEn.push(
      `Venus and Mars ${aspectQuality(venusMars.type, 'en')}, adding ${venusMarsMinorFlavorEn(venusMars.type)} to the way attraction shows up for you.`
    )
  }
  // Lot of Eros now adds 끌림 colour at P3 (separate from existing P4 timing line)
  const erosLot = input.calendarSignals?.arabicParts?.Eros
  if (erosLot) {
    fusionUsed.push('calendarSignals.arabicParts.Eros')
    deepKo.push(
      `사랑의 끌림이 모이는 곳은 ${signLabel(erosLot.sign, 'ko')}이라, 본인을 매료시키는 사람의 분위기도 같은 느낌으로 일관돼요.`
    )
    deepEn.push(
      `Your Lot of Eros sits in ${signLabel(erosLot.sign, 'en')} — the kind of person who catches your attention tends to carry that same flavor.`
    )
  }
  const p3ko = paragraph(
    deepKo.length
      ? varyRepeatedEndings(deepKo)
      : ['사랑의 분위기는 큰 운명적 흔들림보다 일상 안에서 천천히 깊어지는 편이에요.']
  )
  const p3en = paragraph(
    deepEn.length
      ? deepEn
      : [
          'Because your deeper love signals sit in a calm arrangement, this lifetime favors love that deepens slowly over time rather than a single fated lightning-strike.',
        ]
  )

  // ── Paragraph 4: 타이밍
  const timingKo: string[] = ['결정적 시기:']
  const timingEn: string[] = ['Decisive windows:']
  if (partnerDaeun) {
    timingKo.push(
      `${partnerDaeun.age}세 무렵 인생 흐름이 ${isFemale ? '배우자' : '인연'}의 문을 정식으로 열어줘요.`
    )
    timingEn.push(
      `Age ${partnerDaeun.age} opens a ten-year life-chapter that formally widens the door to ${isFemale ? 'a spouse' : 'partnership'}.`
    )
  }
  if (cur && cur.sibsin) {
    timingKo.push(
      `지금의 인생 흐름에는 ${sibsinMeaningKoLove(cur.sibsin)}이 함께해서, 관계의 분위기를 천천히 다듬어주고 있어요.`
    )
    timingEn.push('Your current life-chapter is also slowly tuning the tone of your relationships.')
  }
  if (srSunInSeventh) {
    timingKo.push('올해 한 해 동안 관계가 무게중심을 잡아주는 시기예요.')
    timingEn.push(
      `This year's Solar Return Sun lands in your 7th house — relationship becomes the center of gravity for the year.`
    )
  }
  if (timingKo.length === 1) {
    timingKo.push('인생 흐름이 점차 익어가는 구간이라, 한 해 한 해 인연이 차근차근 모이고 있어요.')
    timingEn.push(
      'Your daeun is in a ripening stretch — the signals quietly accumulate season by season.'
    )
  }
  // Calendar-engine signals: Lot of Eros (사랑의 행운점) + Venus dignity
  const eros = input.calendarSignals?.arabicParts?.Eros
  const venusDignity = input.calendarSignals?.dignities?.find((d) => d.planet === 'Venus')
  if (eros) {
    fusionUsed.push('calendarSignals.arabicParts.Eros')
    timingKo.push(
      `사랑의 행운점은 ${signLabel(eros.sign, 'ko')}에 놓여, ${erosSignFlavorKoLove(eros.sign)} 인연이 사랑의 운을 끌어와요.`
    )
    timingEn.push(
      `Your Lot of Eros sits in ${signLabel(eros.sign, 'en')} — love-luck tends to arrive through ${erosSignFlavorEnLove(eros.sign)} bonds.`
    )
  }
  if (venusDignity) {
    fusionUsed.push('calendarSignals.dignities.Venus')
    if (venusDignity.status === 'domicile' || venusDignity.status === 'exaltation') {
      timingKo.push('금성이 본인 자리에 있어서, 일생 사랑이 다정하게 흐르는 배치예요.')
      timingEn.push(
        `Venus sits in ${venusDignity.status === 'domicile' ? 'its home sign' : 'a sign where it shines brightest'} — love tends to run warmly through your life by natural disposition.`
      )
    } else if (venusDignity.status === 'detriment' || venusDignity.status === 'fall') {
      timingKo.push(
        '금성이 살짝 어색한 자리에 있어서, 첫 단계엔 시행착오가 있지만 결국 자기만의 방식을 찾으시게 돼요.'
      )
      timingEn.push(
        `Venus sits in a ${venusDignity.status === 'detriment' ? 'less comfortable' : 'weakened'} placement — the early years of love bring some trial and error, but you eventually find your own way of loving.`
      )
    }
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
// DB 텍스트(2-3문장)에서 첫 문장만 추출 — 섹션 절제를 위해 1문장으로 한정.
function firstSentenceLove(text: string): string {
  const trimmed = text.trim()
  const m = trimmed.match(/^[^.!?]*[.!?]/)
  return (m ? m[0] : trimmed).trim()
}

// 영어 문장을 다른 절 뒤에 이어붙일 때 첫 글자를 소문자로.
function lowerFirst(s: string): string {
  return s ? s.charAt(0).toLowerCase() + s.slice(1) : s
}

function pickDominantCategoryLove(cat: Record<string, number>): string {
  let best = ''
  let max = -1
  for (const [k, v] of Object.entries(cat)) {
    if (v > max) {
      max = v
      best = k
    }
  }
  return best
}

function pickLoveStyleKo(
  cat: Record<string, number>,
  jg: number,
  pg: number,
  jj: number,
  pj: number,
  isFemale: boolean,
  dayStem: string
): string {
  if (isFemale && jg >= 1 && pg === 0)
    return '당신은 안정과 깊이를 중시하는 관계형이에요. 한 사람과의 진중한 관계 쪽으로 흐름이 자연스럽게 열려요.'
  if (isFemale && pg >= 2)
    return '당신은 강렬하고 본능적인 끌림에 반응하는 관계형이에요. 자극적인 만남이 잦지만, 따로 안정 구간이 꼭 필요해요.'
  if (!isFemale && jj >= 1 && pj === 0)
    return '당신은 안정과 신뢰를 우선하는 사랑형이에요. 한 사람과 길게 가는 인연이 자연스럽게 깊어져요.'
  if (!isFemale && pj >= 2)
    return '당신은 자유롭고 변화에 끌리는 사랑형이에요. 다양한 만남을 거치면서 자기 길을 찾아가요.'
  if (cat.관성 === 0 && isFemale) return '관계의 형식보다 자기 자신을 먼저 챙기시는 편이에요.'
  if (cat.재성 === 0 && !isFemale) return '관계의 형식보다 자기 일을 먼저 챙기시는 편이에요.'
  // 균형형: 같은 분기에 떨어지는 사주들도 일간 코드로 변형되도록.
  const seed = dayStem ? dayStem.charCodeAt(0) : 0
  const fallback = [
    '당신은 관계에서 깊이와 가능성을 둘 다 챙기시는 분이에요.',
    '당신의 사랑은 안정과 설렘 사이에서 균형을 잡아가요.',
    '관계의 무게와 새로움을 같은 비중으로 보시는 편이에요.',
  ]
  return fallback[seed % fallback.length]!
}

// love 섹션용 십신 자연어
function sibsinMeaningKoLove(sibsin: string): string {
  if (!sibsin) return '잔잔한 흐름'
  if (sibsin.includes('편관')) return '도전과 책임이 무겁게 다가오는 흐름'
  if (sibsin.includes('정관')) return '책임감 있게 자리를 잡는 흐름'
  if (sibsin.includes('편재')) return '기회를 잡는 감각'
  if (sibsin.includes('정재')) return '꾸준히 쌓아가는 흐름'
  if (sibsin.includes('식신')) return '여유로운 표현'
  if (sibsin.includes('상관')) return '재능을 자유롭게 풀어내는 성향'
  if (sibsin.includes('편인')) return '독특한 직관'
  if (sibsin.includes('정인')) return '배움과 돌봄'
  if (sibsin.includes('비견') || sibsin.includes('겁재')) return '동료와 함께 가는 분위기'
  return '잔잔한 흐름'
}

// love 섹션 안에서 planetLabel 사용
function planetLabelKo(name: string): string {
  const map: Record<string, string> = {
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
  }
  return map[name] ?? name
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
    return 'You value steadiness and depth in love. A steady-authority pattern keeps your luck running toward one serious bond.'
  if (isFemale && pg >= 2)
    return 'You respond to intense, instinctive attraction. A strong pressure-as-fuel pattern brings stimulating encounters, but you need a separate steady zone.'
  if (!isFemale && jj >= 1 && pj === 0)
    return 'You favour stability and trust in love. A steady, grounded streak fits a long, lasting bond.'
  if (!isFemale && pj >= 2)
    return 'You move toward freedom and variety. A strong opportunistic-resource pattern lets you find your grain through many meetings.'
  if (cat.관성 === 0 && isFemale)
    return 'With the authority dynamic quiet, this season prioritises filling yourself before settling into a partnership.'
  if (cat.재성 === 0 && !isFemale)
    return 'With the resource dynamic quiet, this season prioritises your own work before settling into a partnership.'
  return 'You hold depth and possibility in love at once.'
}

const VENUS_SIGN_FLAVOR_KO: Record<string, string> = {
  Aries: '솔직하고 빠른 끌림',
  Taurus: '감각과 안정',
  Gemini: '대화와 가벼움',
  Cancer: '돌봄과 안전감',
  Leo: '드라마와 표현',
  Virgo: '섬세한 헌신',
  Libra: '균형과 우아함',
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
  return VENUS_SIGN_FLAVOR_KO[sign] ?? '독특한 분위기'
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
  Libra: '균형과 우아함',
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
  return (sign && SEVENTH_SIGN_FLAVOR_KO[sign]) ?? '독특한 분위기'
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
  return JUNO_HOUSE_FLAVOR_KO[h] ?? '독자적인 결혼 스타일'
}
function junoFlavorEn(h: number): string {
  return JUNO_HOUSE_FLAVOR_EN[h] ?? 'a singular marital grain'
}

// ─── Lot of Eros sign flavor (love-luck origin) ──────────────
const EROS_SIGN_KO: Record<string, string> = {
  Aries: '직진하고 솔직한',
  Taurus: '감각적이고 안정된',
  Gemini: '대화가 잘 통하는',
  Cancer: '정서적으로 깊이 연결되는',
  Leo: '존재감 있고 다정한',
  Virgo: '섬세하고 헌신적인',
  Libra: '균형 잡힌 우아한',
  Scorpio: '깊고 강렬한',
  Sagittarius: '시야 넓고 모험적인',
  Capricorn: '책임감 있는 진중한',
  Aquarius: '독특하고 자유로운',
  Pisces: '몽환적이고 흐르는',
}
const EROS_SIGN_EN: Record<string, string> = {
  Aries: 'direct, honest',
  Taurus: 'sensual, settled',
  Gemini: 'conversation-rich',
  Cancer: 'deeply emotional',
  Leo: 'present, warm',
  Virgo: 'subtle, devoted',
  Libra: 'balanced, graceful',
  Scorpio: 'deep, intense',
  Sagittarius: 'broad-vision, adventurous',
  Capricorn: 'responsible, serious',
  Aquarius: 'unusual, free',
  Pisces: 'dreamy, flowing',
}
function erosSignFlavorKoLove(sign: string): string {
  return EROS_SIGN_KO[sign] ?? '독자적인'
}
function erosSignFlavorEnLove(sign: string): string {
  return EROS_SIGN_EN[sign] ?? 'singular'
}

// Venus-Mars minor aspect flavour (love P3).
function venusMarsMinorFlavorKo(type: string): string {
  if (type === 'quincunx') return '어색한 조정의 느낌'
  if (type === 'semisextile') return '은근한 자극'
  if (type === 'quintile') return '창의적 연결'
  return '미묘한 느낌'
}
function venusMarsMinorFlavorEn(type: string): string {
  if (type === 'quincunx') return 'an awkward-adjustment grain'
  if (type === 'semisextile') return 'a quiet nudge'
  if (type === 'quintile') return 'a creative connection'
  return 'a subtle grain'
}
