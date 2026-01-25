// src/components/destiny-map/data/shinsal-descriptions.ts
// Extracted from DestinyMatrixStory.tsx for better maintainability

export interface ShinsalDescription {
  ko: string;
  en: string;
  meaning: { ko: string; en: string };
  lifeImpact: { ko: string; en: string };
  advice: { ko: string; en: string };
}

export const SHINSAL_INFO: Record<string, ShinsalDescription> = {
  "역마살": { ko: "역마살", en: "Traveling Star", meaning: { ko: "끊임없이 움직이고 새로운 것을 경험하려는 본능.", en: "Instinct to constantly move and experience new things." }, lifeImpact: { ko: "무역, 항공, 여행 분야에서 성공 가능.", en: "Success potential in trade, aviation, travel." }, advice: { ko: "여행과 새 프로젝트로 에너지를 풀어주세요.", en: "Release energy through travel and new projects." } },
  "도화살": { ko: "도화살", en: "Peach Blossom", meaning: { ko: "사람을 끄는 묘한 매력.", en: "Mysterious charm that attracts people." }, lifeImpact: { ko: "대중적 관심을 받는 직업에서 성공.", en: "Success in public-facing careers." }, advice: { ko: "예술이나 대중 소통으로 승화시키세요.", en: "Sublimate into art or public communication." } },
  "화개살": { ko: "화개살", en: "Canopy Star", meaning: { ko: "예술적 감각과 영적 민감성.", en: "Artistic sense and spiritual sensitivity." }, lifeImpact: { ko: "예술, 종교, 철학 분야에서 두각.", en: "Excellence in art, religion, philosophy." }, advice: { ko: "고독이 창조력의 원천이에요.", en: "Solitude is source of creativity." } },
  "문창귀인": { ko: "문창귀인", en: "Literary Star", meaning: { ko: "학문과 글쓰기의 재능.", en: "Talent for academics and writing." }, lifeImpact: { ko: "교육, 출판, 연구 분야에서 성공.", en: "Success in education, publishing, research." }, advice: { ko: "배움을 멈추지 마세요.", en: "Never stop learning." } },
  "천을귀인": { ko: "천을귀인", en: "Heavenly Noble", meaning: { ko: "어려울 때 도움받는 행운의 에너지.", en: "Lucky energy bringing help in difficulties." }, lifeImpact: { ko: "위기에서 기적적으로 빠져나와요.", en: "Miraculously escape from crises." }, advice: { ko: "다른 사람에게도 귀인이 되어주세요.", en: "Become a benefactor to others too." } },
  "양인살": { ko: "양인살", en: "Blade Star", meaning: { ko: "날카로운 결단력과 추진력.", en: "Sharp decisiveness and drive." }, lifeImpact: { ko: "경쟁이 치열한 분야에서 성공.", en: "Success in highly competitive fields." }, advice: { ko: "건설적인 방향으로 사용하세요.", en: "Use constructively." } },
  "괴강살": { ko: "괴강살", en: "Powerful Star", meaning: { ko: "강한 개성과 독자적 성향.", en: "Strong individuality and independent tendency." }, lifeImpact: { ko: "창업, 예술 등 독자적 분야에서 성공.", en: "Success in independent fields like entrepreneurship." }, advice: { ko: "타인과의 조화도 배우세요.", en: "Learn to harmonize with others." } },
};
