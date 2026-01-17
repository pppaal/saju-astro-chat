/**
 * @file Card-specific questions for TarotChat (Major Arcana, Minor Arcana, Suits, Court Cards)
 */

import type { LangKey } from './tarot-chat-i18n';

// Questions specific to each Major Arcana card
export const CARD_SPECIFIC_QUESTIONS: Record<string, Record<LangKey, string[]>> = {
  "The Fool": {
    ko: ["새로운 시작에서 주의해야 할 점은?", "광대 카드가 말하는 모험의 방향은?"],
    en: ["What should I watch for in this new beginning?", "What adventure does The Fool suggest?"]
  },
  "The Magician": {
    ko: ["마법사 카드가 가리키는 내 숨겨진 능력은?", "지금 나의 의지력을 어디에 집중해야 할까요?"],
    en: ["What hidden ability does The Magician reveal?", "Where should I focus my willpower now?"]
  },
  "The High Priestess": {
    ko: ["여사제 카드가 말하는 숨겨진 진실은?", "내 직관이 알려주는 것은 무엇인가요?"],
    en: ["What hidden truth does The High Priestess reveal?", "What is my intuition telling me?"]
  },
  "The Empress": {
    ko: ["여제 카드가 보여주는 풍요의 영역은?", "창조성을 어떻게 발휘해야 할까요?"],
    en: ["What area of abundance does The Empress show?", "How should I express my creativity?"]
  },
  "The Emperor": {
    ko: ["황제 카드가 가리키는 리더십 기회는?", "어떤 구조와 질서가 필요한가요?"],
    en: ["What leadership opportunity does The Emperor point to?", "What structure is needed?"]
  },
  "The Hierophant": {
    ko: ["전통에서 배워야 할 교훈은?", "어떤 지혜나 가르침을 찾아야 할까요?"],
    en: ["What lesson should I learn from tradition?", "What wisdom should I seek?"]
  },
  "The Lovers": {
    ko: ["연인 카드가 보여주는 핵심 선택은?", "이 관계에서 조화를 이루려면?"],
    en: ["What key choice does The Lovers show?", "How can I find harmony in this relationship?"]
  },
  "The Chariot": {
    ko: ["전차 카드가 가리키는 승리의 방향은?", "어떤 장애물을 극복해야 하나요?"],
    en: ["What direction of victory does The Chariot point to?", "What obstacles must I overcome?"]
  },
  "Strength": {
    ko: ["힘 카드가 요구하는 내면의 힘은?", "어떤 상황에서 인내가 필요한가요?"],
    en: ["What inner strength does this card require?", "Where do I need patience?"]
  },
  "The Hermit": {
    ko: ["은둔자 카드가 말하는 내면 성찰의 방향은?", "혼자 시간이 필요한 이유는?"],
    en: ["What inner reflection does The Hermit suggest?", "Why do I need solitude?"]
  },
  "Wheel of Fortune": {
    ko: ["운명의 수레바퀴가 암시하는 변화는?", "이 사이클에서 내 위치는?"],
    en: ["What change does the Wheel of Fortune hint at?", "Where am I in this cycle?"]
  },
  "Justice": {
    ko: ["정의 카드가 가리키는 균형이 필요한 영역은?", "카르마적으로 해결해야 할 것은?"],
    en: ["What area needs balance according to Justice?", "What karma needs resolution?"]
  },
  "The Hanged Man": {
    ko: ["매달린 사람 카드가 요구하는 희생은?", "새로운 관점이 필요한 이유는?"],
    en: ["What sacrifice does The Hanged Man require?", "Why do I need a new perspective?"]
  },
  "Death": {
    ko: ["죽음 카드가 암시하는 변환은 무엇인가요?", "무엇을 끝내고 새로 시작해야 할까요?"],
    en: ["What transformation does Death suggest?", "What ending brings new beginnings?"]
  },
  "Temperance": {
    ko: ["절제 카드가 요구하는 조화의 영역은?", "어디에서 균형을 찾아야 할까요?"],
    en: ["What harmony does Temperance require?", "Where should I find balance?"]
  },
  "The Devil": {
    ko: ["악마 카드가 경고하는 속박은?", "어떤 유혹이나 집착을 놓아야 할까요?"],
    en: ["What bondage does The Devil warn about?", "What temptation should I release?"]
  },
  "The Tower": {
    ko: ["탑 카드가 암시하는 붕괴와 재건은?", "이 충격 후 어떻게 회복할까요?"],
    en: ["What collapse and rebuilding does The Tower show?", "How can I recover after this shock?"]
  },
  "The Star": {
    ko: ["별 카드가 주는 희망의 메시지는?", "치유와 회복의 방향은 어디인가요?"],
    en: ["What hope does The Star bring?", "What is the direction of healing?"]
  },
  "The Moon": {
    ko: ["달 카드가 경고하는 착각이나 환상은?", "무의식에서 드러나는 것은 무엇인가요?"],
    en: ["What illusions does The Moon warn about?", "What emerges from my subconscious?"]
  },
  "The Sun": {
    ko: ["태양 카드가 밝히는 기쁨의 원천은?", "성공과 행복이 오는 시기는?"],
    en: ["What source of joy does The Sun reveal?", "When will success and happiness come?"]
  },
  "Judgement": {
    ko: ["심판 카드가 요구하는 각성은?", "어떤 과거를 정리해야 할까요?"],
    en: ["What awakening does Judgement require?", "What past should I reconcile?"]
  },
  "The World": {
    ko: ["세계 카드가 보여주는 완성의 단계는?", "다음 사이클의 시작은 무엇인가요?"],
    en: ["What completion does The World show?", "What is the next cycle beginning?"]
  }
};

