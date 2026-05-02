/**
 * Multi-angle Ideal Type Profile
 *
 * Premium-tier analysis that breaks down each person's "ideal partner"
 * across 7 dimensions instead of one summary line. Each angle has:
 *  - what this person seeks (derived from their chart)
 *  - what the partner actually brings (derived from partner chart)
 *  - match level (strong / partial / weak)
 *  - specific note about how they meet at that angle
 *
 * Used in premium compatibility report's "이상형 다각도 분석" section.
 */

import type { SajuProfile, AstrologyProfile } from './cosmicCompatibility'
import type { ExtendedAstrologyProfile } from './astrology/comprehensive'

// ============================================================
// Sun (본성) — what core personality they're drawn to
// ============================================================

const SUN_DRAW: Record<string, { ideal: string; admires: string }> = {
  Aries: {
    ideal: '독립적이고 추진력 있는 사람',
    admires: '두려움 없는 결정과 직접적인 표현',
  },
  Taurus: {
    ideal: '안정적이고 한결같은 사람',
    admires: '꾸준함과 감각적 풍요',
  },
  Gemini: {
    ideal: '재치 있고 호기심 많은 사람',
    admires: '다양한 화제와 빠른 사고',
  },
  Cancer: {
    ideal: '따뜻하고 보호적인 사람',
    admires: '깊은 정과 가정적인 결',
  },
  Leo: {
    ideal: '당당하고 빛나는 사람',
    admires: '자신감과 너그러운 표현',
  },
  Virgo: {
    ideal: '성실하고 세심한 사람',
    admires: '실용성과 깔끔한 일처리',
  },
  Libra: {
    ideal: '조화롭고 우아한 사람',
    admires: '균형 감각과 매너',
  },
  Scorpio: {
    ideal: '깊고 강렬한 사람',
    admires: '진심과 흔들림 없는 집중',
  },
  Sagittarius: {
    ideal: '자유롭고 모험적인 사람',
    admires: '시야가 넓고 솔직한 표현',
  },
  Capricorn: {
    ideal: '책임감 있고 야망 있는 사람',
    admires: '자기 길을 가는 단단함',
  },
  Aquarius: {
    ideal: '독창적이고 자유로운 사람',
    admires: '독립성과 미래 지향적 사고',
  },
  Pisces: {
    ideal: '감수성 깊고 다정한 사람',
    admires: '직관과 부드러운 공감',
  },
}

// Moon — emotional safety
const MOON_NEED: Record<string, string> = {
  Aries: '직접적이고 솔직한 감정 표현 — 돌려 말하지 않는 안전감',
  Taurus: '한결같고 흔들리지 않는 정서 — 변하지 않는 일상의 결',
  Gemini: '말로 풀어내는 정서 — 대화로 마음을 정리하는 흐름',
  Cancer: '돌봄과 보호받는 느낌 — 가정적인 따뜻함',
  Leo: '인정과 존중 — 빛나도록 받아주는 정서',
  Virgo: '정돈된 공간과 디테일한 배려 — 작은 일로 마음 알아주는 결',
  Libra: '평화와 균형 — 갈등 없는 우아한 정서',
  Scorpio: '깊고 흔들림 없는 신뢰 — 비밀까지 안전하게 나누는 결',
  Sagittarius: '자유롭게 풀어주는 정서 — 통제 없이 받아주는 흐름',
  Capricorn: '책임감 있는 정서 — 의지할 수 있는 단단함',
  Aquarius: '독립을 존중하는 정서 — 거리감을 인정해주는 결',
  Pisces: '감성과 직관으로 통하는 정서 — 말없이 마음 읽어주는 흐름',
}

