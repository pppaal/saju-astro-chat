// src/lib/past-life/analyzer.ts
/**
 * Past Life Analyzer
 * 전생 분석기 - KarmaTab의 로직을 재사용하여 전생 리딩 생성
 */

import type { PastLifeResult } from './types';

// ===== 타입 정의 =====

type GeokgukType = 'siksin' | 'sanggwan' | 'jeonggwan' | 'pyeongwan' | 'jeongjae' | 'pyeonjae' | 'jeongin' | 'pyeongin';
type HeavenlyStem = '갑' | '을' | '병' | '정' | '무' | '기' | '경' | '신' | '임' | '계';
type HouseNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

interface BilingualText {
  ko: string;
  en: string;
}

interface Planet {
  name?: string;
  house?: number;
}

interface SajuData {
  advancedAnalysis?: {
    geokguk?: {
      name?: string;
      type?: string;
    };
    sinsal?: {
      unluckyList?: Array<{ name?: string; shinsal?: string } | string>;
    };
  };
  dayMaster?: {
    name?: string;
    heavenlyStem?: string;
  };
  pillars?: {
    day?: {
      heavenlyStem?: string | { name?: string };
    };
  };
  fourPillars?: {
    day?: {
      heavenlyStem?: string;
    };
  };
}

interface AstroData {
  planets?: Planet[];
}

type SoulPatternData = {
  type: BilingualText;
  emoji: string;
  title: BilingualText;
  description: BilingualText;
  traits: { ko: string[]; en: string[] };
};

type PastLifeThemeData = {
  likely: BilingualText;
  talents: BilingualText;
  lessons: BilingualText;
  era?: BilingualText;
};

type NodeJourneyData = {
  pastPattern: BilingualText;
  release: BilingualText;
  direction: BilingualText;
  lesson: BilingualText;
};

type SaturnLessonData = {
  lesson: BilingualText;
  challenge: BilingualText;
  mastery: BilingualText;
};

type DayMasterMissionData = {
  core: BilingualText;
  expression: BilingualText;
  fulfillment: BilingualText;
};

// ===== 데이터 정의 =====

// 격국별 영혼 패턴
const SOUL_PATTERNS: Record<GeokgukType, SoulPatternData> = {
  siksin: {
    type: { ko: "창조자 영혼", en: "Creator Soul" },
    emoji: "🎨",
    title: { ko: "예술가의 영혼", en: "Artist's Soul" },
    description: {
      ko: "창작과 표현을 통해 세상과 소통하는 영혼입니다. 당신은 아름다움을 창조하고 나누는 것에서 가장 큰 기쁨을 느낍니다. 예술, 음식, 글쓰기, 디자인 등 어떤 형태로든 무언가를 만들어내는 것이 당신의 본질입니다. 당신의 창작물은 단순한 결과물이 아니라, 세상에 전하는 메시지이자 다른 이들에게 영감을 주는 선물입니다. 전생에서부터 쌓아온 이 재능을 이번 생에서는 더 넓은 무대에서 펼치고, 많은 사람들과 나누는 것이 당신의 사명입니다. 두려움 없이 당신의 창조적 에너지를 세상에 표현하세요.",
      en: "A soul that communicates with the world through creation and expression. You find the greatest joy in creating and sharing beauty. Whether through art, food, writing, design, or any other form, making something is your essence. Your creations are not mere products, but messages to the world and gifts that inspire others. The talent you've accumulated from past lives is meant to be displayed on a bigger stage in this life and shared with many people. Express your creative energy to the world without fear, as this is your soul's mission."
    },
    traits: { ko: ["창의력", "표현력", "심미안"], en: ["Creativity", "Expression", "Aesthetic sense"] },
  },
  sanggwan: {
    type: { ko: "변혁가 영혼", en: "Revolutionary Soul" },
    emoji: "⚡",
    title: { ko: "선구자의 영혼", en: "Pioneer's Soul" },
    description: {
      ko: "세상을 변화시키는 힘을 가진 영혼입니다. 당신은 말과 행동으로 사람들을 움직이고 새로운 변화를 이끄는 타고난 능력을 가지고 있습니다. 현상을 그대로 받아들이지 않고 더 나은 방향을 제시하는 것이 당신의 본능입니다. 전생에서 당신은 혁명가, 연예인, 강사 등 사람들에게 영향을 미치는 역할을 했을 가능성이 높습니다. 이번 생에서는 그 강력한 에너지를 건설적으로 사용하여 진정한 변화를 이끄는 것이 당신의 과제입니다. 파괴가 아닌 건설을 위해, 비판이 아닌 대안을 제시하며 세상을 더 나은 곳으로 만들어가세요.",
      en: "A soul with the power to change the world. You have a natural ability to move people with words and actions, leading transformative change. It is your instinct not to accept the status quo but to suggest better directions. In past lives, you likely played roles that influenced people such as revolutionary, entertainer, or lecturer. In this life, your challenge is to use that powerful energy constructively to lead genuine change. Work to build rather than destroy, offer alternatives rather than just criticize, and make the world a better place."
    },
    traits: { ko: ["카리스마", "혁신", "영향력"], en: ["Charisma", "Innovation", "Influence"] },
  },
  jeonggwan: {
    type: { ko: "지도자 영혼", en: "Leader Soul" },
    emoji: "👑",
    title: { ko: "통치자의 영혼", en: "Ruler's Soul" },
    description: {
      ko: "질서와 정의를 세우는 영혼입니다. 당신은 조직을 이끌고 시스템을 만드는 타고난 리더의 자질을 가지고 있습니다. 혼란 속에서 구조를 만들고, 공정한 규칙을 세우는 것이 당신의 특별한 재능입니다. 전생에서 당신은 관료, 판사, 지도자로서 많은 사람들을 이끌고 사회의 질서를 지켜왔을 가능성이 높습니다. 이번 생에서는 더 인간적인 리더십을 배우는 것이 당신의 과제입니다. 규칙과 시스템만큼이나 사람의 마음과 감정도 중요하다는 것을 이해하고, 따뜻한 권위를 발휘하세요. 공정함과 공감이 함께할 때 진정한 리더가 됩니다.",
      en: "A soul that establishes order and justice. You have the innate qualities of a leader who guides organizations and creates systems. Your special talent is creating structure from chaos and establishing fair rules. In past lives, you likely led many people as an official, judge, or leader, maintaining social order. In this life, your challenge is to learn more humane leadership. Understand that hearts and emotions matter as much as rules and systems, and exercise warm authority. You become a true leader when fairness and empathy come together."
    },
    traits: { ko: ["리더십", "정의감", "책임감"], en: ["Leadership", "Justice", "Responsibility"] },
  },
  pyeongwan: {
    type: { ko: "전사 영혼", en: "Warrior Soul" },
    emoji: "⚔️",
    title: { ko: "수호자의 영혼", en: "Guardian's Soul" },
    description: {
      ko: "도전과 극복의 에너지를 가진 영혼입니다. 당신은 어려움 속에서 오히려 더욱 강해지고, 위기 상황에서 진가를 발휘하는 전사의 정신을 가지고 있습니다. 도전을 두려워하지 않고 정면으로 맞서는 용기가 당신의 본질입니다. 전생에서 당신은 군인, 경찰, 격투가로서 약한 이들을 지키고 정의를 위해 싸웠을 가능성이 높습니다. 이번 생에서는 그 힘을 파괴가 아닌 보호를 위해 사용하는 것을 배워야 합니다. 진정한 강함은 공격하는 힘이 아니라 지키는 힘에 있습니다. 당신의 전사 정신을 사랑하는 사람들을 수호하고, 약자를 보호하며, 정의를 실현하는 데 사용하세요.",
      en: "A soul with energy for challenge and overcoming. You have a warrior spirit that grows stronger through difficulties and shines in crisis situations. The courage to face challenges head-on without fear is your essence. In past lives, you likely fought as a soldier, police officer, or fighter, protecting the weak and fighting for justice. In this life, you must learn to use that power for protection rather than destruction. True strength lies not in the power to attack but in the power to protect. Use your warrior spirit to guard loved ones, protect the vulnerable, and realize justice."
    },
    traits: { ko: ["용기", "결단력", "불굴의 의지"], en: ["Courage", "Determination", "Indomitable will"] },
  },
  jeongjae: {
    type: { ko: "보존자 영혼", en: "Preserver Soul" },
    emoji: "🏛️",
    title: { ko: "관리자의 영혼", en: "Steward's Soul" },
    description: {
      ko: "안정과 풍요를 만드는 영혼입니다. 당신은 가치 있는 것을 지키고 꾸준히 키워나가는 뛰어난 능력을 가지고 있습니다. 실용적이고 현실적인 판단력으로 재물과 자원을 안정적으로 쌓아가는 것이 당신의 특기입니다. 전생에서 당신은 상인, 은행가, 가정주부로서 가족과 공동체의 풍요를 책임져 왔을 가능성이 높습니다. 이번 생에서는 물질적 가치 너머의 진정한 풍요를 발견하는 것이 과제입니다. 소유하고 축적하는 것만이 아니라, 나누고 베푸는 것에서 오는 더 큰 만족을 경험하세요. 진정한 부는 가진 것이 아니라 나눌 수 있는 여유에 있습니다.",
      en: "A soul that creates stability and abundance. You have an excellent ability to protect what's valuable and grow it steadily. Your specialty is building wealth and resources stably through practical and realistic judgment. In past lives, you likely took responsibility for the prosperity of family and community as a merchant, banker, or homemaker. In this life, your challenge is discovering true abundance beyond material values. Experience the greater satisfaction that comes not just from owning and accumulating, but from sharing and giving. True wealth lies not in what you have, but in having the capacity to share."
    },
    traits: { ko: ["안정감", "신뢰성", "실용성"], en: ["Stability", "Reliability", "Practicality"] },
  },
  pyeonjae: {
    type: { ko: "모험가 영혼", en: "Adventurer Soul" },
    emoji: "🧭",
    title: { ko: "탐험가의 영혼", en: "Explorer's Soul" },
    description: {
      ko: "새로운 기회를 찾아 나서는 영혼입니다. 당신은 변화를 두려워하지 않고 오히려 그 속에서 새로운 가능성을 발견하는 타고난 탐험가입니다. 안정보다 성장을, 익숙함보다 새로움을 추구하는 것이 당신의 본성입니다. 전생에서 당신은 무역상, 투자가, 모험가로서 미지의 세계를 탐험하고 새로운 기회를 개척해왔을 가능성이 높습니다. 이번 생에서는 자유와 안정 사이의 균형을 찾는 것이 과제입니다. 끊임없이 움직이는 것만이 자유가 아니라, 때로는 한 곳에 뿌리를 내리는 것도 성장의 한 형태라는 것을 배우세요. 모험 정신을 유지하면서도 의미 있는 관계와 안정적인 기반을 만들어가는 것이 진정한 성숙입니다.",
      en: "A soul that seeks new opportunities. You are a natural explorer who doesn't fear change but discovers new possibilities within it. Your nature is to pursue growth over stability, newness over familiarity. In past lives, you likely explored unknown worlds and pioneered new opportunities as a trader, investor, or adventurer. In this life, your challenge is finding balance between freedom and stability. Learn that constant movement isn't the only form of freedom, and that sometimes putting down roots in one place is also a form of growth. True maturity is maintaining your adventurous spirit while building meaningful relationships and a stable foundation."
    },
    traits: { ko: ["적응력", "기회 포착", "도전정신"], en: ["Adaptability", "Opportunity spotting", "Challenging spirit"] },
  },
  jeongin: {
    type: { ko: "현자 영혼", en: "Sage Soul" },
    emoji: "📚",
    title: { ko: "학자의 영혼", en: "Scholar's Soul" },
    description: {
      ko: "지식과 지혜를 추구하는 영혼입니다. 당신은 배우고 탐구하는 것에서 큰 기쁨을 느끼며, 복잡한 개념도 깊이 이해하는 뛰어난 능력을 가지고 있습니다. 표면적인 이해가 아닌 본질을 파고드는 것이 당신의 방식입니다. 전생에서 당신은 학자, 수도승, 선생님으로서 지식을 축적하고 후학을 양성해왔을 가능성이 높습니다. 이번 생에서는 그 지식을 상아탑에 가두지 않고 더 많은 사람들과 나누는 것이 과제입니다. 어려운 개념을 쉽게 풀어서 설명하고, 학문을 실제 삶에 적용하는 방법을 찾으세요. 진정한 지혜는 아는 것이 아니라 나누는 것에 있습니다. 당신의 깊은 이해를 세상과 소통하며 더 많은 이들을 깨우치세요.",
      en: "A soul that pursues knowledge and wisdom. You find great joy in learning and exploring, with an excellent ability to deeply understand complex concepts. Your way is to dig into the essence rather than surface understanding. In past lives, you likely accumulated knowledge and nurtured future scholars as a scholar, monk, or teacher. In this life, your challenge is not keeping that knowledge in ivory towers but sharing it with more people. Explain difficult concepts simply and find ways to apply learning to real life. True wisdom lies not in knowing but in sharing. Communicate your deep understanding with the world and enlighten more people."
    },
    traits: { ko: ["지혜", "탐구심", "인내"], en: ["Wisdom", "Curiosity", "Patience"] },
  },
  pyeongin: {
    type: { ko: "신비가 영혼", en: "Mystic Soul" },
    emoji: "🔮",
    title: { ko: "예언자의 영혼", en: "Seer's Soul" },
    description: {
      ko: "직관과 영성을 따르는 영혼입니다. 당신은 보이지 않는 진실을 보고, 표면 아래에 숨겨진 의미를 읽어내는 특별한 능력을 가지고 있습니다. 직관과 통찰력이 매우 발달해 있어서, 논리로 설명할 수 없는 것들을 본능적으로 이해합니다. 전생에서 당신은 무당, 점술가, 연구자로서 보이지 않는 세계를 탐구하고 사람들을 영적으로 인도했을 가능성이 높습니다. 이번 생에서는 그 신비로운 능력을 고립된 채로 간직하지 말고, 사람들과 나누며 연결되는 것을 배워야 합니다. 당신의 통찰은 혼자만 알 때보다 다른 이들과 공유할 때 더 큰 의미를 갖습니다. 세상과 연결되며 영적 지혜를 나누세요.",
      en: "A soul that follows intuition and spirituality. You have the special ability to see invisible truths and read the hidden meanings beneath the surface. Your intuition and insight are highly developed, allowing you to instinctively understand things that cannot be explained by logic. In past lives, you likely explored invisible realms as a shaman, diviner, or researcher, guiding people spiritually. In this life, you must learn not to keep that mysterious ability in isolation, but to share and connect with people. Your insights have greater meaning when shared with others than when kept to yourself alone. Connect with the world and share your spiritual wisdom."
    },
    traits: { ko: ["직관력", "영성", "통찰력"], en: ["Intuition", "Spirituality", "Insight"] },
  },
};

