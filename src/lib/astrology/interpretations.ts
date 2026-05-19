// src/lib/astrology/interpretations.ts
//
// Static interpretation data for natal placements and aspects.
// Mirrors the Saju engine's `interpretations.ts`: deterministic, offline,
// cheap. The LLM layer can pull from these strings to ground its prose,
// or the result page can show them directly when no LLM call is in flight.
//
// Coverage:
//   - Planet × Sign — 10 planets × 12 signs (120 entries, full grid)
//   - Planet × House — 10 planets × 12 houses (120 entries, full grid)
//   - Aspect type × planet pair — short read for the most informative aspects
//
// Note: a parallel narrative table exists in
// `src/lib/fusion/lifeReport/pools/planetHousePool.ts` for the LifeReport
// composer. This file keeps a separate, lightweight grid for non-LifeReport
// surfaces (result page, LLM grounding). They are intentionally NOT shared
// so each side can evolve its voice — this grid is two-language, the pool
// is composer-flavored single-language per call.

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
// Planet × House — short bilingual read for each of 10 × 12 = 120
// combinations. Tone follows LifeReport 6th-iteration naturalisation:
// no astro jargon (10H written out as "10th house"), short and clear,
// 2-3 sentences per language.
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

type HouseNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12

type PlanetHouseKey = Exclude<AstroPlanetName, 'Ascendant'>

