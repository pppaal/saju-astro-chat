// src/lib/astrology/hellenisticTiming.ts
//
// Brennan-style Hellenistic timing prose layer for the existing
// adapters/astro.ts computations: profection year-lord, Zodiacal
// Releasing L1+L2, and sect-aware bonification.
//
// The numbers are already computed by `computeExtras` (cross-rules
// adapter) and `enrichAstroMatrixSlots`. This module turns them into
// counselor-quality interpretive lines.

export type Sect = 'day' | 'night'
export type ZodiacSign =
  | 'Aries' | 'Taurus' | 'Gemini' | 'Cancer'
  | 'Leo' | 'Virgo' | 'Libra' | 'Scorpio'
  | 'Sagittarius' | 'Capricorn' | 'Aquarius' | 'Pisces'

const SIGN_KO: Record<ZodiacSign, string> = {
  Aries: '양자리', Taurus: '황소자리', Gemini: '쌍둥이자리', Cancer: '게자리',
  Leo: '사자자리', Virgo: '처녀자리', Libra: '천칭자리', Scorpio: '전갈자리',
  Sagittarius: '사수자리', Capricorn: '염소자리', Aquarius: '물병자리', Pisces: '물고기자리',
}

const HOUSE_DOMAIN_KO: Record<number, string> = {
  1: '자아·외모', 2: '자원·가치', 3: '소통·학습', 4: '가정·뿌리',
  5: '창조·연애', 6: '일상·건강', 7: '관계·계약', 8: '깊이·공유 자원',
  9: '확장·믿음', 10: '커리어·사회상', 11: '커뮤니티·미래', 12: '내면·은둔',
}

const PLANET_KO: Record<string, string> = {
  Sun: '태양', Moon: '달', Mercury: '수성', Venus: '금성', Mars: '화성',
  Jupiter: '목성', Saturn: '토성',
}

// =============================================================
// Profection year-lord prose
// =============================================================

interface ProfectionInput {
  age: number
  profectionHouse: number          // 1-12 (age%12 + 1)
  profectionSign: ZodiacSign       // sign on that natal house cusp
  yearLord: string                 // domicile ruler of profection sign
  yearLordNatalHouse?: number      // where year lord sits in natal
  yearLordCondition?: 'bonified' | 'maltreated' | 'mixed' | 'neutral'
}

export interface ProfectionReading {
  headline: string
  yearTheme: string
  yearLordRole: string
  prescription: string
}

const PROFECTION_HOUSE_THEME: Record<number, string> = {
  1: '자기 정체성·신체·외부에 비치는 결이 평생 어떻게 굳어지는지가 올해 표면화',
  2: '자원·자기 가치·물질 기반이 올해의 핵심 — 들어오는 흐름과 새는 흐름 정리',
  3: '소통·이동·형제·짧은 학습이 올해 무대',
  4: '가정·부모·뿌리·부동산 기반이 올해 표면화 — 집·정착의 결정 시기',
  5: '창조·연애·자녀·자기표현이 올해 무대 — 즐거움의 결',
  6: '일상·건강·노동·세부 운영이 올해 핵심 — 몸과 루틴 점검 시기',
  7: '관계·파트너십·계약이 올해 표면화 — 일대일 결합·이별의 결',
  8: '깊이·공유 자원·상속·변용이 올해 무대 — 권력·부채·심층 변화',
  9: '여행·고등 학습·신념 체계·해외가 올해 핵심',
  10: '커리어·사회상·공적 인정이 올해 표면화 — 무대로 올라가는 결',
  11: '친구·공동체·미래 계획·후원자가 올해 무대',
  12: '내면·은둔·정리·신비·잠복이 올해 핵심 — 후퇴·성찰·치유의 해',
}

