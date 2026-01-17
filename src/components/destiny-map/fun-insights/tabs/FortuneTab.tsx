"use client";

import type { TabProps } from './types';
import { getMatrixAnalysis, getFullMatrixAnalysis, getTimingOverlayAnalysis, getRelationAspectAnalysis, getAdvancedAnalysisResult, getExtraPointAnalysis } from '../analyzers';
import { elementTraits } from '../data';

interface CurrentFlow {
  emoji: string;
  title: string;
  flow: string;
  advice: string;
}

interface PlanetData {
  name?: string;
  sign?: string;
  house?: number;
}

interface DaeunData {
  current?: boolean;
  isCurrent?: boolean;
  ganji?: string;
  name?: string;
  stem?: { name?: string };
  branch?: { name?: string };
  startAge?: number;
  age?: number;
}

interface UnseAnnualData {
  year?: number;
  ganji?: string;
  stem?: { name?: string; element?: string };
  branch?: { name?: string };
  element?: string;
}

interface UnseMonthlyData {
  month?: number;
  ganji?: string;
  stem?: { name?: string; element?: string };
  branch?: { name?: string };
  element?: string;
}

interface UnseIljinData {
  day?: number;
  ganji?: string;
  stem?: { name?: string; element?: string };
  branch?: { name?: string };
  element?: string;
}

// SajuData와 별도로 정의 (확장이 아닌 독립 타입으로 캐스팅에 사용)
interface SajuDataExtended {
  dayMaster?: { name?: string; element?: string; heavenlyStem?: string };
  pillars?: { day?: { heavenlyStem?: string | { name?: string } } };
  fourPillars?: { day?: { heavenlyStem?: string } };
  daeun?: DaeunData[];
  bigFortune?: DaeunData[];
  unse?: {
    annual?: UnseAnnualData[];
    monthly?: UnseMonthlyData[];
    iljin?: UnseIljinData[];
  };
}

// 헬퍼: 행성 별자리 찾기
function findPlanetSign(planets: PlanetData[] | undefined, name: string): string | null {
  if (!Array.isArray(planets)) return null;
  const planet = planets.find((p) => p.name?.toLowerCase()?.includes(name.toLowerCase()));
  return planet?.sign ?? null;
}

// 헬퍼: 행성 하우스 찾기
function findPlanetHouse(planets: PlanetData[] | undefined, name: string): number | null {
  if (!Array.isArray(planets)) return null;
  const planet = planets.find((p) => p.name?.toLowerCase()?.includes(name.toLowerCase()));
  return planet?.house ?? null;
}

