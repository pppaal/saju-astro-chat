/**
 * 격국 → 영혼 유형 매핑
 * 격국(格局)은 사주의 핵심 구조를 나타내며, 이를 영혼 유형으로 해석
 */

import type { BilingualText, BilingualArray, GeokgukType } from '../../types/core';

export interface SoulType {
  title: BilingualText;
  emoji: string;
  traits: BilingualArray;
  description: BilingualText;
}

/**
 * 격국별 드라코닉 영혼 타입
 */
export const GEOKGUK_TO_DRACONIC_SOUL: Record<GeokgukType, SoulType> = {
  jeonggwan: {
    title: { ko: "정의의 수호자 영혼", en: "Guardian of Justice Soul" },
    emoji: "⚖️",
    traits: { ko: ["정직", "책임감", "명예"], en: ["Honesty", "Responsibility", "Honor"] },
    description: {
      ko: "규칙과 질서를 통해 세상을 바르게 만드는 사명을 가진 영혼",
      en: "Soul with a mission to make the world right through rules and order"
    }
  },
  pyeongwan: {
    title: { ko: "전사 영혼", en: "Warrior Soul" },
    emoji: "🗡️",
    traits: { ko: ["용기", "도전", "카리스마"], en: ["Courage", "Challenge", "Charisma"] },
    description: {
      ko: "역경을 돌파하고 싸워서 이기는 힘을 가진 영혼",
      en: "Soul with power to break through adversity and win battles"
    }
  },
  jeongin: {
    title: { ko: "현자 영혼", en: "Sage Soul" },
    emoji: "📚",
    traits: { ko: ["지혜", "보호", "학습"], en: ["Wisdom", "Protection", "Learning"] },
    description: {
      ko: "배우고 가르치며 다른 사람을 성장시키는 영혼",
      en: "Soul that learns, teaches, and helps others grow"
    }
  },
  pyeongin: {
    title: { ko: "신비가 영혼", en: "Mystic Soul" },
    emoji: "🔮",
    traits: { ko: ["직관", "영성", "창의"], en: ["Intuition", "Spirituality", "Creativity"] },
    description: {
      ko: "보이지 않는 세계를 감지하고 깊은 통찰을 전하는 영혼",
      en: "Soul that senses the invisible world and shares deep insights"
    }
  },
  siksin: {
    title: { ko: "창조자 영혼", en: "Creator Soul" },
    emoji: "🎨",
    traits: { ko: ["창작", "표현", "풍요"], en: ["Creation", "Expression", "Abundance"] },
    description: {
      ko: "아름다움을 만들고 세상에 즐거움을 주는 영혼",
      en: "Soul that creates beauty and brings joy to the world"
    }
  },
  sanggwan: {
    title: { ko: "천재 영혼", en: "Genius Soul" },
    emoji: "💫",
    traits: { ko: ["재능", "혁신", "표현력"], en: ["Talent", "Innovation", "Expressiveness"] },
    description: {
      ko: "틀을 깨고 새로운 것을 창조하는 천재적 영혼",
      en: "Genius soul that breaks molds and creates the new"
    }
  },
  jeongjae: {
    title: { ko: "풍요 영혼", en: "Abundance Soul" },
    emoji: "💎",
    traits: { ko: ["안정", "성실", "축적"], en: ["Stability", "Diligence", "Accumulation"] },
    description: {
      ko: "차곡차곡 쌓아 풍요를 만드는 신뢰의 영혼",
      en: "Trustworthy soul that builds abundance steadily"
    }
  },
  pyeonjae: {
    title: { ko: "모험가 영혼", en: "Adventurer Soul" },
    emoji: "🌍",
    traits: { ko: ["도전", "확장", "기회포착"], en: ["Adventure", "Expansion", "Opportunity"] },
    description: {
      ko: "넓은 세상을 누비며 기회를 찾는 역동적 영혼",
      en: "Dynamic soul that roams the wide world seeking opportunities"
    }
  },
  geonrok: {
    title: { ko: "왕자/공주 영혼", en: "Prince/Princess Soul" },
    emoji: "👑",
    traits: { ko: ["자존감", "리더십", "당당함"], en: ["Self-esteem", "Leadership", "Confidence"] },
    description: {
      ko: "타고난 품위와 당당함으로 자신의 왕국을 세우는 영혼",
      en: "Soul that builds its kingdom with natural dignity and confidence"
    }
  },
  yangin: {
    title: { ko: "검사 영혼", en: "Blade Soul" },
    emoji: "⚔️",
    traits: { ko: ["결단", "정의", "날카로움"], en: ["Decision", "Justice", "Sharpness"] },
    description: {
      ko: "날카로운 결단력으로 불의를 베는 강인한 영혼",
      en: "Strong soul that cuts injustice with sharp decisiveness"
    }
  },
  jonga: {
    title: { ko: "예술가 영혼", en: "Artist Soul" },
    emoji: "🎭",
    traits: { ko: ["감성", "예술", "순수"], en: ["Emotion", "Art", "Purity"] },
    description: {
      ko: "예술과 아름다움을 통해 세상을 치유하는 순수한 영혼",
      en: "Pure soul that heals the world through art and beauty"
    }
  },
  jongjae: {
    title: { ko: "부자 영혼", en: "Wealthy Soul" },
    emoji: "💰",
    traits: { ko: ["재물복", "사업수완", "풍요"], en: ["Wealth fortune", "Business acumen", "Prosperity"] },
    description: {
      ko: "재물을 끌어당기고 풍요를 누리는 타고난 부자 영혼",
      en: "Born wealthy soul that attracts fortune and enjoys prosperity"
    }
  },
  jongsal: {
    title: { ko: "통치자 영혼", en: "Ruler Soul" },
    emoji: "🏛️",
    traits: { ko: ["권위", "통제력", "영향력"], en: ["Authority", "Control", "Influence"] },
    description: {
      ko: "강력한 힘으로 세상을 이끄는 통치자 영혼",
      en: "Ruler soul that leads the world with powerful force"
    }
  },
  jonggang: {
    title: { ko: "리더 영혼", en: "Leader Soul" },
    emoji: "👥",
    traits: { ko: ["리더십", "자립", "경쟁력"], en: ["Leadership", "Independence", "Competitiveness"] },
    description: {
      ko: "스스로 일어서서 사람들을 이끄는 강한 영혼",
      en: "Strong soul that stands alone and leads people"
    }
  },
  gokjik: {
    title: { ko: "생명 영혼", en: "Life Soul" },
    emoji: "🌲",
    traits: { ko: ["성장", "생명력", "봄"], en: ["Growth", "Vitality", "Spring"] },
    description: {
      ko: "끊임없이 자라고 생명을 피워내는 생명력의 영혼",
      en: "Soul of vitality that constantly grows and brings life"
    }
  },
  yeomsang: {
    title: { ko: "불꽃 영혼", en: "Flame Soul" },
    emoji: "🔥",
    traits: { ko: ["열정", "빛", "에너지"], en: ["Passion", "Light", "Energy"] },
    description: {
      ko: "뜨거운 열정으로 세상을 밝히는 불꽃 같은 영혼",
      en: "Flame-like soul that lights the world with hot passion"
    }
  },
  gasaek: {
    title: { ko: "대지 영혼", en: "Earth Soul" },
    emoji: "🏔️",
    traits: { ko: ["안정", "신뢰", "포용"], en: ["Stability", "Trust", "Embrace"] },
    description: {
      ko: "흔들림 없이 모든 것을 품어주는 대지 같은 영혼",
      en: "Earth-like soul that embraces everything without wavering"
    }
  },
  jonghyeok: {
    title: { ko: "금속 영혼", en: "Metal Soul" },
    emoji: "⚔️",
    traits: { ko: ["정교함", "결단력", "완성도"], en: ["Precision", "Decisiveness", "Perfection"] },
    description: {
      ko: "정교하게 다듬어 완벽을 추구하는 금속 영혼",
      en: "Metal soul that pursues perfection through precise refinement"
    }
  },
  yunha: {
    title: { ko: "물 영혼", en: "Water Soul" },
    emoji: "🌊",
    traits: { ko: ["지혜", "유연함", "깊이"], en: ["Wisdom", "Flexibility", "Depth"] },
    description: {
      ko: "어디든 스며들어 모든 것을 연결하는 물 같은 영혼",
      en: "Water-like soul that seeps everywhere and connects everything"
    }
  },
};