export function readProfection(input: ProfectionInput): ProfectionReading {
  const houseTheme = PROFECTION_HOUSE_THEME[input.profectionHouse] || ''
  const yearLordKo = PLANET_KO[input.yearLord] || input.yearLord
  const lordHouseDomain = input.yearLordNatalHouse
    ? HOUSE_DOMAIN_KO[input.yearLordNatalHouse]
    : undefined

  const headline = `만 ${input.age}세 = ${input.profectionHouse}하우스(${SIGN_KO[input.profectionSign]}) 프로펙션 — 올해 lord는 ${yearLordKo}`
  const yearTheme = houseTheme

  let yearLordRole: string
  if (input.yearLordNatalHouse && lordHouseDomain) {
    yearLordRole = `올해 lord ${yearLordKo}이 natal ${input.yearLordNatalHouse}하우스(${lordHouseDomain})에 있어서, ${HOUSE_DOMAIN_KO[input.profectionHouse]} 영역의 결정이 ${lordHouseDomain} 영역으로 흘러요.`
  } else {
    yearLordRole = `올해 lord ${yearLordKo}이 활동하는 자리가 올해 결정의 무게중심.`
  }

  let prescription: string
  switch (input.yearLordCondition) {
    case 'bonified':
      prescription = `Lord ${yearLordKo}이 점성적으로 bonified(보호받음) 상태 — 그 영역에서 적극적 결정 권장. 좋은 자리 만났을 때 망설이지 말 것.`
      break
    case 'maltreated':
      prescription = `Lord ${yearLordKo}이 maltreated(공격받음) 상태 — 비가역 행동(서명·계약·이주·결혼)은 한 박자 늦춰서, 검증 후 진행.`
      break
    case 'mixed':
      prescription = `Lord ${yearLordKo}이 양면 상태 — 장점과 단점이 같이 나오는 해. 큰 결정은 분기점별로 cut-loss 선 미리 정해 두기.`
      break
    default:
      prescription = `Lord ${yearLordKo}의 일상 컨디션 그대로 — 무난하지만 큰 도약도 큰 추락도 적은 해.`
  }

  return { headline, yearTheme, yearLordRole, prescription }
}

// =============================================================
// Zodiacal Releasing L1/L2 prose
// =============================================================

interface ZRInput {
  startingLot: 'fortune' | 'spirit'
  startingSign: ZodiacSign
  l1Sign: ZodiacSign
  l1Ruler: string
  l1StartAge: number
  l1EndAge: number
  isPeak: boolean              // angular to starting sign (1/4/7/10)
  isLoosingOfTheBond: boolean  // 7th from starting (transition)
  l2Sign?: ZodiacSign
  l2Ruler?: string
  l2StartAgeYears?: number
  l2EndAgeYears?: number
  isL2Peak?: boolean
}

export interface ZRReading {
  l1Headline: string
  l1Chapter: string
  l1Strategy: string
  l2Headline?: string
  l2Note?: string
}

const ZR_LOT_DOMAIN: Record<'fortune' | 'spirit', string> = {
  fortune: '몸·물질·외부 운명',
  spirit: '직업·소명·자기 의지',
}

export function readZodiacalReleasing(input: ZRInput): ZRReading {
  const lotDomain = ZR_LOT_DOMAIN[input.startingLot]
  const l1RulerKo = PLANET_KO[input.l1Ruler] || input.l1Ruler

  let l1Headline = `${input.l1StartAge}-${input.l1EndAge}세 ZR L1 — ${SIGN_KO[input.l1Sign]} chapter (lord ${l1RulerKo})`
  if (input.isPeak) l1Headline += ' · ⭐ peak chapter'
  if (input.isLoosingOfTheBond) l1Headline += ' · ⚡ Loosing of the Bond (chapter 전환)'

  const l1Chapter = input.isPeak
    ? `이 chapter는 starting lot에 angular(1/4/7/10) — ${lotDomain} 결정·결실의 정점기. 평생 흐름에서 가장 또렷한 무대 시기.`
    : input.isLoosingOfTheBond
      ? `이 chapter는 7번째(opposition) — 인생 chapter 전환의 marker. ${lotDomain}의 큰 방향이 갈리는 시기.`
      : `${lotDomain} chapter — chapter lord ${l1RulerKo}이 가리키는 영역에서 무대가 흘러가요.`

  const l1Strategy = input.isPeak
    ? `Peak chapter — 미루던 큰 결정·계약·이주·결혼은 이 시기에 결단. 단 Loosing 직전이면 검증 한 번 더.`
    : input.isLoosingOfTheBond
      ? `Loosing chapter — 큰 전환이 외부에서 들어오는 시기. 저항 말고 흐름 읽고 따라가되, 비가역 행동은 신중.`
      : `이 chapter는 무난한 운영기 — 다음 peak·loosing 시기까지 토대 다지기.`

  let l2Headline: string | undefined
  let l2Note: string | undefined
  if (input.l2Sign && input.l2Ruler && input.l2StartAgeYears != null && input.l2EndAgeYears != null) {
    const l2RulerKo = PLANET_KO[input.l2Ruler] || input.l2Ruler
    l2Headline = `현재 L2 — ${SIGN_KO[input.l2Sign]} (lord ${l2RulerKo}) · ${input.l2StartAgeYears.toFixed(1)}-${input.l2EndAgeYears.toFixed(1)}세${input.isL2Peak ? ' · ⭐ L2 peak' : ''}`
    l2Note = input.isL2Peak
      ? `L2 peak — L1 chapter 안에서 가장 활발한 sub-window. 이 1-2년이 chapter의 정점.`
      : `L2 sub-period — L1의 큰 흐름 안에서 ${l2RulerKo} 영역의 detail.`
  }

  return { l1Headline, l1Chapter, l1Strategy, l2Headline, l2Note }
}

