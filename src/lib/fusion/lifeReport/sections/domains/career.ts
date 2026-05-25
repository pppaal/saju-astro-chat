// src/lib/fusion/lifeReport/sections/domains/career.ts
// Career / 직업·커리어 deterministic narrative builder.

import type { BuilderInput, DomainNarrative, Paragraph } from '../../types'
import {
  categoryCount,
  countSibsin,
  currentDaeun,
  extractSibsinPatterns,
  extractSibsinPositions,
  findDaeunByCategory,
  findPillarOfSibsinCategory,
  geokgukType,
  isJonggeok,
  jonggeokType,
  relationPhraseEn,
  relationPhraseKo,
  samgiInfo,
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
  partOfFortune,
  planetsInHouse,
  progressedSun,
} from '../../signals/astroSignals'
import {
  aspectQuality,
  houseLabel,
  naturalizeFragment,
  paragraph,
  planetLabel,
  signLabel,
  varyRepeatedEndings,
} from '../../templates/sentences'
import {
  appendToPara,
  pickVariation,
  twelveStagePool,
  sibsinCategoryPool,
  planetSignPool,
  iljuPool,
  planetHouseLine,
  stageHouseLine,
} from '../../pools'
import { matchTopCareers } from '@/lib/saju/careerDictionary'

