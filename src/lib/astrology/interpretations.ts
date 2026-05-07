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
  Jupiter: {
    Aries: { ko: '용기와 개척으로 확장', en: 'Expansion through courage and pioneering' },
    Taurus: { ko: '꾸준한 자원 축적으로 확장', en: 'Expansion through steady resource-building' },
    Gemini: { ko: '학습·소통·다양한 시도로 확장', en: 'Expansion through learning, communication, variety' },
    Cancer: { ko: '가정·정서·뿌리에서 확장 (고양)', en: 'Expansion through home and emotional roots (exalted)' },
    Leo: { ko: '창조·표현·존재감으로 확장', en: 'Expansion through creativity, self-expression' },
    Virgo: { ko: '실무·헌신을 다듬어 확장', en: 'Expansion via refinement of service and detail' },
    Libra: { ko: '관계·균형·아름다움으로 확장', en: 'Expansion through relationships and balance' },
    Scorpio: { ko: '깊이·변용·공유 자원으로 확장', en: 'Expansion through depth, transformation, shared power' },
    Sagittarius: { ko: '신념·여행·철학으로 확장 (지배)', en: 'Expansion through belief, travel, philosophy (rulership)' },
    Capricorn: { ko: '구조·책임·장기 빌드로 확장 (폴)', en: 'Expansion through structure and discipline (in fall)' },
    Aquarius: { ko: '비전·공동체·미래로 확장', en: 'Expansion through vision, community, the future' },
    Pisces: { ko: '직관·연민·영성으로 확장 (전통 지배)', en: 'Expansion through intuition and compassion (traditional rulership)' },
  },
  Saturn: {
    Aries: { ko: '자기 책임의 시험 (폴)', en: 'Testing self-responsibility (in fall)' },
    Taurus: { ko: '안정과 자원의 책임', en: 'Discipline around security and resources' },
    Gemini: { ko: '말과 사고의 정밀화', en: 'Disciplining the mind and communication' },
    Cancer: { ko: '가정·정서 안전의 책임 (디트리먼트)', en: 'Burdened by home and emotional security (detriment)' },
    Leo: { ko: '인정 욕구의 시험 (디트리먼트)', en: 'Tested ego and recognition (detriment)' },
    Virgo: { ko: '루틴·실용·완성의 책임', en: 'Discipline of routine and practical mastery' },
    Libra: { ko: '관계와 공정의 성숙 (고양)', en: 'Maturing in relationship and fairness (exalted)' },
    Scorpio: { ko: '깊이·신뢰·통제의 시험', en: 'Disciplined transformation and trust' },
    Sagittarius: { ko: '신념·확장의 책임 있는 빌드', en: 'Disciplined belief and expansion' },
    Capricorn: { ko: '커리어·구조의 빌드 (지배)', en: 'Building career and structure (rulership)' },
    Aquarius: { ko: '집단·시스템의 책임 (전통 지배)', en: 'Disciplining vision and community (traditional rulership)' },
    Pisces: { ko: '경계·놓아주기의 시험', en: 'Disciplining boundaries and surrender' },
  },
  Uranus: {
    Aries: { ko: '독립 의지의 갑작스러운 분출', en: 'Sudden bursts of independent will' },
    Taurus: { ko: '가치·안정의 흔들림과 재정의', en: 'Disruption and redefinition of value and security' },
    Gemini: { ko: '사고·소통의 혁신 (편안한 자리)', en: 'Innovation in thought and communication' },
    Cancer: { ko: '가정·정서의 비전통적 패턴', en: 'Unconventional patterns in home and feeling' },
    Leo: { ko: '자기표현·창조의 혁명 (디트리먼트)', en: 'Rebellion in self-expression and creativity (detriment)' },
    Virgo: { ko: '루틴·실무에서의 혁신', en: 'Innovation injected into routine and craft' },
    Libra: { ko: '관계 모델의 비전통적 재구성', en: 'Unconventional reshaping of relationships' },
    Scorpio: { ko: '심층 변용의 갑작스러운 폭발', en: 'Sudden eruptions of deep transformation' },
    Sagittarius: { ko: '신념 체계의 급진적 재편', en: 'Radical reshaping of belief systems' },
    Capricorn: { ko: '구조·권위의 해체와 재건', en: 'Dismantling and rebuilding structures of authority' },
    Aquarius: { ko: '비전·공동체·과학의 도약 (현대 지배)', en: 'Quantum leaps in vision and community (modern rulership)' },
    Pisces: { ko: '영성·예술의 비전통 침투', en: 'Unconventional currents in spirituality and art' },
  },
  Neptune: {
    Aries: { ko: '개척의 환상과 영감', en: 'Pioneering visions and inspirations' },
    Taurus: { ko: '감각·물질의 영적 의미화', en: 'Spiritual meaning woven into the senses and matter' },
    Gemini: { ko: '말·정보 속 안개와 시', en: 'Mist and poetry in language and information' },
    Cancer: { ko: '가정·정서의 깊은 합일', en: 'Deep merging in home and emotion' },
    Leo: { ko: '창조 표현의 신성화', en: 'Self-expression made sacred' },
    Virgo: { ko: '실무 헌신 속 영적 갈증 (디트리먼트)', en: 'Spiritual longing inside daily service (detriment)' },
    Libra: { ko: '관계의 이상화·구원 환상', en: 'Idealisation and rescue fantasies in love' },
    Scorpio: { ko: '심층 변용의 신비주의', en: 'Mysticism of deep transformation' },
    Sagittarius: { ko: '신념·여행 속 신성한 갈망', en: 'Sacred yearning in belief and travel' },
    Capricorn: { ko: '구조·권위의 해체 환상', en: 'Dissolving structures and authority' },
    Aquarius: { ko: '집단 비전의 영적 차원', en: 'Spiritual dimension of collective vision' },
    Pisces: { ko: '연민·합일·영성의 본향 (현대 지배)', en: 'Compassion and union, returning home (modern rulership)' },
  },
  Pluto: {
    Aries: { ko: '자아 자체를 변용시키는 강제력', en: 'Compulsion to transform the self at the root' },
    Taurus: { ko: '자원·가치관의 근본 재편 (디트리먼트)', en: 'Root upheaval of values and resources (detriment)' },
    Gemini: { ko: '사고·언어의 심층 변용', en: 'Deep transformation of thought and language' },
    Cancer: { ko: '가정·정서의 어두운 발굴', en: 'Excavating shadow in family and feeling' },
    Leo: { ko: '자기표현의 강박과 권력', en: 'Compulsive intensity in self-expression and power' },
    Virgo: { ko: '루틴 깊은 곳의 권력 패턴', en: 'Power patterns hidden inside routine and detail' },
    Libra: { ko: '관계 권력 역학의 재편', en: 'Reshaping power dynamics in relationships' },
    Scorpio: { ko: '죽음과 재생 (현대 지배)', en: 'Death and rebirth as core engine (modern rulership)' },
    Sagittarius: { ko: '신념 체계의 강제적 변용', en: 'Compulsive overhaul of belief systems' },
    Capricorn: { ko: '권위·구조의 무자비한 재구성', en: 'Ruthless reshaping of authority and structure' },
    Aquarius: { ko: '집단 시스템의 근본 재편', en: 'Root-level transformation of collective systems' },
    Pisces: { ko: '무의식·영성의 깊은 변용', en: 'Deep transformation of the unconscious and the sacred' },
  },
}

