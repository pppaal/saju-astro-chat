// src/components/destiny-map/fun-insights/analyzers/karmaAnalyzer.ts
// 카르마 분석기 - destiny-matrix 통합

import type { GeokgukType } from '@/lib/destiny-matrix/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SajuData = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AstroData = any;

export interface KarmaAnalysisResult {
  // 영혼 유형 (격국 + 드라코닉 기반)
  soulType: {
    title: string;
    emoji: string;
    description: string;
    traits: string[];
    draconicSoul?: string;
  };
  // 이번 생의 성장 방향 (North Node)
  growthPath: {
    direction: string;
    pastPattern: string;
    lesson: string;
    practicalAdvice: string[];
  };
  // 치유해야 할 상처 (Chiron)
  woundToHeal: {
    wound: string;
    healingPath: string;
    gift: string;
  };
  // 토성 레슨
  saturnLesson: {
    lesson: string;
    timing: string;
    mastery: string;
  };
  // 플루토 변환
  plutoTransform?: {
    area: string;
    death: string;
    rebirth: string;
  };
  // 운명의 인연
  fatedConnections: {
    type: string;
    description: string;
  }[];
  // 영혼의 사명 (일간 + 용신 기반)
  soulMission: {
    core: string;
    expression: string;
    fulfillment: string;
  };
  // 전생 테마
  pastLifeTheme: {
    likely: string;
    talents: string;
    lessons: string;
  };
  // 카르마 점수
  karmaScore: number;
  // 영혼 여정 타임라인
  soulJourney?: {
    pastLife: string;
    currentLife: string;
    futurePotential: string;
    keyTransition: string;
  };
  // 카르마 해제 힌트
  karmaRelease?: {
    blockage: string;
    healing: string;
    breakthrough: string;
  };
}

// 일간별 영혼 사명 (10개 천간)
const dayMasterSoulMission: Record<string, { ko: string; en: string; expression: { ko: string; en: string }; fulfillment: { ko: string; en: string } }> = {
  갑: {
    ko: "세상에 새로운 시작과 가능성을 보여주는 개척자",
    en: "Pioneer showing new beginnings and possibilities to the world",
    expression: { ko: "리더십, 창업, 혁신", en: "Leadership, entrepreneurship, innovation" },
    fulfillment: { ko: "당신이 시작한 것이 다른 사람들에게 영감을 줄 때", en: "When what you start inspires others" },
  },
  을: {
    ko: "유연함과 적응력으로 어디서든 성장하는 치유자",
    en: "Healer who grows anywhere with flexibility and adaptability",
    expression: { ko: "협력, 조율, 성장 지원", en: "Cooperation, coordination, growth support" },
    fulfillment: { ko: "당신의 유연함이 조직이나 관계를 살릴 때", en: "When your flexibility saves organizations or relationships" },
  },
  병: {
    ko: "빛과 열정으로 어둠 속 사람들을 이끄는 태양",
    en: "Sun leading people in darkness with light and passion",
    expression: { ko: "영감 주기, 비전 제시, 무대", en: "Inspiring, presenting vision, the stage" },
    fulfillment: { ko: "당신의 빛이 누군가의 삶을 밝힐 때", en: "When your light brightens someone's life" },
  },
  정: {
    ko: "섬세한 불꽃으로 마음을 녹이는 촛불",
    en: "Candle that melts hearts with delicate flame",
    expression: { ko: "예술, 감성 표현, 세심한 케어", en: "Art, emotional expression, attentive care" },
    fulfillment: { ko: "당신의 따뜻함이 차가운 마음을 녹일 때", en: "When your warmth melts cold hearts" },
  },
  무: {
    ko: "흔들리지 않는 안정감으로 모든 것을 품는 산",
    en: "Mountain embracing everything with unwavering stability",
    expression: { ko: "보호, 신뢰 구축, 중재", en: "Protection, building trust, mediation" },
    fulfillment: { ko: "사람들이 당신에게 안식을 느낄 때", en: "When people feel rest in you" },
  },
  기: {
    ko: "비옥한 대지처럼 모든 것이 자라게 하는 양육자",
    en: "Nurturer who makes everything grow like fertile earth",
    expression: { ko: "양육, 교육, 실용적 돌봄", en: "Nurturing, education, practical care" },
    fulfillment: { ko: "당신이 키운 것들이 열매를 맺을 때", en: "When what you nurtured bears fruit" },
  },
  경: {
    ko: "정의와 결단으로 세상의 불균형을 바로잡는 검",
    en: "Sword correcting world's imbalance with justice and decision",
    expression: { ko: "판단, 개혁, 명확한 결단", en: "Judgment, reform, clear decisions" },
    fulfillment: { ko: "당신의 결단이 정의를 세울 때", en: "When your decisions establish justice" },
  },
  신: {
    ko: "정교함과 완벽함으로 아름다움을 창조하는 장인",
    en: "Artisan creating beauty with precision and perfection",
    expression: { ko: "디테일, 완성도, 정교한 작업", en: "Details, completion, refined work" },
    fulfillment: { ko: "당신의 작품이 시간을 초월해 빛날 때", en: "When your work shines beyond time" },
  },
  임: {
    ko: "깊은 지혜와 흐름으로 모든 것을 연결하는 바다",
    en: "Ocean connecting everything with deep wisdom and flow",
    expression: { ko: "통찰, 연결, 지혜 전달", en: "Insight, connection, sharing wisdom" },
    fulfillment: { ko: "당신의 지혜가 세상을 연결할 때", en: "When your wisdom connects the world" },
  },
  계: {
    ko: "섬세한 감수성으로 영감을 전하는 안개비",
    en: "Misty rain delivering inspiration with delicate sensitivity",
    expression: { ko: "직관, 영감, 감성 치유", en: "Intuition, inspiration, emotional healing" },
    fulfillment: { ko: "당신의 감성이 마른 세상을 적실 때", en: "When your sensitivity moistens a dry world" },
  },
};