// Venus — what they value in love/relationships
const VENUS_VALUE: Record<string, string> = {
  Aries: '솔직함과 즉흥성, 리드해주는 모습',
  Taurus: '안정과 감각적 풍요, 변하지 않는 사랑',
  Gemini: '재치 있는 대화와 자유로운 케미',
  Cancer: '정서적 안전과 가정적 따뜻함',
  Leo: '특별한 존재감과 풍성한 표현',
  Virgo: '세심한 배려와 실용적 사랑',
  Libra: '우아함과 균형, 함께 결정하는 결',
  Scorpio: '깊은 감정과 강렬한 일대일 연결',
  Sagittarius: '자유로움과 함께 떠나는 모험',
  Capricorn: '책임감 있는 사랑과 장기적 비전',
  Aquarius: '독창적이고 자유로운 관계 형태',
  Pisces: '낭만과 영감, 영혼이 통하는 사랑',
}

// Mars — physical/energy attraction
const MARS_PULL: Record<string, string> = {
  Aries: '직접적이고 활동적인 에너지',
  Taurus: '느긋하고 감각적인 결',
  Gemini: '다재다능하고 빠른 움직임',
  Cancer: '보호적이고 헌신적인 에너지',
  Leo: '카리스마 있고 당당한 결',
  Virgo: '꼼꼼하고 정확한 움직임',
  Libra: '조화롭고 외교적인 에너지',
  Scorpio: '깊고 강렬한 추진력',
  Sagittarius: '자유롭고 모험적인 결',
  Capricorn: '꾸준하고 끈기 있는 추진력',
  Aquarius: '독립적이고 혁신적인 결',
  Pisces: '직관적이고 부드러운 흐름',
}

// Mercury — communication style they're drawn to
const MERCURY_TALK: Record<string, string> = {
  Aries: '직접적이고 빠른 대화',
  Taurus: '느긋하고 감각적인 이야기',
  Gemini: '다양하고 빠른 화제 전환',
  Cancer: '감정 위주의 깊은 대화',
  Leo: '드라마틱하고 표현력 있는 이야기',
  Virgo: '세심하고 분석적인 대화',
  Libra: '균형 잡힌 협상의 대화',
  Scorpio: '깊이 파고드는 본질적 대화',
  Sagittarius: '큰 그림과 철학적 대화',
  Capricorn: '체계적이고 목적 있는 대화',
  Aquarius: '독창적이고 미래 지향적 대화',
  Pisces: '직관적이고 시적인 대화',
}

// Saturn (sign placement) — long-term commitment style
const SATURN_BOND: Record<string, string> = {
  Aries: '독립을 존중하면서도 함께 성장하는 결',
  Taurus: '안정적이고 한결같은 약속',
  Gemini: '대화로 끊임없이 다듬어가는 결',
  Cancer: '가정과 정서의 토대 위에 쌓는 약속',
  Leo: '서로를 빛나게 해주는 단단한 결',
  Virgo: '실용적이고 디테일한 책임감',
  Libra: '균형 잡힌 파트너십의 약속',
  Scorpio: '깊고 흔들림 없는 신뢰',
  Sagittarius: '자유와 성장을 함께하는 결',
  Capricorn: '체계적으로 빌드하는 장기 비전',
  Aquarius: '서로의 자유를 존중하는 약속',
  Pisces: '영혼 차원의 깊은 헌신',
}

// 사주 측 — 정관/편관/정재/편재 등 십성 패턴 → 이상형 신호
type DominantSibsin = 'jeonggwan' | 'pyeongwan' | 'jeongjae' | 'pyeonjae' | 'sikshin' | 'sanggwan' | 'jeongin' | 'pyeonin' | 'bikyeon' | 'geopjae' | null

