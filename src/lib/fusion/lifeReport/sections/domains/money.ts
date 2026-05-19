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
  relationPhraseEn,
  relationPhraseKo,
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
import { aspectQuality, houseLabel, paragraph, signLabel } from '../../templates/sentences'
import {
  pickVariation,
  sibsinCategoryPool,
  planetSignPool,
  iljuPool,
  planetHouseLine,
} from '../../pools'

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
  const jupiterVenus = jupiter && venus ? aspectBetween(astro, 'Jupiter', 'Venus') : undefined

  // SR money — Jupiter or Venus in 2/8 this year
  const sr2 = solarReturnPlanetsInHouse(astro, 2)
  const sr8 = solarReturnPlanetsInHouse(astro, 8)
  if (sr2.length || sr8.length) astroUsed.push('solarReturn.houses')

  const moneyConfirms = fusion?.byDomain?.money?.confirms ?? []
  if (moneyConfirms.length > 0) fusionUsed.push(...moneyConfirms.slice(0, 3).map((m) => m.rule.id))

  // ── Paragraph 1
  const wealthTotal = cat.재성
  const p1ko = paragraph([
    wealthFlavorKo(wealthTotal, sib.정재, sib.편재),
    second && second.sign
      ? `재산 영역이 ${signLabel(second.sign, 'ko')}의 분위기를 띠고 있어, 돈을 ${secondSignFlavorKo(second.sign)} 방식으로 다뤄요.`
      : '',
    jupiter
      ? `행운의 별이 ${signLabel(jupiter.sign, 'ko')}에 자리잡아, ${jupiterFlavorKo(jupiter.house)} 영역에서 재물의 흐름이 한 단계 깊어져요.`
      : '',
  ])
  const p1en = paragraph([
    wealthFlavorEn(wealthTotal, sib.정재, sib.편재),
    second && second.sign
      ? `Your 2nd house begins in ${signLabel(second.sign, 'en')}, so you handle money in a ${secondSignFlavorEn(second.sign)} way.`
      : '',
    jupiter
      ? `Jupiter, the planet of luck, sits in ${signLabel(jupiter.sign, 'en')} (${houseLabel(jupiter.house, 'en')}), expanding ${jupiterFlavorEn(jupiter.house)}.`
      : '',
  ])

  // ── Paragraph 2: 시기
  const timingKo: string[] = []
  const timingEn: string[] = []
  if (cur && cur.sibsin) {
    timingKo.push(`지금의 인생 흐름이 돈의 흐름에 ${daeunMoneyFlavorKo(cur.sibsin)}을 만들어줘요.`)
    timingEn.push(`For money, your current life-chapter ${daeunMoneyFlavorEn(cur.sibsin)}.`)
  }
  if (wealthDaeun && (!cur || cur.age !== wealthDaeun.age)) {
    timingKo.push(`${wealthDaeun.age}세 무렵엔 돈의 큰 흐름이 열리는 구간이에요.`)
    timingEn.push(
      `Around age ${wealthDaeun.age}, a wealth-focused ten-year life-chapter opens up the larger flow of money.`
    )
  }
  if (sr2.length > 0) {
    timingKo.push('올해는 자기 자원의 해예요. 본인 손에 들어오는 흐름이 또렷해져요.')
    timingEn.push(
      `This year's Solar Return places ${sr2.join(', ')} in your 2nd house — a year of personal resources.`
    )
  }
  if (sr8.length > 0) {
    timingKo.push('함께 다루는 자원과 투자의 문도 같은 해에 열려 있어요.')
    timingEn.push(
      `The Solar Return 8th house also carries ${sr8.join(', ')} — shared resources and investment open up at the same time.`
    )
  }
  if (timingKo.length === 0) {
    timingKo.push('지금은 잔잔하게 자원이 쌓이는 구간이에요.')
    timingEn.push(
      'Your current life-chapter and progressions sit in a quiet stretch of slow accumulation.'
    )
  }
  const p2ko = paragraph(timingKo)
  const p2en = paragraph(timingEn)

  // ── Paragraph 3: 심화
  const deepKo: string[] = []
  const deepEn: string[] = []

  // 일주 재물 결 — 60갑자 wealth narrative DB (orthodox 자평진전 출처)
  const iljuName = saju.ultraAdvanced?.iljuDeep?.ilju
  const iljuMoneyVar = pickVariation(iljuPool(iljuName, 'money'), [
    `ilju:${iljuName ?? ''}`,
    'domain:money',
  ])
  if (iljuMoneyVar) {
    sajuUsed.push('pools.ilju.money')
    deepKo.push(`${iljuMoneyVar}.`)
    deepEn.push(
      `Your day-pillar archetype (${iljuLabelEnMoney(iljuName)}) carries this money pattern.`
    )
  }

  if (jong === '종재격') {
    deepKo.push('삶이 재물 쪽으로 강하게 응축돼 있어, 큰 재물 그릇을 타고났어요.')
    deepEn.push(
      'Your chart condenses strongly around wealth — a wealth-following pattern that gathers all of your energy into a large money vessel.'
    )
  } else if (gk.includes('재격')) {
    deepKo.push('인생의 큰 패턴이 돈을 직업과 자기 자리로 연결시키는 흐름이에요.')
    deepEn.push(
      'Your life-pattern braids money into both your career and your sense of who you are.'
    )
  }
  if (pofIn2nd) {
    deepKo.push('행운의 점이 재산 영역에 있어, 자기 자원이 곧 행운의 통로예요.')
    deepEn.push(
      'Your Part of Fortune sits in the 2nd house — your own personal resources are quite literally the channel through which luck arrives.'
    )
  } else if (pofIn8th) {
    deepKo.push('행운의 점이 심층 영역에 있어, 함께 다루는 자원이나 유산, 투자로 행운이 열려요.')
    deepEn.push(
      'Your Part of Fortune sits in the 8th house — luck tends to flow through shared resources, inheritance, and investment.'
    )
  }
  if (jupiterVenus) {
    deepKo.push(
      `행운의 별과 사랑의 별이 ${aspectQuality(jupiterVenus.type, 'ko')}, 풍요와 아름다움이 손잡고 자원에 닿아요.`
    )
    deepEn.push(
      `Your Jupiter and Venus ${aspectQuality(jupiterVenus.type, 'en')} — abundance and beauty walk hand in hand through the way you build your resources.`
    )
  }
  const jupHardSquare = jupiterAspects.find((a) => a.type === 'square' || a.type === 'opposition')
  if (jupHardSquare) {
    deepKo.push('행운의 별이 다른 별과 팽팽하게 마주 있어, 과한 확장은 조절이 필요해요.')
    deepEn.push(
      `Jupiter ${aspectQuality(jupHardSquare.type, 'en')} with another planet, so over-expansion is something you need to temper rather than indulge.`
    )
  }
  if (lucky.length > 0) {
    deepKo.push(
      `재물 흐름을 잔잔히 받쳐주는 ${luckyShinsalReadableKo(lucky)} 같은 기운이 함께 있어요.`
    )
    deepEn.push(
      `Auspicious supporting stars (${luckyShinsalReadableEn(lucky)}) quietly back the money flow.`
    )
  }
  if (moneyConfirms.length > 0) {
    deepKo.push(`그리고 ${moneyConfirms[0].rule.narrative.confirm}`)
    deepEn.push(`Additionally, ${moneyConfirms[0].rule.meaning}.`)
  }
  // Saju relations — year/month axis often reflects family-resource flow.
  const relKoMoney = relationPhraseKo(input.calendarSignals?.sajuRelations, {
    preferPillar: 'month',
  })
  const relEnMoney = relationPhraseEn(input.calendarSignals?.sajuRelations, {
    preferPillar: 'month',
  })
  if (relKoMoney) {
    sajuUsed.push('calendarSignals.sajuRelations')
    deepKo.push(`${relKoMoney} 자원 흐름이 한 번 모이고 한 번 풀리는 사이클을 만들어요.`)
    if (relEnMoney)
      deepEn.push(
        `${relEnMoney} The flow of your resources runs in cycles of gathering and releasing.`
      )
  }
  // Sibsin category × money + Sun × sign × money variation pools.
  const dayMasterStemM = saju.pillars.day.stem || ''
  const dayBranchM = saju.pillars.day.branch || ''
  let dominantCatM = ''
  {
    let maxV = -1
    for (const [k, v] of Object.entries(cat)) {
      if (v > maxV) {
        maxV = v
        dominantCatM = k
      }
    }
  }
  const moneyCatVar = pickVariation(sibsinCategoryPool(dominantCatM, 'money'), [
    `day_master:${dayMasterStemM}`,
    `category:${dominantCatM}`,
    `day_branch:${dayBranchM}`,
  ])
  const sunM = astro.planets?.find((p) => p.name === 'Sun')
  const sunMoneyVar = pickVariation(planetSignPool('Sun', sunM?.sign, 'money'), [
    `day_master:${dayMasterStemM}`,
    `sun_sign:${sunM?.sign ?? ''}`,
    `day_branch:${dayBranchM}`,
  ])
  // Sun × house — 자아 표현이 자원 흐름과 만나는 무대
  const sunHouseM = planetHouseLine('Sun', sunM?.house, 'ko')
  // Venus × sign — 자원의 가치관 (money 도메인의 핵심 행성)
  const venusM = astro.planets?.find((p) => p.name === 'Venus')
  const venusMoneyVar = pickVariation(planetSignPool('Venus', venusM?.sign, 'money'), [
    `day_master:${dayMasterStemM}`,
    `venus_sign:${venusM?.sign ?? ''}`,
    `day_branch:${dayBranchM}`,
  ])
  // Mercury × sign — 자원 분석·계산
  const mercuryM = astro.planets?.find((p) => p.name === 'Mercury')
  const mercuryMoneyVar = pickVariation(planetSignPool('Mercury', mercuryM?.sign, 'money'), [
    `day_master:${dayMasterStemM}`,
    `mercury_sign:${mercuryM?.sign ?? ''}`,
    `day_branch:${dayBranchM}`,
  ])
  // Venus × house (this PR — 매력·미감이 자원과 만나는 무대)
  const venusHouseM = planetHouseLine('Venus', venusM?.house, 'ko')
  // Mercury × house (this PR — 사고가 자원 분석으로 풀리는 무대)
  const mercuryHouseM = planetHouseLine('Mercury', mercuryM?.house, 'ko')
  // ASC × money — 첫인상이 자원 흐름에 어떻게 통하는지.
  const ascM = astro.ascendant
  const ascMoneyVar = pickVariation(planetSignPool('Ascendant', ascM?.sign, 'money'), [
    `day_master:${dayMasterStemM}`,
    `asc_sign:${ascM?.sign ?? ''}`,
    `day_branch:${dayBranchM}`,
  ])
  // Sibsin category pool always lands first (saju-grain anchor); after that
  // we keep at most 2 astro pool lines so P3 stays readable.
  if (moneyCatVar) {
    sajuUsed.push('pools.sibsinCategory.money')
    deepKo.push(`${moneyCatVar}.`)
  }
  {
    const moneyAstroPool: Array<[string, string | undefined, string]> = [
      ['pools.planetSign.sun.money', sunMoneyVar, ''],
      ['pools.planetSign.venus.money', venusMoneyVar, ''],
      ['pools.planetSign.mercury.money', mercuryMoneyVar, ''],
      ['pools.planetHouse.sun', sunHouseM, ''],
      ['pools.planetHouse.venus', venusHouseM, ''],
      ['pools.planetHouse.mercury', mercuryHouseM, ''],
      ['pools.planetSign.asc.money', ascMoneyVar, ''],
    ]
    let added = 0
    for (const [tag, v] of moneyAstroPool) {
      if (!v || added >= 2) continue
      astroUsed.push(tag)
      deepKo.push(`${v}.`)
      added++
    }
  }
  // Lot of Necessity — adds a 'where resources strain' note
  const necessityLot = input.calendarSignals?.arabicParts?.Necessity
  if (necessityLot) {
    fusionUsed.push('calendarSignals.arabicParts.Necessity')
    deepKo.push(
      `필연의 행운점이 ${signLabel(necessityLot.sign, 'ko')}에 머물러, 부담이 가장 자주 모이는 자원 영역도 같은 흐름으로 이어져요.`
    )
    deepEn.push(
      `Your Lot of Necessity sits in ${signLabel(necessityLot.sign, 'en')} — the area where your resources feel the most strain follows that same flavor.`
    )
  }
  const p3ko = paragraph(
    deepKo.length ? deepKo : ['재물의 흐름은 큰 폭의 변동보다 꾸준한 누적의 길이 더 잘 어울려요.']
  )
  const p3en = paragraph(
    deepEn.length
      ? deepEn
      : [
          'Because your wealth signals sit in a balanced arrangement, steady accumulation suits you better than wide swings.',
        ]
  )

  // ── Paragraph 4: 실행 가이드
  const guideKo: string[] = ['일상 가이드 한 줄:']
  const guideEn: string[] = ['Daily handle:']
  if (sib.정재 >= sib.편재) {
    guideKo.push('정기적인 수입의 안정 라인을 먼저 굳히고, 그 위에서 확장하세요.')
    guideEn.push('Lock in a stable income line first, and then expand on top of that foundation.')
  } else {
    guideKo.push('한 곳에 묶지 말고 분산된 자원 흐름을 만드세요. 다채로움이 운을 부르는 길이에요.')
    guideEn.push(
      'Avoid pinning everything to a single source — let the flow spread out. Your opportunistic-resource pattern thrives on variety.'
    )
  }
  if (wealthDaeun) {
    guideKo.push(`${wealthDaeun.age}세 직전에 자원 그릇을 키워두면 흐름이 자연스럽게 따라와요.`)
    guideEn.push(
      `Expand the size of your resource container just before age ${wealthDaeun.age} — the wealth that follows will fill it naturally.`
    )
  }
  // Calendar-engine: Lot of Fortune (재물의 행운점)
  const fortune = input.calendarSignals?.arabicParts?.Fortune
  if (fortune) {
    fusionUsed.push('calendarSignals.arabicParts.Fortune')
    guideKo.push(
      `재물의 행운점이 ${signKoMoney(fortune.sign)}에 놓여, 이 분위기를 일상에 들여올수록 운이 자기 자리로 돌아와요.`
    )
    guideEn.push(
      `Your Lot of Fortune sits in ${signLabel(fortune.sign, 'en')} — bringing this flavor into your daily life pulls luck back home to you.`
    )
  }
  const jupiterDignity = input.calendarSignals?.dignities?.find((d) => d.planet === 'Jupiter')
  if (
    jupiterDignity &&
    (jupiterDignity.status === 'domicile' || jupiterDignity.status === 'exaltation')
  ) {
    fusionUsed.push('calendarSignals.dignities.Jupiter')
    guideKo.push('확장의 별이 본인 자리에 있어, 큰 흐름을 탈 때 풍요가 자연스럽게 따라와요.')
    guideEn.push(
      `Jupiter sits in ${jupiterDignity.status === 'domicile' ? 'its home sign' : 'a sign where it shines brightest'} — riding the larger currents tends to draw abundance toward you naturally.`
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
    id: 'money',
    title: { ko: '재물·돈', en: 'Money & Wealth' },
    paragraphs,
    signals: { saju: sajuUsed, astro: astroUsed, fusion: fusionUsed },
  }
}

