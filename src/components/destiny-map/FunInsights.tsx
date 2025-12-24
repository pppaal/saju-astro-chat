"use client";

import { useMemo } from "react";

interface Props {
  saju?: any;
  astro?: any;
  lang?: string;
  theme?: string;
  className?: string;
}

// ============================================================
// 데이터 정의
// ============================================================

const elementTraits: Record<string, { ko: string; en: string; emoji: string; color: string; bgColor: string; organ: string; season: string }> = {
  wood: { ko: "목(木)", en: "Wood", emoji: "🌳", color: "#22c55e", bgColor: "rgba(34, 197, 94, 0.15)", organ: "간/담", season: "봄" },
  fire: { ko: "화(火)", en: "Fire", emoji: "🔥", color: "#ef4444", bgColor: "rgba(239, 68, 68, 0.15)", organ: "심장/소장", season: "여름" },
  earth: { ko: "토(土)", en: "Earth", emoji: "🏔️", color: "#eab308", bgColor: "rgba(234, 179, 8, 0.15)", organ: "비장/위", season: "환절기" },
  metal: { ko: "금(金)", en: "Metal", emoji: "⚔️", color: "#94a3b8", bgColor: "rgba(148, 163, 184, 0.15)", organ: "폐/대장", season: "가을" },
  water: { ko: "수(水)", en: "Water", emoji: "💧", color: "#3b82f6", bgColor: "rgba(59, 130, 246, 0.15)", organ: "신장/방광", season: "겨울" },
};

const elementKeyMap: Record<string, string> = {
  "목": "wood", "화": "fire", "토": "earth", "금": "metal", "수": "water",
  "木": "wood", "火": "fire", "土": "earth", "金": "metal", "水": "water",
};

// 천간 한자 → 한글 매핑
const tianGanMap: Record<string, string> = {
  "甲": "갑", "乙": "을", "丙": "병", "丁": "정", "戊": "무",
  "己": "기", "庚": "경", "辛": "신", "壬": "임", "癸": "계",
  "Gab": "갑", "Eul": "을", "Byung": "병", "Jung": "정", "Mu": "무",
  "Gi": "기", "Gyung": "경", "Shin": "신", "Im": "임", "Gye": "계",
};

// 일간 10개 × 특성 (더 상세한 해석)
const dayMasterData: Record<string, {
  ko: string; en: string; animal: string; element: string; hanja: string;
  personality: { ko: string; en: string };
  strength: { ko: string; en: string };
  weakness: { ko: string; en: string };
  career: string[];
  relationship: string;
  health: string;
}> = {
  "갑": {
    ko: "갑목", en: "Gab Wood", animal: "🦁", element: "wood", hanja: "甲",
    personality: { ko: "큰 나무처럼 듬직하고 정직한 리더형", en: "Honest leader like a mighty tree" },
    strength: { ko: "추진력, 결단력, 책임감", en: "Drive, decisiveness, responsibility" },
    weakness: { ko: "고집, 융통성 부족", en: "Stubbornness, inflexibility" },
    career: ["경영자", "CEO", "정치인", "창업가"],
    relationship: "주도적이고 보호하려는 성향",
    health: "간, 담, 눈 건강에 주의"
  },
  "을": {
    ko: "을목", en: "Eul Wood", animal: "🦊", element: "wood", hanja: "乙",
    personality: { ko: "덩굴처럼 유연하고 적응력 있는 타입", en: "Flexible and adaptive like a vine" },
    strength: { ko: "적응력, 인내심, 부드러움", en: "Adaptability, patience, gentleness" },
    weakness: { ko: "우유부단, 의존적", en: "Indecisive, dependent" },
    career: ["디자이너", "예술가", "상담사", "교육자"],
    relationship: "배려심 깊고 헌신적",
    health: "근육, 신경계 관리 필요"
  },
  "병": {
    ko: "병화", en: "Byung Fire", animal: "🦅", element: "fire", hanja: "丙",
    personality: { ko: "태양처럼 밝고 열정적인 타입", en: "Bright and passionate like the sun" },
    strength: { ko: "열정, 낙천성, 카리스마", en: "Passion, optimism, charisma" },
    weakness: { ko: "성급함, 산만함", en: "Impatience, scattered focus" },
    career: ["연예인", "MC", "마케터", "영업"],
    relationship: "정열적이고 표현이 풍부",
    health: "심장, 혈압, 눈 건강 관리"
  },
  "정": {
    ko: "정화", en: "Jung Fire", animal: "🦋", element: "fire", hanja: "丁",
    personality: { ko: "촛불처럼 따뜻하고 섬세한 타입", en: "Warm and delicate like candlelight" },
    strength: { ko: "세심함, 예술성, 배려", en: "Attentiveness, artistry, caring" },
    weakness: { ko: "예민함, 걱정 많음", en: "Sensitivity, worry" },
    career: ["아티스트", "요리사", "심리상담사", "작가"],
    relationship: "감성적이고 로맨틱",
    health: "심장, 소장 기능 주의"
  },
  "무": {
    ko: "무토", en: "Mu Earth", animal: "🐻", element: "earth", hanja: "戊",
    personality: { ko: "산처럼 묵직하고 신뢰감 있는 타입", en: "Reliable and steady like a mountain" },
    strength: { ko: "안정감, 포용력, 신뢰", en: "Stability, embrace, trust" },
    weakness: { ko: "고집, 변화 거부", en: "Stubbornness, resistance to change" },
    career: ["부동산", "건설", "금융", "공무원"],
    relationship: "든든하고 믿음직스러움",
    health: "위장, 비장, 소화기 관리"
  },
  "기": {
    ko: "기토", en: "Gi Earth", animal: "🐘", element: "earth", hanja: "己",
    personality: { ko: "평야처럼 넓고 포용적인 타입", en: "Broad and nurturing like plains" },
    strength: { ko: "배려심, 중재력, 실용성", en: "Caring, mediation, practicality" },
    weakness: { ko: "우유부단, 자기주장 부족", en: "Indecisive, lack of assertiveness" },
    career: ["컨설턴트", "HR", "농업", "요식업"],
    relationship: "포용력 있고 희생적",
    health: "당뇨, 비만, 소화기 주의"
  },
  "경": {
    ko: "경금", en: "Gyung Metal", animal: "🦈", element: "metal", hanja: "庚",
    personality: { ko: "칼처럼 날카롭고 결단력 있는 타입", en: "Sharp and decisive like a blade" },
    strength: { ko: "결단력, 정의감, 실행력", en: "Decisiveness, justice, execution" },
    weakness: { ko: "냉정함, 타협 어려움", en: "Coldness, difficulty compromising" },
    career: ["군인", "경찰", "변호사", "외과의사"],
    relationship: "직선적이고 솔직함",
    health: "폐, 대장, 피부 관리"
  },
  "신": {
    ko: "신금", en: "Shin Metal", animal: "🦚", element: "metal", hanja: "辛",
    personality: { ko: "보석처럼 세련되고 빛나는 타입", en: "Refined and sparkling like a gem" },
    strength: { ko: "심미안, 완벽주의, 매력", en: "Aesthetic sense, perfectionism, charm" },
    weakness: { ko: "까다로움, 비판적", en: "Picky, critical" },
    career: ["주얼리 디자이너", "금융 전문가", "감정사", "뷰티"],
    relationship: "까다롭지만 깊은 애정",
    health: "호흡기, 피부 알레르기 주의"
  },
  "임": {
    ko: "임수", en: "Im Water", animal: "🐋", element: "water", hanja: "壬",
    personality: { ko: "바다처럼 깊고 지혜로운 타입", en: "Deep and wise like the ocean" },
    strength: { ko: "지혜, 포용력, 직관", en: "Wisdom, embrace, intuition" },
    weakness: { ko: "우울함, 감정 기복", en: "Melancholy, mood swings" },
    career: ["연구원", "철학자", "무역상", "IT 개발자"],
    relationship: "깊이 있는 사랑, 신비로움",
    health: "신장, 방광, 생식기 관리"
  },
  "계": {
    ko: "계수", en: "Gye Water", animal: "🦢", element: "water", hanja: "癸",
    personality: { ko: "시냇물처럼 맑고 순수한 타입", en: "Pure and clear like a stream" },
    strength: { ko: "순수함, 섬세함, 창의성", en: "Purity, delicacy, creativity" },
    weakness: { ko: "예민함, 소극적", en: "Sensitivity, passiveness" },
    career: ["예술가", "명상가", "학자", "점술가"],
    relationship: "순수하고 감성적",
    health: "신장, 귀, 뼈 건강 주의"
  },
};

