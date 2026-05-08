type AreaScoreAnalysis = {
  sajuFactorKeys: string[];
  astroFactorKeys: string[];
};

type AlertAnalysis = {
  grade: number;
  sajuFactorKeys: string[];
  astroFactorKeys: string[];
  crossVerified: boolean;
};

export function calculateAreaScores(
  overallScore: number,
  analysis: AreaScoreAnalysis,
  targetDate: Date
): { love: number; career: number; wealth: number; health: number } {
  const baseScore = overallScore;
  const variance = 12;

  let loveAdj = 0;
  let careerAdj = 0;
  let wealthAdj = 0;
  let healthAdj = 0;

  const factors = analysis.sajuFactorKeys;

  if (factors.includes("dohwaDay")) {
    loveAdj += 15;
  }

  if (factors.includes("geonrokDay")) {
    careerAdj += 12;
  }

  if (factors.some(f => f.includes("sipsin_정재") || f.includes("sipsin_편재"))) {
    wealthAdj += 12;
  }

  if (factors.some(f => f.includes("sipsin_정인"))) {
    healthAdj += 8;
  }

  if (factors.includes("branchChung") || factors.includes("iljinChung")) {
    healthAdj -= 15;
  }

  if (factors.includes("branchXing") || factors.includes("iljinXing")) {
    healthAdj -= 10;
  }

  if (factors.includes("branchYukhap") || factors.includes("iljinYukhap")) {
    loveAdj += 10;
  }

  const astroFactors = analysis.astroFactorKeys;

  if (astroFactors.includes("venusTrine")) {
    loveAdj += 10;
    wealthAdj += 8;
  }

  if (astroFactors.includes("jupiterTrine")) {
    careerAdj += 10;
    wealthAdj += 12;
  }

  if (astroFactors.includes("saturnSquare") || astroFactors.includes("saturnConjunct")) {
    careerAdj -= 8;
  }

  if (astroFactors.includes("lunarFullMoon") || astroFactors.includes("moonPhaseFull")) {
    loveAdj += 5;
  }

  const dayHash = targetDate.getDate() * 7 + targetDate.getMonth() * 3;
  const microVar = (dayHash % variance) - (variance / 2);

  const love = Math.max(15, Math.min(95, baseScore + loveAdj + (microVar * 0.8)));
  const career = Math.max(15, Math.min(95, baseScore + careerAdj + (microVar * 0.6)));
  const wealth = Math.max(15, Math.min(95, baseScore + wealthAdj + (microVar * 0.7)));
  const health = Math.max(15, Math.min(95, baseScore + healthAdj + (microVar * 0.5)));

  return {
    love: Math.round(love),
    career: Math.round(career),
    wealth: Math.round(wealth),
    health: Math.round(health),
  };
}

export function getLuckyColorFromElement(element: string): string {
  const colorMap: Record<string, string[]> = {
    wood: ["Green", "Teal", "Emerald"],
    fire: ["Red", "Orange", "Pink"],
    earth: ["Yellow", "Brown", "Beige"],
    metal: ["White", "Silver", "Gold"],
    water: ["Blue", "Black", "Navy"],
  };

  const colors = colorMap[element] || colorMap.wood;
  return colors[Math.floor(Math.random() * colors.length)];
}

export function getLuckyNumber(targetDate: Date, birthDate: Date): number {
  const yearStartUtc = Date.UTC(targetDate.getFullYear(), 0, 0);
  const dateUtc = Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  const dayOfYear = Math.floor((dateUtc - yearStartUtc) / (1000 * 60 * 60 * 24));
  const birthDay = birthDate.getDate();
  return ((dayOfYear + birthDay) % 9) + 1;
}