// Questions when a card is reversed
export const REVERSED_QUESTIONS: Record<LangKey, (cardName: string) => string[]> = {
  ko: (cardName: string) => [
    `${cardName} 역방향이 보여주는 막힌 에너지는?`,
    `${cardName} 역방향을 정방향으로 바꾸려면 어떻게 해야 할까요?`,
    `역방향 ${cardName}이(가) 경고하는 내면의 문제는?`
  ],
  en: (cardName: string) => [
    `What blocked energy does reversed ${cardName} show?`,
    `How can I turn reversed ${cardName} upright?`,
    `What inner issue does reversed ${cardName} warn about?`
  ]
};

// Questions for powerful card combinations
export const COMBINATION_QUESTIONS: Record<string, Record<LangKey, string[]>> = {
  "The Lovers+Death": {
    ko: ["이 조합이 암시하는 관계의 변환은?", "사랑에서 무엇이 끝나고 시작되나요?"],
    en: ["What relationship transformation does this show?", "What ends and begins in love?"]
  },
  "The Tower+The Star": {
    ko: ["파괴 후의 희망은 어디서 찾을 수 있나요?", "이 위기가 가져올 치유는?"],
    en: ["Where can I find hope after destruction?", "What healing will this crisis bring?"]
  },
  "Death+The Fool": {
    ko: ["끝과 시작이 만나는 이 전환점의 의미는?", "새로운 모험을 시작할 준비가 됐나요?"],
    en: ["What does this meeting of endings and beginnings mean?", "Am I ready for a new adventure?"]
  },
  "The Emperor+The Empress": {
    ko: ["남성성과 여성성의 균형을 어떻게 맞출까요?", "이 강력한 창조 에너지를 어디에 쓸까요?"],
    en: ["How can I balance masculine and feminine energy?", "Where should I use this creative power?"]
  },
  "The Moon+The Sun": {
    ko: ["무의식과 의식의 통합이 필요한 영역은?", "어둠과 빛 사이에서 배울 것은?"],
    en: ["Where do I need to integrate conscious and unconscious?", "What to learn between darkness and light?"]
  },
  "The High Priestess+The Magician": {
    ko: ["직관과 의지를 어떻게 조화시킬까요?", "내면의 지혜를 현실에서 어떻게 발현할까요?"],
    en: ["How can I harmonize intuition and will?", "How to manifest inner wisdom in reality?"]
  },
  "Wheel of Fortune+The World": {
    ko: ["이 사이클의 완성 후 다음은 무엇인가요?", "운명적 완성이 다가오고 있나요?"],
    en: ["What comes after this cycle completes?", "Is destined completion approaching?"]
  },
  "The Devil+Strength": {
    ko: ["유혹을 극복할 내면의 힘이 있나요?", "속박에서 벗어나려면 어떤 용기가 필요할까요?"],
    en: ["Do I have inner strength to overcome temptation?", "What courage do I need to break free?"]
  },
  "Judgement+The Hanged Man": {
    ko: ["깨달음을 위해 무엇을 포기해야 하나요?", "새로운 관점이 가져올 각성은?"],
    en: ["What must I sacrifice for awakening?", "What awakening will a new perspective bring?"]
  },
  "The Chariot+The Hermit": {
    ko: ["행동과 성찰 사이에서 균형을 어떻게 찾을까요?", "내면의 나침반을 따라 어디로 가야 할까요?"],
    en: ["How to balance action and reflection?", "Where should my inner compass lead me?"]
  },
  "The Fool+The World": {
    ko: ["완성에서 새 시작으로의 전환, 이 여정의 의미는?", "한 사이클이 끝나고 무엇이 시작되나요?"],
    en: ["What does this transition from completion to new beginning mean?", "What starts as one cycle ends?"]
  },
  "The High Priestess+The Moon": {
    ko: ["무의식의 깊은 메시지는 무엇인가요?", "직관이 경고하는 숨겨진 진실은?"],
    en: ["What is the deep message from my subconscious?", "What hidden truth is my intuition warning about?"]
  },
  "Death+The Tower": {
    ko: ["이 강력한 변화의 조합이 암시하는 것은?", "모든 것이 무너진 후 무엇을 세워야 할까요?"],
    en: ["What does this powerful transformation combination mean?", "What should I build after everything falls?"]
  },
  "The Empress+The Star": {
    ko: ["창조와 치유의 에너지를 어떻게 결합할까요?", "풍요로운 회복의 방향은?"],
    en: ["How can I combine creative and healing energy?", "What is the direction of abundant recovery?"]
  },
  "Justice+Judgement": {
    ko: ["카르마적 청산의 시간이 왔나요?", "과거의 행동에 대한 결산은?"],
    en: ["Has the time for karmic settlement come?", "What is the reckoning for past actions?"]
  },
  "The Magician+The World": {
    ko: ["내 의지로 완성할 수 있는 것은?", "모든 도구가 갖춰진 지금, 무엇을 창조할까요?"],
    en: ["What can I complete through my will?", "With all tools ready, what should I create?"]
  },
  "Temperance+The Star": {
    ko: ["치유와 균형의 조합이 가리키는 방향은?", "내면의 평화를 찾는 최선의 방법은?"],
    en: ["What direction does this healing and balance combination point to?", "Best way to find inner peace?"]
  },
  "The Devil+The Tower": {
    ko: ["속박에서 벗어나는 충격적인 사건이 올까요?", "강제적인 해방의 의미는?"],
    en: ["Will a shocking event free me from bondage?", "What does forced liberation mean?"]
  },
  "The Hermit+The High Priestess": {
    ko: ["내면의 지혜를 찾기 위한 최선의 방법은?", "고독 속에서 발견할 진실은?"],
    en: ["Best way to find inner wisdom?", "What truth will I find in solitude?"]
  },
  "Strength+The Chariot": {
    ko: ["내면의 힘과 외부의 승리를 어떻게 연결할까요?", "부드러운 힘으로 얻을 승리는?"],
    en: ["How can I connect inner strength with outer victory?", "What victory comes through gentle strength?"]
  }
};

