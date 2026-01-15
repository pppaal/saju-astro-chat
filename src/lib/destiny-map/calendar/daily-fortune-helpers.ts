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

  if (factors.some(f => f.includes("sipsin_Н Нzк") || f.includes("sipsin_бZ,Нzк"))) {
    wealthAdj += 12;
  }

  if (factors.some(f => f.includes("sipsin_Н Н?,"))) {
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
  } else if (analysis.grade === 4) {
    alerts.push({ type: "warning", msg: "오늘은 조심하세요. 중요한 결정은 미루세요.", icon: "⚠️" });
  }

  // 특별 요소 알림
  if (analysis.sajuFactorKeys.includes("cheoneulGwiin")) {
    alerts.push({ type: "positive", msg: "천을귀인이 함께합니다. 귀인의 도움이 있습니다.", icon: "👼" });
  }

  if (analysis.sajuFactorKeys.includes("dohwaDay")) {
    alerts.push({ type: "info", msg: "도화살의 기운. 매력이 빛나는 날입니다.", icon: "💕" });
  }

  if (analysis.astroFactorKeys.includes("retrogradeMercury")) {
    alerts.push({ type: "warning", msg: "수성 역행 중. 계약/통신에 주의하세요.", icon: "📝" });
  }

  if (analysis.crossVerified) {
    alerts.push({ type: "positive", msg: "사주와 점성술이 일치합니다. 신뢰도 높음!", icon: "🎯" });
  }

  return alerts;

}