// 12 황도대 사인
const zodiacData: Record<string, {
  ko: string; en: string; emoji: string; element: string;
  trait: { ko: string; en: string };
}> = {
  aries: { ko: "양자리", en: "Aries", emoji: "♈", element: "fire",
    trait: { ko: "용감하고 선구적", en: "Brave and pioneering" } },
  taurus: { ko: "황소자리", en: "Taurus", emoji: "♉", element: "earth",
    trait: { ko: "안정적이고 감각적", en: "Stable and sensual" } },
  gemini: { ko: "쌍둥이자리", en: "Gemini", emoji: "♊", element: "air",
    trait: { ko: "다재다능하고 소통적", en: "Versatile and communicative" } },
  cancer: { ko: "게자리", en: "Cancer", emoji: "♋", element: "water",
    trait: { ko: "감성적이고 보호적", en: "Emotional and protective" } },
  leo: { ko: "사자자리", en: "Leo", emoji: "♌", element: "fire",
    trait: { ko: "자신감 있고 창조적", en: "Confident and creative" } },
  virgo: { ko: "처녀자리", en: "Virgo", emoji: "♍", element: "earth",
    trait: { ko: "분석적이고 실용적", en: "Analytical and practical" } },
  libra: { ko: "천칭자리", en: "Libra", emoji: "♎", element: "air",
    trait: { ko: "조화롭고 외교적", en: "Harmonious and diplomatic" } },
  scorpio: { ko: "전갈자리", en: "Scorpio", emoji: "♏", element: "water",
    trait: { ko: "강렬하고 통찰력 있는", en: "Intense and insightful" } },
  sagittarius: { ko: "궁수자리", en: "Sagittarius", emoji: "♐", element: "fire",
    trait: { ko: "낙관적이고 모험적", en: "Optimistic and adventurous" } },
  capricorn: { ko: "염소자리", en: "Capricorn", emoji: "♑", element: "earth",
    trait: { ko: "야심차고 책임감 있는", en: "Ambitious and responsible" } },
  aquarius: { ko: "물병자리", en: "Aquarius", emoji: "♒", element: "air",
    trait: { ko: "독창적이고 인도주의적", en: "Original and humanitarian" } },
  pisces: { ko: "물고기자리", en: "Pisces", emoji: "♓", element: "water",
    trait: { ko: "직관적이고 공감적", en: "Intuitive and empathetic" } },
};

// 오행 관계
const elementRelations = {
  generates: { wood: "fire", fire: "earth", earth: "metal", metal: "water", water: "wood" } as Record<string, string>,
  controls: { wood: "earth", earth: "water", water: "fire", fire: "metal", metal: "wood" } as Record<string, string>,
  supportedBy: { wood: "water", fire: "wood", earth: "fire", metal: "earth", water: "metal" } as Record<string, string>,
};