const SIBSIN_IDEAL: Record<NonNullable<DominantSibsin>, { name: string; ideal: string; partnerType: string }> = {
  jeonggwan: {
    name: '정관 발달',
    ideal: '책임감 있고 사회적 위치가 단단한 파트너',
    partnerType: '진지하고 약속을 지키는 사람',
  },
  pyeongwan: {
    name: '편관 발달',
    ideal: '강한 카리스마와 추진력을 가진 파트너',
    partnerType: '도전적이고 자극을 주는 사람',
  },
  jeongjae: {
    name: '정재 발달',
    ideal: '안정적이고 신뢰할 수 있는 파트너',
    partnerType: '꾸준하고 절제 있는 사람',
  },
  pyeonjae: {
    name: '편재 발달',
    ideal: '활동적이고 다양한 매력을 가진 파트너',
    partnerType: '사교적이고 기회를 만드는 사람',
  },
  sikshin: {
    name: '식신 발달',
    ideal: '여유롭고 풍요로운 파트너',
    partnerType: '편안한 분위기를 가진 사람',
  },
  sanggwan: {
    name: '상관 발달',
    ideal: '표현력과 창조성이 있는 파트너',
    partnerType: '자유로운 사고와 매력적인 표현을 가진 사람',
  },
  jeongin: {
    name: '정인 발달',
    ideal: '지적이고 보호적인 파트너',
    partnerType: '지혜와 따뜻함을 함께 가진 사람',
  },
  pyeonin: {
    name: '편인 발달',
    ideal: '독창적이고 직관적인 파트너',
    partnerType: '깊이 있고 독특한 사고를 가진 사람',
  },
  bikyeon: {
    name: '비견 발달',
    ideal: '동등한 결의 동반자',
    partnerType: '비슷한 가치관과 결을 가진 사람',
  },
  geopjae: {
    name: '겁재 발달',
    ideal: '경쟁하면서도 자극이 되는 파트너',
    partnerType: '도전적이지만 함께 성장하는 사람',
  },
}

// ============================================================
// Match level evaluation
// ============================================================

type MatchLevel = 'strong' | 'partial' | 'weak'

import { signDistance, COMPATIBLE_ASTRO_ELEMENT as COMPATIBLE_ELEMENT } from './_shared/signMath'

function levelFromSignAndElement(
  selfSign?: string,
  selfElement?: string,
  partnerSign?: string,
  partnerElement?: string
): MatchLevel {
  if (!selfSign || !partnerSign || !selfElement || !partnerElement) return 'partial'
  const dist = signDistance(selfSign, partnerSign)
  if (dist === 0 || dist === 4) return 'strong' // conjunction or trine
  if (selfElement === partnerElement) return 'strong'
  if (COMPATIBLE_ELEMENT[selfElement] === partnerElement) return 'partial'
  if (dist === 3 || dist === 6) return 'weak' // square or opposition
  return 'partial'
}

// ============================================================
// 사주 dominant sibsin detection (heuristic)
// ============================================================

type ElementEn = 'wood' | 'fire' | 'earth' | 'metal' | 'water'

const KO_TO_EN_ELEMENT: Record<string, ElementEn> = {
  목: 'wood',
  화: 'fire',
  토: 'earth',
  금: 'metal',
  수: 'water',
}

function normalizeDmElement(raw: string): ElementEn {
  if (raw === 'wood' || raw === 'fire' || raw === 'earth' || raw === 'metal' || raw === 'water') {
    return raw
  }
  return KO_TO_EN_ELEMENT[raw] || 'earth'
}

