// src/lib/astrology/interpretations.ts
//
// Static interpretation data for natal placements and aspects.
// Mirrors the Saju engine's `interpretations.ts`: deterministic, offline,
// cheap. The LLM layer can pull from these strings to ground its prose,
// or the result page can show them directly when no LLM call is in flight.
//
// Coverage:
//   - Planet × Sign — for the 7 traditional planets + Ascendant
//   - Planet × House — 10 planets × 12 houses (only key signals; not all 120)
//   - Aspect type × planet pair — short read for the most informative aspects

export type ZodiacName =
  | 'Aries'
  | 'Taurus'
  | 'Gemini'
  | 'Cancer'
  | 'Leo'
  | 'Virgo'
  | 'Libra'
  | 'Scorpio'
  | 'Sagittarius'
  | 'Capricorn'
  | 'Aquarius'
  | 'Pisces'

export type AstroPlanetName =
  | 'Sun'
  | 'Moon'
  | 'Mercury'
  | 'Venus'
  | 'Mars'
  | 'Jupiter'
  | 'Saturn'
  | 'Uranus'
  | 'Neptune'
  | 'Pluto'
  | 'Ascendant'

export type AspectKind = 'conjunction' | 'sextile' | 'square' | 'trine' | 'opposition'

interface SignLine {
  ko: string
  en: string
}

const PLANET_LABEL_KO: Record<AstroPlanetName, string> = {
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
  Ascendant: '상승궁',
}