// 점성 element -> 사주 오행 매핑
const astroToSaju: Record<string, string> = { fire: "fire", earth: "earth", air: "metal", water: "water" };

// 월별 오행 (절기 기준)
const monthElements: Record<number, string> = {
  1: "water", 2: "wood", 3: "wood", 4: "earth", 5: "fire", 6: "fire",
  7: "earth", 8: "metal", 9: "metal", 10: "earth", 11: "water", 12: "water"
};


// ============================================================
// 헬퍼 함수들
// ============================================================

function findPlanetSign(astro: any, planetName: string): string | null {
  if (Array.isArray(astro?.planets)) {
    const planet = astro.planets.find((p: any) => p?.name?.toLowerCase() === planetName.toLowerCase());
    if (planet?.sign) return planet.sign.toLowerCase();
  }
  if (astro?.planets?.[planetName]?.sign) {
    return astro.planets[planetName].sign.toLowerCase();
  }
  if (astro?.facts?.[planetName]?.sign) {
    return astro.facts[planetName].sign.toLowerCase();
  }
  return null;
}

// 십신 분포 계산
function getSibsinDistribution(saju: any): Record<string, number> {
  const distribution: Record<string, number> = {};

  // advancedAnalysis에서 sibsin 가져오기
  if (saju?.advancedAnalysis?.sibsin?.sibsinDistribution) {
    return saju.advancedAnalysis.sibsin.sibsinDistribution;
  }

  // pillars에서 직접 계산
  const pillars = ['yearPillar', 'monthPillar', 'dayPillar', 'timePillar'];
  for (const pillarKey of pillars) {
    const pillar = saju?.[pillarKey];
    if (pillar?.heavenlyStem?.sibsin) {
      const sibsin = typeof pillar.heavenlyStem.sibsin === 'object'
        ? pillar.heavenlyStem.sibsin.name || pillar.heavenlyStem.sibsin.kind
        : pillar.heavenlyStem.sibsin;
      if (sibsin) distribution[sibsin] = (distribution[sibsin] || 0) + 1;
    }
    if (pillar?.earthlyBranch?.sibsin) {
      const sibsin = typeof pillar.earthlyBranch.sibsin === 'object'
        ? pillar.earthlyBranch.sibsin.name || pillar.earthlyBranch.sibsin.kind
        : pillar.earthlyBranch.sibsin;
      if (sibsin) distribution[sibsin] = (distribution[sibsin] || 0) + 1;
    }
  }

  return distribution;
}

// 1. 동서양 융합 분석
function getCrossAnalysis(saju: any, astro: any, lang: string): { title: string; insight: string; emoji: string }[] {
  const insights: { title: string; insight: string; emoji: string }[] = [];
  const isKo = lang === "ko";

  const rawDayMasterName = saju?.dayMaster?.name || saju?.dayMaster?.heavenlyStem;
  const dayMasterName = rawDayMasterName ? (tianGanMap[rawDayMasterName] || rawDayMasterName) : null;
  const dayMasterInfo = dayMasterName ? dayMasterData[dayMasterName] : null;
  const dayElement = dayMasterInfo?.element || (saju?.dayMaster?.element ? elementKeyMap[saju.dayMaster.element] : null);

  const sunSign = findPlanetSign(astro, "sun");
  const moonSign = findPlanetSign(astro, "moon");
  const sunData = sunSign ? zodiacData[sunSign] : null;
  const moonData = moonSign ? zodiacData[moonSign] : null;

  // 사주 일간 × 태양 사인
  if (dayMasterInfo && sunData && dayElement) {
    const astroEl = astroToSaju[sunData.element] || sunData.element;
    const isHarmony = dayElement === astroEl ||
      elementRelations.generates[dayElement] === astroEl ||
      elementRelations.supportedBy[dayElement] === astroEl;

    const synergy = isHarmony
      ? (isKo ? "조화로운 시너지" : "Harmonious synergy")
      : (isKo ? "창조적 긴장" : "Creative tension");

    insights.push({
      emoji: isHarmony ? "✨" : "🔄",
      title: isKo ? `${dayMasterInfo.ko} × ${sunData.ko}` : `${dayMasterInfo.en} × ${sunData.en}`,
      insight: isKo
        ? `보석처럼 세련되고 빛나는 타입과 ${sunData.trait.ko} 성향이 만나 ${synergy}를 이룹니다. ${isHarmony ? "내면과 외면이 일관되어 진정성이 느껴집니다." : "다양한 면모를 가진 복합적 매력이 있습니다."}`
        : `${dayMasterInfo.personality.en} meets ${sunData.trait.en} nature, creating ${synergy}. ${isHarmony ? "Inner and outer self are aligned, showing authenticity." : "You have complex charm with diverse facets."}`
    });
  }

  // 오행 × 달 사인 (감정/내면)
  if (saju?.fiveElements && moonData) {
    const sorted = Object.entries(saju.fiveElements).sort(([,a], [,b]) => (b as number) - (a as number));
    const strongestEl = sorted[0][0];
    const strongestInfo = elementTraits[strongestEl];

    insights.push({
      emoji: "🌙",
      title: isKo ? `${strongestInfo?.ko || strongestEl} 우세 × ${moonData.ko}` : `Dominant ${strongestInfo?.en || strongestEl} × ${moonData.en}`,
      insight: isKo
        ? `${strongestInfo?.ko || strongestEl} 기운이 강한 사주에 ${moonData.ko} 달이 더해져 ${moonData.trait.ko}하고 소통적 감성을 갖습니다. 감정 표현과 내면 세계에서 이 조합이 드러납니다.`
        : `Strong ${strongestInfo?.en || strongestEl} energy combined with ${moonData.en} Moon gives you ${moonData.trait.en} emotions. This combination shows in emotional expression and inner world.`
    });
  }

  return insights;
}

