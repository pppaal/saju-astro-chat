import type { SajuData } from '../types';

// 십신 분포 계산
export function getSibsinDistribution(saju: SajuData | undefined): Record<string, number> {
  const distribution: Record<string, number> = {};

  // advancedAnalysis에서 sibsin 가져오기 (엔진은 `count`로 산출)
  if (saju?.advancedAnalysis?.sibsin?.count) {
    return saju.advancedAnalysis.sibsin.count;
  }

  // pillars에서 직접 계산
  const pillarKeys = ['yearPillar', 'monthPillar', 'dayPillar', 'timePillar'] as const;
  for (const pillarKey of pillarKeys) {
    const pillar = saju?.[pillarKey as keyof SajuData] as { heavenlyStem?: { sibsin?: unknown }; earthlyBranch?: { sibsin?: unknown } } | undefined;
    if (pillar?.heavenlyStem?.sibsin) {
      const sibsinVal = pillar.heavenlyStem.sibsin as unknown;
      const sibsin = typeof sibsinVal === 'object' && sibsinVal !== null
        ? (sibsinVal as Record<string, unknown>).name || (sibsinVal as Record<string, unknown>).kind
        : sibsinVal;
      if (typeof sibsin === 'string' && sibsin) {distribution[sibsin] = (distribution[sibsin] || 0) + 1;}
    }
    if (pillar?.earthlyBranch?.sibsin) {
      const sibsinVal = pillar.earthlyBranch.sibsin as unknown;
      const sibsin = typeof sibsinVal === 'object' && sibsinVal !== null
        ? (sibsinVal as Record<string, unknown>).name || (sibsinVal as Record<string, unknown>).kind
        : sibsinVal;
      if (typeof sibsin === 'string' && sibsin) {distribution[sibsin] = (distribution[sibsin] || 0) + 1;}
    }
  }

  return distribution;
}

export function getSibsinAnalysis(saju: SajuData | undefined, lang: string): { category: string; count: number; description: string; emoji: string }[] {
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
