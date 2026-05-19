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
  paragraph,
  planetLabel,
  signLabel,
} from '../../templates/sentences'
import {
  appendToPara,
  pickVariation,
  twelveStagePool,
  sibsinCategoryPool,
  planetSignPool,
  iljuPool,
  planetHouseLine,
} from '../../pools'

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
  const sibsinCatVar = pickVariation(
    sibsinCategoryPool(dominantCategory, 'career'),
    [`day_master:${dayMasterStem}`, `geokguk:${geokguk}`, `category:${dominantCategory}`],
  )
  const sunSignVar = pickVariation(
    planetSignPool('Sun', sun?.sign, 'career'),
    [`day_master:${dayMasterStem}`, `sun_sign:${sun?.sign ?? ''}`, `geokguk:${geokguk}`],
  )
  // P1 base paragraph — opener + sibsin-category variation + MC + Sun.
  // The pool variations are added via appendToPara below (single source of
  // truth for period/spacing). Do NOT inline them into the array here, or
  // the same line will be appended twice.
  let p1ko = paragraph([
    paragraphOpenerKo(dominantCategory, geokguk),
    mc
      ? `사회에 보여주는 모습은 ${signLabel(mc.sign, 'ko')}, ${mcSignFlavorKo(mc.sign)}이에요.`
      : '',
    sun
      ? `자아의 별은 ${signLabel(sun.sign, 'ko')}${sun.house === 10 ? '의 사회 정점에 머물러' : sun.house ? `의 ${karmaHouseHintForCareerKo(sun.house)} 영역에 머물러` : '에 머물러'}, ${sunHouseFlavorKo(sun.house)}이 직업의 핵심 에너지예요.`
      : '',
  ])
  // Sun-sign pool goes to P1 (planet-level identity). Sibsin-category pool
  // is reserved for P3 (deep-grain layer) so the same variation never
  // doubles inside a single paragraph.
  p1ko = appendToPara(p1ko, sunSignVar)
  p1ko = appendToPara(p1ko, sunHouseVar)
  p1ko = appendToPara(p1ko, mercurySignVar)
  p1ko = appendToPara(p1ko, marsCareerVar)
  p1ko = appendToPara(p1ko, ascCareerVar)
  if (ascCareerVar) astroUsed.push('pools.planetSign.asc.career')
  const p1en = paragraph([
    paragraphOpenerEn(dominantCategory, geokguk),
    mc
      ? `Your MC sits in ${signLabel(mc.sign, 'en')}, so the face you bring to the world is ${mcSignFlavorEn(mc.sign)}.`
      : '',
    sun
      ? `With the Sun in ${signLabel(sun.sign, 'en')} ${houseLabel(sun.house, 'en')}, your core professional energy is ${sunHouseFlavorEn(sun.house)}.`
      : '',
  ])

  // ── Paragraph 2: 시기·흐름 (대운 + transits + SR)
  const timingPieces: string[] = []
  const timingPiecesEn: string[] = []
  if (cur) {
    timingPieces.push(
      `지금의 인생 흐름(${cur.age}세부터)에는 ${cur.sibsin ? sibsinMeaningKo(cur.sibsin) : '잔잔한 톤'}이 함께해서, 직업의 색이 다듬어지고 있어요.`
    )
    timingPiecesEn.push(
      `Your current daeun (from age ${cur.age}, ${cur.stem}${cur.branch})${cur.sibsin ? ` carries ${cur.sibsin} energy and` : ''} is reshaping your career grain.`
    )
  }
  if (officialDaeun && (!cur || officialDaeun.age !== cur.age)) {
    timingPieces.push(`${officialDaeun.age}세 무렵엔 책임과 자리가 한 단계 올라가는 흐름이 와요.`)
    timingPiecesEn.push(
      `Around age ${officialDaeun.age}, an authority-cycle (관성 daeun) lifts your standing and responsibility.`
    )
  }
  if (outputDaeun && (!cur || outputDaeun.age !== cur.age)) {
    timingPieces.push(`${outputDaeun.age}세 무렵엔 표현과 창조, 실행력이 폭발하는 구간이에요.`)
    timingPiecesEn.push(
      `Near age ${outputDaeun.age}, the 식상 daeun bursts open expression, creation and output.`
    )
  }
  if (progSun) {
    timingPieces.push(
      `자아의 빛이 ${signLabel(progSun.sign, 'ko')}의 톤으로 옮겨가는 단계라, 직업 정체성도 천천히 색이 바뀌고 있어요.`
    )
    timingPiecesEn.push(
      `Your progressed Sun has moved into ${signLabel(progSun.sign, 'en')}${progSun.house ? ` (${houseLabel(progSun.house, 'en')})` : ''}, slowly retuning your professional identity.`
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
          'For now your daeun and progression sit in a steady stretch — a season for refining rather than overhauling.',
        ]
  )

  // ── Paragraph 3: 심화 통찰 (고급 지표 자연스럽게)
  const deepPieces: string[] = []
  const deepPiecesEn: string[] = []
  if (marsSaturn) {
    deepPieces.push(
      `행동의 별과 책임의 별이 ${aspectQuality(marsSaturn.type, 'ko')} 있어서, 추진력과 인내가 한 엔진처럼 같이 일해요.`
    )
    deepPiecesEn.push(
      `Because Mars and Saturn ${aspectQuality(marsSaturn.type, 'en')} on the same axis, drive (Mars) and endurance (Saturn) cooperate as one engine.`
    )
  }
  if (sunMc) {
    deepPieces.push(
      `자아의 빛과 사회 무대가 ${aspectQuality(sunMc.type, 'ko')}, 안과 밖이 어긋나지 않고 흘러요.`
    )
    deepPiecesEn.push(
      `Sun-MC ${aspectQuality(sunMc.type, 'en')}, keeping inner identity and public role aligned.`
    )
  }
  if (pofInTenth) {
    deepPieces.push(`행운의 점이 사회 무대에 있어, 직업 자체가 행운의 통로가 되는 드문 배치예요.`)
    deepPiecesEn.push(
      `Part of Fortune in the 10th — a rare placement where the career itself becomes the door to luck.`
    )
  }
  if (fxOnMc.length > 0) {
    deepPieces.push(
      `사회 무대에 특별한 별빛(${fxOnMc.join(', ')})이 닿아 있어서, 인상에 남다른 빛이 새겨져 있어요.`
    )
    deepPiecesEn.push(
      `Fixed star(s) ${fxOnMc.join(', ')} contact your MC, etching a distinct grain into how the world reads you.`
    )
  }
  if (jong) {
    deepPieces.push(
      '삶이 한 방향으로 강하게 흐르는 구조라, 두루 넓히기보다 한 분야로 깊이 들어가는 길이 맞아요.'
    )
    deepPiecesEn.push(
      `Saju runs as ${jong} — a strong one-direction current that favors specialization over breadth.`
    )
  } else if (geokguk) {
    deepPieces.push(
      `인생의 큰 패턴이 ${geokgukShortKoForCareer(geokguk)}이라, 직업 색이 이미 명확하게 잡혀 있어요.`
    )
    deepPiecesEn.push(
      `Your geokguk is ${geokguk}, so the basic shape of your career is already pre-tuned.`
    )
  }
  if (samgi.hasSamgi) {
    deepPieces.push('큰 무대에서 인정받을 특별한 자질이 함께 깔려 있어요.')
    deepPiecesEn.push(
      `A ${samgi.type ?? 'samgi'} pattern is present — a latent capacity for recognition on a larger stage.`
    )
  }
  if (iljuAptitudes.length > 0 && iljuName) {
    deepPieces.push(`타고난 자질은 ${iljuAptitudes.slice(0, 3).join('·')} 쪽에 잘 맞아요.`)
    deepPiecesEn.push(
      `Your ilju (${iljuName}) naturally fits ${iljuAptitudes.slice(0, 3).join(' / ')}.`
    )
  }
  // Sibsin-category pool — deep-grain layer (P3, not P1) so the same line
  // does not double inside paragraph 1.
  if (sibsinCatVar) {
    sajuUsed.push('pools.sibsinCategory.career')
    deepPieces.push(/[.!?]$/.test(sibsinCatVar) ? sibsinCatVar : `${sibsinCatVar}.`)
  }
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
  })
  const relEnCareer = relationPhraseEn(input.calendarSignals?.sajuRelations, {
    preferPillar: 'day',
  })
  if (relKoCareer) {
    sajuUsed.push('calendarSignals.sajuRelations')
    deepPieces.push(`${relKoCareer} 만년에 직업 색이 한 번 다듬어지는 시기가 있어요.`)
    if (relEnCareer) deepPiecesEn.push(`${relEnCareer} The late-career colour gets re-tuned once.`)
  }
  // Lot of Courage — adds an extra deep-grain note about challenge appetite
  const courage = input.calendarSignals?.arabicParts?.Courage
  if (courage) {
    fusionUsed.push('calendarSignals.arabicParts.Courage')
    deepPieces.push(
      `용기의 행운점이 ${karmaSignKoCareer(courage.sign)}에 놓여, 도전을 받아들이는 자리에서 직업 운이 가장 크게 풀려요.`
    )
    deepPiecesEn.push(
      `Your Lot of Courage in ${courage.sign} pulls the strongest career luck through the place where you accept challenge.`
    )
  }
  // Fusion career confirms (top 2)
  if (careerConfirms.length > 0) {
    const top = careerConfirms[0]
    deepPieces.push(`그리고 ${top.rule.narrative.confirm}`)
    deepPiecesEn.push(`Additionally, ${top.rule.meaning}.`)
  }
  const p3ko = paragraph(
    deepPieces.length
      ? deepPieces
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
    guideKo += ` 직업의 행운점이 ${spirit.sign === 'Aries' ? '양자리' : spirit.sign === 'Taurus' ? '황소자리' : spirit.sign === 'Gemini' ? '쌍둥이자리' : spirit.sign === 'Cancer' ? '게자리' : spirit.sign === 'Leo' ? '사자자리' : spirit.sign === 'Virgo' ? '처녀자리' : spirit.sign === 'Libra' ? '천칭자리' : spirit.sign === 'Scorpio' ? '전갈자리' : spirit.sign === 'Sagittarius' ? '사수자리' : spirit.sign === 'Capricorn' ? '염소자리' : spirit.sign === 'Aquarius' ? '물병자리' : '물고기자리'}에 놓여, 이 결을 일터에 가져갈수록 운이 자기 자리로 와요.`
    guideEn += ` Your Lot of Spirit in ${spirit.sign} signals the grain to bring into the workplace — luck arrives when you carry it deliberately.`
  }
  // Profection — current-year lord & house
  const prof = input.calendarSignals?.profectionCurrent
  if (prof && (prof.house === 10 || prof.house === 6 || prof.house === 2)) {
    fusionUsed.push('calendarSignals.profections')
    guideKo += ` 올해는 ${prof.house}궁(${prof.house === 10 ? '사회 무대' : prof.house === 6 ? '일터·실무' : '재산'})이 활성돼서, 직업의 흐름이 손에 잡히는 결과로 이어지는 한 해예요.`
    guideEn += ` This year activates house ${prof.house} — career outcomes translate into tangible result.`
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

function paragraphOpenerKo(cat: string, geokguk: string): string {
  if (cat === '식상')
    return '당신은 표현하고 만들어내는 사람이에요. 손으로 무언가를 풀어낼 때 가장 본인다워져요.'
  if (cat === '관성')
    return '당신은 자리와 책임으로 자기를 증명하는 사람이에요. 책임감 있는 흐름이 직업의 무게추로 작동해요.'
  if (cat === '재성')
    return '당신은 실리와 결과로 움직이는 사람이에요. 재물과 자원이 직업적 목적을 손에 잡히게 끌어와요.'
  if (cat === '인성')
    return '당신은 배우고 정리해서 흐름을 만드는 사람이에요. 지혜와 돌봄이 직업의 토대가 돼요.'
  if (cat === '비겁')
    return '당신은 동등한 사람들과 함께 있을 때 가장 빛나는 사람이에요. 함께 가는 흐름이 자기 주도성을 단단하게 길러줘요.'
  return geokguk
    ? `당신의 직업 색은 ${geokgukShortKoForCareer(geokguk)}에서 출발해요.`
    : '당신의 직업적 톤은 차분히 잘 잡혀 있어요.'
}

function paragraphOpenerEn(cat: string, geokguk: string): string {
  if (cat === '식상')
    return 'You are a maker. 식상 sits at the heart of your saju, so you feel most yourself when you channel something out through your hands.'
  if (cat === '관성')
    return 'You prove yourself through role and responsibility. 관성 acts as the gravitational axis of your professional life.'
  if (cat === '재성')
    return 'You move by outcome and resource. 재성 pulls your professional purpose toward tangible returns.'
  if (cat === '인성')
    return 'You build flow by learning and organizing. 인성 forms the foundation of how you work.'
  if (cat === '비겁')
    return 'You thrive among peers and equals. 비겁 strengthens collaboration and self-direction.'
  return geokguk
    ? `Your career grain starts from the ${geokguk} pattern.`
    : 'Your professional grain is quietly settled inside the saju.'
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
  return MC_SIGN_FLAVOR_KO[sign] ?? '독특한 색감의 인상'
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
  10: 'shining in a public seat',
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

function karmaSignKoCareer(sign: string): string {
  const map: Record<string, string> = {
    Aries: '양자리',
    Taurus: '황소자리',
    Gemini: '쌍둥이자리',
    Cancer: '게자리',
    Leo: '사자자리',
    Virgo: '처녀자리',
    Libra: '천칭자리',
    Scorpio: '전갈자리',
    Sagittarius: '사수자리',
    Capricorn: '염소자리',
    Aquarius: '물병자리',
    Pisces: '물고기자리',
  }
  return map[sign] ?? sign
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
    pieces.push('Keep publishing what you make. Hidden output cannot attract luck.')
  else if (args.dominantCategory === '관성')
    pieces.push(
      'Do not duck titles and seats — accept them one step at a time. Luck arrives through the seat.'
    )
  else if (args.dominantCategory === '재성')
    pieces.push('Close every effort with numbers. Resource-completion unlocks the flow.')
  else if (args.dominantCategory === '인성')
    pieces.push('Keep learning and organizing. Study is your professional capital.')
  else if (args.dominantCategory === '비겁')
    pieces.push('Do not sever your peer links. Luck scales when you do not walk alone.')
  if (args.officialAge)
    pieces.push(
      `Slightly enlarge your responsibilities just before age ${args.officialAge} — the cycle catches up gracefully.`
    )
  if (args.wealthAge && (!args.officialAge || args.wealthAge !== args.officialAge))
    pieces.push(
      `Around age ${args.wealthAge}, the wealth cycle opens a side-income / expansion window.`
    )
  return paragraph(pieces)
}

// ─── Sibsin pattern → career line (natural language only) ────────
function careerPatternLineKo(name: string): string {
  if (name === '관살혼잡')
    return '관의 결이 동시에 두 갈래로 몰려서, 책임과 권위 사이를 오가는 압박이 한 번 거쳐가요.'
  if (name === '식신제살')
    return '표현과 자기절제가 한 쌍처럼 움직여서, 위기 상황일수록 직업 운이 오히려 풀려요.'
  if (name === '관살혼잡' || name === '관성과다')
    return '책임의 결이 한쪽으로 강하게 몰려서, 자리와 무게를 받아들이는 자리부터 운이 잡혀요.'
  if (name === '식상과다')
    return '표현과 창작의 결이 한쪽으로 강하게 몰려서, 자기 결과물을 끊임없이 바깥으로 내보내는 결이 직업의 동력이에요.'
  if (name === '재성과다')
    return '재성의 결이 강하게 몰려서, 손에 잡히는 결과로 끝맺는 직업 흐름이 가장 잘 풀려요.'
  if (name === '인성과다')
    return '배움과 돌봄의 결이 강해서, 공부·정리·돌봄을 직업의 기둥으로 쓰는 길이 잘 맞아요.'
  if (name === '신강사주')
    return '사주가 강하게 자기로 돌아오는 결이라, 자기 결정으로 움직이는 직업이 운을 키워요.'
  if (name === '균형사주')
    return '사주 자질이 고르게 분포해서, 한 분야에 갇히지 않고 여러 결을 함께 끌고 가는 길이 자연스러워요.'
  return ''
}

function careerPatternLineEn(name: string): string {
  if (name === '관살혼잡')
    return 'Two strands of authority crowd in at once — you pass through pressure between responsibility and power.'
  if (name === '식신제살')
    return 'Expression and self-restraint move as a pair — career luck opens precisely when the crisis arrives.'
  if (name === '관성과다')
    return 'The authority grain crowds in heavily — luck only catches once you accept seat and weight.'
  if (name === '식상과다')
    return 'The output grain runs heavily — career power comes from constantly publishing what you make.'
  if (name === '재성과다')
    return 'The wealth grain runs heavily — careers that finish in tangible result run smoothest.'
  if (name === '인성과다')
    return 'The study / care grain runs heavily — using study, curation and care as the career spine fits best.'
  if (name === '신강사주')
    return 'The chart loops strongly back to self — self-directed work scales the largest fortune.'
  if (name === '균형사주')
    return 'Sibsin spread evenly — multiple grains can run side by side without locking into one.'
  return ''
}

// ─── Sibsin position → career line ───────────────────────────────
function careerSibsinPositionLineKo(
  pillar: 'year' | 'month' | 'day' | 'time',
  cat: '관성' | '식상',
): string {
  const pillarKo = pillar === 'month' ? '청년 자리'
    : pillar === 'year' ? '초년 자리'
    : pillar === 'day' ? '중년 자리'
    : '만년 자리'
  if (cat === '관성') {
    if (pillar === 'month')
      return '청년 자리에 책임과 권위의 결이 놓여서, 사회적 자리와 책임이 직업 운의 가장 큰 축이 돼요.'
    if (pillar === 'time')
      return '만년 자리에 책임과 권위의 결이 놓여서, 후반 인생에서 자리와 책임의 무게가 가장 크게 잡혀요.'
    return `${pillarKo}에 책임과 권위의 결이 놓여서, 책임과 자리가 직업 운의 기둥으로 작용해요.`
  }
  if (cat === '식상') {
    if (pillar === 'month')
      return '청년 자리에 표현과 창작의 결이 놓여서, 만들고 표현하는 결이 직업 운의 가장 큰 축이 돼요.'
    if (pillar === 'time')
      return '만년 자리에 표현과 창작의 결이 놓여서, 후반 인생일수록 표현·창작의 결이 직업의 색을 정해요.'
    return `${pillarKo}에 표현과 창작의 결이 놓여서, 표현과 창작이 직업 운을 끌어와요.`
  }
  return ''
}

function careerSibsinPositionLineEn(
  pillar: 'year' | 'month' | 'day' | 'time',
  cat: 'authority' | 'output',
): string {
  const pillarEn = pillar === 'month' ? 'month pillar'
    : pillar === 'year' ? 'year pillar'
    : pillar === 'day' ? 'day pillar'
    : 'hour pillar'
  if (cat === 'authority') {
    if (pillar === 'month')
      return 'With 관성 in the month pillar, role and responsibility form the strongest axis of your career.'
    if (pillar === 'time')
      return 'With 관성 in the hour pillar, the weight of position lands hardest in late career.'
    return `With 관성 in the ${pillarEn}, role and responsibility act as the spine of work.`
  }
  if (pillar === 'month')
    return 'With 식상 in the month pillar, making and expressing form the strongest axis of your career.'
  if (pillar === 'time')
    return 'With 식상 in the hour pillar, late-career colour is set by expression and creation.'
  return `With 식상 in the ${pillarEn}, expression and creation pull your career luck in.`
}
