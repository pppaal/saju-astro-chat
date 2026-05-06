// src/components/destiny-map/free-report/analyzers/karmaAnalyzer.ts
// 카르마 분석기 - destiny-matrix 통합

import type { GeokgukType, ZodiacSign, HouseNumber, HeavenlyStem, BilingualText } from '../types/core';
import type { SajuData, AstroData } from '../types';
import { getGeokgukType } from '../utils/geokguk';
import { eulReul } from '@/lib/i18n/koParticle';
import { getChironData } from '../utils/planets';
import { getPlanetHouse } from '../utils/houses';
import { calculateKarmaScore } from '../scoring';

// Import centralized data
import {
  GEOKGUK_TO_DRACONIC_SOUL,
  NODE_HOUSE_GROWTH_PATH,
  CHIRON_HEALING_PATH,
  SATURN_LIFE_LESSON,
  DAY_MASTER_SOUL_MISSION,
  type DayMasterType,
} from '../data/karma';

export interface KarmaAnalysisResult {
  // 영혼 유형 (격국 + 드라코닉 기반)
  soulType: {
    title: string;
    emoji: string;
    description: string;
    traits: string[];
    draconicSoul?: string;
  };
  // 이번 생의 성장 방향 (North Node)
  growthPath: {
    direction: string;
    pastPattern: string;
    lesson: string;
    practicalAdvice: string[];
  };
  // 치유해야 할 상처 (Chiron)
  woundToHeal: {
    wound: string;
    healingPath: string;
    gift: string;
  };
  // 토성 레슨
  saturnLesson: {
    lesson: string;
    timing: string;
    mastery: string;
  };
  // 플루토 변환
  plutoTransform?: {
    area: string;
    death: string;
    rebirth: string;
  };
  // 운명의 인연
  fatedConnections: {
    type: string;
    description: string;
  }[];
  // 영혼의 사명 (일간 + 용신 기반)
  soulMission: {
    core: string;
    expression: string;
    fulfillment: string;
  };
  // 전생 테마
  pastLifeTheme: {
    likely: string;
    talents: string;
    lessons: string;
  };
  // 카르마 점수
  karmaScore: number;
  // 영혼 여정 타임라인
  soulJourney?: {
    pastLife: string;
    currentLife: string;
    futurePotential: string;
    keyTransition: string;
  };
  // 카르마 해제 힌트
  karmaRelease?: {
    blockage: string;
    healing: string;
    breakthrough: string;
  };
}