function detectDominantSibsin(saju: SajuProfile): DominantSibsin {
  // Use 5행 distribution to infer dominant sibsin pattern
  // (proper detection requires 십성 from saju engine, this is a proxy
  // when raw saju doesn't expose 십성 directly)
  const dm = normalizeDmElement(saju.dayMaster.element)
  const dmYy = saju.dayMaster.yin_yang
  const els = saju.elements
  const total = (els.wood || 0) + (els.fire || 0) + (els.earth || 0) + (els.metal || 0) + (els.water || 0)
  if (total < 4) return null

  // Element relations for sibsin
  const generates: Record<ElementEn, ElementEn> = {
    wood: 'fire', fire: 'earth', earth: 'metal', metal: 'water', water: 'wood',
  }
  const controls: Record<ElementEn, ElementEn> = {
    wood: 'earth', earth: 'water', water: 'fire', fire: 'metal', metal: 'wood',
  }
  const generatedBy: Record<ElementEn, ElementEn> = {
    wood: 'water', fire: 'wood', earth: 'fire', metal: 'earth', water: 'metal',
  }
  const controlledBy: Record<ElementEn, ElementEn> = {
    wood: 'metal', earth: 'wood', water: 'earth', fire: 'water', metal: 'fire',
  }

  const dmCount = els[dm] || 0
  const drainCount = els[generates[dm]] || 0 // 식상 (DM generates)
  const wealthCount = els[controls[dm]] || 0 // 재 (DM controls)
  const officerCount = els[controlledBy[dm]] || 0 // 관 (controls DM)
  const resourceCount = els[generatedBy[dm]] || 0 // 인 (generates DM)

  const counts: Array<[number, DominantSibsin]> = [
    [dmCount, dmYy === 'yang' ? 'bikyeon' : 'geopjae'],
    [drainCount, dmYy === 'yang' ? 'sikshin' : 'sanggwan'],
    [wealthCount, dmYy === 'yang' ? 'pyeonjae' : 'jeongjae'],
    [officerCount, dmYy === 'yang' ? 'pyeongwan' : 'jeonggwan'],
    [resourceCount, dmYy === 'yang' ? 'pyeonin' : 'jeongin'],
  ]
  counts.sort((a, b) => b[0] - a[0])
  return counts[0][0] >= 2 ? counts[0][1] : null
}

// ============================================================
// Public types
// ============================================================

export interface IdealAngleResult {
  angle:
    | 'sun_personality'
    | 'moon_emotional'
    | 'venus_romantic'
    | 'mars_physical'
    | 'mercury_communication'
    | 'saturn_commitment'
    | 'saju_signal'
  label: string
  seeks: string
  partnerOffers: string
  level: MatchLevel
  note: string
}

export interface PersonIdealProfile {
  personIndex: 1 | 2
  partnerIndex: 1 | 2
  angles: IdealAngleResult[]
  matchSummary: string // 1-line summary of how partner matches their ideal
}

// ============================================================
// Main builder
// ============================================================

function levelLabel(level: MatchLevel): string {
  return level === 'strong' ? '강한 매칭' : level === 'partial' ? '부분 매칭' : '대비 매칭'
}

function noteFromLevel(level: MatchLevel, angle: string, partnerSign?: string): string {
  const sign = partnerSign ? `${partnerSign} ` : ''
  if (level === 'strong') {
    return `${sign}결이 이상형과 잘 맞아 자연스러운 끌림이 흐릅니다.`
  }
  if (level === 'partial') {
    return `${sign}결이 이상형과 부분적으로 맞아 시간이 지날수록 매력이 깊어지는 결이에요.`
  }
  return `${sign}결이 이상형과 다른 자리예요. 처음엔 낯설지만 그 차이가 새로운 매력으로 다가올 수 있습니다.`
}

const SIGN_KO: Record<string, string> = {
  Aries: '양자리', Taurus: '황소자리', Gemini: '쌍둥이자리', Cancer: '게자리',
  Leo: '사자자리', Virgo: '처녀자리', Libra: '천칭자리', Scorpio: '전갈자리',
  Sagittarius: '사수자리', Capricorn: '염소자리', Aquarius: '물병자리', Pisces: '물고기자리',
}

