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
// Aspect × Planet Pair  — per-combination short read
// Covers the most informative pairs for natal & transit work.
// Order convention: planet1/planet2 follow the canonical
// PLANET_ORDER list (Sun, Moon, Mercury, Venus, Mars, Jupiter,
// Saturn, Uranus, Neptune, Pluto). Lookup is order-agnostic.
// ============================================================

export type AspectPairPlanet =
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

export interface AspectPairEntry {
  planet1: AspectPairPlanet
  planet2: AspectPairPlanet
  aspect: AspectKind
  ko: string
  en: string
  keywords_ko: [string, string, string]
  keywords_en: [string, string, string]
}

const PLANET_ORDER: readonly AspectPairPlanet[] = [
  'Sun',
  'Moon',
  'Mercury',
  'Venus',
  'Mars',
  'Jupiter',
  'Saturn',
  'Uranus',
  'Neptune',
  'Pluto',
]

export const ASPECT_PAIR_DICTIONARY: AspectPairEntry[] = [
  // ============================================================
  // HIGH PRIORITY — Sun × {Moon, Venus, Mars, Jupiter, Saturn}
  // ============================================================

  // ---------- Sun × Moon (identity × emotion) ----------
  {
    planet1: 'Sun', planet2: 'Moon', aspect: 'conjunction',
    ko: '자아와 감정이 한 자리에서 만나, 의식과 무의식이 한 톤으로 흐르는 결이에요. 의지와 감정이 자연스럽게 같은 방향을 보는 흐름.',
    en: 'Identity and emotion meet in the same spot — conscious will and inner feeling flow in the same key. A natural alignment of intention and mood.',
    keywords_ko: ['자아의 통합', '감정의 일치', '한 톤의 결'],
    keywords_en: ['integrated self', 'aligned emotion', 'single-key flow'],
  },
  {
    planet1: 'Sun', planet2: 'Moon', aspect: 'sextile',
    ko: '자아와 감정이 가볍게 손을 잡는 결이에요. 의지와 마음이 부드럽게 협력하지만, 의식적으로 쓸 때 더 살아나요.',
    en: 'Will and feeling clasp hands gently. Intention and mood cooperate easily, but the gift only sparks when you use it on purpose.',
    keywords_ko: ['의지-감정 협력', '부드러운 균형', '의식적 활용'],
    keywords_en: ['willing cooperation', 'gentle balance', 'opt-in flow'],
  },
  {
    planet1: 'Sun', planet2: 'Moon', aspect: 'square',
    ko: '의지가 가는 길과 마음이 원하는 자리가 어긋나는 결이에요. 자아와 감정 사이의 긴장이 성장의 엔진이 돼요.',
    en: 'Where the will points and where the heart leans pull at different angles. The friction between identity and feeling becomes a growth engine.',
    keywords_ko: ['내적 긴장', '성장의 마찰', '균형 찾기'],
    keywords_en: ['inner friction', 'growth tension', 'finding balance'],
  },
  {
    planet1: 'Sun', planet2: 'Moon', aspect: 'trine',
    ko: '의지와 감정이 같은 강물에 흐르는 결이에요. 자아 표현이 감정의 결과 잘 맞아 큰 노력 없이 자기다움이 나와요.',
    en: 'Will and feeling ride the same current. Self-expression matches inner mood, so authenticity flows without strain.',
    keywords_ko: ['타고난 자기다움', '내면 화합', '자연스런 흐름'],
    keywords_en: ['innate authenticity', 'inner harmony', 'effortless flow'],
  },
  {
    planet1: 'Sun', planet2: 'Moon', aspect: 'opposition',
    ko: '의지와 감정이 마주 보며 균형을 찾아가는 결이에요. 관계 안에서 자아와 마음의 두 축이 통합돼요.',
    en: 'Identity and emotion face each other from opposite shores. Through relationships and mirroring, the two poles learn to balance.',
    keywords_ko: ['양극의 통합', '관계의 거울', '의식-무의식 균형'],
    keywords_en: ['polar integration', 'relational mirror', 'conscious-unconscious balance'],
  },

  // ---------- Sun × Venus (identity × love) ----------
  {
    planet1: 'Sun', planet2: 'Venus', aspect: 'conjunction',
    ko: '자아의 별과 사랑의 별이 한 자리에 모여 빛나는 결이에요. 자기 표현 자체가 매력이 되고, 사랑이 정체성의 일부로 흘러요.',
    en: 'Identity star and love star sit in the same spot. Self-expression itself becomes charm — love flows as part of who you are.',
    keywords_ko: ['타고난 매력', '사랑과 자아', '빛나는 표현'],
    keywords_en: ['natural charm', 'love-as-self', 'radiant expression'],
  },
  {
    planet1: 'Sun', planet2: 'Venus', aspect: 'sextile',
    ko: '자아와 사랑이 가볍게 협력하는 결이에요. 사교, 예술, 관계에서 부드러운 기회가 자주 다가와요.',
    en: 'Identity and affection collaborate at an easy angle. Social, artistic, and relational chances arrive gently and often.',
    keywords_ko: ['사교의 흐름', '미감의 기회', '관계의 부드러움'],
    keywords_en: ['social ease', 'aesthetic chance', 'gentle relating'],
  },
  {
    planet1: 'Sun', planet2: 'Venus', aspect: 'square',
    ko: '자기 표현과 사랑의 결이 살짝 어긋나, 자존감과 관계 욕구 사이에서 갈등이 생기는 결이에요. 자기다움과 사랑의 균형을 배우게 돼요.',
    en: 'Self-expression and love sit at a tight angle, creating push-pull between self-worth and the wish to be loved. The lesson is balancing authenticity with affection.',
    keywords_ko: ['자존-사랑 긴장', '균형의 과제', '관계 학습'],
    keywords_en: ['self-love tension', 'balance lesson', 'relational learning'],
  },
  {
    planet1: 'Sun', planet2: 'Venus', aspect: 'trine',
    ko: '자아와 사랑이 같은 결로 흐르는 결이에요. 매력과 자기 표현이 자연스럽게 어울려, 호감과 미적 감각이 타고난 강점이 돼요.',
    en: 'Identity and love flow in the same key. Charm and self-expression marry naturally — likeability and aesthetic sense become innate strengths.',
    keywords_ko: ['타고난 호감', '미적 강점', '자연스런 사랑'],
    keywords_en: ['innate likability', 'aesthetic gift', 'natural love-flow'],
  },
  {
    planet1: 'Sun', planet2: 'Venus', aspect: 'opposition',
    ko: '자아와 사랑이 마주 서서 균형을 배우는 결이에요. 관계 안에서 자기다움과 상대 만족 사이를 오가며 통합점을 찾아요.',
    en: 'Identity and love face each other across the chart. Inside relationships, you learn to swing between self-truth and pleasing others until a middle point emerges.',
    keywords_ko: ['자아-관계 균형', '거울로서의 사랑', '통합점 찾기'],
    keywords_en: ['self-other balance', 'love as mirror', 'finding middle ground'],
  },

  // ---------- Sun × Mars (identity × drive) ----------
  {
    planet1: 'Sun', planet2: 'Mars', aspect: 'conjunction',
    ko: '자아의 별과 추진의 별이 한 자리에서 만나는 결이에요. 의지와 행동이 한 몸이 되어, 결정이 바로 움직임으로 바뀌어요.',
    en: 'Identity and drive fuse in one place. Will and action become one body — decisions translate to motion almost instantly.',
    keywords_ko: ['즉결의 추진력', '뜨거운 의지', '행동-자아 일치'],
    keywords_en: ['decisive drive', 'hot will', 'action-self fusion'],
  },
  {
    planet1: 'Sun', planet2: 'Mars', aspect: 'sextile',
    ko: '자아와 추진이 부드럽게 협력하는 결이에요. 목표를 정하면 행동이 따라오지만, 멈춰 있으면 발화되지 않아요.',
    en: 'Identity and drive cooperate at an easy angle. Set a target and action follows — but the spark only ignites when you choose to engage.',
    keywords_ko: ['협력적 추진', '의식적 행동', '깨우는 기회'],
    keywords_en: ['cooperative drive', 'conscious action', 'spark-on-demand'],
  },
  {
    planet1: 'Sun', planet2: 'Mars', aspect: 'square',
    ko: '자아와 행동이 어긋난 각도로 맞물려, 추진은 강하지만 자주 부딪치는 결이에요. 갈등 안에서 자기 의지를 다듬어가요.',
    en: 'Identity and action meet at a sharp angle — strong drive that often collides with itself or others. The lesson is honing will through friction.',
    keywords_ko: ['강한 추진과 마찰', '의지 다듬기', '갈등 통한 성장'],
    keywords_en: ['driven friction', 'tempering will', 'growth-through-conflict'],
  },
  {
    planet1: 'Sun', planet2: 'Mars', aspect: 'trine',
    ko: '자아와 추진이 같은 강물에 흐르는 결이에요. 행동이 자기다움을 그대로 표현해, 활력과 용기가 타고난 강점이 돼요.',
    en: 'Identity and drive ride the same current. Action expresses authenticity directly — vitality and courage become innate strengths.',
    keywords_ko: ['타고난 활력', '용기의 결', '행동의 자연스러움'],
    keywords_en: ['innate vitality', 'natural courage', 'effortless action'],
  },
  {
    planet1: 'Sun', planet2: 'Mars', aspect: 'opposition',
    ko: '자아와 행동이 마주 서서 부딪치는 결이에요. 내 의지와 타인의 추진 사이에서 충돌과 협력의 균형을 배우게 돼요.',
    en: 'Identity and action face off across the chart. You learn the balance between your will and someone else’s drive — clash and collaboration both teach.',
    keywords_ko: ['의지의 충돌', '추진의 균형', '관계 속 행동'],
    keywords_en: ['willful clash', 'balanced drive', 'action in relating'],
  },

  // ---------- Sun × Jupiter (identity × expansion) ----------
  {
    planet1: 'Sun', planet2: 'Jupiter', aspect: 'conjunction',
    ko: '자아의 별과 확장의 별이 한 자리에서 만나는 결이에요. 자기다움이 곧 성장과 행운의 입구가 돼요.',
    en: 'Identity and expansion meet in one place. Being yourself becomes the doorway to growth and luck.',
    keywords_ko: ['확장된 자아', '타고난 행운', '큰 그림의 결'],
    keywords_en: ['expanded self', 'inborn luck', 'big-picture identity'],
  },
  {
    planet1: 'Sun', planet2: 'Jupiter', aspect: 'sextile',
    ko: '자아와 확장이 부드럽게 협력하는 결이에요. 의식적으로 움직이면 기회와 시야가 자연스럽게 따라와요.',
    en: 'Identity and expansion cooperate at an easy angle. When you actively step up, opportunity and perspective follow.',
    keywords_ko: ['협력적 확장', '시야의 기회', '의식적 성장'],
    keywords_en: ['cooperative growth', 'broadening chance', 'conscious expansion'],
  },
  {
    planet1: 'Sun', planet2: 'Jupiter', aspect: 'square',
    ko: '자아와 확장이 어긋난 각도로 맞물려, 자신을 크게 펼치고 싶은 마음과 현실의 한계가 부딪치는 결이에요. 과한 자신감을 다듬는 과제예요.',
    en: 'Identity and expansion clash at a tight angle — the wish to stretch big meets real limits. The lesson is tempering overreach into right-sized ambition.',
    keywords_ko: ['과한 확장', '한계의 학습', '겸손의 과제'],
    keywords_en: ['overreach tension', 'limits lesson', 'humility task'],
  },
  {
    planet1: 'Sun', planet2: 'Jupiter', aspect: 'trine',
    ko: '자아와 확장이 같은 결로 흐르는 결이에요. 자기다움이 그대로 풍요와 신뢰로 이어지는 타고난 행운의 결.',
    en: 'Identity and expansion flow in the same key. Authenticity translates straight into abundance and trust — a natural luck-line.',
    keywords_ko: ['타고난 행운', '풍요의 흐름', '신뢰의 결'],
    keywords_en: ['inborn fortune', 'abundance flow', 'trust-line'],
  },
  {
    planet1: 'Sun', planet2: 'Jupiter', aspect: 'opposition',
    ko: '자아와 확장이 마주 서서 균형을 찾는 결이에요. 자기다움과 큰 그림 사이를 오가며, 과욕과 절제의 중심점을 배우게 돼요.',
    en: 'Identity and expansion face each other across the chart. You learn the centerline between self and the bigger vision — between hunger and restraint.',
    keywords_ko: ['자아-비전 균형', '절제의 학습', '큰 그림의 중심'],
    keywords_en: ['self-vision balance', 'restraint lesson', 'big-picture center'],
  },

  // ---------- Sun × Saturn (identity × responsibility) ----------
  {
    planet1: 'Sun', planet2: 'Saturn', aspect: 'conjunction',
    ko: '자아의 별과 책임의 별이 한 자리에서 만나는 결이에요. 자기다움이 구조와 함께 자라, 단단한 어른의 결을 일찍 입어요.',
    en: 'Identity and responsibility meet in the same spot. Authenticity grows alongside structure — a sturdy, adult quality arrives early.',
    keywords_ko: ['책임 있는 자아', '구조와 함께 자람', '일찍 든 어른'],
    keywords_en: ['responsible self', 'structured identity', 'early maturity'],
  },
  {
    planet1: 'Sun', planet2: 'Saturn', aspect: 'sextile',
    ko: '자아와 책임이 부드럽게 협력하는 결이에요. 꾸준한 노력이 자기다움을 단단하게 만들어, 의식적으로 쓸수록 강해져요.',
    en: 'Identity and responsibility collaborate at an easy angle. Steady effort hardens authenticity — the gift grows the more you choose to use it.',
    keywords_ko: ['꾸준함의 결', '구조의 협력', '의식적 단련'],
    keywords_en: ['steady gift', 'structured cooperation', 'conscious discipline'],
  },
  {
    planet1: 'Sun', planet2: 'Saturn', aspect: 'square',
    ko: '자아와 책임이 어긋난 각도로 맞물려, 자기 표현과 의무 사이에서 무게가 느껴지는 결이에요. 자기다움을 부정하지 않고 책임을 지는 법을 배워요.',
    en: 'Identity and duty grind at a tight angle — self-expression feels weighed down. The lesson is carrying responsibility without erasing the self.',
    keywords_ko: ['자아의 무게', '책임의 압박', '단련의 학습'],
    keywords_en: ['weight on self', 'duty pressure', 'discipline lesson'],
  },
  {
    planet1: 'Sun', planet2: 'Saturn', aspect: 'trine',
    ko: '자아와 책임이 같은 결로 흐르는 결이에요. 노력과 자기다움이 자연스럽게 맞물려, 어른스러움이 강점이 돼요.',
    en: 'Identity and responsibility flow in the same key. Effort and self align easily — maturity becomes a built-in advantage.',
    keywords_ko: ['타고난 어른스러움', '구조의 강점', '꾸준한 결'],
    keywords_en: ['innate maturity', 'structural strength', 'steady-line'],
  },
  {
    planet1: 'Sun', planet2: 'Saturn', aspect: 'opposition',
    ko: '자아와 책임이 마주 서서 무게의 균형을 찾는 결이에요. 권위, 부모, 사회와의 관계 안에서 자기다움과 의무 사이를 통합해가요.',
    en: 'Identity and responsibility face each other across the chart. Through authority, parental, and societal mirrors, you integrate self with duty.',
    keywords_ko: ['권위와의 거울', '의무-자아 통합', '책임의 균형'],
    keywords_en: ['authority mirror', 'duty-self integration', 'balanced burden'],
  },

  // ============================================================
  // HIGH PRIORITY — Moon × {Mercury, Venus, Mars, Saturn}
  // ============================================================

  // ---------- Moon × Mercury (emotion × mind) ----------
  {
    planet1: 'Moon', planet2: 'Mercury', aspect: 'conjunction',
    ko: '감정의 별과 생각의 별이 한 자리에서 만나는 결이에요. 느끼는 그대로 말이 되어 나와, 정서와 사고가 거의 동시에 움직여요.',
    en: 'Emotion and mind meet in the same spot. Feelings translate straight into words — mood and thought move almost as one.',
    keywords_ko: ['느낀 그대로 말함', '직관적 사고', '정서-언어 일치'],
    keywords_en: ['speaking as you feel', 'intuitive mind', 'mood-to-words'],
  },
  {
    planet1: 'Moon', planet2: 'Mercury', aspect: 'sextile',
    ko: '감정과 생각이 부드럽게 협력하는 결이에요. 마음을 말로 옮기는 일이 자연스러워, 표현하려 할수록 잘 풀려요.',
    en: 'Feeling and thought cooperate at an easy angle. Putting the heart into words flows — and the more you choose to express, the better it works.',
    keywords_ko: ['표현의 흐름', '정서적 언어', '의식적 소통'],
    keywords_en: ['expressive flow', 'emotional language', 'conscious sharing'],
  },
  {
    planet1: 'Moon', planet2: 'Mercury', aspect: 'square',
    ko: '감정과 생각이 어긋난 각도로 맞물려, 마음과 말이 자주 따로 노는 결이에요. 느낌을 적확히 옮기는 법을 배우는 과제예요.',
    en: 'Feeling and thinking grind at a tight angle — mood and words often slip past each other. The lesson is naming what you feel precisely.',
    keywords_ko: ['감정-언어 어긋남', '말의 마찰', '표현의 학습'],
    keywords_en: ['feeling-words gap', 'verbal friction', 'expression lesson'],
  },
  {
    planet1: 'Moon', planet2: 'Mercury', aspect: 'trine',
    ko: '감정과 생각이 같은 결로 흐르는 결이에요. 마음과 말이 자연스럽게 어울려, 공감과 소통이 타고난 강점이 돼요.',
    en: 'Feeling and thinking flow in the same key. Heart and words align easily — empathy and communication become natural strengths.',
    keywords_ko: ['공감의 결', '자연스런 소통', '정서적 지성'],
    keywords_en: ['empathic flow', 'easy communication', 'emotional intelligence'],
  },
  {
    planet1: 'Moon', planet2: 'Mercury', aspect: 'opposition',
    ko: '감정과 생각이 마주 서서 균형을 찾는 결이에요. 느낌과 논리 사이를 오가며, 관계 안에서 통합되는 표현법을 배워요.',
    en: 'Feeling and thinking face each other across the chart. Between mood and logic, you learn an integrated voice through relating.',
    keywords_ko: ['감정-논리 균형', '관계 속 표현', '통합된 목소리'],
    keywords_en: ['heart-mind balance', 'relational expression', 'integrated voice'],
  },

  // ---------- Moon × Venus (emotion × love) ----------
  {
    planet1: 'Moon', planet2: 'Venus', aspect: 'conjunction',
    ko: '감정의 별과 사랑의 별이 한 자리에 모이는 결이에요. 마음 그대로가 애정이 되어, 정서적 다정함이 매력이 돼요.',
    en: 'Emotion and love meet in the same spot. Inner mood becomes affection itself — emotional tenderness becomes the charm.',
    keywords_ko: ['정서적 다정함', '느낌의 매력', '사랑의 흐름'],
    keywords_en: ['emotional warmth', 'mood-as-charm', 'love-flow'],
  },
  {
    planet1: 'Moon', planet2: 'Venus', aspect: 'sextile',
    ko: '감정과 사랑이 부드럽게 협력하는 결이에요. 마음을 열수록 사랑과 미적 감각이 살아나는, 의식적 흐름의 결.',
    en: 'Feeling and love cooperate at an easy angle. The more you choose to open the heart, the more love and aesthetic sense come alive.',
    keywords_ko: ['협력적 다정함', '미적 흐름', '의식적 열림'],
    keywords_en: ['cooperative warmth', 'aesthetic flow', 'opened heart'],
  },
  {
    planet1: 'Moon', planet2: 'Venus', aspect: 'square',
    ko: '감정과 사랑이 어긋난 각도로 맞물려, 안정 욕구와 애정 표현 사이에서 갈등이 생기는 결이에요. 사랑 안에서 진짜 필요를 보는 학습.',
    en: 'Feeling and love grind at a tight angle — the need for safety pulls against the wish to express affection. The lesson is seeing real needs inside love.',
    keywords_ko: ['욕구-사랑 긴장', '안정의 갈등', '진짜 필요 보기'],
    keywords_en: ['need-love tension', 'safety conflict', 'seeing-real-needs'],
  },
  {
    planet1: 'Moon', planet2: 'Venus', aspect: 'trine',
    ko: '감정과 사랑이 같은 강물에 흐르는 결이에요. 다정함과 미적 감각이 타고난 강점이 되어, 관계가 자연스럽게 따뜻해요.',
    en: 'Feeling and love ride the same current. Tenderness and aesthetic sense become innate strengths — relationships feel naturally warm.',
    keywords_ko: ['타고난 다정함', '관계의 온도', '미적 흐름'],
    keywords_en: ['innate tenderness', 'warm relating', 'aesthetic ease'],
  },
  {
    planet1: 'Moon', planet2: 'Venus', aspect: 'opposition',
    ko: '감정과 사랑이 마주 서서 균형을 찾는 결이에요. 내 욕구와 상대의 애정 사이를 오가며, 관계의 거울을 통해 통합점을 찾아요.',
    en: 'Feeling and love face each other across the chart. Between your needs and the other’s affection, the mirror of relating finds the middle point.',
    keywords_ko: ['욕구-사랑 균형', '거울의 학습', '관계의 통합'],
    keywords_en: ['need-love balance', 'mirror lesson', 'relational integration'],
  },

  // ---------- Moon × Mars (emotion × drive) ----------
  {
    planet1: 'Moon', planet2: 'Mars', aspect: 'conjunction',
    ko: '감정의 별과 추진의 별이 한 자리에서 만나는 결이에요. 느끼는 그대로 바로 움직여, 정서가 곧 행동이 돼요.',
    en: 'Emotion and drive meet in the same spot. Feelings turn into motion almost instantly — mood is action.',
    keywords_ko: ['감정-행동 일치', '뜨거운 반응', '즉결의 정서'],
    keywords_en: ['emotion-as-action', 'hot reactivity', 'immediate feeling'],
  },
  {
    planet1: 'Moon', planet2: 'Mars', aspect: 'sextile',
    ko: '감정과 추진이 부드럽게 협력하는 결이에요. 마음이 움직이면 행동도 따라오지만, 멈춰 있으면 발화되지 않아요.',
    en: 'Feeling and drive cooperate at an easy angle. When the mood moves, the action follows — but it has to be chosen, not coasted into.',
    keywords_ko: ['협력적 반응', '의식적 추진', '깨우는 정서'],
    keywords_en: ['cooperative reaction', 'conscious drive', 'mood-spark'],
  },
  {
    planet1: 'Moon', planet2: 'Mars', aspect: 'square',
    ko: '감정과 행동이 어긋난 각도로 맞물려, 마음이 자주 욱하고 움직이는 결이에요. 정서적 반응을 다듬는 과제예요.',
    en: 'Feeling and action grind at a tight angle — emotion fires off impulsively. The lesson is tempering reactive heat.',
    keywords_ko: ['감정의 충동', '욱하는 결', '반응 다듬기'],
    keywords_en: ['emotional impulse', 'hot-reaction', 'tempering reactivity'],
  },
  {
    planet1: 'Moon', planet2: 'Mars', aspect: 'trine',
    ko: '감정과 추진이 같은 결로 흐르는 결이에요. 마음의 신호가 그대로 행동으로 살아나, 활력과 정서가 타고난 짝이 돼요.',
    en: 'Feeling and drive flow in the same key. The heart’s signal becomes movement easily — vitality and mood pair naturally.',
    keywords_ko: ['타고난 활력', '정서-행동 흐름', '에너지의 결'],
    keywords_en: ['innate vitality', 'mood-action flow', 'energy-line'],
  },
  {
    planet1: 'Moon', planet2: 'Mars', aspect: 'opposition',
    ko: '감정과 행동이 마주 서서 균형을 찾는 결이에요. 내 마음과 상대의 추진이 부딪치며, 관계 안에서 정서-행동의 통합을 배워요.',
    en: 'Feeling and action face each other across the chart. Your mood meets another’s drive — relationships teach the integration of heart and motion.',
    keywords_ko: ['감정-추진 균형', '관계의 마찰', '통합의 학습'],
    keywords_en: ['mood-drive balance', 'relational friction', 'integration lesson'],
  },

  // ---------- Moon × Saturn (emotion × responsibility) ----------
  {
    planet1: 'Moon', planet2: 'Saturn', aspect: 'conjunction',
    ko: '감정의 별과 책임의 별이 한 자리에서 만나는 결이에요. 마음이 늘 신중하고 무게가 있어, 정서적으로 일찍 어른이 돼요.',
    en: 'Emotion and responsibility meet in the same spot. The heart carries weight from early on — emotional maturity arrives ahead of schedule.',
    keywords_ko: ['무게 있는 마음', '정서적 어른', '신중한 감정'],
    keywords_en: ['weighted heart', 'emotional maturity', 'cautious feeling'],
  },
  {
    planet1: 'Moon', planet2: 'Saturn', aspect: 'sextile',
    ko: '감정과 책임이 부드럽게 협력하는 결이에요. 꾸준한 자기 돌봄이 마음의 토대를 단단하게 만들어요.',
    en: 'Feeling and responsibility cooperate at an easy angle. Steady self-care lays a sturdy emotional foundation.',
    keywords_ko: ['단단한 토대', '꾸준한 돌봄', '구조적 안정'],
    keywords_en: ['steady foundation', 'consistent care', 'structured calm'],
  },
  {
    planet1: 'Moon', planet2: 'Saturn', aspect: 'square',
    ko: '감정과 책임이 어긋난 각도로 맞물려, 마음이 무겁고 외로워지기 쉬운 결이에요. 자기 감정을 부정하지 않고 안아주는 학습.',
    en: 'Feeling and responsibility grind at a tight angle — the heart often feels heavy or alone. The lesson is holding emotion without denying it.',
    keywords_ko: ['감정의 무게', '외로움의 결', '자기 수용 학습'],
    keywords_en: ['heavy heart', 'lonely-line', 'self-acceptance lesson'],
  },
  {
    planet1: 'Moon', planet2: 'Saturn', aspect: 'trine',
    ko: '감정과 책임이 같은 결로 흐르는 결이에요. 마음의 깊이와 구조가 자연스럽게 어울려, 정서적 단단함이 타고난 강점이 돼요.',
    en: 'Feeling and responsibility flow in the same key. Depth and structure marry naturally — emotional sturdiness becomes an innate strength.',
    keywords_ko: ['타고난 정서적 깊이', '단단한 결', '구조와 마음'],
    keywords_en: ['innate emotional depth', 'sturdy-line', 'heart-with-structure'],
  },
  {
    planet1: 'Moon', planet2: 'Saturn', aspect: 'opposition',
    ko: '감정과 책임이 마주 서서 균형을 찾는 결이에요. 가족, 부모, 권위와의 관계 안에서 마음의 무게와 자유 사이를 통합해요.',
    en: 'Feeling and responsibility face each other across the chart. Family, parental, and authority mirrors teach the balance between heart-weight and freedom.',
    keywords_ko: ['가족의 거울', '무게-자유 균형', '정서적 통합'],
    keywords_en: ['family mirror', 'weight-freedom balance', 'emotional integration'],
  },

  // ============================================================
  // HIGH PRIORITY — Venus × {Mars, Jupiter, Saturn, Pluto}
  // ============================================================

  // ---------- Venus × Mars (love × desire) ----------
  {
    planet1: 'Venus', planet2: 'Mars', aspect: 'conjunction',
    ko: '사랑의 별과 추진의 별이 한 자리에서 만나는 결이에요. 끌림과 욕망이 한 몸이 되어, 사랑 안에서 행동이 빠르게 일어나요.',
    en: 'Love and desire meet in the same spot. Attraction and drive fuse into one body — action moves quickly inside relationship.',
    keywords_ko: ['끌림과 욕망', '뜨거운 사랑', '행동하는 애정'],
    keywords_en: ['fused attraction', 'hot love', 'desire-in-motion'],
  },
  {
    planet1: 'Venus', planet2: 'Mars', aspect: 'sextile',
    ko: '사랑과 추진이 부드럽게 협력하는 결이에요. 끌림이 있으면 행동도 자연스럽게 따라와, 의식적으로 다가갈수록 살아나요.',
    en: 'Love and drive cooperate at an easy angle. Attraction translates into action naturally — the more you reach, the more it sparks.',
    keywords_ko: ['협력적 끌림', '다가가는 결', '의식적 사랑'],
    keywords_en: ['cooperative attraction', 'reaching-line', 'conscious love'],
  },
  {
    planet1: 'Venus', planet2: 'Mars', aspect: 'square',
    ko: '사랑의 별과 추진의 별이 팽팽하게 만나는 결이에요. 끌림과 욕망 사이의 긴장이 강해, 사랑에서 빠른 결정과 갈등이 함께 일어나요.',
    en: 'Love and desire meet at a tight angle. Strong tension between attraction and drive — quick decisions and friction both show up in your love life.',
    keywords_ko: ['끌림의 긴장', '빠른 결정', '갈등의 결'],
    keywords_en: ['attraction tension', 'quick decisions', 'friction in love'],
  },
  {
    planet1: 'Venus', planet2: 'Mars', aspect: 'trine',
    ko: '사랑과 추진이 같은 결로 흐르는 결이에요. 끌림과 행동이 자연스럽게 어울려, 매력과 활력이 타고난 짝이 돼요.',
    en: 'Love and drive flow in the same key. Attraction and action align easily — charm and vitality pair naturally.',
    keywords_ko: ['타고난 매력', '끌림의 결', '활력 있는 사랑'],
    keywords_en: ['innate charm', 'attraction-flow', 'vital love'],
  },
  {
    planet1: 'Venus', planet2: 'Mars', aspect: 'opposition',
    ko: '사랑과 추진이 마주 서서 균형을 찾는 결이에요. 끌림과 욕망 사이를 오가며, 관계의 거울 안에서 사랑의 통합점을 배워요.',
    en: 'Love and drive face each other across the chart. Between attraction and desire, the relational mirror teaches an integration point.',
    keywords_ko: ['끌림-욕망 균형', '관계의 거울', '사랑의 통합'],
    keywords_en: ['attraction-desire balance', 'relational mirror', 'love integration'],
  },

  // ---------- Venus × Jupiter (love × expansion) ----------
  {
    planet1: 'Venus', planet2: 'Jupiter', aspect: 'conjunction',
    ko: '사랑의 별과 확장의 별이 한 자리에서 만나는 결이에요. 애정과 풍요가 함께 자라, 관계가 너그럽고 큰 결로 흘러요.',
    en: 'Love and expansion meet in the same spot. Affection and abundance grow together — relationships flow generous and large.',
    keywords_ko: ['관대한 사랑', '풍요의 결', '큰 마음'],
    keywords_en: ['generous love', 'abundance-line', 'big-hearted'],
  },
  {
    planet1: 'Venus', planet2: 'Jupiter', aspect: 'sextile',
    ko: '사랑과 확장이 부드럽게 협력하는 결이에요. 의식적으로 다가설수록 관계와 미적 기회가 함께 커져요.',
    en: 'Love and expansion cooperate at an easy angle. The more you reach out, the more relationships and aesthetic chances grow alongside.',
    keywords_ko: ['협력적 풍요', '관계의 확장', '의식적 너그러움'],
    keywords_en: ['cooperative abundance', 'expanding relationships', 'chosen generosity'],
  },
  {
    planet1: 'Venus', planet2: 'Jupiter', aspect: 'square',
    ko: '사랑과 확장이 어긋난 각도로 맞물려, 너그러움이 과해지거나 자기 가치를 놓치는 결이에요. 사랑 안에서 적정선을 찾는 학습.',
    en: 'Love and expansion grind at a tight angle — generosity can overshoot or self-worth can slip. The lesson is finding the right scale of giving inside love.',
    keywords_ko: ['과한 너그러움', '가치의 학습', '적정선 찾기'],
    keywords_en: ['overgiving tension', 'worth lesson', 'right-size love'],
  },
  {
    planet1: 'Venus', planet2: 'Jupiter', aspect: 'trine',
    ko: '사랑과 확장이 같은 결로 흐르는 결이에요. 너그러움과 매력이 자연스럽게 어울려, 행운과 사랑이 타고난 짝이 돼요.',
    en: 'Love and expansion flow in the same key. Generosity and charm marry naturally — luck and affection become a born pair.',
    keywords_ko: ['타고난 너그러움', '사랑의 행운', '풍요의 흐름'],
    keywords_en: ['innate generosity', 'love-luck', 'abundance flow'],
  },
  {
    planet1: 'Venus', planet2: 'Jupiter', aspect: 'opposition',
    ko: '사랑과 확장이 마주 서서 균형을 찾는 결이에요. 자기 가치와 너그러움 사이를 오가며, 관계 안에서 적정한 풍요를 배워요.',
    en: 'Love and expansion face each other across the chart. Between self-worth and generosity, you learn right-sized abundance through relating.',
    keywords_ko: ['가치-너그러움 균형', '풍요의 학습', '관계의 적정선'],
    keywords_en: ['worth-generosity balance', 'abundance lesson', 'right-scaled relating'],
  },

  // ---------- Venus × Saturn (love × responsibility) ----------
  {
    planet1: 'Venus', planet2: 'Saturn', aspect: 'conjunction',
    ko: '사랑의 별과 책임의 별이 한 자리에서 만나는 결이에요. 애정이 진지하고 무게가 있어, 관계가 약속과 구조 위에서 자라요.',
    en: 'Love and responsibility meet in the same spot. Affection is serious and weighted — relationships grow on top of commitment and structure.',
    keywords_ko: ['진지한 사랑', '약속의 결', '책임 있는 관계'],
    keywords_en: ['serious love', 'commitment-line', 'responsible relating'],
  },
  {
    planet1: 'Venus', planet2: 'Saturn', aspect: 'sextile',
    ko: '사랑과 책임이 부드럽게 협력하는 결이에요. 꾸준한 관계 노력이 단단한 애정을 만들어, 시간이 갈수록 깊어져요.',
    en: 'Love and responsibility cooperate at an easy angle. Steady relational effort builds sturdy affection — depth grows with time.',
    keywords_ko: ['꾸준한 사랑', '단단한 관계', '시간의 결'],
    keywords_en: ['steady love', 'sturdy relating', 'time-deepens'],
  },
  {
    planet1: 'Venus', planet2: 'Saturn', aspect: 'square',
    ko: '사랑과 책임이 어긋난 각도로 맞물려, 애정 안에서 거리감이나 두려움이 자주 일어나는 결이에요. 사랑의 무게를 안고 가는 학습.',
    en: 'Love and responsibility grind at a tight angle — distance or fear often surfaces inside affection. The lesson is carrying love’s weight without freezing.',
    keywords_ko: ['사랑의 거리감', '두려움의 결', '무게의 학습'],
    keywords_en: ['love-distance', 'fear-line', 'weight lesson'],
  },
  {
    planet1: 'Venus', planet2: 'Saturn', aspect: 'trine',
    ko: '사랑과 책임이 같은 결로 흐르는 결이에요. 진지함과 매력이 자연스럽게 어울려, 신뢰가 타고난 강점이 돼요.',
    en: 'Love and responsibility flow in the same key. Seriousness and charm marry naturally — trust becomes an innate strength.',
    keywords_ko: ['타고난 신뢰', '진지한 매력', '구조 있는 사랑'],
    keywords_en: ['innate trust', 'serious charm', 'structured love'],
  },
  {
    planet1: 'Venus', planet2: 'Saturn', aspect: 'opposition',
    ko: '사랑과 책임이 마주 서서 균형을 찾는 결이에요. 애정과 약속 사이를 오가며, 관계의 거울 안에서 통합점을 배워요.',
    en: 'Love and responsibility face each other across the chart. Between affection and commitment, the relational mirror teaches an integration point.',
    keywords_ko: ['애정-약속 균형', '거울의 학습', '관계의 무게'],
    keywords_en: ['love-commitment balance', 'mirror lesson', 'weight of relating'],
  },

  // ---------- Venus × Pluto (love × transformation) ----------
  {
    planet1: 'Venus', planet2: 'Pluto', aspect: 'conjunction',
    ko: '사랑의 별과 변용의 별이 한 자리에서 만나는 결이에요. 애정이 깊고 강해, 관계가 변화의 거울로 작동해요.',
    en: 'Love and transformation meet in the same spot. Affection runs deep and intense — relationships work as mirrors of change.',
    keywords_ko: ['깊은 사랑', '변용의 거울', '강한 끌림'],
    keywords_en: ['deep love', 'transformative mirror', 'magnetic pull'],
  },
  {
    planet1: 'Venus', planet2: 'Pluto', aspect: 'sextile',
    ko: '사랑과 변용이 부드럽게 협력하는 결이에요. 의식적으로 깊어질 때 관계가 진짜 변화를 만들어요.',
    en: 'Love and transformation cooperate at an easy angle. When you choose to go deeper, relationships create real change.',
    keywords_ko: ['협력적 깊이', '변화의 기회', '의식적 친밀감'],
    keywords_en: ['cooperative depth', 'change-chance', 'chosen intimacy'],
  },
  {
    planet1: 'Venus', planet2: 'Pluto', aspect: 'square',
    ko: '사랑과 변용이 어긋난 각도로 맞물려, 관계 안에서 강한 끌림과 통제의 긴장이 함께 일어나는 결이에요. 사랑의 힘을 다루는 학습.',
    en: 'Love and transformation grind at a tight angle — intense attraction and control tension show up together in love. The lesson is learning to hold love’s power.',
    keywords_ko: ['끌림과 통제', '강도의 학습', '관계의 변용'],
    keywords_en: ['attraction-control', 'intensity lesson', 'love-transformation'],
  },
  {
    planet1: 'Venus', planet2: 'Pluto', aspect: 'trine',
    ko: '사랑과 변용이 같은 결로 흐르는 결이에요. 깊이와 매력이 자연스럽게 어울려, 변화시키는 사랑이 타고난 강점이 돼요.',
    en: 'Love and transformation flow in the same key. Depth and charm marry naturally — transformative love becomes an innate strength.',
    keywords_ko: ['타고난 깊이', '변용의 사랑', '강한 결'],
    keywords_en: ['innate depth', 'transformative love', 'magnetic-line'],
  },
  {
    planet1: 'Venus', planet2: 'Pluto', aspect: 'opposition',
    ko: '사랑과 변용이 마주 서서 균형을 찾는 결이에요. 깊은 끌림과 자기 보호 사이를 오가며, 관계의 거울 안에서 통합점을 배워요.',
    en: 'Love and transformation face each other across the chart. Between deep pull and self-protection, the relational mirror teaches integration.',
    keywords_ko: ['깊이-보호 균형', '거울의 학습', '변용의 사랑'],
    keywords_en: ['depth-protection balance', 'mirror lesson', 'transformative relating'],
  },

  // ============================================================
  // MEDIUM PRIORITY — Mars × {Jupiter, Saturn, Pluto}
  // ============================================================

  // ---------- Mars × Jupiter (drive × expansion) ----------
  {
    planet1: 'Mars', planet2: 'Jupiter', aspect: 'conjunction',
    ko: '추진의 별과 확장의 별이 한 자리에서 만나는 결이에요. 행동이 크고 너그러워, 한번 움직이면 멀리 가요.',
    en: 'Drive and expansion meet in the same spot. Action runs big and generous — once you move, the range carries far.',
    keywords_ko: ['큰 추진력', '너그러운 행동', '멀리 가는 결'],
    keywords_en: ['big drive', 'generous action', 'far-reaching move'],
  },
  {
    planet1: 'Mars', planet2: 'Jupiter', aspect: 'sextile',
    ko: '추진과 확장이 부드럽게 협력하는 결이에요. 의식적으로 행동하면 기회와 시야가 함께 커져요.',
    en: 'Drive and expansion cooperate at an easy angle. When you choose to move, opportunity and perspective grow with you.',
    keywords_ko: ['협력적 추진', '시야의 결', '의식적 확장'],
    keywords_en: ['cooperative drive', 'perspective-line', 'chosen growth'],
  },
  {
    planet1: 'Mars', planet2: 'Jupiter', aspect: 'square',
    ko: '추진과 확장이 어긋난 각도로 맞물려, 너무 크게 벌이거나 무리하기 쉬운 결이에요. 행동의 적정 스케일을 배우는 학습.',
    en: 'Drive and expansion grind at a tight angle — easy to start too big or overstretch. The lesson is finding right-sized action.',
    keywords_ko: ['과한 추진', '오버 스케일', '적정선 학습'],
    keywords_en: ['overdrive', 'oversized action', 'right-scale lesson'],
  },
  {
    planet1: 'Mars', planet2: 'Jupiter', aspect: 'trine',
    ko: '추진과 확장이 같은 강물에 흐르는 결이에요. 행동과 시야가 자연스럽게 어울려, 자신 있게 멀리 가는 강점이 돼요.',
    en: 'Drive and expansion ride the same current. Action and vision align easily — confident, far-reaching movement becomes innate strength.',
    keywords_ko: ['타고난 자신감', '확장의 행동', '멀리 가는 결'],
    keywords_en: ['innate confidence', 'expansive action', 'far-reaching-line'],
  },
  {
    planet1: 'Mars', planet2: 'Jupiter', aspect: 'opposition',
    ko: '추진과 확장이 마주 서서 균형을 찾는 결이에요. 내 행동과 큰 그림 사이를 오가며, 관계의 거울 안에서 적정한 도전을 배워요.',
    en: 'Drive and expansion face each other across the chart. Between action and the bigger vision, the relational mirror teaches right-sized challenge.',
    keywords_ko: ['행동-비전 균형', '거울의 학습', '적정한 도전'],
    keywords_en: ['action-vision balance', 'mirror lesson', 'right-sized challenge'],
  },

  // ---------- Mars × Saturn (drive × responsibility) ----------
  {
    planet1: 'Mars', planet2: 'Saturn', aspect: 'conjunction',
    ko: '추진의 별과 책임의 별이 한 자리에서 만나는 결이에요. 행동이 신중하고 단단해, 한번 시작하면 끝까지 가는 결.',
    en: 'Drive and responsibility meet in the same spot. Action runs careful and sturdy — once started, it tends to finish.',
    keywords_ko: ['단단한 추진력', '끝까지 가는 결', '신중한 행동'],
    keywords_en: ['sturdy drive', 'finishing-line', 'careful action'],
  },
  {
    planet1: 'Mars', planet2: 'Saturn', aspect: 'sextile',
    ko: '추진과 책임이 부드럽게 협력하는 결이에요. 의식적으로 구조를 만들면 행동이 오래 지속되는 강점이 살아나요.',
    en: 'Drive and responsibility cooperate at an easy angle. When you build structure consciously, action sustains over the long run.',
    keywords_ko: ['지속하는 추진', '구조의 협력', '꾸준한 결'],
    keywords_en: ['sustained drive', 'structural cooperation', 'steady-line'],
  },
  {
    planet1: 'Mars', planet2: 'Saturn', aspect: 'square',
    ko: '추진과 책임이 어긋난 각도로 맞물려, 행동에 자주 제동이 걸리는 결이에요. 좌절과 인내 사이에서 단련되는 학습.',
    en: 'Drive and responsibility grind at a tight angle — action keeps hitting brakes. The lesson is steeling through frustration into patience.',
    keywords_ko: ['행동의 제동', '좌절의 결', '인내의 단련'],
    keywords_en: ['braked action', 'frustration-line', 'forged patience'],
  },
  {
    planet1: 'Mars', planet2: 'Saturn', aspect: 'trine',
    ko: '추진과 책임이 같은 결로 흐르는 결이에요. 행동과 구조가 자연스럽게 어울려, 꾸준함이 타고난 강점이 돼요.',
    en: 'Drive and responsibility flow in the same key. Action and structure marry naturally — endurance becomes an innate strength.',
    keywords_ko: ['타고난 꾸준함', '구조 있는 행동', '지속의 결'],
    keywords_en: ['innate endurance', 'structured action', 'sustaining-line'],
  },
  {
    planet1: 'Mars', planet2: 'Saturn', aspect: 'opposition',
    ko: '추진과 책임이 마주 서서 균형을 찾는 결이에요. 내 행동과 외부의 한계 사이를 오가며, 관계 안에서 인내와 도전의 통합점을 배워요.',
    en: 'Drive and responsibility face each other across the chart. Between your push and outside limits, relating teaches the balance of patience and challenge.',
    keywords_ko: ['추진-한계 균형', '거울의 학습', '인내의 결'],
    keywords_en: ['drive-limit balance', 'mirror lesson', 'patience-line'],
  },

  // ---------- Mars × Pluto (drive × transformation) ----------
  {
    planet1: 'Mars', planet2: 'Pluto', aspect: 'conjunction',
    ko: '추진의 별과 변용의 별이 한 자리에서 만나는 결이에요. 행동의 강도가 깊고 강해, 움직임이 큰 변화를 만들어요.',
    en: 'Drive and transformation meet in the same spot. Action runs deep and intense — movement creates real change.',
    keywords_ko: ['강한 추진력', '변용의 행동', '깊은 강도'],
    keywords_en: ['intense drive', 'transformative action', 'deep force'],
  },
  {
    planet1: 'Mars', planet2: 'Pluto', aspect: 'sextile',
    ko: '추진과 변용이 부드럽게 협력하는 결이에요. 의식적으로 행동할 때 변화의 깊이가 살아나요.',
    en: 'Drive and transformation cooperate at an easy angle. When you choose to act, depth of change comes alive.',
    keywords_ko: ['협력적 강도', '변화의 행동', '의식적 깊이'],
    keywords_en: ['cooperative force', 'change-action', 'chosen depth'],
  },
  {
    planet1: 'Mars', planet2: 'Pluto', aspect: 'square',
    ko: '추진과 변용이 어긋난 각도로 맞물려, 행동에 강한 압박과 통제 욕구가 따라오는 결이에요. 힘을 적절히 쓰는 학습.',
    en: 'Drive and transformation grind at a tight angle — action carries strong pressure and a wish to control. The lesson is wielding power well.',
    keywords_ko: ['강한 압박', '통제의 결', '힘의 학습'],
    keywords_en: ['heavy pressure', 'control-line', 'power lesson'],
  },
  {
    planet1: 'Mars', planet2: 'Pluto', aspect: 'trine',
    ko: '추진과 변용이 같은 결로 흐르는 결이에요. 행동과 깊이가 자연스럽게 어울려, 변화시키는 힘이 타고난 강점이 돼요.',
    en: 'Drive and transformation flow in the same key. Action and depth marry naturally — transformative power becomes an innate strength.',
    keywords_ko: ['타고난 강도', '변용의 결', '깊은 행동'],
    keywords_en: ['innate intensity', 'transformative-line', 'deep action'],
  },
  {
    planet1: 'Mars', planet2: 'Pluto', aspect: 'opposition',
    ko: '추진과 변용이 마주 서서 균형을 찾는 결이에요. 내 행동과 깊은 변화 사이를 오가며, 관계의 거울 안에서 힘의 통합을 배워요.',
    en: 'Drive and transformation face each other across the chart. Between action and deep change, the relational mirror teaches integration of power.',
    keywords_ko: ['추진-깊이 균형', '거울의 학습', '힘의 통합'],
    keywords_en: ['drive-depth balance', 'mirror lesson', 'power integration'],
  },

  // ============================================================
  // MEDIUM PRIORITY — Saturn × {Uranus, Neptune, Pluto}
  // (generational/structural pairs)
  // ============================================================

  // ---------- Saturn × Uranus (structure × innovation) ----------
  {
    planet1: 'Saturn', planet2: 'Uranus', aspect: 'conjunction',
    ko: '책임의 별과 혁신의 별이 한 자리에서 만나는 결이에요. 구조와 자유가 한 몸으로 움직여, 옛 틀과 새 길을 동시에 짊어져요.',
    en: 'Responsibility and innovation meet in the same spot. Structure and freedom move as one body — you carry both the old form and the new path.',
    keywords_ko: ['구조-혁신 융합', '옛 틀과 새 길', '체계 있는 자유'],
    keywords_en: ['structure-innovation fusion', 'old-form new-path', 'structured freedom'],
  },
  {
    planet1: 'Saturn', planet2: 'Uranus', aspect: 'sextile',
    ko: '책임과 혁신이 부드럽게 협력하는 결이에요. 의식적으로 새 것을 시도할 때 구조가 안전하게 지지해줘요.',
    en: 'Responsibility and innovation cooperate at an easy angle. When you choose to try the new, structure safely backs it.',
    keywords_ko: ['협력적 변화', '안전한 시도', '구조-혁신 흐름'],
    keywords_en: ['cooperative change', 'safe experiment', 'structure-innovation flow'],
  },
  {
    planet1: 'Saturn', planet2: 'Uranus', aspect: 'square',
    ko: '책임과 혁신이 어긋난 각도로 맞물려, 구조와 자유 사이의 긴장이 강한 결이에요. 옛 것을 부수고 새 길을 내는 학습.',
    en: 'Responsibility and innovation grind at a tight angle — strong tension between structure and freedom. The lesson is breaking the old to open the new.',
    keywords_ko: ['구조-자유 긴장', '돌파의 결', '체계 갱신'],
    keywords_en: ['structure-freedom tension', 'breakthrough-line', 'system update'],
  },
  {
    planet1: 'Saturn', planet2: 'Uranus', aspect: 'trine',
    ko: '책임과 혁신이 같은 결로 흐르는 결이에요. 구조 안에서 자유를 다루는 감각이 타고난 강점이 돼요.',
    en: 'Responsibility and innovation flow in the same key. Holding freedom within structure becomes an innate strength.',
    keywords_ko: ['타고난 균형 감각', '구조 안의 자유', '체계적 혁신'],
    keywords_en: ['innate balance', 'freedom-in-structure', 'systemic innovation'],
  },
  {
    planet1: 'Saturn', planet2: 'Uranus', aspect: 'opposition',
    ko: '책임과 혁신이 마주 서서 균형을 찾는 결이에요. 옛 질서와 새 흐름 사이를 오가며, 관계 안에서 통합점을 배워요.',
    en: 'Responsibility and innovation face each other across the chart. Between the old order and the new current, relating teaches the meeting point.',
    keywords_ko: ['질서-변화 균형', '거울의 학습', '통합의 결'],
    keywords_en: ['order-change balance', 'mirror lesson', 'integration-line'],
  },

  // ---------- Saturn × Neptune (structure × dissolution) ----------
  {
    planet1: 'Saturn', planet2: 'Neptune', aspect: 'conjunction',
    ko: '책임의 별과 꿈의 별이 한 자리에서 만나는 결이에요. 구조와 직관이 한 몸으로 움직여, 현실에 영감을 짓는 결.',
    en: 'Responsibility and dream meet in the same spot. Structure and intuition move as one body — building inspiration into reality.',
    keywords_ko: ['구조 있는 꿈', '현실의 영감', '직관과 책임'],
    keywords_en: ['structured dream', 'grounded inspiration', 'intuition-with-duty'],
  },
  {
    planet1: 'Saturn', planet2: 'Neptune', aspect: 'sextile',
    ko: '책임과 꿈이 부드럽게 협력하는 결이에요. 의식적으로 비전을 짚을 때 구조가 그것을 받쳐줘요.',
    en: 'Responsibility and dream cooperate at an easy angle. When you actively name the vision, structure holds it up.',
    keywords_ko: ['협력적 비전', '꿈의 구조화', '의식적 영감'],
    keywords_en: ['cooperative vision', 'structuring dreams', 'chosen inspiration'],
  },
  {
    planet1: 'Saturn', planet2: 'Neptune', aspect: 'square',
    ko: '책임과 꿈이 어긋난 각도로 맞물려, 현실과 이상 사이의 갈등이 강한 결이에요. 환상을 다루며 구조를 짓는 학습.',
    en: 'Responsibility and dream grind at a tight angle — strong tension between reality and ideal. The lesson is building structure while handling illusion.',
    keywords_ko: ['현실-이상 긴장', '환상의 학습', '구조 짓기'],
    keywords_en: ['reality-ideal tension', 'illusion lesson', 'structure-building'],
  },
  {
    planet1: 'Saturn', planet2: 'Neptune', aspect: 'trine',
    ko: '책임과 꿈이 같은 결로 흐르는 결이에요. 비전과 구조가 자연스럽게 어울려, 현실에 영감을 짓는 강점이 돼요.',
    en: 'Responsibility and dream flow in the same key. Vision and structure marry naturally — grounding inspiration becomes an innate strength.',
    keywords_ko: ['타고난 비전 실현', '꿈의 구조', '영감의 결'],
    keywords_en: ['innate manifestation', 'dream-structure', 'inspiration-line'],
  },
  {
    planet1: 'Saturn', planet2: 'Neptune', aspect: 'opposition',
    ko: '책임과 꿈이 마주 서서 균형을 찾는 결이에요. 현실과 이상 사이를 오가며, 관계의 거울 안에서 통합점을 배워요.',
    en: 'Responsibility and dream face each other across the chart. Between reality and ideal, the relational mirror teaches an integration point.',
    keywords_ko: ['현실-이상 균형', '거울의 학습', '통합의 결'],
    keywords_en: ['reality-ideal balance', 'mirror lesson', 'integration-line'],
  },

  // ---------- Saturn × Pluto (structure × transformation) ----------
  {
    planet1: 'Saturn', planet2: 'Pluto', aspect: 'conjunction',
    ko: '책임의 별과 변용의 별이 한 자리에서 만나는 결이에요. 구조와 깊이가 한 몸이 되어, 큰 변화를 짓는 무게의 결.',
    en: 'Responsibility and transformation meet in the same spot. Structure and depth fuse — a weighted line that builds large change.',
    keywords_ko: ['무게 있는 변화', '구조의 변용', '깊은 책임'],
    keywords_en: ['weighted change', 'structural transformation', 'deep responsibility'],
  },
  {
    planet1: 'Saturn', planet2: 'Pluto', aspect: 'sextile',
    ko: '책임과 변용이 부드럽게 협력하는 결이에요. 의식적으로 깊어질 때 구조가 변화를 안전하게 담아줘요.',
    en: 'Responsibility and transformation cooperate at an easy angle. When you choose depth, structure safely holds the change.',
    keywords_ko: ['협력적 변용', '구조 안의 깊이', '의식적 변화'],
    keywords_en: ['cooperative transformation', 'depth-in-structure', 'chosen change'],
  },
  {
    planet1: 'Saturn', planet2: 'Pluto', aspect: 'square',
    ko: '책임과 변용이 어긋난 각도로 맞물려, 옛 구조와 깊은 변화 사이의 압박이 강한 결이에요. 권력과 인내를 함께 단련하는 학습.',
    en: 'Responsibility and transformation grind at a tight angle — strong pressure between old structure and deep change. The lesson is forging power and patience together.',
    keywords_ko: ['구조-변용 압박', '권력의 학습', '단련의 결'],
    keywords_en: ['structure-change pressure', 'power lesson', 'forging-line'],
  },
  {
    planet1: 'Saturn', planet2: 'Pluto', aspect: 'trine',
    ko: '책임과 변용이 같은 결로 흐르는 결이에요. 깊이와 구조가 자연스럽게 어울려, 큰 변화를 견디고 짓는 강점이 돼요.',
    en: 'Responsibility and transformation flow in the same key. Depth and structure marry naturally — enduring and building big change becomes an innate strength.',
    keywords_ko: ['타고난 견딤', '깊은 구조', '변용의 결'],
    keywords_en: ['innate endurance', 'deep structure', 'transformation-line'],
  },
  {
    planet1: 'Saturn', planet2: 'Pluto', aspect: 'opposition',
    ko: '책임과 변용이 마주 서서 균형을 찾는 결이에요. 옛 구조와 깊은 변화 사이를 오가며, 관계의 거울 안에서 권력의 통합을 배워요.',
    en: 'Responsibility and transformation face each other across the chart. Between old structure and deep change, the relational mirror teaches the integration of power.',
    keywords_ko: ['구조-변용 균형', '거울의 학습', '권력의 통합'],
    keywords_en: ['structure-change balance', 'mirror lesson', 'power integration'],
  },

  // ============================================================
  // MEDIUM PRIORITY — Jupiter × {Saturn, Pluto}
  // ============================================================

  // ---------- Jupiter × Saturn (expansion × responsibility) ----------
  {
    planet1: 'Jupiter', planet2: 'Saturn', aspect: 'conjunction',
    ko: '확장의 별과 책임의 별이 한 자리에서 만나는 결이에요. 큰 그림과 구조가 한 몸으로 움직여, 장기적인 빌드의 결을 입어요.',
    en: 'Expansion and responsibility meet in the same spot. Big vision and structure fuse — a long-build line where growth and grounding move together.',
    keywords_ko: ['장기적 빌드', '구조 있는 확장', '큰 그림과 무게'],
    keywords_en: ['long-build', 'structured growth', 'vision-with-weight'],
  },
  {
    planet1: 'Jupiter', planet2: 'Saturn', aspect: 'sextile',
    ko: '확장과 책임이 부드럽게 협력하는 결이에요. 의식적으로 시야를 키우면 구조가 그것을 단단히 받쳐줘요.',
    en: 'Expansion and responsibility cooperate at an easy angle. When you actively grow perspective, structure firmly backs it.',
    keywords_ko: ['협력적 빌드', '시야-구조 흐름', '의식적 확장'],
    keywords_en: ['cooperative build', 'vision-structure flow', 'chosen growth'],
  },
  {
    planet1: 'Jupiter', planet2: 'Saturn', aspect: 'square',
    ko: '확장과 책임이 어긋난 각도로 맞물려, 성장의 야망과 현실의 한계가 부딪치는 결이에요. 적정한 스케일을 배우는 학습.',
    en: 'Expansion and responsibility grind at a tight angle — growth-ambition meets real limits. The lesson is right-sizing the ambition.',
    keywords_ko: ['야망-한계 긴장', '스케일 학습', '인내의 결'],
    keywords_en: ['ambition-limit tension', 'scale lesson', 'patience-line'],
  },
  {
    planet1: 'Jupiter', planet2: 'Saturn', aspect: 'trine',
    ko: '확장과 책임이 같은 결로 흐르는 결이에요. 시야와 구조가 자연스럽게 어울려, 꾸준히 큰 그림을 짓는 강점이 돼요.',
    en: 'Expansion and responsibility flow in the same key. Vision and structure marry naturally — steadily building the big picture becomes an innate strength.',
    keywords_ko: ['타고난 빌드', '시야의 구조', '꾸준한 확장'],
    keywords_en: ['innate building', 'structured vision', 'steady growth'],
  },
  {
    planet1: 'Jupiter', planet2: 'Saturn', aspect: 'opposition',
    ko: '확장과 책임이 마주 서서 균형을 찾는 결이에요. 야망과 현실 사이를 오가며, 관계의 거울 안에서 적정한 빌드의 통합점을 배워요.',
    en: 'Expansion and responsibility face each other across the chart. Between ambition and reality, the relational mirror teaches a right-sized integration.',
    keywords_ko: ['야망-현실 균형', '거울의 학습', '빌드의 통합'],
    keywords_en: ['ambition-reality balance', 'mirror lesson', 'build integration'],
  },

  // ---------- Jupiter × Pluto (expansion × transformation) ----------
  {
    planet1: 'Jupiter', planet2: 'Pluto', aspect: 'conjunction',
    ko: '확장의 별과 변용의 별이 한 자리에서 만나는 결이에요. 큰 그림과 깊은 변화가 한 몸이 되어, 강한 신념의 결을 입어요.',
    en: 'Expansion and transformation meet in the same spot. Big vision and deep change fuse — a strong-belief line that reshapes the field.',
    keywords_ko: ['강한 신념', '큰 변용', '깊은 확장'],
    keywords_en: ['strong conviction', 'large transformation', 'deep growth'],
  },
  {
    planet1: 'Jupiter', planet2: 'Pluto', aspect: 'sextile',
    ko: '확장과 변용이 부드럽게 협력하는 결이에요. 의식적으로 깊이 들어갈 때 큰 그림이 살아나요.',
    en: 'Expansion and transformation cooperate at an easy angle. When you choose to go deeper, the big picture comes alive.',
    keywords_ko: ['협력적 깊이', '의식적 변용', '큰 그림의 결'],
    keywords_en: ['cooperative depth', 'chosen transformation', 'big-picture-line'],
  },
  {
    planet1: 'Jupiter', planet2: 'Pluto', aspect: 'square',
    ko: '확장과 변용이 어긋난 각도로 맞물려, 신념의 강도와 통제 욕구가 부딪치는 결이에요. 힘을 적정한 신념으로 다루는 학습.',
    en: 'Expansion and transformation grind at a tight angle — belief-intensity meets control. The lesson is wielding power with right-sized conviction.',
    keywords_ko: ['신념-통제 긴장', '힘의 학습', '강도의 결'],
    keywords_en: ['belief-control tension', 'power lesson', 'intensity-line'],
  },
  {
    planet1: 'Jupiter', planet2: 'Pluto', aspect: 'trine',
    ko: '확장과 변용이 같은 결로 흐르는 결이에요. 시야와 깊이가 자연스럽게 어울려, 큰 변화를 짓는 신념이 타고난 강점이 돼요.',
    en: 'Expansion and transformation flow in the same key. Vision and depth marry naturally — conviction that builds large change becomes an innate strength.',
    keywords_ko: ['타고난 신념', '큰 변용의 결', '깊은 시야'],
    keywords_en: ['innate conviction', 'large-change-line', 'deep vision'],
  },
  {
    planet1: 'Jupiter', planet2: 'Pluto', aspect: 'opposition',
    ko: '확장과 변용이 마주 서서 균형을 찾는 결이에요. 큰 그림과 깊은 변화 사이를 오가며, 관계의 거울 안에서 통합점을 배워요.',
    en: 'Expansion and transformation face each other across the chart. Between big vision and deep change, the relational mirror teaches an integration point.',
    keywords_ko: ['시야-깊이 균형', '거울의 학습', '신념의 통합'],
    keywords_en: ['vision-depth balance', 'mirror lesson', 'conviction integration'],
  },
]

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

