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

const elementTraits: Record<string, { ko: string; en: string; emoji: string; color: string }> = {
  wood: { ko: "목(木)", en: "Wood", emoji: "🌳", color: "#22c55e" },
  fire: { ko: "화(火)", en: "Fire", emoji: "🔥", color: "#ef4444" },
  earth: { ko: "토(土)", en: "Earth", emoji: "🏔️", color: "#eab308" },
  metal: { ko: "금(金)", en: "Metal", emoji: "⚔️", color: "#94a3b8" },
  water: { ko: "수(水)", en: "Water", emoji: "💧", color: "#3b82f6" },
};

const elementKeyMap: Record<string, string> = {
  "목": "wood", "화": "fire", "토": "earth", "금": "metal", "수": "water",
  "木": "wood", "火": "fire", "土": "earth", "金": "metal", "水": "water",
};

// 천간 한자 → 한글 매핑 (사주 API에서 한자로 올 수 있음)
const tianGanMap: Record<string, string> = {
  "甲": "갑", "乙": "을", "丙": "병", "丁": "정", "戊": "무",
  "己": "기", "庚": "경", "辛": "신", "壬": "임", "癸": "계",
  // 영어 이름도 지원
  "Gab": "갑", "Eul": "을", "Byung": "병", "Jung": "정", "Mu": "무",
  "Gi": "기", "Gyung": "경", "Shin": "신", "Im": "임", "Gye": "계",
};