// 격국 → 드라코닉 영혼 타입 매핑 (traits 포함)
const geokgukToDraconicSoul: Record<string, {
  ko: string;
  en: string;
  emoji: string;
  traits: { ko: string[]; en: string[] };
  description: { ko: string; en: string };
}> = {
  jeonggwan: {
    ko: "정의의 수호자 영혼", en: "Guardian of Justice Soul", emoji: "⚖️",
    traits: { ko: ["정직", "책임감", "명예"], en: ["Honesty", "Responsibility", "Honor"] },
    description: { ko: "규칙과 질서를 통해 세상을 바르게 만드는 사명을 가진 영혼", en: "Soul with a mission to make the world right through rules and order" }
  },
  pyeongwan: {
    ko: "전사 영혼", en: "Warrior Soul", emoji: "🗡️",
    traits: { ko: ["용기", "도전", "카리스마"], en: ["Courage", "Challenge", "Charisma"] },
    description: { ko: "역경을 돌파하고 싸워서 이기는 힘을 가진 영혼", en: "Soul with power to break through adversity and win battles" }
  },
  jeongin: {
    ko: "현자 영혼", en: "Sage Soul", emoji: "📚",
    traits: { ko: ["지혜", "보호", "학습"], en: ["Wisdom", "Protection", "Learning"] },
    description: { ko: "배우고 가르치며 다른 사람을 성장시키는 영혼", en: "Soul that learns, teaches, and helps others grow" }
  },
  pyeongin: {
    ko: "신비가 영혼", en: "Mystic Soul", emoji: "🔮",
    traits: { ko: ["직관", "영성", "창의"], en: ["Intuition", "Spirituality", "Creativity"] },
    description: { ko: "보이지 않는 세계를 감지하고 깊은 통찰을 전하는 영혼", en: "Soul that senses the invisible world and shares deep insights" }
  },
  siksin: {
    ko: "창조자 영혼", en: "Creator Soul", emoji: "🎨",
    traits: { ko: ["창작", "표현", "풍요"], en: ["Creation", "Expression", "Abundance"] },
    description: { ko: "아름다움을 만들고 세상에 즐거움을 주는 영혼", en: "Soul that creates beauty and brings joy to the world" }
  },
  sanggwan: {
    ko: "천재 영혼", en: "Genius Soul", emoji: "💫",
    traits: { ko: ["재능", "혁신", "표현력"], en: ["Talent", "Innovation", "Expressiveness"] },
    description: { ko: "틀을 깨고 새로운 것을 창조하는 천재적 영혼", en: "Genius soul that breaks molds and creates the new" }
  },
  jeongjae: {
    ko: "풍요 영혼", en: "Abundance Soul", emoji: "💎",
    traits: { ko: ["안정", "성실", "축적"], en: ["Stability", "Diligence", "Accumulation"] },
    description: { ko: "차곡차곡 쌓아 풍요를 만드는 신뢰의 영혼", en: "Trustworthy soul that builds abundance steadily" }
  },
  pyeonjae: {
    ko: "모험가 영혼", en: "Adventurer Soul", emoji: "🌍",
    traits: { ko: ["도전", "확장", "기회포착"], en: ["Adventure", "Expansion", "Opportunity"] },
    description: { ko: "넓은 세상을 누비며 기회를 찾는 역동적 영혼", en: "Dynamic soul that roams the wide world seeking opportunities" }
  },
  geonrok: {
    ko: "왕자/공주 영혼", en: "Prince/Princess Soul", emoji: "👑",
    traits: { ko: ["자존감", "리더십", "당당함"], en: ["Self-esteem", "Leadership", "Confidence"] },
    description: { ko: "타고난 품위와 당당함으로 자신의 왕국을 세우는 영혼", en: "Soul that builds its kingdom with natural dignity and confidence" }
  },
  yangin: {
    ko: "검사 영혼", en: "Blade Soul", emoji: "⚔️",
    traits: { ko: ["결단", "정의", "날카로움"], en: ["Decision", "Justice", "Sharpness"] },
    description: { ko: "날카로운 결단력으로 불의를 베는 강인한 영혼", en: "Strong soul that cuts injustice with sharp decisiveness" }
  },
  jonga: {
    ko: "예술가 영혼", en: "Artist Soul", emoji: "🎭",
    traits: { ko: ["감성", "예술", "순수"], en: ["Emotion", "Art", "Purity"] },
    description: { ko: "예술과 아름다움을 통해 세상을 치유하는 순수한 영혼", en: "Pure soul that heals the world through art and beauty" }
  },
  jongjae: {
    ko: "부자 영혼", en: "Wealthy Soul", emoji: "💰",
    traits: { ko: ["재물복", "사업수완", "풍요"], en: ["Wealth fortune", "Business acumen", "Prosperity"] },
    description: { ko: "재물을 끌어당기고 풍요를 누리는 타고난 부자 영혼", en: "Born wealthy soul that attracts fortune and enjoys prosperity" }
  },
  jongsal: {
    ko: "통치자 영혼", en: "Ruler Soul", emoji: "🏛️",
    traits: { ko: ["권위", "통제력", "영향력"], en: ["Authority", "Control", "Influence"] },
    description: { ko: "강력한 힘으로 세상을 이끄는 통치자 영혼", en: "Ruler soul that leads the world with powerful force" }
  },
  jonggang: {
    ko: "리더 영혼", en: "Leader Soul", emoji: "👥",
    traits: { ko: ["리더십", "자립", "경쟁력"], en: ["Leadership", "Independence", "Competitiveness"] },
    description: { ko: "스스로 일어서서 사람들을 이끄는 강한 영혼", en: "Strong soul that stands alone and leads people" }
  },
  gokjik: {
    ko: "생명 영혼", en: "Life Soul", emoji: "🌲",
    traits: { ko: ["성장", "생명력", "봄"], en: ["Growth", "Vitality", "Spring"] },
    description: { ko: "끊임없이 자라고 생명을 피워내는 생명력의 영혼", en: "Soul of vitality that constantly grows and brings life" }
  },
  yeomsang: {
    ko: "불꽃 영혼", en: "Flame Soul", emoji: "🔥",
    traits: { ko: ["열정", "빛", "에너지"], en: ["Passion", "Light", "Energy"] },
    description: { ko: "뜨거운 열정으로 세상을 밝히는 불꽃 같은 영혼", en: "Flame-like soul that lights the world with hot passion" }
  },
  gasaek: {
    ko: "대지 영혼", en: "Earth Soul", emoji: "🏔️",
    traits: { ko: ["안정", "신뢰", "포용"], en: ["Stability", "Trust", "Embrace"] },
    description: { ko: "흔들림 없이 모든 것을 품어주는 대지 같은 영혼", en: "Earth-like soul that embraces everything without wavering" }
  },
  jonghyeok: {
    ko: "금속 영혼", en: "Metal Soul", emoji: "⚔️",
    traits: { ko: ["정교함", "결단력", "완성도"], en: ["Precision", "Decisiveness", "Perfection"] },
    description: { ko: "정교하게 다듬어 완벽을 추구하는 금속 영혼", en: "Metal soul that pursues perfection through precise refinement" }
  },
  yunha: {
    ko: "물 영혼", en: "Water Soul", emoji: "🌊",
    traits: { ko: ["지혜", "유연함", "깊이"], en: ["Wisdom", "Flexibility", "Depth"] },
    description: { ko: "어디든 스며들어 모든 것을 연결하는 물 같은 영혼", en: "Water-like soul that seeps everywhere and connects everything" }
  },
};

