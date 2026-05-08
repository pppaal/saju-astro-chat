// Centralized element analysis traits
// Consolidates element-related analysis data across analyzers

import type { BilingualText, BilingualArray } from './dayMasterTraits';
import { elementTraits } from './elementTraits';

// Derive element names from elementTraits to avoid duplication
export const elementNames: Record<string, BilingualText> = Object.fromEntries(
  Object.entries(elementTraits).map(([key, val]) => [key, { ko: val.ko, en: val.en }])
) as Record<string, BilingualText>;

// Element career traits
export const elementCareerTraits: Record<string, {
  strength: BilingualText;
  field: BilingualArray;
}> = {
  wood: {
    strength: { ko: "성장하는 분야, 새로운 시작", en: "Growing fields, new beginnings" },
    field: { ko: ["교육", "스타트업", "환경"], en: ["Education", "Startups", "Environment"] }
  },
  fire: {
    strength: { ko: "열정이 필요한 분야, 표현", en: "Fields requiring passion, expression" },
    field: { ko: ["마케팅", "엔터테인먼트", "홍보"], en: ["Marketing", "Entertainment", "PR"] }
  },
  earth: {
    strength: { ko: "안정적 관리, 신뢰 구축", en: "Stable management, trust building" },
    field: { ko: ["부동산", "행정", "농업"], en: ["Real Estate", "Administration", "Agriculture"] }
  },
  metal: {
    strength: { ko: "정밀함, 결단력", en: "Precision, decisiveness" },
    field: { ko: ["금융", "법률", "IT"], en: ["Finance", "Law", "IT"] }
  },
  water: {
    strength: { ko: "유연함, 지혜", en: "Flexibility, wisdom" },
    field: { ko: ["연구", "상담", "예술"], en: ["Research", "Counseling", "Arts"] }
  },
};

// Element love traits
export const elementLoveTraits: Record<string, BilingualText> = {
  wood: { ko: "성장하는 사랑을 원해요. 함께 발전하고 싶어해요.", en: "You want growing love. You want to develop together." },
  fire: { ko: "열정적이고 드라마틱한 사랑을 해요.", en: "You love passionately and dramatically." },
  earth: { ko: "안정적이고 신뢰할 수 있는 관계를 원해요.", en: "You want stable, trustworthy relationships." },
  metal: { ko: "품격 있고 세련된 관계를 추구해요.", en: "You pursue elegant, refined relationships." },
  water: { ko: "깊은 감정적 교류를 원해요.", en: "You want deep emotional connection." },
};

// Element personality traits
export const elementPersonalityTraits: Record<string, BilingualText> = {
  wood: { ko: "성장과 발전을 추구하며 새로운 것을 시작하는 에너지가 강해요.", en: "Strong energy pursuing growth and starting new things." },
  fire: { ko: "열정적이고 표현력이 뛰어나며 사람들에게 에너지를 줘요.", en: "Passionate, expressive, giving energy to people." },
  earth: { ko: "안정적이고 신뢰감 있으며 사람들을 편안하게 해요.", en: "Stable, trustworthy, making people comfortable." },
  metal: { ko: "원칙이 뚜렷하고 결단력 있으며 품격을 중시해요.", en: "Clear principles, decisive, valuing class." },
  water: { ko: "지혜롭고 유연하며 깊은 통찰력이 있어요.", en: "Wise, flexible, with deep insight." },
};

// Element health effects
export const elementHealthEffects: Record<string, {
  organ: BilingualText;
  effect: BilingualText;
  emoji: string;
}> = {
  wood: { organ: { ko: "간/눈", en: "Liver/Eyes" }, effect: { ko: "녹색 채소, 눈 휴식", en: "Green vegetables, eye rest" }, emoji: "👁️" },
  fire: { organ: { ko: "심장/혈관", en: "Heart/Blood" }, effect: { ko: "스트레스 관리, 운동", en: "Stress management, exercise" }, emoji: "❤️" },
  earth: { organ: { ko: "위장/비장", en: "Stomach/Spleen" }, effect: { ko: "규칙적 식사, 과식 주의", en: "Regular meals, avoid overeating" }, emoji: "🫁" },
  metal: { organ: { ko: "폐/피부", en: "Lungs/Skin" }, effect: { ko: "호흡기 관리, 수분", en: "Respiratory care, hydration" }, emoji: "🫁" },
  water: { organ: { ko: "신장/뼈", en: "Kidneys/Bones" }, effect: { ko: "수분 섭취, 보온", en: "Hydration, warmth" }, emoji: "💧" },
};

