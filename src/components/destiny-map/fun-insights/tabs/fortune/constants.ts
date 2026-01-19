// src/components/destiny-map/fun-insights/tabs/fortune/constants.ts

import type { DayMasterTrait, DaeunStemInterpretation, JupiterHouseDetail, SaturnHouseDetail } from './types';

export const dayMasterFortuneTraits: Record<string, DayMasterTrait> = {
  "갑": {
    trait: "새로운 시작을 좋아하는 리더형",
    traitEn: "Leader type who loves new beginnings",
    strength: "도전적인 기운이 들어올 때 가장 빛나요",
    strengthEn: "Shine brightest when challenging energy arrives",
    caution: "너무 앞서 나가면 고립될 수 있어요",
    cautionEn: "Going too far ahead may lead to isolation"
  },
  "을": {
    trait: "유연하게 적응하는 조화형",
    traitEn: "Flexible harmonizer type",
    strength: "변화의 흐름을 타면서 성장해요",
    strengthEn: "Grow while riding waves of change",
    caution: "남에게 맞추다 자신을 잃을 수 있어요",
    cautionEn: "May lose yourself while accommodating others"
  },
  "병": {
    trait: "열정적으로 표현하는 태양형",
    traitEn: "Passionate expressive sun type",
    strength: "주목받을 기회가 올 때 적극 나서세요",
    strengthEn: "Step forward actively when spotlight opportunities come",
    caution: "지나친 열정이 주변을 태울 수 있어요",
    cautionEn: "Excessive passion may burn those around you"
  },
  "정": {
    trait: "집중력 있는 깊은 사색형",
    traitEn: "Focused deep thinker type",
    strength: "한 가지에 집중할 때 빛나요",
    strengthEn: "Shine when focusing on one thing",
    caution: "너무 좁게 보면 큰 그림을 놓쳐요",
    cautionEn: "Looking too narrowly misses the big picture"
  },
  "무": {
    trait: "안정을 주는 듬직한 산형",
    traitEn: "Reliable mountain type giving stability",
    strength: "기반을 다지는 시기에 강해요",
    strengthEn: "Strong during foundation-building periods",
    caution: "너무 고집부리면 기회를 놓쳐요",
    cautionEn: "Too much stubbornness misses opportunities"
  },
  "기": {
    trait: "섬세하게 기르는 정원사형",
    traitEn: "Delicate gardener type",
    strength: "꾸준히 가꾸면 결실이 와요",
    strengthEn: "Consistent nurturing brings fruition",
    caution: "너무 작은 것에 매달리면 지쳐요",
    cautionEn: "Clinging to small things leads to exhaustion"
  },
  "경": {
    trait: "결단력 있는 강한 전사형",
    traitEn: "Decisive strong warrior type",
    strength: "결정을 내려야 할 때 빛나요",
    strengthEn: "Shine when decisions need to be made",
    caution: "너무 날카로우면 관계가 상해요",
    cautionEn: "Too sharp edges hurt relationships"
  },
  "신": {
    trait: "예리한 완벽주의자형",
    traitEn: "Sharp perfectionist type",
    strength: "디테일을 살릴 기회에 강해요",
    strengthEn: "Strong in opportunities requiring detail",
    caution: "너무 까다로우면 지치고 외로워져요",
    cautionEn: "Too picky leads to exhaustion and loneliness"
  },
  "임": {
    trait: "깊고 넓은 바다형 지혜자",
    traitEn: "Deep, wide ocean-type sage",
    strength: "큰 흐름을 읽을 때 빛나요",
    strengthEn: "Shine when reading large flows",
    caution: "방향 없이 흘러가면 표류해요",
    cautionEn: "Flowing without direction leads to drifting"
  },
  "계": {
    trait: "맑고 직관적인 영감형",
    traitEn: "Clear intuitive inspiration type",
    strength: "직감을 따를 때 기회가 와요",
    strengthEn: "Opportunities come when following intuition",
    caution: "현실을 무시하면 뜬구름이 돼요",
    cautionEn: "Ignoring reality makes you float away"
  }
};