export function buildCareer(input: BuilderInput): DomainNarrative {
  const { saju, astro, fusion } = input
  const sajuUsed: string[] = []
  const astroUsed: string[] = []
  const fusionUsed: string[] = []

  // ── Signals
  const sib = countSibsin(saju)
  const cat = categoryCount(sib)
  sajuUsed.push('sibsin.count', 'sibsin.categoryCount')

  const geokguk = geokgukType(saju)
  if (geokguk) sajuUsed.push('geokguk')

  const mc = astro.mc
  if (mc) astroUsed.push('mc')
  const sun = getPlanet(astro, 'Sun')
  const mars = getPlanet(astro, 'Mars')
  const saturn = getPlanet(astro, 'Saturn')
  const mercury = getPlanet(astro, 'Mercury')
  const pluto = getPlanet(astro, 'Pluto')
  if (sun) astroUsed.push('planets.sun')
  if (mars) astroUsed.push('planets.mars')
  if (saturn) astroUsed.push('planets.saturn')
  if (mercury) astroUsed.push('planets.mercury')
  if (pluto) astroUsed.push('planets.pluto')

  const tenthCusp = houseCusp(astro, 10)
  if (tenthCusp) astroUsed.push('houses.10')
  const sixthHouse = planetsInHouse(astro, 6)
  if (sixthHouse.length > 0) astroUsed.push('houses.6')

  const marsSaturn = mars && saturn ? aspectBetween(astro, 'Mars', 'Saturn') : undefined
  const sunMc = sun && mc ? aspectBetween(astro, 'Sun', 'MC') : undefined

  const pof = partOfFortune(astro)
  const pofInTenth = pof?.house === 10
  if (pof) astroUsed.push('partOfFortune')

  const fxOnMc = mc ? fixedStarOn(astro, 'MC') : []
  if (fxOnMc.length > 0) astroUsed.push('fixedStars(MC)')

  const progSun = progressedSun(astro)
  if (progSun) astroUsed.push('progressions.secondary.progressedSun')

  // Daeun timing — career sibsin is 식상 (creative/output) or 관성 (rank/authority)
  const officialDaeun = findDaeunByCategory(saju, '관성')
  const outputDaeun = findDaeunByCategory(saju, '식상')
  const wealthDaeun = findDaeunByCategory(saju, '재성')
  const cur = currentDaeun(saju)
  if (cur) sajuUsed.push('cycles.currentDaeun')
  if (officialDaeun || outputDaeun || wealthDaeun) sajuUsed.push('cycles.daeunCycles')

  // Fusion career confirms
  const careerConfirms = fusion?.byDomain?.career?.confirms ?? []
  const careerTone = fusion?.byDomain?.career?.tone
  if (careerConfirms.length > 0) {
    fusionUsed.push(...careerConfirms.slice(0, 3).map((m) => m.rule.id))
  }

  // Ultra advanced
  const jong = isJonggeok(saju) ? jonggeokType(saju) : ''
  if (jong) sajuUsed.push('ultraAdvanced.jonggeok')
  const samgi = samgiInfo(saju)
  if (samgi.hasSamgi) sajuUsed.push('ultraAdvanced.samgi')

  const iljuAptitudes = saju.ultraAdvanced?.iljuDeep?.careerAptitude ?? []
  if (iljuAptitudes.length > 0) sajuUsed.push('ultraAdvanced.iljuDeep.careerAptitude')

  // ── Paragraph 1: 기본 신호 (사주 + 점성 큰 그림)
  const dominantCategory = pickDominantSibsinCategory(cat)
  // Variation pools — same input always returns the same line.
  const dayMasterStem = saju.pillars.day.stem || ''
  const dayBranchStr = saju.pillars.day.branch || ''
  const iljuName = saju.ultraAdvanced?.iljuDeep?.ilju
  const timeStageVal = saju.ultraAdvanced?.iljuDeep?.twelveStage
  const sibsinCatVar = pickVariation(sibsinCategoryPool(dominantCategory, 'career'), [
    `day_master:${dayMasterStem}`,
    `geokguk:${geokguk}`,
    `category:${dominantCategory}`,
  ])
  const sunSignVar = pickVariation(planetSignPool('Sun', sun?.sign, 'career'), [
    `day_master:${dayMasterStem}`,
    `sun_sign:${sun?.sign ?? ''}`,
    `geokguk:${geokguk}`,
  ])
  // ASC × career (PR #345 — 첫인상이 직업로 어떻게)
  const asc = astro.ascendant
  const ascCareerVar = pickVariation(planetSignPool('Ascendant', asc?.sign, 'career'), [
    `day_master:${dayMasterStem}`,
    `asc_sign:${asc?.sign ?? ''}`,
    `geokguk:${geokguk}`,
  ])
  // Mercury × career (PR #347 — 사고)
  const mercurySignVar = pickVariation(planetSignPool('Mercury', mercury?.sign, 'career'), [
    `day_master:${dayMasterStem}`,
    `mercury_sign:${mercury?.sign ?? ''}`,
    `geokguk:${geokguk}`,
  ])
  // Mars × career (PR #347 — 추진력)
  const marsCareerVar = pickVariation(planetSignPool('Mars', mars?.sign, 'career'), [
    `day_master:${dayMasterStem}`,
    `mars_sign:${mars?.sign ?? ''}`,
    `geokguk:${geokguk}`,
  ])
  // Sun × house (PR #346 — 자아 표현 무대)
  const sunHouseVar = planetHouseLine('Sun', sun?.house, 'ko')
  // Mercury × house (this PR — 사고 무대)
  const mercuryHouseVar = planetHouseLine('Mercury', mercury?.house, 'ko')
  // Mars × house (this PR — 추진 무대)
  const marsHouseVar = planetHouseLine('Mars', mars?.house, 'ko')
  // Saturn × house — 구조·책임의 무대 (career 핵심 외행성)
  const saturnHouseVar = planetHouseLine('Saturn', saturn?.house, 'ko')
  // Pluto × house — 권력·변혁의 무대 (career 깊이 외행성)
  const plutoHouseVar = planetHouseLine('Pluto', pluto?.house, 'ko')
  if (ascCareerVar) astroUsed.push('pools.planetSign.asc.career')
  if (mercurySignVar) astroUsed.push('pools.planetSign.mercury.career')
  if (marsCareerVar) astroUsed.push('pools.planetSign.mars.career')
  if (sunHouseVar) astroUsed.push('pools.planetHouse.sun')
  if (mercuryHouseVar) astroUsed.push('pools.planetHouse.mercury')
  if (marsHouseVar) astroUsed.push('pools.planetHouse.mars')
  if (saturnHouseVar) astroUsed.push('pools.planetHouse.saturn')
  if (plutoHouseVar) astroUsed.push('pools.planetHouse.pluto')
  // P1 base paragraph — opener + sibsin-category variation + MC + Sun.
  // The pool variations are added via appendToPara below (single source of
  // truth for period/spacing). Do NOT inline them into the array here, or
  // the same line will be appended twice.
  let p1ko = paragraph([
    paragraphOpenerKo(dominantCategory, geokguk, dayMasterStem),
    mc
      ? `사회에 보여주는 모습은 ${signLabel(mc.sign, 'ko')}, ${mcSignFlavorKo(mc.sign)}이에요.`
      : '',
    sun
      ? `당신의 태양은 ${signLabel(sun.sign, 'ko')}${sun.house === 10 ? '의 사회 정점에 있어서' : sun.house ? `의 ${karmaHouseHintForCareerKo(sun.house)} 영역에 있어서` : '에 있어서'}, ${sun.house === 10 ? '여기서 빛나는 일이 직업의 중심이에요' : `${sunHouseFlavorKo(sun.house)}이 직업의 중심이에요`}.`
      : '',
  ])
  // P1 — keep to max 2 pool variations (Sun sign + Sun house) so the basic
  // identity paragraph stays short and readable. The remaining pool lines
  // (Mercury, Mars, Saturn, Pluto, ASC) move into P3 as deep-grain layer.
  // 두 pool 변주가 같은 종결("잘 맞아요")로 끝나는 단조로움을 줄인다.
  const [vSunSign, vSunHouse] = varyRepeatedEndings([sunSignVar ?? '', sunHouseVar ?? ''])
  p1ko = appendToPara(p1ko, vSunSign)
  p1ko = appendToPara(p1ko, vSunHouse)
  const p1en = paragraph([
    paragraphOpenerEn(dominantCategory, geokguk),
    mc
      ? `Your Midheaven (MC) sits in ${signLabel(mc.sign, 'en')}, so the face you bring to the world is ${mcSignFlavorEn(mc.sign)}.`
      : '',
    sun
      ? `With your Sun in ${signLabel(sun.sign, 'en')} (${houseLabel(sun.house, 'en')}), the core energy of your professional life is ${sunHouseFlavorEn(sun.house)}.`
      : '',
  ])

  // ── Paragraph 2: 시기·흐름 (대운 + transits + SR)
  const timingPieces: string[] = []
  const timingPiecesEn: string[] = []
  if (cur) {
    timingPieces.push(
      `지금 시기(${cur.age}세부터)에는 ${cur.sibsin ? sibsinMeaningKo(cur.sibsin) : '잔잔한 톤'}이 함께해서, 직업 분위기가 다듬어지고 있어요.`
    )
    timingPiecesEn.push(
      `Your current 10-year life-chapter (from age ${cur.age})${cur.sibsin ? ` runs on ${sibsinMeaningEn(cur.sibsin)}` : ''}, and it is slowly reshaping the tone of your career.`
    )
  }
  if (officialDaeun && (!cur || officialDaeun.age !== cur.age)) {
    timingPieces.push(`${officialDaeun.age}세 무렵엔 책임과 자리가 한 단계 올라가는 흐름이 와요.`)
    timingPiecesEn.push(
      `Around age ${officialDaeun.age}, a chapter of authority arrives and lifts both your standing and your responsibility a step higher.`
    )
  }
  if (outputDaeun && (!cur || outputDaeun.age !== cur.age)) {
    timingPieces.push(`${outputDaeun.age}세 무렵엔 표현과 창조, 실행력이 폭발하는 구간이에요.`)
    timingPiecesEn.push(
      `Around age ${outputDaeun.age}, a chapter of creative output opens up — expression, making, and follow-through all surge at once.`
    )
  }
  if (progSun) {
    timingPieces.push(
      `자아의 빛이 ${signLabel(progSun.sign, 'ko')}의 톤으로 옮겨가는 단계라, 직업 정체성도 천천히 색이 바뀌고 있어요.`
    )
    timingPiecesEn.push(
      `Your progressed Sun has moved into ${signLabel(progSun.sign, 'en')}${progSun.house ? ` (${houseLabel(progSun.house, 'en')})` : ''}, slowly retuning the color of your professional identity.`
    )
  }
  const p2ko = paragraph(
    timingPieces.length
      ? timingPieces
      : ['지금 흐름은 안정 구간이라, 큰 전환보다는 톤을 다듬는 시기예요.']
  )
  const p2en = paragraph(
    timingPiecesEn.length
      ? timingPiecesEn
      : [
          'For now your daeun and progressions sit in a steady stretch — a season for refining what you have rather than overhauling it.',
        ]
  )

  // ── Paragraph 3: 심화 통찰 (고급 지표 자연스럽게)
  const deepPieces: string[] = []
  const deepPiecesEn: string[] = []
  if (marsSaturn) {
    // 화성-토성(추진×인내) 각의 구체 narrative를 aspectPair DB에서 우선 사용.
    const msEntry = aspectPairEntryMajor('Mars', 'Saturn', marsSaturn.type)
    if (msEntry) {
      astroUsed.push('aspectPairDictionary.mars_saturn')
      deepPieces.push(firstSentence(msEntry.ko))
      deepPiecesEn.push(firstSentence(msEntry.en))
    } else {
      deepPieces.push(
        `당신의 화성과 토성이 ${aspectQuality(marsSaturn.type, 'ko')} 있어서, 추진력과 인내가 한 엔진처럼 같이 일해요.`
      )
      deepPiecesEn.push(
        `With Mars and Saturn ${aspectQuality(marsSaturn.type, 'en')} on the same axis, drive and endurance work together like a single engine.`
      )
    }
  }
  if (sunMc) {
    deepPieces.push(
      `당신의 태양과 사회 무대(MC)가 ${aspectQuality(sunMc.type, 'ko')}, 안과 밖이 어긋나지 않고 흘러요.`
    )
    deepPiecesEn.push(
      `Your Sun and Midheaven ${aspectQuality(sunMc.type, 'en')}, which keeps your inner identity and your public role moving in the same direction.`
    )
  }
  // aspectPair DB — 야망·추진 축의 각(태양-토성/태양-화성/화성-목성/화성-명왕).
  // 화성-토성은 위에서 별도 처리하므로 제외. 가장 좁은 각 1개만.
  const careerAspect = aspectPairEntriesForPairs(
    astro,
    [
      ['Sun', 'Saturn'],
      ['Sun', 'Mars'],
      ['Mars', 'Jupiter'],
      ['Mars', 'Pluto'],
    ],
    1
  )[0]
  if (careerAspect) {
    astroUsed.push('aspectPairDictionary.career')
    deepPieces.push(firstSentence(careerAspect.ko))
    deepPiecesEn.push(firstSentence(careerAspect.en))
  }
  if (pofInTenth) {
    deepPieces.push(`행운의 점이 사회 무대에 있어, 직업 자체가 행운의 통로가 되는 드문 배치예요.`)
    deepPiecesEn.push(
      `Your Part of Fortune sits in the 10th — a rare placement in which your career itself becomes the door through which luck arrives.`
    )
  }
  if (fxOnMc.length > 0) {
    deepPieces.push(
      `사회 무대에 특별한 별빛(${fxOnMc.join(', ')})이 닿아 있어서, 인상에 남다른 빛이 새겨져 있어요.`
    )
    deepPiecesEn.push(
      `The fixed star${fxOnMc.length > 1 ? 's' : ''} ${fxOnMc.join(', ')} touch${fxOnMc.length > 1 ? '' : 'es'} your Midheaven, leaving a distinctive mark on how the world reads you.`
    )
  }
  if (jong) {
    deepPieces.push(
      '삶이 한 방향으로 강하게 흐르는 구조라, 두루 넓히기보다 한 분야로 깊이 들어가는 길이 맞아요.'
    )
    deepPiecesEn.push(
      'Your chart flows as a single, focused current — a structure that rewards deep specialization rather than spreading wide.'
    )
  } else if (geokguk) {
    deepPieces.push(
      `인생의 큰 패턴이 ${geokgukShortKoForCareer(geokguk)}이라, 직업 방향이 이미 명확하게 잡혀 있어요.`
    )
    deepPiecesEn.push(
      `Your life-pattern is ${geokgukShortEnForCareer(geokguk)}, so the basic shape of your career is already set into the chart from the start.`
    )
  }
  if (samgi.hasSamgi) {
    deepPieces.push('큰 무대에서 인정받을 특별한 자질이 함께 깔려 있어요.')
    deepPiecesEn.push(
      'A rare nobility pattern sits in your chart, hinting at a latent capacity to be recognized on a larger stage.'
    )
  }
  if (iljuAptitudes.length > 0 && iljuName) {
    deepPieces.push(`타고난 자질은 ${iljuAptitudes.slice(0, 3).join('·')} 쪽으로 기울어 있어요.`)
    deepPiecesEn.push(`Your natural aptitudes lean toward ${aptitudeListEn(iljuAptitudes)}.`)
  }
  // Sibsin-category pool — deep-grain layer (P3, not P1) so the same line
  // does not double inside paragraph 1.
  if (sibsinCatVar) {
    sajuUsed.push('pools.sibsinCategory.career')
    deepPieces.push(/[.!?]$/.test(sibsinCatVar) ? sibsinCatVar : `${sibsinCatVar}.`)
  }
  // Mercury / Mars / ASC / outer-planet house variations live in P3 too,
  // but capped at 2 lines max to keep the paragraph readable. We pick the
  // first 2 non-empty signals deterministically from a priority list.
  const extraP3: string[] = []
  for (const v of [
    mercurySignVar,
    marsCareerVar,
    ascCareerVar,
    mercuryHouseVar,
    marsHouseVar,
    saturnHouseVar,
    plutoHouseVar,
  ]) {
    if (!v) continue
    if (extraP3.length >= 2) break
    extraP3.push(/[.!?]$/.test(v) ? v : `${v}.`)
  }
  for (const line of extraP3) deepPieces.push(line)
  // 12-stage variation — adds a stage-flavored career angle when the
  // day-pillar 12운성 signal is present.
  const stageVar = pickVariation(twelveStagePool(timeStageVal, 'career'), [
    `day_master:${dayMasterStem}`,
    `day_branch:${dayBranchStr}`,
    `stage:${timeStageVal ?? ''}`,
  ])
  if (stageVar) {
    sajuUsed.push('pools.twelveStage.career')
    deepPieces.push(/[.!?]$/.test(stageVar) ? stageVar : `${stageVar}.`)
  }
  // 12운성 단계 × 태양 하우스 — 삶의 에너지 단계가 어느 무대에서 펼쳐지는지.
  // (saju 12운성 ↔ astro house cross)
  const stageHouseKo = stageHouseLine(timeStageVal, sun?.house, 'ko')
  if (stageHouseKo) {
    sajuUsed.push('pools.stageHouse.career')
    deepPieces.push(/[.!?]$/.test(stageHouseKo) ? stageHouseKo : `${stageHouseKo}.`)
  }
  // 60갑자 일주 variation — wraps the dictionary archetype into a
  // career framing.
  const iljuVar = pickVariation(iljuPool(iljuName, 'career'), [
    `ilju:${iljuName ?? ''}`,
    `day_master:${dayMasterStem}`,
    `day_branch:${dayBranchStr}`,
  ])
  if (iljuVar) {
    sajuUsed.push('pools.ilju.career')
    deepPieces.push(/[.!?]$/.test(iljuVar) ? iljuVar : `${iljuVar}.`)
  }
  // Sibsin combination patterns (관성/식상/재성 grouping) — 직업 결.
  const patterns = extractSibsinPatterns(saju)
  const careerPatterns = sibsinPatternsForDomain(patterns, 'career')
  if (careerPatterns.length > 0) {
    sajuUsed.push('sibsin.patterns')
    const top = careerPatterns[0]
    deepPieces.push(careerPatternLineKo(top.name))
    deepPiecesEn.push(careerPatternLineEn(top.name))
  }
  // Sibsin positions — 관성/식상이 어느 기둥에 놓이는지 확인.
  const positions = extractSibsinPositions(saju)
  if (positions.length > 0) sajuUsed.push('sibsin.positions')
  const gwanseongPos = findPillarOfSibsinCategory(positions, '관성', { visibleOnly: true })
  if (gwanseongPos) {
    deepPieces.push(careerSibsinPositionLineKo(gwanseongPos.pillarKey, '관성'))
    deepPiecesEn.push(careerSibsinPositionLineEn(gwanseongPos.pillarKey, 'authority'))
  } else {
    const siksangPos = findPillarOfSibsinCategory(positions, '식상', { visibleOnly: true })
    if (siksangPos) {
      deepPieces.push(careerSibsinPositionLineKo(siksangPos.pillarKey, '식상'))
      deepPiecesEn.push(careerSibsinPositionLineEn(siksangPos.pillarKey, 'output'))
    }
  }
  // Saju relations — day master in tension/harmony with another pillar
  // shows the deepest professional pivot baked into the chart.
  const relKoCareer = relationPhraseKo(input.calendarSignals?.sajuRelations, {
    preferPillar: 'day',
    usedKeys: input.relUsed?.ko,
  })
  const relEnCareer = relationPhraseEn(input.calendarSignals?.sajuRelations, {
    preferPillar: 'day',
    usedKeys: input.relUsed?.en,
  })
  if (relKoCareer) {
    sajuUsed.push('calendarSignals.sajuRelations')
    deepPieces.push(`${relKoCareer} 만년에 직업 방향이 한 번 다듬어지는 시기가 있어요.`)
    if (relEnCareer)
      deepPiecesEn.push(
        `${relEnCareer} The color of your late-stage career gets retuned once before it settles.`
      )
  }
  // Lot of Courage — adds an extra deep-grain note about challenge appetite
  const courage = input.calendarSignals?.arabicParts?.Courage
  if (courage) {
    fusionUsed.push('calendarSignals.arabicParts.Courage')
    deepPieces.push(
      `용기의 행운점이 ${signLabel(courage.sign, 'ko')}에 놓여, 도전을 받아들이는 자리에서 직업 운이 가장 크게 풀려요.`
    )
    deepPiecesEn.push(
      `Your Lot of Courage sits in ${signLabel(courage.sign, 'en')} — your strongest career luck opens at the point where you step into challenge.`
    )
  }
  // Fusion career confirms (top 2)
  // 융합 규칙 문구는 한국어만 존재(영문 원문 없음) → EN 리포트엔 넣지 않아
  // 한글이 영문에 누출되지 않게 한다.
  if (careerConfirms.length > 0) {
    deepPieces.push(`그리고 ${naturalizeFragment(careerConfirms[0].rule.narrative.confirm)}`)
  }
  const careerConflicts = fusion?.byDomain?.career?.conflicts ?? []
  if (careerConflicts[0]?.rule.narrative.conflict) {
    deepPieces.push(`다만 ${naturalizeFragment(careerConflicts[0].rule.narrative.conflict)}`)
  }
  const p3ko = paragraph(
    deepPieces.length
      ? varyRepeatedEndings(deepPieces)
      : [
          '지금 흐름이 평탄하게 정렬돼 있어, 한쪽으로 치우치기보다 다양한 가능성이 함께 무르익는 시기예요.',
        ]
  )
  const p3en = paragraph(
    deepPiecesEn.length
      ? deepPiecesEn
      : [
          'Because current signals sit in a balanced array, no single direction dominates right now.',
        ]
  )

  // ── careerDictionary 매칭 — 사주/점성 신호로 구체적 직업 추천 (P4에 1-2 문장)
  const sajuCareerSignals: string[] = []
  if (cat.관성 >= 1) sajuCareerSignals.push('정관 강')
  if (cat.식상 >= 1) sajuCareerSignals.push('식상 강')
  if (cat.재성 >= 1) sajuCareerSignals.push('재성 강')
  if (cat.인성 >= 1) sajuCareerSignals.push('정인 강', '정인 받침')
  if (cat.비겁 >= 2) sajuCareerSignals.push('비겁 강')
  if (geokguk) sajuCareerSignals.push(geokguk)

  const astroCareerSignals: string[] = []
  if (mc?.sign) astroCareerSignals.push(`MC in ${mc.sign}`)
  if (sun?.house) astroCareerSignals.push(`Sun in ${sun.house}th`)
  if (saturn?.house) astroCareerSignals.push(`Saturn in ${saturn.house}th`)
  if (mercury?.house) astroCareerSignals.push(`Mercury in ${mercury.house}th`)

  const topCareers = matchTopCareers(sajuCareerSignals, astroCareerSignals, 3)
  if (topCareers.length > 0) sajuUsed.push('careerDictionary.matchTopCareers')

  // ── Paragraph 4: 실행 가이드
  let guideKo = buildCareerGuideKo({
    dominantCategory,
    careerTone,
    wealthAge: wealthDaeun?.age,
    officialAge: officialDaeun?.age,
  })
  let guideEn = buildCareerGuideEn({
    dominantCategory,
    careerTone,
    wealthAge: wealthDaeun?.age,
    officialAge: officialDaeun?.age,
  })

  // Calendar-engine: Lot of Spirit (직업의 행운점 — 행적·진로) + 10th-house lord dignity
  const spirit = input.calendarSignals?.arabicParts?.Spirit
  if (spirit) {
    fusionUsed.push('calendarSignals.arabicParts.Spirit')
    guideKo += ` 직업의 행운점이 ${signLabel(spirit.sign, 'ko')}에 놓여, 이 분위기를 일터에 가져갈수록 운이 자기 자리로 와요.`
    guideEn += ` Your Lot of Spirit sits in ${signLabel(spirit.sign, 'en')} — luck arrives at work when you consciously carry this flavor with you.`
  }
  // Profection — current-year lord & house
  const prof = input.calendarSignals?.profectionCurrent
  if (prof && (prof.house === 10 || prof.house === 6 || prof.house === 2)) {
    fusionUsed.push('calendarSignals.profections')
    guideKo += ` 올해는 ${prof.house === 10 ? '사회 무대' : prof.house === 6 ? '일터·실무' : '재산'} 영역이 활성돼서, 직업의 흐름이 손에 잡히는 결과로 이어지는 한 해예요.`
    guideEn += ` This year activates the area of ${prof.house === 10 ? 'public standing' : prof.house === 6 ? 'work and craft' : 'personal resources'} — career outcomes will translate into tangible results this year.`
  }

  // careerDictionary 추천 직업 — 구체적인 분야 1-2 문장으로 마무리.
  if (topCareers.length > 0) {
    const namesKo = topCareers.map((c) => `${c.emoji} ${c.name}`).join(', ')
    const namesEn = topCareers.map((c) => `${c.emoji} ${c.name_en}`).join(', ')
    const firstKo = firstSentence(topCareers[0]!.ko)
    const firstEn = firstSentence(topCareers[0]!.en)
    guideKo += ` 구체적으로는 ${namesKo} 분야가 잘 맞아요. ${firstKo}`
    guideEn += ` Concretely, ${namesEn} suit you well. ${firstEn}`
  }

  const paragraphs: Paragraph[] = [
    { ko: p1ko, en: p1en },
    { ko: p2ko, en: p2en },
    { ko: p3ko, en: p3en },
    { ko: guideKo, en: guideEn },
  ]

  return {
    id: 'career',
    title: { ko: '직업·커리어', en: 'Career & Vocation' },
    paragraphs,
    signals: { saju: sajuUsed, astro: astroUsed, fusion: fusionUsed },
  }
}