// Pluto 하우스별 변환 영역
const PLUTO_TRANSFORM_AREAS: Record<HouseNumber, {
  area: BilingualText;
  death: BilingualText;
  rebirth: BilingualText;
}> = {
  1: {
    area: { ko: "자아 정체성", en: "Self-identity" },
    death: { ko: "과거의 '나'를 죽이고", en: "Kill the old 'self'" },
    rebirth: { ko: "완전히 새로운 나로 다시 태어나요", en: "Reborn as completely new self" },
  },
  2: {
    area: { ko: "가치관과 소유물", en: "Values and possessions" },
    death: { ko: "물질에 대한 집착을 놓고", en: "Let go of material attachment" },
    rebirth: { ko: "진정한 가치를 발견해요", en: "Discover true value" },
  },
  3: {
    area: { ko: "소통과 사고방식", en: "Communication and thinking" },
    death: { ko: "피상적인 대화를 버리고", en: "Abandon superficial talk" },
    rebirth: { ko: "깊고 변화시키는 소통을 해요", en: "Communicate deeply and transformatively" },
  },
  4: {
    area: { ko: "가정과 뿌리", en: "Home and roots" },
    death: { ko: "가족 트라우마를 직면하고", en: "Face family trauma" },
    rebirth: { ko: "새로운 가정을 창조해요", en: "Create new family" },
  },
  5: {
    area: { ko: "창작과 연애", en: "Creation and romance" },
    death: { ko: "에고적 표현을 놓고", en: "Let go of ego-driven expression" },
    rebirth: { ko: "영혼에서 우러나는 창작을 해요", en: "Create from the soul" },
  },
  6: {
    area: { ko: "일과 건강", en: "Work and health" },
    death: { ko: "자기 파괴적 습관을 버리고", en: "Abandon self-destructive habits" },
    rebirth: { ko: "치유와 봉사의 일을 해요", en: "Do healing and service work" },
  },
  7: {
    area: { ko: "관계와 파트너십", en: "Relationships and partnership" },
    death: { ko: "병든 관계 패턴을 죽이고", en: "Kill unhealthy relationship patterns" },
    rebirth: { ko: "영혼 수준의 연결을 해요", en: "Connect at soul level" },
  },
  8: {
    area: { ko: "변환과 공유 자원", en: "Transformation and shared resources" },
    death: { ko: "통제에 대한 집착을 놓고", en: "Let go of control obsession" },
    rebirth: { ko: "진정한 변환의 힘을 얻어요", en: "Gain true power of transformation" },
  },
  9: {
    area: { ko: "신념과 철학", en: "Beliefs and philosophy" },
    death: { ko: "독단적 신념을 버리고", en: "Abandon dogmatic beliefs" },
    rebirth: { ko: "더 넓은 진리를 발견해요", en: "Discover broader truth" },
  },
  10: {
    area: { ko: "커리어와 공적 이미지", en: "Career and public image" },
    death: { ko: "권력에 대한 집착을 놓고", en: "Let go of power obsession" },
    rebirth: { ko: "진정한 리더십을 발휘해요", en: "Exercise true leadership" },
  },
  11: {
    area: { ko: "친구와 커뮤니티", en: "Friends and community" },
    death: { ko: "피상적 관계를 정리하고", en: "Organize superficial relationships" },
    rebirth: { ko: "영혼 가족을 찾아요", en: "Find soul family" },
  },
  12: {
    area: { ko: "무의식과 영성", en: "Unconscious and spirituality" },
    death: { ko: "무의식적 패턴을 직면하고", en: "Face unconscious patterns" },
    rebirth: { ko: "영적 각성을 해요", en: "Achieve spiritual awakening" },
  },
};