export const daeunStemInterpretations: Record<string, DaeunStemInterpretation> = {
  "갑": { ko: "성장과 시작의 대운", en: "Daeun of growth and beginnings", energy: "새 출발, 도전, 확장", energyEn: "New start, challenge, expansion" },
  "을": { ko: "적응과 조화의 대운", en: "Daeun of adaptation and harmony", energy: "유연함, 관계, 협력", energyEn: "Flexibility, relationships, cooperation" },
  "병": { ko: "빛나고 표현하는 대운", en: "Daeun of shining and expression", energy: "존재감, 열정, 주목", energyEn: "Presence, passion, attention" },
  "정": { ko: "집중하고 심화하는 대운", en: "Daeun of focus and deepening", energy: "통찰, 집중, 깊이", energyEn: "Insight, focus, depth" },
  "무": { ko: "기반을 다지는 대운", en: "Daeun of building foundation", energy: "안정, 신뢰, 기반", energyEn: "Stability, trust, foundation" },
  "기": { ko: "가꾸고 키우는 대운", en: "Daeun of nurturing and growing", energy: "성장, 양육, 실용", energyEn: "Growth, nurturing, practicality" },
  "경": { ko: "결단하고 성취하는 대운", en: "Daeun of decision and achievement", energy: "결단, 정의, 수확", energyEn: "Decision, justice, harvest" },
  "신": { ko: "정제하고 다듬는 대운", en: "Daeun of refinement", energy: "완성, 디테일, 가치", energyEn: "Completion, detail, value" },
  "임": { ko: "지혜가 깊어지는 대운", en: "Daeun of deepening wisdom", energy: "지혜, 흐름, 영향력", energyEn: "Wisdom, flow, influence" },
  "계": { ko: "영감이 흐르는 대운", en: "Daeun of flowing inspiration", energy: "직관, 영성, 감수성", energyEn: "Intuition, spirituality, sensitivity" }
};

export const jupiterHouseDetails: Record<number, JupiterHouseDetail> = {
  1: {
    ko: "목성이 1하우스에 있어서 당신의 존재 자체가 행운을 끌어당겨요. 자신감을 가지고 앞으로 나서면 좋은 일이 생겨요.",
    en: "Jupiter in 1st house means your very presence attracts luck. Good things happen when you step forward with confidence.",
    action: "자기 PR, 새로운 시작, 리더십 발휘",
    actionEn: "Self-promotion, new beginnings, exercising leadership"
  },
  2: {
    ko: "목성이 2하우스에서 재물운을 가져다줘요. 돈을 벌 기회가 많고, 자신의 가치를 인정받기 좋은 배치예요.",
    en: "Jupiter in 2nd house brings wealth fortune. Many money-making opportunities and a good placement for having your worth recognized.",
    action: "재테크, 투자, 가치 있는 것에 집중",
    actionEn: "Financial planning, investment, focusing on valuable things"
  },
  3: {
    ko: "목성이 3하우스에서 소통과 학습에 행운을 가져다줘요. 말이 잘 통하고, 배움에서 기회가 와요.",
    en: "Jupiter in 3rd house brings luck in communication and learning. Words connect well and opportunities come through learning.",
    action: "글쓰기, 강연, 네트워킹, 단기 학습",
    actionEn: "Writing, speaking, networking, short-term studies"
  },
  4: {
    ko: "목성이 4하우스에서 가정과 부동산에 축복을 줘요. 가족에게 기쁜 일이 생기거나 집 관련 행운이 있어요.",
    en: "Jupiter in 4th house blesses home and real estate. Joyful family events or luck related to housing.",
    action: "가족 시간, 부동산, 내면의 안정 찾기",
    actionEn: "Family time, real estate, finding inner stability"
  },
  5: {
    ko: "목성이 5하우스에서 연애와 창작에 행운을 가져다줘요! 사랑이 찾아오거나 창의적인 활동에서 인정받아요.",
    en: "Jupiter in 5th house brings luck in romance and creativity! Love may come or you'll be recognized for creative work.",
    action: "연애, 취미, 창작 활동, 즐거운 일",
    actionEn: "Dating, hobbies, creative activities, enjoyable things"
  },
  6: {
    ko: "목성이 6하우스에서 일상과 건강에 축복을 줘요. 일이 순조롭고 건강이 개선되는 시기예요.",
    en: "Jupiter in 6th house blesses daily life and health. Work flows smoothly and health improves.",
    action: "업무 개선, 건강 관리, 루틴 정비",
    actionEn: "Work improvement, health management, routine optimization"
  },
  7: {
    ko: "목성이 7하우스에서 관계에 행운을 가져다줘요! 좋은 파트너를 만나거나 협력이 잘 풀려요.",
    en: "Jupiter in 7th house brings luck in relationships! Meet good partners or partnerships work out well.",
    action: "파트너십, 계약, 협업, 결혼",
    actionEn: "Partnerships, contracts, collaboration, marriage"
  },
  8: {
    ko: "목성이 8하우스에서 깊은 변화와 공유 자원에 축복을 줘요. 투자 수익이나 유산, 보험 관련 행운이 있어요.",
    en: "Jupiter in 8th house blesses transformation and shared resources. Luck with investment returns, inheritance, or insurance.",
    action: "투자, 심리치유, 깊은 관계, 변화 수용",
    actionEn: "Investment, psychological healing, deep relationships, embracing change"
  },
  9: {
    ko: "목성이 9하우스(본래 자리)에서 최고의 힘을 발휘해요! 해외, 학업, 철학에서 큰 행운이 와요.",
    en: "Jupiter in 9th house (its home) exerts maximum power! Great luck in overseas, academics, philosophy.",
    action: "해외 진출, 고등 교육, 여행, 출판",
    actionEn: "Going abroad, higher education, travel, publishing"
  },
  10: {
    ko: "목성이 10하우스에서 커리어에 축복을 줘요! 승진, 성공, 사회적 인정이 올 가능성이 높아요.",
    en: "Jupiter in 10th house blesses career! High chance of promotion, success, social recognition.",
    action: "커리어 도전, 승진 준비, 대외 활동",
    actionEn: "Career challenges, preparing for promotion, public activities"
  },
  11: {
    ko: "목성이 11하우스에서 인맥과 희망에 행운을 줘요! 좋은 친구를 만나고 꿈이 이루어져요.",
    en: "Jupiter in 11th house brings luck in connections and hopes! Meet good friends and dreams come true.",
    action: "네트워킹, 커뮤니티, 미래 계획",
    actionEn: "Networking, community, future planning"
  },
  12: {
    ko: "목성이 12하우스에서 영적인 보호를 줘요. 숨겨진 도움이 오고, 직관이 강해지는 시기예요.",
    en: "Jupiter in 12th house gives spiritual protection. Hidden help comes and intuition strengthens.",
    action: "명상, 봉사, 직관 따르기, 휴식",
    actionEn: "Meditation, service, following intuition, rest"
  }
};