// 격국별 전생 테마
const PAST_LIFE_THEMES: Record<GeokgukType, PastLifeThemeData> = {
  siksin: {
    likely: { ko: "전생에서 예술가, 요리사, 작가였을 가능성이 높아요. 창작과 표현을 통해 사람들에게 기쁨을 주었던 삶이었어요. 당신의 손에서 태어난 작품들은 단순한 창작물이 아니라 사람들의 마음을 움직이는 메시지였습니다. 르네상스 시대의 화가로서 벽화를 그렸거나, 조선시대의 도예가로서 아름다운 도자기를 빚었을 수도 있어요. 혹은 궁중 요리사로서 왕의 식탁을 책임지거나, 시인으로서 사랑과 자연을 노래했을 수도 있습니다. 당신은 항상 아름다움과 감동을 창조하며 살아온 영혼입니다.", en: "You were likely an artist, chef, or writer in past lives, bringing joy through creation and expression. Your works moved hearts as messages, not mere creations. You may have painted Renaissance frescoes, crafted Joseon Dynasty ceramics, served as royal chef, or sung as poet. You are a soul that has always created beauty and inspiration." },
    talents: { ko: "창작하고 표현하는 재능이 이미 익숙해요. 음식, 예술, 글쓰기에서 자연스러운 감각이 있어요. 무언가를 만들 때 특별한 즐거움을 느끼고, 다른 사람들도 당신의 작품에서 특별한 감동을 받습니다. 색감, 맛의 조화, 문장의 리듬을 본능적으로 이해하는 것은 이번 생이 처음이 아니기 때문입니다. 당신의 창의성은 배워서 얻은 것이 아니라 영혼 깊숙이 새겨진 재능입니다. 이러한 재능을 발휘할 때 당신은 가장 자연스럽고 행복한 모습이 됩니다.", en: "Creative and expressive talents feel familiar. You have a natural sense for food, art, and writing. You feel special joy when creating something, and others feel special inspiration from your work. Your instinctive understanding of colors, flavor combinations, and sentence rhythm is because this isn't your first life doing this. Your creativity is not learned but a talent carved deep in your soul. When exercising these talents, you become your most natural and happy self." },
    lessons: { ko: "이번 생에서는 더 큰 무대로 나가세요. 재능을 숨기지 말고 세상과 나누는 것이 과제예요. 전생에서는 제한된 범위 안에서 창작했다면, 이번에는 두려움 없이 세상에 당신의 작품을 선보이세요. SNS, 전시회, 출판, 어떤 형태든 좋습니다. 중요한 것은 당신의 재능이 더 많은 사람들에게 닿아 그들의 삶에 아름다움과 기쁨을 더하는 것입니다. 완벽하지 않아도 괜찮아요. 과정을 즐기며 세상과 나누는 용기를 내는 것, 그것이 이번 생의 가장 큰 과제입니다.", en: "This life, step onto a bigger stage. Sharing your talents with the world instead of hiding them is your challenge. If you created within limited scope in past lives, this time showcase your work to the world without fear. SNS, exhibitions, publishing - any form is fine. What matters is that your talent reaches more people and adds beauty and joy to their lives. It doesn't have to be perfect. Having the courage to enjoy the process and share with the world is your greatest challenge in this life." },
    era: { ko: "르네상스 시대 또는 조선시대 예술가", en: "Renaissance era or Joseon Dynasty artist" },
  },
  sanggwan: {
    likely: { ko: "전생에서 연예인, 강사, 혁명가였을 가능성이 높아요. 말과 영향력으로 세상을 바꾸려 했던 삶이었어요. 광장에서 수천 명에게 연설하거나 무대 위에서 관객을 사로잡았을 거예요. 프랑스 혁명기의 혁명가로서 자유를 외치거나, 독립운동가로서 민족의 희망이 되었을 수도 있습니다. 카리스마 있는 강사로서 제자들을 이끌거나, 배우로서 관객들의 감정을 움직였을 수도 있어요. 당신의 말 한마디, 행동 하나가 사람들에게 큰 영향을 미치는 강력한 에너지를 가진 영혼입니다.", en: "You were likely an entertainer, lecturer, or revolutionary, changing the world through words and influence. You gave speeches to thousands or captivated audiences on stage. As revolutionary crying for freedom or independence fighter, you wielded great influence. You are a soul whose every word and action impacts people powerfully." },
    talents: { ko: "말과 표현으로 사람을 움직이는 재능이 있어요. 대중 앞에 서는 것이 자연스러워요. 당신이 말을 시작하면 사람들이 귀를 기울이고 당신의 에너지에 이끌립니다. 이것은 단순한 화술이 아니라 영혼 깊은 곳에서 우러나오는 카리스마입니다. 무대 공포증이나 떨림을 느낄 수 있지만, 막상 대중 앞에 서면 놀라울 정도로 자연스럽게 에너지가 흐릅니다. 이러한 능력은 전생에서 수없이 단련된 것이기 때문입니다.", en: "You have talent to move people with words. Standing before crowds feels natural. When you start speaking, people listen and are drawn to your energy. This is not mere eloquence but charisma that wells up from deep in your soul. You may feel stage fright or nervousness, but once you stand before crowds, energy flows surprisingly naturally. This ability is because it was honed countless times in past lives." },
    lessons: { ko: "이번 생에서는 그 힘을 건설적으로 쓰세요. 파괴가 아닌 건설을 위한 변화를 이끄세요. 전생에서 혁명이나 저항을 위해 그 힘을 사용했다면, 이번에는 긍정적인 변화와 성장을 위해 사용하는 법을 배워야 합니다. 비판하고 무너뜨리는 것은 쉽지만, 대안을 제시하고 함께 만들어가는 것이 진짜 어렵고 의미 있는 일입니다. 당신의 강력한 영향력을 파괴가 아닌 창조를 위해, 분열이 아닌 통합을 위해 사용하세요. 그것이 이번 생의 가장 중요한 배움입니다.", en: "This life, use that power constructively. Lead change for building, not destruction. If you used that power for revolution or resistance in past lives, this time you must learn to use it for positive change and growth. Criticizing and tearing down is easy, but proposing alternatives and building together is truly difficult and meaningful. Use your powerful influence for creation rather than destruction, for unity rather than division. That is your most important learning in this life." },
    era: { ko: "프랑스 혁명기 또는 독립운동 시대", en: "French Revolution era or Independence movement period" },
  },
  jeonggwan: {
    likely: { ko: "전생에서 관료, 판사, 지도자였을 가능성이 높아요. 조직을 이끌고 질서를 세우는 삶이었어요. 로마 제국의 원로원 의원으로서 법을 제정하거나, 조선시대의 고위 관료로서 나라를 운영했을 수도 있습니다. 법정에서 공정한 판결을 내리는 판사였거나, 대규모 조직을 이끄는 관리자로서 수많은 사람들의 삶에 영향을 미쳤을 거예요. 당신은 혼란 속에서 질서를 만들고, 공정한 규칙을 세우며, 책임감 있게 조직을 이끌어온 영혼입니다. 리더십과 정의감이 당신의 본질입니다.", en: "You were likely an official, judge, or leader in past lives. You led organizations and established order. You may have enacted laws as a Roman Senate member, or operated the nation as a high-ranking Joseon Dynasty official. As a judge issuing fair verdicts in court, or a manager leading large organizations, you impacted countless lives. You are a soul that has created order from chaos, established fair rules, and led organizations responsibly. Leadership and sense of justice are your essence." },
    talents: { ko: "조직하고 이끄는 능력이 이미 있어요. 규칙과 시스템을 만드는 것이 자연스러워요. 복잡한 상황에서도 구조를 파악하고 체계를 세우는 능력이 뛰어납니다. 사람들은 자연스럽게 당신의 리더십을 따르고, 당신의 판단을 신뢰합니다. 공정함과 원칙을 중시하는 성향은 전생에서부터 이어온 당신의 특징입니다. 조직 관리, 문제 해결, 의사결정에서 탁월한 능력을 발휘하는 것은 우연이 아닙니다.", en: "Organizational and leadership abilities exist already. Creating rules and systems comes naturally. You excel at grasping structure and establishing systems even in complex situations. People naturally follow your leadership and trust your judgment. Your tendency to value fairness and principles is a trait continued from past lives. Your excellence in organizational management, problem-solving, and decision-making is no coincidence." },
    lessons: { ko: "이번 생에서는 더 인간적인 리더십을 배우세요. 규칙만큼 사람의 마음도 중요해요. 전생에서 규칙과 시스템을 중시했다면, 이번에는 그 틀 안에서 사람의 감정과 상황을 이해하는 법을 배워야 합니다. 완벽한 시스템보다 중요한 것은 그 시스템 안에서 살아가는 사람들의 행복입니다. 엄격함과 따뜻함의 균형을 찾으세요. 원칙을 지키되 유연하게, 공정하되 공감하며 리드하는 것이 이번 생의 과제입니다.", en: "This life, learn more human leadership. Hearts matter as much as rules. If you valued rules and systems in past lives, this time you must learn to understand people's emotions and situations within that framework. More important than a perfect system is the happiness of people living within it. Find balance between strictness and warmth. Your challenge this life is to lead with principles yet flexibly, fairly yet empathetically." },
    era: { ko: "로마 제국 또는 조선시대 관료", en: "Roman Empire or Joseon Dynasty official" },
  },
  pyeongwan: {
    likely: { ko: "전생에서 군인, 경찰, 격투가였을 가능성이 높아요. 도전을 두려워하지 않고 싸워온 삶이었어요. 전쟁터에서 부하들을 이끈 장군이었거나, 나라를 지킨 의병이었을 수도 있습니다. 거리를 순찰하며 시민들을 보호한 경찰관이었거나, 무술의 길을 걸은 격투가였을 수도 있어요. 어려움과 정면으로 맞서는 것을 두려워하지 않았고, 위기 상황에서 오히려 더욱 강해지는 전사의 정신을 가진 영혼입니다. 당신의 용기와 결단력은 수많은 시련을 통해 단련되어 왔습니다.", en: "You were likely a soldier, police, or fighter in past lives. You lived fighting without fearing challenges. You may have been a general leading troops on battlefields, or a resistance fighter defending the nation. Perhaps a police officer patrolling streets protecting citizens, or a martial artist walking the path of combat. You didn't fear facing difficulties head-on, and you are a soul with a warrior spirit that grows stronger in crisis situations. Your courage and determination have been forged through countless trials." },
    talents: { ko: "도전을 두려워하지 않는 용기가 있어요. 위기 상황에서 빛나는 능력이 있어요. 다른 사람들이 주저할 때 당신은 앞으로 나섭니다. 압박감 속에서도 침착함을 유지하고, 어려운 결정을 내릴 수 있는 강인함이 있습니다. 육체적으로나 정신적으로 강하며, 역경을 극복하는 능력이 뛰어납니다. 이러한 전사의 기질은 전생에서부터 이어져 내려온 것으로, 당신의 DNA에 새겨진 강인함입니다.", en: "You have courage that doesn't fear challenges. You shine in crisis situations. When others hesitate, you step forward. You maintain composure under pressure and have the strength to make difficult decisions. You are strong both physically and mentally, with excellent ability to overcome adversity. This warrior temperament has been passed down from past lives, a toughness etched in your DNA." },
    lessons: { ko: "이번 생에서는 파괴보다 보호를 배우세요. 힘을 지키는 데 쓰는 것이 진정한 강함이에요. 전생에서 싸우고 공격하는 데 힘을 사용했다면, 이번에는 사랑하는 사람들을 지키고 약자를 보호하는 데 그 힘을 쓰는 법을 배워야 합니다. 진정한 용기는 싸우는 것이 아니라 평화를 지키는 것입니다. 당신의 강인함을 파괴가 아닌 건설을 위해, 공격이 아닌 방어를 위해 사용하세요. 부드러움 속의 강함을 발견하는 것이 이번 생의 과제입니다.", en: "This life, learn protection over destruction. True strength is using power to protect. If you used strength to fight and attack in past lives, this time you must learn to use that power to guard loved ones and protect the vulnerable. True courage is not fighting but maintaining peace. Use your strength for building not destruction, for defense not attack. Discovering strength within gentleness is your challenge this life." },
    era: { ko: "전쟁 시대의 장군 또는 의병", en: "General in wartime or resistance fighter" },
  },
  jeongjae: {
    likely: { ko: "전생에서 상인, 은행가, 가정주부였을 가능성이 높아요. 안정과 풍요를 쌓아온 삶이었어요. 중세 상인 길드의 멤버로서 무역을 했거나, 개항기의 무역상으로서 부를 축적했을 수도 있습니다. 은행가로서 재정을 관리하고 투자했거나, 가정주부로서 가족의 경제를 꾸려나갔을 수도 있어요. 당신은 실용적인 지혜로 재물을 모으고, 가족과 공동체를 풍요롭게 만드는 능력을 가진 영혼입니다. 안정을 창조하고 유지하는 것이 당신의 특별한 재능입니다.", en: "You were likely a merchant, banker, or homemaker in past lives. You built stability and abundance. You may have traded as a medieval merchant guild member, or accumulated wealth as a port-opening era trade merchant. Perhaps you managed finances and invested as a banker, or ran family economics as a homemaker. You are a soul with ability to gather wealth with practical wisdom and enrich family and community. Creating and maintaining stability is your special talent." },
    talents: { ko: "안정적으로 재물을 쌓는 능력이 있어요. 실용적이고 현실적인 판단력이 뛰어나요. 좋은 투자와 나쁜 투자를 본능적으로 구분하고, 자원을 효율적으로 관리하는 감각이 있습니다. 허황된 꿈보다 현실적인 계획을 세우고, 꾸준히 실행하는 능력이 뛰어납니다. 재정 관리, 저축, 투자에서 자연스러운 재능을 보이는 것은 전생에서부터 쌓아온 경험 때문입니다. 당신은 물질적 안정을 만드는 데 타고난 능력이 있습니다.", en: "You have ability to build wealth steadily. You excel at practical and realistic judgment. You instinctively distinguish good investments from bad, with a sense for managing resources efficiently. Rather than unrealistic dreams, you excel at making practical plans and executing them consistently. Your natural talent in financial management, saving, and investing is due to experience accumulated from past lives. You have innate ability to create material stability." },
    lessons: { ko: "이번 생에서는 물질 너머의 가치를 탐구하세요. 소유가 아닌 나눔에서 풍요를 찾으세요. 전생에서 재물을 모으고 지키는 데 집중했다면, 이번에는 그것을 나누고 베푸는 기쁨을 배워야 합니다. 진정한 풍요는 얼마나 많이 가졌느냐가 아니라 얼마나 자유롭게 나눌 수 있느냐에 있습니다. 물질적 안정은 중요하지만, 그것이 전부는 아닙니다. 사랑, 관계, 경험 같은 무형의 가치에도 눈을 돌리세요. 베풀 때 진정한 만족을 느끼는 법을 배우는 것이 이번 생의 과제입니다.", en: "This life, explore values beyond material. Find abundance in sharing, not possessing. If you focused on accumulating and protecting wealth in past lives, this time you must learn the joy of sharing and giving. True abundance lies not in how much you have but in how freely you can share. Material stability is important, but it's not everything. Turn your eyes to intangible values like love, relationships, and experiences. Learning to feel true satisfaction when giving is your challenge this life." },
    era: { ko: "중세 상인 길드 또는 개항기 무역상", en: "Medieval merchant guild or trade merchant in port-opening era" },
  },
  pyeonjae: {
    likely: { ko: "전생에서 무역상, 투자가, 모험가였을 가능성이 높아요. 기회를 찾아 세계를 누빈 삶이었어요. 대항해 시대의 탐험가로서 신대륙을 향해 항해했거나, 실크로드를 따라 동서양을 오가며 무역을 했을 수도 있습니다. 위험한 투자를 과감히 결정한 투자가였거나, 미지의 땅을 탐험한 모험가였을 수도 있어요. 당신은 변화를 두려워하지 않고 오히려 그 속에서 새로운 가능성을 발견하는 영혼입니다. 자유롭게 세상을 누비며 기회를 포착하는 것이 당신의 본성입니다.", en: "You were likely a trader, investor, or adventurer in past lives. You roamed the world seeking opportunities. You may have sailed toward new continents as an Age of Exploration navigator, or traded between East and West along the Silk Road. Perhaps an investor who boldly decided on risky investments, or an adventurer who explored unknown lands. You are a soul that doesn't fear change but discovers new possibilities within it. Roaming the world freely and seizing opportunities is your nature." },
    talents: { ko: "기회를 포착하고 활용하는 능력이 있어요. 변화 속에서 번영하는 감각이 있어요. 다른 사람들이 위험하다고 생각할 때 당신은 기회를 봅니다. 새로운 환경에 빠르게 적응하고, 유연하게 대처하는 능력이 뛰어납니다. 한 곳에 오래 머물기보다 움직이며 성장하는 것을 선호하고, 다양한 경험을 통해 배우는 것을 즐깁니다. 이러한 모험 정신과 적응력은 전생에서 세계를 누비며 키운 능력입니다.", en: "You have ability to spot and use opportunities. You have a sense for thriving through change. When others see danger, you see opportunity. You excel at adapting quickly to new environments and responding flexibly. You prefer to grow while moving rather than staying in one place, and enjoy learning through diverse experiences. This adventurous spirit and adaptability are abilities cultivated by roaming the world in past lives." },
    lessons: { ko: "이번 생에서는 안정과 도전의 균형을 찾으세요. 뿌리 없이 떠도는 것만이 자유가 아니에요. 전생에서 끊임없이 움직이며 살았다면, 이번에는 한 곳에 뿌리를 내리는 것의 가치를 배워야 합니다. 진정한 자유는 도망치는 것이 아니라 선택할 수 있는 것입니다. 모험 정신을 유지하면서도 의미 있는 관계를 맺고, 안정적인 기반을 만드는 법을 배우세요. 정착한다는 것이 갇히는 것이 아니라 더 깊이 성장하는 것임을 발견하는 것이 이번 생의 과제입니다.", en: "This life, find balance between stability and risk. Freedom isn't just wandering without roots. If you lived constantly moving in past lives, this time you must learn the value of putting down roots in one place. True freedom is not running away but being able to choose. While maintaining your adventurous spirit, learn to form meaningful relationships and create a stable foundation. Discovering that settling down is not being trapped but growing deeper is your challenge this life." },
    era: { ko: "대항해 시대 탐험가 또는 실크로드 상인", en: "Age of Exploration navigator or Silk Road merchant" },
  },
  jeongin: {
    likely: { ko: "전생에서 학자, 수도승, 선생님이었을 가능성이 높아요. 지식을 쌓고 가르치는 삶이었어요. 고대 그리스의 철학자로서 진리를 탐구했거나, 조선시대의 선비로서 학문에 평생을 바쳤을 수도 있습니다. 수도원에서 경전을 연구한 수도승이었거나, 제자들을 가르친 존경받는 선생님이었을 수도 있어요. 당신은 배움에 대한 열정이 뜨겁고, 깊은 이해를 추구하는 영혼입니다. 지식을 축적하고 후학을 양성하는 것이 당신의 사명이었습니다.", en: "You were likely a scholar, monk, or teacher in past lives. You accumulated knowledge and taught. You may have explored truth as an ancient Greek philosopher, or devoted your life to learning as a Joseon Dynasty scholar. Perhaps a monk studying scriptures in a monastery, or a respected teacher instructing disciples. You are a soul with passionate enthusiasm for learning and pursuing deep understanding. Accumulating knowledge and nurturing future scholars was your mission." },
    talents: { ko: "배우고 가르치는 능력이 이미 있어요. 복잡한 것을 이해하는 능력이 뛰어나요. 어려운 개념도 깊이 파고들어 본질을 이해하고, 그것을 다른 사람들에게 쉽게 설명할 수 있습니다. 책을 읽고 공부하는 것에서 큰 기쁨을 느끼며, 끈기 있게 탐구하는 능력이 있습니다. 이러한 학구적 성향과 가르치는 재능은 전생에서부터 이어져 온 것입니다. 당신은 태어날 때부터 현자의 자질을 가지고 있었습니다.", en: "Learning and teaching abilities exist already. You excel at understanding complex things. You can dig deep into difficult concepts to understand their essence, and explain them easily to others. You find great joy in reading and studying, with ability to explore persistently. This scholarly disposition and teaching talent have continued from past lives. You were born with the qualities of a sage." },
    lessons: { ko: "이번 생에서는 지식을 더 넓게 나누세요. 상아탑에 갇히지 말고 세상과 소통하세요. 전생에서 학문에만 몰두했다면, 이번에는 그 지식을 실제 삶에 적용하고 더 많은 사람들과 나누는 법을 배워야 합니다. 어려운 것을 쉽게 풀어서 설명하고, 학문을 생활 속에서 활용하세요. 진정한 지혜는 아는 것이 아니라 삶으로 살아내고 나누는 것입니다. 세상과 연결되며 당신의 깊은 이해를 더 많은 이들과 공유하는 것이 이번 생의 과제입니다.", en: "This life, share knowledge more widely. Don't stay in ivory towers, communicate with the world. If you immersed yourself only in learning in past lives, this time you must learn to apply that knowledge to real life and share it with more people. Explain difficult things simply and utilize learning in everyday life. True wisdom is not knowing but living it out and sharing. Connecting with the world and sharing your deep understanding with more people is your challenge this life." },
    era: { ko: "고대 그리스 철학자 또는 조선시대 선비", en: "Ancient Greek philosopher or Joseon Dynasty scholar" },
  },
  pyeongin: {
    likely: { ko: "전생에서 무당, 점술가, 연구자였을 가능성이 높아요. 보이지 않는 세계를 탐구한 삶이었어요. 고대 신전의 신관으로서 신탁을 전했거나, 연금술사로서 우주의 비밀을 연구했을 수도 있습니다. 무당으로서 영적 세계와 소통했거나, 점술가로서 사람들의 운명을 읽어주었을 수도 있어요. 당신은 직관과 영성이 매우 발달한 영혼으로, 보이지 않는 진실을 보고 숨겨진 의미를 읽어내는 특별한 능력을 가지고 있습니다. 신비로운 것을 탐구하는 것이 당신의 본질입니다.", en: "You were likely a shaman, diviner, or researcher in past lives. You explored invisible realms. You may have conveyed oracles as a priest in ancient temples, or researched cosmic secrets as an alchemist. Perhaps you communicated with the spiritual world as a shaman, or read people's destinies as a diviner. You are a soul with highly developed intuition and spirituality, with special ability to see invisible truths and read hidden meanings. Exploring the mysterious is your essence." },
    talents: { ko: "직관과 통찰력이 이미 발달해 있어요. 표면 아래의 진실을 보는 능력이 있어요. 논리로 설명할 수 없는 것들을 본능적으로 이해하고, 사람들의 숨겨진 의도나 상황의 본질을 꿰뚫어 봅니다. 예감이 자주 맞고, 꿈이나 상징을 통해 메시지를 받는 경험을 합니다. 이러한 신비로운 능력은 전생에서부터 개발되어 온 것으로, 당신의 영혼에 깊이 새겨진 재능입니다. 당신은 보이지 않는 세계와 연결되어 있습니다.", en: "Intuition and insight are already developed. You can see truths beneath the surface. You instinctively understand things that cannot be explained by logic, and see through people's hidden intentions or the essence of situations. Your premonitions are often right, and you experience receiving messages through dreams or symbols. This mysterious ability has been developed from past lives, a talent deeply carved into your soul. You are connected to the invisible world." },
    lessons: { ko: "이번 생에서는 고립되지 말고 사람들과 연결하세요. 신비도 나눌 때 의미가 있어요. 전생에서 혼자 신비를 탐구했다면, 이번에는 그 통찰을 다른 사람들과 나누며 함께 성장하는 법을 배워야 합니다. 당신의 직관과 영성은 세상과 단절될 때가 아니라 세상과 연결될 때 더 큰 의미를 갖습니다. 신비로운 능력을 사람들을 돕고 치유하는 데 사용하세요. 고립이 아닌 연결 속에서 진정한 영적 성장을 이루는 것이 이번 생의 과제입니다.", en: "This life, connect with people instead of isolating. Mystery has meaning when shared. If you explored mysteries alone in past lives, this time you must learn to share those insights with others and grow together. Your intuition and spirituality have greater meaning when connected to the world, not when isolated from it. Use your mysterious abilities to help and heal people. Achieving true spiritual growth in connection rather than isolation is your challenge this life." },
    era: { ko: "고대 신관 또는 연금술사", en: "Ancient priest or alchemist" },
  },
};

