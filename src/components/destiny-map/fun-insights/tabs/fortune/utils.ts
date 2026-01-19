// src/components/destiny-map/fun-insights/tabs/fortune/utils.ts

import type { PlanetData, DaeunRelation } from './types';
import {
  DM_ELEMENTS,
  ELEMENT_GENERATES,
  ELEMENT_CONTROLS,
  ELEMENT_CONTROLS_ME,
  ELEMENT_GENERATES_ME,
  STEM_TO_ELEMENT
} from './constants';

export function findPlanetSign(planets: PlanetData[] | undefined, name: string): string | null {
  if (!Array.isArray(planets)) return null;
  const planet = planets.find((p) => p.name?.toLowerCase()?.includes(name.toLowerCase()));
  return planet?.sign ?? null;
}

export function findPlanetHouse(planets: PlanetData[] | undefined, name: string): number | null {
  if (!Array.isArray(planets)) return null;
  const planet = planets.find((p) => p.name?.toLowerCase()?.includes(name.toLowerCase()));
  return planet?.house ?? null;
}

export function getStemElement(ganji: string): string {
  if (!ganji) return "";
  const firstChar = ganji.charAt(0);
  return STEM_TO_ELEMENT[firstChar] || "";
}

export function getDaeunRelation(dayMaster: string, daeunStem: string, isKo: boolean): DaeunRelation {
  const myEl = DM_ELEMENTS[dayMaster] || "";
  const daeunEl = DM_ELEMENTS[daeunStem] || "";

  if (!myEl || !daeunEl) {
    return { relation: "", message: "", advice: "" };
  }

  // Same element
  if (myEl === daeunEl) {
    return {
      relation: isKo ? "비겁운 (동료)" : "Peer Period",
      message: isKo ? "나와 같은 에너지가 강해지는 시기예요. 경쟁도 있지만 동료와 함께 성장할 수 있어요." : "Period when same energy strengthens. Competition exists but you can grow with peers.",
      advice: isKo ? "독립심과 협력 사이 균형을 찾으세요. 지나친 고집은 금물이에요." : "Find balance between independence and cooperation. Avoid excessive stubbornness."
    };
  }

  // I generate (식상)
  if (ELEMENT_GENERATES[myEl] === daeunEl) {
    return {
      relation: isKo ? "식상운 (표현)" : "Expression Period",
      message: isKo ? "당신의 재능과 아이디어가 꽃피는 시기예요! 표현하고 창조하세요." : "Time for your talents and ideas to bloom! Express and create.",
      advice: isKo ? "적극적으로 표현하세요. 숨기면 아까운 시기예요." : "Express actively. It's a waste to hide during this time."
    };
  }

  // I control (재성)
  if (ELEMENT_CONTROLS[myEl] === daeunEl) {
    return {
      relation: isKo ? "재성운 (재물)" : "Wealth Period",
      message: isKo ? "재물과 관련된 움직임이 활발해지는 시기예요. 돈이 들어오지만 나가기도 해요." : "Active money-related movements. Money comes in but also goes out.",
      advice: isKo ? "돈을 벌 기회가 오지만 무리한 투자는 피하세요." : "Money-making opportunities come, but avoid risky investments."
    };
  }

  // Controls me (관성)
  if (ELEMENT_CONTROLS_ME[myEl] === daeunEl) {
    return {
      relation: isKo ? "관성운 (시험)" : "Test Period",
      message: isKo ? "시험대에 오르는 시기예요. 책임과 압박이 있지만 실력이 증명돼요." : "Time to be tested. Responsibility and pressure exist, but skills are proven.",
      advice: isKo ? "버티면 인정받아요. 도망가면 나중에 더 힘들어요." : "Endure and be recognized. Running away makes things harder later."
    };
  }

  // Generates me (인성)
  if (ELEMENT_GENERATES_ME[myEl] === daeunEl) {
    return {
      relation: isKo ? "인성운 (도움)" : "Support Period",
      message: isKo ? "귀인이 나타나고 도움을 받는 시기예요. 배움과 성장의 기운이 강해요." : "Benefactors appear and help comes. Strong energy for learning and growth.",
      advice: isKo ? "멘토를 찾고 배우세요. 받은 도움은 나중에 갚으면 돼요." : "Find mentors and learn. Return received help later."
    };
  }

  return { relation: "", message: "", advice: "" };
}