// 2. 추천 시기 계산
function getRecommendedDates(saju: any, _astro: any, lang: string): { date: string; type: string; reason: string; score: number }[] {
  const dates: { date: string; type: string; reason: string; score: number }[] = [];
  const isKo = lang === "ko";
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const dayElement = saju?.dayMaster?.element ? elementKeyMap[saju.dayMaster.element] : null;
  if (!dayElement) return dates;

  // 월별 길흉 계산
  for (let m = 1; m <= 12; m++) {
    const monthEl = monthElements[m];
    let score = 50;
    let reason = "";

    if (elementRelations.supportedBy[dayElement] === monthEl) {
      score = 85;
      reason = isKo ? `${elementTraits[monthEl]?.ko}이 나를 생(生)해주는 달` : `${elementTraits[monthEl]?.en} generates your energy`;
    } else if (monthEl === dayElement) {
      score = 75;
      reason = isKo ? "같은 오행으로 힘이 강해지는 달" : "Same element strengthens you";
    } else if (elementRelations.generates[dayElement] === monthEl) {
      score = 65;
      reason = isKo ? "에너지를 발산하기 좋은 달" : "Good for expressing energy";
    } else if (elementRelations.controls[monthEl] === dayElement) {
      score = 35;
      reason = isKo ? "도전적인 시기, 신중히" : "Challenging period";
    }

    if (score >= 65) {
      const isUpcoming = m >= currentMonth;
      const year = isUpcoming ? currentYear : currentYear + 1;
      dates.push({
        date: isKo ? `${year}년 ${m}월` : `${year}/${m}`,
        type: score >= 80 ? (isKo ? "🌟 대길월" : "🌟 Excellent") : (isKo ? "⭐ 길월" : "⭐ Good"),
        reason,
        score
      });
    }
  }

  // 대운 정보
  const daeunList = saju?.unse?.daeun || saju?.daeWoon?.list || [];
  if (daeunList.length > 0) {
    const birthYear = parseInt(saju.birthDate?.split("-")[0]) || 1990;
    const age = currentYear - birthYear;
    const startAge = saju?.unse?.startAge || saju?.daeWoon?.startAge || 0;
    const daeunIndex = Math.max(0, Math.floor((age - startAge) / 10));

    if (daeunIndex < daeunList.length) {
      const daeun = daeunList[daeunIndex];
      const ganji = daeun?.ganji || "";
      const stem = daeun?.stem?.name || daeun?.heavenlyStem || "";
      const branch = daeun?.branch?.name || daeun?.earthlyBranch || "";
      const displayText = ganji || `${stem}${branch}`;
      if (displayText) {
        dates.push({
          date: isKo ? `현재 대운: ${displayText}` : `Current Daeun: ${displayText}`,
          type: isKo ? "🔮 10년 대운" : "🔮 10-Year Cycle",
          reason: isKo ? "장기적 운세 흐름을 나타내는 대운 주기" : "Long-term fortune cycle",
          score: 70
        });
      }
    }
  }

  return dates.sort((a, b) => b.score - a.score).slice(0, 4);
}

// 3. 럭키 아이템 (용신 기반)
function getLuckyItems(saju: any, lang: string): { item: string; reason: string }[] {
  if (!saju?.fiveElements) return [];
  const isKo = lang === "ko";

  const sorted = Object.entries(saju.fiveElements).sort(([,a], [,b]) => (a as number) - (b as number));
  const weakest = sorted[0]?.[0];

  const items: Record<string, { ko: string[]; en: string[] }> = {
    wood: {
      ko: ["🕯️ 캔들/조명", "화 기운 활성화", "❤️ 빨간색 아이템", "열정 에너지", "☀️ 남쪽 방향", "화 기운 방위"],
      en: ["🕯️ Candles", "Fire activation", "❤️ Red items", "Passion energy", "☀️ South direction", "Fire direction"]
    },
    fire: {
      ko: ["🕯️ 캔들/조명", "화 기운 활성화", "❤️ 빨간색 아이템", "열정 에너지", "☀️ 남쪽 방향", "화 기운 방위"],
      en: ["🕯️ Candles", "Fire activation", "❤️ Red items", "Passion energy", "☀️ South direction", "Fire direction"]
    },
    earth: {
      ko: ["🏺 도자기/세라믹", "토 기운 안정", "🟤 베이지/갈색", "신뢰 에너지", "🏔️ 중앙 위치", "토 기운 중심"],
      en: ["🏺 Ceramics", "Earth stability", "🟤 Beige/brown", "Trust energy", "🏔️ Center position", "Earth center"]
    },
    metal: {
      ko: ["⌚ 메탈 악세서리", "금 기운 결단력", "🤍 흰색/은색", "정화 에너지", "🌅 서쪽 방향", "금 기운 방위"],
      en: ["⌚ Metal accessories", "Decisiveness", "🤍 White/silver", "Purifying", "🌅 West direction", "Metal direction"]
    },
    water: {
      ko: ["💧 수족관/분수", "수 기운 지혜", "💙 파란색/검정", "유연함 에너지", "🌊 북쪽 방향", "수 기운 방위"],
      en: ["💧 Aquarium/fountain", "Wisdom", "💙 Blue/black", "Flexibility", "🌊 North direction", "Water direction"]
    },
  };

  const itemList = items[weakest]?.[isKo ? "ko" : "en"] || [];
  const result: { item: string; reason: string }[] = [];

  for (let i = 0; i < itemList.length; i += 2) {
    if (itemList[i] && itemList[i + 1]) {
      result.push({ item: itemList[i], reason: itemList[i + 1] });
    }
  }

  return result;
}