// 노스노드 하우스별 영혼 여정
const NODE_JOURNEY: Record<HouseNumber, NodeJourneyData> = {
  1: {
    pastPattern: { ko: "타인에게 맞추며 자신을 잃은 전생", en: "Past life losing yourself by accommodating others" },
    release: { ko: "남의 시선에 대한 과도한 의존", en: "Over-dependence on others' opinions" },
    direction: { ko: "진정한 자아를 발견하고 표현하는 여정", en: "Journey to discover and express true self" },
    lesson: { ko: "자기 자신으로 당당히 살기", en: "Living confidently as yourself" },
  },
  2: {
    pastPattern: { ko: "타인의 자원에 의존한 전생", en: "Past life depending on others' resources" },
    release: { ko: "물질적 불안과 의존성", en: "Material insecurity and dependency" },
    direction: { ko: "자신만의 가치와 능력을 개발하는 여정", en: "Journey to develop your own values and abilities" },
    lesson: { ko: "스스로 가치를 창출하기", en: "Creating value on your own" },
  },
  3: {
    pastPattern: { ko: "큰 그림만 보며 디테일을 놓친 전생", en: "Past life seeing only big picture, missing details" },
    release: { ko: "추상적 사고에 대한 집착", en: "Obsession with abstract thinking" },
    direction: { ko: "일상의 소통과 학습에 집중하는 여정", en: "Journey focusing on daily communication and learning" },
    lesson: { ko: "가까운 관계와 실용적 지식 키우기", en: "Nurturing close relationships and practical knowledge" },
  },
  4: {
    pastPattern: { ko: "사회적 성공에만 몰두한 전생", en: "Past life focused only on social success" },
    release: { ko: "외부 인정에 대한 집착", en: "Obsession with external recognition" },
    direction: { ko: "가정과 내면의 안정을 찾는 여정", en: "Journey finding home and inner stability" },
    lesson: { ko: "뿌리를 내리고 감정적 안전 만들기", en: "Putting down roots and creating emotional safety" },
  },
  5: {
    pastPattern: { ko: "집단에 묻히며 개성을 잃은 전생", en: "Past life losing individuality in groups" },
    release: { ko: "집단에 대한 과도한 동조", en: "Over-conformity to groups" },
    direction: { ko: "창조적 자기 표현의 여정", en: "Journey of creative self-expression" },
    lesson: { ko: "기쁨과 창조로 자신을 표현하기", en: "Expressing yourself through joy and creation" },
  },
  6: {
    pastPattern: { ko: "환상과 도피에 빠진 전생", en: "Past life lost in fantasy and escape" },
    release: { ko: "현실 도피와 경계 부족", en: "Reality avoidance and lack of boundaries" },
    direction: { ko: "봉사와 실용적 삶의 여정", en: "Journey of service and practical living" },
    lesson: { ko: "일상의 의미와 건강한 습관 만들기", en: "Finding meaning in daily life and healthy habits" },
  },
  7: {
    pastPattern: { ko: "혼자서 모든 것을 해결한 전생", en: "Past life solving everything alone" },
    release: { ko: "과도한 독립과 고립", en: "Excessive independence and isolation" },
    direction: { ko: "파트너십과 협력을 배우는 여정", en: "Journey learning partnership and cooperation" },
    lesson: { ko: "진정한 관계와 균형 찾기", en: "Finding true relationships and balance" },
  },
  8: {
    pastPattern: { ko: "물질적 안정에 집착한 전생", en: "Past life obsessed with material stability" },
    release: { ko: "소유와 안전에 대한 집착", en: "Obsession with possession and safety" },
    direction: { ko: "깊은 변화와 공유의 여정", en: "Journey of deep transformation and sharing" },
    lesson: { ko: "변화를 받아들이고 진정한 친밀감 경험하기", en: "Accepting change and experiencing true intimacy" },
  },
  9: {
    pastPattern: { ko: "사소한 것에 매몰된 전생", en: "Past life buried in trivial matters" },
    release: { ko: "좁은 시야와 과도한 디테일 집착", en: "Narrow vision and over-focus on details" },
    direction: { ko: "넓은 세계와 의미를 탐구하는 여정", en: "Journey exploring wider world and meaning" },
    lesson: { ko: "큰 그림을 보고 철학을 찾기", en: "Seeing the big picture and finding philosophy" },
  },
  10: {
    pastPattern: { ko: "가정에만 갇혀 살았던 전생", en: "Past life confined to home" },
    release: { ko: "감정적 안전에 대한 과도한 집착", en: "Excessive attachment to emotional safety" },
    direction: { ko: "사회적 사명과 성취의 여정", en: "Journey of social mission and achievement" },
    lesson: { ko: "세상에 기여하고 성취를 이루기", en: "Contributing to the world and achieving" },
  },
  11: {
    pastPattern: { ko: "개인적 욕망에 빠진 전생", en: "Past life lost in personal desires" },
    release: { ko: "자기중심적 표현과 드라마", en: "Self-centered expression and drama" },
    direction: { ko: "공동체와 비전을 위해 사는 여정", en: "Journey living for community and vision" },
    lesson: { ko: "더 큰 목적을 위해 기여하기", en: "Contributing to a greater purpose" },
  },
  12: {
    pastPattern: { ko: "물질과 일에만 집중한 전생", en: "Past life focused only on material and work" },
    release: { ko: "완벽주의와 과도한 통제", en: "Perfectionism and excessive control" },
    direction: { ko: "영성과 초월의 여정", en: "Journey of spirituality and transcendence" },
    lesson: { ko: "손 놓고 우주를 신뢰하기", en: "Letting go and trusting the universe" },
  },
};