// North Node 하우스별 상세 성장 경로
const nodeHouseGrowthPath: Record<number, {
  direction: { ko: string; en: string };
  pastPattern: { ko: string; en: string };
  lesson: { ko: string; en: string };
  advice: { ko: string[]; en: string[] };
}> = {
  1: {
    direction: { ko: "자아 정체성 확립", en: "Establishing self-identity" },
    pastPattern: { ko: "전생에서 파트너에게 의존하며 살았어요. 항상 '우리'를 먼저 생각했죠.", en: "In past lives, you depended on partners. Always thought of 'us' first." },
    lesson: { ko: "이번 생에서는 '나'를 먼저 알아야 해요. 혼자서도 온전한 나로 설 수 있어야 해요.", en: "This life, know 'yourself' first. Stand complete even alone." },
    advice: {
      ko: ["혼자 결정하는 연습을 하세요", "자기 의견을 당당히 말하세요", "다른 사람 눈치 보지 마세요"],
      en: ["Practice deciding alone", "Express your opinions confidently", "Don't worry about others' eyes"]
    },
  },
  2: {
    direction: { ko: "자기 가치 인식과 물질적 독립", en: "Recognizing self-worth and material independence" },
    pastPattern: { ko: "전생에서 다른 사람의 자원(돈, 에너지)에 의존했어요.", en: "In past lives, you depended on others' resources (money, energy)." },
    lesson: { ko: "이번 생에서는 스스로 가치를 만들고, 자기 힘으로 일어서야 해요.", en: "This life, create your own value and stand on your own." },
    advice: {
      ko: ["자기만의 수입원을 만드세요", "투자나 재테크를 배우세요", "자신의 재능에 가격을 매기세요"],
      en: ["Create your own income source", "Learn investing", "Put a price on your talents"]
    },
  },
  3: {
    direction: { ko: "소통과 일상적 학습", en: "Communication and everyday learning" },
    pastPattern: { ko: "전생에서 큰 비전과 철학에만 집중했어요. 디테일을 무시했죠.", en: "In past lives, you focused only on big visions. Ignored details." },
    lesson: { ko: "이번 생에서는 작은 일상의 배움과 소통에서 지혜를 찾아요.", en: "This life, find wisdom in small daily learning and communication." },
    advice: {
      ko: ["가까운 사람들과 더 대화하세요", "작은 것부터 배워가세요", "글쓰기나 블로그를 시작하세요"],
      en: ["Talk more with people close to you", "Learn from small things", "Start writing or blogging"]
    },
  },
  4: {
    direction: { ko: "내면의 안정과 가정 만들기", en: "Inner stability and creating home" },
    pastPattern: { ko: "전생에서 사회적 성공과 명예에만 집중했어요. 가족을 소홀히 했죠.", en: "In past lives, you focused on social success. Neglected family." },
    lesson: { ko: "이번 생에서는 내면의 평화와 정서적 안정이 우선이에요.", en: "This life, inner peace and emotional stability come first." },
    advice: {
      ko: ["집을 아늑하게 꾸미세요", "가족과 시간을 보내세요", "감정을 표현하는 연습을 하세요"],
      en: ["Make your home cozy", "Spend time with family", "Practice expressing emotions"]
    },
  },
  5: {
    direction: { ko: "창의성과 자기 표현", en: "Creativity and self-expression" },
    pastPattern: { ko: "전생에서 집단에 맞추며 개성을 숨겼어요. 튀는 게 두려웠죠.", en: "In past lives, you hid individuality to fit groups. Feared standing out." },
    lesson: { ko: "이번 생에서는 두려움 없이 나를 표현하고 창작해야 해요!", en: "This life, express and create yourself without fear!" },
    advice: {
      ko: ["창작 활동을 시작하세요 (그림, 음악, 글)", "연애를 즐기세요", "아이처럼 놀아보세요"],
      en: ["Start creative activities (art, music, writing)", "Enjoy romance", "Play like a child"]
    },
  },
  6: {
    direction: { ko: "일상과 봉사를 통한 성장", en: "Growth through routine and service" },
    pastPattern: { ko: "전생에서 몽상에 빠져 현실을 무시했어요. 영적 세계에만 집중했죠.", en: "In past lives, you ignored reality lost in dreams. Focused only on spiritual." },
    lesson: { ko: "이번 생에서는 구체적이고 실용적인 기여를 해야 해요.", en: "This life, make concrete and practical contributions." },
    advice: {
      ko: ["건강 루틴을 만드세요", "봉사 활동을 시작하세요", "디테일에 집중하세요"],
      en: ["Create health routines", "Start volunteering", "Focus on details"]
    },
  },
  7: {
    direction: { ko: "파트너십과 관계의 배움", en: "Partnership and relationship learning" },
    pastPattern: { ko: "전생에서 혼자 다 해결하려 했어요. 도움을 거부했죠.", en: "In past lives, you tried solving everything alone. Refused help." },
    lesson: { ko: "이번 생에서는 함께하는 법을 배워야 해요. 관계가 성장의 열쇠예요.", en: "This life, learn to work together. Relationships are the key to growth." },
    advice: {
      ko: ["타협하는 연습을 하세요", "파트너의 의견을 존중하세요", "비즈니스 파트너십을 고려하세요"],
      en: ["Practice compromising", "Respect partner's opinions", "Consider business partnerships"]
    },
  },
  8: {
    direction: { ko: "깊은 변환과 친밀감", en: "Deep transformation and intimacy" },
    pastPattern: { ko: "전생에서 안전한 것만 추구했어요. 변화가 두려웠죠.", en: "In past lives, you only sought safety. Feared change." },
    lesson: { ko: "이번 생에서는 안전지대를 벗어나 진정한 결합과 변환을 경험해야 해요.", en: "This life, leave comfort zone for true union and transformation." },
    advice: {
      ko: ["두려움을 직면하세요", "깊은 관계를 맺으세요", "공유 자원(투자, 파트너십)을 활용하세요"],
      en: ["Face your fears", "Form deep relationships", "Use shared resources (investments, partnerships)"]
    },
  },
  9: {
    direction: { ko: "신념과 철학 확장", en: "Expanding beliefs and philosophy" },
    pastPattern: { ko: "전생에서 세부 사항과 정보 수집에만 집중했어요. 큰 그림을 놓쳤죠.", en: "In past lives, you focused on details and info gathering. Missed big picture." },
    lesson: { ko: "이번 생에서는 더 넓은 시야와 의미를 찾아야 해요. 여행하고 배우세요.", en: "This life, find wider perspective and meaning. Travel and learn." },
    advice: {
      ko: ["해외여행을 떠나세요", "새로운 철학이나 종교를 탐구하세요", "가르치는 일을 해보세요"],
      en: ["Travel abroad", "Explore new philosophies or religions", "Try teaching"]
    },
  },
  10: {
    direction: { ko: "사회적 역할과 커리어", en: "Social role and career" },
    pastPattern: { ko: "전생에서 가정에만 안주했어요. 세상에 나가기를 두려워했죠.", en: "In past lives, you stayed only at home. Feared going out to the world." },
    lesson: { ko: "이번 생에서는 세상에서 당신의 역할을 찾고 성취해야 해요.", en: "This life, find and achieve your role in the world." },
    advice: {
      ko: ["커리어 목표를 세우세요", "공적인 역할을 맡아보세요", "책임을 받아들이세요"],
      en: ["Set career goals", "Take public roles", "Accept responsibility"]
    },
  },
  11: {
    direction: { ko: "집단과 미래 비전", en: "Groups and future vision" },
    pastPattern: { ko: "전생에서 개인적 영광과 로맨스에만 집중했어요.", en: "In past lives, you focused only on personal glory and romance." },
    lesson: { ko: "이번 생에서는 공동체와 미래 세대를 위해 기여해야 해요.", en: "This life, contribute to community and future generations." },
    advice: {
      ko: ["커뮤니티 활동에 참여하세요", "사회적 대의를 지지하세요", "네트워킹을 넓히세요"],
      en: ["Join community activities", "Support social causes", "Expand networking"]
    },
  },
  12: {
    direction: { ko: "영적 성장과 치유", en: "Spiritual growth and healing" },
    pastPattern: { ko: "전생에서 분석과 통제에 집착했어요. 놓아주질 못했죠.", en: "In past lives, you obsessed with analysis and control. Couldn't let go." },
    lesson: { ko: "이번 생에서는 우주의 흐름에 맡기고, 영적 성장을 해야 해요.", en: "This life, trust universal flow and achieve spiritual growth." },
    advice: {
      ko: ["명상이나 요가를 시작하세요", "혼자만의 시간을 가지세요", "직관을 믿으세요"],
      en: ["Start meditation or yoga", "Have alone time", "Trust your intuition"]
    },
  },
};