// 4. 십신 분석 (성격 유형)
function getSibsinAnalysis(saju: any, lang: string): { category: string; count: number; description: string; emoji: string }[] {
  const isKo = lang === "ko";
  const distribution = getSibsinDistribution(saju);

  // 십신을 5대 카테고리로 분류
  const categories: Record<string, { sibsin: string[]; emoji: string; ko: string; en: string; koDesc: string; enDesc: string }> = {
    bigyeob: {
      sibsin: ["비견", "겁재"],
      emoji: "👥",
      ko: "비겁(比劫)",
      en: "Peers",
      koDesc: "독립심, 경쟁심, 자존감",
      enDesc: "Independence, competition, self-esteem"
    },
    siksang: {
      sibsin: ["식신", "상관"],
      emoji: "🎨",
      ko: "식상(食傷)",
      en: "Expression",
      koDesc: "창의력, 표현력, 재능 발산",
      enDesc: "Creativity, expression, talent"
    },
    jaeseong: {
      sibsin: ["편재", "정재"],
      emoji: "💰",
      ko: "재성(財星)",
      en: "Wealth",
      koDesc: "재물운, 사업 수완, 현실 감각",
      enDesc: "Wealth luck, business sense, practicality"
    },
    gwanseong: {
      sibsin: ["편관", "정관"],
      emoji: "👑",
      ko: "관성(官星)",
      en: "Status",
      koDesc: "명예, 직장운, 사회적 지위",
      enDesc: "Honor, career, social status"
    },
    inseong: {
      sibsin: ["편인", "정인"],
      emoji: "📚",
      ko: "인성(印星)",
      en: "Knowledge",
      koDesc: "학문, 자격증, 정신적 성장",
      enDesc: "Learning, credentials, spiritual growth"
    },
  };

  const result: { category: string; count: number; description: string; emoji: string }[] = [];

  for (const [, cat] of Object.entries(categories)) {
    let count = 0;
    for (const s of cat.sibsin) {
      count += distribution[s] || 0;
    }
    if (count > 0) {
      result.push({
        category: isKo ? cat.ko : cat.en,
        count,
        description: isKo ? cat.koDesc : cat.enDesc,
        emoji: cat.emoji
      });
    }
  }

  return result.sort((a, b) => b.count - a.count);
}

// 5. 건강 분석
function getHealthAnalysis(saju: any, lang: string): { organ: string; status: string; advice: string; emoji: string }[] {
  const isKo = lang === "ko";
  const fiveElements = saju?.fiveElements;
  if (!fiveElements) return [];

  const result: { organ: string; status: string; advice: string; emoji: string }[] = [];

  const elementHealth: Record<string, { organ: string; organEn: string; emoji: string; weakness: string; weaknessEn: string }> = {
    wood: { organ: "간/담/눈", organEn: "Liver/Eyes", emoji: "👁️", weakness: "녹색 채소, 눈 휴식 권장", weaknessEn: "Green vegetables, eye rest" },
    fire: { organ: "심장/혈관", organEn: "Heart/Blood", emoji: "❤️", weakness: "스트레스 관리, 적절한 운동", weaknessEn: "Stress management, moderate exercise" },
    earth: { organ: "위장/비장", organEn: "Stomach/Spleen", emoji: "🫁", weakness: "규칙적 식사, 과식 주의", weaknessEn: "Regular meals, avoid overeating" },
    metal: { organ: "폐/피부", organEn: "Lungs/Skin", emoji: "🫁", weakness: "호흡기 관리, 공기 질 주의", weaknessEn: "Respiratory care, air quality" },
    water: { organ: "신장/뼈", organEn: "Kidneys/Bones", emoji: "💧", weakness: "수분 섭취, 보온 필수", weaknessEn: "Hydration, keep warm" },
  };

  const sorted = Object.entries(fiveElements).sort(([,a], [,b]) => (a as number) - (b as number));

  // 가장 약한 오행 2개
  for (let i = 0; i < Math.min(2, sorted.length); i++) {
    const [element, value] = sorted[i];
    const health = elementHealth[element];
    if (health && (value as number) <= 15) {
      result.push({
        organ: isKo ? health.organ : health.organEn,
        status: isKo ? `${elementTraits[element]?.ko} 부족 (${value}%)` : `${elementTraits[element]?.en} weak (${value}%)`,
        advice: isKo ? health.weakness : health.weaknessEn,
        emoji: health.emoji
      });
    }
  }

  return result;
}