// 토성 하우스별 카르마 수업
const SATURN_LESSONS: Record<HouseNumber, SaturnLessonData> = {
  1: {
    lesson: { ko: "자기 정체성을 확립하는 것", en: "Establishing self-identity" },
    challenge: { ko: "자기 표현의 어려움, 자신감 부족", en: "Difficulty with self-expression, lack of confidence" },
    mastery: { ko: "진정한 자아로 당당히 서는 힘", en: "Power to stand confidently as true self" },
  },
  2: {
    lesson: { ko: "자신의 가치를 인정하는 것", en: "Recognizing your own worth" },
    challenge: { ko: "물질적 불안, 자기 가치 의심", en: "Material insecurity, doubting self-worth" },
    mastery: { ko: "안정적인 재정과 자존감 확립", en: "Establishing stable finances and self-esteem" },
  },
  3: {
    lesson: { ko: "효과적으로 소통하는 것", en: "Communicating effectively" },
    challenge: { ko: "말하기 두려움, 학습 어려움", en: "Fear of speaking, learning difficulties" },
    mastery: { ko: "명확한 소통과 지적 권위 획득", en: "Gaining clear communication and intellectual authority" },
  },
  4: {
    lesson: { ko: "감정적 안정과 가정을 만드는 것", en: "Creating emotional stability and home" },
    challenge: { ko: "가정 문제, 불안정한 어린 시절", en: "Family issues, unstable childhood" },
    mastery: { ko: "강한 내면의 기반과 안전한 가정 구축", en: "Building strong inner foundation and secure home" },
  },
  5: {
    lesson: { ko: "창조적으로 자기를 표현하는 것", en: "Expressing yourself creatively" },
    challenge: { ko: "창의력 억압, 즐거움에 대한 죄책감", en: "Creativity suppression, guilt about pleasure" },
    mastery: { ko: "자유로운 자기 표현과 기쁨 찾기", en: "Free self-expression and finding joy" },
  },
  6: {
    lesson: { ko: "건강과 일상을 관리하는 것", en: "Managing health and daily life" },
    challenge: { ko: "건강 문제, 일 중독, 완벽주의", en: "Health issues, workaholism, perfectionism" },
    mastery: { ko: "균형 잡힌 습관과 효율적인 서비스", en: "Balanced habits and efficient service" },
  },
  7: {
    lesson: { ko: "진정한 파트너십을 만드는 것", en: "Creating true partnership" },
    challenge: { ko: "관계의 어려움, 균형 잡기 힘듦", en: "Relationship difficulties, trouble finding balance" },
    mastery: { ko: "성숙한 관계와 공정한 파트너십", en: "Mature relationships and fair partnership" },
  },
  8: {
    lesson: { ko: "변화와 친밀감을 받아들이는 것", en: "Accepting transformation and intimacy" },
    challenge: { ko: "통제 욕구, 신뢰 문제, 상실 두려움", en: "Control needs, trust issues, fear of loss" },
    mastery: { ko: "깊은 변환과 진정한 친밀감 경험", en: "Deep transformation and true intimacy" },
  },
  9: {
    lesson: { ko: "의미와 철학을 찾는 것", en: "Finding meaning and philosophy" },
    challenge: { ko: "믿음의 위기, 좁은 시야", en: "Faith crisis, narrow vision" },
    mastery: { ko: "넓은 지혜와 의미 있는 삶", en: "Broad wisdom and meaningful life" },
  },
  10: {
    lesson: { ko: "세상에서 자신의 역할을 찾는 것", en: "Finding your role in the world" },
    challenge: { ko: "커리어 장애, 인정받지 못하는 느낌", en: "Career obstacles, feeling unrecognized" },
    mastery: { ko: "진정한 성취와 사회적 권위", en: "True achievement and social authority" },
  },
  11: {
    lesson: { ko: "커뮤니티와 비전을 위해 일하는 것", en: "Working for community and vision" },
    challenge: { ko: "고립감, 소속되지 못하는 느낌", en: "Isolation, feeling of not belonging" },
    mastery: { ko: "진정한 소속감과 사회 기여", en: "True belonging and social contribution" },
  },
  12: {
    lesson: { ko: "영적 성장과 내면 평화 찾기", en: "Finding spiritual growth and inner peace" },
    challenge: { ko: "무의식적 두려움, 고립, 자기 파괴", en: "Unconscious fears, isolation, self-destruction" },
    mastery: { ko: "영적 지혜와 초월적 평화", en: "Spiritual wisdom and transcendent peace" },
  },
};