// 일간 구체적 해석 - 현재 운세와의 관계
const dayMasterFortuneTraits: Record<string, { trait: string; traitEn: string; strength: string; strengthEn: string; caution: string; cautionEn: string }> = {
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

// 대운 천간별 해석
const daeunStemInterpretations: Record<string, { ko: string; en: string; energy: string; energyEn: string }> = {
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

// 목성 하우스별 상세 해석
const jupiterHouseDetails: Record<number, { ko: string; en: string; action: string; actionEn: string }> = {
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

// 토성 하우스별 상세 해석
const saturnHouseDetails: Record<number, { ko: string; en: string; lesson: string; lessonEn: string }> = {
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

// 일간-대운 관계 해석
function getDaeunRelation(dayMaster: string, daeunStem: string, isKo: boolean): { relation: string; message: string; advice: string } {
  const dmElements: Record<string, string> = {
    "갑": "wood", "을": "wood", "병": "fire", "정": "fire",
    "무": "earth", "기": "earth", "경": "metal", "신": "metal",
    "임": "water", "계": "water"
  };

  const myEl = dmElements[dayMaster] || "";
  const daeunEl = dmElements[daeunStem] || "";

  if (!myEl || !daeunEl) {
    return { relation: "", message: "", advice: "" };
  }

  // 같은 오행
  if (myEl === daeunEl) {
    return {
      relation: isKo ? "비겁운 (동료)" : "Peer Period",
      message: isKo ? "나와 같은 에너지가 강해지는 시기예요. 경쟁도 있지만 동료와 함께 성장할 수 있어요." : "Period when same energy strengthens. Competition exists but you can grow with peers.",
      advice: isKo ? "독립심과 협력 사이 균형을 찾으세요. 지나친 고집은 금물이에요." : "Find balance between independence and cooperation. Avoid excessive stubbornness."
    };
  }

  // 내가 생해주는 오행 (식상)
  const generates: Record<string, string> = { "wood": "fire", "fire": "earth", "earth": "metal", "metal": "water", "water": "wood" };
  if (generates[myEl] === daeunEl) {
    return {
      relation: isKo ? "식상운 (표현)" : "Expression Period",
      message: isKo ? "당신의 재능과 아이디어가 꽃피는 시기예요! 표현하고 창조하세요." : "Time for your talents and ideas to bloom! Express and create.",
      advice: isKo ? "적극적으로 표현하세요. 숨기면 아까운 시기예요." : "Express actively. It's a waste to hide during this time."
    };
  }

  // 내가 극하는 오행 (재성)
  const controls: Record<string, string> = { "wood": "earth", "fire": "metal", "earth": "water", "metal": "wood", "water": "fire" };
  if (controls[myEl] === daeunEl) {
    return {
      relation: isKo ? "재성운 (재물)" : "Wealth Period",
      message: isKo ? "재물과 관련된 움직임이 활발해지는 시기예요. 돈이 들어오지만 나가기도 해요." : "Active money-related movements. Money comes in but also goes out.",
      advice: isKo ? "돈을 벌 기회가 오지만 무리한 투자는 피하세요." : "Money-making opportunities come, but avoid risky investments."
    };
  }

  // 나를 극하는 오행 (관성)
  const controlsMe: Record<string, string> = { "wood": "metal", "fire": "water", "earth": "wood", "metal": "fire", "water": "earth" };
  if (controlsMe[myEl] === daeunEl) {
    return {
      relation: isKo ? "관성운 (시험)" : "Test Period",
      message: isKo ? "시험대에 오르는 시기예요. 책임과 압박이 있지만 실력이 증명돼요." : "Time to be tested. Responsibility and pressure exist, but skills are proven.",
      advice: isKo ? "버티면 인정받아요. 도망가면 나중에 더 힘들어요." : "Endure and be recognized. Running away makes things harder later."
    };
  }

  // 나를 생해주는 오행 (인성)
  const generatesMe: Record<string, string> = { "wood": "water", "fire": "wood", "earth": "fire", "metal": "earth", "water": "metal" };
  if (generatesMe[myEl] === daeunEl) {
    return {
      relation: isKo ? "인성운 (도움)" : "Support Period",
      message: isKo ? "귀인이 나타나고 도움을 받는 시기예요. 배움과 성장의 기운이 강해요." : "Benefactors appear and help comes. Strong energy for learning and growth.",
      advice: isKo ? "멘토를 찾고 배우세요. 받은 도움은 나중에 갚으면 돼요." : "Find mentors and learn. Return received help later."
    };
  }

  return { relation: "", message: "", advice: "" };
}

export default function FortuneTab({ saju, astro, lang, isKo, data }: TabProps) {
  const currentFlow = data.currentFlow as CurrentFlow | null;
  const dayElement = data.dayElement as string | undefined;
  const matrixAnalysis = getMatrixAnalysis(saju ?? undefined, astro ?? undefined, lang);

  // 새로운 레이어 분석 (Layer 4, 5, 7, 10)
  const timingOverlays = getTimingOverlayAnalysis(saju ?? undefined, astro ?? undefined, lang);
  const relationAspects = getRelationAspectAnalysis(saju ?? undefined, astro ?? undefined, lang);
  const advancedAnalysis = getAdvancedAnalysisResult(saju ?? undefined, astro ?? undefined, lang);
  const extraPoints = getExtraPointAnalysis(saju ?? undefined, astro ?? undefined, lang);

  // 직접 사주 데이터 추출
  const sajuExt = saju as SajuDataExtended | undefined;
  const dayMaster = sajuExt?.dayMaster?.name ?? sajuExt?.dayMaster?.heavenlyStem ?? sajuExt?.fourPillars?.day?.heavenlyStem ?? "";
  const dayMasterElement = sajuExt?.dayMaster?.element ?? "";
  const daeun = sajuExt?.daeun ?? sajuExt?.bigFortune;
  const currentDaeun = Array.isArray(daeun) ? daeun.find((d) => d.current || d.isCurrent) : null;

  // 점성술 데이터 추출
  const planets = astro?.planets as PlanetData[] | undefined;
  const jupiterSign = findPlanetSign(planets, 'jupiter');
  const jupiterHouse = findPlanetHouse(planets, 'jupiter');
  const saturnSign = findPlanetSign(planets, 'saturn');
  const saturnHouse = findPlanetHouse(planets, 'saturn');

  // 올해 운세
  const yearFortune = (() => {
    if (!sajuExt?.unse?.annual || !Array.isArray(sajuExt.unse.annual) || sajuExt.unse.annual.length === 0) {
      return null;
    }

    const currentYear = new Date().getFullYear();
    const thisYearUnse = sajuExt.unse.annual.find((a) => a.year === currentYear) ?? sajuExt.unse.annual[0];
    if (!thisYearUnse) return null;

    const ganji = thisYearUnse.ganji || `${thisYearUnse.stem?.name || ""}${thisYearUnse.branch?.name || ""}`;

    const getStemElement = (gj: string): string => {
      if (!gj) return "";
      const firstChar = gj.charAt(0);
      const stemToElement: Record<string, string> = {
        "甲": "wood", "乙": "wood", "갑": "wood", "을": "wood",
        "丙": "fire", "丁": "fire", "병": "fire", "정": "fire",
        "戊": "earth", "己": "earth", "무": "earth", "기": "earth",
        "庚": "metal", "辛": "metal", "경": "metal", "신": "metal",
        "壬": "water", "癸": "water", "임": "water", "계": "water",
      };
      return stemToElement[firstChar] || "";
    };

    const element = thisYearUnse.stem?.element || thisYearUnse.element || getStemElement(ganji);

    const getYearFortune = (el: string): { theme: string; desc: string; advice: string; emoji: string } => {
      const e = el.toLowerCase();
      if (e.includes("목") || e === "wood") return {
        theme: isKo ? "성장과 시작의 해 🌱" : "Year of Growth & Beginnings 🌱",
        desc: isKo
          ? "올해는 새싹이 땅을 뚫고 올라오는 해예요. 무언가를 시작하기에 최적의 타이밍이에요."
          : "This year is like a sprout breaking through soil. Perfect timing to start something.",
        advice: isKo
          ? "새로운 것을 시작하세요. 배움, 프로젝트, 관계... 뭐든 좋아요! 멈춰있으면 오히려 답답해지는 해예요."
          : "Start something new. Learning, projects, relationships... anything! Staying still will frustrate you this year.",
        emoji: "🌱"
      };
      if (e.includes("화") || e === "fire") return {
        theme: isKo ? "열정과 표현의 해 🔥" : "Year of Passion & Expression 🔥",
        desc: isKo
          ? "올해는 당신이 빛나는 해예요. 존재감을 드러내고 적극적으로 움직일 때 기회가 와요."
          : "This year is when you shine. Opportunities come when you show presence and move actively.",
        advice: isKo
          ? "숨지 말고 드러내세요! 자기 PR, 네트워킹, 발표... 밖으로 나갈수록 기회가 와요."
          : "Don't hide—show yourself! Self-PR, networking, presentations... more outside = more opportunities.",
        emoji: "🔥"
      };
      if (e.includes("토") || e === "earth") return {
        theme: isKo ? "안정과 기반의 해 🏔️" : "Year of Stability & Foundation 🏔️",
        desc: isKo
          ? "올해는 기반을 다지는 해예요. 화려하진 않지만 단단해지는 시간이에요."
          : "This year is for building foundation. Not flashy, but you become solid.",
        advice: isKo
          ? "급하게 가지 마세요. 기반을 다지고, 관계를 정리하고, 내실을 채우세요."
          : "Don't rush. Build foundation, organize relationships, strengthen your core.",
        emoji: "🏔️"
      };
      if (e.includes("금") || e === "metal") return {
        theme: isKo ? "결실과 정리의 해 ⚔️" : "Year of Harvest & Organization ⚔️",
        desc: isKo
          ? "올해는 수확의 해예요. 지금까지 쌓아온 것들이 결과로 나타나요."
          : "This year is harvest time. What you've built shows results.",
        advice: isKo
          ? "지금까지 한 것들이 결실을 맺어요. 마무리, 수확, 정산의 시기예요."
          : "Your past efforts bear fruit. Time for finishing, harvesting, settling.",
        emoji: "⚔️"
      };
      if (e.includes("수") || e === "water") return {
        theme: isKo ? "준비와 지혜의 해 💧" : "Year of Preparation & Wisdom 💧",
        desc: isKo
          ? "올해는 물처럼 깊어지는 해예요. 겉으로 드러나진 않지만 내면이 성장해요."
          : "This year you deepen like water. Not visible outside, but inner growth happens.",
        advice: isKo
          ? "겉으로 드러나진 않지만 내면이 깊어지는 해예요. 공부, 계획, 성찰의 시기예요."
          : "Inner depth grows though not visible. Study, plan, reflect... preparation time for next leap.",
        emoji: "💧"
      };
      const dayElTrait = dayElement ? elementTraits[dayElement] : undefined;
      return {
        theme: isKo ? "변화와 적응의 해 🔄" : "Year of Change & Adaptation 🔄",
        desc: isKo
          ? `당신의 ${dayElTrait?.ko || ""} 에너지와 올해의 기운이 만나 새로운 변화가 시작돼요.`
          : `Your ${dayElTrait?.en || ""} energy meets this year's energy, starting new changes.`,
        advice: isKo
          ? "올해는 변화의 흐름을 받아들이는 것이 핵심이에요. 유연하게 대응하세요."
          : "The key this year is accepting the flow of change. Respond flexibly to situations.",
        emoji: "🔄"
      };
    };

    const dmName = data.dayMasterName || "";
    const getYearRelation = (dm: string, yearEl: string) => {
      const dmElements: Record<string, string> = {
        "갑": "wood", "을": "wood", "병": "fire", "정": "fire",
        "무": "earth", "기": "earth", "경": "metal", "신": "metal",
        "임": "water", "계": "water"
      };
      const myEl = dmElements[dm] || "";
      const el = yearEl.toLowerCase();

      if (myEl === el || el.includes(myEl)) {
        return {
          relation: isKo ? "비겁(동료)의 해" : "Year of Peers",
          impact: isKo ? "같은 에너지가 만나는 해예요. 경쟁도 있지만 동료와 함께 성장할 수 있어요." : "Same energy meets. Competition exists, but you can grow with peers.",
          focus: isKo ? "협력과 경쟁의 균형" : "Balance cooperation and competition",
          caution: isKo ? "과도한 경쟁심, 지나친 고집" : "Excessive competitiveness, stubbornness"
        };
      }

      // 간단한 관계 분석
      const relations: Record<string, { relation: string; impact: string; focus: string; caution: string }> = {
        "wood-fire": { relation: isKo ? "식상(표현)의 해" : "Year of Expression", impact: isKo ? "당신의 아이디어가 꽃피는 해예요." : "Your ideas bloom this year.", focus: isKo ? "창의적 표현, 재능 발휘" : "Creative expression", caution: isKo ? "에너지 과소비" : "Energy overuse" },
        "fire-earth": { relation: isKo ? "식상(표현)의 해" : "Year of Expression", impact: isKo ? "열정이 결과물로 이어져요." : "Passion leads to results.", focus: isKo ? "프로젝트 완성" : "Complete projects", caution: isKo ? "과욕" : "Greed" },
        "wood-earth": { relation: isKo ? "재성(재물)의 해" : "Year of Wealth", impact: isKo ? "돈과 관련된 움직임이 많아요." : "Many money-related movements.", focus: isKo ? "재테크, 사업" : "Finance, business", caution: isKo ? "무리한 투자" : "Reckless investment" },
        "fire-metal": { relation: isKo ? "재성(재물)의 해" : "Year of Wealth", impact: isKo ? "열정이 돈으로 이어질 수 있어요." : "Passion can lead to money.", focus: isKo ? "수익 창출" : "Generate income", caution: isKo ? "급한 투자" : "Hasty investment" },
        "wood-metal": { relation: isKo ? "관성(시험)의 해" : "Year of Tests", impact: isKo ? "시험대에 오르는 해예요." : "A year of tests.", focus: isKo ? "실력 증명" : "Prove skills", caution: isKo ? "과도한 스트레스" : "Excessive stress" },
        "fire-water": { relation: isKo ? "관성(시험)의 해" : "Year of Tests", impact: isKo ? "열정이 시험받는 해예요." : "Passion is tested.", focus: isKo ? "인내, 실력 향상" : "Patience, skill improvement", caution: isKo ? "감정적 대응" : "Emotional reactions" },
        "fire-wood": { relation: isKo ? "인성(도움)의 해" : "Year of Support", impact: isKo ? "귀인이 나타나는 해예요." : "Helpful people appear.", focus: isKo ? "공부, 멘토 찾기" : "Study, find mentors", caution: isKo ? "의존, 게으름" : "Dependence, laziness" },
        "earth-fire": { relation: isKo ? "인성(도움)의 해" : "Year of Support", impact: isKo ? "따뜻한 지원을 받는 해예요." : "Receive warm support.", focus: isKo ? "관계 강화" : "Strengthen relationships", caution: isKo ? "수동적 태도" : "Passive attitude" }
      };

      const targetEl = el.includes("wood") ? "wood" : el.includes("fire") ? "fire" : el.includes("earth") ? "earth" : el.includes("metal") ? "metal" : "water";
      const key = `${myEl}-${targetEl}`;

      return relations[key] || {
        relation: isKo ? "변화의 해" : "Year of Change",
        impact: isKo ? "새로운 에너지가 들어오는 해예요." : "New energy enters this year.",
        focus: isKo ? "유연하게 대응하기" : "Respond flexibly",
        caution: isKo ? "과도한 변화" : "Excessive change"
      };
    };

    return {
      year: currentYear,
      ganji,
      fortune: getYearFortune(element),
      relation: getYearRelation(dmName, element)
    };
  })();

  // 이달 운세
  const monthFortune = (() => {
    if (!sajuExt?.unse?.monthly || !Array.isArray(sajuExt.unse.monthly) || sajuExt.unse.monthly.length === 0) {
      return null;
    }

    const currentMonth = new Date().getMonth() + 1;
    const thisMonthUnse = sajuExt.unse.monthly.find((m) => m.month === currentMonth) ?? sajuExt.unse.monthly[0];
    if (!thisMonthUnse) return null;

    const ganji = thisMonthUnse.ganji || `${thisMonthUnse.stem?.name || ""}${thisMonthUnse.branch?.name || ""}`;

    const getStemElement = (gj: string): string => {
      if (!gj) return "";
      const firstChar = gj.charAt(0);
      const stemToElement: Record<string, string> = {
        "甲": "wood", "乙": "wood", "갑": "wood", "을": "wood",
        "丙": "fire", "丁": "fire", "병": "fire", "정": "fire",
        "戊": "earth", "己": "earth", "무": "earth", "기": "earth",
        "庚": "metal", "辛": "metal", "경": "metal", "신": "metal",
        "壬": "water", "癸": "water", "임": "water", "계": "water",
      };
      return stemToElement[firstChar] || "";
    };

    const element = thisMonthUnse.stem?.element || thisMonthUnse.element || getStemElement(ganji);

    const getMonthFortune = (el: string): { theme: string; advice: string; emoji: string } => {
      const e = el.toLowerCase();
      if (e.includes("목") || e.includes("wood")) return {
        theme: isKo ? "활동적인 달" : "Active Month",
        advice: isKo ? "움직이세요! 새로운 만남, 시작, 도전이 좋아요." : "Get moving! New meetings, beginnings, challenges are good.",
        emoji: "🌿"
      };
      if (e.includes("화") || e.includes("fire")) return {
        theme: isKo ? "주목받는 달" : "Spotlight Month",
        advice: isKo ? "사람들 앞에 서세요. 당신의 매력이 빛나는 달이에요." : "Step in front of people. Your charm shines this month.",
        emoji: "✨"
      };
      if (e.includes("토") || e.includes("earth")) return {
        theme: isKo ? "안정의 달" : "Stable Month",
        advice: isKo ? "무리하지 마세요. 기존 것을 유지하고 다지는 게 좋아요." : "Don't overdo it. Maintain and strengthen what you have.",
        emoji: "🏠"
      };
      if (e.includes("금") || e.includes("metal")) return {
        theme: isKo ? "정리의 달" : "Organizing Month",
        advice: isKo ? "결단이 필요해요. 미루던 일을 끝내고 정리하세요." : "Decisions are needed. Finish delayed tasks, organize.",
        emoji: "✂️"
      };
      if (e.includes("수") || e.includes("water")) return {
        theme: isKo ? "충전의 달" : "Recharging Month",
        advice: isKo ? "쉬어가세요. 재충전하고 생각을 정리하기 좋은 때예요." : "Take a break. Good time to recharge and organize thoughts.",
        emoji: "🌙"
      };
      return {
        theme: isKo ? "흐름을 타는 달" : "Flow Month",
        advice: isKo ? "자연스럽게 흘러가세요." : "Go with the natural flow.",
        emoji: "🌊"
      };
    };

    const getMonthDetail = (el: string): { work: string; love: string; money: string; health: string } => {
      const e = el.toLowerCase();
      const monthDetails: Record<string, { work: string; love: string; money: string; health: string }> = {
        "wood": {
          work: isKo ? "새 프로젝트나 도전이 잘 풀려요." : "New projects and challenges go well.",
          love: isKo ? "새로운 만남이 기대돼요." : "New encounters await.",
          money: isKo ? "활동에 집중하세요. 돈은 따라와요." : "Focus on activity. Money follows.",
          health: isKo ? "운동하기 좋은 달이에요." : "Great month for exercise."
        },
        "fire": {
          work: isKo ? "발표나 미팅이 잘 돼요." : "Presentations and meetings go well.",
          love: isKo ? "분위기가 화끈해요." : "The mood is hot.",
          money: isKo ? "소비 욕구가 커져요. 계획적으로." : "Spending desire increases. Plan carefully.",
          health: isKo ? "심장과 혈압 관리하세요." : "Manage heart and blood pressure."
        },
        "earth": {
          work: isKo ? "기존 업무를 안정적으로 처리하세요." : "Handle existing work stably.",
          love: isKo ? "편안한 만남이 좋아요." : "Comfortable meetings are good.",
          money: isKo ? "저축하기 좋은 달이에요." : "Good month for saving.",
          health: isKo ? "소화기 관리하세요." : "Manage digestion."
        },
        "metal": {
          work: isKo ? "결정을 내려야 할 때예요." : "Time to make decisions.",
          love: isKo ? "관계를 정리할 시기예요." : "Time to organize relationships.",
          money: isKo ? "불필요한 지출을 정리하세요." : "Organize unnecessary spending.",
          health: isKo ? "호흡기와 피부를 관리하세요." : "Manage respiratory and skin health."
        },
        "water": {
          work: isKo ? "아이디어를 정리하고 계획을 세우세요." : "Organize ideas and make plans.",
          love: isKo ? "깊은 대화가 관계를 발전시켜요." : "Deep conversation develops relationships.",
          money: isKo ? "재정 상태를 점검하세요." : "Check financial status.",
          health: isKo ? "충분히 쉬세요." : "Rest well."
        }
      };

      const elKey = e.includes("wood") ? "wood" : e.includes("fire") ? "fire" : e.includes("earth") ? "earth" : e.includes("metal") ? "metal" : "water";
      return monthDetails[elKey] || monthDetails["earth"];
    };

    const monthNames = isKo
      ? ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"]
      : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    return {
      month: currentMonth,
      monthName: monthNames[currentMonth - 1],
      ganji,
      fortune: getMonthFortune(element),
      detail: getMonthDetail(element)
    };
  })();

  // 오늘 운세
  const todayFortune = (() => {
    if (!sajuExt?.unse?.iljin || !Array.isArray(sajuExt.unse.iljin) || sajuExt.unse.iljin.length === 0) {
      return null;
    }

    const today = new Date();
    const todayDate = today.getDate();
    const todayIljin = sajuExt.unse.iljin.find((i) => i.day === todayDate) ?? sajuExt.unse.iljin[0];
    if (!todayIljin) return null;

    const ganji = todayIljin.ganji || `${todayIljin.stem?.name || ""}${todayIljin.branch?.name || ""}`;

    const getStemElement = (gj: string): string => {
      if (!gj) return "";
      const firstChar = gj.charAt(0);
      const stemToElement: Record<string, string> = {
        "甲": "wood", "乙": "wood", "갑": "wood", "을": "wood",
        "丙": "fire", "丁": "fire", "병": "fire", "정": "fire",
        "戊": "earth", "己": "earth", "무": "earth", "기": "earth",
        "庚": "metal", "辛": "metal", "경": "metal", "신": "metal",
        "壬": "water", "癸": "water", "임": "water", "계": "water",
      };
      return stemToElement[firstChar] || "";
    };

    const element = todayIljin.stem?.element || todayIljin.element || getStemElement(ganji);

    const getDayFortune = (el: string): { mood: string; tip: string; emoji: string; luckyTime: string } => {
      const e = el.toLowerCase();
      if (e.includes("목") || e.includes("wood")) return {
        mood: isKo ? "활기찬 하루! 새로운 시작 에너지가 넘쳐요." : "Energetic day! Full of new beginning energy.",
        tip: isKo ? "오늘은 적극적으로 움직이세요. 새로운 도전이 좋아요." : "Move actively today. New challenges are good.",
        emoji: "🌱",
        luckyTime: isKo ? "오전 7-9시" : "7-9 AM"
      };
      if (e.includes("화") || e.includes("fire")) return {
        mood: isKo ? "열정적인 하루! 표현하고 빛날 때예요." : "Passionate day! Time to express and shine.",
        tip: isKo ? "숨기지 말고 드러내세요. 당신의 매력이 통해요." : "Don't hide, show yourself. Your charm works.",
        emoji: "🔥",
        luckyTime: isKo ? "오전 11시-오후 1시" : "11 AM - 1 PM"
      };
      if (e.includes("토") || e.includes("earth")) return {
        mood: isKo ? "안정적인 하루! 기존 일을 마무리하기 좋아요." : "Stable day! Good for finishing existing work.",
        tip: isKo ? "급하게 움직이지 마세요. 차분히 정리하는 날이에요." : "Don't move hastily. It's a day for calm organizing.",
        emoji: "🏠",
        luckyTime: isKo ? "오후 1-3시" : "1-3 PM"
      };
      if (e.includes("금") || e.includes("metal")) return {
        mood: isKo ? "결단의 하루! 미루던 걸 끝낼 때예요." : "Day of decision! Time to finish what you've delayed.",
        tip: isKo ? "잘라낼 건 잘라내세요. 깔끔해지면 새 에너지가 와요." : "Cut what needs cutting. Clarity brings new energy.",
        emoji: "✂️",
        luckyTime: isKo ? "오후 3-5시" : "3-5 PM"
      };
      return {
        mood: isKo ? "직관적인 하루! 생각보다 느낌으로 가세요." : "Intuitive day! Go by feeling rather than thinking.",
        tip: isKo ? "물처럼 유연하게 흘러가세요. 억지로 밀어붙이지 마세요." : "Flow like water. Don't force things.",
        emoji: "💧",
        luckyTime: isKo ? "밤 9-11시" : "9-11 PM"
      };
    };

    return {
      ganji,
      fortune: getDayFortune(element)
    };
  })();

  return (
    <div className="space-y-6">
      {/* 운명 에너지 상태 - 핵심 데이터 요약 */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-purple-900/30 border border-purple-500/30 p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">⚡</span>
          <h3 className="text-lg font-bold text-purple-300">
            {isKo ? "지금 내 운명 에너지" : "My Destiny Energy Now"}
          </h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {/* 일간 */}
          {dayMaster && (
            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-center">
              <p className="text-purple-400 text-xs mb-1">{isKo ? "일간 (나)" : "Day Master"}</p>
              <p className="text-xl font-bold text-purple-300">{dayMaster}</p>
              {dayMasterElement && (
                <p className="text-purple-400 text-xs mt-1">{dayMasterElement}</p>
              )}
            </div>
          )}
          {/* 대운 */}
          {currentDaeun && (
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center">
              <p className="text-blue-400 text-xs mb-1">{isKo ? "현재 대운" : "Current Daeun"}</p>
              <p className="text-lg font-bold text-blue-300">
                {currentDaeun.ganji || currentDaeun.name || `${currentDaeun.stem?.name || ""}${currentDaeun.branch?.name || ""}`}
              </p>
              {(currentDaeun.startAge || currentDaeun.age) && (
                <p className="text-blue-400 text-xs mt-1">
                  {currentDaeun.startAge || currentDaeun.age}{isKo ? "세~" : "+"}
                </p>
              )}
            </div>
          )}
          {/* 목성 */}
          {jupiterHouse && (
            <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-center">
              <p className="text-yellow-400 text-xs mb-1">{isKo ? "목성 (행운)" : "Jupiter"}</p>
              <p className="text-lg font-bold text-yellow-300">{jupiterHouse}H</p>
              {jupiterSign && (
                <p className="text-yellow-400 text-xs mt-1">{jupiterSign}</p>
              )}
            </div>
          )}
          {/* 토성 */}
          {saturnHouse && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
              <p className="text-amber-400 text-xs mb-1">{isKo ? "토성 (시험)" : "Saturn"}</p>
              <p className="text-lg font-bold text-amber-300">{saturnHouse}H</p>
              {saturnSign && (
                <p className="text-amber-400 text-xs mt-1">{saturnSign}</p>
              )}
            </div>
          )}
        </div>

        {/* 일간 구체적 해석 */}
        {dayMaster && dayMasterFortuneTraits[dayMaster] && (
          <div className="p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/20 mb-4">
            <p className="text-purple-300 font-bold text-sm mb-2">
              🔮 {isKo ? dayMasterFortuneTraits[dayMaster].trait : dayMasterFortuneTraits[dayMaster].traitEn}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded-lg bg-green-500/10">
                <span className="text-green-400 font-medium">✨ {isKo ? "강점" : "Strength"}</span>
                <p className="text-gray-300 mt-1">
                  {isKo ? dayMasterFortuneTraits[dayMaster].strength : dayMasterFortuneTraits[dayMaster].strengthEn}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-orange-500/10">
                <span className="text-orange-400 font-medium">⚠️ {isKo ? "주의" : "Caution"}</span>
                <p className="text-gray-300 mt-1">
                  {isKo ? dayMasterFortuneTraits[dayMaster].caution : dayMasterFortuneTraits[dayMaster].cautionEn}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 대운 구체적 해석 + 일간-대운 관계 */}
        {currentDaeun && (() => {
          const daeunGanji = currentDaeun.ganji || currentDaeun.name || `${currentDaeun.stem?.name || ""}${currentDaeun.branch?.name || ""}`;
          const daeunStem = daeunGanji ? daeunGanji.charAt(0) : "";
          const daeunInterp = daeunStemInterpretations[daeunStem];
          const relation = dayMaster && daeunStem ? getDaeunRelation(dayMaster, daeunStem, isKo) : null;

          return (
            <div className="p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 mb-4">
              {daeunInterp && (
                <>
                  <p className="text-blue-300 font-bold text-sm mb-2">
                    📅 {isKo ? daeunInterp.ko : daeunInterp.en}
                  </p>
                  <p className="text-gray-400 text-xs mb-3">
                    {isKo ? "에너지: " : "Energy: "}{isKo ? daeunInterp.energy : daeunInterp.energyEn}
                  </p>
                </>
              )}

              {relation && relation.relation && (
                <div className="p-3 rounded-lg bg-gradient-to-r from-cyan-500/10 to-teal-500/10 border border-cyan-500/20">
                  <p className="text-cyan-400 font-bold text-sm mb-1">
                    🔄 {dayMaster} × {daeunStem} = {relation.relation}
                  </p>
                  <p className="text-gray-300 text-sm mb-2">{relation.message}</p>
                  <p className="text-teal-400 text-xs">
                    💡 {relation.advice}
                  </p>
                </div>
              )}
            </div>
          );
        })()}

        {/* 행운/도전 영역 상세 해석 */}
        {(jupiterHouse || saturnHouse) && (
          <div className="space-y-4">
            {/* 목성 - 행운 영역 */}
            {jupiterHouse && jupiterHouseDetails[jupiterHouse] && (
              <div className="p-4 rounded-xl bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20">
                <p className="text-green-400 font-bold text-sm mb-2 flex items-center gap-2">
                  <span>✨</span> {isKo ? `행운이 오는 영역: ${jupiterHouse}하우스` : `Lucky Area: House ${jupiterHouse}`}
                </p>
                <p className="text-gray-200 text-sm leading-relaxed mb-3">
                  {isKo ? jupiterHouseDetails[jupiterHouse].ko : jupiterHouseDetails[jupiterHouse].en}
                </p>
                <div className="p-2 rounded-lg bg-green-500/10">
                  <p className="text-green-300 text-xs">
                    🎯 {isKo ? "추천 활동: " : "Recommended: "}
                    <span className="text-green-200">
                      {isKo ? jupiterHouseDetails[jupiterHouse].action : jupiterHouseDetails[jupiterHouse].actionEn}
                    </span>
                  </p>
                </div>
              </div>
            )}

            {/* 토성 - 시험 영역 */}
            {saturnHouse && saturnHouseDetails[saturnHouse] && (
              <div className="p-4 rounded-xl bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/20">
                <p className="text-orange-400 font-bold text-sm mb-2 flex items-center gap-2">
                  <span>🏋️</span> {isKo ? `시험받는 영역: ${saturnHouse}하우스` : `Testing Area: House ${saturnHouse}`}
                </p>
                <p className="text-gray-200 text-sm leading-relaxed mb-3">
                  {isKo ? saturnHouseDetails[saturnHouse].ko : saturnHouseDetails[saturnHouse].en}
                </p>
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <p className="text-amber-300 text-xs">
                    💪 {isKo ? "극복 방법: " : "How to overcome: "}
                    <span className="text-amber-200">
                      {isKo ? saturnHouseDetails[saturnHouse].lesson : saturnHouseDetails[saturnHouse].lessonEn}
                    </span>
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 지금 내 흐름 (대운 + 세운) */}
      {currentFlow && (
        <div className="rounded-2xl bg-gradient-to-br from-blue-900/30 via-cyan-900/30 to-teal-900/30 border border-blue-500/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">{currentFlow.emoji}</span>
            <h3 className="text-lg font-bold text-blue-300">{currentFlow.title}</h3>
          </div>

          <div className="space-y-3 mb-4">
            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <pre className="text-cyan-200 text-sm whitespace-pre-line font-mono">
                {currentFlow.flow}
              </pre>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-500/10 to-teal-500/10 border border-cyan-500/20">
            <p className="text-sm flex items-start gap-3">
              <span className="text-xl">💡</span>
              <span className="text-cyan-200 leading-relaxed">{currentFlow.advice}</span>
            </p>
          </div>
        </div>
      )}

      {/* 올해 운세 */}
      {yearFortune && (
        <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-fuchsia-900/20 border border-fuchsia-500/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">{yearFortune.fortune.emoji}</span>
            <h3 className="text-lg font-bold text-fuchsia-300">
              {isKo ? `${yearFortune.year}년 운세` : `${yearFortune.year} Fortune`}
            </h3>
            {yearFortune.ganji && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-fuchsia-500/20 text-fuchsia-400">
                {yearFortune.ganji}
              </span>
            )}
            {dayMaster && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400">
                {isKo ? `${dayMaster} 일간` : `Day: ${dayMaster}`}
              </span>
            )}
          </div>

          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/20">
              <p className="text-fuchsia-300 font-bold text-base mb-2">{yearFortune.fortune.theme}</p>
              <p className="text-gray-300 text-sm leading-relaxed mb-2">{yearFortune.fortune.desc}</p>
              <p className="text-fuchsia-200 text-sm">{yearFortune.fortune.advice}</p>
            </div>

            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="text-fuchsia-400 font-bold text-sm mb-2">📌 {yearFortune.relation.relation}</p>
              <p className="text-gray-300 text-sm leading-relaxed mb-3">{yearFortune.relation.impact}</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded-lg bg-fuchsia-500/10">
                  <span className="text-fuchsia-300 font-medium">{isKo ? "집중할 것" : "Focus"}</span>
                  <p className="text-gray-400 mt-1">{yearFortune.relation.focus}</p>
                </div>
                <div className="p-2 rounded-lg bg-red-500/10">
                  <span className="text-red-300 font-medium">{isKo ? "주의할 것" : "Caution"}</span>
                  <p className="text-gray-400 mt-1">{yearFortune.relation.caution}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 이달 운세 */}
      {monthFortune && (
        <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-emerald-900/20 border border-emerald-500/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">{monthFortune.fortune.emoji}</span>
            <h3 className="text-lg font-bold text-emerald-300">
              {isKo ? `${monthFortune.monthName} 운세` : `${monthFortune.monthName} Fortune`}
            </h3>
            {monthFortune.ganji && <span className="text-sm text-gray-400">({monthFortune.ganji})</span>}
          </div>

          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-emerald-300 font-bold text-base mb-2">{monthFortune.fortune.theme}</p>
              <p className="text-gray-300 text-sm leading-relaxed">{monthFortune.fortune.advice}</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <p className="text-emerald-400 font-bold text-xs mb-1 flex items-center gap-1">
                  <span>💼</span> {isKo ? "일/학업" : "Work"}
                </p>
                <p className="text-gray-300 text-xs leading-relaxed">{monthFortune.detail.work}</p>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <p className="text-pink-400 font-bold text-xs mb-1 flex items-center gap-1">
                  <span>💕</span> {isKo ? "연애/관계" : "Love"}
                </p>
                <p className="text-gray-300 text-xs leading-relaxed">{monthFortune.detail.love}</p>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <p className="text-yellow-400 font-bold text-xs mb-1 flex items-center gap-1">
                  <span>💰</span> {isKo ? "재물" : "Money"}
                </p>
                <p className="text-gray-300 text-xs leading-relaxed">{monthFortune.detail.money}</p>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <p className="text-red-400 font-bold text-xs mb-1 flex items-center gap-1">
                  <span>❤️‍🩹</span> {isKo ? "건강" : "Health"}
                </p>
                <p className="text-gray-300 text-xs leading-relaxed">{monthFortune.detail.health}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 오늘 운세 */}
      {todayFortune && (
        <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-indigo-900/20 border border-indigo-500/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">{todayFortune.fortune.emoji}</span>
            <h3 className="text-lg font-bold text-indigo-300">{isKo ? "오늘의 운세" : "Today's Fortune"}</h3>
            {todayFortune.ganji && <span className="text-sm text-gray-400">({todayFortune.ganji})</span>}
          </div>

          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
              <p className="text-indigo-300 font-bold text-sm mb-2">{todayFortune.fortune.mood}</p>
              <p className="text-gray-300 text-sm leading-relaxed">{todayFortune.fortune.tip}</p>
            </div>

            <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
              <p className="text-yellow-300 font-bold text-xs flex items-center gap-2">
                <span>⏰</span> {isKo ? "행운의 시간" : "Lucky Time"}: {todayFortune.fortune.luckyTime}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 12운성-하우스 생명력 사이클 */}
      {matrixAnalysis && matrixAnalysis.lifeCycles.length > 0 && (
        <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-violet-900/20 border border-violet-500/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">🔄</span>
            <h3 className="text-lg font-bold text-violet-300">{isKo ? "생명력 사이클" : "Life Energy Cycle"}</h3>
          </div>

          <p className="text-gray-400 text-sm mb-4">
            {isKo
              ? "12운성과 하우스가 만나 당신의 생명력이 어디에서 어떻게 흐르는지 보여줍니다."
              : "Where your life energy flows based on 12 Life Stages × Houses."}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {matrixAnalysis.lifeCycles.map((cycle, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl"
                style={{
                  backgroundColor: `${cycle.fusion.color}10`,
                  border: `1px solid ${cycle.fusion.color}25`
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{cycle.fusion.icon}</span>
                    <span className="text-sm font-bold" style={{ color: cycle.fusion.color }}>
                      {cycle.stage}
                    </span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-gray-400">
                    {cycle.lifeArea}
                  </span>
                </div>
                <p className="text-sm text-gray-300 mb-1">
                  {isKo ? cycle.fusion.keyword.ko : cycle.fusion.keyword.en}
                </p>
                <p className="text-xs text-gray-500">
                  {isKo ? cycle.stageInfo.ko.split(' - ')[1] : cycle.stageInfo.en.split(' - ')[1]}
                </p>
              </div>
            ))}
          </div>

          {/* 사이클 요약 */}
          <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/20">
            <p className="text-violet-300 font-bold text-sm mb-2">
              {isKo ? "💫 생명력 흐름 요약" : "💫 Life Energy Summary"}
            </p>
            <p className="text-gray-300 text-sm">
              {(() => {
                const highEnergy = matrixAnalysis.lifeCycles.filter(c => c.fusion.score >= 8);
                const lowEnergy = matrixAnalysis.lifeCycles.filter(c => c.fusion.score <= 4);

                if (highEnergy.length >= 2) {
                  return isKo
                    ? `${highEnergy.map(c => c.lifeArea).join(', ')} 영역에서 강한 에너지가 흐르고 있어요!`
                    : `Strong energy flows in ${highEnergy.map(c => c.lifeArea).join(', ')} areas!`;
                } else if (lowEnergy.length >= 2) {
                  return isKo
                    ? `${lowEnergy.map(c => c.lifeArea).join(', ')} 영역은 충전이 필요해요.`
                    : `${lowEnergy.map(c => c.lifeArea).join(', ')} areas need recharging.`;
                }
                return isKo
                  ? "전반적으로 균형 잡힌 에너지 흐름을 보이고 있어요."
                  : "Overall balanced energy flow.";
              })()}
            </p>
          </div>
        </div>
      )}

      {/* Layer 4: 타이밍 오버레이 (대운/세운 × 트랜짓) */}
      {timingOverlays && timingOverlays.length > 0 && (
        <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-cyan-900/20 border border-cyan-500/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">⏰</span>
            <h3 className="text-lg font-bold text-cyan-300">
              {isKo ? "타이밍 오버레이" : "Timing Overlay"}
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400">Layer 4</span>
          </div>

          <p className="text-gray-400 text-sm mb-4">
            {isKo
              ? "대운/세운과 행성 트랜짓이 만나 시간의 결을 보여줍니다."
              : "Where Daeun/Seun meets planetary transits, revealing the texture of time."}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {timingOverlays.map((timing, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl"
                style={{
                  backgroundColor: `${timing.fusion.color}10`,
                  border: `1px solid ${timing.fusion.color}25`
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{timing.fusion.icon}</span>
                    <span className="text-sm font-bold" style={{ color: timing.fusion.color }}>
                      {isKo ? timing.fusion.keyword.ko : timing.fusion.keyword.en}
                    </span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-gray-400">
                    {timing.fusion.score}/10
                  </span>
                </div>
                <p className="text-xs text-gray-400 mb-1">
                  {isKo ? timing.timingInfo.ko : timing.timingInfo.en} × {isKo ? timing.transitInfo.ko : timing.transitInfo.en}
                </p>
                <p className="text-sm text-gray-300">
                  {isKo ? timing.fusion.description.ko : timing.fusion.description.en}
                </p>
                {timing.advice && (
                  <p className="text-xs text-cyan-400 mt-2">💡 {timing.advice}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Layer 5: 관계-애스펙트 (삼합/육합/충 × 애스펙트) */}
      {relationAspects && relationAspects.length > 0 && (
        <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-pink-900/20 border border-pink-500/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">🔗</span>
            <h3 className="text-lg font-bold text-pink-300">
              {isKo ? "관계-애스펙트 융합" : "Relation-Aspect Fusion"}
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-400">Layer 5</span>
          </div>

          <p className="text-gray-400 text-sm mb-4">
            {isKo
              ? "지지 관계(삼합, 육합, 충)와 천체 애스펙트가 만나 에너지 흐름을 보여줍니다."
              : "Branch relations meet planetary aspects, showing energy flow."}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {relationAspects.map((rel, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl"
                style={{
                  backgroundColor: `${rel.fusion.color}10`,
                  border: `1px solid ${rel.fusion.color}25`
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{rel.fusion.icon}</span>
                    <span className="text-sm font-bold" style={{ color: rel.fusion.color }}>
                      {isKo ? rel.fusion.keyword.ko : rel.fusion.keyword.en}
                    </span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-gray-400">
                    {rel.fusion.score}/10
                  </span>
                </div>
                <p className="text-xs text-gray-400 mb-1">
                  {isKo ? rel.relationInfo.ko : rel.relationInfo.en} × {isKo ? rel.aspectInfo.ko : rel.aspectInfo.en}
                </p>
                <p className="text-sm text-gray-300">
                  {isKo ? rel.fusion.description.ko : rel.fusion.description.en}
                </p>
                {rel.advice && (
                  <p className="text-xs text-pink-400 mt-2">💡 {rel.advice}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Layer 7: 고급분석 (격국 × 프로그레션) */}
      {advancedAnalysis && advancedAnalysis.length > 0 && (
        <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-amber-900/20 border border-amber-500/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">🎯</span>
            <h3 className="text-lg font-bold text-amber-300">
              {isKo ? "고급 분석" : "Advanced Analysis"}
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">Layer 7</span>
          </div>

          <p className="text-gray-400 text-sm mb-4">
            {isKo
              ? "격국과 프로그레션이 만나 당신의 인생 패턴을 심층 분석합니다."
              : "Geokguk meets Progressions for deep life pattern analysis."}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {advancedAnalysis.map((adv, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl"
                style={{
                  backgroundColor: `${adv.fusion.color}10`,
                  border: `1px solid ${adv.fusion.color}25`
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{adv.fusion.icon}</span>
                    <span className="text-sm font-bold" style={{ color: adv.fusion.color }}>
                      {isKo ? adv.fusion.keyword.ko : adv.fusion.keyword.en}
                    </span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-gray-400">
                    {adv.fusion.score}/10
                  </span>
                </div>
                <p className="text-xs text-gray-400 mb-1">
                  {isKo ? adv.patternInfo.ko : adv.patternInfo.en} × {isKo ? adv.progressionInfo.ko : adv.progressionInfo.en}
                </p>
                <p className="text-sm text-gray-300">
                  {isKo ? adv.fusion.description.ko : adv.fusion.description.en}
                </p>
                {adv.advice && (
                  <p className="text-xs text-amber-400 mt-2">💡 {adv.advice}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Layer 10: 엑스트라포인트 (Chiron, Lilith 등 × 오행/십신) */}
      {extraPoints && extraPoints.length > 0 && (
        <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-indigo-900/20 border border-indigo-500/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">✨</span>
            <h3 className="text-lg font-bold text-indigo-300">
              {isKo ? "숨겨진 포인트" : "Hidden Points"}
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400">Layer 10</span>
          </div>

          <p className="text-gray-400 text-sm mb-4">
            {isKo
              ? "카이론, 릴리스 등 특별한 천체와 오행/십신이 만나 숨겨진 잠재력을 드러냅니다."
              : "Chiron, Lilith, and other special points meet elements, revealing hidden potential."}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {extraPoints.map((point, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl"
                style={{
                  backgroundColor: `${point.fusion.color}10`,
                  border: `1px solid ${point.fusion.color}25`
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{point.fusion.icon}</span>
                    <span className="text-sm font-bold" style={{ color: point.fusion.color }}>
                      {isKo ? point.pointInfo.ko : point.pointInfo.en}
                    </span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-gray-400">
                    {point.fusion.score}/10
                  </span>
                </div>
                <p className="text-xs text-gray-400 mb-1">
                  {isKo ? point.pointInfo.theme : point.pointInfo.themeEn}
                </p>
                <p className="text-sm text-gray-300 mb-1">
                  {isKo ? point.fusion.keyword.ko : point.fusion.keyword.en}
                </p>
                <p className="text-xs text-gray-400">
                  {isKo ? point.fusion.description.ko : point.fusion.description.en}
                </p>
                {point.advice && (
                  <p className="text-xs text-indigo-400 mt-2">💡 {point.advice}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