// 일간 10개 × 특성
const dayMasterData: Record<string, {
  ko: string; en: string; animal: string; element: string;
  personality: { ko: string; en: string };
  strength: { ko: string; en: string };
  weakness: { ko: string; en: string };
}> = {
  "갑": { ko: "갑목", en: "Gab Wood", animal: "🦁", element: "wood",
    personality: { ko: "큰 나무처럼 듬직하고 정직한 리더형", en: "Honest leader like a mighty tree" },
    strength: { ko: "추진력, 결단력, 책임감", en: "Drive, decisiveness, responsibility" },
    weakness: { ko: "고집, 융통성 부족", en: "Stubbornness, inflexibility" }
  },
  "을": { ko: "을목", en: "Eul Wood", animal: "🦊", element: "wood",
    personality: { ko: "덩굴처럼 유연하고 적응력 있는 타입", en: "Flexible and adaptive like a vine" },
    strength: { ko: "적응력, 인내심, 부드러움", en: "Adaptability, patience, gentleness" },
    weakness: { ko: "우유부단, 의존적", en: "Indecisive, dependent" }
  },
  "병": { ko: "병화", en: "Byung Fire", animal: "🦅", element: "fire",
    personality: { ko: "태양처럼 밝고 열정적인 타입", en: "Bright and passionate like the sun" },
    strength: { ko: "열정, 낙천성, 카리스마", en: "Passion, optimism, charisma" },
    weakness: { ko: "성급함, 산만함", en: "Impatience, scattered focus" }
  },
  "정": { ko: "정화", en: "Jung Fire", animal: "🦋", element: "fire",
    personality: { ko: "촛불처럼 따뜻하고 섬세한 타입", en: "Warm and delicate like candlelight" },
    strength: { ko: "세심함, 예술성, 배려", en: "Attentiveness, artistry, caring" },
    weakness: { ko: "예민함, 걱정 많음", en: "Sensitivity, worry" }
  },
  "무": { ko: "무토", en: "Mu Earth", animal: "🐻", element: "earth",
    personality: { ko: "산처럼 묵직하고 신뢰감 있는 타입", en: "Reliable and steady like a mountain" },
    strength: { ko: "안정감, 포용력, 신뢰", en: "Stability, embrace, trust" },
    weakness: { ko: "고집, 변화 거부", en: "Stubbornness, resistance to change" }
  },
  "기": { ko: "기토", en: "Gi Earth", animal: "🐘", element: "earth",
    personality: { ko: "평야처럼 넓고 포용적인 타입", en: "Broad and nurturing like plains" },
    strength: { ko: "배려심, 중재력, 실용성", en: "Caring, mediation, practicality" },
    weakness: { ko: "우유부단, 자기주장 부족", en: "Indecisive, lack of assertiveness" }
  },
  "경": { ko: "경금", en: "Gyung Metal", animal: "🦈", element: "metal",
    personality: { ko: "칼처럼 날카롭고 결단력 있는 타입", en: "Sharp and decisive like a blade" },
    strength: { ko: "결단력, 정의감, 실행력", en: "Decisiveness, justice, execution" },
    weakness: { ko: "냉정함, 타협 어려움", en: "Coldness, difficulty compromising" }
  },
  "신": { ko: "신금", en: "Shin Metal", animal: "🦚", element: "metal",
    personality: { ko: "보석처럼 세련되고 빛나는 타입", en: "Refined and sparkling like a gem" },
    strength: { ko: "심미안, 완벽주의, 매력", en: "Aesthetic sense, perfectionism, charm" },
    weakness: { ko: "까다로움, 비판적", en: "Picky, critical" }
  },
  "임": { ko: "임수", en: "Im Water", animal: "🐋", element: "water",
    personality: { ko: "바다처럼 깊고 지혜로운 타입", en: "Deep and wise like the ocean" },
    strength: { ko: "지혜, 포용력, 직관", en: "Wisdom, embrace, intuition" },
    weakness: { ko: "우울함, 감정 기복", en: "Melancholy, mood swings" }
  },
  "계": { ko: "계수", en: "Gye Water", animal: "🦢", element: "water",
    personality: { ko: "시냇물처럼 맑고 순수한 타입", en: "Pure and clear like a stream" },
    strength: { ko: "순수함, 섬세함, 창의성", en: "Purity, delicacy, creativity" },
    weakness: { ko: "예민함, 소극적", en: "Sensitivity, passiveness" }
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

// 월별 오행 (절기 기준 대략적)
const monthElements: Record<number, string> = {
  1: "water", 2: "wood", 3: "wood", 4: "earth", 5: "fire", 6: "fire",
  7: "earth", 8: "metal", 9: "metal", 10: "earth", 11: "water", 12: "water"
};

// ============================================================
// 계산 함수들
// ============================================================

// 헬퍼: astrology 데이터에서 planet 찾기 (배열 형태 처리)
function findPlanetSign(astro: any, planetName: string): string | null {
  // 1. planets 배열에서 찾기 (실제 API 구조)
  if (Array.isArray(astro?.planets)) {
    const planet = astro.planets.find((p: any) => p?.name?.toLowerCase() === planetName.toLowerCase());
    if (planet?.sign) return planet.sign.toLowerCase();
  }
  // 2. planets 객체에서 찾기 (대체 구조)
  if (astro?.planets?.[planetName]?.sign) {
    return astro.planets[planetName].sign.toLowerCase();
  }
  // 3. facts에서 찾기
  if (astro?.facts?.[planetName]?.sign) {
    return astro.facts[planetName].sign.toLowerCase();
  }
  return null;
}

// 1. 동서양 융합 분석 (사주×점성)
function getCrossAnalysis(saju: any, astro: any, lang: string): { title: string; insight: string; emoji: string }[] {
  const insights: { title: string; insight: string; emoji: string }[] = [];
  const isKo = lang === "ko";

  // dayMaster.name이 한자일 수 있으므로 한글로 변환
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
        ? `${dayMasterInfo.personality.ko}와 ${sunData.trait.ko} 성향이 만나 ${synergy}를 이룹니다. ${isHarmony ? "내면과 외면이 일관되어 진정성이 느껴집니다." : "다양한 면모를 가진 복합적 매력이 있습니다."}`
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
        ? `${strongestInfo?.ko || strongestEl} 기운이 강한 사주에 ${moonData.ko} 달이 더해져 ${moonData.trait.ko} 감성을 갖습니다. 감정 표현과 내면 세계에서 이 조합이 드러납니다.`
        : `Strong ${strongestInfo?.en || strongestEl} energy combined with ${moonData.en} Moon gives you ${moonData.trait.en} emotions. This combination shows in emotional expression and inner world.`
    });
  }

  return insights;
}