// 일간별 영혼 미션
const DAY_MASTER_MISSION: Record<HeavenlyStem, DayMasterMissionData> = {
  '갑': {
    core: { ko: "새로운 시작을 이끄는 개척자가 되세요", en: "Be a pioneer leading new beginnings" },
    expression: { ko: "성장과 발전을 추구하며 다른 이들을 이끄세요", en: "Pursue growth and lead others" },
    fulfillment: { ko: "당신이 시작한 것이 숲처럼 자랄 때 가장 행복해요", en: "Happiest when what you started grows like a forest" },
  },
  '을': {
    core: { ko: "부드러운 힘으로 세상을 변화시키세요", en: "Change the world with gentle power" },
    expression: { ko: "적응하고 조화를 이루며 아름다움을 만드세요", en: "Adapt, harmonize, and create beauty" },
    fulfillment: { ko: "어디서든 피어나는 꽃처럼 살 때 가장 행복해요", en: "Happiest living like a flower that blooms anywhere" },
  },
  '병': {
    core: { ko: "빛과 열정으로 세상을 밝히세요", en: "Light the world with passion and radiance" },
    expression: { ko: "열정적으로 표현하고 다른 이들을 따뜻하게 해주세요", en: "Express passionately and warm others" },
    fulfillment: { ko: "태양처럼 모든 것을 비출 때 가장 행복해요", en: "Happiest when illuminating everything like the sun" },
  },
  '정': {
    core: { ko: "따뜻한 빛으로 가까운 이들을 돌보세요", en: "Care for those close with warm light" },
    expression: { ko: "섬세하고 따뜻하게 관계를 만들어가세요", en: "Build relationships with delicacy and warmth" },
    fulfillment: { ko: "촛불처럼 가까운 이들을 밝힐 때 가장 행복해요", en: "Happiest illuminating close ones like a candle" },
  },
  '무': {
    core: { ko: "든든한 터전을 만들어 모든 것을 지지하세요", en: "Create solid foundations that support all" },
    expression: { ko: "안정적이고 신뢰할 수 있는 존재가 되세요", en: "Be a stable and reliable presence" },
    fulfillment: { ko: "산처럼 모든 것을 품을 때 가장 행복해요", en: "Happiest embracing everything like a mountain" },
  },
  '기': {
    core: { ko: "기름진 땅처럼 모든 것을 키우세요", en: "Nurture everything like fertile soil" },
    expression: { ko: "보살피고 성장시키는 역할을 하세요", en: "Take on roles of caring and growing" },
    fulfillment: { ko: "다른 것들이 당신 안에서 자랄 때 가장 행복해요", en: "Happiest when others grow within you" },
  },
  '경': {
    core: { ko: "정의와 원칙으로 세상을 바로잡으세요", en: "Correct the world with justice and principle" },
    expression: { ko: "결단력 있고 명확하게 행동하세요", en: "Act with decisiveness and clarity" },
    fulfillment: { ko: "칼처럼 불의를 바로잡을 때 가장 행복해요", en: "Happiest correcting injustice like a sword" },
  },
  '신': {
    core: { ko: "섬세함으로 가치를 정제하세요", en: "Refine value with delicacy" },
    expression: { ko: "완벽함을 추구하며 아름다운 것을 만드세요", en: "Pursue perfection and create beautiful things" },
    fulfillment: { ko: "보석처럼 빛나는 것을 만들 때 가장 행복해요", en: "Happiest creating things that shine like gems" },
  },
  '임': {
    core: { ko: "지혜의 바다처럼 모든 것을 품으세요", en: "Embrace everything like an ocean of wisdom" },
    expression: { ko: "유연하고 깊이 있게 세상을 이해하세요", en: "Understand the world with flexibility and depth" },
    fulfillment: { ko: "바다처럼 모든 것이 흘러들 때 가장 행복해요", en: "Happiest when everything flows into you like the ocean" },
  },
  '계': {
    core: { ko: "생명의 근원처럼 필요한 곳을 적시세요", en: "Moisten where needed like the source of life" },
    expression: { ko: "필요한 곳에 은은하게 스며드세요", en: "Gently seep into where you're needed" },
    fulfillment: { ko: "이슬처럼 생명을 살릴 때 가장 행복해요", en: "Happiest giving life like dew" },
  },
};