export const saturnHouseDetails: Record<number, SaturnHouseDetail> = {
  1: {
    ko: "토성이 1하우스에서 자아를 시험해요. 스스로를 증명해야 하는 압박이 있지만, 극복하면 강한 개인 브랜드가 만들어져요.",
    en: "Saturn in 1st house tests your self. Pressure to prove yourself, but overcoming it builds a strong personal brand.",
    lesson: "자기 신뢰를 쌓고, 책임감 있는 모습을 보여주세요",
    lessonEn: "Build self-trust and show responsible behavior"
  },
  2: {
    ko: "토성이 2하우스에서 재물을 시험해요. 돈이 천천히 오지만 한번 오면 단단해요. 재정 관리 능력이 성장해요.",
    en: "Saturn in 2nd house tests finances. Money comes slowly but solidly. Financial management skills grow.",
    lesson: "절약과 장기적 재테크에 집중하세요",
    lessonEn: "Focus on saving and long-term financial planning"
  },
  3: {
    ko: "토성이 3하우스에서 소통을 시험해요. 말이 무거워질 수 있지만, 정확하고 신뢰받는 커뮤니케이터가 돼요.",
    en: "Saturn in 3rd house tests communication. Words may feel heavy, but you become an accurate, trusted communicator.",
    lesson: "신중하게 말하고, 글쓰기/학습에 꾸준히 투자하세요",
    lessonEn: "Speak carefully, invest consistently in writing/learning"
  },
  4: {
    ko: "토성이 4하우스에서 가정을 시험해요. 가족 책임이 무겁거나 집 관련 어려움이 있지만, 단단한 기반이 만들어져요.",
    en: "Saturn in 4th house tests home. Heavy family responsibilities or housing difficulties, but solid foundation is built.",
    lesson: "가족 문제를 회피하지 말고 정면 돌파하세요",
    lessonEn: "Don't avoid family issues, face them directly"
  },
  5: {
    ko: "토성이 5하우스에서 창조와 연애를 시험해요. 즐거움에 대한 죄책감이 있을 수 있지만, 성숙한 사랑과 예술이 가능해요.",
    en: "Saturn in 5th house tests creativity and romance. May feel guilt about pleasure, but mature love and art are possible.",
    lesson: "진지하게 사랑하고, 창작에 규율을 적용하세요",
    lessonEn: "Love seriously, apply discipline to creative work"
  },
  6: {
    ko: "토성이 6하우스에서 건강과 일상을 시험해요. 업무 과부하나 건강 이슈가 있을 수 있지만, 극복하면 최고의 전문가가 돼요.",
    en: "Saturn in 6th house tests health and routine. Work overload or health issues possible, but overcoming makes you top expert.",
    lesson: "건강 관리를 습관화하고, 일에 규율을 세우세요",
    lessonEn: "Make health management a habit, establish work discipline"
  },
  7: {
    ko: "토성이 7하우스에서 관계를 시험해요. 파트너십에 어려움이 있거나 혼자 책임지는 느낌이 들지만, 성숙한 관계를 배워요.",
    en: "Saturn in 7th house tests relationships. Partnership difficulties or feeling alone in responsibility, but learn mature relating.",
    lesson: "관계에서 성실하고, 경계를 명확히 하세요",
    lessonEn: "Be faithful in relationships, set clear boundaries"
  },
  8: {
    ko: "토성이 8하우스에서 변화와 친밀감을 시험해요. 깊은 두려움과 마주해야 하지만, 진정한 변환이 일어나요.",
    en: "Saturn in 8th house tests transformation and intimacy. Must face deep fears, but true transformation occurs.",
    lesson: "두려움을 회피하지 말고, 깊은 변화를 받아들이세요",
    lessonEn: "Don't avoid fear, embrace deep change"
  },
  9: {
    ko: "토성이 9하우스에서 신념과 확장을 시험해요. 믿음이 흔들리거나 해외 계획이 지연될 수 있지만, 진짜 지혜가 생겨요.",
    en: "Saturn in 9th house tests beliefs and expansion. Faith may waver or overseas plans delay, but real wisdom develops.",
    lesson: "진짜 믿을 수 있는 것을 찾고, 계획적으로 확장하세요",
    lessonEn: "Find what's truly believable, expand systematically"
  },
  10: {
    ko: "토성이 10하우스(본래 자리)에서 커리어를 시험해요. 성공의 압박이 크지만, 진정한 권위와 성취가 가능해요.",
    en: "Saturn in 10th house (its home) tests career. Great pressure for success, but true authority and achievement possible.",
    lesson: "꾸준히 실적을 쌓고, 장기적 커리어를 계획하세요",
    lessonEn: "Build consistent results, plan long-term career"
  },
  11: {
    ko: "토성이 11하우스에서 우정과 희망을 시험해요. 친구가 적거나 꿈이 멀게 느껴질 수 있지만, 진정한 동료를 얻어요.",
    en: "Saturn in 11th house tests friendship and hopes. Few friends or dreams feel distant, but gain true companions.",
    lesson: "양보다 질의 인간관계를 추구하세요",
    lessonEn: "Pursue quality over quantity in relationships"
  },
  12: {
    ko: "토성이 12하우스에서 무의식과 영성을 시험해요. 숨겨진 두려움이 있지만, 이를 극복하면 깊은 영적 성장이 가능해요.",
    en: "Saturn in 12th house tests unconscious and spirituality. Hidden fears exist, but overcoming them enables deep spiritual growth.",
    lesson: "혼자만의 시간을 두려워하지 말고, 내면을 정리하세요",
    lessonEn: "Don't fear alone time, organize your inner world"
  }
};