function wealthFlavorKo(total: number, jeong: number, pyen: number): string {
  if (total >= 3)
    return '당신은 자원과 결과로 인생을 풀어내는 결이에요. 풍성한 재물이 깔려서 돈이 곧 표현의 도구가 돼요.'
  if (total === 2)
    return jeong >= pyen
      ? '당신은 안정적인 수입 라인으로 자원을 쌓아가는 스타일이에요.'
      : '당신은 다양한 수입 라인을 만들어내는 스타일이에요.'
  if (total === 1)
    return jeong >= pyen
      ? '당신은 꾸준한 수입을 차곡차곡 쌓아가는 타입이에요.'
      : '당신은 부수입과 기회 포착에 더 강한 타입이에요.'
  return '재물이 잔잔해서, 돈은 다른 흐름이 함께 받쳐줘요. 직업과 배움이 자원의 통로가 돼요.'
}

// money 섹션 신살 자연어 변환
function luckyShinsalReadableKo(items: string[]): string {
  const map: Record<string, string> = {
    천덕귀인: '귀인의 보호',
    월덕귀인: '귀인의 보호',
    문창: '학문과 창작의 별',
    문창귀인: '학문과 창작의 별',
    역마: '이동과 변화의 기운',
    도화: '끌림과 매력의 기운',
    화개: '예술과 고독의 별',
    천을귀인: '귀인의 보호',
  }
  return items
    .slice(0, 3)
    .map((s) => map[s] ?? s)
    .join(', ')
}
function wealthFlavorEn(total: number, jeong: number, pyen: number): string {
  if (total >= 3)
    return 'You build life through resource and outcome — a rich resource current makes money a literal medium of expression.'
  if (total === 2)
    return jeong >= pyen
      ? 'You build resources through stable, recurring income.'
      : 'You build resources by spinning up multiple income lines.'
  if (total === 1)
    return jeong >= pyen
      ? 'You build one steady stream of income over time.'
      : 'You shine at side-income and opportunistic capture.'
  return 'With the resource dynamic quiet, money is carried by other signals — career and the wisdom-and-care pattern act as the resource channel.'
}