// ===== 상수 정의 =====

// 카르마 점수 계산 상수
const KARMA_SCORE_CONFIG = {
  BASE_SCORE: 65,
  MIN_SCORE: 40,
  MAX_SCORE: 100,
  BONUS: {
    GEOKGUK: 10,
    NORTH_NODE: 8,
    SATURN: 5,
    DAY_MASTER: 5,
    PER_KARMIC_DEBT: 3,
  },
};

// 기본 폴백 값
const DEFAULT_VALUES = {
  SOUL_TYPE: { ko: "탐험가 영혼", en: "Explorer Soul" },
  SOUL_TITLE: { ko: "탐험가의 영혼", en: "Explorer's Soul" },
  SOUL_DESCRIPTION: {
    ko: "다양한 경험을 통해 성장하는 영혼. 새로운 것을 배우고 도전하며 자신을 발견해가요.",
    en: "A soul growing through diverse experiences. Learning new things and discovering yourself.",
  },
  SOUL_TRAITS: { ko: ["호기심", "적응력", "성장"], en: ["Curiosity", "Adaptability", "Growth"] },
  SOUL_EMOJI: "🌟",
} as const;

// 격국별 재능 매핑 (성능 최적화를 위해 상수로 분리)
const GEOKGUK_TALENTS: Record<GeokgukType, { ko: string; en: string }[]> = {
  siksin: [{ ko: "창작 능력", en: "Creative ability" }, { ko: "미적 감각", en: "Aesthetic sense" }, { ko: "요리/음식", en: "Cooking/Food" }],
  sanggwan: [{ ko: "언변", en: "Eloquence" }, { ko: "퍼포먼스", en: "Performance" }, { ko: "영향력", en: "Influence" }],
  jeonggwan: [{ ko: "조직력", en: "Organization" }, { ko: "공정함", en: "Fairness" }, { ko: "리더십", en: "Leadership" }],
  pyeongwan: [{ ko: "용기", en: "Courage" }, { ko: "결단력", en: "Determination" }, { ko: "실행력", en: "Execution" }],
  jeongjae: [{ ko: "재정 관리", en: "Financial management" }, { ko: "실용성", en: "Practicality" }, { ko: "안정감", en: "Stability" }],
  pyeonjae: [{ ko: "기회 포착", en: "Opportunity spotting" }, { ko: "적응력", en: "Adaptability" }, { ko: "네트워킹", en: "Networking" }],
  jeongin: [{ ko: "학습 능력", en: "Learning ability" }, { ko: "가르침", en: "Teaching" }, { ko: "인내", en: "Patience" }],
  pyeongin: [{ ko: "직관력", en: "Intuition" }, { ko: "영성", en: "Spirituality" }, { ko: "통찰력", en: "Insight" }],
};