// === SUIT-BASED QUESTIONS (Minor Arcana) ===
export const SUIT_QUESTIONS: Record<string, Record<LangKey, string[]>> = {
  "Wands": {
    ko: [
      "불의 에너지가 가리키는 열정과 행동의 방향은?",
      "창의성과 영감을 어디에 쏟아야 할까요?",
      "이 막대 카드가 보여주는 새로운 기회는?",
      "당신의 의지와 야망을 어떻게 발휘해야 하나요?"
    ],
    en: [
      "What direction of passion and action does fire energy point to?",
      "Where should I pour my creativity and inspiration?",
      "What new opportunity does this Wands card show?",
      "How should I express my will and ambition?"
    ]
  },
  "Cups": {
    ko: [
      "물의 에너지가 전하는 감정의 메시지는?",
      "관계와 사랑에서 주의해야 할 것은?",
      "이 컵 카드가 암시하는 감정적 치유는?",
      "직관과 꿈이 알려주는 것은 무엇인가요?"
    ],
    en: [
      "What emotional message does water energy convey?",
      "What should I watch in relationships and love?",
      "What emotional healing does this Cups card suggest?",
      "What are intuition and dreams telling me?"
    ]
  },
  "Swords": {
    ko: [
      "공기의 에너지가 요구하는 명확한 사고는?",
      "어떤 진실을 직면해야 하나요?",
      "이 검 카드가 경고하는 갈등이나 결정은?",
      "소통과 지성을 어떻게 활용해야 할까요?"
    ],
    en: [
      "What clear thinking does air energy require?",
      "What truth must I face?",
      "What conflict or decision does this Swords card warn about?",
      "How should I use communication and intellect?"
    ]
  },
  "Pentacles": {
    ko: [
      "땅의 에너지가 가리키는 물질적 방향은?",
      "재정과 건강에서 집중해야 할 것은?",
      "이 펜타클 카드가 보여주는 성장의 기회는?",
      "실용적이고 현실적인 조언은 무엇인가요?"
    ],
    en: [
      "What material direction does earth energy point to?",
      "What should I focus on in finances and health?",
      "What growth opportunity does this Pentacles card show?",
      "What is the practical and realistic advice?"
    ]
  }
};