// ============================================================
// True Node × Sign — soul-direction reading (the lesson the chart
// pulls toward; the *opposite* sign is the comfort/karma).
// ============================================================

const NORTH_NODE_LINES: Record<ZodiacName, SignLine> = {
  Aries: { ko: '의존을 내려놓고 자기 의지를 일으키는 길', en: 'Path: develop independent will, release co-dependency' },
  Taurus: { ko: '극단을 내려놓고 안정·소박함을 짓는 길', en: 'Path: build stability and simplicity, release intensity' },
  Gemini: { ko: '독단을 내려놓고 다양한 관점을 받아들이는 길', en: 'Path: embrace many viewpoints, release singular truth-grasping' },
  Cancer: { ko: '커리어 강박을 내려놓고 정서·뿌리로 돌아가는 길', en: 'Path: return to emotional roots, release career obsession' },
  Leo: { ko: '익명을 내려놓고 자기 빛을 드러내는 길', en: 'Path: shine personally, release hiding in the collective' },
  Virgo: { ko: '몽상을 내려놓고 일상에 헌신하는 길', en: 'Path: ground daily service, release escapism' },
  Libra: { ko: '자기중심을 내려놓고 관계 안에서 균형 잡는 길', en: 'Path: find balance in partnership, release self-centred drive' },
  Scorpio: { ko: '소유 집착을 내려놓고 깊은 변용을 받아들이는 길', en: 'Path: accept deep transformation, release attachment to comfort' },
  Sagittarius: { ko: '디테일 강박을 내려놓고 큰 신념을 향해 가는 길', en: 'Path: aim toward larger meaning, release detail anxiety' },
  Capricorn: { ko: '돌봄에 갇힘을 내려놓고 권위·책임을 입는 길', en: 'Path: claim authority and structure, release caretaking patterns' },
  Aquarius: { ko: '주목 욕구를 내려놓고 공동체·비전에 봉사하는 길', en: 'Path: serve collective vision, release approval-seeking' },
  Pisces: { ko: '분석 집착을 내려놓고 직관·연민에 항복하는 길', en: 'Path: surrender to intuition and compassion, release over-analysis' },
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

export function getNorthNodeInterpretation(
  sign: ZodiacName,
  language: 'ko' | 'en' = 'ko'
): string {
  const entry = NORTH_NODE_LINES[sign]
  return language === 'ko' ? entry.ko : entry.en
}

export function getSouthNodeOppositeSign(north: ZodiacName): ZodiacName {
  const opposite: Record<ZodiacName, ZodiacName> = {
    Aries: 'Libra',
    Taurus: 'Scorpio',
    Gemini: 'Sagittarius',
    Cancer: 'Capricorn',
    Leo: 'Aquarius',
    Virgo: 'Pisces',
    Libra: 'Aries',
    Scorpio: 'Taurus',
    Sagittarius: 'Gemini',
    Capricorn: 'Cancer',
    Aquarius: 'Leo',
    Pisces: 'Virgo',
  }
  return opposite[north]
}