// ─── helpers (deterministic) ────────────────────────────────
// careerDictionary narrative 첫 문장만 뽑아 P4가 길어지지 않게 한다.
function firstSentence(s: string): string {
  const trimmed = s.trim()
  if (!trimmed) return ''
  const m = trimmed.match(/^[^.!?。]*[.!?。]/)
  return (m ? m[0] : trimmed).trim()
}

function pickDominantSibsinCategory(cat: Record<string, number>): string {
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

// 같은 dominantCategory + 다른 사주에서 다른 opener 가 나오도록, 일간(dayStem)
// 한자의 코드포인트를 기반으로 2-3개 변형 중 결정론적으로 선택.
function paragraphOpenerKo(cat: string, geokguk: string, dayStem: string): string {
  const seed = dayStem ? dayStem.charCodeAt(0) : 0
  if (cat === '식상') {
    const variants = [
      '당신은 표현하고 만들어내는 분이에요. 손으로 무언가를 풀어낼 때 가장 당신다워요.',
      '당신의 직업은 만들고 표현하는 흐름이 중심이에요. 머릿속 그림이 결과물로 옮겨질 때 가장 살아나요.',
      '창작과 표현이 직업의 무게추예요. 손끝과 입을 거쳐 풀려나갈 때 일이 잘 풀려요.',
    ]
    return variants[seed % variants.length]!
  }
  if (cat === '관성') {
    const variants = [
      '당신은 자리와 책임으로 자기를 증명하시는 편이에요. 책임감 있게 움직일 때 직업이 잘 풀려요.',
      '책임과 자리가 있을 때 직업이 가장 잘 풀려요. 맡은 자리에서 흐름을 만들 때 당신답게 빛나요.',
      '당신의 일은 권위와 역할로 색이 잡혀요. 책임을 짊어진 자리가 자기 증명의 무대가 돼요.',
    ]
    return variants[seed % variants.length]!
  }
  if (cat === '재성') {
    const variants = [
      '당신은 실리와 결과로 움직이시는 분이에요. 재물과 자원이 직업적 목적을 손에 잡히게 끌어와요.',
      '당신의 일은 실리와 자원에 닿을 때 가장 또렷해져요. 결과가 손에 잡히는 자리에서 본인 색이 살아요.',
      '자원을 굴리고 결과를 빚어낼 때 직업 흐름이 잡혀요. 돈과 실리가 일의 무대를 넓혀줘요.',
    ]
    return variants[seed % variants.length]!
  }
  if (cat === '인성') {
    const variants = [
      '당신은 배우고 정리해서 흐름을 만드시는 분이에요. 지혜와 돌봄이 직업의 토대가 돼요.',
      '배움과 정리하는 힘이 있을 때 직업이 잘 풀려요. 익히고 다듬는 자리에서 흐름이 살아나요.',
      '당신의 일은 학습과 돌봄이 받쳐줘요. 지혜를 모으는 자리에서 직업이 단단해져요.',
    ]
    return variants[seed % variants.length]!
  }
  if (cat === '비겁') {
    const variants = [
      '당신은 동등한 사람들과 함께 있을 때 가장 빛나시는 분이에요. 함께 걷는 흐름 속에서 자기 주도성이 단단해져요.',
      '동료와 함께 가는 일에서 직업이 가장 잘 풀려요. 같은 방향을 보는 사람들이 곁에 있을 때 일이 매끄러워져요.',
      '당신의 일은 협업과 건강한 경쟁 속에서 잘 풀려요. 어깨를 나란히 하는 자리가 자기 색을 키워줘요.',
    ]
    return variants[seed % variants.length]!
  }
  return geokguk
    ? `당신의 직업 색은 ${geokgukShortKoForCareer(geokguk)}에서 출발해요.`
    : '당신의 직업적 톤은 차분히 잘 잡혀 있어요.'
}

function paragraphOpenerEn(cat: string, geokguk: string): string {
  if (cat === '식상')
    return 'You are a maker at heart — a steady creative current runs through you, so you feel most yourself when you channel something out through your hands.'
  if (cat === '관성')
    return 'You prove yourself through role and responsibility — the authority dynamic acts as the gravitational axis of your professional life.'
  if (cat === '재성')
    return 'You move by outcome and resource — a resource-driven dynamic pulls your professional purpose toward tangible returns.'
  if (cat === '인성')
    return 'You build flow by learning and organizing — a wisdom-and-care dynamic forms the foundation of how you work.'
  if (cat === '비겁')
    return 'You thrive among peers and equals — this team energy strengthens both collaboration and self-direction.'
  return geokguk
    ? `Your career grain starts from ${geokgukShortEnForCareer(geokguk)}.`
    : 'Your professional grain is quietly settled inside you.'
}

// 격국 → natural English (career 섹션 전용).
function geokgukShortEnForCareer(g: string): string {
  if (!g) return 'a native shape'
  if (g.includes('편관')) return 'a pressure-as-fuel pattern, using challenge as the engine'
  if (g.includes('정관')) return 'a steady-authority pattern of orthodox role-taking'
  if (g.includes('편재')) return 'an opportunistic-resource sense'
  if (g.includes('정재')) return 'a steady-resource pattern of patient accumulation'
  if (g.includes('식신')) return 'an easeful-expression pattern'
  if (g.includes('상관')) return 'a free-talent pattern of free release'
  if (g.includes('편인')) return 'an unconventional-wisdom pattern'
  if (g.includes('정인')) return 'a learning-and-care pattern'
  return 'a native shape'
}

const MC_SIGN_FLAVOR_KO: Record<string, string> = {
  Aries: '돌파와 개척의 인상',
  Taurus: '안정과 신뢰의 인상',
  Gemini: '명민함과 다재함의 인상',
  Cancer: '돌봄과 가까움의 인상',
  Leo: '존재감 있는 빛의 인상',
  Virgo: '정확함과 헌신의 인상',
  Libra: '균형과 조정자의 인상',
  Scorpio: '깊이와 변혁의 인상',
  Sagittarius: '시야와 가르침의 인상',
  Capricorn: '구조와 권위의 인상',
  Aquarius: '독창과 공동체의 인상',
  Pisces: '공감과 예술의 인상',
}
const MC_SIGN_FLAVOR_EN: Record<string, string> = {
  Aries: 'pioneering and direct',
  Taurus: 'steady and trustworthy',
  Gemini: 'quick-witted and versatile',
  Cancer: 'caring and intimate',
  Leo: 'luminous and present',
  Virgo: 'precise and devoted',
  Libra: 'balancing and diplomatic',
  Scorpio: 'deep and transformative',
  Sagittarius: 'far-sighted and teaching',
  Capricorn: 'structural and authoritative',
  Aquarius: 'inventive and communal',
  Pisces: 'empathic and artistic',
}
function mcSignFlavorKo(sign: string): string {
  return MC_SIGN_FLAVOR_KO[sign] ?? '독특한 분위기의 인상'
}
function mcSignFlavorEn(sign: string): string {
  return MC_SIGN_FLAVOR_EN[sign] ?? 'a singular grain'
}

const SUN_HOUSE_FLAVOR_KO: Record<number, string> = {
  1: '자기 자신을 드러내는 일',
  2: '가치와 자원을 다루는 일',
  3: '말과 학습으로 잇는 일',
  4: '뿌리와 가정에 가까운 일',
  5: '창작·놀이·자녀에 가까운 일',
  6: '일터와 디테일을 다루는 일',
  7: '파트너십과 거래의 일',
  8: '깊이·재생·공동 자원의 일',
  9: '시야·여행·가르침의 일',
  10: '공적인 자리에서 빛나는 일',
  11: '동료·네트워크와 비전의 일',
  12: '은둔·치유·내적 작업',
}
const SUN_HOUSE_FLAVOR_EN: Record<number, string> = {
  1: 'work that puts you forward',
  2: 'work with value and resources',
  3: 'work that connects via words',
  4: 'work close to home and roots',
  5: 'creation, play and children',
  6: 'craft and daily detail',
  7: 'partnership and dealing',
  8: 'depth, regeneration, shared resources',
  9: 'vision, travel, teaching',
  10: 'shining in a public-facing role',
  11: 'community, networks, vision',
  12: 'solitude, healing, inner work',
}
function sunHouseFlavorKo(h: number): string {
  return SUN_HOUSE_FLAVOR_KO[h] ?? '독자적 직업의 영역'
}
function sunHouseFlavorEn(h: number): string {
  return SUN_HOUSE_FLAVOR_EN[h] ?? 'a singular professional grain'
}

function buildCareerGuideKo(args: {
  dominantCategory: string
  careerTone?: string
  wealthAge?: number
  officialAge?: number
}): string {
  const pieces: string[] = ['일상 가이드 한 줄:']
  if (args.dominantCategory === '식상')
    pieces.push('만든 결과를 꾸준히 바깥에 내보내세요. 묵혀둔 작품은 운을 못 끌어와요.')
  else if (args.dominantCategory === '관성')
    pieces.push('자리와 책임을 회피하지 말고 한 단계씩 받아들이세요. 운이 자리로 들어와요.')
  else if (args.dominantCategory === '재성')
    pieces.push('숫자와 결과로 끝맺는 습관을 유지하세요. 자원으로 결산해야 흐름이 풀려요.')
  else if (args.dominantCategory === '인성')
    pieces.push('계속 배우고 정리하세요. 학습 자체가 직업 자본이 돼요.')
  else if (args.dominantCategory === '비겁')
    pieces.push('동료와 파트너와의 연결을 끊지 마세요. 혼자 가지 않을 때 운이 더 커져요.')
  if (args.officialAge)
    pieces.push(`${args.officialAge}세 직전부터 책임을 살짝 키워두면 흐름이 자연스럽게 따라와요.`)
  if (args.wealthAge && (!args.officialAge || args.wealthAge !== args.officialAge))
    pieces.push(`${args.wealthAge}세 무렵엔 부수입과 확장의 창이 열려요.`)
  return paragraph(pieces)
}

// 십신 의미 자연어
function sibsinMeaningKo(sibsin: string): string {
  if (!sibsin) return '잔잔한 흐름'
  if (sibsin.includes('편관')) return '도전과 책임이 무겁게 다가오는 흐름'
  if (sibsin.includes('정관')) return '책임감 있게 자리를 잡는 흐름'
  if (sibsin.includes('편재')) return '기회를 잡아내는 감각'
  if (sibsin.includes('정재')) return '꾸준히 쌓아가는 흐름'
  if (sibsin.includes('식신')) return '여유로운 표현'
  if (sibsin.includes('상관')) return '재능을 자유롭게 풀어내는 흐름'
  if (sibsin.includes('편인')) return '독특한 직관'
  if (sibsin.includes('정인')) return '배움과 돌봄'
  if (sibsin.includes('비견')) return '동등한 동료 분위기'
  if (sibsin.includes('겁재')) return '치열한 경쟁심'
  return '잔잔한 흐름'
}

// 일주 careerAptitude는 한국어 라벨 ('다양한 분야', '예술', 등) → 자연 영어.
const APTITUDE_EN: Record<string, string> = {
  '다양한 분야': 'multiple fields',
  예술: 'art',
  창작: 'creative work',
  디자인: 'design',
  음악: 'music',
  미술: 'fine art',
  문학: 'literature',
  연기: 'acting',
  공연: 'performance',
  교육: 'education',
  연구: 'research',
  학문: 'academic work',
  의료: 'healthcare',
  치유: 'healing',
  상담: 'counselling',
  복지: 'social work',
  경영: 'management',
  리더십: 'leadership',
  행정: 'administration',
  법조: 'law',
  정치: 'politics',
  군: 'military',
  경찰: 'police',
  엔지니어링: 'engineering',
  기술: 'technical work',
  과학: 'science',
  금융: 'finance',
  투자: 'investing',
  회계: 'accounting',
  무역: 'trade',
  영업: 'sales',
  서비스: 'service',
  미디어: 'media',
  방송: 'broadcasting',
  글쓰기: 'writing',
  언론: 'journalism',
}
function aptitudeListEn(items: string[]): string {
  const mapped = items.slice(0, 3).map((a) => APTITUDE_EN[a] ?? 'a singular field')
  if (mapped.length === 0) return 'a singular field'
  if (mapped.length === 1) return mapped[0]
  return mapped.slice(0, -1).join(', ') + ' and ' + mapped[mapped.length - 1]
}

// 십신 → natural English (career 섹션 전용).
function sibsinMeaningEn(sibsin: string): string {
  if (!sibsin) return 'a quiet current'
  if (sibsin.includes('편관')) return 'a pressure-as-fuel pattern of challenge and weight'
  if (sibsin.includes('정관')) return 'a steady-authority pattern'
  if (sibsin.includes('편재')) return 'a quick eye for opportunity'
  if (sibsin.includes('정재')) return 'a patient accumulation pattern'
  if (sibsin.includes('식신')) return 'an easeful, expressive streak'
  if (sibsin.includes('상관')) return 'a free creative streak'
  if (sibsin.includes('편인')) return 'an unconventional-wisdom pattern'
  if (sibsin.includes('정인')) return 'a learning-and-care pattern'
  if (sibsin.includes('비견')) return 'a peer-driven dynamic'
  if (sibsin.includes('겁재')) return 'a fierce, competitive edge'
  return 'a quiet undercurrent'
}

// career 섹션용 격국 짧은 자연어
function geokgukShortKoForCareer(g: string): string {
  if (!g) return '본연의 색'
  if (g.includes('편관')) return '도전과 책임을 동력으로 쓰는 성향'
  if (g.includes('정관')) return '책임감 있는 정통의 흐름'
  if (g.includes('편재')) return '기회를 잡는 감각'
  if (g.includes('정재')) return '꾸준히 자원을 쌓는 흐름'
  if (g.includes('식신')) return '여유로운 표현과 창조'
  if (g.includes('상관')) return '재능을 자유롭게 발산하는 성향'
  if (g.includes('편인')) return '독특한 직관'
  if (g.includes('정인')) return '배움과 돌봄'
  return '본연의 색'
}

// career 섹션용 하우스 의미 자연어
function karmaHouseHintForCareerKo(h: number): string {
  const map: Record<number, string> = {
    1: '정체성',
    2: '재산',
    3: '소통',
    4: '가정',
    5: '창조',
    6: '일상',
    7: '관계',
    8: '깊이',
    9: '확장',
    10: '사회 무대',
    11: '공동체',
    12: '내면',
  }
  return map[h] || ''
}

function buildCareerGuideEn(args: {
  dominantCategory: string
  careerTone?: string
  wealthAge?: number
  officialAge?: number
}): string {
  const pieces: string[] = ['Daily handle:']
  if (args.dominantCategory === '식상')
    pieces.push('Keep publishing what you make. Work you keep hidden cannot attract luck to you.')
  else if (args.dominantCategory === '관성')
    pieces.push(
      'Do not duck titles and positions — accept them one step at a time. Luck arrives for you through the position itself.'
    )
  else if (args.dominantCategory === '재성')
    pieces.push(
      'Close out every effort with numbers. Completing the resource side is what unlocks the flow.'
    )
  else if (args.dominantCategory === '인성')
    pieces.push(
      'Keep learning and keep organizing what you learn. Study is your professional capital.'
    )
  else if (args.dominantCategory === '비겁')
    pieces.push(
      'Do not cut off your peer connections. Your luck scales when you choose not to walk alone.'
    )
  if (args.officialAge)
    pieces.push(
      `Stretch your responsibilities just a little just before age ${args.officialAge} — the cycle then catches up to you gracefully.`
    )
  if (args.wealthAge && (!args.officialAge || args.wealthAge !== args.officialAge))
    pieces.push(
      `Around age ${args.wealthAge}, the wealth cycle opens a window for side income and expansion.`
    )
  return paragraph(pieces)
}

// ─── Sibsin pattern → career line (natural language only) ────────
function careerPatternLineKo(name: string): string {
  if (name === '관살혼잡')
    return '관이 동시에 두 갈래로 몰려서, 책임과 권위 사이를 오가는 압박이 한 번 거쳐가요.'
  if (name === '식신제살')
    return '표현과 자기절제가 한 쌍처럼 움직여서, 위기 상황일수록 직업 운이 오히려 풀려요.'
  if (name === '관살혼잡' || name === '관성과다')
    return '책임이 한쪽으로 강하게 몰려서, 자리와 무게를 받아들이는 자리부터 운이 잡혀요.'
  if (name === '식상과다')
    return '표현과 창작이 한쪽으로 강하게 몰려서, 자기 결과물을 끊임없이 바깥으로 내보내는 면이 직업의 동력이에요.'
  if (name === '재성과다')
    return '재성이 강하게 몰려서, 손에 잡히는 결과로 끝맺는 직업 흐름이 가장 잘 풀려요.'
  if (name === '인성과다')
    return '배움과 돌봄이 강해서, 공부·정리·돌봄을 직업의 기둥으로 쓰는 길이 잘 맞아요.'
  if (name === '신강사주')
    return '사주가 강하게 자기로 돌아오는 흐름이라, 자기 결정으로 움직이는 직업이 운을 키워요.'
  if (name === '균형사주')
    return '사주 자질이 고르게 분포해서, 한 분야에 갇히지 않고 여러 방향을 함께 끌고 가는 길이 자연스러워요.'
  return ''
}

function careerPatternLineEn(name: string): string {
  if (name === '관살혼잡')
    return 'Two threads of authority crowd in at once — you pass through a season of pressure between responsibility and raw power.'
  if (name === '식신제살')
    return 'Expression and self-restraint move together as a pair — your career luck tends to open precisely when a crisis arrives.'
  if (name === '관성과다')
    return 'The authority dynamic runs heavily through your chart — luck only takes hold once you accept the position and the weight that comes with it.'
  if (name === '식상과다')
    return 'The creative-expression dynamic runs heavily through your chart — career power comes from constantly putting what you make out into the world.'
  if (name === '재성과다')
    return 'The wealth-and-resource pattern runs heavily through your chart — careers that close in tangible results tend to run the smoothest for you.'
  if (name === '인성과다')
    return 'The study-and-care pattern runs heavily through your chart — using study, curation, and care as the spine of your career fits you best.'
  if (name === '신강사주')
    return 'Your chart loops strongly back to the self — self-directed work is what scales the largest fortune for you.'
  if (name === '균형사주')
    return 'Your inner threads spread evenly — multiple directions can run side by side without any one of them locking you in.'
  return ''
}

// ─── Sibsin position → career line ───────────────────────────────
function careerSibsinPositionLineKo(
  pillar: 'year' | 'month' | 'day' | 'time',
  cat: '관성' | '식상'
): string {
  const pillarKo =
    pillar === 'month'
      ? '청년 자리'
      : pillar === 'year'
        ? '초년 자리'
        : pillar === 'day'
          ? '중년 자리'
          : '만년 자리'
  if (cat === '관성') {
    if (pillar === 'month')
      return '청년 자리에 책임과 권위가 놓여서, 사회적 자리와 책임이 직업 운의 가장 큰 축이 돼요.'
    if (pillar === 'time')
      return '만년 자리에 책임과 권위가 놓여서, 후반 인생에서 자리와 책임의 무게가 가장 크게 잡혀요.'
    return `${pillarKo}에 책임과 권위가 놓여서, 책임과 자리가 직업 운의 기둥으로 작용해요.`
  }
  if (cat === '식상') {
    if (pillar === 'month')
      return '청년 자리에 표현과 창작이 놓여서, 만들고 표현하는 일이 직업 운의 가장 큰 축이 돼요.'
    if (pillar === 'time')
      return '만년 자리에 표현과 창작이 놓여서, 후반 인생일수록 표현·창작이 직업의 방향을 정해요.'
    return `${pillarKo}에 표현과 창작이 놓여서, 표현과 창작이 직업 운을 끌어와요.`
  }
  return ''
}

function careerSibsinPositionLineEn(
  pillar: 'year' | 'month' | 'day' | 'time',
  cat: 'authority' | 'output'
): string {
  const seatEn: Record<'year' | 'month' | 'day' | 'time', string> = {
    year: 'early-life seat',
    month: 'young-adulthood seat',
    day: 'middle-life seat',
    time: 'late-life seat',
  }
  if (cat === 'authority') {
    if (pillar === 'month')
      return 'With the authority dynamic centred on your young-adulthood years, role and responsibility form the strongest axis of your career.'
    if (pillar === 'time')
      return 'With the authority dynamic centred on your late-life years, the weight of position lands hardest in late career.'
    return `With the authority dynamic centred on your ${seatEn[pillar]}, role and responsibility act as the spine of your work.`
  }
  if (pillar === 'month')
    return 'With the creative-expression dynamic centred on your young-adulthood years, making and expressing form the strongest axis of your career.'
  if (pillar === 'time')
    return 'With the creative-expression dynamic centred on your late-life years, late-career colour is set by expression and creation.'
  return `With the creative-expression dynamic centred on your ${seatEn[pillar]}, expression and creation pull your career luck in.`
}