const PLANET_HOUSE_LINES: Record<PlanetHouseKey, Record<HouseNumber, SignLine>> = {
  Sun: {
    1: {
      ko: '태양이 자아의 자리에 놓여서, 본인 자신이 곧 빛나는 무대가 돼요. 첫인상과 존재감만으로도 정체성이 또렷이 드러나는 결.',
      en: 'The Sun in the 1st house puts identity right at the surface — your presence itself becomes the stage, and selfhood shows through first impression.',
    },
    2: {
      ko: '본인다움이 자원과 가치관의 자리에서 드러나요. 손에 잡히는 결과와 자신만의 기준을 통해 정체성이 단단해지는 결.',
      en: 'The Sun in the 2nd house channels selfhood through resources and values — identity firms up through tangible results and personal standards.',
    },
    3: {
      ko: '말하고 배우고 가까운 사람과 주고받는 자리에 자아가 머물러요. 호기심을 따라가는 일상의 교류 속에서 본인다움이 살아나요.',
      en: 'The Sun in the 3rd house lives in speech, learning, and everyday exchange — your selfhood comes alive through curiosity and small daily conversations.',
    },
    4: {
      ko: '가정과 뿌리의 자리에 빛이 머물러서, 안에서부터 정체성이 다져져요. 가족·집·고향 같은 사적인 자리에서 가장 본인답게 빛나는 결.',
      en: 'The Sun in the 4th house plants identity in home and roots — selfhood ripens inward, in family, house, and the private spaces.',
    },
    5: {
      ko: '창조·놀이·연애의 자리에서 가장 본인답게 빛나요. 표현이 곧 정체성이고, 무대 위에 설 때 결이 또렷해지는 사람.',
      en: 'The Sun in the 5th house shines brightest in creativity, play, and romance — expression itself is identity, and you sharpen on stage.',
    },
    6: {
      ko: '일상의 노동과 돌봄의 자리에서 자기를 풀어내요. 매일의 디테일을 다듬는 과정에서 본인다움이 또렷해지는 결.',
      en: 'The Sun in the 6th house unfolds selfhood through daily work and care — identity sharpens in the refinement of routine details.',
    },
    7: {
      ko: '관계와 파트너십의 자리에 자아가 머물러요. 일대일 만남 속에서 본인이 누구인지 또렷해지고, 상대가 정체성의 거울이 되는 결.',
      en: 'The Sun in the 7th house places identity inside partnership — one-on-one encounters sharpen who you are, and the other becomes a mirror.',
    },
    8: {
      ko: '깊은 변화와 공유 자원의 자리에 빛이 놓여요. 위기와 변혁을 통과하며 정체성이 새겨지는, 강도 높은 자리.',
      en: 'The Sun in the 8th house places identity in deep change and shared resources — selfhood is forged by passing through transformation.',
    },
    9: {
      ko: '확장과 신념·먼 여정의 자리에 자아가 머물러요. 더 큰 그림과 의미를 향해 가는 길 자체가 본인다움인 결.',
      en: 'The Sun in the 9th house lives in expansion, belief, and long journeys — the search for larger meaning is identity itself.',
    },
    10: {
      ko: '커리어와 사회적 자리에 빛이 올라가요. 공적인 무대에서 본인다움이 가장 또렷하고, 성취와 평판이 곧 정체성이 되는 결.',
      en: 'The Sun in the 10th house lifts identity into career and public life — selfhood is sharpest on the public stage, and reputation becomes who you are.',
    },
    11: {
      ko: '친구·커뮤니티·미래 비전의 자리에서 본인다움이 풀려요. 큰 그룹과 함께 가는 길에서 정체성이 또렷해지는 결.',
      en: 'The Sun in the 11th house releases selfhood through friends, community, and future vision — identity sharpens alongside a larger group.',
    },
    12: {
      ko: '내면과 은둔·영성의 자리에 빛이 머물러요. 보이지 않는 자리에서 정체성이 깊어지고, 조용히 있을 때 가장 본인다워지는 결.',
      en: 'The Sun in the 12th house places identity in solitude, retreat, and inner life — selfhood deepens out of sight and is most itself in quiet.',
    },
  },
  Moon: {
    1: {
      ko: '감정이 표면에 그대로 드러나요. 본인의 기분이 곧 첫인상이 되고, 정서가 정체성과 거의 한 덩어리로 움직이는 결.',
      en: 'The Moon in the 1st house puts feelings right on the surface — your mood becomes the first impression, and emotion moves as one with identity.',
    },
    2: {
      ko: '자원과 소유 안에서 정서적 안전을 찾아요. 손에 잡히는 안정·물질적 토대가 있어야 마음이 차분해지는 결.',
      en: 'The Moon in the 2nd house finds emotional safety inside resources and possessions — feelings settle when there is a tangible base under foot.',
    },
    3: {
      ko: '대화와 학습이 정서의 안식처예요. 말로 풀어내고 가까운 사람과 주고받을 때 마음이 안정되는 결.',
      en: 'The Moon in the 3rd house finds emotional refuge in conversation and learning — talking it through and small exchanges calm the heart.',
    },
    4: {
      ko: '가정과 뿌리가 정서의 토대예요. 집·가족·고향 같은 사적인 자리에서 마음이 가장 안전해지는 결.',
      en: 'The Moon in the 4th house plants emotion in home and roots — your feelings find their safest ground in family and private spaces.',
    },
    5: {
      ko: '창조와 놀이로 감정이 풀려요. 표현하고 연애하고 무언가를 만들어낼 때 마음이 회복되는 결.',
      en: 'The Moon in the 5th house releases feeling through creativity and play — expression, romance, and making something heal the heart.',
    },
    6: {
      ko: '일상의 루틴과 돌봄에서 마음의 안정을 찾아요. 작은 일과를 챙기고 누군가를 보살피는 일이 정서적 회복이 되는 결.',
      en: 'The Moon in the 6th house grounds feeling in daily routine and care — small tending and looking after someone restores you.',
    },
    7: {
      ko: '관계 안에서 정서가 비춰져요. 파트너를 통해 자기 마음을 알게 되고, 일대일 친밀함 안에서 가장 안정되는 결.',
      en: 'The Moon in the 7th house mirrors emotion through relationship — you learn your own feelings through a partner and steady in close company.',
    },
    8: {
      ko: '강렬한 변화와 깊은 결합의 자리에서 정서의 결이 자라요. 위기를 통과하며 마음이 단단해지고, 얕은 연결로는 만족이 어려운 결.',
      en: 'The Moon in the 8th house deepens feeling through intense change and merging — emotion hardens through crisis, and shallow ties leave you unfilled.',
    },
    9: {
      ko: '신념과 큰 그림이 정서의 안식처예요. 여행·배움·철학 안에서 마음이 자유로워지고 채워지는 결.',
      en: 'The Moon in the 9th house turns belief and big horizons into emotional refuge — travel, study, and meaning free and fill the heart.',
    },
    10: {
      ko: '사회적 성취와 인정이 정서와 깊이 엮여요. 평판과 공적인 자리가 마음을 흔드는 결, 일에서 받는 인정이 곧 정서적 회복인 결.',
      en: 'The Moon in the 10th house weaves feeling into public achievement — reputation moves your heart, and recognition at work itself restores you.',
    },
    11: {
      ko: '친구와 커뮤니티가 정서의 안전망이에요. 무리 속에서 마음이 채워지고, 같은 비전을 나누는 그룹이 가족처럼 느껴지는 결.',
      en: 'The Moon in the 11th house turns friends and community into the emotional safety net — the heart fills inside a group that shares your vision.',
    },
    12: {
      ko: '고독과 영성 안에서 정서의 본질을 만나요. 보이지 않는 자리에서 마음이 깊어지고, 가끔의 은둔이 회복인 결.',
      en: 'The Moon in the 12th house meets the essence of feeling in solitude and spirit — emotion deepens unseen, and retreat itself is restoration.',
    },
  },
  Mercury: {
    1: {
      ko: '말과 사고가 정체성 자체로 드러나요. 본인이 어떻게 말하고 생각하는지가 곧 첫인상이고, 머리의 빠른 회전이 본인다움인 결.',
      en: 'Mercury in the 1st house makes thought and speech part of identity itself — how you speak and think becomes the first impression.',
    },
    2: {
      ko: '실용적 사고가 자원의 흐름을 만들어요. 가치와 손에 잡히는 결과를 따져 보는 머리가 자산을 짓는 결.',
      en: 'Mercury in the 2nd house turns practical thinking into the engine of resource flow — weighing value and tangible outcomes builds your base.',
    },
    3: {
      ko: '소통과 짧은 학습이 본인의 핵심 결이에요. 가까운 거리의 정보 교환·이웃·형제자매와의 교류에서 머리가 가장 빛나요.',
      en: 'Mercury in the 3rd house puts your core in communication and short-form learning — mind shines in local exchange, with neighbours and siblings.',
    },
    4: {
      ko: '가정·뿌리 안에서 사고가 차분히 다듬어져요. 집과 가족 안에서 말하고 정리하는 일이 본인의 결.',
      en: 'Mercury in the 4th house refines thought quietly inside home and roots — speaking and organising within family and the private space is your grain.',
    },
    5: {
      ko: '창의적 표현과 즐거운 학습이 사고의 결이에요. 글쓰기·놀이·아이들과의 교류 안에서 머리가 가장 자유롭게 펼쳐져요.',
      en: 'Mercury in the 5th house gives thought a playful, creative grain — mind unfolds most freely in writing, play, and exchange with children.',
    },
    6: {
      ko: '일상의 분석·관리에서 명민함이 빛나요. 디테일을 다듬고 시스템을 정리하는 자리에서 머리가 가장 또렷한 결.',
      en: 'Mercury in the 6th house sharpens in daily analysis and management — mind is clearest when refining details and tidying systems.',
    },
    7: {
      ko: '대화와 협력 안에서 사고가 정리돼요. 파트너와 주고받는 말 속에서 본인 생각의 결이 또렷해지는 결.',
      en: 'Mercury in the 7th house organises thought through dialogue and collaboration — your ideas sharpen in the back-and-forth with a partner.',
    },
    8: {
      ko: '심층 연구·심리·재무 분석이 본인다움이에요. 표면 밑의 패턴을 꿰뚫는 머리가 가장 본인답게 작동하는 결.',
      en: 'Mercury in the 8th house works most authentically in depth research, psychology, and finance — mind digs beneath surface patterns.',
    },
    9: {
      ko: '큰 그림·철학·국제적 시야가 사고의 결이에요. 먼 거리의 학문·외국어·신념 체계 안에서 머리가 가장 크게 펼쳐져요.',
      en: 'Mercury in the 9th house unfolds in big-picture thinking — philosophy, international scope, and distant study set your mind running widest.',
    },
    10: {
      ko: '공적 자리에서 말과 사고가 평판이 돼요. 공식적인 발언·발표·전문성 있는 글이 곧 커리어 자산이 되는 결.',
      en: 'Mercury in the 10th house turns speech and thought into reputation — formal talks, presentations, and expert writing become career assets.',
    },
    11: {
      ko: '생각과 말이 친구·공동체의 자리에 놓여서, 명민하고 분기하는 사고가 사람들 사이에서 빛나요. 그룹 안에서 아이디어를 나누고 발전시키는 방식이 자연스럽게 작동해요.',
      en: 'Mercury in the 11th house places your thinking in the community space — agile, branching ideas come alive among people. Sharing and refining ideas in a group works naturally for you.',
    },
    12: {
      ko: '내면 사유와 명상에서 깊은 통찰이 열려요. 혼자 있을 때 머리가 가장 또렷해지고, 직관에 가까운 사고가 작동하는 결.',
      en: 'Mercury in the 12th house opens deep insight inside reflection and stillness — mind clears in solitude, and thought drifts close to intuition.',
    },
  },
  Venus: {
    1: {
      ko: '매력이 첫인상으로 그대로 드러나요. 본인의 외양·태도 자체가 호감을 자아내고, 미적 감각이 정체성과 한 덩어리인 결.',
      en: 'Venus in the 1st house lets charm radiate through first impression — your manner and look themselves draw warmth, and aesthetic sense is identity.',
    },
    2: {
      ko: '소유와 감각이 미감의 토대예요. 손에 잡히는 아름다움·편안한 환경·물질적 안정이 사랑과 만족의 통로인 결.',
      en: 'Venus in the 2nd house grounds beauty in possessions and the senses — tangible beauty, comfort, and material steadiness become the channel of love.',
    },
    3: {
      ko: '대화와 학습 안에서 끌림이 시작돼요. 말의 결·재치·짧은 글이 사랑과 호감을 자아내는 결.',
      en: 'Venus in the 3rd house starts attraction inside conversation — wit, the grain of words, and short writing draw warmth and connection.',
    },
    4: {
      ko: '가정·뿌리가 미감과 안식의 자리예요. 집을 아름답게 꾸미고 가족 안에서 사랑을 누리는 방식이 본인의 결.',
      en: 'Venus in the 4th house plants beauty and rest in home and roots — making the house lovely and finding love inside family is your grain.',
    },
    5: {
      ko: '창조와 연애가 미감의 정점이에요. 예술·놀이·로맨스의 자리에서 사랑이 가장 직접적으로 표현되는 결.',
      en: 'Venus in the 5th house lifts beauty into creation and romance — love expresses itself most directly in art, play, and the romantic stage.',
    },
    6: {
      ko: '일상 챙김과 작은 봉사 안에서 사랑이 풀려요. 누군가를 위해 매일의 디테일을 다듬는 일이 곧 애정 표현인 결.',
      en: 'Venus in the 6th house releases love through daily care and small service — refining daily details for someone is itself how you love.',
    },
    7: {
      ko: '관계와 파트너십이 정체성의 거울이에요. 일대일 만남이 본인의 가장 핵심 무대이고, 사랑이 곧 본인다움인 결.',
      en: 'Venus in the 7th house makes partnership the mirror of identity — one-on-one is the core stage, and love itself is who you are.',
    },
    8: {
      ko: '깊은 결합과 공유 자원에서 가치가 만들어져요. 강도 높은 친밀함·신뢰·금기 영역의 사랑이 본인의 결.',
      en: 'Venus in the 8th house forges value through deep merging and shared resources — intense intimacy, trust, and taboo love are your grain.',
    },
    9: {
      ko: '먼 곳·다른 문화 안에서 사랑이 깨어나요. 여행지·외국·철학적 대화 속에서 끌림이 가장 또렷해지는 결.',
      en: 'Venus in the 9th house awakens love in distant places and other cultures — attraction sharpens through travel, foreign worlds, and big ideas.',
    },
    10: {
      ko: '공적 자리에서 매력과 미감이 자산이 돼요. 커리어와 사회적 평판이 사랑·아름다움과 깊이 엮이는 결.',
      en: 'Venus in the 10th house turns charm and aesthetic sense into a public asset — love and beauty weave tightly into career and reputation.',
    },
    11: {
      ko: '커뮤니티와 친구가 사랑의 통로예요. 같은 비전을 나누는 그룹·우정 안에서 애정이 자연스럽게 자라는 결.',
      en: 'Venus in the 11th house channels love through community and friends — affection grows naturally inside groups that share your vision.',
    },
    12: {
      ko: '내면·은둔 안에서 깊은 사랑이 자라요. 보이지 않는 자리·비밀·영성 안에서 사랑이 가장 본질에 닿는 결.',
      en: 'Venus in the 12th house grows deep love in solitude and retreat — affection touches its essence in unseen spaces, secrets, and the sacred.',
    },
  },
  Mars: {
    1: {
      ko: '자기 자신을 던지는 게 행동의 결인 사람. 추진력과 욕망이 첫인상과 태도로 그대로 드러나는 결.',
      en: 'Mars in the 1st house gives action a self-thrown grain — drive and desire show right in first impression and bearing.',
    },
    2: {
      ko: '자원·소유를 쌓는 행동에서 욕망이 풀려요. 손에 잡히는 결과·재화·기술을 쌓아 올리는 일이 본인의 결.',
      en: 'Mars in the 2nd house releases desire through building resources — accumulating tangible results, money, and skills is your grain.',
    },
    3: {
      ko: '말과 학습을 추진하는 자리에서 본인다움이 살아나요. 빠른 정보 교환·가까운 거리의 활동·이웃과의 분주함이 추진력인 결.',
      en: 'Mars in the 3rd house comes alive while pushing speech and learning forward — fast exchange, local activity, and busy neighbourhood movement drive you.',
    },
    4: {
      ko: '가정·뿌리를 지키는 행동이 욕망의 결이에요. 집과 가족을 위해 움직이는 일이 본인의 가장 깊은 추진력인 결.',
      en: 'Mars in the 4th house grains desire into defending home and roots — moving on behalf of family and house is your deepest drive.',
    },
    5: {
      ko: '창조·연애의 자리에서 욕망이 폭발해요. 표현·로맨스·놀이의 무대에서 추진력이 가장 직접적으로 풀리는 결.',
      en: 'Mars in the 5th house lets desire burst open in creation and romance — drive releases most directly on the stage of expression and play.',
    },
    6: {
      ko: '일상 노동·운동·반복 작업에서 추진력이 풀려요. 매일의 루틴 안에서 몸을 쓰는 일이 본인의 결.',
      en: 'Mars in the 6th house releases drive through daily work, exercise, and repetition — using the body inside routine is your grain.',
    },
    7: {
      ko: '관계와 파트너십 안에서 욕망이 비춰져요. 일대일 만남에서 자기 추진력을 알게 되고, 상대가 자극제가 되는 결.',
      en: 'Mars in the 7th house mirrors desire through partnership — you learn your own drive in one-on-one, and the other person becomes the catalyst.',
    },
    8: {
      ko: '심층 변화·공유 자원·위기에서 추진력이 풀려요. 깊은 변혁의 자리에서 욕망이 가장 또렷해지는 결.',
      en: 'Mars in the 8th house activates drive in deep change, shared resources, and crisis — desire sharpens at the site of transformation.',
    },
    9: {
      ko: '여행·확장·학문 추진에서 본인다움이 살아나요. 먼 곳·신념·큰 그림을 향해 가는 일이 욕망의 결.',
      en: 'Mars in the 9th house comes alive in travel, expansion, and the push of study — moving toward distance, belief, and the big picture is desire itself.',
    },
    10: {
      ko: '공적 자리·커리어 추진에서 욕망이 가장 또렷한 결. 사회 무대를 점령하려는 의지가 본인의 핵심 동력인 결.',
      en: 'Mars in the 10th house makes desire sharpest in career and the public push — the will to claim the social stage is your core engine.',
    },
    11: {
      ko: '커뮤니티·미래 비전을 위한 행동이 본인의 결이에요. 그룹·운동·집단적 변화를 위해 추진력을 쓰는 사람.',
      en: 'Mars in the 11th house grains drive into action for community and future vision — you spend energy for groups, movements, and collective change.',
    },
    12: {
      ko: '뒤에서·내면에서 조용히 행동하는 결, 보이지 않는 추진. 직접 부딪히기보다 간접적·영적·예술적 통로로 욕망이 풀리는 결.',
      en: 'Mars in the 12th house moves quietly from behind — an unseen drive that releases through indirect, spiritual, or artistic channels rather than direct collision.',
    },
  },
  Jupiter: {
    1: {
      ko: '자기 자신·정체성에 풍요와 자신감이 깃드는 자리, 본인이 곧 기회의 통로인 결. 존재감만으로도 사람과 행운이 모이는 결.',
      en: 'Jupiter in the 1st house lodges abundance and confidence in identity — you become the channel for opportunity, and people and luck gather around your presence.',
    },
    2: {
      ko: '자원·소유·수입의 길이 넉넉히 열리는 결, 가치가 풍성하게 쌓이는 자리. 손에 잡히는 자산이 시간이 갈수록 자라는 결.',
      en: 'Jupiter in the 2nd house opens generous paths through resources, possessions, and income — value accumulates richly, and tangible assets grow over time.',
    },
    3: {
      ko: '학습·소통·이웃과의 교류에서 기회가 트이는 결, 말과 글이 자산이 되는 자리. 다양한 시도와 짧은 학습이 풍요를 부르는 결.',
      en: 'Jupiter in the 3rd house opens opportunity through learning, communication, and local exchange — words and writing become assets, and variety draws in abundance.',
    },
    4: {
      ko: '가정·뿌리·부동산이 풍요의 무대인 결, 안에서부터 크게 자라는 자리. 가족과 집안의 기반이 본인의 가장 큰 자산이 되는 결.',
      en: 'Jupiter in the 4th house stages abundance in home, roots, and real estate — you grow from within, and family and household become your largest asset.',
    },
    5: {
      ko: '창작·연애·자녀의 자리에서 행운이 가장 또렷한 결, 표현이 풍요로 이어지는 자리. 무대 위에서 빛나면 자연스럽게 기회가 따라오는 결.',
      en: 'Jupiter in the 5th house puts luck sharpest in creation, romance, and children — expression turns into plenty, and shining on stage draws opportunity.',
    },
    6: {
      ko: '일상의 노동·건강 관리에서 의미가 커지는 결, 작은 봉사가 큰 자산이 되는 자리. 매일의 디테일이 시간이 갈수록 풍요로 자라는 결.',
      en: 'Jupiter in the 6th house grows meaning inside daily work and health care — small service becomes a large asset, and routine ripens into abundance.',
    },
    7: {
      ko: '관계·파트너십이 확장의 통로인 결, 사람을 통해 세계가 넓어지는 자리. 파트너와의 만남이 인생의 가장 큰 행운으로 기능하는 결.',
      en: 'Jupiter in the 7th house channels expansion through partnership — the world widens through people, and the right partner becomes your largest piece of luck.',
    },
    8: {
      ko: '심층 변화·공유 자원에서 큰 기회가 열리는 결, 위기 뒤에 풍요가 따라오는 자리. 변혁을 통과한 자리에서 자원이 들어오는 결.',
      en: 'Jupiter in the 8th house opens big opportunity through deep change and shared resources — abundance follows the crisis, and value arrives after transformation.',
    },
    9: {
      ko: '먼 곳·학문·믿음에서 본인다움이 가장 크게 펼쳐지는 결, 확장이 곧 정체성인 자리. 여행과 큰 그림이 인생을 풍성하게 만드는 결.',
      en: 'Jupiter in the 9th house unfolds you most fully in distant places, study, and belief — expansion itself is identity, and travel and big ideas enrich life.',
    },
    10: {
      ko: '사회 무대·커리어가 풍요의 정점인 결, 공적 성취가 그대로 자산이 되는 자리. 평판·인정·공적인 길이 본인의 가장 큰 행운인 결.',
      en: 'Jupiter in the 10th house puts abundance at the peak of career and public stage — public achievement becomes the asset, and reputation is your largest piece of luck.',
    },
    11: {
      ko: '커뮤니티·미래 비전이 기회의 통로인 결, 친구와 그룹에서 풍요가 들어오는 자리. 같은 비전을 나누는 사람들이 행운을 데려오는 결.',
      en: 'Jupiter in the 11th house channels opportunity through community and future vision — friends and groups bring the windfall, and shared vision draws luck.',
    },
    12: {
      ko: '내면·영성·은둔에서 큰 의미가 자라는 결, 보이지 않는 곳에서 풍요가 익는 자리. 조용한 자기 시간이 가장 큰 자산으로 자라는 결.',
      en: 'Jupiter in the 12th house ripens meaning inside solitude and spirit — abundance matures unseen, and quiet inner time grows into the largest asset.',
    },
  },
  Saturn: {
    1: {
      ko: '자기 자신·정체성에 무게가 실린 결, 일찍부터 어른의 옷을 입는 자리. 본인다움이 시간과 노력으로 천천히 빚어지는 결.',
      en: 'Saturn in the 1st house lays weight on identity itself — you wear adult clothes early, and selfhood is shaped slowly through time and effort.',
    },
    2: {
      ko: '자원·소유·가치 위에 책임이 얹히는 결, 천천히 단단해지는 자리. 풍요가 한 번에 오지 않고 꾸준한 빌드로 자라는 결.',
      en: 'Saturn in the 2nd house lays responsibility on resources and value — strength accumulates slowly, and abundance grows through steady building rather than sudden arrival.',
    },
    3: {
      ko: '소통·학습이 단련을 거치는 결, 말과 사고에 신중함이 자리잡는 결. 가벼운 잡담보다 깊고 정확한 말로 신뢰를 짓는 결.',
      en: 'Saturn in the 3rd house disciplines speech and learning — thought becomes careful, and trust is built through deep, precise words rather than light chatter.',
    },
    4: {
      ko: '가정·뿌리에 무게와 책임이 깔리는 결, 안에서부터 단단해져야 하는 자리. 가족 안의 책임이 본인을 빚는 결.',
      en: 'Saturn in the 4th house lays weight and duty in home and roots — strength must build from within, and family responsibility shapes you.',
    },
    5: {
      ko: '창작·연애·자녀의 자리에서 시험이 따라오는 결, 표현이 책임으로 다듬어지는 자리. 가벼운 즐거움보다 깊고 진지한 표현으로 결과를 짓는 결.',
      en: 'Saturn in the 5th house brings tests through creation, romance, and children — expression is refined by duty, and lasting results come from serious depth rather than light play.',
    },
    6: {
      ko: '책임의 별이 일상과 건강의 자리에 머물러, 일상 루틴과 자기 관리에 무게가 실려요. 꾸준한 노력이 결국 안정된 기반을 만들어내는 결.',
      en: 'Saturn in the 6th house brings responsibility into daily routine and self-care — steady effort eventually builds a stable foundation.',
    },
    7: {
      ko: '관계 안에서 책임과 시간이 시험대인 결, 오래 견디는 만남이 본인을 빚는 자리. 가벼운 인연보다 깊고 오래된 관계가 본인의 결.',
      en: 'Saturn in the 7th house makes responsibility and time the test of relationship — long endurance shapes you, and deep, lasting bonds are your grain.',
    },
    8: {
      ko: '심층 변화·공유 자원에서 깊은 책임이 쌓이는 결, 위기와 마주해 단단해지는 자리. 변혁의 자리에서 신중함과 통제력이 본인을 빚는 결.',
      en: 'Saturn in the 8th house lays deep duty on shared resources and change — strength forges through crisis, and care and control shape you in the place of transformation.',
    },
    9: {
      ko: '신념·학문·먼 곳에서 단련이 따라오는 결, 천천히 익히는 진리의 자리. 큰 그림을 책임 있게 빌드하는 사람.',
      en: 'Saturn in the 9th house lets discipline follow belief, study, and distance — truth ripens slowly, and you build the big picture with responsibility.',
    },
    10: {
      ko: '커리어·사회 무대가 본인의 정점이자 시험대인 결, 평판이 곧 구조인 자리. 시간이 걸려도 단단한 권위를 짓는 사람.',
      en: 'Saturn in the 10th house makes career and the public stage both peak and trial — reputation is the very structure, and you build solid authority over time.',
    },
    11: {
      ko: '커뮤니티·미래 비전에 책임이 따라오는 결, 그룹 안에서 어른 역할이 자리잡는 결. 친구 무리 안에서 신뢰받는 진중한 자리.',
      en: 'Saturn in the 11th house brings duty to community and future vision — the adult role settles inside the group, and you become the trusted, serious figure among friends.',
    },
    12: {
      ko: '내면의 그림자·고독에서 깊은 단련이 일어나는 결, 보이지 않는 무게를 짊어지는 자리. 조용한 자기 작업이 가장 큰 빌드인 결.',
      en: 'Saturn in the 12th house drives deep discipline through inner shadow and solitude — you carry unseen weight, and quiet inner work is your largest build.',
    },
  },
  Uranus: {
    1: {
      ko: '자기 자신을 끊임없이 새로 정의하는 결, 정체성이 곧 파격인 자리. 첫인상부터 보통과 다른 결을 가진 사람.',
      en: 'Uranus in the 1st house keeps reinventing the self — identity itself is the disruption, and first impression already runs unlike the usual.',
    },
    2: {
      ko: '자원·가치에 파격이 따라오는 결, 새로운 방식으로 손에 잡는 자리. 수입의 길과 가치관이 통상적이지 않은 결.',
      en: 'Uranus in the 2nd house brings disruption to resources and value — you hold things in a new way, and income and standards run off the usual script.',
    },
    3: {
      ko: '사고·소통에 돌발과 영감이 깃드는 결, 한 박자 빠른 통찰의 자리. 보통 사람의 결을 가로지르는 아이디어가 자연스러운 결.',
      en: 'Uranus in the 3rd house brings sudden insight to thought and speech — a beat-ahead clarity, with ideas that cut across the usual grain.',
    },
    4: {
      ko: '가정·뿌리가 보통과 다른 결, 떠나고 다시 만드는 자리. 가족 패턴이 통상적이지 않거나 자주 재편되는 결.',
      en: 'Uranus in the 4th house runs home and roots unconventionally — you leave and remake them, and family pattern itself stays atypical or often reshuffles.',
    },
    5: {
      ko: '창작·연애의 자리에서 자유가 가장 또렷한 결, 틀을 벗는 표현의 자리. 정형적인 로맨스보다 새로운 결의 만남이 본인다운 결.',
      en: 'Uranus in the 5th house puts freedom sharpest in creation and romance — expression shrugs off the frame, and unconventional connection feels most like you.',
    },
    6: {
      ko: '일상·노동의 자리에서 혁신이 풀리는 결, 새로운 방식의 작업이 본인의 결. 정형적인 루틴보다 자유로운 흐름이 맞는 결.',
      en: 'Uranus in the 6th house releases innovation in daily work — a new method is your grain, and free flow suits you better than fixed routine.',
    },
    7: {
      ko: '관계가 보통과 다른 결, 자유와 평등이 만남의 조건인 자리. 통상적인 결혼/파트너십 모델보다 본인만의 결을 짓는 사람.',
      en: 'Uranus in the 7th house runs relationship unconventionally — freedom and equality are the terms, and you build your own model rather than the usual partnership shape.',
    },
    8: {
      ko: '심층·금기·공유 자원에서 파격이 일어나는 결, 변혁이 본인을 깨우는 자리. 깊은 자리에서의 갑작스러운 변화가 본인의 결.',
      en: 'Uranus in the 8th house strikes disruption into deep, taboo, and shared resources — transformation wakes you, and sudden change in the depths is your grain.',
    },
    9: {
      ko: '신념·학문에 혁명이 깃드는 결, 기존 진리를 부수고 새 길을 여는 자리. 통념을 다시 쓰는 사고가 본인다움인 결.',
      en: 'Uranus in the 9th house brings revolution to belief and study — you break old truth and open new paths, and rewriting the consensus is selfhood itself.',
    },
    10: {
      ko: '커리어가 보통과 다른 결, 새로운 직업·길을 여는 자리. 정형적인 직장이 답답하고, 본인만의 길을 만들어 가는 결.',
      en: 'Uranus in the 10th house runs career unconventionally — you open new professions or paths, and the standard job feels cramped against your grain.',
    },
    11: {
      ko: '커뮤니티·비전 안에서 혁명이 펼쳐지는 결, 미래의 그룹에 본인이 깃드는 자리. 보통 무리보다 진보적인 그룹이 본인의 본거지인 결.',
      en: 'Uranus in the 11th house unfolds revolution inside community and vision — the future group hosts you, and progressive circles feel like home.',
    },
    12: {
      ko: '무의식·은둔에서 돌발적 통찰이 터지는 결, 보이지 않는 자리에서 깨어나는 결. 혼자 있을 때 가장 자유로운 사고가 폭발하는 결.',
      en: 'Uranus in the 12th house breaks sudden insight through unconscious and retreat — awakening from the unseen, with the freest thinking erupting in solitude.',
    },
  },
  Neptune: {
    1: {
      ko: '자기 자신이 안개·꿈처럼 흐르는 결, 정체성이 유동적인 자리. 첫인상이 신비롭거나 잡히지 않는 결.',
      en: 'Neptune in the 1st house drifts the self like mist or dream — identity stays fluid, and first impression carries something mysterious or hard to pin.',
    },
    2: {
      ko: '자원·소유의 경계가 흐려지는 결, 가치가 영적인 방향으로 옮겨지는 자리. 물질만으로 만족하기 어려운 결.',
      en: 'Neptune in the 2nd house blurs the edges of resources — value shifts toward the spiritual, and material alone struggles to satisfy.',
    },
    3: {
      ko: '소통·사고가 직관에 잠기는 결, 말이 시처럼 흐르는 자리. 논리만으로 잡히지 않는 통찰이 본인의 결.',
      en: 'Neptune in the 3rd house steeps thought and speech in intuition — words flow like poetry, and your insight runs beyond pure logic.',
    },
    4: {
      ko: '가정·뿌리에 영적 결이 깃드는 결, 집이 곧 성소가 되는 자리. 가족 관계의 경계가 흐릿하거나 신비로운 결.',
      en: 'Neptune in the 4th house weaves a spiritual grain into home and roots — the house becomes a sanctuary, and family ties stay blurred or mysterious.',
    },
    5: {
      ko: '창작·연애의 자리에서 환상이 가장 짙은 결, 영감이 표현으로 직접 흐르는 자리. 로맨틱한 이상이 본인의 결.',
      en: 'Neptune in the 5th house thickens fantasy in creation and romance — inspiration flows straight into expression, and romantic ideal is your grain.',
    },
    6: {
      ko: '일상·건강의 경계가 모호해지는 결, 돌봄이 영적인 일이 되는 자리. 몸의 신호가 미세하게 흐르는 결.',
      en: 'Neptune in the 6th house blurs the edges of daily life and health — care becomes a spiritual task, and the body sends subtle, fine signals.',
    },
    7: {
      ko: '관계가 환상에 잠기는 결, 상대를 통해 무한을 보는 자리. 파트너에게 신비로운 이상을 투사하기 쉬운 결.',
      en: 'Neptune in the 7th house steeps relationship in fantasy — you see the infinite through a partner, and projecting a mystical ideal onto them comes easily.',
    },
    8: {
      ko: '심층·공유 자원이 신비에 잠기는 결, 변혁과 영성이 같은 자리에 모이는 결. 깊은 자리에서 직관·신비 체험이 일어나는 결.',
      en: 'Neptune in the 8th house steeps depth and shared resources in mystery — transformation and spirit gather in one place, and mystical experience visits the deep.',
    },
    9: {
      ko: '신념·학문이 영성에 녹는 결, 진리가 직관으로 다가오는 자리. 종교·신비주의·먼 여행이 본인의 결.',
      en: 'Neptune in the 9th house dissolves belief and study into spirit — truth arrives through intuition, and religion, mysticism, and distant travel are your grain.',
    },
    10: {
      ko: '커리어가 비전·예술에 잠기는 결, 공적 자리에서 환상이 자산이 되는 결. 예술·치유·영성 관련 커리어가 본인다움인 결.',
      en: 'Neptune in the 10th house steeps career in vision and art — fantasy itself becomes a public asset, and art, healing, or spirit-led work fits selfhood.',
    },
    11: {
      ko: '커뮤니티·미래 비전이 영적인 결, 큰 꿈이 그룹과 함께 흐르는 자리. 영적·예술적 친구들이 본거지인 결.',
      en: 'Neptune in the 11th house turns community and future vision spiritual — large dreams flow with the group, and spiritual or artistic friends become home.',
    },
    12: {
      ko: '내면·은둔·영성이 본인의 본거지인 결, 보이지 않는 자리에서 가장 또렷한 결. 명상·꿈·예술 안에서 자기 본질을 만나는 결.',
      en: 'Neptune in the 12th house makes inner life, retreat, and spirit home — sharpest where unseen, you meet essence in meditation, dream, and art.',
    },
  },
  Pluto: {
    1: {
      ko: '자기 자신을 통째로 다시 빚는 결, 정체성이 죽고 다시 태어나는 자리. 존재감만으로 강도가 전달되는 결.',
      en: 'Pluto in the 1st house reshapes selfhood entirely — identity dies and is born again, and intensity radiates through bare presence.',
    },
    2: {
      ko: '자원·소유·가치의 격변을 거치는 결, 가치 체계가 통째로 새로 쓰이는 자리. 돈·물질을 둘러싼 깊은 권력 작업이 본인의 결.',
      en: 'Pluto in the 2nd house drives upheaval through resources and value — the value system gets rewritten, and deep power work around money and matter is your grain.',
    },
    3: {
      ko: '사고·소통이 깊이 변혁되는 결, 말 한 마디에 권력이 실리는 자리. 표면 밑을 꿰뚫는 사고가 본인다움인 결.',
      en: 'Pluto in the 3rd house transforms thought and speech deeply — power rides on a single word, and selfhood comes through mind that pierces below the surface.',
    },
    4: {
      ko: '가정·뿌리의 격변을 거치는 결, 가족 패턴이 통째로 다시 짜이는 자리. 가족 안의 어두운 자리를 발굴해 다시 짓는 결.',
      en: 'Pluto in the 4th house drives upheaval through home and roots — family patterns get restitched, and you excavate the shadowed parts of family to rebuild them.',
    },
    5: {
      ko: '창작·연애의 자리에서 강렬함이 가장 또렷한 결, 표현이 곧 변혁인 자리. 어중간한 로맨스로는 만족하기 어려운 결.',
      en: 'Pluto in the 5th house puts intensity sharpest in creation and romance — expression itself is transformation, and lukewarm romance leaves you unsatisfied.',
    },
    6: {
      ko: '일상·건강이 변혁의 자리인 결, 작은 루틴 안에서 깊은 권력이 풀리는 결. 매일의 디테일을 통제하고 재편하는 일이 본인의 결.',
      en: 'Pluto in the 6th house makes daily life and health the site of transformation — deep power unfolds inside small routine, and controlling and reshaping the everyday is your grain.',
    },
    7: {
      ko: '관계의 격변을 통해 본인이 다시 빚어지는 결, 상대가 곧 거울인 자리. 일대일 만남이 권력·신뢰의 시험대인 결.',
      en: 'Pluto in the 7th house remakes you through upheaval in relationship — the partner is the mirror, and one-on-one becomes the trial of power and trust.',
    },
    8: {
      ko: '심층·공유 자원이 본인의 정체성 자체인 결, 변혁이 본거지인 자리. 죽음·재생·금기 영역이 본인의 본질에 닿는 결.',
      en: 'Pluto in the 8th house makes depth and shared resources identity itself — transformation is the home stage, and death, rebirth, and taboo touch your essence.',
    },
    9: {
      ko: '신념·학문이 변혁의 자리인 결, 진리가 죽고 다시 태어나는 자리. 한 번 믿었던 세계관이 무너지고 다시 짓는 결.',
      en: 'Pluto in the 9th house makes belief and study the site of transformation — truth dies and is reborn, and old worldviews collapse and rebuild within you.',
    },
    10: {
      ko: '커리어·권력이 정점에 닿는 결, 사회 무대에서 통째로 다시 빚어지는 자리. 평판과 영향력을 깊이 다루는 자리.',
      en: 'Pluto in the 10th house lifts career and power to the peak — you are remade entirely on the public stage, and you handle reputation and influence at depth.',
    },
    11: {
      ko: '커뮤니티·집단의 변혁을 이끄는 결, 그룹의 권력 구조가 본인 손에 흐르는 자리. 운동·집단 변혁이 본인의 결.',
      en: 'Pluto in the 11th house leads transformation in community — the group power structure flows through you, and movements and collective change are your grain.',
    },
    12: {
      ko: '무의식의 변혁이 일어나는 결, 보이지 않는 자리에서 죽고 다시 태어나는 결. 그림자 작업과 영적 변혁이 본인의 가장 깊은 결.',
      en: 'Pluto in the 12th house drives transformation in the unconscious — death and rebirth happen unseen, and shadow work and spiritual change run as your deepest grain.',
    },
  },
}

