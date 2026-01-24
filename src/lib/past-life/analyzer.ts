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
      ko: `창작과 표현을 통해 세상과 소통하는 영혼입니다. 당신은 아름다움을 창조하고 나누는 것에서 가장 큰 기쁨을 느끼며, 이것은 수많은 전생에서 갈고닦아 온 영혼의 본질입니다.
예술, 음식, 글쓰기, 디자인, 음악, 공예 등 어떤 형태로든 무언가를 만들어내는 것이 당신의 존재 이유입니다. 당신의 손에서 태어난 창작물은 단순한 결과물이 아니라, 세상에 전하는 깊은 메시지이자 다른 이들의 영혼을 울리는 선물입니다.
전생에서 당신은 르네상스 시대의 화가로서 성당의 천장화를 그렸거나, 조선시대의 도예가로서 왕실에 바칠 청자를 빚었을 수도 있습니다. 고대 그리스의 조각가로서 신들의 형상을 대리석에 새겼거나, 중세 유럽의 음유시인으로서 성에서 성으로 다니며 노래를 불렀을 수도 있어요.
당신의 창의성은 배워서 얻은 것이 아니라 영혼 깊숙이 새겨진 타고난 재능입니다. 색감의 조화, 맛의 균형, 문장의 리듬, 멜로디의 흐름을 본능적으로 이해하는 것은 이번 생이 처음이 아니기 때문입니다.
이번 생에서 당신의 사명은 그 재능을 더 넓은 무대에서 펼치고, 더 많은 사람들과 나누는 것입니다. 전생에서는 후원자나 왕실의 제한된 범위 안에서 창작했다면, 이번에는 두려움 없이 온 세상에 당신의 작품을 선보이세요.
완벽하지 않아도 괜찮습니다. 창작의 과정 자체가 당신의 영혼을 치유하고 성장시킵니다. 당신이 만든 것이 한 사람의 마음이라도 움직인다면, 그것이 바로 당신의 영혼이 이 세상에 존재하는 이유입니다.`,
      en: `A soul that communicates with the world through creation and expression. You find the greatest joy in creating and sharing beauty, and this is the essence of your soul refined through countless past lives.
Whether through art, food, writing, design, music, crafts, or any other form, making something is your reason for existence. Your creations are not mere products, but profound messages to the world and gifts that touch other souls.
In past lives, you may have painted cathedral ceilings as a Renaissance artist, or crafted celadon for royalty as a Joseon Dynasty potter. Perhaps you carved the forms of gods in marble as an ancient Greek sculptor, or traveled from castle to castle singing as a medieval European troubadour.
Your creativity is not learned but an innate talent carved deep in your soul. Your instinctive understanding of color harmony, flavor balance, sentence rhythm, and melodic flow exists because this is not your first life doing this.
In this life, your mission is to display that talent on a bigger stage and share it with more people. If you created within the limited scope of patrons or royalty in past lives, this time showcase your work to the entire world without fear.
It doesn't have to be perfect. The creative process itself heals and grows your soul. If what you create moves even one person's heart, that is exactly why your soul exists in this world.`
    },
    traits: { ko: ["창의력", "표현력", "심미안", "감성", "영감"], en: ["Creativity", "Expression", "Aesthetic sense", "Sensitivity", "Inspiration"] },
  },
  sanggwan: {
    type: { ko: "변혁가 영혼", en: "Revolutionary Soul" },
    emoji: "⚡",
    title: { ko: "선구자의 영혼", en: "Pioneer's Soul" },
    description: {
      ko: `세상을 변화시키는 힘을 가진 영혼입니다. 당신은 말과 행동으로 사람들을 움직이고 새로운 변화를 이끄는 타고난 능력을 가지고 있으며, 이것은 수많은 전생에서 단련된 강력한 에너지입니다.
현상을 그대로 받아들이지 않고 더 나은 방향을 제시하는 것이 당신의 본능입니다. 불의를 보면 참지 못하고, 잘못된 것을 바로잡으려는 열정이 당신의 영혼 깊은 곳에서 타오릅니다.
전생에서 당신은 프랑스 혁명기의 혁명가로서 광장에서 수천 명에게 자유를 외쳤거나, 독립운동가로서 민족의 희망이 되었을 수도 있습니다. 로마의 웅변가로서 원로원에서 연설했거나, 종교개혁 시대의 설교자로서 새로운 사상을 전파했을 수도 있어요.
당신이 말을 시작하면 사람들이 귀를 기울이고, 당신의 에너지에 이끌립니다. 이것은 단순한 화술이 아니라 영혼 깊은 곳에서 우러나오는 진정한 카리스마입니다. 무대 위에서든 회의실에서든, 당신은 사람들의 마음을 움직이는 힘을 가지고 있습니다.
이번 생에서 당신의 과제는 그 강력한 에너지를 건설적으로 사용하는 것입니다. 전생에서 혁명이나 저항을 위해 그 힘을 사용했다면, 이번에는 긍정적인 변화와 성장을 위해 사용하는 법을 배워야 합니다.
파괴가 아닌 건설을 위해, 비판이 아닌 대안을 제시하며, 분열이 아닌 통합을 위해 당신의 영향력을 사용하세요. 그것이 당신의 영혼이 이번 생에서 배워야 할 가장 중요한 교훈입니다.`,
      en: `A soul with the power to change the world. You have a natural ability to move people with words and actions, leading transformative change, and this is a powerful energy refined through countless past lives.
It is your instinct not to accept the status quo but to suggest better directions. You cannot stand by when you see injustice, and a passion to correct what is wrong burns deep in your soul.
In past lives, you may have cried for freedom to thousands in the square as a revolutionary during the French Revolution, or become the hope of a nation as an independence fighter. Perhaps you gave speeches in the Roman Senate as an orator, or spread new ideas as a preacher during the Reformation era.
When you start speaking, people listen and are drawn to your energy. This is not mere eloquence but true charisma that wells up from deep in your soul. Whether on stage or in the boardroom, you have the power to move people's hearts.
In this life, your challenge is to use that powerful energy constructively. If you used that power for revolution or resistance in past lives, this time you must learn to use it for positive change and growth.
Use your influence for building rather than destruction, for proposing alternatives rather than just criticism, for unity rather than division. That is the most important lesson your soul must learn in this life.`
    },
    traits: { ko: ["카리스마", "혁신", "영향력", "열정", "변화 주도"], en: ["Charisma", "Innovation", "Influence", "Passion", "Change leadership"] },
  },
  jeonggwan: {
    type: { ko: "지도자 영혼", en: "Leader Soul" },
    emoji: "👑",
    title: { ko: "통치자의 영혼", en: "Ruler's Soul" },
    description: {
      ko: `질서와 정의를 세우는 영혼입니다. 당신은 조직을 이끌고 시스템을 만드는 타고난 리더의 자질을 가지고 있으며, 이것은 수많은 전생에서 쌓아온 통치의 지혜입니다.
혼란 속에서 구조를 만들고, 공정한 규칙을 세우며, 모든 사람이 각자의 역할을 다할 수 있도록 조직하는 것이 당신의 특별한 재능입니다. 복잡한 상황에서도 본질을 파악하고 올바른 결정을 내리는 능력이 뛰어납니다.
전생에서 당신은 로마 제국의 원로원 의원으로서 법을 제정하고 국가를 운영했거나, 조선시대의 고위 관료로서 백성을 다스렸을 수도 있습니다. 중세 유럽의 영주로서 영지를 통치했거나, 고대 이집트의 서기관으로서 파라오의 행정을 보좌했을 수도 있어요.
사람들은 자연스럽게 당신의 리더십을 따르고, 당신의 판단을 신뢰합니다. 위기 상황에서 침착하게 지휘하고, 갈등을 공정하게 중재하는 능력은 전생에서부터 이어온 당신의 특징입니다.
이번 생에서 당신의 과제는 더 인간적인 리더십을 배우는 것입니다. 규칙과 시스템만큼이나 사람의 마음과 감정도 중요하다는 것을 깊이 이해해야 합니다.
완벽한 시스템보다 중요한 것은 그 시스템 안에서 살아가는 사람들의 행복입니다. 엄격함과 따뜻함의 균형을 찾고, 원칙을 지키되 유연하게, 공정하되 공감하며 이끄는 것이 당신의 영혼이 성장하는 길입니다.`,
      en: `A soul that establishes order and justice. You have innate qualities of a leader who guides organizations and creates systems, wisdom of governance accumulated through countless past lives.
Your special talent is creating structure from chaos, establishing fair rules, and organizing so everyone can fulfill their roles. You excel at grasping the essence of complex situations and making right decisions.
In past lives, you may have enacted laws and operated the state as a Roman Senate member, or governed the people as a high-ranking Joseon Dynasty official. Perhaps you ruled a domain as a medieval European lord, or assisted the Pharaoh's administration as an ancient Egyptian scribe.
People naturally follow your leadership and trust your judgment. Your ability to calmly command in crisis situations and fairly mediate conflicts is a trait continued from past lives.
In this life, your challenge is to learn more humane leadership. You must deeply understand that hearts and emotions matter as much as rules and systems.
More important than a perfect system is the happiness of people living within it. Finding balance between strictness and warmth, leading with principles yet flexibly, fairly yet empathetically is the path for your soul's growth.`
    },
    traits: { ko: ["리더십", "정의감", "책임감", "조직력", "결단력"], en: ["Leadership", "Justice", "Responsibility", "Organization", "Decisiveness"] },
  },
  pyeongwan: {
    type: { ko: "전사 영혼", en: "Warrior Soul" },
    emoji: "⚔️",
    title: { ko: "수호자의 영혼", en: "Guardian's Soul" },
    description: {
      ko: `도전과 극복의 에너지를 가진 영혼입니다. 당신은 어려움 속에서 오히려 더욱 강해지고, 위기 상황에서 진가를 발휘하는 전사의 정신을 가지고 있으며, 이것은 수많은 전쟁터에서 단련된 불굴의 의지입니다.
도전을 두려워하지 않고 정면으로 맞서는 용기가 당신의 본질입니다. 다른 사람들이 주저하고 물러설 때, 당신은 앞으로 나아갑니다. 압박감 속에서도 침착함을 유지하고, 어려운 결정을 내릴 수 있는 강인함이 있습니다.
전생에서 당신은 전쟁터에서 부하들을 이끈 장군이었거나, 나라를 지킨 의병이었을 수도 있습니다. 거리를 순찰하며 시민들을 보호한 경찰관이었거나, 무술의 길을 걸은 격투가였을 수도 있어요. 기사로서 성을 지켰거나, 사무라이로서 주군을 위해 싸웠을 수도 있습니다.
당신의 용기와 결단력은 수많은 시련을 통해 단련되어 왔습니다. 육체적으로나 정신적으로 강하며, 역경을 극복하는 능력이 뛰어납니다. 위기가 닥쳤을 때 가장 먼저 행동하는 사람이 바로 당신입니다.
이번 생에서 당신의 과제는 그 힘을 파괴가 아닌 보호를 위해 사용하는 것을 배우는 것입니다. 진정한 강함은 공격하는 힘이 아니라 지키는 힘에 있습니다.
당신의 전사 정신을 사랑하는 사람들을 수호하고, 약자를 보호하며, 정의를 실현하는 데 사용하세요. 부드러움 속의 강함, 평화를 지키기 위한 힘을 발견하는 것이 당신의 영혼이 배워야 할 교훈입니다.`,
      en: `A soul with energy for challenge and overcoming. You have a warrior spirit that grows stronger through difficulties and shines in crisis situations, an indomitable will forged on countless battlefields.
The courage to face challenges head-on without fear is your essence. When others hesitate and retreat, you move forward. You maintain composure under pressure and have the strength to make difficult decisions.
In past lives, you may have been a general leading troops on battlefields, or a resistance fighter defending the nation. Perhaps a police officer patrolling streets protecting citizens, or a martial artist walking the path of combat. You might have guarded castles as a knight, or fought for your lord as a samurai.
Your courage and determination have been forged through countless trials. You are strong both physically and mentally, with excellent ability to overcome adversity. When crisis strikes, you are the first to act.
In this life, your challenge is to learn to use that power for protection rather than destruction. True strength lies not in the power to attack but in the power to protect.
Use your warrior spirit to guard loved ones, protect the vulnerable, and realize justice. Discovering strength within gentleness, power to maintain peace is the lesson your soul must learn.`
    },
    traits: { ko: ["용기", "결단력", "불굴의 의지", "보호 본능", "실행력"], en: ["Courage", "Determination", "Indomitable will", "Protective instinct", "Execution"] },
  },
  jeongjae: {
    type: { ko: "보존자 영혼", en: "Preserver Soul" },
    emoji: "🏛️",
    title: { ko: "관리자의 영혼", en: "Steward's Soul" },
    description: {
      ko: `안정과 풍요를 만드는 영혼입니다. 당신은 가치 있는 것을 지키고 꾸준히 키워나가는 뛰어난 능력을 가지고 있으며, 이것은 수많은 전생에서 쌓아온 풍요의 지혜입니다.
실용적이고 현실적인 판단력으로 재물과 자원을 안정적으로 쌓아가는 것이 당신의 특기입니다. 허황된 꿈보다 현실적인 계획을 세우고, 꾸준히 실행하는 능력이 뛰어납니다. 좋은 투자와 나쁜 투자를 본능적으로 구분하는 감각이 있습니다.
전생에서 당신은 중세 상인 길드의 멤버로서 유럽 전역에 무역망을 구축했거나, 개항기의 무역상으로서 부를 축적했을 수도 있습니다. 은행가로서 왕실의 재정을 관리하고 투자했거나, 대가족의 가장으로서 가족의 경제를 꾸려나갔을 수도 있어요.
당신은 실용적인 지혜로 재물을 모으고, 가족과 공동체를 풍요롭게 만드는 능력을 가진 영혼입니다. 안정을 창조하고 유지하는 것, 다음 세대에 물려줄 기반을 만드는 것이 당신의 특별한 재능입니다.
이번 생에서 당신의 과제는 물질적 가치 너머의 진정한 풍요를 발견하는 것입니다. 소유하고 축적하는 것만이 아니라, 나누고 베푸는 것에서 오는 더 큰 만족을 경험해야 합니다.
진정한 부는 얼마나 많이 가졌느냐가 아니라 얼마나 자유롭게 나눌 수 있느냐에 있습니다. 물질적 안정은 중요하지만, 사랑, 관계, 경험 같은 무형의 가치도 똑같이 소중합니다. 베풀 때 진정한 만족을 느끼는 법을 배우는 것이 당신의 영혼이 성장하는 길입니다.`,
      en: `A soul that creates stability and abundance. You have an excellent ability to protect what's valuable and grow it steadily, wisdom of prosperity accumulated through countless past lives.
Your specialty is building wealth and resources stably through practical and realistic judgment. Rather than unrealistic dreams, you excel at making practical plans and executing them consistently. You have an instinct for distinguishing good investments from bad.
In past lives, you may have built trade networks across Europe as a medieval merchant guild member, or accumulated wealth as a port-opening era trade merchant. Perhaps you managed and invested royal finances as a banker, or ran the family economy as head of a large household.
You are a soul with ability to gather wealth through practical wisdom and enrich family and community. Creating and maintaining stability, building a foundation to pass on to the next generation is your special talent.
In this life, your challenge is discovering true abundance beyond material values. You must experience the greater satisfaction that comes not just from owning and accumulating, but from sharing and giving.
True wealth lies not in how much you have but in how freely you can share. Material stability is important, but intangible values like love, relationships, and experiences are equally precious. Learning to feel true satisfaction when giving is the path for your soul's growth.`
    },
    traits: { ko: ["안정감", "신뢰성", "실용성", "재정 관리", "지속성"], en: ["Stability", "Reliability", "Practicality", "Financial management", "Persistence"] },
  },
  pyeonjae: {
    type: { ko: "모험가 영혼", en: "Adventurer Soul" },
    emoji: "🧭",
    title: { ko: "탐험가의 영혼", en: "Explorer's Soul" },
    description: {
      ko: `새로운 기회를 찾아 나서는 영혼입니다. 당신은 변화를 두려워하지 않고 오히려 그 속에서 새로운 가능성을 발견하는 타고난 탐험가이며, 이것은 수많은 전생에서 세계를 누비며 키운 모험 정신입니다.
안정보다 성장을, 익숙함보다 새로움을 추구하는 것이 당신의 본성입니다. 한 곳에 오래 머물기보다 움직이며 성장하는 것을 선호하고, 다양한 경험을 통해 배우는 것을 즐깁니다. 다른 사람들이 위험하다고 생각할 때 당신은 기회를 봅니다.
전생에서 당신은 대항해 시대의 탐험가로서 신대륙을 향해 항해했거나, 실크로드를 따라 동서양을 오가며 무역을 했을 수도 있습니다. 위험한 투자를 과감히 결정한 벤처 상인이었거나, 미지의 땅을 탐험한 모험가였을 수도 있어요.
새로운 환경에 빠르게 적응하고, 유연하게 대처하는 능력이 뛰어납니다. 다양한 문화와 사람들을 만나며 얻은 넓은 시야와 열린 마음이 당신의 자산입니다. 자유롭게 세상을 누비며 기회를 포착하는 것이 당신의 본성입니다.
이번 생에서 당신의 과제는 자유와 안정 사이의 균형을 찾는 것입니다. 끊임없이 움직이는 것만이 자유가 아니라, 때로는 한 곳에 뿌리를 내리는 것도 성장의 한 형태라는 것을 배워야 합니다.
진정한 자유는 도망치는 것이 아니라 선택할 수 있는 것입니다. 모험 정신을 유지하면서도 의미 있는 관계와 안정적인 기반을 만드는 것이 당신의 영혼이 이번 생에서 배워야 할 성숙입니다.`,
      en: `A soul that seeks new opportunities. You are a natural explorer who doesn't fear change but discovers new possibilities within it, an adventurous spirit cultivated by roaming the world in countless past lives.
Your nature is to pursue growth over stability, newness over familiarity. You prefer to grow while moving rather than staying in one place, and enjoy learning through diverse experiences. When others see danger, you see opportunity.
In past lives, you may have sailed toward new continents as an Age of Exploration navigator, or traded between East and West along the Silk Road. Perhaps a venture merchant who boldly decided on risky investments, or an adventurer who explored unknown lands.
You excel at adapting quickly to new environments and responding flexibly. Your broad perspective and open mind gained from meeting diverse cultures and people are your assets. Roaming the world freely and seizing opportunities is your nature.
In this life, your challenge is finding balance between freedom and stability. You must learn that constant movement isn't the only form of freedom, and that sometimes putting down roots in one place is also a form of growth.
True freedom is not running away but being able to choose. Maintaining your adventurous spirit while building meaningful relationships and a stable foundation is the maturity your soul must learn in this life.`
    },
    traits: { ko: ["적응력", "기회 포착", "도전정신", "유연성", "글로벌 마인드"], en: ["Adaptability", "Opportunity spotting", "Challenging spirit", "Flexibility", "Global mindset"] },
  },
  jeongin: {
    type: { ko: "현자 영혼", en: "Sage Soul" },
    emoji: "📚",
    title: { ko: "학자의 영혼", en: "Scholar's Soul" },
    description: {
      ko: `지식과 지혜를 추구하는 영혼입니다. 당신은 배우고 탐구하는 것에서 큰 기쁨을 느끼며, 복잡한 개념도 깊이 이해하는 뛰어난 능력을 가지고 있습니다. 이것은 수많은 전생에서 축적해온 지혜의 결정체입니다.
표면적인 이해가 아닌 본질을 파고드는 것이 당신의 방식입니다. 어려운 개념도 끈기 있게 탐구하여 마침내 본질을 이해하고, 그것을 다른 사람들에게 쉽게 설명할 수 있는 능력이 있습니다. 책을 읽고 공부하는 것에서 진정한 기쁨을 느낍니다.
전생에서 당신은 고대 그리스의 철학자로서 아카데미아에서 진리를 탐구했거나, 조선시대의 선비로서 성균관에서 학문에 평생을 바쳤을 수도 있습니다. 수도원에서 경전을 연구하고 필사한 수도승이었거나, 제자들을 가르친 존경받는 선생님이었을 수도 있어요.
당신은 배움에 대한 열정이 뜨겁고, 깊은 이해를 추구하는 영혼입니다. 지식을 축적하고 후학을 양성하는 것, 진리를 탐구하고 지혜를 전하는 것이 당신의 영혼이 이 세상에 존재하는 이유입니다.
이번 생에서 당신의 과제는 그 지식을 상아탑에 가두지 않고 더 많은 사람들과 나누는 것입니다. 어려운 것을 쉽게 풀어서 설명하고, 학문을 실제 삶에 적용하는 방법을 찾아야 합니다.
진정한 지혜는 아는 것이 아니라 삶으로 살아내고 나누는 것에 있습니다. 세상과 연결되며 당신의 깊은 이해를 더 많은 이들과 공유하는 것이 당신의 영혼이 성장하는 길입니다.`,
      en: `A soul that pursues knowledge and wisdom. You find great joy in learning and exploring, with an excellent ability to deeply understand complex concepts. This is the crystallization of wisdom accumulated through countless past lives.
Your way is to dig into the essence rather than surface understanding. You have the ability to persistently explore difficult concepts until you understand their essence, and then explain them easily to others. You find true joy in reading and studying.
In past lives, you may have explored truth at the Academy as an ancient Greek philosopher, or devoted your life to learning at Seonggyungwan as a Joseon Dynasty scholar. Perhaps a monk who studied and copied scriptures in a monastery, or a respected teacher who taught disciples.
You are a soul with passionate enthusiasm for learning and pursuing deep understanding. Accumulating knowledge and nurturing future scholars, exploring truth and passing on wisdom is why your soul exists in this world.
In this life, your challenge is not keeping that knowledge in ivory towers but sharing it with more people. You must explain difficult things simply and find ways to apply learning to real life.
True wisdom lies not in knowing but in living it out and sharing. Connecting with the world and sharing your deep understanding with more people is the path for your soul's growth.`
    },
    traits: { ko: ["지혜", "탐구심", "인내", "통찰력", "가르침"], en: ["Wisdom", "Curiosity", "Patience", "Insight", "Teaching"] },
  },
  pyeongin: {
    type: { ko: "신비가 영혼", en: "Mystic Soul" },
    emoji: "🔮",
    title: { ko: "예언자의 영혼", en: "Seer's Soul" },
    description: {
      ko: `직관과 영성을 따르는 영혼입니다. 당신은 보이지 않는 진실을 보고, 표면 아래에 숨겨진 의미를 읽어내는 특별한 능력을 가지고 있습니다. 이것은 수많은 전생에서 영적 세계를 탐구하며 개발해온 신비로운 재능입니다.
직관과 통찰력이 매우 발달해 있어서, 논리로 설명할 수 없는 것들을 본능적으로 이해합니다. 사람들의 숨겨진 의도나 상황의 본질을 꿰뚫어 보고, 예감이 자주 맞으며, 꿈이나 상징을 통해 메시지를 받는 경험을 합니다.
전생에서 당신은 고대 신전의 신관으로서 신탁을 전했거나, 연금술사로서 우주의 비밀을 연구했을 수도 있습니다. 무당으로서 영적 세계와 소통하고 사람들을 치유했거나, 점술가로서 왕과 귀족들의 운명을 읽어주었을 수도 있어요.
당신은 보이지 않는 세계와 연결되어 있는 영혼입니다. 평범한 사람들이 보지 못하는 것을 보고, 느끼지 못하는 것을 느끼며, 알지 못하는 것을 아는 능력이 있습니다. 이것은 저주가 아니라 축복이며, 당신만의 특별한 사명입니다.
이번 생에서 당신의 과제는 그 신비로운 능력을 고립된 채로 간직하지 않고, 사람들과 나누며 연결되는 것을 배우는 것입니다. 당신의 통찰은 혼자만 알 때보다 다른 이들과 공유할 때 더 큰 의미를 갖습니다.
신비로운 능력을 사람들을 돕고 치유하는 데 사용하세요. 고립이 아닌 연결 속에서, 세상과 함께 호흡하며 영적 성장을 이루는 것이 당신의 영혼이 배워야 할 교훈입니다.`,
      en: `A soul that follows intuition and spirituality. You have the special ability to see invisible truths and read the hidden meanings beneath the surface. This is a mysterious talent developed through exploring the spiritual world in countless past lives.
Your intuition and insight are highly developed, allowing you to instinctively understand things that cannot be explained by logic. You see through people's hidden intentions and the essence of situations, your premonitions are often right, and you experience receiving messages through dreams and symbols.
In past lives, you may have conveyed oracles as a priest in ancient temples, or researched cosmic secrets as an alchemist. Perhaps you communicated with the spiritual world and healed people as a shaman, or read the destinies of kings and nobles as a diviner.
You are a soul connected to the invisible world. You have the ability to see what ordinary people cannot see, feel what they cannot feel, and know what they do not know. This is not a curse but a blessing, your own special mission.
In this life, your challenge is learning not to keep that mysterious ability in isolation, but to share and connect with people. Your insights have greater meaning when shared with others than when kept to yourself alone.
Use your mysterious abilities to help and heal people. Achieving spiritual growth in connection rather than isolation, breathing together with the world is the lesson your soul must learn.`
    },
    traits: { ko: ["직관력", "영성", "통찰력", "치유 능력", "신비로움"], en: ["Intuition", "Spirituality", "Insight", "Healing ability", "Mystery"] },
  },
};