// 2. 추천 시기 계산 (사주 기반 정확한 날짜)
function getRecommendedDates(saju: any, astro: any, lang: string): { date: string; type: string; reason: string; score: number }[] {
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

  // 대운 정보 - unse.daeun 또는 daeWoon.list 둘 다 지원
  const daeunList = saju?.unse?.daeun || saju?.daeWoon?.list || [];
  if (daeunList.length > 0) {
    const birthYear = parseInt(saju.birthDate?.split("-")[0]) || 1990;
    const age = currentYear - birthYear;
    const startAge = saju?.unse?.startAge || saju?.daeWoon?.startAge || 0;
    const daeunIndex = Math.max(0, Math.floor((age - startAge) / 10));

    if (daeunIndex < daeunList.length) {
      const daeun = daeunList[daeunIndex];
      // 다양한 데이터 구조 지원: { ganji } 또는 { stem, branch } 또는 { heavenlyStem, earthlyBranch }
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

  // 점성 트랜짓
  const jupiterSign = findPlanetSign(astro, "jupiter");
  if (jupiterSign) {
    const jupData = zodiacData[jupiterSign];
    if (jupData) {
      dates.push({
        date: isKo ? `${currentYear}년 목성 ${jupData.ko}` : `${currentYear} Jupiter in ${jupData.en}`,
        type: isKo ? "♃ 목성 트랜짓" : "♃ Jupiter Transit",
        reason: isKo ? `목성이 ${jupData.ko}에서 확장과 행운 에너지 제공` : `Jupiter in ${jupData.en} brings expansion and luck`,
        score: 72
      });
    }
  }

  return dates.sort((a, b) => b.score - a.score).slice(0, 4);
}

// 3. 럭키 아이템 (부족한 오행 보완)
function getLuckyItems(saju: any, lang: string): { item: string; reason: string }[] {
  if (!saju?.fiveElements) return [];
  const isKo = lang === "ko";

  const sorted = Object.entries(saju.fiveElements).sort(([,a], [,b]) => (a as number) - (b as number));
  const weakest = sorted[0]?.[0];

  const items: Record<string, { ko: string[]; en: string[] }> = {
    wood: {
      ko: ["🌿 녹색 식물 - 목 기운 보충", "📚 나무 소재 가구 - 성장 에너지", "🎋 동쪽 방향 - 목 기운 방위"],
      en: ["🌿 Green plants - Wood boost", "📚 Wooden items - Growth energy", "🎋 East direction - Wood direction"]
    },
    fire: {
      ko: ["🕯️ 캔들/조명 - 화 기운 활성화", "❤️ 빨간색 아이템 - 열정 에너지", "☀️ 남쪽 방향 - 화 기운 방위"],
      en: ["🕯️ Candles - Fire activation", "❤️ Red items - Passion energy", "☀️ South direction - Fire direction"]
    },
    earth: {
      ko: ["🏺 도자기/세라믹 - 토 기운 안정", "🟤 베이지/갈색 - 신뢰 에너지", "🏔️ 중앙 위치 - 토 기운 중심"],
      en: ["🏺 Ceramics - Earth stability", "🟤 Beige/brown - Trust energy", "🏔️ Center position - Earth center"]
    },
    metal: {
      ko: ["⌚ 메탈 악세서리 - 금 기운 결단력", "🤍 흰색/은색 - 정화 에너지", "🌅 서쪽 방향 - 금 기운 방위"],
      en: ["⌚ Metal accessories - Decisiveness", "🤍 White/silver - Purifying", "🌅 West direction - Metal direction"]
    },
    water: {
      ko: ["💧 수족관/분수 - 수 기운 지혜", "💙 파란색/검정 - 유연함 에너지", "🌊 북쪽 방향 - 수 기운 방위"],
      en: ["💧 Aquarium/fountain - Wisdom", "💙 Blue/black - Flexibility", "🌊 North direction - Water direction"]
    },
  };

  return (items[weakest]?.[isKo ? "ko" : "en"] || []).map(item => {
    const [name, reason] = item.split(" - ");
    return { item: name, reason };
  });
}

// 4. 종합 리포트 생성 (600자, 사주×점성 기반)
function generateReport(saju: any, astro: any, lang: string, theme: string): string {
  const isKo = lang === "ko";

  // dayMaster.name이 한자일 수 있으므로 한글로 변환
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

  // 테마별 포커스
  const themeFocus: Record<string, { ko: string; en: string }> = {
    focus_love: {
      ko: `연애 관점에서, ${dayMasterInfo.ko}의 ${dayMasterInfo.strength.ko} 특성이 매력 포인트입니다. ${sunData ? `${sunData.ko} 태양의 ${sunData.trait.ko} 성향과 결합하여` : ""} 진정성 있는 관계를 추구합니다.`,
      en: `In love, ${dayMasterInfo.en}'s ${dayMasterInfo.strength.en} traits are attractive. ${sunData ? `Combined with ${sunData.en} Sun's ${sunData.trait.en} nature,` : ""} you seek authentic relationships.`
    },
    focus_career: {
      ko: `커리어 관점에서, ${strongest ? `${elementTraits[strongest[0]]?.ko} 기운이 ${strongest[1]}%로 강해` : ""} ${dayMasterInfo.strength.ko}을 발휘하기 좋습니다. ${sunData ? `${sunData.ko}의 ${sunData.trait.ko} 특성이 직업적 성공에 기여합니다.` : ""}`,
      en: `Career-wise, ${strongest ? `strong ${elementTraits[strongest[0]]?.en} at ${strongest[1]}%` : ""} supports your ${dayMasterInfo.strength.en}. ${sunData ? `${sunData.en}'s ${sunData.trait.en} nature contributes to professional success.` : ""}`
    },
    default: {
      ko: `${dayMasterInfo.ko}(${dayElement ? elementTraits[dayElement]?.ko : ""}) 일간을 가진 당신은 ${dayMasterInfo.personality.ko}입니다.`,
      en: `As ${dayMasterInfo.en} (${dayElement ? elementTraits[dayElement]?.en : ""}), you are ${dayMasterInfo.personality.en}.`
    }
  };

  const focus = themeFocus[theme] || themeFocus.default;

  // 조합별 고유 리포트
  const report = isKo
    ? `【사주×점성 융합 분석】

${focus.ko}

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

${focus.en}

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

  // 데이터 유효성 체크 - fiveElements가 있으면 표시
  const hasFiveElements = Boolean(saju?.fiveElements && Object.keys(saju.fiveElements).length > 0);
  const hasValidAstro = Boolean(findPlanetSign(astro, "sun"));

  const data = useMemo(() => {
    // 안전 가드
    if (!hasFiveElements && !hasValidAstro) {
      return null;
    }

    // dayMaster.name이 한자일 수 있으므로 한글로 변환
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
      report: generateReport(saju, astro, lang, theme),
    };
  }, [saju, astro, lang, theme, hasFiveElements, hasValidAstro]);

  // 데이터가 아예 없으면 표시하지 않음
  if (!data) {
    return null;
  }

  return (
    <div className={`mt-8 ${className}`}>
      {/* 타이틀 */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
        <span className="text-purple-400 text-sm font-medium">
          {isKo ? "🔮 사주×점성 융합 인사이트" : "🔮 Saju × Astrology Fusion Insights"}
        </span>
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
      </div>

      {/* 종합 리포트 */}
      <div className="bg-gradient-to-br from-slate-900/50 to-purple-900/30 border border-purple-500/20 rounded-2xl p-5 mb-4">
        <pre className="text-gray-200 text-sm whitespace-pre-wrap font-sans leading-relaxed">
          {data.report}
        </pre>
      </div>

      {/* 4개 카드 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* 1. 동서양 융합 분석 */}
        <div className="bg-gradient-to-br from-purple-900/30 to-indigo-900/30 border border-purple-500/20 rounded-2xl p-5">
          <h3 className="text-white font-bold text-lg mb-3">
            {isKo ? "✨ 동서양 융합" : "✨ East-West Fusion"}
          </h3>
          <div className="space-y-3">
            {data.crossAnalysis.map((item, idx) => (
              <div key={idx} className="bg-white/5 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span>{item.emoji}</span>
                  <span className="text-purple-300 font-medium text-sm">{item.title}</span>
                </div>
                <p className="text-gray-300 text-xs">{item.insight}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 2. 추천 시기 */}
        <div className="bg-gradient-to-br from-amber-900/30 to-orange-900/30 border border-amber-500/20 rounded-2xl p-5">
          <h3 className="text-white font-bold text-lg mb-3">
            {isKo ? "📅 추천 시기" : "📅 Best Timing"}
          </h3>
          <div className="space-y-2">
            {data.dates.map((d, idx) => (
              <div key={idx} className="bg-white/5 rounded-lg px-3 py-2">
                <div className="flex justify-between items-center">
                  <span className="text-amber-200 font-medium text-sm">{d.type}</span>
                  <span className="text-white text-sm">{d.date}</span>
                </div>
                <p className="text-gray-400 text-xs">{d.reason}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 3. 오행 밸런스 */}
        <div className="bg-gradient-to-br from-emerald-900/30 to-teal-900/30 border border-emerald-500/20 rounded-2xl p-5">
          <h3 className="text-white font-bold text-lg mb-3">
            {isKo ? "☯️ 오행 밸런스" : "☯️ Five Elements"}
          </h3>
          <div className="space-y-2">
            {Object.entries(data.fiveElements).map(([el, val]) => {
              const t = elementTraits[el];
              return (
                <div key={el} className="flex items-center gap-2">
                  <span className="w-6 text-center">{t?.emoji}</span>
                  <span className="w-14 text-xs text-gray-400">{isKo ? t?.ko : t?.en}</span>
                  <div className="flex-1 bg-gray-700/50 rounded-full h-2">
                    <div className="h-2 rounded-full" style={{ width: `${Math.min(100, (val as number) * 3)}%`, backgroundColor: t?.color }} />
                  </div>
                  <span className="text-xs text-gray-400 w-8 text-right">{val as number}%</span>
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-gray-400">
            {isKo ? `💪 ${elementTraits[data.strongest[0]]?.ko} 강점 | 🌱 ${elementTraits[data.weakest[0]]?.ko} 보완 필요` : `💪 ${elementTraits[data.strongest[0]]?.en} strong | 🌱 ${elementTraits[data.weakest[0]]?.en} needs boost`}
          </p>
        </div>

        {/* 4. 럭키 아이템 */}
        <div className="bg-gradient-to-br from-pink-900/30 to-rose-900/30 border border-pink-500/20 rounded-2xl p-5">
          <h3 className="text-white font-bold text-lg mb-3">
            {isKo ? `🍀 ${elementTraits[data.weakest[0]]?.ko} 보완` : `🍀 Boost ${elementTraits[data.weakest[0]]?.en}`}
          </h3>
          <div className="space-y-2">
            {data.luckyItems.map((item, idx) => (
              <div key={idx} className="bg-white/5 rounded-lg px-3 py-2">
                <p className="text-white text-sm">{item.item}</p>
                <p className="text-pink-300 text-xs">{item.reason}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 하단 요약 */}
      <div className="mt-4 bg-gradient-to-r from-indigo-900/30 to-purple-900/30 border border-indigo-500/20 rounded-2xl p-4">
        <div className="flex flex-wrap justify-center gap-6 text-sm">
          <div className="text-center">
            <span className="text-2xl">{data.dayMasterInfo.animal}</span>
            <p className="text-purple-300">{isKo ? "일간" : "Day"}: {data.dayMasterName}</p>
          </div>
          {data.sunSign && zodiacData[data.sunSign] && (
            <div className="text-center">
              <span className="text-2xl">{zodiacData[data.sunSign].emoji}</span>
              <p className="text-purple-300">{isKo ? "태양" : "Sun"}: {isKo ? zodiacData[data.sunSign].ko : zodiacData[data.sunSign].en}</p>
            </div>
          )}
          {data.moonSign && zodiacData[data.moonSign] && (
            <div className="text-center">
              <span className="text-2xl">🌙</span>
              <p className="text-purple-300">{isKo ? "달" : "Moon"}: {isKo ? zodiacData[data.moonSign].ko : zodiacData[data.moonSign].en}</p>
            </div>
          )}
        </div>
      </div>

      <p className="text-center text-xs text-gray-500 mt-4">
        {isKo ? "* 10천간 × 12황도대 × 5오행 = 600가지 고유 조합 기반 분석" : "* Analysis based on 10 stems × 12 signs × 5 elements = 600 unique combinations"}
      </p>
    </div>
  );
}
