// src/components/destiny-map/data/planet-descriptions.ts
// Extracted from DestinyMatrixStory.tsx for better maintainability

export interface PlanetSignDescription {
  ko: string;
  en: string;
}

export const PLANET_SIGNS: Record<string, Record<string, PlanetSignDescription>> = {
  mercury: {
    fire: { ko: "생각이 빠르고 열정적으로 표현해요.", en: "Fast thinking and passionate expression." },
    earth: { ko: "실용적이고 신중하게 소통해요.", en: "Practical and careful communication." },
    air: { ko: "빠르게 정보를 처리하고 대화를 즐겨요.", en: "Quick information processing, enjoying conversation." },
    water: { ko: "깊고 직관적인 이해. 느낌으로 소통해요.", en: "Deep, intuitive understanding. Communicating through feelings." }
  },
  venus: {
    fire: { ko: "열정적으로 사랑을 표현해요.", en: "Expressing love passionately." },
    earth: { ko: "안정과 신뢰를 중시하는 사랑.", en: "Love valuing stability and trust." },
    air: { ko: "정신적 교감을 중시하는 사랑.", en: "Love valuing mental connection." },
    water: { ko: "깊은 감정적 연결을 원하는 사랑.", en: "Love seeking deep emotional connection." }
  },
  mars: {
    fire: { ko: "빠르고 직접적인 행동.", en: "Fast and direct action." },
    earth: { ko: "꾸준하고 끈기 있는 행동.", en: "Steady and persistent action." },
    air: { ko: "전략적이고 다양한 접근.", en: "Strategic and varied approach." },
    water: { ko: "직관에 따른 행동. 감정적 동기.", en: "Intuition-driven action. Emotional motivation." }
  },
  jupiter: {
    fire: { ko: "모험과 확장을 통한 성장.", en: "Growth through adventure and expansion." },
    earth: { ko: "실질적이고 안정적인 성장.", en: "Practical and stable growth." },
    air: { ko: "지식과 소통을 통한 성장.", en: "Growth through knowledge and communication." },
    water: { ko: "직관과 감정을 통한 성장.", en: "Growth through intuition and emotion." }
  },
  saturn: {
    fire: { ko: "열정에 책임을 더하는 법을 배워요.", en: "Learning to add responsibility to passion." },
    earth: { ko: "체계적이고 인내심 있는 성취.", en: "Systematic and patient achievement." },
    air: { ko: "생각에 구조를 더하는 법을 배워요.", en: "Learning to add structure to thoughts." },
    water: { ko: "감정을 다스리는 법을 배워요.", en: "Learning to manage emotions." }
  }
};