// Chiron 별자리별 상처와 치유
const chironHealingPath: Record<string, {
  wound: { ko: string; en: string };
  healing: { ko: string; en: string };
  gift: { ko: string; en: string };
}> = {
  aries: {
    wound: { ko: "존재 자체에 대한 상처. '내가 있어도 되는 걸까'라는 근본적 의문.", en: "Wound about existence itself. 'Am I allowed to exist?'" },
    healing: { ko: "스스로 행동하고 주도하면서 존재감을 확인하세요.", en: "Confirm your presence by acting and leading yourself." },
    gift: { ko: "다른 사람들의 자기 확신을 도울 수 있어요.", en: "You can help others' self-confidence." },
  },
  taurus: {
    wound: { ko: "자기 가치에 대한 상처. 충분하지 않다는 느낌.", en: "Wound about self-worth. Feeling never enough." },
    healing: { ko: "자신만의 가치를 정의하고, 물질적 안정을 만드세요.", en: "Define your own value and create material stability." },
    gift: { ko: "다른 사람들의 자기 가치 발견을 도울 수 있어요.", en: "You can help others discover their worth." },
  },
  gemini: {
    wound: { ko: "소통과 이해에 대한 상처. '아무도 나를 이해 못해'.", en: "Wound about communication. 'No one understands me.'" },
    healing: { ko: "다양한 방식으로 표현하고, 먼저 다른 사람을 이해하세요.", en: "Express in various ways and understand others first." },
    gift: { ko: "복잡한 것을 쉽게 설명하는 능력이 생겨요.", en: "You gain ability to explain complex things simply." },
  },
  cancer: {
    wound: { ko: "소속감에 대한 상처. 어디에도 속하지 못한다는 느낌.", en: "Wound about belonging. Feeling you don't fit anywhere." },
    healing: { ko: "자신만의 '가정'을 만들고, 자신을 먼저 양육하세요.", en: "Create your own 'home' and nurture yourself first." },
    gift: { ko: "다른 사람들에게 진정한 소속감을 줄 수 있어요.", en: "You can give others true sense of belonging." },
  },
  leo: {
    wound: { ko: "인정에 대한 상처. '내가 빛날 자격이 있나'라는 의심.", en: "Wound about recognition. 'Do I deserve to shine?'" },
    healing: { ko: "자신의 빛을 인정하고, 다른 사람도 빛나게 도우세요.", en: "Acknowledge your light and help others shine too." },
    gift: { ko: "다른 사람들의 재능을 발견해주는 능력이 생겨요.", en: "You gain ability to discover others' talents." },
  },
  virgo: {
    wound: { ko: "완벽함에 대한 상처. 결코 충분히 잘하지 못한다는 느낌.", en: "Wound about perfection. Never feeling good enough." },
    healing: { ko: "'충분히 좋다'를 받아들이고, 자신에게 관대해지세요.", en: "Accept 'good enough' and be generous with yourself." },
    gift: { ko: "다른 사람들이 완벽주의에서 벗어나도록 도울 수 있어요.", en: "You can help others escape perfectionism." },
  },
  libra: {
    wound: { ko: "관계에 대한 상처. 사랑받을 자격에 대한 의심.", en: "Wound about relationships. Doubting worthiness of love." },
    healing: { ko: "혼자서도 온전할 수 있음을 알고, 건강한 경계를 세우세요.", en: "Know you're complete alone and set healthy boundaries." },
    gift: { ko: "불균형한 관계에서 균형을 찾도록 도울 수 있어요.", en: "You can help find balance in unequal relationships." },
  },
  scorpio: {
    wound: { ko: "신뢰에 대한 상처. 깊은 배신감의 기억.", en: "Wound about trust. Deep memories of betrayal." },
    healing: { ko: "조금씩 다시 신뢰하는 법을 배우고, 취약해지는 연습을 하세요.", en: "Learn to trust again slowly and practice vulnerability." },
    gift: { ko: "깊은 치유와 변환을 도울 수 있는 힘이 생겨요.", en: "You gain power to help deep healing and transformation." },
  },
  sagittarius: {
    wound: { ko: "의미에 대한 상처. '삶의 목적이 뭐지'라는 방황.", en: "Wound about meaning. Wandering 'What is life's purpose?'" },
    healing: { ko: "찾는 것을 멈추고 창조하세요. 의미는 발견되는 게 아니라 만들어지는 거예요.", en: "Stop searching and create. Meaning is made, not found." },
    gift: { ko: "다른 사람들이 자신만의 의미를 찾도록 도울 수 있어요.", en: "You can help others find their own meaning." },
  },
  capricorn: {
    wound: { ko: "성취에 대한 상처. 아무리 해도 인정받지 못한다는 느낌.", en: "Wound about achievement. Never feeling recognized despite effort." },
    healing: { ko: "외부 인정에 의존하지 말고, 자신의 성취를 스스로 인정하세요.", en: "Don't depend on external recognition; acknowledge your own achievements." },
    gift: { ko: "다른 사람들의 잠재력과 성취를 알아봐 줄 수 있어요.", en: "You can recognize others' potential and achievements." },
  },
  aquarius: {
    wound: { ko: "소외에 대한 상처. 언제나 이방인 같은 느낌.", en: "Wound about alienation. Always feeling like an outsider." },
    healing: { ko: "'다름'이 당신의 선물임을 인정하세요. 당신만이 할 수 있는 일이 있어요.", en: "Accept 'difference' as your gift. There's something only you can do." },
    gift: { ko: "소외된 사람들이 자신을 받아들이도록 도울 수 있어요.", en: "You can help alienated people accept themselves." },
  },
  pisces: {
    wound: { ko: "연결에 대한 상처. 세상과 분리되어 있다는 고독감.", en: "Wound about connection. Feeling isolated from the world." },
    healing: { ko: "경계 없이 연결되려 하지 말고, 건강한 경계 안에서 연결하세요.", en: "Don't connect without boundaries; connect within healthy ones." },
    gift: { ko: "깊은 영적 치유와 연민을 줄 수 있어요.", en: "You can give deep spiritual healing and compassion." },
  },
};