// 격국 이름 매핑 (한글 → 영문 타입)
const GEOKGUK_NAME_MAPPING: Record<string, GeokgukType> = {
  '식신': 'siksin',
  '식신격': 'siksin',
  '상관': 'sanggwan',
  '상관격': 'sanggwan',
  '정관': 'jeonggwan',
  '정관격': 'jeonggwan',
  '편관': 'pyeongwan',
  '편관격': 'pyeongwan',
  '칠살': 'pyeongwan',
  '정재': 'jeongjae',
  '정재격': 'jeongjae',
  '편재': 'pyeonjae',
  '편재격': 'pyeonjae',
  '정인': 'jeongin',
  '정인격': 'jeongin',
  '편인': 'pyeongin',
  '편인격': 'pyeongin',
};

// 카르마 부채 설정
const KARMIC_DEBT_CONFIG = {
  MAX_ITEMS: 3,
  PATTERNS: {
    '원진': {
      ko: { area: "관계 카르마", description: "전생에서 해결하지 못한 관계의 갈등이 있어요. 특정 사람과의 충돌이 반복될 수 있어요.", healing: "용서하고 이해하려 노력하세요" },
      en: { area: "Relationship Karma", description: "Unresolved relationship conflicts from past lives. Conflicts with certain people may repeat.", healing: "Try to forgive and understand" }
    },
    '공망': {
      ko: { area: "공허 카르마", description: "전생에서 무언가를 잃은 경험이 깊이 남아있어요. 특정 영역에서 공허함을 느낄 수 있어요.", healing: "내면을 채우는 영적 수행을 하세요" },
      en: { area: "Emptiness Karma", description: "Deep experience of loss from past lives remains. You may feel emptiness in certain areas.", healing: "Practice spiritual cultivation to fill your inner self" }
    },
    '겁살': {
      ko: { area: "도전 카르마", description: "전생에서 극복하지 못한 도전이 다시 찾아와요. 어려움이 성장의 기회임을 기억하세요.", healing: "두려움을 직면하고 극복하세요" },
      en: { area: "Challenge Karma", description: "Challenges not overcome in past lives return. Remember difficulties are growth opportunities.", healing: "Face and overcome your fears" }
    },
  }
} as const;

// 토성 회귀 나이
const SATURN_RETURN_AGES = {
  FIRST: 29,
  SECOND: 58,
} as const;

// 카르마 패턴 매칭 (한글 + 한자)
const KARMIC_PATTERN_MATCHERS: Record<string, string[]> = {
  '원진': ['원진'],
  '공망': ['공망', '空亡'],
  '겁살': ['겁살', '劫殺'],
};

// 유효한 천간 (Heavenly Stems)
const VALID_HEAVENLY_STEMS = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'] as const;

// 행성 이름 별칭
const PLANET_ALIASES = {
  northNode: ['north', 'northnode'],
  saturn: ['saturn'],
} as const;

// 폴백 이중언어 텍스트
const FALLBACK_TEXTS = {
  PAST_LIFE: {
    likely: { ko: "다양한 역할을 경험한 영혼입니다.", en: "A soul that experienced various roles." },
    talents: { ko: "전생에서 쌓은 다양한 재능이 있어요.", en: "You have diverse talents from past lives." },
    lessons: { ko: "과거의 패턴을 인식하고 성장하세요.", en: "Recognize past patterns and grow." },
  },
  SOUL_JOURNEY: {
    pastPattern: { ko: "전생의 패턴이 현재에 영향을 미치고 있어요", en: "Past life patterns influence the present" },
    releasePattern: { ko: "오래된 습관과 집착", en: "Old habits and attachments" },
    currentDirection: { ko: "새로운 성장의 방향으로", en: "Toward new growth" },
    lessonToLearn: { ko: "변화를 받아들이고 성장하기", en: "Accepting change and growing" },
  },
  SATURN_LESSON: {
    lesson: { ko: "인생의 중요한 교훈이 기다리고 있어요", en: "Important life lessons await" },
    mastery: { ko: "나이 들수록 더 강해지고 현명해져요", en: "You grow stronger and wiser with age" },
  },
  THIS_LIFE_MISSION: {
    core: { ko: "당신만의 빛으로 세상을 밝히세요", en: "Light the world with your unique light" },
    expression: { ko: "자신에게 충실하면 길이 열려요", en: "Being true to yourself opens the path" },
    fulfillment: { ko: "진정한 나로 살 때 가장 행복해요", en: "Happiest when living as your true self" },
  },
  DEFAULT_TALENTS: [
    { ko: "적응력", en: "Adaptability" },
    { ko: "학습 능력", en: "Learning ability" },
    { ko: "회복력", en: "Resilience" },
  ],
} as const;

// ===== 헬퍼 함수 =====

function selectLang(isKo: boolean, text: BilingualText): string {
  return isKo ? text.ko : text.en;
}

function selectLangFromArray<T extends { ko: string; en: string }>(isKo: boolean, items: readonly T[]): string[] {
  return items.map(item => isKo ? item.ko : item.en);
}

function isValidHeavenlyStem(char: string): char is HeavenlyStem {
  return (VALID_HEAVENLY_STEMS as readonly string[]).includes(char);
}

function getGeokgukType(geokName: string | undefined): GeokgukType | null {
  if (!geokName) return null;
  return GEOKGUK_NAME_MAPPING[geokName] || null;
}

function findPlanetHouse(astro: AstroData | null, planetName: string): HouseNumber | null {
  if (!astro?.planets) return null;

  const planet = astro.planets.find((p: Planet) =>
    p.name?.toLowerCase().includes(planetName.toLowerCase())
  );

  if (planet?.house && planet.house >= 1 && planet.house <= 12) {
    return planet.house as HouseNumber;
  }

  return null;
}

function findPlanetByAliases(astro: AstroData | null, aliases: readonly string[]): HouseNumber | null {
  for (const alias of aliases) {
    const house = findPlanetHouse(astro, alias);
    if (house) return house;
  }
  return null;
}

function extractDayMasterChar(saju: SajuData | null): HeavenlyStem | null {
  if (!saju) return null;

  // 여러 소스에서 일간 문자열 추출 시도
  const sources = [
    saju.dayMaster?.name,
    saju.dayMaster?.heavenlyStem,
    typeof saju.pillars?.day?.heavenlyStem === 'string'
      ? saju.pillars.day.heavenlyStem
      : (saju.pillars?.day?.heavenlyStem as { name?: string })?.name,
    saju.fourPillars?.day?.heavenlyStem,
  ];

  const dayMasterStr = sources.find(s => s && s.trim().length > 0);
  if (!dayMasterStr) return null;

  const firstChar = dayMasterStr.charAt(0);
  return isValidHeavenlyStem(firstChar) ? firstChar : null;
}

// ===== 메인 분석 함수 =====