// === COURT CARD QUESTIONS ===
export const COURT_CARD_QUESTIONS: Record<string, Record<LangKey, string[]>> = {
  "Page": {
    ko: [
      "이 페이지가 전하는 새로운 소식이나 기회는?",
      "배움과 호기심을 어디에 적용해야 할까요?",
      "젊은 에너지나 새로운 시작을 암시하나요?"
    ],
    en: [
      "What new message or opportunity does this Page bring?",
      "Where should I apply learning and curiosity?",
      "Does this suggest young energy or new beginnings?"
    ]
  },
  "Knight": {
    ko: [
      "이 기사가 추구하는 행동의 방향은?",
      "빠른 변화나 움직임이 필요한 영역은?",
      "열정과 추진력을 어떻게 조절해야 할까요?"
    ],
    en: [
      "What direction of action does this Knight pursue?",
      "What area needs quick change or movement?",
      "How should I control passion and drive?"
    ]
  },
  "Queen": {
    ko: [
      "이 여왕이 체현하는 성숙한 에너지는?",
      "내면의 여왕 에너지를 어떻게 발휘할까요?",
      "양육과 보살핌이 필요한 곳은?"
    ],
    en: [
      "What mature energy does this Queen embody?",
      "How should I express my inner Queen energy?",
      "Where is nurturing and care needed?"
    ]
  },
  "King": {
    ko: [
      "이 왕이 보여주는 리더십과 권위는?",
      "숙달된 에너지를 어떻게 활용해야 하나요?",
      "책임감과 결단력이 필요한 상황은?"
    ],
    en: [
      "What leadership and authority does this King show?",
      "How should I use mastered energy?",
      "What situation needs responsibility and decisiveness?"
    ]
  }
};