// Saturn 하우스별 인생 수업
const saturnLifeLesson: Record<number, {
  lesson: { ko: string; en: string };
  timing: { ko: string; en: string };
  mastery: { ko: string; en: string };
}> = {
  1: {
    lesson: { ko: "자기 표현에 대한 두려움을 극복하고, 진정한 나로 당당히 서는 법", en: "Overcome fear of self-expression and stand confidently as your true self" },
    timing: { ko: "29세, 58세경 자아 정체성에 대한 큰 시험이 와요", en: "Major identity tests come around ages 29 and 58" },
    mastery: { ko: "나이 들수록 자기 자신에 대한 확신이 강해지고 존재감이 커져요", en: "Self-confidence and presence grow stronger with age" },
  },
  2: {
    lesson: { ko: "물질에 대한 불안을 극복하고, 자기 가치를 스스로 인정하는 법", en: "Overcome material anxiety and recognize your own worth" },
    timing: { ko: "29세, 58세경 재정적 위기나 가치관 시험이 와요", en: "Financial crises or value tests come around ages 29 and 58" },
    mastery: { ko: "나이 들수록 재정적으로 안정되고, 자기 가치에 확신이 생겨요", en: "Financial stability and self-worth confidence grow with age" },
  },
  3: {
    lesson: { ko: "소통에 대한 두려움을 극복하고, 자신의 목소리를 내는 법", en: "Overcome fear of communication and use your voice" },
    timing: { ko: "29세, 58세경 소통이나 학습에 관한 시험이 와요", en: "Communication or learning tests come around ages 29 and 58" },
    mastery: { ko: "나이 들수록 표현력이 풍부해지고 가르치는 능력이 생겨요", en: "Expression enriches and teaching ability develops with age" },
  },
  4: {
    lesson: { ko: "가족/가정에 대한 상처를 치유하고, 내면의 안정을 만드는 법", en: "Heal family wounds and create inner stability" },
    timing: { ko: "29세, 58세경 가정사나 뿌리에 관한 시험이 와요", en: "Family or roots tests come around ages 29 and 58" },
    mastery: { ko: "나이 들수록 내면이 안정되고, 진정한 '집'을 만들 수 있어요", en: "Inner stability and true 'home' creation develop with age" },
  },
  5: {
    lesson: { ko: "창의성과 자기 표현에 대한 두려움을 극복하는 법", en: "Overcome fear of creativity and self-expression" },
    timing: { ko: "29세, 58세경 창작이나 연애, 자녀에 관한 시험이 와요", en: "Creation, romance, or children tests come around ages 29 and 58" },
    mastery: { ko: "나이 들수록 창작 능력이 깊어지고, 진정한 자기 표현을 해요", en: "Creative ability deepens and true self-expression develops with age" },
  },
  6: {
    lesson: { ko: "일과 건강에 대한 완벽주의를 놓고, 균형을 찾는 법", en: "Let go of perfectionism about work and health; find balance" },
    timing: { ko: "29세, 58세경 건강이나 직업에 관한 시험이 와요", en: "Health or job tests come around ages 29 and 58" },
    mastery: { ko: "나이 들수록 효율적으로 일하고, 건강을 잘 관리해요", en: "Work efficiently and manage health well with age" },
  },
  7: {
    lesson: { ko: "관계에 대한 두려움을 극복하고, 진정한 파트너십을 배우는 법", en: "Overcome fear of relationships and learn true partnership" },
    timing: { ko: "29세, 58세경 결혼이나 파트너십에 관한 시험이 와요", en: "Marriage or partnership tests come around ages 29 and 58" },
    mastery: { ko: "나이 들수록 관계가 성숙해지고, 진정한 동반자를 만나요", en: "Relationships mature and true partners come with age" },
  },
  8: {
    lesson: { ko: "깊은 친밀감과 변화에 대한 두려움을 극복하는 법", en: "Overcome fear of deep intimacy and transformation" },
    timing: { ko: "29세, 58세경 죽음, 상속, 깊은 변화에 관한 시험이 와요", en: "Death, inheritance, or deep change tests come around ages 29 and 58" },
    mastery: { ko: "나이 들수록 변화를 두려워하지 않고, 깊은 연결을 해요", en: "Fear change less and make deep connections with age" },
  },
  9: {
    lesson: { ko: "신념과 철학에 대한 경직성을 풀고, 열린 마음을 배우는 법", en: "Release rigidity about beliefs and learn open-mindedness" },
    timing: { ko: "29세, 58세경 신념이나 해외/학업에 관한 시험이 와요", en: "Belief, abroad, or academic tests come around ages 29 and 58" },
    mastery: { ko: "나이 들수록 지혜가 깊어지고, 가르치는 역할을 해요", en: "Wisdom deepens and teaching roles come with age" },
  },
  10: {
    lesson: { ko: "성공과 실패에 대한 두려움을 극복하고, 진정한 성취를 배우는 법", en: "Overcome fear of success and failure; learn true achievement" },
    timing: { ko: "29세, 58세경 커리어에 관한 큰 시험이 와요", en: "Major career tests come around ages 29 and 58" },
    mastery: { ko: "나이 들수록 커리어가 탄탄해지고, 사회적 인정을 받아요", en: "Career solidifies and social recognition comes with age" },
  },
  11: {
    lesson: { ko: "집단에 대한 두려움을 극복하고, 진정한 소속감을 찾는 법", en: "Overcome fear of groups and find true belonging" },
    timing: { ko: "29세, 58세경 친구나 커뮤니티에 관한 시험이 와요", en: "Friend or community tests come around ages 29 and 58" },
    mastery: { ko: "나이 들수록 진정한 친구를 알아보고, 공동체에 기여해요", en: "Recognize true friends and contribute to community with age" },
  },
  12: {
    lesson: { ko: "무의식적 두려움을 직면하고, 영적 성장을 이루는 법", en: "Face unconscious fears and achieve spiritual growth" },
    timing: { ko: "29세, 58세경 무의식이나 영성에 관한 시험이 와요", en: "Unconscious or spirituality tests come around ages 29 and 58" },
    mastery: { ko: "나이 들수록 영적으로 성장하고, 치유 능력이 생겨요", en: "Spiritual growth and healing ability develop with age" },
  },
};

// Pluto 하우스별 변환 영역
const plutoTransformAreas: Record<number, {
  area: { ko: string; en: string };
  death: { ko: string; en: string };
  rebirth: { ko: string; en: string };
}> = {
  1: {
    area: { ko: "자아 정체성", en: "Self-identity" },
    death: { ko: "과거의 '나'를 죽이고", en: "Kill the old 'self'" },
    rebirth: { ko: "완전히 새로운 나로 다시 태어나요", en: "Reborn as completely new self" },
  },
  2: {
    area: { ko: "가치관과 소유물", en: "Values and possessions" },
    death: { ko: "물질에 대한 집착을 놓고", en: "Let go of material attachment" },
    rebirth: { ko: "진정한 가치를 발견해요", en: "Discover true value" },
  },
  3: {
    area: { ko: "소통과 사고방식", en: "Communication and thinking" },
    death: { ko: "피상적인 대화를 버리고", en: "Abandon superficial talk" },
    rebirth: { ko: "깊고 변화시키는 소통을 해요", en: "Communicate deeply and transformatively" },
  },
  4: {
    area: { ko: "가정과 뿌리", en: "Home and roots" },
    death: { ko: "가족 트라우마를 직면하고", en: "Face family trauma" },
    rebirth: { ko: "새로운 가정을 창조해요", en: "Create new family" },
  },
  5: {
    area: { ko: "창작과 연애", en: "Creation and romance" },
    death: { ko: "에고적 표현을 놓고", en: "Let go of ego-driven expression" },
    rebirth: { ko: "영혼에서 우러나는 창작을 해요", en: "Create from the soul" },
  },
  6: {
    area: { ko: "일과 건강", en: "Work and health" },
    death: { ko: "자기 파괴적 습관을 버리고", en: "Abandon self-destructive habits" },
    rebirth: { ko: "치유와 봉사의 일을 해요", en: "Do healing and service work" },
  },
  7: {
    area: { ko: "관계와 파트너십", en: "Relationships and partnership" },
    death: { ko: "병든 관계 패턴을 죽이고", en: "Kill unhealthy relationship patterns" },
    rebirth: { ko: "영혼 수준의 연결을 해요", en: "Connect at soul level" },
  },
  8: {
    area: { ko: "변환과 공유 자원", en: "Transformation and shared resources" },
    death: { ko: "통제에 대한 집착을 놓고", en: "Let go of control obsession" },
    rebirth: { ko: "진정한 변환의 힘을 얻어요", en: "Gain true power of transformation" },
  },
  9: {
    area: { ko: "신념과 철학", en: "Beliefs and philosophy" },
    death: { ko: "독단적 신념을 버리고", en: "Abandon dogmatic beliefs" },
    rebirth: { ko: "더 넓은 진리를 발견해요", en: "Discover broader truth" },
  },
  10: {
    area: { ko: "커리어와 공적 이미지", en: "Career and public image" },
    death: { ko: "권력에 대한 집착을 놓고", en: "Let go of power obsession" },
    rebirth: { ko: "진정한 리더십을 발휘해요", en: "Exercise true leadership" },
  },
  11: {
    area: { ko: "친구와 커뮤니티", en: "Friends and community" },
    death: { ko: "피상적 관계를 정리하고", en: "Organize superficial relationships" },
    rebirth: { ko: "영혼 가족을 찾아요", en: "Find soul family" },
  },
  12: {
    area: { ko: "무의식과 영성", en: "Unconscious and spirituality" },
    death: { ko: "무의식적 패턴을 직면하고", en: "Face unconscious patterns" },
    rebirth: { ko: "영적 각성을 해요", en: "Achieve spiritual awakening" },
  },
};