// 영혼 패턴 생성 헬퍼
function buildSoulPattern(geokgukType: GeokgukType | null, isKo: boolean): PastLifeResult['soulPattern'] {
  if (geokgukType && SOUL_PATTERNS[geokgukType]) {
    const pattern = SOUL_PATTERNS[geokgukType];
    return {
      type: selectLang(isKo, pattern.type),
      emoji: pattern.emoji,
      title: selectLang(isKo, pattern.title),
      description: selectLang(isKo, pattern.description),
      traits: isKo ? pattern.traits.ko : pattern.traits.en,
    };
  }

  return {
    type: selectLang(isKo, DEFAULT_VALUES.SOUL_TYPE),
    emoji: DEFAULT_VALUES.SOUL_EMOJI,
    title: selectLang(isKo, DEFAULT_VALUES.SOUL_TITLE),
    description: selectLang(isKo, DEFAULT_VALUES.SOUL_DESCRIPTION),
    traits: [...(isKo ? DEFAULT_VALUES.SOUL_TRAITS.ko : DEFAULT_VALUES.SOUL_TRAITS.en)],
  };
}

// 전생 테마 생성 헬퍼
function buildPastLife(geokgukType: GeokgukType | null, isKo: boolean): PastLifeResult['pastLife'] {
  if (geokgukType && PAST_LIFE_THEMES[geokgukType]) {
    const theme = PAST_LIFE_THEMES[geokgukType];
    return {
      likely: selectLang(isKo, theme.likely),
      talents: selectLang(isKo, theme.talents),
      lessons: selectLang(isKo, theme.lessons),
      era: theme.era ? selectLang(isKo, theme.era) : undefined,
    };
  }

  return {
    likely: selectLang(isKo, FALLBACK_TEXTS.PAST_LIFE.likely),
    talents: selectLang(isKo, FALLBACK_TEXTS.PAST_LIFE.talents),
    lessons: selectLang(isKo, FALLBACK_TEXTS.PAST_LIFE.lessons),
  };
}

// 영혼 여정 생성 헬퍼
function buildSoulJourney(northNodeHouse: HouseNumber | null, isKo: boolean): PastLifeResult['soulJourney'] {
  if (northNodeHouse && NODE_JOURNEY[northNodeHouse]) {
    const journey = NODE_JOURNEY[northNodeHouse];
    return {
      pastPattern: selectLang(isKo, journey.pastPattern),
      releasePattern: selectLang(isKo, journey.release),
      currentDirection: selectLang(isKo, journey.direction),
      lessonToLearn: selectLang(isKo, journey.lesson),
    };
  }

  return {
    pastPattern: selectLang(isKo, FALLBACK_TEXTS.SOUL_JOURNEY.pastPattern),
    releasePattern: selectLang(isKo, FALLBACK_TEXTS.SOUL_JOURNEY.releasePattern),
    currentDirection: selectLang(isKo, FALLBACK_TEXTS.SOUL_JOURNEY.currentDirection),
    lessonToLearn: selectLang(isKo, FALLBACK_TEXTS.SOUL_JOURNEY.lessonToLearn),
  };
}

// 카르마 부채 분석 헬퍼
function analyzeKarmicDebts(saju: SajuData | null, isKo: boolean): PastLifeResult['karmicDebts'] {
  const karmicDebts: PastLifeResult['karmicDebts'] = [];
  const unluckyList = saju?.advancedAnalysis?.sinsal?.unluckyList || [];

  for (const item of unluckyList.slice(0, KARMIC_DEBT_CONFIG.MAX_ITEMS)) {
    const name = typeof item === 'string' ? item : item?.name || item?.shinsal || '';
    if (!name) continue;

    // Check each pattern
    for (const [patternKey, patternData] of Object.entries(KARMIC_DEBT_CONFIG.PATTERNS)) {
      const searchTerms = KARMIC_PATTERN_MATCHERS[patternKey];
      if (searchTerms?.some(term => name.includes(term))) {
        const data = isKo ? patternData.ko : patternData.en;
        karmicDebts.push(data);
        break;
      }
    }
  }

  return karmicDebts;
}

// 토성 수업 생성 헬퍼
function buildSaturnLesson(saturnHouse: HouseNumber | null, isKo: boolean): PastLifeResult['saturnLesson'] {
  if (saturnHouse && SATURN_LESSONS[saturnHouse]) {
    const lesson = SATURN_LESSONS[saturnHouse];
    return {
      lesson: selectLang(isKo, lesson.lesson),
      challenge: selectLang(isKo, lesson.challenge),
      mastery: selectLang(isKo, lesson.mastery),
    };
  }

  return {
    lesson: selectLang(isKo, FALLBACK_TEXTS.SATURN_LESSON.lesson),
    challenge: isKo
      ? `${SATURN_RETURN_AGES.FIRST}세, ${SATURN_RETURN_AGES.SECOND}세 전후로 큰 시험이 와요`
      : `Major tests come around ages ${SATURN_RETURN_AGES.FIRST} and ${SATURN_RETURN_AGES.SECOND}`,
    mastery: selectLang(isKo, FALLBACK_TEXTS.SATURN_LESSON.mastery),
  };
}

// 전생 재능 추출 헬퍼
function extractTalentsCarried(geokgukType: GeokgukType | null, isKo: boolean): string[] {
  if (!geokgukType) {
    return [...selectLangFromArray(isKo, FALLBACK_TEXTS.DEFAULT_TALENTS)];
  }

  const geokTalents = GEOKGUK_TALENTS[geokgukType];
  return geokTalents ? selectLangFromArray(isKo, geokTalents) : [];
}

// 이번 생 미션 생성 헬퍼
function buildThisLifeMission(dayMasterChar: HeavenlyStem | null, isKo: boolean): PastLifeResult['thisLifeMission'] {
  if (dayMasterChar && DAY_MASTER_MISSION[dayMasterChar]) {
    const mission = DAY_MASTER_MISSION[dayMasterChar];
    return {
      core: selectLang(isKo, mission.core),
      expression: selectLang(isKo, mission.expression),
      fulfillment: selectLang(isKo, mission.fulfillment),
    };
  }

  return {
    core: selectLang(isKo, FALLBACK_TEXTS.THIS_LIFE_MISSION.core),
    expression: selectLang(isKo, FALLBACK_TEXTS.THIS_LIFE_MISSION.expression),
    fulfillment: selectLang(isKo, FALLBACK_TEXTS.THIS_LIFE_MISSION.fulfillment),
  };
}

// 카르마 점수 계산 헬퍼
function calculateKarmaScore(
  geokgukType: GeokgukType | null,
  northNodeHouse: HouseNumber | null,
  saturnHouse: HouseNumber | null,
  dayMasterChar: HeavenlyStem | null,
  karmicDebtsCount: number
): number {
  let score = KARMA_SCORE_CONFIG.BASE_SCORE;

  if (geokgukType) score += KARMA_SCORE_CONFIG.BONUS.GEOKGUK;
  if (northNodeHouse) score += KARMA_SCORE_CONFIG.BONUS.NORTH_NODE;
  if (saturnHouse) score += KARMA_SCORE_CONFIG.BONUS.SATURN;
  if (dayMasterChar) score += KARMA_SCORE_CONFIG.BONUS.DAY_MASTER;
  if (karmicDebtsCount > 0) score += karmicDebtsCount * KARMA_SCORE_CONFIG.BONUS.PER_KARMIC_DEBT;

  return Math.min(KARMA_SCORE_CONFIG.MAX_SCORE, Math.max(KARMA_SCORE_CONFIG.MIN_SCORE, score));
}

export function analyzePastLife(
  saju: SajuData | null,
  astro: AstroData | null,
  isKo: boolean
): PastLifeResult {
  // 기본 데이터 추출
  const geokguk = saju?.advancedAnalysis?.geokguk;
  const geokName = geokguk?.name || geokguk?.type;
  const geokgukType = getGeokgukType(geokName);
  const dayMasterChar = extractDayMasterChar(saju);
  const northNodeHouse = findPlanetByAliases(astro, PLANET_ALIASES.northNode);
  const saturnHouse = findPlanetByAliases(astro, PLANET_ALIASES.saturn);

  // 각 섹션 생성 (헬퍼 함수 사용)
  const soulPattern = buildSoulPattern(geokgukType, isKo);
  const pastLife = buildPastLife(geokgukType, isKo);
  const soulJourney = buildSoulJourney(northNodeHouse, isKo);
  const karmicDebts = analyzeKarmicDebts(saju, isKo);
  const saturnLesson = buildSaturnLesson(saturnHouse, isKo);
  const talentsCarried = extractTalentsCarried(geokgukType, isKo);
  const thisLifeMission = buildThisLifeMission(dayMasterChar, isKo);
  const karmaScore = calculateKarmaScore(geokgukType, northNodeHouse, saturnHouse, dayMasterChar, karmicDebts.length);

  return {
    soulPattern,
    pastLife,
    soulJourney,
    karmicDebts,
    saturnLesson,
    talentsCarried,
    thisLifeMission,
    karmaScore,
    geokguk: geokName,
    northNodeHouse: northNodeHouse ?? undefined,
    saturnHouse: saturnHouse ?? undefined,
    dayMaster: dayMasterChar ?? undefined,
  };
}
