// src/components/destiny-map/data/twelve-stage-descriptions.ts
// Extracted from DestinyMatrixStory.tsx for better maintainability

export interface TwelveStageDescription {
  name: { ko: string; en: string };
  meaning: { ko: string; en: string };
  lifeAdvice: { ko: string; en: string };
}

export const TWELVE_STAGE: Record<string, TwelveStageDescription> = {
  "장생": { name: { ko: "장생(長生)", en: "Longevity" }, meaning: { ko: "끊임없이 성장하고 발전하려는 에너지. 새로운 시작에 강해요.", en: "Energy for constant growth. Strong at new beginnings." }, lifeAdvice: { ko: "새로운 것을 시작할 때 운이 트여요.", en: "Luck opens when you start something new." } },
  "목욕": { name: { ko: "목욕(沐浴)", en: "Bathing" }, meaning: { ko: "변화와 정화의 에너지. 새롭게 시작하는 능력이 탁월해요.", en: "Energy for change and purification. Excellent at fresh starts." }, lifeAdvice: { ko: "변화를 두려워하지 마세요.", en: "Don't fear change." } },
  "관대": { name: { ko: "관대(冠帶)", en: "Capping" }, meaning: { ko: "세상에 자신을 드러내려는 에너지. 사회적 성공을 추구해요.", en: "Energy to present yourself. Pursuing social success." }, lifeAdvice: { ko: "내면의 성장도 함께 챙기세요.", en: "Nurture inner growth too." } },
  "건록": { name: { ko: "건록(建祿)", en: "Establishing" }, meaning: { ko: "독립적이고 자립심이 강한 에너지.", en: "Independent, self-reliant energy." }, lifeAdvice: { ko: "때로는 협력도 필요해요.", en: "Sometimes cooperation is needed." } },
  "제왕": { name: { ko: "제왕(帝旺)", en: "Emperor" }, meaning: { ko: "정점의 왕 에너지. 강한 리더십과 카리스마.", en: "Peak emperor energy. Strong leadership and charisma." }, lifeAdvice: { ko: "겸손을 배우세요.", en: "Learn humility." } },
  "쇠": { name: { ko: "쇠(衰)", en: "Decline" }, meaning: { ko: "원숙하고 안정된 에너지. 깊은 경험과 지혜.", en: "Mature, stable energy. Deep experience and wisdom." }, lifeAdvice: { ko: "자신의 페이스를 유지하세요.", en: "Maintain your own pace." } },
  "병": { name: { ko: "병(病)", en: "Illness" }, meaning: { ko: "돌봄을 주고받는 에너지. 보살피는 재능.", en: "Energy for giving and receiving care." }, lifeAdvice: { ko: "건강에 신경 쓰세요.", en: "Take care of your health." } },
  "사": { name: { ko: "사(死)", en: "Death" }, meaning: { ko: "완성과 마무리의 에너지. 정신적 가치를 추구.", en: "Energy for completion. Pursuing spiritual values." }, lifeAdvice: { ko: "정신적 가치에서 의미를 찾으세요.", en: "Find meaning in spiritual values." } },
  "묘": { name: { ko: "묘(墓)", en: "Tomb" }, meaning: { ko: "축적과 보존의 에너지. 재물 운이 있어요.", en: "Energy for accumulation. Fortune for wealth." }, lifeAdvice: { ko: "물려받은 것을 잘 지키세요.", en: "Protect what you've inherited." } },
  "절": { name: { ko: "절(絶)", en: "Extinction" }, meaning: { ko: "완전한 변화의 에너지. 새로 시작할 용기.", en: "Energy for complete transformation." }, lifeAdvice: { ko: "끝은 새로운 시작이에요.", en: "Every end is a new beginning." } },
  "태": { name: { ko: "태(胎)", en: "Conception" }, meaning: { ko: "잠재력의 에너지. 무한한 가능성.", en: "Energy of potential. Infinite possibilities." }, lifeAdvice: { ko: "때를 기다리세요.", en: "Wait for the right time." } },
  "양": { name: { ko: "양(養)", en: "Nurturing" }, meaning: { ko: "보살핌을 받는 에너지. 귀인의 도움.", en: "Energy of being nurtured. Help from benefactors." }, lifeAdvice: { ko: "복에 감사하고 자립심도 키우세요.", en: "Be grateful and develop independence." } },
};
