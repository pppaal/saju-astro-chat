import { AREA_CONFIG, type FortuneArea } from './constants';

type EventCategory = "wealth" | "career" | "love" | "health" | "travel" | "study" | "general";

export function calculateAreaScoresForCategories(
  ganzhi: { stemElement: string; branchElement: string },
  seunScore: number,
  wolunScore: number
): Partial<Record<FortuneArea, number>> {
  const areaScores: Partial<Record<FortuneArea, number>> = {};

  for (const [area, config] of Object.entries(AREA_CONFIG) as [FortuneArea, typeof AREA_CONFIG[FortuneArea]][]) {
    let areaScore = 50;

    if (config.relatedElements.includes(ganzhi.stemElement)) {
      areaScore += 15;
    }
    if (config.relatedElements.includes(ganzhi.branchElement)) {
      areaScore += 10;
    }

    areaScore += Math.round(seunScore * 0.2);
    areaScore += Math.round(wolunScore * 0.3);

    areaScores[area] = Math.max(0, Math.min(100, areaScore));
  }

  return areaScores;
}

export function getBestAreaCategory(
  areaScores: Partial<Record<FortuneArea, number>>,
  minScore: number = 65
): EventCategory | null {
  const bestArea = Object.entries(areaScores).sort((a, b) => (b[1] || 0) - (a[1] || 0))[0];
  if (!bestArea || (bestArea[1] || 0) < minScore) return null;

  const areaToCategory: Record<FortuneArea, EventCategory> = {
    career: "career",
    wealth: "wealth",
    love: "love",
    health: "health",
    study: "study",
    travel: "travel",
  };

  return areaToCategory[bestArea[0] as FortuneArea] || null;
}