// 전생 테마 데이터
const PAST_LIFE_THEMES: Partial<Record<GeokgukType, {
  likely: BilingualText;
  talents: BilingualText;
  lessons: BilingualText;
}>> = {
  siksin: {
    likely: { ko: "전생에서 예술가, 요리사, 작가였을 가능성이 높아요.", en: "Likely an artist, chef, or writer in past lives." },
    talents: { ko: "창작하고 표현하는 재능이 이미 익숙해요.", en: "Creative and expressive talents are already familiar." },
    lessons: { ko: "이번 생에서는 더 큰 무대로 나가세요.", en: "This life, step onto a bigger stage." },
  },
  sanggwan: {
    likely: { ko: "전생에서 연예인, 강사, 혁명가였을 가능성이 높아요.", en: "Likely an entertainer, lecturer, or revolutionary in past lives." },
    talents: { ko: "말과 표현으로 사람을 움직이는 재능이 있어요.", en: "You have talent to move people with words." },
    lessons: { ko: "이번 생에서는 그 힘을 건설적으로 쓰세요.", en: "This life, use that power constructively." },
  },
  jeonggwan: {
    likely: { ko: "전생에서 관료, 판사, 지도자였을 가능성이 높아요.", en: "Likely an official, judge, or leader in past lives." },
    talents: { ko: "조직하고 이끄는 능력이 이미 있어요.", en: "Organizational and leadership abilities exist already." },
    lessons: { ko: "이번 생에서는 더 인간적인 리더십을 배우세요.", en: "This life, learn more human leadership." },
  },
  pyeongwan: {
    likely: { ko: "전생에서 군인, 경찰, 격투가였을 가능성이 높아요.", en: "Likely a soldier, police, or fighter in past lives." },
    talents: { ko: "도전을 두려워하지 않는 용기가 있어요.", en: "You have courage that doesn't fear challenges." },
    lessons: { ko: "이번 생에서는 파괴보다 보호를 배우세요.", en: "This life, learn protection over destruction." },
  },
  jeongjae: {
    likely: { ko: "전생에서 상인, 은행가, 가정주부였을 가능성이 높아요.", en: "Likely a merchant, banker, or homemaker in past lives." },
    talents: { ko: "안정적으로 재물을 쌓는 능력이 있어요.", en: "You have ability to build wealth steadily." },
    lessons: { ko: "이번 생에서는 물질 너머의 가치를 탐구하세요.", en: "This life, explore values beyond material." },
  },
  pyeonjae: {
    likely: { ko: "전생에서 무역상, 투자가, 모험가였을 가능성이 높아요.", en: "Likely a trader, investor, or adventurer in past lives." },
    talents: { ko: "기회를 포착하고 활용하는 능력이 있어요.", en: "You have ability to spot and use opportunities." },
    lessons: { ko: "이번 생에서는 안정과 도전의 균형을 찾으세요.", en: "This life, find balance between stability and risk." },
  },
  jeongin: {
    likely: { ko: "전생에서 학자, 수도승, 선생님이었을 가능성이 높아요.", en: "Likely a scholar, monk, or teacher in past lives." },
    talents: { ko: "배우고 가르치는 능력이 이미 있어요.", en: "Learning and teaching abilities exist already." },
    lessons: { ko: "이번 생에서는 지식을 더 넓게 나누세요.", en: "This life, share knowledge more widely." },
  },
  pyeongin: {
    likely: { ko: "전생에서 무당, 점술가, 연구자였을 가능성이 높아요.", en: "Likely a shaman, diviner, or researcher in past lives." },
    talents: { ko: "직관과 통찰력이 이미 발달해 있어요.", en: "Intuition and insight are already developed." },
    lessons: { ko: "이번 생에서는 고립되지 말고 사람들과 연결하세요.", en: "This life, connect with people instead of isolating." },
  },
};

// 카르마 블록 데이터
const KARMA_BLOCKAGE_MAP: Record<ZodiacSign, BilingualText> = {
  aries: { ko: "자신감 부족, 주도권에 대한 두려움", en: "Lack of confidence, fear of taking initiative" },
  taurus: { ko: "물질적 불안, 변화에 대한 저항", en: "Material insecurity, resistance to change" },
  gemini: { ko: "소통의 어려움, 산만함", en: "Communication difficulties, scattered focus" },
  cancer: { ko: "감정 억압, 안전 집착", en: "Emotional suppression, safety obsession" },
  leo: { ko: "인정 욕구, 자존심 상처", en: "Need for recognition, wounded pride" },
  virgo: { ko: "완벽주의, 자기 비판", en: "Perfectionism, self-criticism" },
  libra: { ko: "결정 어려움, 관계 의존", en: "Difficulty deciding, relationship dependency" },
  scorpio: { ko: "통제 욕구, 신뢰 문제", en: "Control needs, trust issues" },
  sagittarius: { ko: "방향 상실, 과도한 낙관", en: "Loss of direction, excessive optimism" },
  capricorn: { ko: "성공 강박, 감정 억제", en: "Success obsession, emotional suppression" },
  aquarius: { ko: "소외감, 친밀감 회피", en: "Alienation, intimacy avoidance" },
  pisces: { ko: "경계 부족, 현실 도피", en: "Lack of boundaries, escapism" },
};