// 격국 이름 매핑
function getGeokgukType(geokName: string): GeokgukType | null {
  const n = geokName.toLowerCase();
  if (n.includes('정관')) return 'jeonggwan';
  if (n.includes('편관') || n.includes('칠살')) return 'pyeongwan';
  if (n.includes('정인')) return 'jeongin';
  if (n.includes('편인')) return 'pyeongin';
  if (n.includes('식신')) return 'siksin';
  if (n.includes('상관')) return 'sanggwan';
  if (n.includes('정재')) return 'jeongjae';
  if (n.includes('편재')) return 'pyeonjae';
  if (n.includes('건록')) return 'geonrok';
  if (n.includes('양인')) return 'yangin';
  if (n.includes('종아')) return 'jonga';
  if (n.includes('종재')) return 'jongjae';
  if (n.includes('종살')) return 'jongsal';
  if (n.includes('종강')) return 'jonggang';
  if (n.includes('곡직')) return 'gokjik';
  if (n.includes('염상')) return 'yeomsang';
  if (n.includes('가색')) return 'gasaek';
  if (n.includes('종혁')) return 'jonghyeok';
  if (n.includes('윤하')) return 'yunha';
  return null;
}

// 행성 찾기 헬퍼
function findPlanet(planets: unknown[], name: string): unknown {
  if (!Array.isArray(planets)) return null;
  return planets.find((p: unknown) => p.name?.toLowerCase()?.includes(name.toLowerCase()));
}