function planetHouseLine(planet: AstroPlanetName, house: number): string {
  // Ascendant is defined to be in the 1st house by construction; defer to
  // the generic Sun-equivalent fallback for it.
  if (planet === 'Ascendant') {
    const planetKo = PLANET_LABEL_KO[planet]
    const domainKo = HOUSE_DOMAIN_KO[house] || `${house}하우스`
    return `${planetKo}이(가) ${domainKo} 영역에 자리 — 이 영역에서 본인의 ${planetKo}적 본성이 가장 직접적으로 드러납니다.`
  }
  const entry = PLANET_HOUSE_LINES[planet]?.[house as HouseNumber]
  if (entry) return entry.ko
  const planetKo = PLANET_LABEL_KO[planet]
  const domainKo = HOUSE_DOMAIN_KO[house] || `${house}하우스`
  return `${planetKo}이(가) ${domainKo} 영역에 자리 — 이 영역에서 본인의 ${planetKo}적 본성이 가장 직접적으로 드러납니다.`
}

function planetHouseLineEn(planet: AstroPlanetName, house: number): string {
  if (planet === 'Ascendant') {
    return `${planet} in House ${house} — operates most directly in the area of "${HOUSE_DOMAIN_KO[house] || ''}".`
  }
  const entry = PLANET_HOUSE_LINES[planet]?.[house as HouseNumber]
  if (entry) return entry.en
  return `${planet} in House ${house} — operates most directly in the area of "${HOUSE_DOMAIN_KO[house] || ''}".`
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
    return planetHouseLineEn(planet, house)
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
