// src/components/destiny-map/fun-insights/element-descriptions.ts
// Element descriptions for FunInsights - eliminates nested ternary operators

type LangText = { ko: string; en: string };

/**
 * Element energy descriptions (used in Five Elements Balance section)
 */
export const ELEMENT_ENERGY_DESCRIPTIONS: Record<string, LangText> = {
  wood: {
    ko: "성장과 발전",
    en: "growth",
  },
  fire: {
    ko: "열정과 표현",
    en: "passion",
  },
  earth: {
    ko: "안정과 신뢰",
    en: "stability",
  },
  metal: {
    ko: "결단과 실행",
    en: "decisiveness",
  },
  water: {
    ko: "지혜와 유연함",
    en: "wisdom",
  },
};

/**
 * Get element energy description by element name
 */
export function getElementEnergyDescription(
  element: string,
  lang: string
): string {
  const desc = ELEMENT_ENERGY_DESCRIPTIONS[element];
  if (!desc) {return element;}
  return lang === "ko" ? desc.ko : desc.en;
}

/**
 * Format strongest element text for report
 */
export function formatStrongestElement(
  element: string,
  percentage: number,
  lang: string,
  elementTraits: Record<string, { ko?: string; en?: string }>
): string {
  const isKo = lang === "ko";
  const traitName = elementTraits[element]?.[isKo ? "ko" : "en"] || element;
  const energyDesc = getElementEnergyDescription(element, lang);

  if (isKo) {
    return `강점: ${traitName}(${percentage}%) - ${energyDesc}의 에너지가 풍부합니다.`;
  }
  return `Strength: ${traitName} (${percentage}%) - Rich in ${energyDesc} energy.`;
}

/**
 * Format weakest element text for report
 */
export function formatWeakestElement(
  element: string,
  percentage: number,
  lang: string,
  elementTraits: Record<string, { ko?: string; en?: string }>
): string {
  const isKo = lang === "ko";
  const traitName = elementTraits[element]?.[isKo ? "ko" : "en"] || element;

  if (isKo) {
    return `보완점: ${traitName}(${percentage}%) - 이 기운을 보완하면 더 균형 잡힌 삶을 살 수 있습니다.`;
  }
  return `To improve: ${traitName} (${percentage}%) - Boosting this brings better balance.`;
}