export function getKarmaAnalysis(
  saju: SajuData | undefined,
  astro: AstroData | undefined,
  lang: string
): KarmaAnalysisResult | null {
  if (!saju && !astro) return null;

  const isKo = lang === 'ko';
  const planets = astro?.planets || [];

  // 일간 추출
  const dayMaster = saju?.dayMaster?.name || saju?.dayMaster?.heavenlyStem || saju?.fourPillars?.day?.heavenlyStem || "";

  // 격국 추출
  const geokguk = saju?.advancedAnalysis?.geokguk;
  const geokName = geokguk?.name || geokguk?.type || "";
  const geokgukType = getGeokgukType(geokName);

  // North Node 하우스
  const northNode = findPlanet(planets, 'north node') || findPlanet(planets, 'northnode');
  const northNodeHouse = northNode?.house || null;

  // Chiron
  const chiron = findPlanet(planets, 'chiron');
  const chironSign = chiron?.sign?.toLowerCase() || null;

  // Saturn
  const saturn = findPlanet(planets, 'saturn');
  const saturnHouse = saturn?.house || null;

  // Pluto
  const pluto = findPlanet(planets, 'pluto');
  const plutoHouse = pluto?.house || null;

  // === 1. 영혼 유형 (격국 + 드라코닉 기반) ===
  let soulType: KarmaAnalysisResult['soulType'] = {
    title: isKo ? "탐험가 영혼" : "Explorer Soul",
    emoji: "🌟",
    description: isKo ? "다양한 경험을 통해 성장하는 영혼. 새로운 것을 배우고 도전하며 자신을 발견해가요." : "Soul growing through diverse experiences. Learn new things, take challenges, and discover yourself.",
    traits: isKo ? ["호기심", "적응력", "성장"] : ["Curiosity", "Adaptability", "Growth"],
  };

  if (geokgukType && geokgukToDraconicSoul[geokgukType]) {
    const draconic = geokgukToDraconicSoul[geokgukType];
    soulType = {
      title: isKo ? draconic.ko : draconic.en,
      emoji: draconic.emoji,
      description: isKo ? draconic.description.ko : draconic.description.en,
      traits: isKo ? draconic.traits.ko : draconic.traits.en,
      draconicSoul: isKo ? draconic.ko : draconic.en,
    };
  }

  // === 2. 성장 경로 (North Node) ===
  let growthPath: KarmaAnalysisResult['growthPath'] = {
    direction: isKo ? "자기 발견의 여정" : "Journey of self-discovery",
    pastPattern: isKo ? "전생의 패턴을 넘어서야 해요." : "You must transcend past life patterns.",
    lesson: isKo ? "성장은 불편함 속에서 일어나요." : "Growth happens in discomfort.",
    practicalAdvice: isKo ? ["새로운 것을 시도하세요"] : ["Try new things"],
  };

  if (northNodeHouse && nodeHouseGrowthPath[northNodeHouse]) {
    const path = nodeHouseGrowthPath[northNodeHouse];
    growthPath = {
      direction: isKo ? path.direction.ko : path.direction.en,
      pastPattern: isKo ? path.pastPattern.ko : path.pastPattern.en,
      lesson: isKo ? path.lesson.ko : path.lesson.en,
      practicalAdvice: isKo ? path.advice.ko : path.advice.en,
    };
  }

  // === 3. 치유해야 할 상처 (Chiron) ===
  let woundToHeal: KarmaAnalysisResult['woundToHeal'] = {
    wound: isKo ? "삶의 어떤 영역에서 상처가 있을 수 있어요." : "There may be wounds in some area of life.",
    healingPath: isKo ? "상처를 인정하면 치유가 시작돼요." : "Acknowledging wounds starts healing.",
    gift: isKo ? "치유한 상처가 당신의 선물이 돼요." : "Healed wounds become your gift.",
  };

  if (chironSign && chironHealingPath[chironSign]) {
    const healing = chironHealingPath[chironSign];
    woundToHeal = {
      wound: isKo ? healing.wound.ko : healing.wound.en,
      healingPath: isKo ? healing.healing.ko : healing.healing.en,
      gift: isKo ? healing.gift.ko : healing.gift.en,
    };
  }

  // === 4. 토성 레슨 ===
  let saturnLesson: KarmaAnalysisResult['saturnLesson'] = {
    lesson: isKo ? "인생의 중요한 교훈이 기다리고 있어요." : "Important life lessons await.",
    timing: isKo ? "29세, 58세 전후로 큰 시험이 와요." : "Major tests come around ages 29 and 58.",
    mastery: isKo ? "나이 들수록 더 강해져요." : "You grow stronger with age.",
  };

  if (saturnHouse && saturnLifeLesson[saturnHouse]) {
    const lesson = saturnLifeLesson[saturnHouse];
    saturnLesson = {
      lesson: isKo ? lesson.lesson.ko : lesson.lesson.en,
      timing: isKo ? lesson.timing.ko : lesson.timing.en,
      mastery: isKo ? lesson.mastery.ko : lesson.mastery.en,
    };
  }

  // === 5. 플루토 변환 ===
  let plutoTransform: KarmaAnalysisResult['plutoTransform'] | undefined;
  if (plutoHouse && plutoTransformAreas[plutoHouse]) {
    const transform = plutoTransformAreas[plutoHouse];
    plutoTransform = {
      area: isKo ? transform.area.ko : transform.area.en,
      death: isKo ? transform.death.ko : transform.death.en,
      rebirth: isKo ? transform.rebirth.ko : transform.rebirth.en,
    };
  }

  // === 6. 운명의 인연 ===
  const fatedConnections: KarmaAnalysisResult['fatedConnections'] = [];
  const sinsal = (saju?.advancedAnalysis?.sinsal) || {};
  const luckyList = sinsal?.luckyList || [];
  const unluckyList = sinsal?.unluckyList || [];
  const allSinsal = [...luckyList, ...unluckyList];

  const hasHongYeom = allSinsal.some((s: unknown) => (typeof s === 'string' ? s : s.name)?.includes('홍염'));
  const hasYeokMa = allSinsal.some((s: unknown) => (typeof s === 'string' ? s : s.name)?.includes('역마'));
  const hasGwiMun = allSinsal.some((s: unknown) => (typeof s === 'string' ? s : s.name)?.includes('귀문'));
  const hasDohwa = allSinsal.some((s: unknown) => (typeof s === 'string' ? s : s.name)?.includes('도화'));

  if (hasHongYeom || hasDohwa) {
    fatedConnections.push({
      type: isKo ? "🔥 운명적 연인" : "🔥 Fated Lover",
      description: isKo
        ? "강렬하고 열정적인 로맨틱 인연이 예정되어 있어요. 첫 만남부터 강한 끌림을 느낄 거예요."
        : "Intense romantic connections are destined. You'll feel strong attraction from first meeting.",
    });
  }
  if (hasYeokMa) {
    fatedConnections.push({
      type: isKo ? "✈️ 해외 인연" : "✈️ Overseas Connection",
      description: isKo
        ? "해외나 먼 곳에서 중요한 인연을 만나요. 여행이나 이주가 인연의 계기가 될 수 있어요."
        : "Important connections await in foreign lands. Travel or relocation may be the catalyst.",
    });
  }
  if (hasGwiMun) {
    fatedConnections.push({
      type: isKo ? "🔮 영적 스승" : "🔮 Spiritual Mentor",
      description: isKo
        ? "영적/지적으로 깊은 인연이 예정되어 있어요. 멘토나 스승을 만날 수 있어요."
        : "Deep spiritual/intellectual connections await. You may meet a mentor or teacher.",
    });
  }

  // === 7. 영혼의 사명 ===
  let soulMission: KarmaAnalysisResult['soulMission'] = {
    core: isKo ? "당신만의 빛으로 세상을 밝히세요." : "Light the world with your unique light.",
    expression: isKo ? "자신에게 충실하면 길이 열려요." : "Being true to yourself opens the path.",
    fulfillment: isKo ? "진정한 나로 살 때 가장 행복해요." : "Happiest when living as your true self.",
  };

  const dmKey = dayMaster.charAt(0);
  if (dmKey && dayMasterSoulMission[dmKey]) {
    const mission = dayMasterSoulMission[dmKey];
    soulMission = {
      core: isKo ? mission.ko : mission.en,
      expression: isKo ? mission.expression.ko : mission.expression.en,
      fulfillment: isKo ? mission.fulfillment.ko : mission.fulfillment.en,
    };
  }

  // === 8. 전생 테마 ===
  let pastLifeTheme: KarmaAnalysisResult['pastLifeTheme'] = {
    likely: isKo ? "다양한 경험을 한 영혼" : "Soul with diverse experiences",
    talents: isKo ? "전생에서 쌓은 재능이 있어요." : "You have talents from past lives.",
    lessons: isKo ? "과거의 패턴을 반복하지 마세요." : "Don't repeat past patterns.",
  };

  if (geokgukType) {
    const themes: Record<string, { likely: { ko: string; en: string }; talents: { ko: string; en: string }; lessons: { ko: string; en: string } }> = {
      siksin: {
        likely: { ko: "전생에서 예술가, 요리사, 작가였을 가능성이 높아요.", en: "Likely an artist, chef, or writer in past lives." },
        talents: { ko: "창작하고 표현하는 재능이 이미 익숙해요.", en: "Creative and expressive talents are already familiar." },
        lessons: { ko: "이번 생에서는 더 큰 무대로 나가세요.", en: "This life, step onto a bigger stage." },
      },
      sanggwan: {
        likely: { ko: "전생에서 연예인, 강사, 혁명가였을 가능성이 높아요.", en: "Likely an entertainer, lecturer, or revolutionary in past lives." },
        talents: { ko: "말과 표현으로 사람을 움직이는 재능이 있어요.", en: "You have talent to move people with words." },
        lessons: { ko: "이번 생에서는 그 힘을 건설적으로 쓰세요.", en: "This life, use that power constructively." },
      },
      jeonggwan: {
        likely: { ko: "전생에서 관료, 판사, 지도자였을 가능성이 높아요.", en: "Likely an official, judge, or leader in past lives." },
        talents: { ko: "조직하고 이끄는 능력이 이미 있어요.", en: "Organizational and leadership abilities exist already." },
        lessons: { ko: "이번 생에서는 더 인간적인 리더십을 배우세요.", en: "This life, learn more human leadership." },
      },
      pyeongwan: {
        likely: { ko: "전생에서 군인, 경찰, 격투가였을 가능성이 높아요.", en: "Likely a soldier, police, or fighter in past lives." },
        talents: { ko: "도전을 두려워하지 않는 용기가 있어요.", en: "You have courage that doesn't fear challenges." },
        lessons: { ko: "이번 생에서는 파괴보다 보호를 배우세요.", en: "This life, learn protection over destruction." },
      },
      jeongjae: {
        likely: { ko: "전생에서 상인, 은행가, 가정주부였을 가능성이 높아요.", en: "Likely a merchant, banker, or homemaker in past lives." },
        talents: { ko: "안정적으로 재물을 쌓는 능력이 있어요.", en: "You have ability to build wealth steadily." },
        lessons: { ko: "이번 생에서는 물질 너머의 가치를 탐구하세요.", en: "This life, explore values beyond material." },
      },
      pyeonjae: {
        likely: { ko: "전생에서 무역상, 투자가, 모험가였을 가능성이 높아요.", en: "Likely a trader, investor, or adventurer in past lives." },
        talents: { ko: "기회를 포착하고 활용하는 능력이 있어요.", en: "You have ability to spot and use opportunities." },
        lessons: { ko: "이번 생에서는 안정과 도전의 균형을 찾으세요.", en: "This life, find balance between stability and risk." },
      },
      jeongin: {
        likely: { ko: "전생에서 학자, 수도승, 선생님이었을 가능성이 높아요.", en: "Likely a scholar, monk, or teacher in past lives." },
        talents: { ko: "배우고 가르치는 능력이 이미 있어요.", en: "Learning and teaching abilities exist already." },
        lessons: { ko: "이번 생에서는 지식을 더 넓게 나누세요.", en: "This life, share knowledge more widely." },
      },
      pyeongin: {
        likely: { ko: "전생에서 무당, 점술가, 연구자였을 가능성이 높아요.", en: "Likely a shaman, diviner, or researcher in past lives." },
        talents: { ko: "직관과 통찰력이 이미 발달해 있어요.", en: "Intuition and insight are already developed." },
        lessons: { ko: "이번 생에서는 고립되지 말고 사람들과 연결하세요.", en: "This life, connect with people instead of isolating." },
      },
    };

    if (themes[geokgukType]) {
      const theme = themes[geokgukType];
      pastLifeTheme = {
        likely: isKo ? theme.likely.ko : theme.likely.en,
        talents: isKo ? theme.talents.ko : theme.talents.en,
        lessons: isKo ? theme.lessons.ko : theme.lessons.en,
      };
    }
  }

  // === 카르마 인사이트 깊이 점수 계산 (개선된 버전) ===
  // 이 점수는 "얼마나 깊이 있는 카르마 분석을 할 수 있는가"를 나타냄
  // 점수 구성:
  // - 기본: 65 (기본적인 영혼 분석 가능)
  // - 점성학 데이터 (최대 +20):
  //   - North Node 하우스: +8 (성장 방향 분석)
  //   - Chiron 별자리: +6 (상처 치유 분석)
  //   - Saturn 하우스: +4 (인생 수업 분석)
  //   - Pluto 하우스: +2 (변환 영역 분석)
  // - 사주 데이터 (최대 +10):
  //   - 격국 타입: +5 (영혼 유형 정교화)
  //   - 일간: +3 (영혼 사명 분석)
  //   - 신살: +2 (운명적 인연)
  // - 조합 보너스 (최대 +5):
  //   - 점성 + 사주 모두 풍부: +5

  let karmaScore = 65;

  // 점성학 데이터
  if (northNodeHouse) karmaScore += 8;
  if (chironSign) karmaScore += 6;
  if (saturnHouse) karmaScore += 4;
  if (plutoHouse) karmaScore += 2;

  // 사주 데이터
  if (geokgukType) karmaScore += 5;
  if (dayMaster) karmaScore += 3;
  if (fatedConnections.length > 0) karmaScore += 2;

  // 조합 보너스
  const hasRichAstro = northNodeHouse && chironSign && saturnHouse;
  const hasRichSaju = geokgukType && dayMaster;
  if (hasRichAstro && hasRichSaju) karmaScore += 5;

  // === 9. 영혼 여정 타임라인 ===
  let soulJourney: KarmaAnalysisResult['soulJourney'];
  if (geokgukType || northNodeHouse) {
    const pastLifeMap: Record<string, { ko: string; en: string }> = {
      siksin: { ko: "창작과 표현의 삶을 살았어요", en: "Lived a life of creation and expression" },
      sanggwan: { ko: "무대와 영향력의 삶을 살았어요", en: "Lived a life of stage and influence" },
      jeonggwan: { ko: "질서와 통제의 삶을 살았어요", en: "Lived a life of order and control" },
      pyeongwan: { ko: "도전과 극복의 삶을 살았어요", en: "Lived a life of challenge and overcoming" },
      jeongjae: { ko: "안정과 축적의 삶을 살았어요", en: "Lived a life of stability and accumulation" },
      pyeonjae: { ko: "모험과 확장의 삶을 살았어요", en: "Lived a life of adventure and expansion" },
      jeongin: { ko: "학습과 보호의 삶을 살았어요", en: "Lived a life of learning and protection" },
      pyeongin: { ko: "직관과 영성의 삶을 살았어요", en: "Lived a life of intuition and spirituality" },
    };

    const currentLifeMap: Record<number, { ko: string; en: string }> = {
      1: { ko: "자아를 발견하고 정체성을 확립하는 여정", en: "Journey to discover self and establish identity" },
      2: { ko: "가치와 재능을 개발하는 여정", en: "Journey to develop values and talents" },
      3: { ko: "소통과 학습의 여정", en: "Journey of communication and learning" },
      4: { ko: "뿌리와 안정을 찾는 여정", en: "Journey to find roots and stability" },
      5: { ko: "창조와 자기표현의 여정", en: "Journey of creation and self-expression" },
      6: { ko: "봉사와 완성의 여정", en: "Journey of service and perfection" },
      7: { ko: "관계와 균형의 여정", en: "Journey of relationships and balance" },
      8: { ko: "변화와 재탄생의 여정", en: "Journey of transformation and rebirth" },
      9: { ko: "확장과 지혜의 여정", en: "Journey of expansion and wisdom" },
      10: { ko: "성취와 사명의 여정", en: "Journey of achievement and mission" },
      11: { ko: "공동체와 비전의 여정", en: "Journey of community and vision" },
      12: { ko: "영성과 초월의 여정", en: "Journey of spirituality and transcendence" },
    };

    const pastLife = geokgukType && pastLifeMap[geokgukType]
      ? (isKo ? pastLifeMap[geokgukType].ko : pastLifeMap[geokgukType].en)
      : (isKo ? "다양한 경험을 쌓은 전생" : "Past life with diverse experiences");

    const currentLife = northNodeHouse && currentLifeMap[northNodeHouse]
      ? (isKo ? currentLifeMap[northNodeHouse].ko : currentLifeMap[northNodeHouse].en)
      : (isKo ? "자아 성장의 여정 중" : "On a journey of self-growth");

    const futurePotential = isKo
      ? `${soulMission.expression}을 통해 영혼의 완성에 다가가요`
      : `Moving towards soul completion through ${soulMission.expression}`;

    const keyTransition = saturnHouse
      ? (isKo
        ? `${saturnHouse}하우스 영역에서 중요한 전환점이 와요. 29-30세, 58-60세에 주의하세요.`
        : `Key transition in the ${saturnHouse}th house area. Pay attention at ages 29-30 and 58-60.`)
      : (isKo ? "인생의 전환점에서 더 성숙해져요." : "You mature through life's turning points.");

    soulJourney = { pastLife, currentLife, futurePotential, keyTransition };
  }

  // === 10. 카르마 해제 힌트 ===
  let karmaRelease: KarmaAnalysisResult['karmaRelease'];
  if (chironSign || plutoHouse) {
    const blockageMap: Record<string, { ko: string; en: string }> = {
      aries: { ko: "자신감 부족, 주도권에 대한 두려움", en: "Lack of confidence, fear of taking initiative" },
      taurus: { ko: "물질적 불안, 변화에 대한 저항", en: "Material insecurity, resistance to change" },
      gemini: { ko: "소통의 어려움, 산만함", en: "Communication difficulties, scattered focus" },
      cancer: { ko: "감정 억압, 안전 집착", en: "Emotional suppression, safety obsession" },
      leo: { ko: "인정 욕구, 자존심 상처", en: "Need for recognition, wounded pride" },
      virgo: { ko: "완벽주의, 자기 비판", en: "Perfectionism, self-criticism" },
      libra: { ko: "결정 어려움, 관계 의존", en: "Difficulty deciding, relationship dependency" },
      scorpio: { ko: "통제 욕구, 신뢰 문제", en: "Control needs, trust issues" },
      sagittarius: { ko: "방향 상실, 과도한 낙관", en: "Loss of direction, excessive optimism" },
      capricorn: { ko: "성공 강박, 감정 억제", en: "Success obsession, emotional suppression" },
      aquarius: { ko: "소외감, 친밀감 회피", en: "Alienation, intimacy avoidance" },
      pisces: { ko: "경계 부족, 현실 도피", en: "Lack of boundaries, escapism" },
    };

    const blockage = chironSign && blockageMap[chironSign]
      ? (isKo ? blockageMap[chironSign].ko : blockageMap[chironSign].en)
      : (isKo ? "과거의 상처가 현재를 막고 있어요" : "Past wounds are blocking the present");

    const healing = woundToHeal.healingPath;

    const breakthrough = plutoHouse
      ? (isKo
        ? `${plutoHouse}하우스 영역에서 완전한 변화를 경험하면 자유로워져요.`
        : `Complete transformation in the ${plutoHouse}th house area brings freedom.`)
      : (isKo ? "두려움을 직면하면 해방이 와요." : "Facing fears brings liberation.");

    karmaRelease = { blockage, healing, breakthrough };
  }

  return {
    soulType,
    growthPath,
    woundToHeal,
    saturnLesson,
    plutoTransform,
    fatedConnections,
    soulMission,
    pastLifeTheme,
    karmaScore: Math.min(100, Math.max(65, karmaScore)),
    soulJourney,
    karmaRelease,
  };
}