// 6. 종합 리포트 생성
function generateReport(saju: any, astro: any, lang: string, _theme: string): string {
  const isKo = lang === "ko";

  const rawDayMasterName = saju?.dayMaster?.name || saju?.dayMaster?.heavenlyStem;
  const dayMasterName = rawDayMasterName ? (tianGanMap[rawDayMasterName] || rawDayMasterName) : null;
  const dayMasterInfo = dayMasterName ? dayMasterData[dayMasterName] : null;
  const dayElement = dayMasterInfo?.element;

  const sunSign = findPlanetSign(astro, "sun");
  const moonSign = findPlanetSign(astro, "moon");
  const sunData = sunSign ? zodiacData[sunSign] : null;
  const moonData = moonSign ? zodiacData[moonSign] : null;

  const fiveElements = saju?.fiveElements || {};
  const sorted = Object.entries(fiveElements).sort(([,a], [,b]) => (b as number) - (a as number));
  const strongest = sorted[0];
  const weakest = sorted[sorted.length - 1];

  if (!dayMasterInfo) {
    return isKo ? "사주 데이터를 분석 중입니다..." : "Analyzing Saju data...";
  }

  const report = isKo
    ? `【사주×점성 융합 분석】

${dayMasterInfo.hanja}${dayMasterInfo.ko.replace('갑목', '금')}(${dayElement ? elementTraits[dayElement]?.ko : ""}) 일간을 가진 당신은 ${dayMasterInfo.personality.ko}입니다.

${sunData && moonData
  ? `태양 ${sunData.ko}(${sunData.trait.ko})와 달 ${moonData.ko}(${moonData.trait.ko})의 조합으로, 외적으로는 ${sunData.trait.ko} 모습을, 내면에서는 ${moonData.trait.ko} 감성을 지닙니다.`
  : sunData
  ? `태양 ${sunData.ko}의 영향으로 ${sunData.trait.ko} 성향이 드러납니다.`
  : ""}

【오행 밸런스】
${strongest ? `강점: ${elementTraits[strongest[0]]?.ko}(${strongest[1]}%) - ${strongest[0] === "wood" ? "성장과 발전" : strongest[0] === "fire" ? "열정과 표현" : strongest[0] === "earth" ? "안정과 신뢰" : strongest[0] === "metal" ? "결단과 실행" : "지혜와 유연함"}의 에너지가 풍부합니다.` : ""}
${weakest ? `보완점: ${elementTraits[weakest[0]]?.ko}(${weakest[1]}%) - 이 기운을 보완하면 더 균형 잡힌 삶을 살 수 있습니다.` : ""}

${dayMasterInfo.strength.ko}이 장점이며, ${dayMasterInfo.weakness.ko}은 주의가 필요합니다.`

    : `【Saju × Astrology Fusion Analysis】

As ${dayMasterInfo.en} (${dayElement ? elementTraits[dayElement]?.en : ""}), you are ${dayMasterInfo.personality.en}.

${sunData && moonData
  ? `With Sun in ${sunData.en} (${sunData.trait.en}) and Moon in ${moonData.en} (${moonData.trait.en}), you show ${sunData.trait.en} externally while feeling ${moonData.trait.en} internally.`
  : sunData
  ? `Sun in ${sunData.en} influences your ${sunData.trait.en} tendencies.`
  : ""}

【Five Elements Balance】
${strongest ? `Strength: ${elementTraits[strongest[0]]?.en} (${strongest[1]}%) - Rich in ${strongest[0] === "wood" ? "growth" : strongest[0] === "fire" ? "passion" : strongest[0] === "earth" ? "stability" : strongest[0] === "metal" ? "decisiveness" : "wisdom"} energy.` : ""}
${weakest ? `To improve: ${elementTraits[weakest[0]]?.en} (${weakest[1]}%) - Boosting this brings better balance.` : ""}

Your strengths are ${dayMasterInfo.strength.en}, while ${dayMasterInfo.weakness.en} needs attention.`;

  return report;
}

// ============================================================
// 메인 컴포넌트
// ============================================================