export const STEM_TO_ELEMENT: Record<string, string> = {
  "甲": "wood", "乙": "wood", "갑": "wood", "을": "wood",
  "丙": "fire", "丁": "fire", "병": "fire", "정": "fire",
  "戊": "earth", "己": "earth", "무": "earth", "기": "earth",
  "庚": "metal", "辛": "metal", "경": "metal", "신": "metal",
  "壬": "water", "癸": "water", "임": "water", "계": "water",
};

export const DM_ELEMENTS: Record<string, string> = {
  "갑": "wood", "을": "wood", "병": "fire", "정": "fire",
  "무": "earth", "기": "earth", "경": "metal", "신": "metal",
  "임": "water", "계": "water"
};

export const ELEMENT_GENERATES: Record<string, string> = {
  "wood": "fire", "fire": "earth", "earth": "metal", "metal": "water", "water": "wood"
};

export const ELEMENT_CONTROLS: Record<string, string> = {
  "wood": "earth", "fire": "metal", "earth": "water", "metal": "wood", "water": "fire"
};

export const ELEMENT_CONTROLS_ME: Record<string, string> = {
  "wood": "metal", "fire": "water", "earth": "wood", "metal": "fire", "water": "earth"
};

export const ELEMENT_GENERATES_ME: Record<string, string> = {
  "wood": "water", "fire": "wood", "earth": "fire", "metal": "earth", "water": "metal"
};