// 격국별 전생 테마
const PAST_LIFE_THEMES: Record<GeokgukType, PastLifeThemeData> = {
  siksin: {
    likely: {
      ko: `전생에서 예술가, 요리사, 작가였을 가능성이 높아요. 창작과 표현을 통해 사람들에게 기쁨을 주었던 삶이었습니다.
당신의 손에서 태어난 작품들은 단순한 창작물이 아니라 사람들의 마음을 움직이는 깊은 메시지였습니다. 르네상스 시대의 화가로서 피렌체의 성당에 벽화를 그렸거나, 조선시대의 도예가로서 왕실에 바칠 청자를 빚었을 수도 있어요.
혹은 궁중 요리사로서 왕의 식탁을 책임지며 맛의 예술을 창조했거나, 시인으로서 사랑과 자연과 인생의 의미를 아름다운 언어로 노래했을 수도 있습니다. 중세 유럽의 음유시인으로서 성에서 성으로 다니며 이야기를 전했거나, 일본의 우키요에 화가로서 아름다운 판화를 제작했을 수도 있어요.
당신은 어느 시대, 어느 문화권에서든 항상 아름다움과 감동을 창조하며 살아온 영혼입니다. 창작이 곧 호흡이었고, 표현이 곧 존재의 이유였습니다. 당신의 작품 하나하나에 영혼을 담았고, 그 영혼은 시간을 초월해 사람들의 마음에 닿았습니다.`,
      en: `You were likely an artist, chef, or writer in past lives. Yours was a life of bringing joy to people through creation and expression.
Your works were not mere creations but profound messages that moved people's hearts. You may have painted frescoes in Florence's cathedrals as a Renaissance artist, or crafted celadon for royalty as a Joseon Dynasty potter.
Perhaps you created culinary art as a royal chef responsible for the king's table, or sang of love, nature, and life's meaning in beautiful words as a poet. You might have traveled from castle to castle as a medieval European troubadour sharing stories, or produced beautiful woodblock prints as a Japanese ukiyo-e artist.
In any era, any culture, you are a soul that has always lived creating beauty and inspiration. Creation was your breath, expression was your reason for existence. You poured your soul into each work, and that soul touched hearts across time.`
    },
    talents: {
      ko: `창작하고 표현하는 재능이 이미 익숙해요. 음식, 예술, 글쓰기, 음악, 디자인 어디서든 자연스러운 감각이 발휘됩니다.
무언가를 만들 때 특별한 즐거움과 몰입을 경험하고, 다른 사람들도 당신의 작품에서 특별한 감동과 영감을 받습니다. 색감의 조화, 맛의 균형, 문장의 리듬, 멜로디의 흐름을 본능적으로 이해하는 것은 이번 생이 처음이 아니기 때문입니다.
당신의 창의성은 교육으로 배워서 얻은 것이 아니라 수많은 전생에서 갈고닦아 영혼 깊숙이 새겨진 타고난 재능입니다. 처음 접하는 예술 형식이나 창작 도구도 금방 익숙해지는 것은 이미 전생에서 경험했기 때문이에요.
이러한 재능을 발휘할 때 당신은 가장 자연스럽고 행복한 모습이 됩니다. 시간 가는 줄 모르고 창작에 몰두하는 그 순간이 바로 당신의 영혼이 가장 빛나는 때입니다.`,
      en: `Creative and expressive talents already feel familiar. Natural sense emerges in food, art, writing, music, design - anywhere.
When creating something, you experience special joy and flow, and others feel special inspiration from your work. Your instinctive understanding of color harmony, flavor balance, sentence rhythm, and melodic flow exists because this isn't your first life doing this.
Your creativity is not learned through education but an innate talent honed through countless past lives and carved deep in your soul. You quickly become familiar with new art forms or creative tools because you've already experienced them in past lives.
When exercising these talents, you become your most natural and happy self. The moments of being absorbed in creation, losing track of time - those are when your soul shines brightest.`
    },
    lessons: {
      ko: `이번 생에서는 더 큰 무대로 나가세요. 재능을 숨기지 말고 세상과 나누는 것이 이번 생의 핵심 과제입니다.
전생에서는 후원자나 왕실, 제한된 범위 안에서 창작했다면, 이번에는 두려움 없이 온 세상에 당신의 작품을 선보이세요. SNS, 전시회, 출판, 유튜브, 어떤 형태든 좋습니다.
중요한 것은 당신의 재능이 더 많은 사람들에게 닿아 그들의 삶에 아름다움과 기쁨과 영감을 더하는 것입니다. 한 사람이라도 당신의 창작물을 통해 위로받거나 감동받는다면, 그것이 바로 당신의 영혼이 이 세상에 존재하는 이유입니다.
완벽하지 않아도 괜찮아요. 완벽을 기다리다가 세상과 나누지 못하는 것이 오히려 문제입니다. 과정을 즐기며 용기 있게 세상과 나누는 것, 그것이 이번 생에서 당신의 영혼이 배워야 할 가장 중요한 교훈입니다.`,
      en: `This life, step onto a bigger stage. Sharing your talents with the world instead of hiding them is your core challenge this life.
If you created within the limited scope of patrons or royalty in past lives, this time showcase your work to the entire world without fear. SNS, exhibitions, publishing, YouTube - any form is fine.
What matters is that your talent reaches more people and adds beauty, joy, and inspiration to their lives. If even one person is comforted or moved by your creation, that is exactly why your soul exists in this world.
It doesn't have to be perfect. The real problem is not sharing with the world while waiting for perfection. Enjoying the process and courageously sharing with the world is the most important lesson your soul must learn in this life.`
    },
    era: { ko: "르네상스 시대 피렌체 화가 또는 조선시대 궁중 도예가", en: "Renaissance era Florence painter or Joseon Dynasty royal potter" },
  },
  sanggwan: {
    likely: {
      ko: `전생에서 연예인, 강사, 혁명가, 웅변가였을 가능성이 높아요. 말과 영향력으로 세상을 바꾸려 했던 삶이었습니다.
광장에서 수천 명에게 연설하거나 무대 위에서 관객을 사로잡았을 거예요. 프랑스 혁명기의 혁명가로서 바스티유 앞에서 자유를 외쳤거나, 3.1 운동의 독립운동가로서 민족의 희망이 되었을 수도 있습니다.
로마의 포럼에서 웅변을 펼친 키케로 같은 연설가였거나, 카리스마 있는 강사로서 수많은 제자들의 인생을 바꿨을 수도 있어요. 셰익스피어 시대의 배우로서 글로브 극장의 무대에서 관객들의 감정을 움직였거나, 조선시대의 판소리 명창으로서 사람들을 울고 웃게 했을 수도 있습니다.
당신의 말 한마디, 행동 하나가 사람들에게 큰 영향을 미치는 강력한 에너지를 가진 영혼입니다. 당신이 입을 열면 사람들이 귀를 기울이고, 당신의 행동은 파도처럼 퍼져나가 세상을 변화시킵니다.`,
      en: `You were likely an entertainer, lecturer, revolutionary, or orator in past lives. Yours was a life of trying to change the world through words and influence.
You gave speeches to thousands in the square or captivated audiences on stage. You may have cried for freedom in front of the Bastille as a French Revolution revolutionary, or become the hope of a nation as a March 1st Movement independence fighter.
Perhaps you were an orator like Cicero giving speeches in the Roman Forum, or a charismatic instructor who changed countless students' lives. You might have moved audiences' emotions on the Globe Theatre stage as a Shakespearean actor, or made people cry and laugh as a Joseon Dynasty pansori master singer.
You are a soul with powerful energy where every word and action greatly impacts people. When you open your mouth, people listen, and your actions spread like waves to change the world.`
    },
    talents: {
      ko: `말과 표현으로 사람을 움직이는 재능이 있어요. 대중 앞에 서는 것이 어떤 면에서는 가장 자연스러운 일이에요.
당신이 말을 시작하면 사람들이 저절로 귀를 기울이고 당신의 에너지에 이끌립니다. 이것은 단순한 화술이나 테크닉이 아니라 영혼 깊은 곳에서 우러나오는 진정한 카리스마입니다.
무대 공포증이나 떨림을 느낄 수 있지만, 막상 대중 앞에 서면 놀라울 정도로 자연스럽게 에너지가 흐르고 말이 술술 나옵니다. 이러한 능력은 전생에서 수없이 단련되어 당신의 영혼에 각인된 것이기 때문입니다.
당신의 목소리에는 사람들을 움직이는 힘이 있고, 당신의 존재 자체가 에너지를 발산합니다. 이것은 연습해서 얻은 것이 아니라 당신의 영혼이 본래 가지고 있는 선물입니다.`,
      en: `You have talent to move people with words and expression. Standing before crowds is in some ways the most natural thing for you.
When you start speaking, people naturally listen and are drawn to your energy. This is not mere eloquence or technique but true charisma that wells up from deep in your soul.
You may feel stage fright or nervousness, but once you stand before crowds, energy flows and words come out surprisingly naturally. This ability is because it was honed countless times in past lives and imprinted on your soul.
Your voice has the power to move people, and your very presence radiates energy. This is not something gained through practice but a gift your soul inherently possesses.`
    },
    lessons: {
      ko: `이번 생에서는 그 힘을 건설적으로 쓰세요. 파괴가 아닌 건설을 위한 변화를 이끄는 것이 당신의 과제입니다.
전생에서 혁명이나 저항, 기존 질서를 무너뜨리는 데 그 힘을 사용했다면, 이번에는 긍정적인 변화와 성장을 위해 사용하는 법을 배워야 합니다.
비판하고 무너뜨리는 것은 쉽지만, 대안을 제시하고 함께 만들어가는 것이 진짜 어렵고 의미 있는 일입니다. 당신의 강력한 영향력을 파괴가 아닌 창조를 위해, 분열이 아닌 통합을 위해, 증오가 아닌 사랑을 위해 사용하세요.
세상을 바꾸는 진정한 힘은 싸움에서 오는 것이 아니라 마음을 얻는 데서 옵니다. 그것이 이번 생에서 당신의 영혼이 배워야 할 가장 중요한 교훈입니다.`,
      en: `This life, use that power constructively. Leading change for building rather than destruction is your challenge.
If you used that power for revolution, resistance, or tearing down existing order in past lives, this time you must learn to use it for positive change and growth.
Criticizing and tearing down is easy, but proposing alternatives and building together is truly difficult and meaningful. Use your powerful influence for creation rather than destruction, for unity rather than division, for love rather than hatred.
The true power to change the world comes not from fighting but from winning hearts. That is the most important lesson your soul must learn in this life.`
    },
    era: { ko: "프랑스 혁명기 혁명가 또는 3.1 운동 독립운동가", en: "French Revolution revolutionary or March 1st Movement independence fighter" },
  },
  jeonggwan: {
    likely: {
      ko: `전생에서 관료, 판사, 지도자, 행정가였을 가능성이 높아요. 조직을 이끌고 질서를 세우는 삶이었습니다.
로마 제국의 원로원 의원으로서 법을 제정하고 제국의 운영에 참여했거나, 조선시대의 정승이나 판서로서 나라를 운영했을 수도 있습니다. 법정에서 공정한 판결을 내리는 대법관이었거나, 대규모 조직을 이끄는 총독이나 장관으로서 수많은 사람들의 삶에 영향을 미쳤을 거예요.
비잔틴 제국의 관료로서 복잡한 행정 시스템을 운영했거나, 고대 이집트의 재상으로서 파라오를 보좌하며 나라를 다스렸을 수도 있습니다. 당신은 혼란 속에서 질서를 만들고, 공정한 규칙을 세우며, 책임감 있게 조직을 이끌어온 영혼입니다.
리더십과 정의감이 당신의 본질이며, 사람들은 자연스럽게 당신에게서 방향을 찾고 당신의 결정을 신뢰합니다.`,
      en: `You were likely an official, judge, leader, or administrator in past lives. Yours was a life of leading organizations and establishing order.
You may have enacted laws and participated in running the empire as a Roman Senate member, or operated the nation as a Prime Minister or Minister in the Joseon Dynasty. You might have been a Supreme Court Justice issuing fair verdicts, or a governor or minister leading large organizations, impacting countless lives.
Perhaps you operated complex administrative systems as a Byzantine Empire official, or governed the nation as vizier to the Pharaoh in ancient Egypt. You are a soul that has created order from chaos, established fair rules, and led organizations responsibly.
Leadership and sense of justice are your essence, and people naturally look to you for direction and trust your decisions.`
    },
    talents: {
      ko: `조직하고 이끄는 능력이 이미 있어요. 규칙과 시스템을 만드는 것이 자연스럽고, 복잡한 상황에서도 구조를 파악하고 체계를 세우는 능력이 뛰어납니다.
사람들은 자연스럽게 당신의 리더십을 따르고, 당신의 판단을 신뢰합니다. 위기 상황에서도 침착하게 상황을 분석하고 올바른 결정을 내리는 능력이 있습니다. 공정함과 원칙을 중시하는 성향은 전생에서부터 이어온 당신의 특징입니다.
조직 관리, 문제 해결, 의사결정, 자원 배분, 인재 발탁에서 탁월한 능력을 발휘하는 것은 우연이 아닙니다. 이것은 수많은 전생에서 통치와 관리의 경험을 쌓아왔기 때문입니다.
당신이 이끄는 조직은 질서가 잡히고, 당신이 만든 시스템은 공정하게 작동합니다. 이것이 당신의 영혼이 가진 타고난 능력입니다.`,
      en: `Organizational and leadership abilities already exist. Creating rules and systems comes naturally, and you excel at grasping structure and establishing systems even in complex situations.
People naturally follow your leadership and trust your judgment. You have the ability to calmly analyze situations and make right decisions even in crisis. Your tendency to value fairness and principles is a trait continued from past lives.
Your excellence in organizational management, problem-solving, decision-making, resource allocation, and talent selection is no coincidence. This is because you've accumulated experience in governance and management through countless past lives.
Organizations you lead become orderly, and systems you create operate fairly. This is an innate ability your soul possesses.`
    },
    lessons: {
      ko: `이번 생에서는 더 인간적인 리더십을 배우세요. 규칙만큼 사람의 마음도 중요하다는 것을 깨달아야 합니다.
전생에서 규칙과 시스템, 효율성을 중시했다면, 이번에는 그 틀 안에서 사람의 감정과 상황을 이해하는 법을 배워야 합니다. 완벽한 시스템보다 더 중요한 것은 그 시스템 안에서 살아가는 사람들의 행복입니다.
엄격함과 따뜻함의 균형을 찾으세요. 원칙을 지키되 유연하게, 공정하되 공감하며, 명령하되 경청하며 리드하는 것이 이번 생의 과제입니다.
진정한 리더는 두려움이 아닌 존경으로 사람들을 이끕니다. 규칙 뒤에 있는 사람을 보고, 시스템 안의 개인을 배려하는 것이 당신의 영혼이 성장하는 길입니다.`,
      en: `This life, learn more human leadership. You must realize that hearts matter as much as rules.
If you valued rules, systems, and efficiency in past lives, this time you must learn to understand people's emotions and situations within that framework. More important than a perfect system is the happiness of people living within it.
Find balance between strictness and warmth. Your challenge this life is to lead with principles yet flexibly, fairly yet empathetically, commanding yet listening.
True leaders lead people through respect, not fear. Seeing the person behind the rule and considering the individual within the system is the path for your soul's growth.`
    },
    era: { ko: "로마 제국 원로원 의원 또는 조선시대 정승", en: "Roman Senate member or Joseon Dynasty Prime Minister" },
  },
  pyeongwan: {
    likely: {
      ko: `전생에서 군인, 경찰, 격투가, 기사, 사무라이였을 가능성이 높아요. 도전을 두려워하지 않고 정면으로 맞서 싸워온 삶이었습니다.
전쟁터에서 부하들을 이끈 장군이었거나, 나라를 지킨 의병이나 독립군이었을 수도 있습니다. 거리를 순찰하며 시민들을 보호한 경찰관이었거나, 무술의 길을 걸은 격투가나 무사였을 수도 있어요.
중세 유럽의 기사로서 성을 지키고 약자를 보호했거나, 일본의 사무라이로서 명예를 위해 싸웠을 수도 있습니다. 로마 군단의 백부장으로서 전장을 누볐거나, 스파르타의 전사로서 국가를 위해 목숨을 바쳤을 수도 있어요.
어려움과 정면으로 맞서는 것을 두려워하지 않았고, 위기 상황에서 오히려 더욱 강해지는 전사의 정신을 가진 영혼입니다. 당신의 용기와 결단력은 수많은 시련과 전투를 통해 단련되어 왔습니다.`,
      en: `You were likely a soldier, police, fighter, knight, or samurai in past lives. Yours was a life of fighting head-on without fearing challenges.
You may have been a general leading troops on battlefields, or a resistance fighter or independence army soldier defending the nation. Perhaps a police officer patrolling streets protecting citizens, or a martial artist or warrior walking the path of combat.
You might have guarded castles and protected the weak as a medieval European knight, or fought for honor as a Japanese samurai. You may have roamed battlefields as a Roman Legion centurion, or sacrificed your life for the state as a Spartan warrior.
You didn't fear facing difficulties head-on, and you are a soul with a warrior spirit that grows stronger in crisis situations. Your courage and determination have been forged through countless trials and battles.`
    },
    talents: {
      ko: `도전을 두려워하지 않는 용기가 있어요. 위기 상황에서 오히려 빛나는 능력이 있습니다.
다른 사람들이 주저하고 물러설 때 당신은 앞으로 나아갑니다. 압박감 속에서도 침착함을 유지하고, 어려운 결정을 신속하게 내릴 수 있는 강인함이 있습니다. 육체적으로나 정신적으로 강하며, 역경을 극복하는 능력이 뛰어납니다.
이러한 전사의 기질은 전생에서부터 이어져 내려온 것으로, 당신의 DNA에 새겨진 강인함입니다. 위기가 닥쳤을 때 가장 먼저 행동하는 사람, 모두가 두려워할 때 앞장서는 사람이 바로 당신입니다.
당신의 결단력은 순간의 용기가 아니라 수많은 전생에서 축적된 전사의 본능입니다.`,
      en: `You have courage that doesn't fear challenges. You shine in crisis situations.
When others hesitate and retreat, you move forward. You maintain composure under pressure and have the strength to make difficult decisions quickly. You are strong both physically and mentally, with excellent ability to overcome adversity.
This warrior temperament has been passed down from past lives, a toughness etched in your DNA. When crisis strikes, you are the first to act, the one who steps forward when everyone is afraid.
Your determination is not momentary courage but a warrior's instinct accumulated through countless past lives.`
    },
    lessons: {
      ko: `이번 생에서는 파괴보다 보호를 배우세요. 힘을 지키는 데 쓰는 것이 진정한 강함입니다.
전생에서 싸우고 공격하는 데 힘을 사용했다면, 이번에는 사랑하는 사람들을 지키고 약자를 보호하는 데 그 힘을 쓰는 법을 배워야 합니다. 진정한 용기는 싸우는 것이 아니라 평화를 지키는 것입니다.
당신의 강인함을 파괴가 아닌 건설을 위해, 공격이 아닌 방어를 위해, 전쟁이 아닌 평화를 위해 사용하세요. 주먹을 휘두르는 것보다 손을 내미는 것이 더 큰 용기일 때가 있습니다.
부드러움 속의 강함, 평화를 지키기 위한 힘을 발견하는 것이 이번 생에서 당신의 영혼이 배워야 할 가장 중요한 교훈입니다.`,
      en: `This life, learn protection over destruction. True strength is using power to protect.
If you used strength to fight and attack in past lives, this time you must learn to use that power to guard loved ones and protect the vulnerable. True courage is not fighting but maintaining peace.
Use your strength for building not destruction, for defense not attack, for peace not war. Sometimes extending a hand takes more courage than swinging a fist.
Discovering strength within gentleness, power to maintain peace is the most important lesson your soul must learn in this life.`
    },
    era: { ko: "중세 유럽 기사 또는 조선시대 의병장", en: "Medieval European knight or Joseon Dynasty resistance leader" },
  },
  jeongjae: {
    likely: {
      ko: `전생에서 상인, 은행가, 관리자, 가장이었을 가능성이 높아요. 안정과 풍요를 쌓고 지켜온 삶이었습니다.
중세 상인 길드의 멤버로서 유럽 전역에 무역망을 구축했거나, 개항기의 거상으로서 부를 축적하고 사업 제국을 건설했을 수도 있습니다. 피렌체의 메디치 가문처럼 은행업으로 왕실의 재정을 관리했거나, 조선의 거상으로서 전국에 상권을 펼쳤을 수도 있어요.
대가족의 가장으로서 수십 명의 가족을 먹여 살리며 가문의 번영을 이끌었거나, 장원의 관리인으로서 영지의 경제를 운영했을 수도 있습니다.
당신은 실용적인 지혜로 재물을 모으고, 가족과 공동체를 풍요롭게 만드는 능력을 가진 영혼입니다. 안정을 창조하고 유지하는 것, 다음 세대에 물려줄 기반을 만드는 것이 당신의 특별한 재능입니다.`,
      en: `You were likely a merchant, banker, manager, or family head in past lives. Yours was a life of building and protecting stability and abundance.
You may have built trade networks across Europe as a medieval merchant guild member, or accumulated wealth and built a business empire as a great merchant in the port-opening era. Perhaps you managed royal finances through banking like the Medici family of Florence, or spread commercial networks nationwide as a Joseon great merchant.
You might have fed and led dozens of family members to family prosperity as head of a large household, or operated estate economics as a manor steward.
You are a soul with ability to gather wealth through practical wisdom and enrich family and community. Creating and maintaining stability, building a foundation to pass to the next generation is your special talent.`
    },
    talents: {
      ko: `안정적으로 재물을 쌓는 능력이 있어요. 실용적이고 현실적인 판단력이 매우 뛰어납니다.
좋은 투자와 나쁜 투자를 본능적으로 구분하고, 자원을 효율적으로 관리하는 감각이 있습니다. 허황된 꿈보다 현실적인 계획을 세우고, 꾸준히 실행하는 능력이 뛰어납니다. 위험을 정확히 평가하고 리스크를 관리하는 능력도 탁월합니다.
재정 관리, 저축, 투자, 자산 운용에서 자연스러운 재능을 보이는 것은 전생에서부터 쌓아온 경험 때문입니다. 당신은 물질적 안정을 만드는 데 타고난 능력이 있으며, 당신이 관리하는 것은 성장하고 당신이 지키는 것은 안전합니다.
이것은 배운 기술이 아니라 영혼에 새겨진 재능입니다.`,
      en: `You have ability to build wealth steadily. Your practical and realistic judgment is excellent.
You instinctively distinguish good investments from bad, with a sense for managing resources efficiently. Rather than unrealistic dreams, you excel at making practical plans and executing them consistently. You also excel at accurately assessing danger and managing risk.
Your natural talent in financial management, saving, investing, and asset management is due to experience accumulated from past lives. You have innate ability to create material stability - what you manage grows, and what you protect stays safe.
This is not a learned skill but a talent carved into your soul.`
    },
    lessons: {
      ko: `이번 생에서는 물질 너머의 가치를 탐구하세요. 소유가 아닌 나눔에서 진정한 풍요를 찾아야 합니다.
전생에서 재물을 모으고 지키는 데 집중했다면, 이번에는 그것을 나누고 베푸는 기쁨을 배워야 합니다. 진정한 풍요는 얼마나 많이 가졌느냐가 아니라 얼마나 자유롭게 나눌 수 있느냐에 있습니다.
물질적 안정은 분명히 중요하지만, 그것이 인생의 전부는 아닙니다. 사랑, 관계, 경험, 추억, 성장 같은 무형의 가치에도 눈을 돌리세요. 돈으로 살 수 없는 것들이 때로는 더 소중합니다.
베풀 때 진정한 만족을 느끼는 법, 나눌수록 풍요로워지는 역설을 발견하는 것이 당신의 영혼이 이번 생에서 배워야 할 가장 중요한 교훈입니다.`,
      en: `This life, explore values beyond material. You must find true abundance in sharing, not possessing.
If you focused on accumulating and protecting wealth in past lives, this time you must learn the joy of sharing and giving. True abundance lies not in how much you have but in how freely you can share.
Material stability is certainly important, but it's not all of life. Turn your eyes to intangible values like love, relationships, experiences, memories, and growth. Things money cannot buy are sometimes more precious.
Feeling true satisfaction when giving, discovering the paradox of becoming richer by sharing is the most important lesson your soul must learn in this life.`
    },
    era: { ko: "중세 상인 길드 또는 개항기 무역상", en: "Medieval merchant guild or trade merchant in port-opening era" },
  },
  pyeonjae: {
    likely: {
      ko: `전생에서 무역상, 투자가, 모험가였을 가능성이 높아요. 기회를 찾아 세계를 누빈 자유로운 영혼이었습니다.
대항해 시대의 탐험가로서 콜럼버스나 바스코 다 가마처럼 신대륙을 향해 항해하며 미지의 세계를 개척했거나, 실크로드를 따라 동양의 비단과 향신료를 서양으로, 서양의 유리와 금속 공예품을 동양으로 운반하며 부를 축적했을 수도 있습니다.
베네치아의 마르코 폴로처럼 25년간 아시아를 여행하며 새로운 문화와 상품을 유럽에 소개했거나, 아라비아의 상인으로서 사막을 가로지르는 대상 무역을 이끌었을 수도 있어요.
혹은 위험한 투자를 과감히 결정한 투자가로서 다른 이들이 주저할 때 과감하게 베팅하여 큰 부를 일구었거나, 정착을 거부하고 미지의 땅을 탐험한 순수한 모험가였을 수도 있습니다.
당신은 변화를 두려워하지 않고 오히려 그 속에서 새로운 가능성을 발견하는 영혼입니다. 안정보다 성장을, 익숙함보다 새로움을 추구하는 것이 당신의 본성이에요.
다양한 문화와 사람들을 만나며 얻은 넓은 시야와 열린 마음이 당신의 가장 큰 자산입니다. 어디를 가든 빠르게 적응하고 기회를 포착하는 능력은 전생에서 세계를 누비며 쌓은 경험의 결과입니다.`,
      en: `You were likely a trader, investor, or adventurer in past lives - a free spirit roaming the world seeking opportunities.
As an Age of Exploration navigator like Columbus or Vasco da Gama, you sailed toward new continents pioneering unknown worlds, or accumulated wealth transporting Eastern silks and spices West, and Western glass and metalwork East along the Silk Road.
Like Venice's Marco Polo, you may have traveled Asia for 25 years introducing new cultures and goods to Europe, or led caravan trade across deserts as an Arabian merchant.
Perhaps you were an investor who boldly bet big when others hesitated, building great wealth through risky decisions, or a pure adventurer who rejected settling down to explore unknown lands.
You are a soul that doesn't fear change but discovers new possibilities within it. Pursuing growth over stability, newness over familiarity is your nature.
Your broad perspective and open mind gained from meeting diverse cultures and people are your greatest assets. The ability to adapt quickly and seize opportunities wherever you go is the result of experience roaming the world in past lives.`
    },
    talents: {
      ko: `기회를 포착하고 활용하는 능력이 뛰어나요. 다른 사람들이 위험하다고 고개를 젓을 때, 당신은 그 속에서 기회를 봅니다.
변화 속에서 번영하는 특별한 감각이 있습니다. 불확실한 상황에서도 두려워하지 않고 오히려 활력을 느끼며, 위기를 기회로 바꾸는 능력이 있어요.
새로운 환경에 빠르게 적응하고, 유연하게 대처하는 능력이 뛰어납니다. 처음 가는 곳에서도, 처음 만나는 사람들 사이에서도 금방 편안해지고 상황을 장악합니다.
한 곳에 오래 머물기보다 움직이며 성장하는 것을 선호하고, 다양한 경험을 통해 배우는 것을 즐깁니다. 책보다 경험에서, 이론보다 실전에서 더 많이 배우는 타입이에요.
이러한 모험 정신과 적응력은 전생에서 세계를 누비며 키운 능력입니다. 낯선 곳에서 빠르게 상황을 파악하고, 기회를 포착하고, 위험을 관리하는 것은 수많은 여행과 거래를 통해 연마된 본능입니다.
네트워킹 능력도 뛰어나서, 다양한 배경의 사람들과 쉽게 관계를 맺고 유지합니다. 글로벌 마인드와 열린 사고방식은 당신의 가장 큰 경쟁력입니다.`,
      en: `You excel at spotting and seizing opportunities. When others shake their heads at risk, you see opportunity within.
You have a special sense for thriving through change. You're not afraid of uncertain situations but feel energized, with ability to turn crisis into opportunity.
You excel at adapting quickly to new environments and responding flexibly. You quickly become comfortable and take charge even in unfamiliar places and among new people.
You prefer to grow while moving rather than staying in one place, enjoying learning through diverse experiences. You learn more from experience than books, from practice than theory.
This adventurous spirit and adaptability are abilities cultivated by roaming the world in past lives. Quickly assessing situations, spotting opportunities, and managing risk in unfamiliar places is instinct refined through countless travels and deals.
Your networking ability is excellent too - you easily form and maintain relationships with people of diverse backgrounds. Global mindset and open thinking are your greatest competitive advantages.`
    },
    lessons: {
      ko: `이번 생에서는 안정과 도전의 균형을 찾으세요. 뿌리 없이 떠도는 것만이 자유는 아닙니다.
전생에서 끊임없이 움직이며 살았다면, 이번에는 한 곳에 뿌리를 내리는 것의 가치를 배워야 합니다. 정착한다고 해서 갇히는 것이 아니에요. 오히려 더 깊이 성장할 수 있는 기회입니다.
진정한 자유는 도망치는 것이 아니라 선택할 수 있는 것입니다. 머물 수도 있고 떠날 수도 있는, 그 선택의 자유가 진짜 자유예요.
모험 정신을 유지하면서도 의미 있는 관계를 맺고, 안정적인 기반을 만드는 법을 배우세요. 깊이 있는 관계는 오랜 시간 한 곳에서 함께해야만 가능합니다.
끊임없이 새로운 것을 찾아 떠나는 것은 때로는 현재를 피하는 것일 수도 있어요. 지금 여기에서 온전히 존재하며 깊이 있게 경험하는 것도 중요합니다.
한 곳에 머물러도 내면의 세계는 무한히 탐험할 수 있습니다. 외부의 여행에서 내면의 여행으로, 넓이에서 깊이로 성장의 방향을 확장하는 것이 이번 생의 과제입니다.`,
      en: `This life, find balance between stability and adventure. Freedom isn't just wandering without roots.
If you lived constantly moving in past lives, this time you must learn the value of putting down roots in one place. Settling down doesn't mean being trapped - it's actually an opportunity to grow deeper.
True freedom is not running away but being able to choose. Being able to stay or leave - that freedom of choice is real freedom.
While maintaining your adventurous spirit, learn to form meaningful relationships and create a stable foundation. Deep relationships are only possible by being together in one place for a long time.
Constantly leaving to seek new things can sometimes be escaping the present. Being fully present here and now and experiencing deeply is also important.
Even staying in one place, you can infinitely explore your inner world. Expanding your direction of growth from outer travel to inner journey, from breadth to depth is your challenge this life.`
    },
    era: { ko: "대항해 시대 탐험가 또는 실크로드 상인", en: "Age of Exploration navigator or Silk Road merchant" },
  },
  jeongin: {
    likely: {
      ko: `전생에서 학자, 수도승, 선생님이었을 가능성이 높아요. 지식을 쌓고 진리를 탐구하며 후학을 양성한 삶이었습니다.
고대 그리스의 철학자로서 아카데미아나 리케이온에서 소크라테스, 플라톤, 아리스토텔레스처럼 진리를 탐구하고 제자들과 토론했을 수도 있습니다. 혹은 조선시대의 대학자로서 성균관에서 학문에 평생을 바치며 성리학을 깊이 연구했을 수도 있어요.
중세 유럽의 수도원에서 경전을 필사하고 연구하며 지식을 보존한 수도승이었거나, 고대 이집트의 신관으로서 신전에서 천문학과 수학을 연구했을 수도 있습니다.
동양에서는 공자의 제자처럼 유교 경전을 연구하고 가르쳤거나, 불교 승려로서 경전을 번역하고 해석하며 법문을 전했을 수도 있어요. 르네상스 시대의 인문학자로서 고전을 연구하고 새로운 사상을 전파했을 수도 있습니다.
당신은 배움에 대한 열정이 뜨겁고, 표면적인 이해가 아닌 본질을 파고드는 깊은 탐구를 추구하는 영혼입니다. 무언가를 완전히 이해할 때까지 파고드는 집요함이 있으며, 그 지식을 다음 세대에 전하는 것에서 큰 보람을 느꼈습니다.
지식을 축적하고 체계화하며 후학을 양성하는 것, 진리를 탐구하고 지혜를 전하는 것이 당신의 영혼이 이 세상에 존재하는 이유였습니다.`,
      en: `You were likely a scholar, monk, or teacher in past lives - a life of accumulating knowledge, exploring truth, and nurturing future scholars.
As an ancient Greek philosopher, you may have explored truth and debated with disciples at the Academy or Lyceum like Socrates, Plato, or Aristotle. Or perhaps you devoted your life to learning at Seonggyungwan as a great Joseon Dynasty scholar, deeply researching Neo-Confucianism.
You might have been a monk in a medieval European monastery, copying and studying scriptures and preserving knowledge, or a priest in ancient Egypt researching astronomy and mathematics in temples.
In the East, you may have studied and taught Confucian classics like Confucius's disciples, or translated and interpreted scriptures and delivered dharma talks as a Buddhist monk. Perhaps you researched classics and spread new ideas as a Renaissance humanist.
You are a soul with passionate enthusiasm for learning, pursuing deep exploration that digs into essence rather than surface understanding. You have persistence to dig until you fully understand something, and found great meaning in passing that knowledge to the next generation.
Accumulating and systematizing knowledge and nurturing future scholars, exploring truth and passing on wisdom was why your soul existed in this world.`
    },
    talents: {
      ko: `배우고 가르치는 능력이 이미 탁월하게 발달해 있어요. 복잡한 개념도 깊이 파고들어 본질을 이해하는 능력이 뛰어납니다.
어려운 개념도 끈기 있게 탐구하여 마침내 본질을 파악하고, 그것을 다른 사람들에게 쉽게 풀어서 설명할 수 있습니다. 추상적인 개념을 구체적인 예시로, 복잡한 것을 단순하게 설명하는 재능이 있어요.
책을 읽고 공부하는 것에서 진정한 기쁨을 느끼며, 새로운 지식을 발견할 때 큰 흥분을 경험합니다. 도서관이나 서재에서 보내는 시간이 당신에게는 가장 행복한 시간일 수 있어요.
끈기 있게 탐구하는 능력이 있어서, 다른 사람들이 포기할 때도 계속 파고듭니다. 문제의 해답을 찾을 때까지, 완전히 이해할 때까지 멈추지 않는 집요함이 있습니다.
이러한 학구적 성향과 가르치는 재능은 전생에서부터 이어져 온 것입니다. 처음 배우는 분야도 금방 이해하고 체계를 잡는 것은 이미 수많은 전생에서 학문을 연마해왔기 때문이에요.
당신은 태어날 때부터 현자의 자질을 가지고 있었습니다. 지식에 대한 갈증, 진리에 대한 열망은 당신 영혼의 본질입니다.`,
      en: `Learning and teaching abilities are already excellently developed. You excel at digging deep into complex concepts to understand their essence.
You persistently explore difficult concepts until you grasp their essence, then can explain them easily to others. You have talent for explaining abstract concepts with concrete examples, making complex things simple.
You find true joy in reading and studying, experiencing great excitement when discovering new knowledge. Time spent in libraries or studies may be your happiest time.
You have ability to explore persistently, continuing to dig when others give up. You have persistence to not stop until you find answers, until you fully understand.
This scholarly disposition and teaching talent have continued from past lives. Quickly understanding and systematizing new fields is because you've already refined learning through countless past lives.
You were born with the qualities of a sage. The thirst for knowledge, the longing for truth is the essence of your soul.`
    },
    lessons: {
      ko: `이번 생에서는 지식을 더 넓게 나누세요. 상아탑에 갇히지 말고 세상과 소통하는 것이 중요합니다.
전생에서 학문에만 몰두하며 세상과 동떨어져 살았다면, 이번에는 그 지식을 실제 삶에 적용하고 더 많은 사람들과 나누는 법을 배워야 합니다.
어려운 것을 쉽게 풀어서 설명하세요. 전문 용어로 가득한 설명보다 누구나 이해할 수 있는 쉬운 말로 지식을 전달하는 것이 진짜 실력입니다.
학문을 생활 속에서 활용하세요. 이론에 머무르지 말고 실제 문제를 해결하고 삶을 개선하는 데 지식을 사용해야 합니다.
진정한 지혜는 아는 것이 아니라 삶으로 살아내고 나누는 것입니다. 머리로만 아는 것과 몸으로 체화한 것은 다릅니다. 배운 것을 직접 실천하고 경험해야 진정한 지혜가 됩니다.
세상과 연결되며 당신의 깊은 이해를 더 많은 이들과 공유하세요. 온라인 강의, 책, 블로그, 멘토링 등 어떤 형태로든 지식을 나누는 것이 이번 생의 과제입니다.`,
      en: `This life, share knowledge more widely. It's important not to stay in ivory towers but communicate with the world.
If you immersed yourself only in learning and lived apart from the world in past lives, this time you must learn to apply that knowledge to real life and share it with more people.
Explain difficult things simply. Real skill is conveying knowledge in easy words everyone can understand, not explanations full of jargon.
Utilize learning in everyday life. Don't stay in theory - use knowledge to solve real problems and improve life.
True wisdom is not knowing but living it out and sharing. Knowing only in your head is different from embodying it. You must practice and experience what you learn for it to become true wisdom.
Connect with the world and share your deep understanding with more people. Sharing knowledge in any form - online courses, books, blogs, mentoring - is your challenge this life.`
    },
    era: { ko: "고대 그리스 철학자 또는 조선시대 선비", en: "Ancient Greek philosopher or Joseon Dynasty scholar" },
  },
  pyeongin: {
    likely: {
      ko: `전생에서 무당, 점술가, 연금술사, 신관이었을 가능성이 높아요. 보이지 않는 세계를 탐구하고 신비의 베일을 벗기는 삶이었습니다.
고대 그리스 델피의 피티아처럼 신전에서 신탁을 전하며 왕과 장군들에게 조언을 주었거나, 고대 이집트의 대신관으로서 신들의 뜻을 해석하고 의식을 집전했을 수도 있습니다.
중세 유럽의 연금술사로서 비밀 실험실에서 현자의 돌을 찾으며 우주의 비밀을 연구했거나, 동양의 도사로서 산속에서 도를 닦으며 불로장생의 비밀을 탐구했을 수도 있어요.
한국의 만신이나 일본의 무녀로서 신령과 소통하며 사람들의 고민을 해결하고 병을 치유했거나, 집시 점술가로서 타로와 수정구슬을 통해 사람들의 운명을 읽어주었을 수도 있습니다.
당신은 직관과 영성이 매우 발달한 영혼으로, 보이지 않는 진실을 보고 표면 아래에 숨겨진 의미를 읽어내는 특별한 능력을 가지고 있습니다.
평범한 사람들이 보지 못하는 것을 보고, 느끼지 못하는 것을 느끼며, 알지 못하는 것을 아는 것은 수많은 전생에서 영적 세계를 탐구하며 개발해온 신비로운 재능입니다.`,
      en: `You were likely a shaman, diviner, alchemist, or priest in past lives - a life exploring the invisible world and lifting the veil of mystery.
Like the Pythia of ancient Greek Delphi, you may have conveyed oracles in temples giving advice to kings and generals, or interpreted the gods' will and officiated ceremonies as a high priest of ancient Egypt.
As a medieval European alchemist, you may have researched cosmic secrets seeking the philosopher's stone in secret laboratories, or explored secrets of immortality cultivating the Tao in mountains as an Eastern Taoist.
As a Korean shaman or Japanese miko, you may have communicated with spirits solving people's troubles and healing illness, or read people's destinies through tarot and crystal balls as a Gypsy fortune teller.
You are a soul with highly developed intuition and spirituality, with special ability to see invisible truths and read hidden meanings beneath the surface.
Seeing what ordinary people cannot see, feeling what they cannot feel, knowing what they do not know is a mysterious talent developed through exploring the spiritual world in countless past lives.`
    },
    talents: {
      ko: `직관과 통찰력이 이미 매우 발달해 있어요. 논리로 설명할 수 없는 것들을 본능적으로 이해합니다.
표면 아래의 진실을 보는 능력이 있습니다. 사람들의 숨겨진 의도나 상황의 본질을 꿰뚫어 보고, 말하지 않은 것을 읽어내며, 거짓말을 금방 알아챕니다.
예감이 자주 맞습니다. 무언가 일어날 것 같은 느낌이 들면 대부분 맞고, 첫인상으로 사람을 판단하면 나중에 맞는 경우가 많아요. 이것은 우연이 아니라 당신 영혼에 내재된 능력입니다.
꿈이나 상징을 통해 메시지를 받는 경험을 합니다. 의미 있는 꿈을 자주 꾸고, 일상에서 반복되는 숫자나 상징에서 메시지를 읽어냅니다. 동시성(싱크로니시티)을 자주 경험합니다.
신비로운 주제에 자연스럽게 끌립니다. 점술, 심리학, 영성, 철학, 형이상학 등에 관심이 많고 이러한 분야를 빠르게 이해하고 체화합니다.
이러한 신비로운 능력은 전생에서부터 개발되어 온 것으로, 당신의 영혼에 깊이 새겨진 재능입니다. 당신은 보이지 않는 세계와 연결되어 있습니다.`,
      en: `Intuition and insight are already highly developed. You instinctively understand things that cannot be explained by logic.
You have ability to see truths beneath the surface. You see through people's hidden intentions and the essence of situations, read what's unspoken, and quickly detect lies.
Your premonitions are often right. When you feel something will happen, it usually does, and first impressions of people often prove correct later. This is not coincidence but an ability inherent in your soul.
You experience receiving messages through dreams or symbols. You often have meaningful dreams and read messages from recurring numbers or symbols in daily life. You frequently experience synchronicity.
You're naturally drawn to mysterious subjects. You have great interest in divination, psychology, spirituality, philosophy, metaphysics, and quickly understand and embody these fields.
This mysterious ability has been developed from past lives, a talent deeply carved into your soul. You are connected to the invisible world.`
    },
    lessons: {
      ko: `이번 생에서는 고립되지 말고 사람들과 연결하세요. 신비도 나눌 때 진정한 의미가 있습니다.
전생에서 혼자 산속이나 신전에서 신비를 탐구했다면, 이번에는 그 통찰을 다른 사람들과 나누며 함께 성장하는 법을 배워야 합니다.
당신의 직관과 영성은 세상과 단절될 때가 아니라 세상과 연결될 때 더 큰 의미를 갖습니다. 혼자만 알고 있는 지혜는 빛을 발하지 못해요.
신비로운 능력을 사람들을 돕고 치유하는 데 사용하세요. 상담, 치유, 영적 안내 등 당신의 능력을 필요로 하는 사람들이 많습니다.
'남들이 이해하지 못할 거야'라는 두려움을 놓으세요. 당신과 같은 영혼을 가진 사람들이 있고, 당신의 통찰에서 도움을 받을 사람들이 있습니다.
고립이 아닌 연결 속에서 진정한 영적 성장을 이루는 것이 이번 생의 과제입니다. 세상 안에서, 사람들과 함께하면서도 영적으로 성장할 수 있습니다. 은둔만이 깨달음의 길은 아니에요.`,
      en: `This life, connect with people instead of isolating. Mystery has true meaning when shared.
If you explored mysteries alone in mountains or temples in past lives, this time you must learn to share those insights with others and grow together.
Your intuition and spirituality have greater meaning when connected to the world, not when isolated from it. Wisdom known only to yourself cannot shine.
Use your mysterious abilities to help and heal people. Many people need your abilities for counseling, healing, spiritual guidance.
Let go of the fear that 'others won't understand.' There are people with souls like yours, and people who will benefit from your insights.
Achieving true spiritual growth in connection rather than isolation is your challenge this life. You can grow spiritually while being in the world, together with people. Seclusion is not the only path to enlightenment.`
    },
    era: { ko: "고대 신관 또는 연금술사", en: "Ancient priest or alchemist" },
  },
};