// ------------------------------------------------------------
// Aspect × Pair lookup helpers
// ------------------------------------------------------------

function isAspectPairPlanet(name: AstroPlanetName): name is AspectPairPlanet {
  return name !== 'Ascendant'
}

function planetOrderIndex(planet: AspectPairPlanet): number {
  const idx = PLANET_ORDER.indexOf(planet)
  return idx === -1 ? Number.MAX_SAFE_INTEGER : idx
}

/**
 * Find a pair-aware aspect interpretation. Lookup is order-agnostic:
 * passing (Sun, Moon) and (Moon, Sun) returns the same entry.
 *
 * Returns null when the requested combination isn't covered by the
 * curated dictionary — callers should fall back to the generic
 * `getAspectInterpretation` line in that case.
 */
export function findAspectPairEntry(
  planetA: AstroPlanetName,
  planetB: AstroPlanetName,
  aspect: AspectKind,
): AspectPairEntry | null {
  if (!isAspectPairPlanet(planetA) || !isAspectPairPlanet(planetB)) return null
  if (planetA === planetB) return null

  // Canonical order: planet whose index in PLANET_ORDER is lower goes first.
  const [p1, p2] =
    planetOrderIndex(planetA) <= planetOrderIndex(planetB)
      ? [planetA, planetB]
      : [planetB, planetA]

  return (
    ASPECT_PAIR_DICTIONARY.find(
      (entry) =>
        entry.planet1 === p1 && entry.planet2 === p2 && entry.aspect === aspect,
    ) ?? null
  )
}

