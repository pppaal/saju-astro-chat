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
  declinationAspects,
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
import {
  pickVariation,
  twelveStagePool,
  planetSignPool,
  iljuPool,
  planetHouseLine,
} from '../../pools'

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
  const marsSaturn = mars && saturn ? aspectBetween(astro, 'Mars', 'Saturn') : undefined
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
    '건강의 큰 그림은 다섯 가지 기운(목·화·토·금·수)의 균형에서 출발해요.',
    weak.length > 0
      ? `${weakLabels.join('·')}의 기운이 약해서 ${organKo(weak)} 쪽이 평소 보살핌이 필요해요.`
      : '다섯 기운이 비교적 고르게 분포돼 있어, 한쪽으로 치우치는 약점은 적어요.',
    yongsin
      ? `삶의 균형추가 되는 기운은 ${yongsinElementKo(yongsin)}이라, ${yongsinFlavorKo(yongsin)}이 일상의 보강 방향이에요.`
      : '',
  ])
  const p1en = paragraph([
    'The big picture of your health starts with the balance of the five elements.',
    weak.length > 0
      ? `Your ${weakLabelsEn.join(' and ')} element${weakLabelsEn.length > 1 ? 's run' : ' runs'} lower, so your ${organEn(weak)} need ongoing care.`
      : 'Your five elements sit relatively even, so no single weakness dominates.',
    yongsin
      ? `Your supportive element is ${yongsinElementEnHealth(yongsin)}, so leaning into ${yongsinFlavorEn(yongsin)} is your daily way to strengthen it.`
      : '',
  ])

  // ── Paragraph 2: 점성 — 일터 건강 + Mars/Saturn
  const sixthFlavor =
    sixthPlanets.length > 0
      ? (() => {
          const flavor = sixthHouseFlavorKo(sixthPlanets)
          return `일상 영역에 ${sixthPlanets.map((p) => planetLabel(p.name, 'ko')).join(', ')}이 머물러, 일상의 ${flavor}${iGa(flavor)} 건강의 흐름으로 이어져요.`
        })()
      : '일상 영역은 비어 있어, 건강의 흐름은 다른 영역의 별들이 함께 받쳐줘요.'
  const sixthFlavorEn =
    sixthPlanets.length > 0
      ? `With ${sixthPlanets.map((p) => p.name).join(', ')} sitting in your 6th house, the daily texture of ${sixthHouseFlavorEn(sixthPlanets)} carries your health signal.`
      : `Your 6th house is empty — your health is carried jointly by signals from other placements.`

  const p2ko = paragraph([
    sixthFlavor,
    marsSaturn
      ? `당신의 화성과 토성이 ${aspectQuality(marsSaturn.type, 'ko')}, 스트레스가 ${marsSaturnFlavorKo(marsSaturn.type)} 모양으로 누적될 수 있어요.`
      : '',
  ])
  const p2en = paragraph([
    sixthFlavorEn,
    marsSaturn
      ? `Your Mars and Saturn ${aspectQuality(marsSaturn.type, 'en')}, so stress tends to accumulate in a ${marsSaturnFlavorEn(marsSaturn.type)} pattern.`
      : '',
  ])

  // ── Paragraph 3: 심화 — Chiron, OOB, eclipse
  const deepKo: string[] = []
  const deepEn: string[] = []

  // 일주 건강 결 — 60갑자 health narrative DB (orthodox 자평진전 출처)
  const iljuNameH = saju.ultraAdvanced?.iljuDeep?.ilju
  const iljuHealthVar = pickVariation(iljuPool(iljuNameH, 'health'), [
    `ilju:${iljuNameH ?? ''}`,
    'domain:health',
  ])
  if (iljuHealthVar) {
    sajuUsed.push('pools.ilju.health')
    deepKo.push(/[.!?]$/.test(iljuHealthVar) ? iljuHealthVar : `${iljuHealthVar}.`)
    deepEn.push(
      `Your day-pillar archetype (${iljuLabelEnHealth(iljuNameH)}) points to this particular constitutional pattern.`
    )
  }

  if (ch) {
    deepKo.push(
      `상처와 치유의 색은 ${signLabel(ch.sign, 'ko')}의 분위기로 자리잡아, ${chironFlavorKo(ch.house)} 영역이 상처와 치유로 함께 묶여 있어요.`
    )
    deepEn.push(
      `Chiron in ${signLabel(ch.sign, 'en')} (${houseLabel(ch.house, 'en')}) marks ${chironFlavorEn(ch.house)} as the area where wounding and healing run together as one thread.`
    )
  }
  if (oob.length > 0) {
    deepKo.push(
      `또 ${oob.map(planetLabelHealthKo).join(', ')}이 일반 궤도 밖으로 나가 있어서, 평균을 넘는 특이한 건강 패턴이 나올 수 있어요.`
    )
    deepEn.push(
      `On top of that, ${oob.join(', ')} run out of bounds in declination, which can produce health patterns that sit outside the average range.`
    )
  }
  // Declination aspects — parallel(같은 결) / contraparallel(마주보는 결)
  // 행성 결합으로 본 신체 리듬의 결.
  const decls = declinationAspects(astro)
  if (decls.length > 0) {
    astroUsed.push('declinations.aspects')
    const par = decls.find((d) => d.kind === 'parallel')
    const contra = decls.find((d) => d.kind === 'contraparallel')
    if (par) {
      deepKo.push(
        `${planetLabelHealthKo(par.a)}과 ${planetLabelHealthKo(par.b)}이 평행으로 만나, 두 별의 흐름이 같은 방향으로 몸의 리듬을 만들어요.`
      )
      deepEn.push(
        `${par.a} and ${par.b} share a parallel declination — their currents braid together into a single rhythm inside the body.`
      )
    }
    if (contra) {
      deepKo.push(
        `${planetLabelHealthKo(contra.a)}과 ${planetLabelHealthKo(contra.b)}이 마주보는 긴장을 이루어, 두 흐름이 균형을 맞추기 위한 작은 부하가 몸에 새겨져요.`
      )
      deepEn.push(
        `${contra.a} and ${contra.b} sit in contraparallel declination — a small balancing load is written into the body's natural rhythm.`
      )
    }
  }
  if (eclipses?.degree !== undefined) {
    deepKo.push(
      '태어난 시기 가까이 있던 일식·월식의 흔적이 신체 리듬에 미세한 부하를 남기는 흐름이에요.'
    )
    deepEn.push(
      `An eclipse close to your birth leaves a subtle imprint on the rhythms of your body.`
    )
  }
  if (unlucky.length > 0) {
    deepKo.push('무리가 누적되지 않도록 평소 회복 루틴이 필요한 흐름이 함께 있어요.')
    deepEn.push(
      'Strain-prone signals run through your chart — keep a steady recovery routine in place to prevent overload from building up.'
    )
  }
  if (healthConfirms.length > 0) {
    deepKo.push(`그리고 ${healthConfirms[0].rule.narrative.confirm}`)
    deepEn.push(`Additionally, ${healthConfirms[0].rule.meaning}.`)
  }
  const healthConflicts = fusion?.byDomain?.health?.conflicts ?? []
  if (healthConflicts[0]?.rule.narrative.conflict) {
    deepKo.push(`다만 ${healthConflicts[0].rule.narrative.conflict}`)
    deepEn.push(`That said, ${healthConflicts[0].rule.meaning}.`)
  }
  // Saju relations — 형(reshape) / 충(clash) often surface as body-stress
  // patterns. Bias the pick toward those kinds.
  const relKoHealth =
    relationPhraseKo(input.calendarSignals?.sajuRelations, {
      preferKind: '형',
      usedKeys: input.relUsed?.ko,
    }) ??
    relationPhraseKo(input.calendarSignals?.sajuRelations, {
      preferKind: '충',
      usedKeys: input.relUsed?.ko,
    })
  const relEnHealth =
    relationPhraseEn(input.calendarSignals?.sajuRelations, {
      preferKind: '형',
      usedKeys: input.relUsed?.en,
    }) ??
    relationPhraseEn(input.calendarSignals?.sajuRelations, {
      preferKind: '충',
      usedKeys: input.relUsed?.en,
    })
  if (relKoHealth) {
    sajuUsed.push('calendarSignals.sajuRelations')
    deepKo.push(`${relKoHealth} 무리가 쌓이면 그 자리부터 몸의 반응이 먼저 와요.`)
    if (relEnHealth)
      deepEn.push(
        `${relEnHealth} When you push too hard, the strain tends to surface from that area first.`
      )
  }
  // 12-stage × health + planet × sign × health variations — capped at 2
  // additional astro pool lines so the deep paragraph does not bloat.
  const dayMasterStemH = saju.pillars.day.stem || ''
  const dayBranchH = saju.pillars.day.branch || ''
  const stageH = saju.ultraAdvanced?.iljuDeep?.twelveStage
  const sunH = getPlanet(astro, 'Sun')
  const stageHealthVar = pickVariation(twelveStagePool(stageH, 'health'), [
    `day_master:${dayMasterStemH}`,
    `day_branch:${dayBranchH}`,
    `stage:${stageH ?? ''}`,
  ])
  if (stageHealthVar) {
    sajuUsed.push('pools.twelveStage.health')
    deepKo.push(/[.!?]$/.test(stageHealthVar) ? stageHealthVar : `${stageHealthVar}.`)
  }
  const sunHealthVar = pickVariation(planetSignPool('Sun', sunH?.sign, 'health'), [
    `day_master:${dayMasterStemH}`,
    `sun_sign:${sunH?.sign ?? ''}`,
    `day_branch:${dayBranchH}`,
  ])
  const sunHouseH = planetHouseLine('Sun', sunH?.house, 'ko')
  const marsH = getPlanet(astro, 'Mars')
  const marsHealthVar = pickVariation(planetSignPool('Mars', marsH?.sign, 'health'), [
    `day_master:${dayMasterStemH}`,
    `mars_sign:${marsH?.sign ?? ''}`,
    `day_branch:${dayBranchH}`,
  ])
  const mercuryH = getPlanet(astro, 'Mercury')
  const mercuryHealthVar = pickVariation(planetSignPool('Mercury', mercuryH?.sign, 'health'), [
    `day_master:${dayMasterStemH}`,
    `mercury_sign:${mercuryH?.sign ?? ''}`,
    `day_branch:${dayBranchH}`,
  ])
  const marsHouseH = planetHouseLine('Mars', marsH?.house, 'ko')
  const mercuryHouseH = planetHouseLine('Mercury', mercuryH?.house, 'ko')
  const ascH = astro.ascendant
  if (ascH) astroUsed.push('ascendant')
  const ascHealthVar = pickVariation(planetSignPool('Ascendant', ascH?.sign, 'health'), [
    `day_master:${dayMasterStemH}`,
    `asc_sign:${ascH?.sign ?? ''}`,
    `day_branch:${dayBranchH}`,
  ])
  // Cap astro pool lines at 2 — priority: Sun sign → Mars sign → Mercury
  // sign → ASC sign → planet-house. We also dedup any line whose key phrase
  // is already inside deepKo so repeat themes (e.g. "비전통적 케어") never
  // surface twice.
  {
    const healthPool: Array<[string, string | undefined]> = [
      ['pools.planetSign.sun.health', sunHealthVar],
      ['pools.planetSign.mars.health', marsHealthVar],
      ['pools.planetSign.mercury.health', mercuryHealthVar],
      ['pools.planetSign.asc.health', ascHealthVar],
      ['pools.planetHouse.sun', sunHouseH],
      ['pools.planetHouse.mars', marsHouseH],
      ['pools.planetHouse.mercury', mercuryHouseH],
    ]
    let added = 0
    const already = deepKo.join(' ')
    const seenKeys = new Set<string>()
    for (const [tag, v] of healthPool) {
      if (!v || added >= 2) continue
      // dedup by content phrase (strip punctuation/spacing for robust match)
      const norm = v.replace(/[.!?\s]/g, '')
      // signature: first 8 chars + last 8 chars after norm (covers both
      // "비전통적 케어가 회복의 약이에요" and "비전통적인 케어가 회복의 약이에요").
      const head = norm.slice(0, 6)
      const tail = norm.slice(-6)
      const sig = `${head}__${tail}`
      if (seenKeys.has(sig)) continue
      const alreadyNorm = already.replace(/[.!?\s]/g, '')
      if (alreadyNorm.includes(head) && alreadyNorm.includes(tail)) continue
      seenKeys.add(sig)
      astroUsed.push(tag)
      deepKo.push(/[.!?]$/.test(v) ? v : `${v}.`)
      added++
    }
  }
  const p3ko = paragraph(
    deepKo.length ? deepKo : ['건강의 흐름은 극단보다는 일상의 작은 누적이 만들어요.']
  )
  const p3en = paragraph(
    deepEn.length
      ? deepEn
      : [
          'Because your deeper health signals sit in a calm alignment, the shape of your health comes from small daily accumulation rather than from extremes.',
        ]
  )

  // ── Paragraph 4: 가이드
  const guideKo: string[] = ['일상 가이드 한 줄:']
  const guideEn: string[] = ['Daily handle:']
  if (weak.includes('목') || weak.includes('wood')) {
    guideKo.push('간·담을 보호하세요. 분노·과로 누적이 가장 큰 부담이에요.')
    guideEn.push(
      'Protect your liver and gallbladder — anger and overwork are the heaviest loads for you.'
    )
  }
  if (weak.includes('화') || weak.includes('fire')) {
    guideKo.push('심장·혈류 관리에 신경 쓰세요. 휴식 부족이 곧바로 몸에 드러나요.')
    guideEn.push(
      'Mind your heart and circulation — too little rest shows up in the body very quickly.'
    )
  }
  if (weak.includes('토') || weak.includes('earth')) {
    guideKo.push('소화기 관리에 신경 쓰세요. 끼니 규칙이 곧 회복 루틴이에요.')
    guideEn.push(
      'Mind your digestion — keeping regular mealtimes is itself a form of recovery for you.'
    )
  }
  if (weak.includes('금') || weak.includes('metal')) {
    guideKo.push('호흡기·면역을 보호하세요. 환절기에 반응이 분명해요.')
    guideEn.push(
      'Protect your lungs and immune system — the shift between seasons is when symptoms tend to surface.'
    )
  }
  if (weak.includes('수') || weak.includes('water')) {
    guideKo.push('신장·수분에 신경 쓰세요. 두려움 누적도 같은 라인을 따라요.')
    guideEn.push(
      'Mind your kidneys and hydration — accumulated fear tends to run down the same line in the body.'
    )
  }
  if (guideKo.length === 1) {
    guideKo.push('오행이 균형이라, 한 가지 큰 관리보다 골고루 작은 루틴이 더 잘 맞아요.')
    guideEn.push(
      'Your elements sit in balance — several small daily routines suit you better than one heavy regimen.'
    )
  }
  // Calendar-engine: Lot of Necessity (약함의 영역)
  const necessity = input.calendarSignals?.arabicParts?.Necessity
  if (necessity) {
    fusionUsed.push('calendarSignals.arabicParts.Necessity')
    guideKo.push(
      `약함의 영역(필연의 점)이 차트에 놓여 있어, 부담을 미루지 않고 작게 자주 풀어주는 흐름이 가장 무리가 없어요.`
    )
    guideEn.push(
      `Your Lot of Necessity is active — releasing pressure a little at a time, instead of postponing it, is the gentlest path for your body.`
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

// 용신 (목/화/토/금/수) 한 글자를 따옴표 없이 자연 한국어로
function yongsinElementKo(y: string): string {
  if (!y) return '본연의 기운'
  if (y.includes('목')) return '나무의 기운'
  if (y.includes('화')) return '불의 기운'
  if (y.includes('토')) return '흙의 기운'
  if (y.includes('금')) return '쇠의 기운'
  if (y.includes('수')) return '물의 기운'
  return '본연의 기운'
}
// 용신 한자 → natural English element label (health 섹션 전용).
function yongsinElementEnHealth(y: string): string {
  if (!y) return 'your native element'
  if (y.includes('목') || y.includes('wood')) return 'Wood'
  if (y.includes('화') || y.includes('fire')) return 'Fire'
  if (y.includes('토') || y.includes('earth')) return 'Earth'
  if (y.includes('금') || y.includes('metal')) return 'Metal'
  if (y.includes('수') || y.includes('water')) return 'Water'
  return 'your native element'
}

// 60갑자 일주 → natural English (health 섹션).
const HEALTH_STEM_EN: Record<string, string> = {
  甲: 'Yang Wood',
  乙: 'Yin Wood',
  丙: 'Yang Fire',
  丁: 'Yin Fire',
  戊: 'Yang Earth',
  己: 'Yin Earth',
  庚: 'Yang Metal',
  辛: 'Yin Metal',
  壬: 'Yang Water',
  癸: 'Yin Water',
}
const HEALTH_BRANCH_EN: Record<string, string> = {
  子: 'Rat',
  丑: 'Ox',
  寅: 'Tiger',
  卯: 'Rabbit',
  辰: 'Dragon',
  巳: 'Snake',
  午: 'Horse',
  未: 'Goat',
  申: 'Monkey',
  酉: 'Rooster',
  戌: 'Dog',
  亥: 'Pig',
}
function iljuLabelEnHealth(ilju: string | undefined): string {
  if (!ilju) return 'native day-pillar'
  const chars = Array.from(ilju)
  if (chars.length < 2) return 'native day-pillar'
  const stem = HEALTH_STEM_EN[chars[0]] ?? ''
  const branch = HEALTH_BRANCH_EN[chars[1]] ?? ''
  if (stem && branch) return `${stem} ${branch}`
  if (stem) return stem
  if (branch) return branch
  return 'native day-pillar'
}

function yongsinFlavorEn(y: string): string {
  if (y.includes('목') || y.includes('wood'))
    return 'liver-care and sprout-like activity (walks, plants)'
  if (y.includes('화') || y.includes('fire')) return 'heart-care and expressive activity (sun, art)'
  if (y.includes('토') || y.includes('earth'))
    return 'digestion and stability (regular meals, roots)'
  if (y.includes('금') || y.includes('metal')) return 'lung-care and order (breathing, tidying)'
  if (y.includes('수') || y.includes('water')) return 'kidney-care and flow (hydration, rest)'
  return 'restoration of balance'
}

function sixthHouseFlavorKo(planets: Array<{ name: string }>): string {
  const names = planets.map((p) => p.name)
  if (names.includes('Mars')) return '추진력과 과로의 흐름'
  if (names.includes('Saturn')) return '책임과 구조의 무게'
  if (names.includes('Mercury')) return '신경과 디테일'
  if (names.includes('Moon')) return '감정과 식습관'
  if (names.includes('Sun')) return '활력과 정체성'
  return '일상의 흐름'
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