// Element compatibility (generating cycle)
export const elementCompatibility: Record<string, string[]> = {
  wood: ["water", "fire"],
  fire: ["wood", "earth"],
  earth: ["fire", "metal"],
  metal: ["earth", "water"],
  water: ["metal", "wood"],
};

// Weakness advice by element
export const elementWeaknessAdvice: Record<string, BilingualText> = {
  wood: { ko: "함께 성장하는 비전을 공유해보세요.", en: "Try sharing a vision for growing together." },
  fire: { ko: "가끔은 열정적인 표현도 해보세요.", en: "Sometimes try passionate expressions too." },
  earth: { ko: "신뢰를 쌓는 데 시간을 투자하세요.", en: "Invest time in building trust." },
  metal: { ko: "기준을 조금 낮춰도 괜찮아요.", en: "It's okay to lower standards a bit." },
  water: { ko: "감정적으로 더 솔직해져 보세요.", en: "Try being more emotionally honest." },
};

// Element strength descriptions (detailed)
export const elementStrengthDescriptions: Record<string, BilingualText> = {
  wood: {
    ko: "성장 에너지가 강해요. 새로운 일을 시작하고 발전시키는 힘이 뛰어나며, 창의적인 아이디어로 혁신을 만들어내는 능력이 있습니다. 막히지 않고 계속 앞으로 나아가는 추진력이 있어요.",
    en: "Strong growth energy. You excel at starting and developing new things with creative ideas for innovation. You have the drive to keep moving forward without getting stuck."
  },
  fire: {
    ko: "열정과 추진력이 뛰어나요. 사람들을 자연스럽게 이끌고 동기부여하는 카리스마가 있습니다. 어떤 일이든 열정적으로 임하고, 주변을 밝고 긍정적으로 만드는 에너지가 있어요.",
    en: "Exceptional passion and drive. You have natural charisma to lead and motivate others. You approach everything with enthusiasm and create bright, positive energy around you."
  },
  earth: {
    ko: "안정성과 신뢰감이 강해요. 현실적이고 책임감 있게 일을 마무리하며, 사람들이 당신을 믿고 의지할 수 있습니다. 흔들리지 않는 중심을 가지고 있어 위기 상황에서도 침착함을 유지해요.",
    en: "Strong stability and reliability. You're practical and responsible in completing tasks, making you someone people can trust and depend on. You maintain composure even in crises with your unwavering center."
  },
  metal: {
    ko: "정확성과 집중력이 뛰어나요. 본질을 빠르게 파악하고 논리적으로 구조화하는 분석 능력이 있습니다. 불필요한 것을 과감히 제거하고 핵심에 집중하는 결단력이 있어요.",
    en: "Excellent precision and focus. You have analytical ability to quickly grasp essence and logically structure information. You show decisiveness in removing unnecessary elements and focusing on core matters."
  },
  water: {
    ko: "직관과 적응력이 강해요. 상황의 흐름을 읽고 유연하게 대처하는 지혜가 있으며, 다양한 환경에서 자연스럽게 적응합니다. 보이지 않는 것을 감지하는 예리한 감각이 있어요.",
    en: "Strong intuition and adaptability. You have wisdom to read situations and respond flexibly, adapting naturally to various environments. You possess sharp senses to detect what's invisible."
  }
};