// 60갑자 일주 (hanja) → natural English label.
const MONEY_STEM_EN: Record<string, string> = {
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
const MONEY_BRANCH_EN: Record<string, string> = {
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
function iljuLabelEnMoney(ilju: string | undefined): string {
  if (!ilju) return 'native day-pillar'
  const chars = Array.from(ilju)
  if (chars.length < 2) return 'native day-pillar'
  const stem = MONEY_STEM_EN[chars[0]] ?? ''
  const branch = MONEY_BRANCH_EN[chars[1]] ?? ''
  if (stem && branch) return `${stem} ${branch}`
  if (stem) return stem
  if (branch) return branch
  return 'native day-pillar'
}

// 럭키 신살 영어 풀이 (raw Korean 라벨 제거).
function luckyShinsalReadableEn(items: string[]): string {
  const map: Record<string, string> = {
    천덕귀인: 'noble-protector star',
    월덕귀인: 'noble-protector star',
    문창: 'literary star',
    문창귀인: 'literary star',
    역마: 'travel-and-change star',
    도화: 'attraction-and-charm star',
    화개: 'art-and-solitude star',
    천을귀인: 'noble-protector star',
  }
  return items
    .slice(0, 3)
    .map((s) => map[s] ?? 'a supporting star')
    .join(', ')
}

const SECOND_SIGN_FLAVOR_KO: Record<string, string> = {
  Aries: '빠른 결단으로 다루는',
  Taurus: '꾸준히 쌓아가는',
  Gemini: '여러 줄기로 운용하는',
  Cancer: '저축하고 지키는',
  Leo: '과감하게 표현하며 쓰는',
  Virgo: '세심하게 관리하는',
  Libra: '균형과 우아함을 따라 쓰는',
  Scorpio: '깊고 사적으로 다루는',
  Sagittarius: '시야 넓게 굴리는',
  Capricorn: '엄격하게 쌓아가는',
  Aquarius: '독특한 시스템으로 다루는',
  Pisces: '직관적으로 흐르는',
}
const SECOND_SIGN_FLAVOR_EN: Record<string, string> = {
  Aries: 'fast-decision',
  Taurus: 'patient-accumulation',
  Gemini: 'multi-channel',
  Cancer: 'savings-and-protection',
  Leo: 'bold-expressive',
  Virgo: 'meticulous, detail-oriented',
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
  12: 'your inner life and private world',
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

function signKoMoney(sign: string): string {
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