// === SPECIFIC MINOR ARCANA QUESTIONS (핵심 56장) ===
export const MINOR_ARCANA_QUESTIONS: Record<string, Record<LangKey, string[]>> = {
  // Aces - Pure Potential
  "Ace of Wands": {
    ko: ["새로운 열정의 불꽃이 어디서 타오르나요?", "이 창조적 영감을 어떻게 행동으로 옮길까요?"],
    en: ["Where is the new flame of passion igniting?", "How can I turn this creative spark into action?"]
  },
  "Ace of Cups": {
    ko: ["새로운 사랑이나 감정적 시작이 다가오나요?", "이 감정의 컵을 누구와 나눌까요?"],
    en: ["Is new love or emotional beginning approaching?", "With whom should I share this cup of emotion?"]
  },
  "Ace of Swords": {
    ko: ["어떤 진실이 명확하게 드러나고 있나요?", "이 정신적 명료함으로 무엇을 결단할까요?"],
    en: ["What truth is becoming crystal clear?", "What should I decide with this mental clarity?"]
  },
  "Ace of Pentacles": {
    ko: ["새로운 물질적 기회가 어디서 열리나요?", "이 씨앗을 어떻게 키워야 할까요?"],
    en: ["Where is the new material opportunity opening?", "How should I nurture this seed?"]
  },
  // Twos - Duality & Choice
  "Two of Wands": {
    ko: ["두 가지 야망 중 어디에 집중해야 할까요?", "세상을 향한 당신의 비전은 무엇인가요?"],
    en: ["Which of two ambitions should I focus on?", "What is your vision for the world?"]
  },
  "Two of Cups": {
    ko: ["이 파트너십이 진정한 연결인가요?", "감정적 균형을 어떻게 맞출까요?"],
    en: ["Is this partnership a true connection?", "How can I balance emotions?"]
  },
  "Two of Swords": {
    ko: ["이 결정을 피하고 있는 이유는?", "눈을 감고도 알 수 있는 진실은?"],
    en: ["Why am I avoiding this decision?", "What truth can I see with eyes closed?"]
  },
  "Two of Pentacles": {
    ko: ["무엇과 무엇 사이에서 저글링하고 있나요?", "재정적 균형을 찾는 방법은?"],
    en: ["What am I juggling between?", "How to find financial balance?"]
  },
  // Threes - Growth & Collaboration
  "Three of Wands": {
    ko: ["확장의 기회가 어디서 오고 있나요?", "먼 곳에서 오는 좋은 소식은?"],
    en: ["Where is the expansion opportunity coming from?", "What good news comes from afar?"]
  },
  "Three of Cups": {
    ko: ["누구와 함께 축하해야 할까요?", "우정에서 어떤 기쁨을 찾을 수 있나요?"],
    en: ["Who should I celebrate with?", "What joy can I find in friendship?"]
  },
  "Three of Swords": {
    ko: ["이 상처의 근원은 무엇인가요?", "마음의 치유를 위해 무엇이 필요한가요?"],
    en: ["What is the source of this heartache?", "What is needed to heal my heart?"]
  },
  "Three of Pentacles": {
    ko: ["협력에서 어떤 성과를 기대할 수 있나요?", "팀워크를 어떻게 강화할까요?"],
    en: ["What results can I expect from collaboration?", "How to strengthen teamwork?"]
  },
  // Fives - Challenge & Conflict
  "Five of Wands": {
    ko: ["이 경쟁에서 무엇을 배울 수 있나요?", "갈등을 건설적으로 바꾸는 방법은?"],
    en: ["What can I learn from this competition?", "How to turn conflict constructive?"]
  },
  "Five of Cups": {
    ko: ["잃어버린 것에 집중하느라 놓치고 있는 것은?", "슬픔을 딛고 일어설 때인가요?"],
    en: ["What am I missing while focusing on loss?", "Is it time to rise from grief?"]
  },
  "Five of Swords": {
    ko: ["이 승리가 정말 가치 있는 것인가요?", "갈등 후 관계를 회복할 수 있나요?"],
    en: ["Is this victory really worth it?", "Can relationships be restored after conflict?"]
  },
  "Five of Pentacles": {
    ko: ["도움을 요청할 때인가요?", "부족함 속에서도 찾을 수 있는 희망은?"],
    en: ["Is it time to ask for help?", "What hope can be found in scarcity?"]
  },
  // Sixes - Harmony & Healing
  "Six of Wands": {
    ko: ["어떤 승리를 인정받을 준비가 됐나요?", "성공을 어떻게 공유할까요?"],
    en: ["What victory am I ready to be recognized for?", "How should I share success?"]
  },
  "Six of Cups": {
    ko: ["과거에서 무엇을 가져와야 할까요?", "순수한 기쁨을 어디서 찾을 수 있나요?"],
    en: ["What should I bring from the past?", "Where can I find innocent joy?"]
  },
  "Six of Swords": {
    ko: ["어려움에서 벗어나는 여정이 시작됐나요?", "더 평화로운 곳으로 가려면?"],
    en: ["Has the journey away from difficulty begun?", "How to reach more peaceful waters?"]
  },
  "Six of Pentacles": {
    ko: ["주는 것과 받는 것의 균형은?", "관대함을 어떻게 실천할까요?"],
    en: ["What is the balance of giving and receiving?", "How to practice generosity?"]
  },
  // Tens - Completion
  "Ten of Wands": {
    ko: ["내려놓아야 할 짐이 무엇인가요?", "이 책임을 나눌 수 있나요?"],
    en: ["What burden should I put down?", "Can I share this responsibility?"]
  },
  "Ten of Cups": {
    ko: ["감정적 완성이 가까워졌나요?", "가정의 행복을 어떻게 지킬까요?"],
    en: ["Is emotional fulfillment near?", "How to protect family happiness?"]
  },
  "Ten of Swords": {
    ko: ["이 끝이 새로운 시작의 씨앗인가요?", "최악을 지나 무엇이 기다리나요?"],
    en: ["Is this ending the seed of new beginning?", "What awaits after hitting bottom?"]
  },
  "Ten of Pentacles": {
    ko: ["물질적 유산과 전통의 의미는?", "장기적 안정을 어떻게 구축할까요?"],
    en: ["What do material legacy and tradition mean?", "How to build long-term stability?"]
  }
};

