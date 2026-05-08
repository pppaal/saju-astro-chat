/**
 * 영역별 분석 설정
 */

export type FortuneArea = "career" | "wealth" | "love" | "health" | "study" | "travel";

export const AREA_CONFIG: Record<FortuneArea, {
  relatedElements: string[];
  boostSibsin: string[];
  penaltySibsin: string[];
}> = {
  career: {
    relatedElements: ["metal", "earth"],
    boostSibsin: ["정관", "편관", "정인"],
    penaltySibsin: ["상관"],
  },
  wealth: {
    relatedElements: ["earth", "metal"],
    boostSibsin: ["정재", "편재", "식신"],
    penaltySibsin: ["겁재", "비견"],
  },
  love: {
    relatedElements: ["fire", "wood"],
    boostSibsin: ["정관", "정재", "식신"],
    penaltySibsin: ["편관", "상관"],
  },
  health: {
    relatedElements: ["wood", "water"],
    boostSibsin: ["정인", "비견"],
    penaltySibsin: ["편관", "상관"],
  },
  study: {
    relatedElements: ["water", "wood"],
    boostSibsin: ["정인", "편인", "식신"],
    penaltySibsin: ["편재", "겁재"],
  },
  travel: {
    relatedElements: ["fire", "water"],
    boostSibsin: ["편관", "편인", "식신"],
    penaltySibsin: ["정관", "정인"],
  },
};