// 노스노드 하우스별 영혼 여정
const NODE_JOURNEY: Record<HouseNumber, NodeJourneyData> = {
  1: {
    pastPattern: {
      ko: `전생에서 당신은 항상 다른 사람을 먼저 생각하며 살았습니다. 파트너의 요구, 가족의 기대, 사회의 시선에 맞추느라 정작 자신이 누구인지, 무엇을 원하는지 잊어버렸어요.
관계 속에서 조화를 유지하는 것이 최우선이었고, 갈등을 피하기 위해 자신의 의견이나 욕구를 숨기는 것이 습관이 되었습니다. 상대방을 기쁘게 하기 위해 자신을 희생하는 것이 당연하게 느껴졌어요.
그 결과 당신은 타인의 시선과 평가에 지나치게 민감해졌고, 혼자 결정을 내리는 것이 어려워졌습니다. 늘 누군가와 함께 있어야 안심이 되고, 관계 없이 존재하는 것이 불안했습니다.`,
      en: `In past lives, you always thought of others first. Accommodating partner's needs, family expectations, and social norms, you forgot who you really were and what you truly wanted.
Maintaining harmony in relationships was your priority, and hiding your own opinions and desires to avoid conflict became habit. Sacrificing yourself to please others felt natural.
As a result, you became overly sensitive to others' views and evaluations, finding it difficult to make decisions alone. You felt secure only with someone else, and existing without relationships felt unsettling.`
    },
    release: {
      ko: `남의 시선에 대한 과도한 의존을 내려놓아야 합니다. 다른 사람의 인정과 승인 없이도 당신은 충분히 가치 있는 존재입니다.
모든 사람을 기쁘게 할 수 없다는 것을 받아들이세요. 당신이 어떤 선택을 하든 누군가는 불만을 가질 수 있고, 그것은 괜찮습니다.
갈등을 두려워하지 마세요. 때로는 건강한 갈등이 관계를 더 깊고 진실되게 만듭니다.`,
      en: `You must release over-dependence on others' opinions. You are valuable enough without others' recognition and approval.
Accept that you cannot please everyone. No matter what choice you make, someone may be dissatisfied, and that's okay.
Don't fear conflict. Sometimes healthy conflict makes relationships deeper and more genuine.`
    },
    direction: {
      ko: `이번 생의 여정은 진정한 자아를 발견하고 당당하게 표현하는 것입니다. 당신이 누구인지, 무엇을 원하는지 탐구하세요.
관계 속에서가 아닌, 혼자만의 시간을 통해 자신을 발견하세요. 혼자 여행하고, 혼자 결정하고, 혼자 행동하는 경험을 쌓으세요.
당신만의 정체성, 스타일, 가치관을 확립하세요. 다른 사람의 기대가 아닌 자신의 내면에서 우러나오는 것을 따르세요.`,
      en: `This life's journey is discovering your true self and expressing it confidently. Explore who you are and what you want.
Discover yourself through time alone, not just in relationships. Gain experience traveling alone, deciding alone, acting alone.
Establish your own identity, style, and values. Follow what comes from within, not others' expectations.`
    },
    lesson: {
      ko: `자기 자신으로 당당히 살기가 이번 생의 핵심 교훈입니다. 타인의 인정이 아닌 자기 확신에서 오는 자신감을 키우세요.
"나는 누구인가?"라는 질문에 관계나 역할이 아닌 본질로 답할 수 있어야 합니다. 당신이 사랑하는 것, 믿는 것, 추구하는 것이 무엇인지 명확히 알아야 해요.
혼자서도 온전할 수 있다는 것을 배우세요. 그래야 진정으로 건강한 관계도 맺을 수 있습니다.`,
      en: `Living confidently as yourself is this life's core lesson. Build confidence from self-assurance, not others' recognition.
You must answer "Who am I?" with essence, not relationships or roles. Know clearly what you love, believe, and pursue.
Learn that you can be whole alone. Only then can you form truly healthy relationships.`
    },
  },
  2: {
    pastPattern: {
      ko: `전생에서 당신은 타인의 자원, 돈, 권력에 의존하며 살았습니다. 배우자의 재산, 가문의 유산, 파트너의 능력에 기대어 살았을 수 있어요.
스스로 가치를 창출하기보다 이미 있는 것을 관리하거나 활용하는 역할을 했습니다. 다른 사람의 위기나 상실을 통해 이익을 얻었을 수도 있어요.
깊은 심리적 연결이나 친밀감을 통해 자원을 얻었고, 그 과정에서 종속적인 관계에 익숙해졌을 수 있습니다.`,
      en: `In past lives, you lived depending on others' resources, money, and power. You may have relied on a spouse's wealth, family inheritance, or partner's abilities.
Rather than creating value yourself, you managed or utilized what already existed. You may have gained from others' crises or losses.
You obtained resources through deep psychological connections or intimacy, becoming accustomed to dependent relationships in the process.`
    },
    release: {
      ko: `물질적 불안과 의존성을 내려놓아야 합니다. 다른 사람의 것에 기대지 않고 자신의 힘으로 살 수 있다는 믿음을 키우세요.
극심한 친밀감이나 심리적 조종을 통해 자원을 얻으려는 패턴을 인식하세요. 독립은 관계의 끝이 아니라 더 건강한 관계의 시작입니다.
타인의 위기나 상실을 통해 이득을 보려는 무의식적 패턴도 놓아야 합니다.`,
      en: `You must release material insecurity and dependency. Build faith that you can live by your own power without relying on others' resources.
Recognize patterns of trying to gain resources through intense intimacy or psychological manipulation. Independence is not the end of relationships but the beginning of healthier ones.
Release unconscious patterns of gaining from others' crises or losses.`
    },
    direction: {
      ko: `이번 생의 여정은 자신만의 가치와 능력을 개발하는 것입니다. 당신 안에 있는 재능과 자원을 발견하세요.
물질적 독립을 위해 노력하세요. 스스로 돈을 벌고, 관리하고, 불리는 능력을 키우세요. 재정적 자립은 영혼의 자유와 직결됩니다.
자존감을 높이세요. 당신은 누군가에게 의존하지 않아도 충분히 가치 있는 존재입니다.`,
      en: `This life's journey is developing your own values and abilities. Discover the talents and resources within you.
Work toward material independence. Develop ability to earn, manage, and grow money yourself. Financial independence is directly connected to soul freedom.
Raise your self-esteem. You are valuable enough without depending on anyone.`
    },
    lesson: {
      ko: `스스로 가치를 창출하기가 핵심 교훈입니다. 당신만이 가진 것, 당신만이 할 수 있는 것을 찾아 발전시키세요.
물질적 풍요도 중요하지만, 그것을 스스로의 힘으로 만들어야 진정한 자유와 자존감을 얻을 수 있습니다.
당신의 재능, 기술, 능력을 개발하여 세상에 가치를 제공하세요. 그 대가로 받는 것이 진정한 풍요입니다.`,
      en: `Creating value on your own is the core lesson. Find and develop what only you have, what only you can do.
Material abundance matters, but creating it by your own power brings true freedom and self-esteem.
Develop your talents, skills, and abilities to provide value to the world. What you receive in return is true abundance.`
    },
  },
  3: {
    pastPattern: {
      ko: `전생에서 당신은 큰 그림, 철학, 종교, 먼 나라의 지혜에 집중했습니다. 진리를 찾아 먼 곳을 여행하거나, 고차원적인 지식을 탐구하며 살았어요.
추상적인 개념과 이상에 몰두하느라 정작 가까운 관계나 일상의 소통은 소홀히 했을 수 있습니다. 가르치고 설교하는 것에 익숙했지만, 경청하고 대화하는 것은 서툴렀을 수 있어요.
형제자매나 이웃과의 관계보다 먼 곳의 스승이나 제자와의 관계가 더 중요했을 수 있습니다.`,
      en: `In past lives, you focused on big pictures, philosophy, religion, and wisdom from distant lands. You traveled far seeking truth or lived exploring higher knowledge.
Absorbed in abstract concepts and ideals, you may have neglected close relationships or daily communication. You were used to teaching and preaching but may have been poor at listening and conversing.
Relationships with distant teachers or disciples may have been more important than those with siblings or neighbors.`
    },
    release: {
      ko: `추상적 사고에 대한 집착을 내려놓아야 합니다. 큰 그림만 보느라 디테일을 놓치는 패턴을 인식하세요.
모든 것을 가르치려 하지 마세요. 때로는 학생이 되어 배우고, 질문하고, 경청하는 것이 더 중요합니다.
먼 곳의 진리보다 가까운 곳의 사람들이 더 소중할 수 있다는 것을 받아들이세요.`,
      en: `You must release obsession with abstract thinking. Recognize the pattern of missing details while only seeing the big picture.
Don't try to teach everything. Sometimes being a student, learning, questioning, and listening is more important.
Accept that people nearby may be more precious than distant truths.`
    },
    direction: {
      ko: `이번 생의 여정은 일상의 소통과 학습에 집중하는 것입니다. 말하고 쓰고 소통하는 능력을 발전시키세요.
가까운 관계 - 형제자매, 이웃, 동료 - 와의 연결을 소중히 하세요. 일상적인 대화 속에서 깊은 의미를 발견할 수 있습니다.
호기심을 가지고 새로운 것을 배우세요. 다양한 정보를 수집하고 연결하는 능력을 키우세요.`,
      en: `This life's journey is focusing on daily communication and learning. Develop abilities to speak, write, and communicate.
Value connections with close relationships - siblings, neighbors, colleagues. Deep meaning can be found in everyday conversations.
Learn new things with curiosity. Develop ability to collect and connect diverse information.`
    },
    lesson: {
      ko: `가까운 관계와 실용적 지식 키우기가 핵심 교훈입니다. 먼 곳의 진리보다 가까운 사람들과의 진실한 소통이 중요합니다.
경청하는 법을 배우세요. 가르치기보다 듣고, 질문하고, 이해하려고 노력하세요.
일상의 작은 것들 속에서 의미를 발견하세요. 거창한 철학보다 삶의 실용적인 지혜가 더 필요할 때가 있습니다.`,
      en: `Nurturing close relationships and practical knowledge is the core lesson. Genuine communication with nearby people matters more than distant truths.
Learn to listen. Try to hear, question, and understand rather than teach.
Find meaning in small everyday things. Sometimes practical life wisdom is more needed than grand philosophy.`
    },
  },
  4: {
    pastPattern: {
      ko: `전생에서 당신은 사회적 성공, 명예, 지위에 모든 것을 걸었습니다. 커리어와 대외적 성취를 위해 가정과 개인적인 삶을 희생했을 수 있어요.
높은 자리에 오르기 위해 치열하게 경쟁했고, 세상의 인정을 받기 위해 쉬지 않고 달렸습니다. 성공한 사람으로 기억되는 것이 가장 중요했어요.
하지만 그 과정에서 가족과 소원해지고, 내면의 평화를 잃었을 수 있습니다. 정상에 올랐지만 외로웠을 수 있어요.`,
      en: `In past lives, you staked everything on social success, honor, and status. You may have sacrificed home and personal life for career and external achievements.
You competed fiercely to climb high positions, running without rest for the world's recognition. Being remembered as a successful person was most important.
But in the process, you may have grown distant from family and lost inner peace. You may have reached the top but felt lonely.`
    },
    release: {
      ko: `외부 인정에 대한 집착을 내려놓아야 합니다. 사회적 지위나 성취로 자신의 가치를 측정하는 습관을 버리세요.
완벽한 사회적 이미지를 유지하려는 압박감도 놓아야 합니다. 가면 뒤의 진짜 당신을 드러내도 괜찮습니다.
커리어 성공이 인생의 전부가 아니라는 것을 받아들이세요. 정상에 올라도 내면이 공허하면 진정한 성공이 아닙니다.`,
      en: `You must release obsession with external recognition. Abandon the habit of measuring your worth by social status or achievements.
Release the pressure to maintain a perfect social image. It's okay to reveal the real you behind the mask.
Accept that career success is not all of life. Reaching the top with an empty inner self is not true success.`
    },
    direction: {
      ko: `이번 생의 여정은 가정과 내면의 안정을 찾는 것입니다. 뿌리를 내리고 안전한 보금자리를 만드세요.
감정적 안전을 우선시하세요. 업무 성과보다 마음의 평화가 더 중요합니다. 자신의 감정과 연결되고, 치유하는 시간을 가지세요.
가족과 가까운 사람들과의 관계를 회복하세요. 그들이 당신의 진정한 지지대입니다.`,
      en: `This life's journey is finding home and inner stability. Put down roots and create a safe haven.
Prioritize emotional safety. Peace of mind is more important than work performance. Connect with your emotions and take time to heal.
Restore relationships with family and close ones. They are your true support.`
    },
    lesson: {
      ko: `뿌리를 내리고 감정적 안전 만들기가 핵심 교훈입니다. 외부의 성취보다 내면의 평화를 먼저 찾으세요.
집이라는 공간을 소중히 하세요. 편안하고 안전한 공간이 있어야 세상에서 활동할 힘이 생깁니다.
자신의 감정을 인정하고 돌보세요. 강해 보이려고 감정을 억누르지 마세요. 취약함을 받아들이는 것이 진정한 강함입니다.`,
      en: `Putting down roots and creating emotional safety is the core lesson. Find inner peace before external achievements.
Cherish the space called home. Having a comfortable and safe space gives you strength to act in the world.
Acknowledge and care for your emotions. Don't suppress feelings to appear strong. Accepting vulnerability is true strength.`
    },
  },
  5: {
    pastPattern: {
      ko: `전생에서 당신은 집단의 일원으로 살았습니다. 개인보다 조직, 공동체, 대의명분을 우선시했고, 나보다 우리를 먼저 생각했어요.
그룹의 목표를 위해 개인의 욕구와 재능을 억눌렀을 수 있습니다. 튀지 않기 위해, 조화를 위해 자기 표현을 자제했을 수 있어요.
혁명가, 활동가, 조직의 일원으로서 더 큰 목적을 위해 헌신했지만, 그 과정에서 자기 자신을 잃어버렸을 수 있습니다.`,
      en: `In past lives, you lived as part of a group. You prioritized organization, community, and cause over the individual, thinking of "we" before "me."
You may have suppressed personal desires and talents for group goals. You may have restrained self-expression to not stand out, for harmony.
You devoted yourself as a revolutionary, activist, or organization member for a greater purpose, but may have lost yourself in the process.`
    },
    release: {
      ko: `집단에 대한 과도한 동조를 내려놓아야 합니다. 다수의 의견이 항상 옳은 것은 아닙니다.
개인적인 기쁨이나 창작 활동에 대한 죄책감을 버리세요. 즐거움을 추구하는 것은 이기적인 것이 아닙니다.
튀는 것에 대한 두려움도 놓아야 합니다. 당신만의 독특함이 오히려 집단에 기여할 수 있습니다.`,
      en: `You must release over-conformity to groups. The majority opinion is not always right.
Abandon guilt about personal joy or creative activities. Pursuing pleasure is not selfish.
Release fear of standing out. Your uniqueness can actually contribute to the group.`
    },
    direction: {
      ko: `이번 생의 여정은 창조적 자기 표현입니다. 당신만의 독특한 재능과 창의력을 세상에 보여주세요.
즐거움과 기쁨을 추구하세요. 놀이, 로맨스, 취미, 예술 활동을 통해 삶의 즐거움을 만끽하세요.
무대 위에 서세요 - 비유적으로든 실제로든. 당신의 빛을 숨기지 말고 당당하게 빛나세요.`,
      en: `This life's journey is creative self-expression. Show the world your unique talents and creativity.
Pursue pleasure and joy. Enjoy life through play, romance, hobbies, and artistic activities.
Get on stage - metaphorically or literally. Don't hide your light, shine confidently.`
    },
    lesson: {
      ko: `기쁨과 창조로 자신을 표현하기가 핵심 교훈입니다. 당신 안의 내면 아이를 발견하고 표현하세요.
창조하세요 - 예술, 아이디어, 프로젝트, 무엇이든. 당신의 고유한 빛을 세상과 나누세요.
놀이와 즐거움을 삶에 더하세요. 진지함만이 가치 있는 것이 아닙니다. 즐기는 것도 영혼의 중요한 일입니다.`,
      en: `Expressing yourself through joy and creation is the core lesson. Discover and express the inner child within you.
Create - art, ideas, projects, anything. Share your unique light with the world.
Add play and pleasure to life. Seriousness is not the only thing of value. Enjoying is also important soul work.`
    },
  },
  6: {
    pastPattern: {
      ko: `전생에서 당신은 환상과 도피의 세계에 살았습니다. 현실보다 꿈과 상상, 영적 세계에 더 몰두했을 수 있어요.
경계가 모호했을 수 있습니다. 자신과 타인의 경계, 현실과 환상의 경계가 불분명했고, 모든 것과 하나가 되려 했을 수 있습니다.
예술가, 수행자, 치유자로서 살았지만, 일상적인 책임이나 실용적인 일은 회피했을 수 있습니다.`,
      en: `In past lives, you lived in a world of fantasy and escape. You may have been more absorbed in dreams, imagination, and the spiritual world than reality.
Boundaries may have been blurry. The line between self and others, reality and fantasy was unclear, and you may have tried to become one with everything.
You lived as an artist, practitioner, or healer, but may have avoided everyday responsibilities and practical matters.`
    },
    release: {
      ko: `현실 도피와 경계 부족을 내려놓아야 합니다. 영적 추구를 핑계로 현실의 책임을 회피하지 마세요.
희생자 의식이나 순교자 컴플렉스도 놓아야 합니다. 당신은 구원받아야 할 존재가 아니라 스스로 일어서야 할 존재입니다.
중독이나 도피 패턴에 주의하세요. 현실이 힘들 때 무언가에 빠져드는 것은 해결책이 아닙니다.`,
      en: `You must release reality avoidance and lack of boundaries. Don't use spiritual pursuit as an excuse to avoid real responsibilities.
Release victim consciousness and martyr complex. You are not a being who needs to be saved but one who must stand up yourself.
Watch for addiction or escape patterns. Getting absorbed in something when reality is hard is not the solution.`
    },
    direction: {
      ko: `이번 생의 여정은 봉사와 실용적 삶입니다. 일상의 루틴과 건강한 습관을 만드세요.
다른 사람에게 실질적으로 도움이 되세요. 추상적인 사랑이 아니라 구체적인 봉사를 하세요.
몸을 돌보세요. 건강한 식습관, 운동, 충분한 수면. 영혼은 육체라는 그릇 안에 있으니까요.`,
      en: `This life's journey is service and practical living. Create daily routines and healthy habits.
Be of practical help to others. Offer concrete service, not abstract love.
Care for your body. Healthy eating, exercise, adequate sleep. The soul is in the vessel called the body.`
    },
    lesson: {
      ko: `일상의 의미와 건강한 습관 만들기가 핵심 교훈입니다. 평범한 일상 속에서 신성을 발견하세요.
작은 것들을 잘하세요. 거창한 영적 경험보다 매일 하는 작은 실천이 더 중요할 수 있습니다.
자기 관리를 우선시하세요. 자신을 돌봐야 다른 사람도 도울 수 있습니다. 경계를 세우고 자신을 지키세요.`,
      en: `Finding meaning in daily life and healthy habits is the core lesson. Discover the sacred in ordinary everyday life.
Do small things well. Small daily practices may be more important than grand spiritual experiences.
Prioritize self-care. You must care for yourself to help others. Set boundaries and protect yourself.`
    },
  },
  7: {
    pastPattern: {
      ko: `전생에서 당신은 혼자서 모든 것을 해결하며 살았습니다. 독립적이고 자기 충족적이었으며, 다른 사람에게 의지하는 것을 약함으로 여겼을 수 있어요.
자신의 정체성과 개성을 강하게 표현했고, 타협하거나 양보하는 것이 어려웠을 수 있습니다. '내 방식대로' 하는 것이 익숙했어요.
혼자 개척하고, 혼자 결정하고, 혼자 책임지는 것이 당연했습니다. 파트너가 있어도 결국 모든 것을 혼자 해결하려 했을 수 있습니다.`,
      en: `In past lives, you lived solving everything alone. Independent and self-sufficient, you may have viewed relying on others as weakness.
You strongly expressed your identity and individuality, and compromise or yielding may have been difficult. Doing things "my way" was familiar.
Pioneering alone, deciding alone, taking responsibility alone was natural. Even with a partner, you may have ended up trying to solve everything yourself.`
    },
    release: {
      ko: `과도한 독립과 고립을 내려놓아야 합니다. 도움을 요청하는 것은 약함이 아니라 용기입니다.
'나 혼자 다 할 수 있다'는 생각을 버리세요. 함께 할 때 더 큰 일을 이룰 수 있습니다.
자기중심적인 관점을 넓히세요. 세상이 당신 중심으로 돌아가지 않는다는 것을 받아들이세요.`,
      en: `You must release excessive independence and isolation. Asking for help is not weakness but courage.
Abandon the thought that "I can do everything alone." You can achieve greater things together.
Broaden your self-centered perspective. Accept that the world doesn't revolve around you.`
    },
    direction: {
      ko: `이번 생의 여정은 파트너십과 협력을 배우는 것입니다. 진정한 동반자 관계를 경험하세요.
상대방의 관점을 진정으로 이해하려 노력하세요. 당신의 생각만이 정답이 아닐 수 있습니다.
주고받음의 균형을 배우세요. 일방적으로 주기만 하거나 받기만 하는 것이 아니라, 건강한 교환을 배우세요.`,
      en: `This life's journey is learning partnership and cooperation. Experience true companionship.
Genuinely try to understand the other's perspective. Your thoughts may not be the only answer.
Learn the balance of give and take. Learn healthy exchange, not just one-sided giving or receiving.`
    },
    lesson: {
      ko: `진정한 관계와 균형 찾기가 핵심 교훈입니다. 혼자가 아닌 함께의 힘을 경험하세요.
협력하는 법을 배우세요. 타협은 패배가 아니라 더 큰 조화를 위한 것입니다.
관계 속에서 자신을 잃지 않으면서도 상대방을 존중하는 균형을 찾으세요. 둘 다 가능합니다.`,
      en: `Finding true relationships and balance is the core lesson. Experience the power of together, not alone.
Learn to collaborate. Compromise is not defeat but for greater harmony.
Find balance between not losing yourself in relationships while respecting the other. Both are possible.`
    },
  },
  8: {
    pastPattern: {
      ko: `전생에서 당신은 물질적 안정과 소유에 집착했습니다. 재산, 자원, 안전을 쌓고 지키는 것이 인생의 중심이었을 수 있어요.
변화를 두려워하고 현 상태를 유지하려 했을 수 있습니다. 익숙한 것, 안전한 것, 예측 가능한 것을 선호했어요.
자신의 자원으로만 살려고 했고, 다른 사람과 깊이 공유하거나 의존하는 것을 피했을 수 있습니다.`,
      en: `In past lives, you were obsessed with material stability and possession. Accumulating and protecting property, resources, and safety may have been the center of life.
You may have feared change and tried to maintain the status quo. You preferred the familiar, safe, and predictable.
You tried to live only with your own resources, avoiding deep sharing with or depending on others.`
    },
    release: {
      ko: `소유와 안전에 대한 집착을 내려놓아야 합니다. 모든 것을 통제할 수 없다는 것을 받아들이세요.
변화에 대한 두려움을 놓으세요. 변화는 끝이 아니라 새로운 시작입니다.
모든 것을 혼자 소유하려는 것도 놓아야 합니다. 공유하고 나눌 때 더 큰 풍요가 옵니다.`,
      en: `You must release obsession with possession and safety. Accept that you cannot control everything.
Let go of fear of change. Change is not an end but a new beginning.
Release trying to own everything alone. Greater abundance comes when you share.`
    },
    direction: {
      ko: `이번 생의 여정은 깊은 변화와 공유입니다. 두려움을 넘어 변화를 받아들이세요.
심리적 깊이를 탐구하세요. 표면 아래의 자신, 그림자, 무의식과 만나세요.
다른 사람과 자원을 공유하세요 - 물질적으로도, 감정적으로도. 진정한 친밀감은 공유에서 시작합니다.`,
      en: `This life's journey is deep transformation and sharing. Embrace change beyond fear.
Explore psychological depth. Meet yourself beneath the surface, your shadow, your unconscious.
Share resources with others - materially and emotionally. True intimacy starts with sharing.`
    },
    lesson: {
      ko: `변화를 받아들이고 진정한 친밀감 경험하기가 핵심 교훈입니다. 손에 쥔 것을 놓을 때 더 큰 것이 옵니다.
죽고 다시 태어나는 것을 배우세요 - 은유적으로. 오래된 패턴, 정체성, 관계를 놓고 새롭게 태어나세요.
취약함을 드러내세요. 가면을 벗고 진짜 모습을 보여줄 때 진정한 친밀감이 가능합니다.`,
      en: `Accepting change and experiencing true intimacy is the core lesson. Greater things come when you release what you're holding.
Learn to die and be reborn - metaphorically. Release old patterns, identities, relationships and be born anew.
Show vulnerability. True intimacy is possible when you remove the mask and show your real self.`
    },
  },
  9: {
    pastPattern: {
      ko: `전생에서 당신은 사소한 디테일에 매몰되어 살았습니다. 일상의 작은 일, 정보 수집, 가까운 관계에만 집중했을 수 있어요.
좁은 범위 안에서만 움직였고, 익숙한 환경을 벗어나지 않았을 수 있습니다. 새로운 것을 배우기보다 이미 아는 것을 반복했어요.
큰 그림이나 인생의 의미보다 눈앞의 실용적인 문제에만 집중했을 수 있습니다.`,
      en: `In past lives, you lived buried in small details. You may have focused only on small daily tasks, information gathering, and close relationships.
You may have moved only within narrow ranges, never leaving familiar environments. You repeated what you knew rather than learning new things.
You may have focused only on practical problems in front of you rather than the big picture or life's meaning.`
    },
    release: {
      ko: `좁은 시야와 과도한 디테일 집착을 내려놓아야 합니다. 나무만 보지 말고 숲도 보세요.
익숙한 환경에 대한 집착을 놓으세요. 편안함을 넘어 새로운 세계로 나아가세요.
모든 것을 알아야 한다는 강박도 놓아야 합니다. 때로는 믿음으로 도약해야 할 때가 있습니다.`,
      en: `You must release narrow vision and over-focus on details. See the forest, not just the trees.
Let go of attachment to familiar environments. Go beyond comfort into new worlds.
Release the compulsion to know everything. Sometimes you must leap with faith.`
    },
    direction: {
      ko: `이번 생의 여정은 넓은 세계와 의미를 탐구하는 것입니다. 여행하세요 - 물리적으로도, 정신적으로도.
철학, 종교, 고등 교육을 탐구하세요. 인생의 큰 질문들과 마주하세요: 왜 우리는 여기 있는가? 삶의 의미는 무엇인가?
다양한 문화와 관점을 경험하세요. 당신이 알던 것이 전부가 아닐 수 있습니다.`,
      en: `This life's journey is exploring the wider world and meaning. Travel - physically and mentally.
Explore philosophy, religion, higher education. Face life's big questions: Why are we here? What is the meaning of life?
Experience diverse cultures and perspectives. What you knew may not be everything.`
    },
    lesson: {
      ko: `큰 그림을 보고 철학을 찾기가 핵심 교훈입니다. 세부 사항에서 벗어나 전체적인 의미를 보세요.
당신만의 진실, 철학, 세계관을 발전시키세요. 다른 사람의 생각이 아닌 당신 자신의 믿음을 찾으세요.
모험하세요. 안전지대를 벗어나 미지의 것을 탐험할 때 성장이 일어납니다.`,
      en: `Seeing the big picture and finding philosophy is the core lesson. Step back from details to see overall meaning.
Develop your own truth, philosophy, worldview. Find your own beliefs, not others' thoughts.
Adventure. Growth happens when you leave the comfort zone and explore the unknown.`
    },
  },
  10: {
    pastPattern: {
      ko: `전생에서 당신은 가정에만 갇혀 살았습니다. 가족, 집, 개인적인 감정의 세계에만 집중했을 수 있어요.
외부 세계로 나가기보다 내면과 가정의 안전 속에 머물렀을 수 있습니다. 사회적 역할이나 커리어보다 가족 돌봄이 우선이었어요.
감정적 안전과 보호를 최우선으로 했고, 위험을 감수하거나 공개적으로 나서는 것을 피했을 수 있습니다.`,
      en: `In past lives, you lived confined to home. You may have focused only on family, home, and the world of personal emotions.
You may have stayed in the safety of inner self and home rather than going out into the external world. Caring for family was priority over social roles or career.
Emotional safety and protection were highest priority, and you may have avoided taking risks or stepping out publicly.`
    },
    release: {
      ko: `감정적 안전에 대한 과도한 집착을 내려놓아야 합니다. 안전지대에서 벗어나야 성장할 수 있습니다.
과도한 돌봄이나 보호 본능도 조절해야 합니다. 때로는 놓아줘야 할 때가 있습니다.
사적인 삶에만 숨으려는 것도 놓으세요. 세상은 당신의 기여를 필요로 합니다.`,
      en: `You must release excessive attachment to emotional safety. You can only grow by leaving the comfort zone.
Excessive caregiving or protective instincts must also be moderated. Sometimes you need to let go.
Release hiding only in private life. The world needs your contribution.`
    },
    direction: {
      ko: `이번 생의 여정은 사회적 사명과 성취입니다. 세상으로 나가 당신의 역할을 찾으세요.
커리어와 공적 영역에서의 성취를 추구하세요. 당신이 가진 능력으로 사회에 기여하세요.
권위와 책임을 받아들이세요. 리더가 되는 것을 두려워하지 마세요.`,
      en: `This life's journey is social mission and achievement. Go out into the world and find your role.
Pursue achievement in career and the public realm. Contribute to society with your abilities.
Accept authority and responsibility. Don't fear becoming a leader.`
    },
    lesson: {
      ko: `세상에 기여하고 성취를 이루기가 핵심 교훈입니다. 가정을 넘어 사회에서 당신의 자리를 찾으세요.
목표를 세우고 달성하세요. 야망을 가지는 것은 괜찮습니다. 당신의 성공은 다른 사람들에게도 도움이 됩니다.
공적인 역할을 받아들이세요. 사람들 앞에 서고, 영향력을 행사하고, 책임을 지는 것이 당신의 사명입니다.`,
      en: `Contributing to the world and achieving is the core lesson. Find your place in society beyond home.
Set goals and achieve them. It's okay to have ambition. Your success helps others too.
Accept public roles. Standing before people, exercising influence, and taking responsibility is your mission.`
    },
  },
  11: {
    pastPattern: {
      ko: `전생에서 당신은 개인적 욕망과 드라마에 빠져 살았습니다. 자기 표현, 창조, 로맨스, 즐거움이 인생의 중심이었을 수 있어요.
모든 관심이 자신에게 집중되길 원했고, 무대의 주인공이 되려 했을 수 있습니다. 개인적인 영광과 인정을 추구했어요.
자녀나 창작물을 통해 자신을 표현하는 것에 집중했고, 더 큰 사회적 목적은 생각하지 않았을 수 있습니다.`,
      en: `In past lives, you lived absorbed in personal desires and drama. Self-expression, creation, romance, and pleasure may have been the center of life.
You may have wanted all attention focused on yourself, trying to be the protagonist on stage. You pursued personal glory and recognition.
You focused on expressing yourself through children or creations, not thinking of larger social purposes.`
    },
    release: {
      ko: `자기중심적 표현과 드라마를 내려놓아야 합니다. 모든 것이 당신에 관한 것이 아닙니다.
개인적 인정에 대한 욕구를 조절하세요. 빛나야 할 사람이 항상 당신만은 아닙니다.
개인적 욕망을 넘어 더 큰 비전을 보는 법을 배우세요.`,
      en: `You must release self-centered expression and drama. Not everything is about you.
Moderate the need for personal recognition. You are not always the one who must shine.
Learn to see a bigger vision beyond personal desires.`
    },
    direction: {
      ko: `이번 생의 여정은 공동체와 비전을 위해 사는 것입니다. 개인을 넘어 집단의 이익을 생각하세요.
미래 지향적인 비전을 품으세요. 지금 여기뿐 아니라 더 나은 미래를 위해 일하세요.
그룹, 조직, 커뮤니티에서 역할을 찾으세요. 혼자 빛나기보다 함께 빛나는 법을 배우세요.`,
      en: `This life's journey is living for community and vision. Think of group benefit beyond the individual.
Hold a future-oriented vision. Work for a better future, not just here and now.
Find your role in groups, organizations, communities. Learn to shine together rather than alone.`
    },
    lesson: {
      ko: `더 큰 목적을 위해 기여하기가 핵심 교훈입니다. 나보다 우리, 개인보다 전체를 생각하세요.
인류애와 박애 정신을 키우세요. 모든 사람은 연결되어 있고, 당신의 행동은 전체에 영향을 미칩니다.
혁신적인 아이디어로 세상을 더 나은 곳으로 만드세요. 당신만의 독특한 기여를 찾으세요.`,
      en: `Contributing to a greater purpose is the core lesson. Think of "we" over "me," the whole over the individual.
Cultivate humanitarianism and philanthropy. All people are connected, and your actions affect the whole.
Make the world a better place with innovative ideas. Find your unique contribution.`
    },
  },
  12: {
    pastPattern: {
      ko: `전생에서 당신은 물질과 일에만 집중하며 살았습니다. 효율, 완벽, 실용성이 최고의 가치였을 수 있어요.
모든 것을 분석하고 분류하고 통제하려 했을 수 있습니다. 측정하고 관리할 수 없는 것은 불편했어요.
건강, 습관, 일상의 루틴에 집착했고, 영적이거나 초월적인 것은 무시했을 수 있습니다.`,
      en: `In past lives, you lived focused only on material things and work. Efficiency, perfection, and practicality may have been the highest values.
You may have tried to analyze, categorize, and control everything. Things that couldn't be measured and managed were uncomfortable.
You were obsessed with health, habits, and daily routines, ignoring spiritual or transcendent matters.`
    },
    release: {
      ko: `완벽주의와 과도한 통제를 내려놓아야 합니다. 모든 것을 분석하고 이해할 수 없다는 것을 받아들이세요.
비판적 마음, 특히 자기 비판을 조절하세요. 완벽하지 않아도 충분히 좋습니다.
물질적인 것이 전부가 아니라는 것을 인정하세요. 보이지 않는 세계도 실재합니다.`,
      en: `You must release perfectionism and excessive control. Accept that you cannot analyze and understand everything.
Moderate the critical mind, especially self-criticism. Good enough is good enough, even if not perfect.
Acknowledge that material things are not everything. The invisible world is also real.`
    },
    direction: {
      ko: `이번 생의 여정은 영성과 초월입니다. 물질 너머의 세계를 탐구하세요.
손 놓고 흐름에 맡기는 연습을 하세요. 통제를 내려놓을 때 우주가 당신을 도울 수 있습니다.
명상, 예술, 영성 수련을 통해 자아를 초월하는 경험을 하세요.`,
      en: `This life's journey is spirituality and transcendence. Explore the world beyond material.
Practice letting go and going with the flow. When you release control, the universe can help you.
Experience transcending the ego through meditation, art, and spiritual practice.`
    },
    lesson: {
      ko: `손 놓고 우주를 신뢰하기가 핵심 교훈입니다. 당신이 통제하지 않아도 우주는 돌아갑니다.
무조건적인 사랑과 연민을 배우세요. 판단 없이 자신과 타인을 받아들이세요.
혼자만의 시간과 영적 수련을 통해 내면의 평화를 찾으세요. 외부의 성취가 아닌 내면의 평화가 진정한 목적지입니다.`,
      en: `Letting go and trusting the universe is the core lesson. The universe turns even without your control.
Learn unconditional love and compassion. Accept yourself and others without judgment.
Find inner peace through solitude and spiritual practice. Inner peace, not external achievement, is the true destination.`
    },
  },
};