function buildAnglesForPerson(
  selfSaju: SajuProfile,
  selfAstro: AstrologyProfile | ExtendedAstrologyProfile,
  partnerAstro: AstrologyProfile | ExtendedAstrologyProfile
): IdealAngleResult[] {
  const angles: IdealAngleResult[] = []

  // 1. Sun — 본성
  const sunDraw = SUN_DRAW[selfAstro.sun.sign]
  if (sunDraw) {
    angles.push({
      angle: 'sun_personality',
      label: '본성',
      seeks: sunDraw.ideal,
      partnerOffers: SUN_DRAW[partnerAstro.sun.sign]?.ideal || partnerAstro.sun.sign,
      level: levelFromSignAndElement(
        selfAstro.sun.sign,
        selfAstro.sun.element,
        partnerAstro.sun.sign,
        partnerAstro.sun.element
      ),
      note: noteFromLevel(
        levelFromSignAndElement(
          selfAstro.sun.sign,
          selfAstro.sun.element,
          partnerAstro.sun.sign,
          partnerAstro.sun.element
        ),
        '본성',
        SIGN_KO[partnerAstro.sun.sign]
      ),
    })
  }

  // 2. Moon — 마음
  if (MOON_NEED[selfAstro.moon.sign]) {
    angles.push({
      angle: 'moon_emotional',
      label: '마음의 안전',
      seeks: MOON_NEED[selfAstro.moon.sign],
      partnerOffers: MOON_NEED[partnerAstro.moon.sign] || partnerAstro.moon.sign,
      level: levelFromSignAndElement(
        selfAstro.moon.sign,
        selfAstro.moon.element,
        partnerAstro.moon.sign,
        partnerAstro.moon.element
      ),
      note: noteFromLevel(
        levelFromSignAndElement(
          selfAstro.moon.sign,
          selfAstro.moon.element,
          partnerAstro.moon.sign,
          partnerAstro.moon.element
        ),
        '마음',
        SIGN_KO[partnerAstro.moon.sign]
      ),
    })
  }

  // 3. Venus — 로맨틱
  if (VENUS_VALUE[selfAstro.venus.sign]) {
    angles.push({
      angle: 'venus_romantic',
      label: '로맨틱',
      seeks: VENUS_VALUE[selfAstro.venus.sign],
      partnerOffers: VENUS_VALUE[partnerAstro.venus.sign] || partnerAstro.venus.sign,
      level: levelFromSignAndElement(
        selfAstro.venus.sign,
        selfAstro.venus.element,
        partnerAstro.venus.sign,
        partnerAstro.venus.element
      ),
      note: noteFromLevel(
        levelFromSignAndElement(
          selfAstro.venus.sign,
          selfAstro.venus.element,
          partnerAstro.venus.sign,
          partnerAstro.venus.element
        ),
        '로맨틱',
        SIGN_KO[partnerAstro.venus.sign]
      ),
    })
  }

  // 4. Mars — 끌림 / 추진
  if (MARS_PULL[selfAstro.mars.sign]) {
    angles.push({
      angle: 'mars_physical',
      label: '끌림과 추진',
      seeks: MARS_PULL[selfAstro.mars.sign],
      partnerOffers: MARS_PULL[partnerAstro.mars.sign] || partnerAstro.mars.sign,
      level: levelFromSignAndElement(
        selfAstro.mars.sign,
        selfAstro.mars.element,
        partnerAstro.mars.sign,
        partnerAstro.mars.element
      ),
      note: noteFromLevel(
        levelFromSignAndElement(
          selfAstro.mars.sign,
          selfAstro.mars.element,
          partnerAstro.mars.sign,
          partnerAstro.mars.element
        ),
        '끌림',
        SIGN_KO[partnerAstro.mars.sign]
      ),
    })
  }

  // 5. Mercury — 대화 (when present)
  const selfMerc = (selfAstro as ExtendedAstrologyProfile).mercury
  const partnerMerc = (partnerAstro as ExtendedAstrologyProfile).mercury
  if (selfMerc && partnerMerc && MERCURY_TALK[selfMerc.sign]) {
    angles.push({
      angle: 'mercury_communication',
      label: '대화',
      seeks: MERCURY_TALK[selfMerc.sign],
      partnerOffers: MERCURY_TALK[partnerMerc.sign] || partnerMerc.sign,
      level: levelFromSignAndElement(
        selfMerc.sign,
        selfMerc.element,
        partnerMerc.sign,
        partnerMerc.element
      ),
      note: noteFromLevel(
        levelFromSignAndElement(
          selfMerc.sign,
          selfMerc.element,
          partnerMerc.sign,
          partnerMerc.element
        ),
        '대화',
        SIGN_KO[partnerMerc.sign]
      ),
    })
  }

  // 6. Saturn — 장기 약속 (when present)
  const selfSat = (selfAstro as ExtendedAstrologyProfile).saturn
  const partnerSat = (partnerAstro as ExtendedAstrologyProfile).saturn
  if (selfSat && partnerSat && SATURN_BOND[selfSat.sign]) {
    angles.push({
      angle: 'saturn_commitment',
      label: '장기 약속',
      seeks: SATURN_BOND[selfSat.sign],
      partnerOffers: SATURN_BOND[partnerSat.sign] || partnerSat.sign,
      level: levelFromSignAndElement(
        selfSat.sign,
        selfSat.element,
        partnerSat.sign,
        partnerSat.element
      ),
      note: noteFromLevel(
        levelFromSignAndElement(
          selfSat.sign,
          selfSat.element,
          partnerSat.sign,
          partnerSat.element
        ),
        '장기 약속',
        SIGN_KO[partnerSat.sign]
      ),
    })
  }

  // 7. 사주 십성 신호
  const sibsin = detectDominantSibsin(selfSaju)
  if (sibsin) {
    const sibsinData = SIBSIN_IDEAL[sibsin]
    angles.push({
      angle: 'saju_signal',
      label: `사주 신호 (${sibsinData.name})`,
      seeks: sibsinData.ideal,
      partnerOffers: sibsinData.partnerType,
      level: 'partial', // saju signal is meta — leave as partial unless we add deeper match math
      note: `사주에서 ${sibsinData.name}이 두드러져 ${sibsinData.partnerType}에게 끌리는 결이에요.`,
    })
  }

  return angles
}