// =============================================================
// Sect-aware bonification 7-condition prose
// =============================================================

interface BonificationInput {
  planet: string
  sect: Sect
  isSectBenefic: boolean       // Jupiter (day) / Venus (night)
  isSectMalefic: boolean       // Mars (day) / Saturn (night)
  condition: 'bonified' | 'maltreated' | 'mixed' | 'neutral'
  conditions: {
    adherence?: { by: string; orb: number }
    strikingRay?: { by: string; orb: number }
    overcoming?: { by: string }
    opposition?: { by: string }
    enclosure?: { left: string; right: string }
    reception?: { by: string; method: 'domicile' | 'exaltation' }
  }
}

export interface BonificationReading {
  headline: string
  detail: string
  prescription: string
}

const COND_KO_POS: Record<string, (by: string) => string> = {
  adherence: (by) => `${PLANET_KO[by] || by}이 합으로 보호 (3°이내)`,
  strikingRay: (by) => `${PLANET_KO[by] || by}이 사각으로 활성 (3°이내)`,
  overcoming: (by) => `${PLANET_KO[by] || by}이 superior square로 고양`,
  reception: (by) => `${PLANET_KO[by] || by}의 자리에 reception (영접받음)`,
}
const COND_KO_NEG: Record<string, (by: string) => string> = {
  adherence: (by) => `${PLANET_KO[by] || by}이 합으로 침식 (3°이내)`,
  strikingRay: (by) => `${PLANET_KO[by] || by}이 사각으로 공격 (3°이내)`,
  opposition: (by) => `${PLANET_KO[by] || by}이 opposition으로 압박`,
  enclosure: () => `좌우로 besieged (포위됨)`,
}

export function readBonification(input: BonificationInput): BonificationReading {
  const planetKo = PLANET_KO[input.planet] || input.planet
  const sectKo = input.sect === 'day' ? '낮 차트' : '밤 차트'
  const sectRoleKo = input.isSectBenefic
    ? '같은 sect 길성 (제일 강한 보호자)'
    : input.isSectMalefic
      ? '같은 sect 흉성 (가장 까다로운 압박자)'
      : '중립'

  const headline = `${planetKo} (${sectKo} · ${sectRoleKo}) — ${input.condition === 'bonified' ? '보호받음' : input.condition === 'maltreated' ? '공격받음' : input.condition === 'mixed' ? '양면' : '중립'}`

  const lines: string[] = []
  for (const [k, v] of Object.entries(input.conditions)) {
    if (!v) continue
    const isBoni = ['adherence', 'strikingRay', 'overcoming', 'reception'].includes(k)
    const fmt = (isBoni ? COND_KO_POS : COND_KO_NEG)[k]
    if (!fmt) continue
    if ('by' in v && typeof v.by === 'string') {
      lines.push(fmt(v.by))
    } else if (k === 'enclosure') {
      lines.push(fmt(''))
    }
  }
  const detail = lines.length > 0 ? lines.join('; ') : '특별한 condition 없음'

  let prescription: string
  if (input.condition === 'bonified') {
    prescription = `${planetKo} 영역의 결정·확장 적극 권장 — 점성적으로 보호받는 자리.`
  } else if (input.condition === 'maltreated') {
    prescription = `${planetKo} 영역의 비가역 결정 보류 — 점성적 공격 큰 자리. 검증 후 진행.`
  } else if (input.condition === 'mixed') {
    prescription = `${planetKo} 영역은 양면 — 장점·단점 같이. 큰 결정 시 cut-loss 선 미리 정해 두기.`
  } else {
    prescription = `${planetKo} 영역은 중립 — 일상 컨디션 그대로 운영.`
  }

  return { headline, detail, prescription }
}