// 토성 하우스별 카르마 수업
const SATURN_LESSONS: Record<HouseNumber, SaturnLessonData> = {
  1: {
    lesson: {
      ko: `자기 정체성을 확립하는 것이 이번 생의 토성 과제입니다. 당신이 누구인지 스스로 정의하고, 그것을 세상에 당당히 표현해야 합니다.
어린 시절부터 자기 표현에 두려움이나 제약을 느꼈을 수 있어요. 자신을 드러내는 것이 불편하거나, 어떤 사람으로 보여야 하는지 혼란스러웠을 수 있습니다.
이것은 전생에서 자아를 억압당했거나, 타인에게 자신을 맞추며 살았던 카르마입니다. 이번 생에서 그 패턴을 깨고 진정한 자아를 발견해야 합니다.`,
      en: `Establishing self-identity is this life's Saturn lesson. You must define who you are for yourself and express it confidently to the world.
From childhood, you may have felt fear or restrictions about self-expression. Showing yourself may have been uncomfortable, or you may have been confused about how you should appear.
This is karma from past lives where your self was suppressed or you lived accommodating others. In this life, you must break that pattern and discover your true self.`
    },
    challenge: {
      ko: `자기 표현의 어려움과 자신감 부족이 주요 도전입니다. 자신을 드러내는 것이 위험하거나 불쾌한 결과를 초래할 것 같은 두려움이 있을 수 있어요.
다른 사람들 앞에서 말하거나, 주목받거나, 자신의 의견을 내세우는 것이 어려울 수 있습니다. 거절이나 비판에 대한 두려움이 클 수 있어요.
신체적인 표현 - 외모, 스타일, 존재감 - 에 대한 불안이나 어려움을 경험할 수도 있습니다.`,
      en: `Difficulty with self-expression and lack of confidence are the main challenges. You may fear that showing yourself will lead to dangerous or unpleasant results.
Speaking before others, being noticed, or asserting your opinions may be difficult. Fear of rejection or criticism may be strong.
You may also experience anxiety or difficulty with physical expression - appearance, style, presence.`
    },
    mastery: {
      ko: `진정한 자아로 당당히 서는 힘을 얻게 됩니다. 다른 사람의 시선이나 평가에 흔들리지 않는 확고한 정체성을 확립합니다.
자신의 외모, 성격, 가치관에 대한 깊은 자기 수용이 이루어집니다. 있는 그대로의 자신을 사랑하고 표현하는 능력을 갖추게 됩니다.
리더십, 개척자 정신, 자기 주도적인 삶의 방식이 자연스러워집니다.`,
      en: `You gain the power to stand confidently as your true self. You establish a firm identity that isn't shaken by others' views or evaluations.
Deep self-acceptance of your appearance, personality, and values occurs. You gain the ability to love and express yourself as you are.
Leadership, pioneering spirit, and self-directed ways of living become natural.`
    },
  },
  2: {
    lesson: {
      ko: `자신의 가치를 인정하고 물질적 안정을 스스로 만드는 것이 이번 생의 토성 과제입니다.
돈, 재산, 자원에 대해 불안을 느끼거나, 스스로 가치를 창출하는 것에 어려움을 겪었을 수 있어요. 자존감 문제와 물질적 문제가 연결되어 있을 수 있습니다.
이것은 전생에서 타인에게 경제적으로 의존했거나, 자신의 가치를 인정받지 못했던 카르마입니다.`,
      en: `Recognizing your own worth and creating material stability yourself is this life's Saturn lesson.
You may have felt anxiety about money, property, and resources, or had difficulty creating value yourself. Self-esteem issues and material issues may be connected.
This is karma from past lives where you depended economically on others or your value was not recognized.`
    },
    challenge: {
      ko: `물질적 불안과 자기 가치에 대한 의심이 주요 도전입니다. 돈을 벌거나 유지하는 것이 어렵게 느껴질 수 있어요.
자신이 충분히 가치 있는지, 충분히 받을 자격이 있는지 의심하는 경향이 있을 수 있습니다. 자존감과 재정이 롤러코스터처럼 오르내릴 수 있어요.
소유나 안전에 대한 과도한 집착이나, 반대로 물질적인 것에 대한 무관심이 나타날 수 있습니다.`,
      en: `Material insecurity and doubting self-worth are the main challenges. Earning or maintaining money may feel difficult.
You may tend to doubt whether you're worthy enough or deserve to receive. Self-esteem and finances may go up and down like a rollercoaster.
Excessive attachment to possession and safety, or conversely, indifference to material things may appear.`
    },
    mastery: {
      ko: `안정적인 재정과 확고한 자존감을 확립하게 됩니다. 스스로의 힘으로 물질적 풍요를 창출하고 유지하는 능력을 갖춥니다.
자신의 재능, 기술, 시간의 가치를 인정하고 적절한 대가를 요구할 수 있게 됩니다. 자기 가치에 대한 의심 없이 살아갑니다.
물질적인 것과 건강한 관계를 맺고, 풍요를 즐기면서도 집착하지 않는 균형을 찾습니다.`,
      en: `You establish stable finances and firm self-esteem. You gain the ability to create and maintain material abundance by your own power.
You recognize the value of your talents, skills, and time and can ask for appropriate compensation. You live without doubting your self-worth.
You form a healthy relationship with material things, finding balance between enjoying abundance and not being attached.`
    },
  },
  3: {
    lesson: {
      ko: `효과적으로 소통하고 배우는 것이 이번 생의 토성 과제입니다. 말하고 듣고 정보를 처리하는 능력을 발전시켜야 합니다.
어린 시절 말하기, 쓰기, 학습에 어려움을 겪었을 수 있어요. 형제자매나 가까운 관계에서 소통의 문제가 있었을 수 있습니다.
이것은 전생에서 소통이 억압되었거나, 지식이 무시당했던 카르마입니다.`,
      en: `Communicating effectively and learning is this life's Saturn lesson. You must develop the ability to speak, listen, and process information.
You may have had difficulties with speaking, writing, or learning in childhood. There may have been communication problems with siblings or close relationships.
This is karma from past lives where communication was suppressed or knowledge was ignored.`
    },
    challenge: {
      ko: `말하기 두려움과 학습 어려움이 주요 도전입니다. 자신의 생각을 표현하는 것이 두렵거나, 잘못 전달될까 걱정될 수 있어요.
새로운 것을 배우는 것이 더디거나, 정보를 처리하는 데 어려움을 느낄 수 있습니다. 형제자매나 이웃과의 관계에서 긴장이 있을 수 있어요.
짧은 거리 여행이나 일상적인 이동에서 장애를 경험할 수도 있습니다.`,
      en: `Fear of speaking and learning difficulties are the main challenges. You may fear expressing your thoughts or worry about being misunderstood.
Learning new things may be slow, or you may have difficulty processing information. There may be tension in relationships with siblings or neighbors.
You may also experience obstacles in short-distance travel or daily commutes.`
    },
    mastery: {
      ko: `명확한 소통과 지적 권위를 획득하게 됩니다. 당신의 말이 무게를 갖고, 사람들이 당신의 의견을 경청합니다.
글쓰기, 말하기, 가르치기에서 전문성을 인정받을 수 있습니다. 복잡한 개념을 쉽게 설명하는 능력을 갖추게 됩니다.
형제자매나 가까운 관계가 성숙하게 발전하고, 일상의 소통에서 깊은 만족을 찾습니다.`,
      en: `You gain clear communication and intellectual authority. Your words carry weight, and people listen to your opinions.
You may be recognized for expertise in writing, speaking, or teaching. You gain the ability to explain complex concepts simply.
Relationships with siblings or close ones develop maturely, and you find deep satisfaction in daily communication.`
    },
  },
  4: {
    lesson: {
      ko: `감정적 안정과 진정한 가정을 만드는 것이 이번 생의 토성 과제입니다. 내면의 평화와 안전한 보금자리를 구축해야 합니다.
어린 시절 가정환경이 불안정했거나, 정서적으로 안전하지 못했을 수 있어요. 가족 관계에서 어려움이나 책임감을 느꼈을 수 있습니다.
이것은 전생에서 뿌리 없이 살았거나, 가정에서 상처를 받았던 카르마입니다.`,
      en: `Creating emotional stability and a true home is this life's Saturn lesson. You must build inner peace and a safe haven.
Your home environment may have been unstable or emotionally unsafe in childhood. You may have felt difficulties or responsibility in family relationships.
This is karma from past lives where you lived without roots or were hurt in the family.`
    },
    challenge: {
      ko: `가정 문제와 불안정한 어린 시절이 주요 도전입니다. 부모와의 관계, 특히 어머니와의 관계에서 어려움이 있었을 수 있어요.
'집'이라는 개념에 대한 불안이나 복잡한 감정이 있을 수 있습니다. 어디에도 진정으로 소속되지 못한다는 느낌이 들 수 있어요.
감정을 억누르거나, 취약함을 보이는 것을 두려워할 수 있습니다.`,
      en: `Family issues and unstable childhood are the main challenges. There may have been difficulties in relationships with parents, especially mother.
You may have anxiety or complex feelings about the concept of 'home.' You may feel you don't truly belong anywhere.
You may suppress emotions or fear showing vulnerability.`
    },
    mastery: {
      ko: `강한 내면의 기반과 안전한 가정을 구축하게 됩니다. 어디에 있든 내면의 평화와 안정감을 유지하는 능력을 갖춥니다.
진정한 보금자리를 만들고, 그곳에서 자신과 사랑하는 사람들을 위한 안식처를 제공합니다.
가족 관계가 치유되고 성숙해지며, 감정을 건강하게 표현하고 받아들이는 능력이 생깁니다.`,
      en: `You build a strong inner foundation and secure home. You gain the ability to maintain inner peace and stability wherever you are.
You create a true home that provides sanctuary for yourself and loved ones.
Family relationships heal and mature, and you gain the ability to express and accept emotions healthily.`
    },
  },
  5: {
    lesson: {
      ko: `창조적으로 자기를 표현하고 기쁨을 찾는 것이 이번 생의 토성 과제입니다. 놀이, 창작, 로맨스를 통해 삶을 즐기는 법을 배워야 합니다.
어린 시절 창의적 표현이 억압되었거나, 즐거움을 느끼는 것에 죄책감을 느꼈을 수 있어요. 놀기보다 일해야 한다는 압박이 있었을 수 있습니다.
이것은 전생에서 창조성이 억압되었거나, 기쁨이 허용되지 않았던 카르마입니다.`,
      en: `Expressing yourself creatively and finding joy is this life's Saturn lesson. You must learn to enjoy life through play, creation, and romance.
Creative expression may have been suppressed in childhood, or you may have felt guilty about feeling pleasure. There may have been pressure to work rather than play.
This is karma from past lives where creativity was suppressed or joy was not allowed.`
    },
    challenge: {
      ko: `창의력 억압과 즐거움에 대한 죄책감이 주요 도전입니다. 자신을 표현하거나 즐기는 것이 '쓸데없는 것', '이기적인 것'처럼 느껴질 수 있어요.
로맨스나 연애에서 어려움을 겪거나, 사랑받을 자격이 없다고 느낄 수 있습니다. 자녀와의 관계에서 도전이 있을 수 있어요.
내면의 아이가 상처받았거나 억압되어 있을 수 있습니다.`,
      en: `Creativity suppression and guilt about pleasure are the main challenges. Expressing yourself or enjoying may feel 'useless' or 'selfish.'
You may have difficulties in romance or feel unworthy of love. There may be challenges in relationships with children.
Your inner child may be wounded or suppressed.`
    },
    mastery: {
      ko: `자유로운 자기 표현과 기쁨을 찾게 됩니다. 창작하고 표현하는 것에서 깊은 만족을 느끼고, 그것을 세상과 나눕니다.
놀이와 즐거움을 삶의 중요한 부분으로 받아들입니다. 죄책감 없이 기쁨을 누리는 법을 배웁니다.
로맨스와 사랑에서 성숙한 관계를 맺고, 자녀나 창작물을 통해 자신을 표현하는 능력이 생깁니다.`,
      en: `You find free self-expression and joy. You feel deep satisfaction in creating and expressing, sharing it with the world.
You accept play and pleasure as important parts of life. You learn to enjoy joy without guilt.
You form mature relationships in romance and love, and gain the ability to express yourself through children or creations.`
    },
  },
  6: {
    lesson: {
      ko: `건강과 일상을 효율적으로 관리하는 것이 이번 생의 토성 과제입니다. 루틴, 습관, 봉사를 통해 삶을 구조화해야 합니다.
건강 문제가 있거나, 일과 삶의 균형을 찾는 데 어려움을 겪었을 수 있어요. 완벽주의나 일 중독 경향이 있을 수 있습니다.
이것은 전생에서 건강을 무시했거나, 과로로 자신을 혹사했던 카르마입니다.`,
      en: `Managing health and daily life efficiently is this life's Saturn lesson. You must structure your life through routines, habits, and service.
You may have had health issues or difficulty finding work-life balance. There may be tendencies toward perfectionism or workaholism.
This is karma from past lives where you ignored health or overworked yourself.`
    },
    challenge: {
      ko: `건강 문제, 일 중독, 완벽주의가 주요 도전입니다. 만성적인 건강 이슈나 신체적 제약을 경험할 수 있어요.
일에 과도하게 몰두하거나, 모든 것을 완벽하게 해야 한다는 압박감을 느낄 수 있습니다. 쉬는 것에 죄책감을 느낄 수 있어요.
다른 사람을 돌보느라 자신을 돌보지 못하는 경향이 있을 수 있습니다.`,
      en: `Health issues, workaholism, and perfectionism are the main challenges. You may experience chronic health issues or physical limitations.
You may be overly absorbed in work or feel pressure to do everything perfectly. You may feel guilty about resting.
You may tend to neglect yourself while caring for others.`
    },
    mastery: {
      ko: `균형 잡힌 습관과 효율적인 서비스를 달성하게 됩니다. 건강을 우선시하고 자기 관리의 달인이 됩니다.
일과 휴식, 봉사와 자기 돌봄 사이의 균형을 찾습니다. 효율적으로 일하면서도 완벽주의에 얽매이지 않습니다.
건강한 루틴을 통해 삶을 구조화하고, 봉사를 통해 의미를 찾습니다.`,
      en: `You achieve balanced habits and efficient service. You prioritize health and become a master of self-care.
You find balance between work and rest, service and self-care. You work efficiently without being bound by perfectionism.
You structure life through healthy routines and find meaning through service.`
    },
  },
  7: {
    lesson: {
      ko: `진정한 파트너십을 만들고 관계에서 균형을 찾는 것이 이번 생의 토성 과제입니다. 협력, 타협, 공정함을 배워야 합니다.
관계에서 어려움을 겪거나, 적합한 파트너를 찾는 데 시간이 걸릴 수 있어요. 결혼이 늦거나, 관계에서 책임감을 과도하게 느낄 수 있습니다.
이것은 전생에서 관계에서 상처받았거나, 공정하지 못한 파트너십을 경험했던 카르마입니다.`,
      en: `Creating true partnership and finding balance in relationships is this life's Saturn lesson. You must learn cooperation, compromise, and fairness.
You may have difficulties in relationships or take time to find a suitable partner. Marriage may be late, or you may feel excessive responsibility in relationships.
This is karma from past lives where you were hurt in relationships or experienced unfair partnerships.`
    },
    challenge: {
      ko: `관계의 어려움과 균형 잡기 힘듦이 주요 도전입니다. 관계에서 너무 많이 주거나 너무 많이 받는 불균형이 있을 수 있어요.
적합한 파트너를 찾는 것이 어렵거나, 관계를 유지하는 데 도전이 있을 수 있습니다. 타협하는 것이 어렵게 느껴질 수 있어요.
다른 사람에게 의존하거나, 반대로 누구도 의지하지 않으려는 극단적인 경향이 있을 수 있습니다.`,
      en: `Relationship difficulties and trouble finding balance are the main challenges. There may be imbalance of giving too much or taking too much in relationships.
Finding a suitable partner may be difficult, or maintaining relationships may be challenging. Compromise may feel difficult.
There may be extreme tendencies of depending on others or, conversely, refusing to rely on anyone.`
    },
    mastery: {
      ko: `성숙한 관계와 공정한 파트너십을 구축하게 됩니다. 주고받음의 균형을 이해하고 건강한 경계를 유지합니다.
진정한 동반자를 만나거나 기존 관계를 깊고 성숙하게 발전시킵니다. 협력과 타협의 기술을 마스터합니다.
관계를 통해 성장하고, 혼자가 아닌 함께의 힘을 경험합니다.`,
      en: `You build mature relationships and fair partnerships. You understand the balance of give and take and maintain healthy boundaries.
You meet a true partner or develop existing relationships deeply and maturely. You master the skills of cooperation and compromise.
You grow through relationships and experience the power of together rather than alone.`
    },
  },
  8: {
    lesson: {
      ko: `변화와 친밀감을 받아들이는 것이 이번 생의 토성 과제입니다. 깊은 변환, 공유, 진정한 연결을 배워야 합니다.
통제에 대한 욕구가 강하거나, 변화를 두려워할 수 있어요. 다른 사람과 깊이 연결되는 것이 어렵거나, 신뢰 문제가 있을 수 있습니다.
이것은 전생에서 배신당했거나, 통제력을 잃었던 트라우마가 있는 카르마입니다.`,
      en: `Accepting transformation and intimacy is this life's Saturn lesson. You must learn deep transformation, sharing, and true connection.
You may have strong need for control or fear change. Connecting deeply with others may be difficult, or there may be trust issues.
This is karma from past lives where you were betrayed or had trauma of losing control.`
    },
    challenge: {
      ko: `통제 욕구, 신뢰 문제, 상실 두려움이 주요 도전입니다. 모든 것을 통제하려 하거나, 반대로 완전히 무력해지는 극단을 오갈 수 있어요.
다른 사람에게 취약함을 보이거나 의지하는 것이 매우 어려울 수 있습니다. 상실이나 죽음에 대한 깊은 두려움이 있을 수 있어요.
다른 사람의 자원이나 유산, 공동 재산에 관련된 복잡한 상황이 생길 수 있습니다.`,
      en: `Control needs, trust issues, and fear of loss are the main challenges. You may swing between extremes of trying to control everything or becoming completely powerless.
Showing vulnerability or relying on others may be very difficult. There may be deep fear of loss or death.
Complex situations involving others' resources, inheritance, or shared property may arise.`
    },
    mastery: {
      ko: `깊은 변환과 진정한 친밀감을 경험하게 됩니다. 변화를 자연스러운 과정으로 받아들이고, 죽고 다시 태어나는 것을 배웁니다.
다른 사람과 깊이 연결되고, 취약함 속에서 진정한 친밀감을 경험합니다. 신뢰하고 신뢰받는 관계를 구축합니다.
자원을 지혜롭게 공유하고, 변화를 통해 더 강해지는 능력을 갖춥니다.`,
      en: `You experience deep transformation and true intimacy. You accept change as a natural process and learn to die and be reborn.
You connect deeply with others and experience true intimacy through vulnerability. You build relationships of trust.
You share resources wisely and gain the ability to grow stronger through change.`
    },
  },
  9: {
    lesson: {
      ko: `의미와 철학을 찾는 것이 이번 생의 토성 과제입니다. 넓은 세계관과 인생의 의미를 탐구해야 합니다.
믿음이나 종교에 대한 의문, 또는 과도한 독단성을 경험했을 수 있어요. 고등 교육이나 먼 곳으로의 여행에서 장애가 있었을 수 있습니다.
이것은 전생에서 편협한 믿음에 갇혔거나, 진리를 추구하다 좌절했던 카르마입니다.`,
      en: `Finding meaning and philosophy is this life's Saturn lesson. You must explore a broad worldview and the meaning of life.
You may have experienced questions about faith or religion, or excessive dogmatism. There may have been obstacles in higher education or travel to distant places.
This is karma from past lives where you were trapped in narrow beliefs or frustrated in seeking truth.`
    },
    challenge: {
      ko: `믿음의 위기와 좁은 시야가 주요 도전입니다. 무엇을 믿어야 할지 혼란스럽거나, 의미를 찾기 어려울 수 있어요.
고등 교육, 출판, 법률, 해외 관련 일에서 장애나 지연이 있을 수 있습니다. 다른 문화나 철학에 대한 두려움이 있을 수 있어요.
너무 독단적이거나, 반대로 아무것도 믿지 못하는 극단을 오갈 수 있습니다.`,
      en: `Faith crisis and narrow vision are the main challenges. You may be confused about what to believe or find it hard to find meaning.
There may be obstacles or delays in higher education, publishing, law, or overseas-related work. There may be fear of other cultures or philosophies.
You may swing between being too dogmatic or, conversely, not believing in anything.`
    },
    mastery: {
      ko: `넓은 지혜와 의미 있는 삶을 얻게 됩니다. 당신만의 철학과 세계관을 확립하고, 그것을 기반으로 삶을 살아갑니다.
다양한 문화와 관점을 포용하고, 열린 마음으로 배우는 능력을 갖춥니다. 가르치거나 영감을 주는 역할을 맡을 수 있습니다.
여행, 교육, 출판을 통해 성취를 이루고, 삶에서 깊은 의미를 발견합니다.`,
      en: `You gain broad wisdom and a meaningful life. You establish your own philosophy and worldview and live life based on it.
You embrace diverse cultures and perspectives with the ability to learn with an open mind. You may take on teaching or inspiring roles.
You achieve through travel, education, publishing, and discover deep meaning in life.`
    },
  },
  10: {
    lesson: {
      ko: `세상에서 자신의 역할을 찾고 성취를 이루는 것이 이번 생의 토성 과제입니다. 커리어와 사회적 지위를 통해 기여해야 합니다.
커리어에서 장애나 지연을 경험하거나, 인정받지 못한다고 느꼈을 수 있어요. 아버지나 권위 인물과의 관계에서 어려움이 있었을 수 있습니다.
이것은 전생에서 사회적 역할을 거부했거나, 권위에 상처받았던 카르마입니다.`,
      en: `Finding your role in the world and achieving is this life's Saturn lesson. You must contribute through career and social status.
You may have experienced obstacles or delays in career or felt unrecognized. There may have been difficulties in relationships with father or authority figures.
This is karma from past lives where you rejected social roles or were hurt by authority.`
    },
    challenge: {
      ko: `커리어 장애와 인정받지 못하는 느낌이 주요 도전입니다. 성공까지 시간이 오래 걸리거나, 노력에 비해 인정이 늦게 올 수 있어요.
권위 인물과의 갈등이나, 책임에 대한 과도한 부담이 있을 수 있습니다. 공적인 역할을 맡는 것에 두려움이 있을 수 있어요.
사회적 이미지나 평판에 대한 과도한 걱정이 있을 수 있습니다.`,
      en: `Career obstacles and feeling unrecognized are the main challenges. Success may take a long time, or recognition may come late despite effort.
There may be conflicts with authority figures or excessive burden of responsibility. There may be fear of taking on public roles.
There may be excessive worry about social image or reputation.`
    },
    mastery: {
      ko: `진정한 성취와 사회적 권위를 얻게 됩니다. 당신의 분야에서 존경받는 인물이 되고, 지속적인 유산을 남깁니다.
책임감 있는 리더십을 발휘하고, 다른 사람들에게 롤모델이 됩니다. 커리어에서 안정과 성취를 동시에 이룹니다.
권위와 건강한 관계를 맺고, 당신 자신도 현명한 권위가 됩니다.`,
      en: `You gain true achievement and social authority. You become a respected figure in your field and leave a lasting legacy.
You exercise responsible leadership and become a role model for others. You achieve both stability and success in career.
You form healthy relationships with authority and become a wise authority yourself.`
    },
  },
  11: {
    lesson: {
      ko: `커뮤니티와 비전을 위해 일하는 것이 이번 생의 토성 과제입니다. 개인을 넘어 집단과 미래를 위해 기여해야 합니다.
소속감을 느끼지 못하거나, 그룹에서 고립감을 경험했을 수 있어요. 친구 관계에서 어려움이 있거나, 비전이 좌절되었을 수 있습니다.
이것은 전생에서 집단에서 배척당했거나, 혁신적 아이디어로 박해받았던 카르마입니다.`,
      en: `Working for community and vision is this life's Saturn lesson. You must contribute beyond the individual for groups and the future.
You may not have felt belonging or experienced isolation in groups. There may have been difficulties in friendships or frustrated visions.
This is karma from past lives where you were ostracized from groups or persecuted for innovative ideas.`
    },
    challenge: {
      ko: `고립감과 소속되지 못하는 느낌이 주요 도전입니다. 어디에도 진정으로 맞지 않는다는 느낌이 들 수 있어요.
친구를 사귀거나 유지하는 것이 어렵게 느껴질 수 있습니다. 그룹이나 조직에서 역할을 찾는 데 시간이 걸릴 수 있어요.
미래에 대한 비전이 좌절되거나, 이상과 현실 사이의 괴리를 느낄 수 있습니다.`,
      en: `Isolation and feeling of not belonging are the main challenges. You may feel you don't truly fit anywhere.
Making or keeping friends may feel difficult. It may take time to find your role in groups or organizations.
Visions for the future may be frustrated, or you may feel the gap between ideals and reality.`
    },
    mastery: {
      ko: `진정한 소속감과 사회 기여를 달성하게 됩니다. 뜻이 맞는 사람들과의 깊은 연결을 형성하고, 공동체의 일원으로서 의미를 찾습니다.
미래를 위한 비전을 현실화하고, 혁신적인 아이디어로 세상에 기여합니다. 진정한 우정의 의미를 이해합니다.
네트워크와 커뮤니티를 구축하고, 더 큰 목적을 위해 함께 일하는 기쁨을 경험합니다.`,
      en: `You achieve true belonging and social contribution. You form deep connections with like-minded people and find meaning as a community member.
You realize visions for the future and contribute to the world with innovative ideas. You understand the meaning of true friendship.
You build networks and communities and experience the joy of working together for a greater purpose.`
    },
  },
  12: {
    lesson: {
      ko: `영적 성장과 내면의 평화를 찾는 것이 이번 생의 토성 과제입니다. 물질을 초월하여 영혼의 성장을 추구해야 합니다.
무의식적 두려움, 자기 파괴적 패턴, 또는 과도한 고립을 경험했을 수 있어요. 보이지 않는 적이나 장애물이 있다고 느꼈을 수 있습니다.
이것은 전생에서 영적 성장을 거부했거나, 카르마가 축적된 과제입니다.`,
      en: `Finding spiritual growth and inner peace is this life's Saturn lesson. You must transcend material and pursue soul growth.
You may have experienced unconscious fears, self-destructive patterns, or excessive isolation. You may have felt there were invisible enemies or obstacles.
This is karma from past lives where you rejected spiritual growth or accumulated karma.`
    },
    challenge: {
      ko: `무의식적 두려움, 고립, 자기 파괴가 주요 도전입니다. 자신도 모르는 두려움이나 불안에 시달릴 수 있어요.
자기 파괴적인 패턴이나 중독에 빠지기 쉬울 수 있습니다. 과도한 희생이나 순교자 컴플렉스가 있을 수 있어요.
감옥, 병원, 수도원 등 격리된 환경과 관련된 경험이 있을 수 있습니다.`,
      en: `Unconscious fears, isolation, and self-destruction are the main challenges. You may be plagued by fears or anxieties you don't understand.
You may be prone to self-destructive patterns or addiction. There may be excessive sacrifice or martyr complex.
You may have experiences related to isolated environments like prisons, hospitals, or monasteries.`
    },
    mastery: {
      ko: `영적 지혜와 초월적 평화를 얻게 됩니다. 내면의 어둠을 통합하고, 무의식의 바다를 지혜롭게 항해합니다.
혼자만의 시간을 통해 깊은 영적 성장을 이루고, 명상이나 영적 수련의 마스터가 됩니다.
다른 사람의 고통을 이해하고 돕는 능력을 갖추며, 초월적인 평화와 수용을 경험합니다.`,
      en: `You gain spiritual wisdom and transcendent peace. You integrate inner darkness and wisely navigate the sea of the unconscious.
You achieve deep spiritual growth through solitude and become a master of meditation or spiritual practice.
You gain the ability to understand and help others' suffering, experiencing transcendent peace and acceptance.`
    },
  },
};