// 영혼 여정 전생 맵
const PAST_LIFE_MAP: Partial<Record<GeokgukType, BilingualText>> = {
  siksin: { ko: "창작과 표현의 삶을 살았어요", en: "Lived a life of creation and expression" },
  sanggwan: { ko: "무대와 영향력의 삶을 살았어요", en: "Lived a life of stage and influence" },
  jeonggwan: { ko: "질서와 통제의 삶을 살았어요", en: "Lived a life of order and control" },
  pyeongwan: { ko: "도전과 극복의 삶을 살았어요", en: "Lived a life of challenge and overcoming" },
  jeongjae: { ko: "안정과 축적의 삶을 살았어요", en: "Lived a life of stability and accumulation" },
  pyeonjae: { ko: "모험과 확장의 삶을 살았어요", en: "Lived a life of adventure and expansion" },
  jeongin: { ko: "학습과 보호의 삶을 살았어요", en: "Lived a life of learning and protection" },
  pyeongin: { ko: "직관과 영성의 삶을 살았어요", en: "Lived a life of intuition and spirituality" },
};

// 현생 여정 맵
const CURRENT_LIFE_MAP: Record<HouseNumber, BilingualText> = {
  1: { ko: "자아를 발견하고 정체성을 확립하는 여정", en: "Journey to discover self and establish identity" },
  2: { ko: "가치와 재능을 개발하는 여정", en: "Journey to develop values and talents" },
  3: { ko: "소통과 학습의 여정", en: "Journey of communication and learning" },
  4: { ko: "뿌리와 안정을 찾는 여정", en: "Journey to find roots and stability" },
  5: { ko: "창조와 자기표현의 여정", en: "Journey of creation and self-expression" },
  6: { ko: "봉사와 완성의 여정", en: "Journey of service and perfection" },
  7: { ko: "관계와 균형의 여정", en: "Journey of relationships and balance" },
  8: { ko: "변화와 재탄생의 여정", en: "Journey of transformation and rebirth" },
  9: { ko: "확장과 지혜의 여정", en: "Journey of expansion and wisdom" },
  10: { ko: "성취와 사명의 여정", en: "Journey of achievement and mission" },
  11: { ko: "공동체와 비전의 여정", en: "Journey of community and vision" },
  12: { ko: "영성과 초월의 여정", en: "Journey of spirituality and transcendence" },
};

/**
 * Helper to select language from BilingualText
 */
function selectLang(isKo: boolean, text: BilingualText | undefined): string {
  if (!text) {return '';}
  return isKo ? text.ko : text.en;
}

/**
 * Helper to select language from bilingual array
 */
function selectLangArray(isKo: boolean, arr: { ko: string[]; en: string[] } | undefined): string[] {
  if (!arr) {return [];}
  return isKo ? arr.ko : arr.en;
}

/**
 * Helper to check if a sinsal exists in list
 */
function hasSinsal(sinsalList: unknown[], keyword: string): boolean {
  return sinsalList.some((s: unknown) => {
    const name = typeof s === 'string' ? s : (s as { name?: string })?.name;
    return name?.includes(keyword);
  });
}

/**
 * Extract day master first character
 */
function extractDayMasterChar(saju: SajuData | undefined): HeavenlyStem | null {
  // Extract day master from various sources
  let dayMasterStr = saju?.dayMaster?.name || saju?.dayMaster?.heavenlyStem || "";

  // Try pillars if dayMaster not available
  if (!dayMasterStr && saju?.pillars?.day) {
    const dayPillar = saju.pillars.day;
    if (typeof dayPillar.heavenlyStem === 'string') {
      dayMasterStr = dayPillar.heavenlyStem;
    } else if (dayPillar.heavenlyStem && typeof dayPillar.heavenlyStem === 'object') {
      dayMasterStr = (dayPillar.heavenlyStem as { name?: string }).name || "";
    }
  }

  // Also try dayPillar
  if (!dayMasterStr && saju?.dayPillar) {
    const dayPillar = saju.dayPillar;
    if (typeof dayPillar.heavenlyStem === 'string') {
      dayMasterStr = dayPillar.heavenlyStem;
    } else if (dayPillar.heavenlyStem && typeof dayPillar.heavenlyStem === 'object') {
      dayMasterStr = (dayPillar.heavenlyStem as { name?: string }).name || "";
    }
  }

  const firstChar = dayMasterStr.charAt(0);
  const validStems: HeavenlyStem[] = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'];

  return validStems.includes(firstChar as HeavenlyStem) ? (firstChar as HeavenlyStem) : null;
}