export function generateAlerts(
  analysis: AlertAnalysis
): { type: "warning" | "positive" | "info"; msg: string; icon?: string }[] {

  const alerts: { type: "warning" | "positive" | "info"; msg: string; icon?: string }[] = [];

  // 등급별 알림
  if (analysis.grade === 0) {
    alerts.push({ type: "positive", msg: "천운의 날! 중요한 결정에 최적입니다.", icon: "🌟" });
  } else if (analysis.grade === 1) {
    alerts.push({ type: "positive", msg: "아주 좋은 날입니다. 적극적으로 행동하세요.", icon: "✨" });
  } else if (analysis.grade === 3) {
    // Grade 3 - 안좋은 날: 구체적 이유 제공
    const negativeReasons = getNegativeReasons(analysis);
    if (negativeReasons.length > 0) {
      alerts.push({ type: "warning", msg: negativeReasons[0], icon: "⚠️" });
    } else {
      alerts.push({ type: "warning", msg: "오늘은 에너지가 약합니다. 무리하지 마세요.", icon: "⚠️" });
    }
  } else if (analysis.grade === 4) {
    // Grade 4 - 최악의 날: 더 강한 경고와 구체적 이유
    const negativeReasons = getNegativeReasons(analysis);
    if (negativeReasons.length > 0) {
      alerts.push({ type: "warning", msg: `🚨 ${negativeReasons[0]}`, icon: "🚨" });
      if (negativeReasons.length > 1) {
        alerts.push({ type: "warning", msg: negativeReasons[1], icon: "⚠️" });
      }
    } else {
      alerts.push({ type: "warning", msg: "🚨 최악의 날입니다! 중요한 모든 일정을 피하세요.", icon: "🚨" });
    }
  }

  // 특별 요소 알림
  if (analysis.sajuFactorKeys.includes("cheoneulGwiin")) {
    alerts.push({ type: "positive", msg: "천을귀인이 함께합니다. 귀인의 도움이 있습니다.", icon: "👼" });
  }

  if (analysis.sajuFactorKeys.includes("dohwaDay")) {
    alerts.push({ type: "info", msg: "도화살의 기운. 매력이 빛나는 날입니다.", icon: "💕" });
  }

  // 나쁜 요소별 구체적 알림 (Grade 3, 4에서 추가)
  if (analysis.grade >= 3) {
    // 충(沖)
    if (analysis.sajuFactorKeys.some(k => k.includes("Chung") || k.includes("chung"))) {
      alerts.push({ type: "warning", msg: "일진 충(沖): 갈등과 변동에 주의하세요.", icon: "💥" });
    }
    // 형(刑)
    if (analysis.sajuFactorKeys.some(k => k.includes("Xing") || k.includes("xing"))) {
      alerts.push({ type: "warning", msg: "일진 형(刑): 법적 문제, 서류 실수에 주의하세요.", icon: "📋" });
    }
    // 공망
    if (analysis.sajuFactorKeys.includes("shinsal_gongmang")) {
      alerts.push({ type: "warning", msg: "공망(空亡): 계획이 무산되기 쉬워요. 새로운 시작은 피하세요.", icon: "🕳️" });
    }
    // 백호
    if (analysis.sajuFactorKeys.includes("shinsal_backho")) {
      alerts.push({ type: "warning", msg: "백호살: 사고, 수술 위험에 주의하세요.", icon: "🐯" });
    }
    // 귀문관
    if (analysis.sajuFactorKeys.includes("shinsal_guimungwan")) {
      alerts.push({ type: "warning", msg: "귀문관: 정신적 혼란, 불안감에 주의하세요.", icon: "👻" });
    }
  }

  if (analysis.astroFactorKeys.includes("retrogradeMercury")) {
    alerts.push({ type: "warning", msg: "수성 역행 중. 계약/통신에 주의하세요.", icon: "📝" });
  }

  if (analysis.astroFactorKeys.includes("retrogradeVenus")) {
    alerts.push({ type: "warning", msg: "금성 역행 중. 연애/재정 결정은 미루세요.", icon: "💔" });
  }

  if (analysis.astroFactorKeys.includes("retrogradeMars")) {
    alerts.push({ type: "warning", msg: "화성 역행 중. 충동적 행동을 삼가세요.", icon: "🔥" });
  }

  if (analysis.astroFactorKeys.includes("voidOfCourse")) {
    alerts.push({ type: "warning", msg: "보이드 오브 코스: 중요한 결정은 피하세요.", icon: "🌙" });
  }

  if (analysis.crossVerified) {
    alerts.push({ type: "positive", msg: "사주와 점성술이 일치합니다. 신뢰도 높음!", icon: "🎯" });
  }

  // 중복 제거 및 최대 5개로 제한
  const uniqueAlerts = alerts.filter((alert, index, self) =>
    index === self.findIndex(a => a.msg === alert.msg)
  );

  return uniqueAlerts.slice(0, 5);
}

/**
 * 부정적 이유를 분석하여 사용자 친화적 메시지로 변환
 */
function getNegativeReasons(analysis: AlertAnalysis): string[] {
  const reasons: string[] = [];

  // 사주 부정 요소 분석
  const sajuKeys = analysis.sajuFactorKeys;
  const astroKeys = analysis.astroFactorKeys;

  // 충(沖) - 가장 강력한 부정 요소
  if (sajuKeys.some(k => k.toLowerCase().includes("chung"))) {
    reasons.push("일진 충(沖)으로 인한 갈등/변동 기운이 강합니다.");
  }

  // 형(刑)
  if (sajuKeys.some(k => k.toLowerCase().includes("xing"))) {
    reasons.push("형(刑)살로 인해 실수나 마찰이 생기기 쉽습니다.");
  }

  // 해(害)
  if (sajuKeys.some(k => k.toLowerCase().includes("hai"))) {
    reasons.push("해(害)로 인해 배신이나 오해가 생길 수 있습니다.");
  }

  // 공망(空亡)
  if (sajuKeys.includes("shinsal_gongmang")) {
    reasons.push("공망(空亡)으로 인해 노력이 헛되기 쉽습니다.");
  }

  // 관살(官殺) - 외부 압박
  if (sajuKeys.includes("stemGwansal")) {
    reasons.push("관살 기운으로 외부 압박이나 스트레스가 강합니다.");
  }

  // 삼재
  if (sajuKeys.includes("samjaeYear")) {
    reasons.push("삼재년의 영향으로 조심해야 합니다.");
  }

  // 수성 역행
  if (astroKeys.includes("retrogradeMercury")) {
    reasons.push("수성 역행으로 커뮤니케이션/계약에 오류가 생기기 쉽습니다.");
  }

  // 금성 역행
  if (astroKeys.includes("retrogradeVenus")) {
    reasons.push("금성 역행으로 연애/재정에 혼란이 있을 수 있습니다.");
  }

  // 화성 역행
  if (astroKeys.includes("retrogradeMars")) {
    reasons.push("화성 역행으로 에너지가 낮고 분노 조절이 어렵습니다.");
  }

  // 보이드 오브 코스
  if (astroKeys.includes("voidOfCourse")) {
    reasons.push("달이 공허한 상태로 새로운 일이 성사되기 어렵습니다.");
  }

  // 충돌 원소
  if (astroKeys.includes("conflictElement")) {
    reasons.push("오행/원소 충돌로 에너지가 분산됩니다.");
  }

  // 토성 충돌
  if (astroKeys.some(k => k.includes("saturnSquare") || k.includes("saturnOpposition"))) {
    reasons.push("토성 충돌로 제약과 장애물이 많습니다.");
  }

  return reasons;
}