// Element weakness descriptions (detailed)
export const elementWeaknessDescriptions: Record<string, { text: BilingualText; advice: BilingualText }> = {
  wood: {
    text: {
      ko: "새로운 시작이나 변화에 부담을 느낄 수 있어요. 계획은 잘 세우지만 막상 첫 발을 내딛기가 어렵거나, 시작했다가도 중간에 포기하는 경향이 있을 수 있습니다.",
      en: "You may feel burdened by new beginnings or changes. While good at planning, taking the first step can be difficult, or you might give up midway."
    },
    advice: {
      ko: "매일 아침 산책하며 새로운 루트 시도하기, 작은 식물 키우며 성장 관찰하기, 자기계발 서적으로 동기 부여받기를 추천해요.",
      en: "Try new morning walk routes daily, grow small plants to observe growth, and get motivated by self-development books."
    }
  },
  fire: {
    text: {
      ko: "열정이나 동기부여가 쉽게 식을 수 있어요. 일에 대한 흥미를 오래 유지하기 어렵거나, 사람들 앞에서 자신감 있게 표현하는 것이 부담스러울 수 있습니다.",
      en: "Your passion and motivation may cool easily. Maintaining interest in tasks for long periods can be challenging, or expressing yourself confidently in front of others may feel burdensome."
    },
    advice: {
      ko: "매일 30분 운동으로 에너지 충전하기, 적극적으로 사람 만나고 대화하기, 햇빛 쬐며 야외 활동 늘리기를 추천해요.",
      en: "Charge energy with 30 min daily exercise, actively meet and talk with people, and increase outdoor activities in sunlight."
    }
  },
  earth: {
    text: {
      ko: "심리적 안정감이 부족하거나 불안해지기 쉬워요. 일관성을 유지하기 어렵거나, 계획 없이 즉흥적으로 행동해서 나중에 후회하는 일이 생길 수 있습니다.",
      en: "You may lack psychological stability or become anxious easily. Maintaining consistency can be difficult, or acting impulsively without planning may lead to regrets."
    },
    advice: {
      ko: "규칙적인 생활 패턴 만들기, 주말 등산으로 땅의 기운 받기, 저녁 명상으로 마음 가라앉히기를 추천해요.",
      en: "Create regular life patterns, receive earth energy through weekend hiking, and calm your mind with evening meditation."
    }
  },
  metal: {
    text: {
      ko: "집중력이 흐트러지거나 우선순위를 정하기 어려워요. 여러 일을 동시에 하다 보면 정작 중요한 것을 놓치거나, 결단력이 부족해 결정을 미루는 경향이 있을 수 있습니다.",
      en: "Your focus may scatter or prioritizing can be difficult. Juggling multiple tasks simultaneously might cause you to miss what's truly important, or lack of decisiveness may lead to procrastination."
    },
    advice: {
      ko: "책상과 주변 정리정돈하기, 할 일 목록 체계적으로 구조화하기, 호흡 명상으로 정신 집중력 키우기를 추천해요.",
      en: "Organize desk and surroundings, systematically structure to-do lists, and build mental focus through breathing meditation."
    }
  },
  water: {
    text: {
      ko: "유연성이 부족하고 고집스러울 수 있어요. 상황 변화에 빠르게 적응하지 못하거나, 타인의 감정을 읽는 것이 어려워 관계에서 오해가 생길 수 있습니다.",
      en: "You may lack flexibility and be stubborn. Adapting quickly to changing situations can be difficult, or reading others' emotions may be challenging, leading to misunderstandings in relationships."
    },
    advice: {
      ko: "충분한 수면과 휴식 취하기, 하루 8잔 이상 물 마시기, 조용한 시간 갖고 내면 성찰하기를 추천해요.",
      en: "Get sufficient sleep and rest, drink 8+ glasses of water daily, and have quiet time for inner reflection."
    }
  }
};

// Element excess warnings (when element is too strong)
export const elementExcessWarnings: Record<string, BilingualText> = {
  wood: { ko: "나무 기운 과다: 화를 자주 내면 간이 지쳐요.", en: "Wood excess: Frequent anger exhausts liver." },
  fire: { ko: "불 기운 과다: 과흥분은 심장에 무리.", en: "Fire excess: Over-excitement strains heart." },
  earth: { ko: "흙 기운 과다: 생각이 많으면 소화가 안 돼요.", en: "Earth excess: Overthinking prevents digestion." },
  metal: { ko: "쇠 기운 과다: 고집이 세면 호흡이 얕아져요.", en: "Metal excess: Stubbornness shallows breathing." },
  water: { ko: "물 기운 과다: 두려움이 신장을 약하게 해요.", en: "Water excess: Fear weakens kidneys." },
};

// Advice based on weak element
export const elementAdvice: Record<string, BilingualText> = {
  wood: { ko: "새로운 도전을 두려워하지 마세요. 성장이 답이에요.", en: "Don't fear new challenges. Growth is the answer." },
  fire: { ko: "열정을 표현하세요. 숨기면 에너지가 막혀요.", en: "Express passion. Hiding blocks energy." },
  earth: { ko: "안정된 기반을 만드세요. 급하게 가지 마세요.", en: "Build a stable foundation. Don't rush." },
  metal: { ko: "기준을 명확히 하세요. 애매하면 흔들려요.", en: "Make standards clear. Ambiguity causes wavering." },
  water: { ko: "직관을 믿으세요. 느낌이 답일 때가 많아요.", en: "Trust intuition. Feelings are often the answer." },
};