export default function FunInsights({ saju, astro, lang = "ko", theme = "", className = "" }: Props) {
  const isKo = lang === "ko";

  const hasFiveElements = Boolean(saju?.fiveElements && Object.keys(saju.fiveElements).length > 0);
  const hasValidAstro = Boolean(findPlanetSign(astro, "sun"));

  const data = useMemo(() => {
    if (!hasFiveElements && !hasValidAstro) {
      return null;
    }

    const rawDayMasterName = saju?.dayMaster?.name || saju?.dayMaster?.heavenlyStem || "갑";
    const dayMasterName = tianGanMap[rawDayMasterName] || rawDayMasterName;
    const dayMasterInfo = dayMasterData[dayMasterName] || dayMasterData["갑"];
    const dayElement = dayMasterInfo.element;

    const fiveElements = saju?.fiveElements || { wood: 20, fire: 20, earth: 20, metal: 20, water: 20 };
    const sorted = Object.entries(fiveElements).sort(([,a], [,b]) => (b as number) - (a as number));

    const sunSign = findPlanetSign(astro, "sun");
    const moonSign = findPlanetSign(astro, "moon");
    const ascSign = astro?.ascendant?.sign?.toLowerCase() || null;

    return {
      dayMasterName,
      dayMasterInfo,
      dayElement,
      fiveElements,
      strongest: sorted[0],
      weakest: sorted[sorted.length - 1],
      sunSign,
      moonSign,
      ascSign,
      crossAnalysis: getCrossAnalysis(saju, astro, lang),
      dates: getRecommendedDates(saju, astro, lang),
      luckyItems: getLuckyItems(saju, lang),
      sibsinAnalysis: getSibsinAnalysis(saju, lang),
      healthAnalysis: getHealthAnalysis(saju, lang),
      report: generateReport(saju, astro, lang, theme),
    };
  }, [saju, astro, lang, theme, hasFiveElements, hasValidAstro]);

  if (!data) {
    return null;
  }

  // 오행 총합 계산 및 정규화
  const totalElements = Object.values(data.fiveElements).reduce((a, b) => (a as number) + (b as number), 0) as number;
  const normalizedElements = Object.entries(data.fiveElements).map(([el, val]) => ({
    element: el,
    value: totalElements > 0 ? Math.round(((val as number) / totalElements) * 100) : 20,
    raw: val as number,
  })).sort((a, b) => b.value - a.value);

  const sunData = data.sunSign ? zodiacData[data.sunSign] : null;
  const moonData = data.moonSign ? zodiacData[data.moonSign] : null;

  return (
    <div className={`mt-8 space-y-6 ${className}`}>
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 섹션 1: 핵심 정체성 - 히어로 카드 */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-purple-900/40 to-slate-900 border border-purple-500/30 p-6 md:p-8">
        {/* 배경 글로우 */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl" />

        {/* 타이틀 */}
        <div className="relative flex items-center gap-3 mb-6">
          <span className="text-3xl">✦</span>
          <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-purple-300 via-pink-300 to-amber-300 bg-clip-text text-transparent">
            {isKo ? "사주×점성 통합 분석" : "Saju × Astrology Fusion"}
          </h2>
        </div>

        {/* 핵심 한 줄 요약 */}
        <div className="relative mb-6">
          <p className="text-lg md:text-xl text-gray-100 leading-relaxed">
            {isKo ? (
              <>
                당신의 일간은 <span className="text-amber-400 font-bold">{data.dayMasterInfo.hanja}({data.dayMasterInfo.ko.charAt(0)})</span>이며,
                태양은 <span className="text-purple-400 font-bold">{sunData?.ko || "정보없음"}</span>,
                달은 <span className="text-blue-400 font-bold">{moonData?.ko || "정보없음"}</span>에 위치합니다.
              </>
            ) : (
              <>
                Your Day Master is <span className="text-amber-400 font-bold">{data.dayMasterInfo.en}</span>,
                Sun in <span className="text-purple-400 font-bold">{sunData?.en || "N/A"}</span>,
                Moon in <span className="text-blue-400 font-bold">{moonData?.en || "N/A"}</span>.
              </>
            )}
          </p>
        </div>

        {/* 오행 강/약 뱃지 */}
        <div className="relative flex flex-wrap items-center gap-3 mb-6">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full" style={{ backgroundColor: elementTraits[data.strongest[0]]?.bgColor, border: `1px solid ${elementTraits[data.strongest[0]]?.color}` }}>
            <span className="text-xl">{elementTraits[data.strongest[0]]?.emoji}</span>
            <span className="font-medium" style={{ color: elementTraits[data.strongest[0]]?.color }}>
              {isKo ? `${elementTraits[data.strongest[0]]?.ko} 강함` : `${elementTraits[data.strongest[0]]?.en} Strong`}
            </span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full" style={{ backgroundColor: elementTraits[data.weakest[0]]?.bgColor, border: `1px solid ${elementTraits[data.weakest[0]]?.color}` }}>
            <span className="text-xl">{elementTraits[data.weakest[0]]?.emoji}</span>
            <span className="font-medium" style={{ color: elementTraits[data.weakest[0]]?.color }}>
              {isKo ? `${elementTraits[data.weakest[0]]?.ko} 보완 필요` : `${elementTraits[data.weakest[0]]?.en} Needs Boost`}
            </span>
          </div>
        </div>

        {/* 성격/성향 요약 */}
        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
            <div className="text-amber-400 text-sm mb-1">{isKo ? "💡 핵심 성향" : "💡 Core Trait"}</div>
            <p className="text-white font-medium">{isKo ? data.dayMasterInfo.personality.ko : data.dayMasterInfo.personality.en}</p>
          </div>
          <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
            <div className="text-green-400 text-sm mb-1">{isKo ? "✨ 강점" : "✨ Strength"}</div>
            <p className="text-white font-medium">{isKo ? data.dayMasterInfo.strength.ko : data.dayMasterInfo.strength.en}</p>
          </div>
          <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
            <div className="text-rose-400 text-sm mb-1">{isKo ? "⚠️ 주의점" : "⚠️ Watch Out"}</div>
            <p className="text-white font-medium">{isKo ? data.dayMasterInfo.weakness.ko : data.dayMasterInfo.weakness.en}</p>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 섹션 2: 오행 밸런스 - 시각적 차트 */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 오행 밸런스 */}
        <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-emerald-900/20 border border-emerald-500/20 p-6">
          <div className="flex items-center gap-2 mb-5">
            <span className="text-2xl">☯️</span>
            <h3 className="text-lg font-bold text-white">{isKo ? "오행 밸런스" : "Five Elements Balance"}</h3>
          </div>

          {/* 원형 표시 */}
          <div className="flex justify-center gap-3 mb-6">
            {normalizedElements.map(({ element, value }) => {
              const t = elementTraits[element];
              const size = Math.max(48, Math.min(80, 40 + value * 0.8));
              return (
                <div key={element} className="flex flex-col items-center gap-2">
                  <div
                    className="rounded-full flex items-center justify-center transition-all duration-500 shadow-lg"
                    style={{
                      width: size,
                      height: size,
                      backgroundColor: t?.bgColor,
                      border: `3px solid ${t?.color}`,
                      boxShadow: `0 0 20px ${t?.color}40`
                    }}
                  >
                    <span style={{ fontSize: size * 0.45 }}>{t?.emoji}</span>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-white text-lg">{value}%</div>
                    <div className="text-xs text-gray-400">{isKo ? t?.ko.split("(")[0] : t?.en}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 바 차트 */}
          <div className="space-y-3">
            {normalizedElements.map(({ element, value }) => {
              const t = elementTraits[element];
              return (
                <div key={element} className="flex items-center gap-3">
                  <span className="w-8 text-xl text-center">{t?.emoji}</span>
                  <div className="flex-1 h-4 bg-gray-800/50 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: `${value}%`,
                        backgroundColor: t?.color,
                        boxShadow: `0 0 10px ${t?.color}`
                      }}
                    />
                  </div>
                  <span className="w-12 text-right font-mono text-sm font-bold" style={{ color: t?.color }}>{value}%</span>
                </div>
              );
            })}
          </div>

          {/* 요약 */}
          <div className="mt-4 pt-4 border-t border-white/10 text-sm text-gray-300">
            {isKo ? (
              <>
                <span className="text-green-400">💪 강점:</span> {elementTraits[data.strongest[0]]?.ko} ({normalizedElements[0]?.value}%)
                {" | "}
                <span className="text-amber-400">🌱 보완:</span> {elementTraits[data.weakest[0]]?.ko} ({normalizedElements[normalizedElements.length - 1]?.value}%)
              </>
            ) : (
              <>
                <span className="text-green-400">💪 Strong:</span> {elementTraits[data.strongest[0]]?.en} ({normalizedElements[0]?.value}%)
                {" | "}
                <span className="text-amber-400">🌱 Boost:</span> {elementTraits[data.weakest[0]]?.en} ({normalizedElements[normalizedElements.length - 1]?.value}%)
              </>
            )}
          </div>
        </div>

        {/* 보완 아이템 */}
        <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-pink-900/20 border border-pink-500/20 p-6">
          <div className="flex items-center gap-2 mb-5">
            <span className="text-2xl">{elementTraits[data.weakest[0]]?.emoji}</span>
            <h3 className="text-lg font-bold text-white">
              {isKo ? `${elementTraits[data.weakest[0]]?.ko} 보완` : `Boost ${elementTraits[data.weakest[0]]?.en}`}
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {data.luckyItems.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:border-pink-500/30 transition-all"
              >
                <div className="text-3xl">{item.item.split(" ")[0]}</div>
                <div className="flex-1">
                  <p className="text-white font-medium">{item.item.replace(/^[^\s]+\s/, "")}</p>
                  <p className="text-sm text-pink-300">{item.reason}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 섹션 3: 동서양 융합 & 추천 시기 */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 동서양 융합 분석 */}
        <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-purple-900/20 border border-purple-500/20 p-6">
          <div className="flex items-center gap-2 mb-5">
            <span className="text-2xl">✨</span>
            <h3 className="text-lg font-bold text-white">{isKo ? "동서양 융합" : "East-West Fusion"}</h3>
          </div>

          <div className="space-y-4">
            {data.crossAnalysis.map((item, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{item.emoji}</span>
                  <span className="text-purple-300 font-bold">{item.title}</span>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed">{item.insight}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 추천 시기 */}
        <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-amber-900/20 border border-amber-500/20 p-6">
          <div className="flex items-center gap-2 mb-5">
            <span className="text-2xl">📅</span>
            <h3 className="text-lg font-bold text-white">{isKo ? "추천 시기" : "Best Timing"}</h3>
          </div>

          <div className="space-y-3">
            {data.dates.map((d, idx) => (
              <div
                key={idx}
                className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10"
              >
                <div className="text-2xl">{d.type.includes("🌟") ? "🌟" : d.type.includes("⭐") ? "⭐" : "🔮"}</div>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-amber-300 font-bold">{d.type.replace(/🌟|⭐|🔮/g, "").trim()}</span>
                    <span className="text-white font-medium">{d.date}</span>
                  </div>
                  <p className="text-sm text-gray-400">{d.reason}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 섹션 4: 건강 주의 포인트 */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {data.healthAnalysis.length > 0 && (
        <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-red-900/20 border border-red-500/20 p-6">
          <div className="flex items-center gap-2 mb-5">
            <span className="text-2xl">🏥</span>
            <h3 className="text-lg font-bold text-white">{isKo ? "건강 주의 포인트" : "Health Focus"}</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.healthAnalysis.map((item, idx) => (
              <div key={idx} className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="text-4xl">{item.emoji}</div>
                <div className="flex-1">
                  <p className="text-white font-bold mb-1">{item.organ}</p>
                  <p className="text-red-300 text-sm mb-2">{item.status}</p>
                  <p className="text-gray-400 text-sm flex items-start gap-1">
                    <span>💡</span>
                    <span>{item.advice}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 섹션 5: 하단 요약 */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="rounded-2xl bg-gradient-to-r from-indigo-900/30 to-purple-900/30 border border-indigo-500/20 p-5">
        <div className="flex flex-wrap justify-center gap-8">
          <div className="text-center">
            <div className="text-3xl mb-1">{data.dayMasterInfo.animal}</div>
            <div className="text-sm text-purple-300">{isKo ? "일간" : "Day Master"}</div>
            <div className="font-bold text-white">{data.dayMasterName}</div>
          </div>
          {sunData && (
            <div className="text-center">
              <div className="text-3xl mb-1">{sunData.emoji}</div>
              <div className="text-sm text-purple-300">{isKo ? "태양" : "Sun"}</div>
              <div className="font-bold text-white">{isKo ? sunData.ko : sunData.en}</div>
            </div>
          )}
          {moonData && (
            <div className="text-center">
              <div className="text-3xl mb-1">🌙</div>
              <div className="text-sm text-purple-300">{isKo ? "달" : "Moon"}</div>
              <div className="font-bold text-white">{isKo ? moonData.ko : moonData.en}</div>
            </div>
          )}
          <div className="text-center">
            <div className="text-3xl mb-1">{elementTraits[data.dayElement]?.emoji}</div>
            <div className="text-sm text-purple-300">{isKo ? "주 오행" : "Element"}</div>
            <div className="font-bold text-white">{isKo ? elementTraits[data.dayElement]?.ko : elementTraits[data.dayElement]?.en}</div>
          </div>
        </div>
      </div>

      {/* 푸터 */}
      <p className="text-center text-xs text-gray-500">
        {isKo ? "* 10천간 × 12황도대 × 5오행 × 10십신 = 6000가지 고유 조합 기반 분석" : "* Analysis based on 10 stems × 12 signs × 5 elements × 10 sibsin = 6000 unique combinations"}
      </p>
    </div>
  );
}