/**
 * Convenience accessor that returns a localized prose string, falling
 * back to the generic aspect line when the specific pair isn't in the
 * dictionary.
 */
export function getAspectPairInterpretation(
  planetA: AstroPlanetName,
  planetB: AstroPlanetName,
  aspect: AspectKind,
  language: 'ko' | 'en' = 'ko',
): string {
  const entry = findAspectPairEntry(planetA, planetB, aspect)
  if (entry) {
    return language === 'ko' ? entry.ko : entry.en
  }
  return getAspectInterpretation(aspect, language)
}

/**
 * Lookup keywords for a pair-aware aspect. Returns null when not covered.
 */
export function getAspectPairKeywords(
  planetA: AstroPlanetName,
  planetB: AstroPlanetName,
  aspect: AspectKind,
  language: 'ko' | 'en' = 'ko',
): readonly string[] | null {
  const entry = findAspectPairEntry(planetA, planetB, aspect)
  if (!entry) return null
  return language === 'ko' ? entry.keywords_ko : entry.keywords_en
}

/**
 * List all aspect entries that involve a given planet (both positions).
 */
export function listAspectPairEntriesForPlanet(
  planet: AstroPlanetName,
): AspectPairEntry[] {
  if (!isAspectPairPlanet(planet)) return []
  return ASPECT_PAIR_DICTIONARY.filter(
    (entry) => entry.planet1 === planet || entry.planet2 === planet,
  )
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