export function getKarmaAnalysis(
  saju: SajuData | undefined,
  astro: AstroData | undefined,
  lang: string
): KarmaAnalysisResult | null {
  if (!saju && !astro) {return null;}

  const isKo = lang === 'ko';

  // 격국 추출 (centralized utility 사용)
  const geokguk = saju?.advancedAnalysis?.geokguk as { name?: string; type?: string } | undefined;
  const geokName = geokguk?.name || geokguk?.type;
  const geokgukType = getGeokgukType(geokName);

  // 일간 추출
  const dayMasterChar = extractDayMasterChar(saju);

  // North Node 하우스 (centralized utility 사용)
  const northNodeHouse = getPlanetHouse(astro, 'northnode');

  // Chiron 데이터 (centralized utility 사용)
  const chironData = getChironData(astro);
  const chironSign = chironData?.sign?.toLowerCase() as ZodiacSign | undefined;

  // Saturn 하우스
  const saturnHouse = getPlanetHouse(astro, 'saturn');

  // Pluto 하우스
  const plutoHouse = getPlanetHouse(astro, 'pluto');

  // === 1. 영혼 유형 (격국 + 드라코닉 기반) ===
  let soulType: KarmaAnalysisResult['soulType'] = {
    title: isKo ? "탐험가 영혼" : "Explorer Soul",
    emoji: "🌟",
    description: isKo
      ? "다양한 경험을 통해 성장하는 영혼. 새로운 것을 배우고 도전하며 자신을 발견해가요."
      : "Soul growing through diverse experiences. Learn new things, take challenges, and discover yourself.",
    traits: isKo ? ["호기심", "적응력", "성장"] : ["Curiosity", "Adaptability", "Growth"],
  };

  if (geokgukType && GEOKGUK_TO_DRACONIC_SOUL[geokgukType]) {
    const draconic = GEOKGUK_TO_DRACONIC_SOUL[geokgukType];
    soulType = {
      title: selectLang(isKo, draconic.title),
      emoji: draconic.emoji,
      description: selectLang(isKo, draconic.description),
      traits: selectLangArray(isKo, draconic.traits),
      draconicSoul: selectLang(isKo, draconic.title),
    };
  }

  // === 2. 성장 경로 (North Node) ===
  let growthPath: KarmaAnalysisResult['growthPath'] = {
    direction: isKo ? "자기 발견의 여정" : "Journey of self-discovery",
    pastPattern: isKo ? "전생의 패턴을 넘어서야 해요." : "You must transcend past life patterns.",
    lesson: isKo ? "성장은 불편함 속에서 일어나요." : "Growth happens in discomfort.",
    practicalAdvice: isKo ? ["새로운 것을 시도하세요"] : ["Try new things"],
  };

  if (northNodeHouse && NODE_HOUSE_GROWTH_PATH[northNodeHouse]) {
    const path = NODE_HOUSE_GROWTH_PATH[northNodeHouse];
    growthPath = {
      direction: selectLang(isKo, path.direction),
      pastPattern: selectLang(isKo, path.pastPattern),
      lesson: selectLang(isKo, path.lesson),
      practicalAdvice: selectLangArray(isKo, path.advice),
    };
  }

  // === 3. 치유해야 할 상처 (Chiron) ===
  let woundToHeal: KarmaAnalysisResult['woundToHeal'] = {
    wound: isKo ? "삶의 어떤 영역에서 상처가 있을 수 있어요." : "There may be wounds in some area of life.",
    healingPath: isKo ? "상처를 인정하면 치유가 시작돼요." : "Acknowledging wounds starts healing.",
    gift: isKo ? "치유한 상처가 당신의 선물이 돼요." : "Healed wounds become your gift.",
  };

  if (chironSign && CHIRON_HEALING_PATH[chironSign]) {
    const healing = CHIRON_HEALING_PATH[chironSign];
    woundToHeal = {
      wound: selectLang(isKo, healing.wound),
      healingPath: selectLang(isKo, healing.healing),
      gift: selectLang(isKo, healing.gift),
    };
  }

  // === 4. 토성 레슨 ===
  let saturnLesson: KarmaAnalysisResult['saturnLesson'] = {
    lesson: isKo ? "인생의 중요한 교훈이 기다리고 있어요." : "Important life lessons await.",
    timing: isKo ? "29세, 58세 전후로 큰 시험이 와요." : "Major tests come around ages 29 and 58.",
    mastery: isKo ? "나이 들수록 더 강해져요." : "You grow stronger with age.",
  };

  if (saturnHouse && SATURN_LIFE_LESSON[saturnHouse]) {
    const lesson = SATURN_LIFE_LESSON[saturnHouse];
    saturnLesson = {
      lesson: selectLang(isKo, lesson.lesson),
      timing: selectLang(isKo, lesson.timing),
      mastery: selectLang(isKo, lesson.mastery),
    };
  }

  // === 5. 플루토 변환 ===
  let plutoTransform: KarmaAnalysisResult['plutoTransform'] | undefined;
  if (plutoHouse && PLUTO_TRANSFORM_AREAS[plutoHouse]) {
    const transform = PLUTO_TRANSFORM_AREAS[plutoHouse];
    plutoTransform = {
      area: selectLang(isKo, transform.area),
      death: selectLang(isKo, transform.death),
      rebirth: selectLang(isKo, transform.rebirth),
    };
  }

  // === 6. 운명의 인연 ===
  const fatedConnections: KarmaAnalysisResult['fatedConnections'] = [];

  // 신살 데이터 추출 (type-safe)
  const sinsalData = saju?.advancedAnalysis?.sinsal as {
    luckyList?: unknown[];
    unluckyList?: unknown[];
  } | undefined;

  const luckyList = sinsalData?.luckyList || [];
  const unluckyList = sinsalData?.unluckyList || [];
  const allSinsal = [...luckyList, ...unluckyList];

  const hasHongYeom = hasSinsal(allSinsal, '홍염');
  const hasYeokMa = hasSinsal(allSinsal, '역마');
  const hasGwiMun = hasSinsal(allSinsal, '귀문');
  const hasDohwa = hasSinsal(allSinsal, '도화');

  if (hasHongYeom || hasDohwa) {
    fatedConnections.push({
      type: isKo ? "🔥 운명적 연인" : "🔥 Fated Lover",
      description: isKo
        ? "강렬하고 열정적인 로맨틱 인연이 예정되어 있어요. 첫 만남부터 강한 끌림을 느낄 거예요."
        : "Intense romantic connections are destined. You'll feel strong attraction from first meeting.",
    });
  }
  if (hasYeokMa) {
    fatedConnections.push({
      type: isKo ? "✈️ 해외 인연" : "✈️ Overseas Connection",
      description: isKo
        ? "해외나 먼 곳에서 중요한 인연을 만나요. 여행이나 이주가 인연의 계기가 될 수 있어요."
        : "Important connections await in foreign lands. Travel or relocation may be the catalyst.",
    });
  }
  if (hasGwiMun) {
    fatedConnections.push({
      type: isKo ? "🔮 영적 스승" : "🔮 Spiritual Mentor",
      description: isKo
        ? "영적/지적으로 깊은 인연이 예정되어 있어요. 멘토나 스승을 만날 수 있어요."
        : "Deep spiritual/intellectual connections await. You may meet a mentor or teacher.",
    });
  }

  // === 7. 영혼의 사명 ===
  let soulMission: KarmaAnalysisResult['soulMission'] = {
    core: isKo ? "당신만의 빛으로 세상을 밝히세요." : "Light the world with your unique light.",
    expression: isKo ? "자신에게 충실하면 길이 열려요." : "Being true to yourself opens the path.",
    fulfillment: isKo ? "진정한 나로 살 때 가장 행복해요." : "Happiest when living as your true self.",
  };

  if (dayMasterChar && DAY_MASTER_SOUL_MISSION[dayMasterChar as DayMasterType]) {
    const mission = DAY_MASTER_SOUL_MISSION[dayMasterChar as DayMasterType];
    soulMission = {
      core: selectLang(isKo, mission.core),
      expression: selectLang(isKo, mission.expression),
      fulfillment: selectLang(isKo, mission.fulfillment),
    };
  }

  // === 8. 전생 테마 ===
  let pastLifeTheme: KarmaAnalysisResult['pastLifeTheme'] = {
    likely: isKo ? "다양한 경험을 한 영혼" : "Soul with diverse experiences",
    talents: isKo ? "전생에서 쌓은 재능이 있어요." : "You have talents from past lives.",
    lessons: isKo ? "과거의 패턴을 반복하지 마세요." : "Don't repeat past patterns.",
  };

  if (geokgukType && PAST_LIFE_THEMES[geokgukType]) {
    const theme = PAST_LIFE_THEMES[geokgukType]!;
    pastLifeTheme = {
      likely: selectLang(isKo, theme.likely),
      talents: selectLang(isKo, theme.talents),
      lessons: selectLang(isKo, theme.lessons),
    };
  }

  // === 카르마 점수 계산 (중앙화된 스코어링 사용) ===
  const karmaScoreResult = calculateKarmaScore(saju, astro);
  const karmaScore = karmaScoreResult.score;

  // === 9. 영혼 여정 타임라인 ===
  let soulJourney: KarmaAnalysisResult['soulJourney'];
  if (geokgukType || northNodeHouse) {
    const pastLife = geokgukType && PAST_LIFE_MAP[geokgukType]
      ? selectLang(isKo, PAST_LIFE_MAP[geokgukType])
      : (isKo ? "다양한 경험을 쌓은 전생" : "Past life with diverse experiences");

    const currentLife = northNodeHouse && CURRENT_LIFE_MAP[northNodeHouse]
      ? selectLang(isKo, CURRENT_LIFE_MAP[northNodeHouse])
      : (isKo ? "자아 성장의 여정 중" : "On a journey of self-growth");

    const futurePotential = isKo
      ? `${soulMission.expression}${eulReul(soulMission.expression)} 통해 영혼의 완성에 나아가요`
      : `Moving towards soul completion through ${soulMission.expression}`;

    const keyTransition = saturnHouse
      ? (isKo
        ? `${saturnHouse}하우스 영역에서 중요한 전환점이 와요. 29-30세, 58-60세에 주의하세요.`
        : `Key transition in the ${saturnHouse}th house area. Pay attention at ages 29-30 and 58-60.`)
      : (isKo ? "인생의 전환점에서 더 성숙해져요." : "You mature through life's turning points.");

    soulJourney = { pastLife, currentLife, futurePotential, keyTransition };
  }

  // === 10. 카르마 해제 힌트 ===
  let karmaRelease: KarmaAnalysisResult['karmaRelease'];
  if (chironSign || plutoHouse) {
    const blockage = chironSign && KARMA_BLOCKAGE_MAP[chironSign]
      ? selectLang(isKo, KARMA_BLOCKAGE_MAP[chironSign])
      : (isKo ? "과거의 상처가 현재를 막고 있어요" : "Past wounds are blocking the present");

    const healing = woundToHeal.healingPath;

    const breakthrough = plutoHouse
      ? (isKo
        ? `${plutoHouse}하우스 영역에서 완전한 변화를 경험하면 자유로워져요.`
        : `Complete transformation in the ${plutoHouse}th house area brings freedom.`)
      : (isKo ? "두려움을 직면하면 해방이 와요." : "Facing fears brings liberation.");

    karmaRelease = { blockage, healing, breakthrough };
  }

  return {
    soulType,
    growthPath,
    woundToHeal,
    saturnLesson,
    plutoTransform,
    fatedConnections,
    soulMission,
    pastLifeTheme,
    karmaScore: Math.min(100, Math.max(65, karmaScore)),
    soulJourney,
    karmaRelease,
  };
}