// === CROSS-ELEMENT COMBINATIONS (원소 간 상호작용) ===
export const ELEMENT_INTERACTION_QUESTIONS: Record<string, Record<LangKey, string[]>> = {
  "Fire+Water": {
    ko: ["열정과 감정이 충돌할 때 어떻게 균형을 맞출까요?", "불과 물의 에너지를 조화시키는 방법은?"],
    en: ["How to balance when passion and emotion clash?", "How to harmonize fire and water energy?"]
  },
  "Fire+Air": {
    ko: ["열정에 명확한 방향을 어떻게 더할까요?", "아이디어를 행동으로 빠르게 옮기려면?"],
    en: ["How to add clear direction to passion?", "How to quickly turn ideas into action?"]
  },
  "Fire+Earth": {
    ko: ["열정을 현실에서 실현하는 방법은?", "에너지를 지속 가능하게 만들려면?"],
    en: ["How to manifest passion in reality?", "How to make energy sustainable?"]
  },
  "Water+Air": {
    ko: ["감정과 이성 사이에서 균형을 찾으려면?", "마음과 머리 중 무엇을 따라야 할까요?"],
    en: ["How to find balance between emotion and reason?", "Should I follow heart or head?"]
  },
  "Water+Earth": {
    ko: ["감정적 안정을 물질적으로 어떻게 표현할까요?", "내면의 흐름을 현실로 가져오려면?"],
    en: ["How to express emotional stability materially?", "How to bring inner flow to reality?"]
  },
  "Air+Earth": {
    ko: ["아이디어를 구체적인 계획으로 만들려면?", "생각을 실용적인 결과로 바꾸는 방법은?"],
    en: ["How to turn ideas into concrete plans?", "How to convert thoughts to practical results?"]
  }
};

// === COURT CARD RELATIONSHIPS (궁정 카드 관계 역학) ===
export const COURT_RELATIONSHIP_QUESTIONS: Record<string, Record<LangKey, string[]>> = {
  "Page+Knight": {
    ko: ["배움에서 행동으로 넘어갈 준비가 됐나요?", "젊은 에너지가 어디로 달려가고 있나요?"],
    en: ["Ready to move from learning to action?", "Where is young energy rushing to?"]
  },
  "Page+Queen": {
    ko: ["새로운 것을 배우면서 성숙해지고 있나요?", "양육이 필요한 새로운 시작은?"],
    en: ["Am I maturing while learning new things?", "What new beginning needs nurturing?"]
  },
  "Page+King": {
    ko: ["초심자와 숙련자 사이의 관계는?", "멘토링의 기회가 있나요?"],
    en: ["What is the relationship between beginner and master?", "Is there a mentoring opportunity?"]
  },
  "Knight+Queen": {
    ko: ["행동과 보살핌 사이의 균형은?", "열정적 추구와 감정적 지혜를 어떻게 결합할까요?"],
    en: ["What is the balance between action and care?", "How to combine passionate pursuit with emotional wisdom?"]
  },
  "Knight+King": {
    ko: ["행동과 권위 사이에서 누가 이끌어야 하나요?", "젊은 열정과 성숙한 리더십의 조화는?"],
    en: ["Who should lead between action and authority?", "How to harmonize young passion with mature leadership?"]
  },
  "Queen+King": {
    ko: ["두 성숙한 에너지가 만나면 무엇이 탄생하나요?", "파트너십에서 각자의 역할은?"],
    en: ["What is born when two mature energies meet?", "What are the roles in this partnership?"]
  }
};