// 일간별 영혼 미션
const DAY_MASTER_MISSION: Record<HeavenlyStem, DayMasterMissionData> = {
  '갑': {
    core: {
      ko: `새로운 시작을 이끄는 개척자가 되세요. 갑목(甲木)은 하늘을 향해 곧게 뻗어나가는 큰 나무의 기운입니다.
당신의 영혼은 무엇이든 처음 시작하고, 새로운 길을 개척하며, 앞장서서 이끄는 것에 사명이 있습니다.
아무도 가지 않은 길을 걷고, 아무도 시도하지 않은 것을 시작하며, 다른 이들이 따라올 수 있는 길을 만드세요.
당신이 존재하는 이유는 성장과 확장, 새로운 가능성의 개척입니다.`,
      en: `Be a pioneer leading new beginnings. Gap-mok (甲木) is the energy of a great tree stretching straight toward the sky.
Your soul's mission is to start anything first, pioneer new paths, and lead from the front.
Walk paths no one has walked, start what no one has tried, and create paths others can follow.
Your reason for existence is growth, expansion, and pioneering new possibilities.`
    },
    expression: {
      ko: `성장과 발전을 추구하며 다른 이들을 이끄세요. 리더십을 발휘하되 독재가 아닌 영감으로 이끄세요.
정의롭고 곧은 모습으로 사람들에게 모범이 되세요. 큰 나무처럼 듬직하게 서서 그늘을 제공하세요.
새로운 프로젝트를 시작하고, 조직을 만들고, 비전을 제시하세요. 두려움 없이 앞으로 나아가세요.
멈추지 않는 성장, 끊임없는 발전이 당신의 삶의 방식입니다.`,
      en: `Pursue growth and lead others. Exercise leadership, leading with inspiration rather than dominance.
Be an example to people with a righteous and upright image. Stand firm like a great tree providing shade.
Start new projects, create organizations, present visions. Move forward without fear.
Unstoppable growth, constant development is your way of life.`
    },
    fulfillment: {
      ko: `당신이 시작한 것이 숲처럼 자랄 때 가장 행복해요. 씨앗을 뿌리고 그것이 거대한 숲이 되는 것을 보는 것이 당신의 기쁨입니다.
당신이 이끈 사람들이 성장하고, 당신이 시작한 것이 지속되고, 당신의 영향력이 널리 퍼져나갈 때 존재의 의미를 느낍니다.
혼자 높이 솟는 것이 아니라, 주변에 숲을 만들어가세요. 그것이 갑목 영혼의 진정한 성취입니다.`,
      en: `Happiest when what you started grows like a forest. Your joy is planting seeds and watching them become a great forest.
You feel meaning in existence when people you led grow, what you started continues, and your influence spreads widely.
Don't just tower alone, but create a forest around you. That is the true achievement of a Gap-mok soul.`
    },
  },
  '을': {
    core: {
      ko: `부드러운 힘으로 세상을 변화시키세요. 을목(乙木)은 유연하게 휘어지며 자라는 덩굴이나 화초의 기운입니다.
당신의 영혼은 강함이 아닌 유연함으로, 대립이 아닌 조화로 세상을 바꾸는 사명이 있습니다.
물이 바위를 뚫듯이, 바람에 흔들려도 꺾이지 않는 풀처럼, 부드러움 속에 진정한 강함이 있습니다.
적응하고 조화를 이루며 어디서든 아름다움을 피워내세요.`,
      en: `Change the world with gentle power. Eul-mok (乙木) is the energy of vines and flowers that grow bending flexibly.
Your soul's mission is to change the world through flexibility not force, harmony not confrontation.
Like water drilling through rock, like grass that sways in wind but doesn't break, true strength lies in gentleness.
Adapt, harmonize, and bloom beauty anywhere.`
    },
    expression: {
      ko: `적응하고 조화를 이루며 아름다움을 만드세요. 어떤 환경에서도 뿌리를 내리고 꽃을 피울 수 있는 능력이 있습니다.
예술, 아름다움, 조화로운 관계를 통해 세상을 더 아름답게 만드세요. 갈등을 중재하고 사람들을 연결하세요.
강하게 밀어붙이기보다 자연스럽게 스며드세요. 시간이 걸려도 결국 원하는 것을 얻게 됩니다.
유연함, 적응력, 아름다움에 대한 감각이 당신의 강점입니다.`,
      en: `Adapt, harmonize, and create beauty. You have the ability to take root and bloom in any environment.
Make the world more beautiful through art, beauty, and harmonious relationships. Mediate conflicts and connect people.
Seep in naturally rather than pushing forcefully. Even if it takes time, you eventually get what you want.
Flexibility, adaptability, and aesthetic sense are your strengths.`
    },
    fulfillment: {
      ko: `어디서든 피어나는 꽃처럼 살 때 가장 행복해요. 척박한 환경에서도 아름다움을 만들어내는 것이 당신의 사명입니다.
당신이 있는 곳이 더 아름다워지고, 당신이 만난 사람들이 더 조화롭게 지내고, 갈등이 평화로 바뀔 때 기쁨을 느낍니다.
강하게 서 있기보다 우아하게 휘어지세요. 그 유연함이 당신을 어디서든 생존하고 번영하게 합니다.`,
      en: `Happiest living like a flower that blooms anywhere. Your mission is to create beauty even in barren environments.
You feel joy when places you're in become more beautiful, people you meet get along more harmoniously, and conflicts turn to peace.
Bend gracefully rather than standing rigidly. That flexibility lets you survive and flourish anywhere.`
    },
  },
  '병': {
    core: {
      ko: `빛과 열정으로 세상을 밝히세요. 병화(丙火)는 하늘의 태양처럼 세상을 환하게 비추는 에너지입니다.
당신의 영혼은 빛이 되어 어둠을 밝히고, 열정으로 사람들에게 영감을 주며, 따뜻함으로 생명을 피워내는 사명이 있습니다.
숨기거나 작아지지 마세요. 태양은 스스로 빛나며 모든 것을 비춥니다. 당신도 그렇게 존재하세요.
열정, 활력, 긍정의 에너지를 세상에 퍼뜨리세요.`,
      en: `Light the world with passion and radiance. Byeong-hwa (丙火) is energy that brightly illuminates the world like the sun in the sky.
Your soul's mission is to be light dispelling darkness, inspire people with passion, and bring life with warmth.
Don't hide or shrink. The sun shines by itself and illuminates everything. Exist that way.
Spread passion, vitality, and positive energy to the world.`
    },
    expression: {
      ko: `열정적으로 표현하고 다른 이들을 따뜻하게 해주세요. 당신의 존재 자체가 에너지와 활력을 발산합니다.
무대 위에서든 일상에서든, 밝고 긍정적인 에너지로 사람들을 이끄세요. 자신감 있게 자신을 표현하세요.
창의적이고 열정적인 프로젝트에 참여하세요. 사람들에게 희망과 영감을 주세요.
당신의 미소와 열정은 전염됩니다. 그것을 아끼지 마세요.`,
      en: `Express passionately and warm others. Your very existence radiates energy and vitality.
Whether on stage or in daily life, lead people with bright, positive energy. Express yourself confidently.
Participate in creative and passionate projects. Give people hope and inspiration.
Your smile and passion are contagious. Don't hold them back.`
    },
    fulfillment: {
      ko: `태양처럼 모든 것을 비출 때 가장 행복해요. 당신의 빛이 사람들의 마음을 따뜻하게 하고, 삶을 밝게 할 때 존재의 의미를 느낍니다.
차별 없이 모든 것을 비추는 태양처럼, 누구에게나 따뜻하게 대하세요. 그것이 병화 영혼의 진정한 모습입니다.
당신이 있는 곳은 항상 밝고 따뜻해야 합니다. 그것이 당신의 사명입니다.`,
      en: `Happiest when illuminating everything like the sun. You feel meaning when your light warms people's hearts and brightens their lives.
Like the sun that shines on everything without discrimination, be warm to everyone. That is the true nature of a Byeong-hwa soul.
Where you are should always be bright and warm. That is your mission.`
    },
  },
  '정': {
    core: {
      ko: `따뜻한 빛으로 가까운 이들을 돌보세요. 정화(丁火)는 촛불이나 등불처럼 가까운 곳을 은은히 밝히는 에너지입니다.
당신의 영혼은 세상 전체가 아닌 가까운 사람들을 섬세하게 돌보고, 작지만 깊은 따뜻함을 전하는 사명이 있습니다.
화려하지 않지만 꼭 필요한 곳에 빛을 비추세요. 어둠 속에서 길을 밝히는 등불이 되세요.
섬세함, 따뜻함, 배려가 당신의 본질입니다.`,
      en: `Care for those close with warm light. Jeong-hwa (丁火) is energy that softly illuminates nearby places like candles or lamps.
Your soul's mission is to delicately care for close people rather than the whole world, conveying small but deep warmth.
Shine light where it's needed, not glamorously but essentially. Be a lamp lighting the way in darkness.
Delicacy, warmth, and consideration are your essence.`
    },
    expression: {
      ko: `섬세하고 따뜻하게 관계를 만들어가세요. 깊이 있는 일대일 관계에서 당신의 진가가 발휘됩니다.
말없이 곁에 있어주고, 필요할 때 도움의 손길을 내밀고, 작은 것에서 큰 의미를 찾으세요.
가까운 가족, 친구, 동료와의 관계에 집중하세요. 넓지만 얕은 관계보다 좁지만 깊은 관계가 당신에게 맞습니다.
세심한 배려와 따뜻한 마음으로 사람들의 마음을 움직이세요.`,
      en: `Build relationships with delicacy and warmth. Your true value shines in deep one-on-one relationships.
Be silently present, extend a helping hand when needed, find great meaning in small things.
Focus on relationships with close family, friends, colleagues. Narrow but deep relationships suit you better than wide but shallow ones.
Move people's hearts with careful consideration and warm heart.`
    },
    fulfillment: {
      ko: `촛불처럼 가까운 이들을 밝힐 때 가장 행복해요. 세상 전체를 바꾸는 것이 아니라, 곁에 있는 사람들의 삶을 따뜻하게 할 때 존재의 의미를 느낍니다.
당신이 돌본 사람들이 성장하고, 당신의 따뜻함을 기억하고, 그 사랑을 다른 이에게 전할 때 기쁨을 느낍니다.
작은 불꽃도 어둠을 밝힐 수 있습니다. 당신의 존재가 바로 그런 빛입니다.`,
      en: `Happiest illuminating close ones like a candle. You feel meaning not by changing the whole world, but by warming the lives of people beside you.
You feel joy when people you cared for grow, remember your warmth, and pass that love to others.
Even a small flame can light the darkness. Your existence is exactly that kind of light.`
    },
  },
  '무': {
    core: {
      ko: `든든한 터전을 만들어 모든 것을 지지하세요. 무토(戊土)는 큰 산이나 대지처럼 모든 것을 품고 지지하는 에너지입니다.
당신의 영혼은 흔들리지 않는 안정감으로 다른 이들에게 기댈 곳을 제공하고, 모든 것이 뿌리내릴 수 있는 터전이 되는 사명이 있습니다.
변하지 않는 신뢰, 흔들리지 않는 존재감으로 사람들에게 안심을 주세요.
안정, 신뢰, 포용이 당신의 본질입니다.`,
      en: `Create solid foundations that support all. Mu-to (戊土) is energy like a great mountain or earth that embraces and supports everything.
Your soul's mission is to provide a place to lean on with unshakeable stability, becoming ground where everything can take root.
Give people peace of mind with unchanging trust and unshakeable presence.
Stability, trust, and embrace are your essence.`
    },
    expression: {
      ko: `안정적이고 신뢰할 수 있는 존재가 되세요. 사람들이 어려울 때 찾는 사람, 기댈 수 있는 사람이 되세요.
약속을 지키고, 일관성을 유지하고, 누구에게나 공정하게 대하세요. 당신의 신뢰성이 가장 큰 자산입니다.
크게 움직이지 않아도 당신이 있다는 것만으로 사람들은 안심합니다. 그것이 당신의 힘입니다.
조직, 가정, 공동체의 중심이 되어 모든 것을 지지하세요.`,
      en: `Be a stable and reliable presence. Be the person people seek in difficulty, someone they can lean on.
Keep promises, maintain consistency, treat everyone fairly. Your reliability is your greatest asset.
Without much movement, people feel secure just knowing you're there. That is your power.
Become the center of organizations, families, communities, supporting everything.`
    },
    fulfillment: {
      ko: `산처럼 모든 것을 품을 때 가장 행복해요. 당신 위에서 많은 것들이 자라고, 당신 덕분에 안정을 찾을 때 존재의 의미를 느낍니다.
변하지 않는 것의 가치, 든든함의 중요성을 세상에 보여주세요. 화려하지 않지만 꼭 필요한 존재가 되세요.
당신이 있기에 다른 것들이 존재할 수 있습니다. 그것이 무토 영혼의 진정한 역할입니다.`,
      en: `Happiest embracing everything like a mountain. You feel meaning when many things grow on you and find stability because of you.
Show the world the value of unchanging things, the importance of reliability. Be not glamorous but essential.
Because you exist, other things can exist. That is the true role of a Mu-to soul.`
    },
  },
  '기': {
    core: {
      ko: `기름진 땅처럼 모든 것을 키우세요. 기토(己土)는 비옥한 대지처럼 생명을 키우고 보살피는 에너지입니다.
당신의 영혼은 다른 것들이 자랄 수 있도록 양분을 제공하고, 보살피고, 성장시키는 사명이 있습니다.
겸손하게 낮은 곳에서 모든 것을 품으세요. 드러나지 않지만 가장 중요한 역할을 하는 것이 당신입니다.
양육, 보살핌, 성장 지원이 당신의 본질입니다.`,
      en: `Nurture everything like fertile soil. Gi-to (己土) is energy that nurtures and cares for life like fertile ground.
Your soul's mission is to provide nourishment for others to grow, to care for and develop them.
Humbly embrace everything from low places. You play the most important role while not being visible.
Nurturing, caring, supporting growth is your essence.`
    },
    expression: {
      ko: `보살피고 성장시키는 역할을 하세요. 아이, 학생, 후배, 직원 등 누군가를 키우는 일에서 보람을 찾으세요.
인정받지 못해도 묵묵히 지원하고, 다른 이들이 빛나도록 뒤에서 도우세요. 어머니의 마음으로 품으세요.
가르치고, 돌보고, 성장시키는 모든 일이 당신에게 잘 맞습니다.
겸손과 희생, 무조건적인 사랑이 당신의 방식입니다.`,
      en: `Take on roles of caring and growing. Find fulfillment in raising someone - children, students, juniors, employees.
Quietly support even without recognition, help others shine from behind. Embrace with a mother's heart.
Teaching, caring, developing - all these jobs suit you well.
Humility, sacrifice, and unconditional love are your ways.`
    },
    fulfillment: {
      ko: `다른 것들이 당신 안에서 자랄 때 가장 행복해요. 당신이 키운 것들이 열매를 맺고, 당신이 도운 사람들이 성공할 때 존재의 의미를 느낍니다.
빛나지 않아도 괜찮습니다. 땅은 드러나지 않지만 모든 생명의 근원입니다. 당신도 그런 존재입니다.
인정받지 못하더라도 당신이 한 일은 열매로 남습니다. 그것이 기토 영혼의 진정한 성취입니다.`,
      en: `Happiest when others grow within you. You feel meaning when what you raised bears fruit and people you helped succeed.
It's okay not to shine. Earth isn't visible but is the source of all life. You are such a being.
Even without recognition, what you did remains as fruit. That is the true achievement of a Gi-to soul.`
    },
  },
  '경': {
    core: {
      ko: `정의와 원칙으로 세상을 바로잡으세요. 경금(庚金)은 단단한 철이나 칼처럼 불의를 베어내는 에너지입니다.
당신의 영혼은 옳고 그름을 분명히 하고, 원칙을 지키며, 불의에 맞서는 사명이 있습니다.
타협하지 마세요. 칼이 휘어지면 쓸모가 없어지듯이, 당신의 가치도 원칙에 있습니다.
정의, 원칙, 결단력이 당신의 본질입니다.`,
      en: `Correct the world with justice and principle. Gyeong-geum (庚金) is energy that cuts down injustice like hard iron or a sword.
Your soul's mission is to clearly distinguish right from wrong, uphold principles, and stand against injustice.
Don't compromise. Like a bent sword becomes useless, your value lies in principles.
Justice, principles, and decisiveness are your essence.`
    },
    expression: {
      ko: `결단력 있고 명확하게 행동하세요. 모호함을 싫어하고, 분명한 기준으로 판단하고 행동하세요.
필요할 때 단호하게 잘라내세요. 불필요한 것, 잘못된 것, 해로운 것을 정리하는 것이 당신의 역할입니다.
법, 규칙, 시스템을 만들고 지키세요. 공정한 심판자가 되세요.
당신의 날카로움과 정확함이 세상을 바로잡습니다.`,
      en: `Act with decisiveness and clarity. Dislike ambiguity, judge and act with clear standards.
Cut firmly when needed. Your role is to clear out the unnecessary, wrong, and harmful.
Create and uphold laws, rules, and systems. Be a fair judge.
Your sharpness and precision correct the world.`
    },
    fulfillment: {
      ko: `칼처럼 불의를 바로잡을 때 가장 행복해요. 당신의 원칙이 지켜지고, 정의가 실현되고, 세상이 더 공정해질 때 존재의 의미를 느낍니다.
날카롭다고 해서 잔인한 것이 아닙니다. 외과의사의 메스처럼, 아픔이 있어도 치유를 위한 것이에요.
당신이 바로잡은 것들이 더 나은 세상을 만듭니다. 그것이 경금 영혼의 진정한 역할입니다.`,
      en: `Happiest correcting injustice like a sword. You feel meaning when your principles are upheld, justice is realized, and the world becomes fairer.
Being sharp doesn't mean being cruel. Like a surgeon's scalpel, pain is for healing.
What you corrected makes a better world. That is the true role of a Gyeong-geum soul.`
    },
  },
  '신': {
    core: {
      ko: `섬세함으로 가치를 정제하세요. 신금(辛金)은 보석이나 정교한 금속 공예처럼 아름다움을 다듬는 에너지입니다.
당신의 영혼은 거친 것을 다듬어 보석으로 만들고, 평범한 것에서 특별함을 찾아내며, 완벽을 추구하는 사명이 있습니다.
세밀한 눈으로 세상을 보세요. 다른 사람들이 놓치는 것을 당신은 봅니다.
섬세함, 완벽, 아름다움 추구가 당신의 본질입니다.`,
      en: `Refine value with delicacy. Sin-geum (辛金) is energy that polishes beauty like gems or fine metalwork.
Your soul's mission is to refine rough things into gems, find specialness in ordinary things, and pursue perfection.
See the world with detailed eyes. You see what others miss.
Delicacy, perfection, and pursuit of beauty are your essence.`
    },
    expression: {
      ko: `완벽함을 추구하며 아름다운 것을 만드세요. 디테일에 집착하고, 품질에 타협하지 마세요.
예술, 공예, 디자인, 뷰티, 패션 등 아름다움과 관련된 분야에서 빛나세요.
까다롭다는 말을 들어도 괜찮습니다. 당신의 기준이 결국 아름다운 결과물을 만듭니다.
정교함과 우아함으로 세상에 가치를 더하세요.`,
      en: `Pursue perfection and create beautiful things. Obsess over details, don't compromise on quality.
Shine in fields related to beauty - art, crafts, design, beauty, fashion.
It's okay to be called picky. Your standards ultimately create beautiful results.
Add value to the world with precision and elegance.`
    },
    fulfillment: {
      ko: `보석처럼 빛나는 것을 만들 때 가장 행복해요. 당신의 손을 거친 것들이 빛나고, 당신의 안목이 인정받을 때 존재의 의미를 느낍니다.
작지만 빛나는 것이 크지만 평범한 것보다 가치 있습니다. 당신은 그 차이를 아는 사람이에요.
당신이 다듬은 것들이 세상에 아름다움을 더합니다. 그것이 신금 영혼의 진정한 성취입니다.`,
      en: `Happiest creating things that shine like gems. You feel meaning when things that passed through your hands shine and your discernment is recognized.
Something small but shining is more valuable than something big but ordinary. You understand that difference.
What you refined adds beauty to the world. That is the true achievement of a Sin-geum soul.`
    },
  },
  '임': {
    core: {
      ko: `지혜의 바다처럼 모든 것을 품으세요. 임수(壬水)는 거대한 바다처럼 깊고 넓게 세상을 이해하는 에너지입니다.
당신의 영혼은 깊은 지혜로 모든 것을 이해하고, 유연하게 적응하며, 무한한 가능성을 품는 사명이 있습니다.
판단하기보다 이해하세요. 바다가 모든 강물을 받아들이듯이, 당신도 모든 것을 품을 수 있습니다.
지혜, 유연성, 포용이 당신의 본질입니다.`,
      en: `Embrace everything like an ocean of wisdom. Im-su (壬水) is energy that understands the world deeply and widely like a vast ocean.
Your soul's mission is to understand everything with deep wisdom, adapt flexibly, and embrace infinite possibilities.
Understand rather than judge. Like the ocean accepts all rivers, you too can embrace everything.
Wisdom, flexibility, and embrace are your essence.`
    },
    expression: {
      ko: `유연하고 깊이 있게 세상을 이해하세요. 표면이 아닌 깊이를 보고, 하나가 아닌 전체를 파악하세요.
흐름을 읽고 변화에 적응하세요. 물처럼 어떤 형태의 그릇에도 담길 수 있어야 합니다.
철학, 심리학, 영성 등 깊이 있는 분야에서 지혜를 나누세요.
고정관념을 넘어 유연하게 생각하고 행동하세요.`,
      en: `Understand the world with flexibility and depth. See depth not surface, grasp the whole not just one part.
Read the flow and adapt to change. Like water, you must fit into containers of any shape.
Share wisdom in deep fields like philosophy, psychology, spirituality.
Think and act flexibly beyond fixed ideas.`
    },
    fulfillment: {
      ko: `바다처럼 모든 것이 흘러들 때 가장 행복해요. 다양한 경험, 지식, 사람들이 당신에게 모여들고, 그것이 더 큰 지혜가 될 때 존재의 의미를 느낍니다.
거부하지 마세요. 바다는 맑은 물도 탁한 물도 모두 받아들여 결국 하나가 됩니다.
당신의 깊이와 넓이가 세상을 더 지혜롭게 만듭니다. 그것이 임수 영혼의 진정한 역할입니다.`,
      en: `Happiest when everything flows into you like the ocean. You feel meaning when diverse experiences, knowledge, and people gather to you and become greater wisdom.
Don't reject. The ocean accepts both clear and murky water, becoming one.
Your depth and breadth make the world wiser. That is the true role of an Im-su soul.`
    },
  },
  '계': {
    core: {
      ko: `생명의 근원처럼 필요한 곳을 적시세요. 계수(癸水)는 이슬이나 샘물처럼 생명을 살리는 작은 물의 에너지입니다.
당신의 영혼은 눈에 띄지 않게 필요한 곳에 스며들어 생명을 살리고, 메마른 곳을 적시며, 조용히 치유하는 사명이 있습니다.
화려하지 않아도 괜찮아요. 아침 이슬 한 방울이 꽃을 피우듯, 당신의 작은 행동이 생명을 살립니다.
치유, 봉사, 은밀한 돌봄이 당신의 본질입니다.`,
      en: `Moisten where needed like the source of life. Gye-su (癸水) is the energy of small water like dew or spring water that gives life.
Your soul's mission is to seep unseen where needed, give life, moisten dry places, and quietly heal.
It's okay not to be glamorous. Like one drop of morning dew makes flowers bloom, your small actions give life.
Healing, service, and hidden care are your essence.`
    },
    expression: {
      ko: `필요한 곳에 은은하게 스며드세요. 큰 소리 없이, 주목받지 않으면서 도움이 필요한 곳을 찾아가세요.
직관과 감수성으로 다른 사람의 필요를 읽으세요. 말하지 않아도 필요한 것을 알아채고 제공하세요.
치유, 상담, 봉사, 돌봄의 역할에서 빛나세요. 뒤에서 조용히 지원하는 것이 당신의 방식입니다.
겸손하고 섬세하게, 생명을 살리는 일을 하세요.`,
      en: `Gently seep into where you're needed. Without loud sound, without attention, find places that need help.
Read others' needs with intuition and sensitivity. Notice and provide what's needed without being told.
Shine in roles of healing, counseling, service, caring. Quietly supporting from behind is your way.
Humbly and delicately, do the work of giving life.`
    },
    fulfillment: {
      ko: `이슬처럼 생명을 살릴 때 가장 행복해요. 당신이 조용히 도운 것들이 살아나고, 당신의 보이지 않는 손길이 세상을 적실 때 존재의 의미를 느낍니다.
인정받지 못해도 괜찮아요. 이슬은 누가 봐주지 않아도 매일 아침 내려 생명을 살립니다.
당신의 작은 친절과 돌봄이 누군가의 삶을 바꿉니다. 그것이 계수 영혼의 진정한 성취입니다.`,
      en: `Happiest giving life like dew. You feel meaning when things you quietly helped come alive and your invisible touch moistens the world.
It's okay without recognition. Dew falls every morning giving life without anyone watching.
Your small kindness and care change someone's life. That is the true achievement of a Gye-su soul.`
    },
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
  siksin: [
    { ko: "창작 능력", en: "Creative ability" },
    { ko: "미적 감각", en: "Aesthetic sense" },
    { ko: "요리/음식", en: "Cooking/Food" },
    { ko: "글쓰기", en: "Writing" },
    { ko: "디자인 감각", en: "Design sense" },
  ],
  sanggwan: [
    { ko: "언변", en: "Eloquence" },
    { ko: "퍼포먼스", en: "Performance" },
    { ko: "영향력", en: "Influence" },
    { ko: "대중 연설", en: "Public speaking" },
    { ko: "혁신적 사고", en: "Innovative thinking" },
  ],
  jeonggwan: [
    { ko: "조직력", en: "Organization" },
    { ko: "공정함", en: "Fairness" },
    { ko: "리더십", en: "Leadership" },
    { ko: "전략적 사고", en: "Strategic thinking" },
    { ko: "위기 관리", en: "Crisis management" },
  ],
  pyeongwan: [
    { ko: "용기", en: "Courage" },
    { ko: "결단력", en: "Determination" },
    { ko: "실행력", en: "Execution" },
    { ko: "위기 대처", en: "Crisis response" },
    { ko: "보호 본능", en: "Protective instinct" },
  ],
  jeongjae: [
    { ko: "재정 관리", en: "Financial management" },
    { ko: "실용성", en: "Practicality" },
    { ko: "안정감", en: "Stability" },
    { ko: "자원 관리", en: "Resource management" },
    { ko: "신뢰 구축", en: "Trust building" },
  ],
  pyeonjae: [
    { ko: "기회 포착", en: "Opportunity spotting" },
    { ko: "적응력", en: "Adaptability" },
    { ko: "네트워킹", en: "Networking" },
    { ko: "위험 감수", en: "Risk-taking" },
    { ko: "다문화 이해", en: "Cross-cultural understanding" },
  ],
  jeongin: [
    { ko: "학습 능력", en: "Learning ability" },
    { ko: "가르침", en: "Teaching" },
    { ko: "인내", en: "Patience" },
    { ko: "연구 능력", en: "Research ability" },
    { ko: "지식 전달", en: "Knowledge transfer" },
  ],
  pyeongin: [
    { ko: "직관력", en: "Intuition" },
    { ko: "영성", en: "Spirituality" },
    { ko: "통찰력", en: "Insight" },
    { ko: "상징 해석", en: "Symbol interpretation" },
    { ko: "치유 능력", en: "Healing ability" },
  ],
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
  MAX_ITEMS: 4,
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
    '도화': {
      ko: { area: "매력 카르마", description: "전생에서 매력과 관계를 통해 배워야 할 교훈이 있어요. 인간관계에서 경계를 배워야 해요.", healing: "진정한 사랑과 건강한 관계의 균형을 찾으세요" },
      en: { area: "Charm Karma", description: "Lessons to learn through attraction and relationships from past lives. You need to learn boundaries in relationships.", healing: "Find balance between true love and healthy relationships" }
    },
    '역마': {
      ko: { area: "이동 카르마", description: "전생에서 정착하지 못하고 떠돌았던 영혼이에요. 한 곳에 뿌리내리는 것이 이번 생의 과제예요.", healing: "안정과 자유 사이의 균형을 찾으세요" },
      en: { area: "Movement Karma", description: "A soul that wandered without settling in past lives. Putting down roots is your challenge this life.", healing: "Find balance between stability and freedom" }
    },
    '화개': {
      ko: { area: "영적 카르마", description: "전생에서 영적인 수행을 했던 영혼이에요. 세속과 영성의 균형을 찾아야 해요.", healing: "일상 속에서 영성을 실천하세요" },
      en: { area: "Spiritual Karma", description: "A soul that practiced spiritually in past lives. You need to find balance between secular and spiritual.", healing: "Practice spirituality in everyday life" }
    },
    '백호': {
      ko: { area: "권력 카르마", description: "전생에서 권력이나 힘을 남용했을 수 있어요. 이번 생에서는 힘을 선하게 쓰는 법을 배워요.", healing: "힘을 보호와 봉사를 위해 사용하세요" },
      en: { area: "Power Karma", description: "You may have misused power or authority in past lives. This life, learn to use power for good.", healing: "Use your power for protection and service" }
    },
    '괴강': {
      ko: { area: "강인함 카르마", description: "전생에서 극단적인 상황을 경험한 영혼이에요. 유연성과 부드러움을 배워야 해요.", healing: "강함 속에서 부드러움을 찾으세요" },
      en: { area: "Strength Karma", description: "A soul that experienced extreme situations in past lives. You need to learn flexibility and gentleness.", healing: "Find softness within your strength" }
    },
    '양인': {
      ko: { area: "결단 카르마", description: "전생에서 날카로운 결단으로 상처를 줬을 수 있어요. 신중함과 배려를 배워야 해요.", healing: "결정할 때 다른 사람의 입장도 고려하세요" },
      en: { area: "Decision Karma", description: "You may have hurt others with sharp decisions in past lives. You need to learn prudence and consideration.", healing: "Consider others' positions when making decisions" }
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
  '원진': ['원진', '元嗔'],
  '공망': ['공망', '空亡'],
  '겁살': ['겁살', '劫殺'],
  '도화': ['도화', '桃花'],
  '역마': ['역마', '驛馬'],
  '화개': ['화개', '華蓋'],
  '백호': ['백호', '白虎'],
  '괴강': ['괴강', '魁罡'],
  '양인': ['양인', '羊刃'],
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