const SIGN_LABEL_KO: Record<ZodiacName, string> = {
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

// ============================================================
// Planet × Sign  — keyword + short read per combination
// ============================================================

const PLANET_SIGN_LINES: Partial<Record<AstroPlanetName, Partial<Record<ZodiacName, SignLine>>>> = {
  Sun: {
    Aries: { ko: '리더십·도전·즉결의 자아', en: 'Pioneering, decisive, action-first identity' },
    Taurus: { ko: '안정·감각·꾸준함의 자아', en: 'Steady, sensual, persistent identity' },
    Gemini: { ko: '소통·호기심·다재다능의 자아', en: 'Curious, communicative, versatile identity' },
    Cancer: { ko: '돌봄·정서·뿌리의 자아', en: 'Nurturing, emotional, family-rooted identity' },
    Leo: { ko: '표현·창조·존재감의 자아', en: 'Expressive, creative, magnetic identity' },
    Virgo: { ko: '실용·정밀·헌신의 자아', en: 'Practical, precise, service-oriented identity' },
    Libra: { ko: '관계·균형·아름다움의 자아', en: 'Relational, balanced, aesthetic identity' },
    Scorpio: { ko: '깊이·집중·변용의 자아', en: 'Intense, transformative, depth-seeking identity' },
    Sagittarius: { ko: '확장·신념·자유의 자아', en: 'Expansive, philosophical, freedom-loving identity' },
    Capricorn: { ko: '구조·책임·장기 빌드의 자아', en: 'Structured, ambitious, long-build identity' },
    Aquarius: { ko: '비전·독립·혁신의 자아', en: 'Visionary, independent, innovative identity' },
    Pisces: { ko: '직관·연민·꿈의 자아', en: 'Intuitive, compassionate, dreamy identity' },
  },
  Moon: {
    Aries: { ko: '즉각 표현되는 정서·열정', en: 'Quick, fiery emotional expression' },
    Taurus: { ko: '안정에서 안정감을 얻는 정서', en: 'Comfort and routine soothe emotions' },
    Gemini: { ko: '말하고 분석하며 풀어내는 정서', en: 'Talks and analyses feelings to process them' },
    Cancer: { ko: '깊이 보호하고 보호받기 원하는 정서', en: 'Deeply protective; needs safe inner space' },
    Leo: { ko: '인정과 따뜻함을 통해 회복하는 정서', en: 'Restored by recognition and warmth' },
    Virgo: { ko: '정리·돌봄으로 정서 균형 잡음', en: 'Tidies and serves to find emotional balance' },
    Libra: { ko: '관계 조화 속에서 안정되는 정서', en: 'Stabilises in relational harmony' },
    Scorpio: { ko: '깊은 신뢰가 있어야 열리는 정서', en: 'Opens only with deep trust; intense undercurrent' },
    Sagittarius: { ko: '여행·신념·확장이 회복제', en: 'Restored by travel, belief, expansion' },
    Capricorn: { ko: '성취와 자제 속에서 안정되는 정서', en: 'Stabilises through restraint and achievement' },
    Aquarius: { ko: '독립과 거리감으로 균형 잡는 정서', en: 'Balances through independence and detachment' },
    Pisces: { ko: '몰입·예술·꿈 속에서 회복', en: 'Heals through immersion, art, dream-states' },
  },
  Mercury: {
    Aries: { ko: '직설·즉결의 사고와 말', en: 'Direct, decisive thinking and speech' },
    Taurus: { ko: '느리지만 견고한 사고', en: 'Slow but solid, retentive thinking' },
    Gemini: { ko: '빠르고 다층적 정보 처리', en: 'Fast, multi-layered information processing' },
    Cancer: { ko: '감정과 결합된 기억력 강한 사고', en: 'Memory-rich, emotion-tinted thinking' },
    Leo: { ko: '드라마틱·확신 있는 표현', en: 'Dramatic, confident expression' },
    Virgo: { ko: '정밀·논리적 분석', en: 'Precise, analytical, detail-aware mind' },
    Libra: { ko: '균형 잡힌 외교적 표현', en: 'Balanced, diplomatic communication' },
    Scorpio: { ko: '꿰뚫는 통찰·전략적 사고', en: 'Penetrating, strategic mind' },
    Sagittarius: { ko: '거시적·낙관적 사고', en: 'Big-picture, optimistic thinker' },
    Capricorn: { ko: '구조적·현실적 사고', en: 'Structured, pragmatic mind' },
    Aquarius: { ko: '독창적·시스템적 사고', en: 'Original, systemic, future-leaning mind' },
    Pisces: { ko: '직관적·이미지 기반 사고', en: 'Intuitive, image-based thinking' },
  },
  Venus: {
    Aries: { ko: '직진하는 끌림·즉흥적 애정', en: 'Direct, impulsive love expression' },
    Taurus: { ko: '감각·안정 중시 애정', en: 'Sensual, security-seeking love' },
    Gemini: { ko: '대화·놀이 중심 애정', en: 'Playful, conversational affection' },
    Cancer: { ko: '돌봄·가족적 애정', en: 'Nurturing, family-oriented love' },
    Leo: { ko: '드라마틱·관대한 애정', en: 'Dramatic, generous affection' },
    Virgo: { ko: '실용적·헌신적 애정', en: 'Practical, service-oriented love' },
    Libra: { ko: '조화·미적 애정', en: 'Harmony-seeking, aesthetic love' },
    Scorpio: { ko: '강렬·독점적 애정', en: 'Intense, possessive, magnetic love' },
    Sagittarius: { ko: '자유·확장적 애정', en: 'Freedom-loving, adventurous affection' },
    Capricorn: { ko: '진중·장기 지향 애정', en: 'Serious, commitment-oriented love' },
    Aquarius: { ko: '비전통적·우정형 애정', en: 'Unconventional, friendship-based love' },
    Pisces: { ko: '몰입·낭만적 애정', en: 'Romantic, soul-merging love' },
  },
  Mars: {
    Aries: { ko: '즉결 추진·전사형', en: 'Immediate, warrior-style drive' },
    Taurus: { ko: '느리지만 끈질긴 추진', en: 'Slow, persistent drive' },
    Gemini: { ko: '다중·민첩한 추진', en: 'Multi-thread, agile action' },
    Cancer: { ko: '간접·보호적 추진', en: 'Indirect, protective drive' },
    Leo: { ko: '드라마틱·자신감 있는 추진', en: 'Dramatic, confident drive' },
    Virgo: { ko: '정밀·실무적 추진', en: 'Precise, operational drive' },
    Libra: { ko: '관계 균형 통한 추진', en: 'Drive expressed through partnership' },
    Scorpio: { ko: '집요·전략적 추진', en: 'Strategic, relentless drive' },
    Sagittarius: { ko: '확장·자유 향한 추진', en: 'Expansive, freedom-seeking drive' },
    Capricorn: { ko: '체계·장기 빌드 추진', en: 'Structured, long-build drive' },
    Aquarius: { ko: '혁신·집단 위한 추진', en: 'Innovative, group-oriented drive' },
    Pisces: { ko: '직관·예술적 추진', en: 'Intuitive, artistic drive' },
  },
}

// ============================================================
// Planet × House — short read for each placement
// ============================================================

const HOUSE_DOMAIN_KO: Record<number, string> = {
  1: '자아·외모',
  2: '자원·가치관',
  3: '소통·학습',
  4: '가정·뿌리',
  5: '창조·연애',
  6: '일상·건강',
  7: '관계·계약',
  8: '깊이·공유 자원',
  9: '확장·믿음',
  10: '커리어·사회상',
  11: '커뮤니티·미래',
  12: '내면·은둔',
}

function planetHouseLine(planet: AstroPlanetName, house: number): string {
  const planetKo = PLANET_LABEL_KO[planet]
  const domainKo = HOUSE_DOMAIN_KO[house] || `${house}하우스`
  return `${planetKo}이(가) ${domainKo} 영역에 자리 — 이 영역에서 본인의 ${planetKo}적 본성이 가장 직접적으로 드러납니다.`
}

// ============================================================
// Aspect kind — what each angle generally means
// ============================================================

const ASPECT_LINES: Record<AspectKind, SignLine> = {
  conjunction: {
    ko: '두 행성의 에너지가 합쳐진 한 덩어리. 강하고 분리되지 않음.',
    en: 'Two energies fuse into one block; strong and inseparable.',
  },
  sextile: {
    ko: '협력적 기회. 의식적으로 활용해야 살아나는 흐름.',
    en: 'Cooperative opportunity that needs conscious activation.',
  },
  square: {
    ko: '긴장과 추진력. 갈등을 통해 성장하는 자리.',
    en: 'Tension that drives growth; friction with creative output.',
  },
  trine: {
    ko: '자연스럽게 흐르는 강점. 타고난 재능 영역.',
    en: 'Natural-flow gift; built-in talent zone.',
  },
  opposition: {
    ko: '양극의 균형. 관계와 타협 안에서 통합되는 주제.',
    en: 'Polar balance; integrates through relationship and compromise.',
  },
}

// ============================================================
// Public API
// ============================================================

export function getPlanetSignInterpretation(
  planet: AstroPlanetName,
  sign: ZodiacName,
  language: 'ko' | 'en' = 'ko'
): string {
  const entry = PLANET_SIGN_LINES[planet]?.[sign]
  if (entry) {
    return language === 'ko' ? entry.ko : entry.en
  }
  // Fallback for outer planets without explicit data
  const planetLabel = language === 'ko' ? PLANET_LABEL_KO[planet] : planet
  const signLabel = language === 'ko' ? SIGN_LABEL_KO[sign] : sign
  return language === 'ko'
    ? `${planetLabel}이(가) ${signLabel}에 자리. 이 사인의 결을 통해 작용합니다.`
    : `${planetLabel} in ${signLabel}; expresses through this sign's grain.`
}

export function getPlanetHouseInterpretation(
  planet: AstroPlanetName,
  house: number,
  language: 'ko' | 'en' = 'ko'
): string {
  if (language === 'en') {
    return `${planet} in House ${house} — operates most directly in the area of "${HOUSE_DOMAIN_KO[house] || ''}".`
  }
  return planetHouseLine(planet, house)
}

export function getAspectInterpretation(
  kind: AspectKind,
  language: 'ko' | 'en' = 'ko'
): string {
  const entry = ASPECT_LINES[kind]
  return language === 'ko' ? entry.ko : entry.en
}

export function getPlanetLabelKo(planet: AstroPlanetName): string {
  return PLANET_LABEL_KO[planet]
}

export function getSignLabelKo(sign: ZodiacName): string {
  return SIGN_LABEL_KO[sign]
}

export function getHouseDomainKo(house: number): string {
  return HOUSE_DOMAIN_KO[house] || `${house}하우스`
}