function summarizeMatch(angles: IdealAngleResult[]): string {
  const strong = angles.filter((a) => a.level === 'strong').length
  const weak = angles.filter((a) => a.level === 'weak').length
  const total = angles.length

  if (strong >= total * 0.6) {
    return `${total}개 각도 중 ${strong}개에서 강한 매칭이 보여요. 이상형과 실제가 자연스럽게 만나는 결입니다.`
  }
  if (strong >= 2 && weak <= 1) {
    return `${total}개 각도 중 ${strong}개가 강하게 맞아요. 이상형의 핵심 결을 상대가 잘 채워주는 자리입니다.`
  }
  if (weak >= total * 0.5) {
    return `대비 매칭이 더 많아요. 이상형과 다른 결이지만 그 차이가 새로움과 성장의 기회를 만드는 자리예요.`
  }
  return `이상형과 부분적으로 맞아 시간이 지나면서 매력이 더 깊어지는 결입니다.`
}

export function buildIdealTypeProfiles(
  p1Saju: SajuProfile,
  p2Saju: SajuProfile,
  p1Astro: AstrologyProfile | ExtendedAstrologyProfile,
  p2Astro: AstrologyProfile | ExtendedAstrologyProfile
): PersonIdealProfile[] {
  const p1Angles = buildAnglesForPerson(p1Saju, p1Astro, p2Astro)
  const p2Angles = buildAnglesForPerson(p2Saju, p2Astro, p1Astro)

  return [
    {
      personIndex: 1,
      partnerIndex: 2,
      angles: p1Angles,
      matchSummary: summarizeMatch(p1Angles),
    },
    {
      personIndex: 2,
      partnerIndex: 1,
      angles: p2Angles,
      matchSummary: summarizeMatch(p2Angles),
    },
  ]
}
