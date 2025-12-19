"use client";

import React, { useState, useRef, useEffect } from "react";
import styles from "./TarotChat.module.css";
import { Spread, DrawnCard } from "@/lib/Tarot/tarot.types";

type LangKey = "ko" | "en";

const I18N: Record<LangKey, {
  placeholder: string;
  send: string;
  thinking: string;
  empty: string;
  error: string;
  suggestedQuestions: string;
}> = {
  ko: {
    placeholder: "카드에 대해 더 물어보세요...",
    send: "보내기",
    thinking: "카드의 메시지를 해석하고 있습니다...",
    empty: "카드에 대해 궁금한 점을 물어보세요. 예: '이 카드 조합이 연애에서 무슨 의미야?'",
    error: "오류가 발생했습니다. 다시 시도해 주세요.",
    suggestedQuestions: "추천 질문"
  },
  en: {
    placeholder: "Ask more about your cards...",
    send: "Send",
    thinking: "Interpreting the card's message...",
    empty: "Ask anything about your cards. E.g., 'What does this combination mean for my love life?'",
    error: "An error occurred. Please try again.",
    suggestedQuestions: "Suggested Questions"
  }
};

// Fun loading messages for better UX
const LOADING_MESSAGES: Record<LangKey, string[]> = {
  ko: [
    "타로 카드의 에너지를 읽고 있어요... 🔮",
    "별들의 메시지를 해독하는 중... ✨",
    "당신만을 위한 통찰을 준비하고 있어요... 🌙",
    "카드가 속삭이는 이야기를 듣고 있어요... 🃏",
    "우주의 지혜를 연결하는 중... 🌌",
    "직관의 안개 속을 헤쳐나가는 중... 💫",
    "신비로운 답을 찾고 있어요... 🔮",
    "운명의 실타래를 풀고 있어요... 🧵"
  ],
  en: [
    "Reading the energy of your cards... 🔮",
    "Decoding messages from the stars... ✨",
    "Preparing insights just for you... 🌙",
    "Listening to what the cards whisper... 🃏",
    "Connecting to cosmic wisdom... 🌌",
    "Navigating through the mist of intuition... 💫",
    "Searching for mystical answers... 🔮",
    "Unraveling the threads of fate... 🧵"
  ]
};

// Suggested questions based on spread (more specific than category)
const SPREAD_QUESTIONS: Record<string, Record<LangKey, string[]>> = {
  // === General Insight ===
  "quick-reading": {
    ko: [
      "이 한 장의 카드가 오늘 내게 전하는 핵심 메시지는?",
      "이 카드가 나타난 이유는 무엇인가요?",
      "이 카드의 에너지를 어떻게 활용해야 할까요?",
      "이 카드가 경고하는 것이 있나요?"
    ],
    en: [
      "What is the core message this single card is telling me today?",
      "Why did this card appear for me?",
      "How should I use this card's energy?",
      "Is this card warning me about something?"
    ]
  },
  "past-present-future": {
    ko: [
      "과거 카드가 현재에 미치는 영향은?",
      "현재 카드에서 내가 놓치고 있는 것은?",
      "미래 카드의 결과를 바꿀 수 있을까요?",
      "세 카드의 흐름에서 핵심 교훈은?",
      "과거의 어떤 패턴이 반복되고 있나요?"
    ],
    en: [
      "How is the past card affecting my present?",
      "What am I missing in the present card?",
      "Can I change the outcome of the future card?",
      "What is the key lesson from these three cards?",
      "What past pattern is repeating?"
    ]
  },
  "celtic-cross": {
    ko: [
      "교차 카드(도전)를 극복하는 방법은?",
      "잠재의식 카드가 말하는 숨겨진 욕구는?",
      "외부 영향 카드에서 누가 나에게 영향을 주고 있나요?",
      "희망과 두려움 카드의 균형을 어떻게 맞출까요?",
      "최종 결과를 더 좋게 만들려면?",
      "조언 카드를 구체적으로 어떻게 실천할까요?",
      "10장 전체를 관통하는 핵심 테마는?"
    ],
    en: [
      "How can I overcome the crossing card (challenge)?",
      "What hidden desire does the subconscious card reveal?",
      "Who is influencing me according to the external card?",
      "How can I balance the hopes and fears card?",
      "How can I improve the final outcome?",
      "How do I practically apply the advice card?",
      "What is the core theme running through all 10 cards?"
    ]
  },
  // === Love & Relationships ===
  "relationship-check-in": {
    ko: [
      "두 사람의 에너지 차이가 의미하는 것은?",
      "상대방이 나에게 숨기고 있는 것이 있나요?",
      "우리의 에너지를 맞추려면 어떻게 해야 할까요?",
      "이 관계에서 누가 더 주도권을 가지고 있나요?"
    ],
    en: [
      "What does the energy difference between us mean?",
      "Is my partner hiding something from me?",
      "How can we align our energies?",
      "Who has more power in this relationship?"
    ]
  },
  "relationship-cross": {
    ko: [
      "연결 카드가 보여주는 우리의 인연은?",
      "도전 카드의 갈등을 어떻게 해결할까요?",
      "결과 카드로 봤을 때 우리의 미래는?",
      "상대방의 카드에서 그의 진짜 마음은?",
      "이 관계를 더 깊게 만들려면?"
    ],
    en: [
      "What does the connection card show about our bond?",
      "How can we resolve the conflict in the challenge card?",
      "What is our future according to the outcome card?",
      "What is their true heart according to their card?",
      "How can we deepen this relationship?"
    ]
  },
  "finding-a-partner": {
    ko: [
      "내가 찾는 것과 실제로 필요한 것의 차이는?",
      "나를 막는 장애물을 어떻게 제거할까요?",
      "매력 카드의 조언을 구체적으로 어떻게 실천할까요?",
      "잠재적 파트너 카드가 말하는 그 사람의 특징은?",
      "언제쯤 인연을 만날 수 있을까요?"
    ],
    en: [
      "What's the difference between what I seek and what I need?",
      "How can I remove the blockage?",
      "How do I practically apply the attraction card's advice?",
      "What are the characteristics of my potential partner?",
      "When might I meet this person?"
    ]
  },
  // === Career & Work ===
  "quick-guidance": {
    ko: [
      "오늘 직장에서 가장 집중해야 할 것은?",
      "이 카드가 나의 커리어에서 경고하는 것은?",
      "상사/동료와의 관계에서 이 카드의 의미는?",
      "이 에너지를 업무에 어떻게 활용할까요?"
    ],
    en: [
      "What should I focus on at work today?",
      "What is this card warning about my career?",
      "What does this card mean for my relationship with boss/colleagues?",
      "How can I use this energy at work?"
    ]
  },
  "career-path": {
    ko: [
      "현재 역할 카드에서 내가 부족한 것은?",
      "다음 단계로 가려면 구체적으로 무엇을 해야 할까요?",
      "장기 잠재력 카드가 보여주는 최종 목표는?",
      "이직을 고려해야 할까요?",
      "6개월 안에 변화가 있을까요?"
    ],
    en: [
      "What am I lacking according to the current role card?",
      "What exactly should I do to reach the next step?",
      "What is the ultimate goal shown in the long-term card?",
      "Should I consider changing jobs?",
      "Will there be changes within 6 months?"
    ]
  },
  "work-life-balance": {
    ko: [
      "일 에너지와 삶 에너지의 불균형 원인은?",
      "갈등 카드가 말하는 핵심 문제는?",
      "조화로 가는 길 카드를 어떻게 실천할까요?",
      "이상적 상태에 도달하려면 얼마나 걸릴까요?",
      "번아웃을 피하려면 지금 당장 무엇을 해야 할까요?"
    ],
    en: [
      "What causes the imbalance between work and life energy?",
      "What is the core issue in the conflict card?",
      "How do I practice the path to harmony card?",
      "How long will it take to reach the ideal state?",
      "What should I do right now to avoid burnout?"
    ]
  },
  // === Money & Finance ===
  "financial-snapshot": {
    ko: [
      "현재 흐름 카드에서 돈이 새는 곳은?",
      "다음 단계 카드의 조언을 어떻게 실천할까요?",
      "예상치 못한 지출이 있을까요?",
      "투자를 해도 될 타이밍인가요?"
    ],
    en: [
      "Where is money leaking according to the current flow card?",
      "How do I follow the next step card's advice?",
      "Will there be unexpected expenses?",
      "Is this a good time to invest?"
    ]
  },
  "abundance-path": {
    ko: [
      "마인드셋 카드가 말하는 돈에 대한 나의 믿음은?",
      "기회 카드가 가리키는 구체적인 기회는?",
      "행동 카드를 이번 주 안에 어떻게 실천할까요?",
      "장기 전망이 긍정적인가요, 주의가 필요한가요?",
      "풍요를 막는 내 안의 장애물은?"
    ],
    en: [
      "What does the mindset card say about my beliefs about money?",
      "What specific opportunity does the opportunity card point to?",
      "How can I apply the action card this week?",
      "Is the long-term outlook positive or cautionary?",
      "What inner block is preventing my abundance?"
    ]
  },
  "career-money": {
    ko: [
      "커리어 방향과 돈 조언이 충돌하는 부분은?",
      "활용해야 할 기술 카드가 말하는 나의 강점은?",
      "방해물 카드를 어떻게 극복할까요?",
      "결과 카드로 봤을 때 올해 재정 상황은?",
      "연봉 협상이나 이직이 도움이 될까요?"
    ],
    en: [
      "Where do career direction and money advice conflict?",
      "What strengths does the skills card highlight?",
      "How can I overcome the blocker card?",
      "What is my financial situation this year according to the outcome?",
      "Would salary negotiation or job change help?"
    ]
  },
  // === Well-being & Health ===
  "mind-body-scan": {
    ko: [
      "마음 카드에서 가장 신경 써야 할 감정은?",
      "몸 카드가 경고하는 신체 부위는?",
      "영혼 카드가 요구하는 영적 실천은?",
      "세 카드의 균형을 맞추려면?",
      "지금 가장 시급한 것은 마음, 몸, 영혼 중 무엇인가요?"
    ],
    en: [
      "What emotion needs most attention in the mind card?",
      "What body part is the body card warning about?",
      "What spiritual practice does the spirit card require?",
      "How can I balance all three cards?",
      "Which is most urgent: mind, body, or spirit?"
    ]
  },
  "healing-path": {
    ko: [
      "케어가 필요한 영역 카드가 가리키는 구체적인 것은?",
      "치유를 돕는 것 카드를 어떻게 실천할까요?",
      "놓아야 할 것 카드에서 버려야 할 습관/감정은?",
      "결과 카드로 봤을 때 회복 시간은?",
      "전문가의 도움이 필요한가요?"
    ],
    en: [
      "What specifically does the care needed card point to?",
      "How can I apply the healing support card?",
      "What habit/emotion should I release according to the release card?",
      "How long is the recovery time according to the outcome?",
      "Do I need professional help?"
    ]
  },
  "energy-balance": {
    ko: [
      "아침/점심/저녁 에너지 흐름의 패턴은?",
      "에너지 소모 카드가 가리키는 것을 어떻게 피할까요?",
      "에너지 충전 카드의 조언을 구체적으로 어떻게 실천할까요?",
      "하루 중 가장 중요한 결정을 내리기 좋은 시간은?",
      "이 에너지 패턴을 바꾸려면?"
    ],
    en: [
      "What is the pattern of morning/afternoon/evening energy?",
      "How can I avoid what the energy drain card points to?",
      "How do I specifically apply the energy refill card's advice?",
      "What's the best time to make important decisions?",
      "How can I change this energy pattern?"
    ]
  },
  // === Spiritual Growth ===
  "inner-voice": {
    ko: [
      "이 한 장의 카드가 내 영혼이 전하는 메시지는?",
      "이 메시지를 일상에서 어떻게 실천할까요?",
      "이 카드와 연결된 과거 생의 기억이 있나요?",
      "명상할 때 이 카드를 어떻게 활용할까요?"
    ],
    en: [
      "What message is my soul conveying through this card?",
      "How can I practice this message in daily life?",
      "Is there a past life memory connected to this card?",
      "How can I use this card in meditation?"
    ]
  },
  "shadow-work": {
    ko: [
      "그림자 측면 카드가 드러내는 억압된 나는?",
      "이것이 나타나는 방식 카드에서 어떤 상황에서 드러나나요?",
      "치유 방법 카드를 구체적으로 어떻게 실천할까요?",
      "교훈 카드가 말하는 이 그림자의 선물은?",
      "이 그림자와 화해하려면 얼마나 걸릴까요?"
    ],
    en: [
      "What suppressed self does the shadow aspect card reveal?",
      "In what situations does this appear according to the manifestation card?",
      "How do I specifically practice the healing method card?",
      "What gift does this shadow offer according to the lesson card?",
      "How long will it take to reconcile with this shadow?"
    ]
  },
  "path-of-growth": {
    ko: [
      "현재 교훈 카드가 가르치는 핵심은?",
      "지지 카드가 말하는 나를 돕는 에너지/사람은?",
      "도전 카드의 시험을 어떻게 통과할까요?",
      "수련 카드가 제안하는 구체적인 실천법은?",
      "결과 카드로 봤을 때 다음 영적 단계는?"
    ],
    en: [
      "What is the core teaching of the current lesson card?",
      "What energy/person supports me according to the support card?",
      "How can I pass the test of the challenge card?",
      "What specific practice does the practice card suggest?",
      "What is the next spiritual level according to the outcome?"
    ]
  },
  // === Decisions & Crossroads ===
  "two-paths": {
    ko: [
      "A 경로의 강점과 위험을 비교하면?",
      "B 경로의 강점과 위험을 비교하면?",
      "과거 영향 카드가 이 결정에 미치는 영향은?",
      "가이드 카드가 추천하는 선택은?",
      "두 경로 모두 피하고 제3의 길을 찾아야 할까요?",
      "이 결정을 미루면 어떻게 될까요?"
    ],
    en: [
      "How do Path A's strengths and risks compare?",
      "How do Path B's strengths and risks compare?",
      "How does the past influence card affect this decision?",
      "Which choice does the guidance card recommend?",
      "Should I avoid both paths and find a third way?",
      "What happens if I delay this decision?"
    ]
  },
  "yes-no-why": {
    ko: [
      "예스 에너지와 노 에너지 중 어느 쪽이 강한가요?",
      "숨겨진 요인 카드가 밝히는 내가 모르는 것은?",
      "이 질문에 대한 최종 답은 예인가요, 아니오인가요?",
      "숨겨진 요인을 해결하면 결과가 달라질까요?"
    ],
    en: [
      "Which is stronger: yes energy or no energy?",
      "What am I not aware of according to the hidden factor card?",
      "Is the final answer to this question yes or no?",
      "Will the outcome change if I address the hidden factor?"
    ]
  },
  "timing-window": {
    ko: [
      "지금 행동해야 할까요, 기다려야 할까요?",
      "1-3개월 카드가 보여주는 에너지 변화는?",
      "3-6개월 카드가 가리키는 중요한 시점은?",
      "타이밍을 열 핵심 행동 카드를 어떻게 실천할까요?",
      "이 결정의 최적 타이밍은 언제인가요?"
    ],
    en: [
      "Should I act now or wait?",
      "What energy shift does the 1-3 months card show?",
      "What key timing does the 3-6 months card point to?",
      "How do I practice the key action card to unlock timing?",
      "When is the optimal timing for this decision?"
    ]
  },
  // === Self-Discovery ===
  "identity-core": {
    ko: [
      "핵심 동력 카드가 말하는 나를 움직이는 것은?",
      "깊은 욕구 카드가 밝히는 내가 진정 원하는 것은?",
      "사각지대 카드가 보여주는 내가 못 보는 나는?",
      "유니크한 선물 카드가 말하는 나의 재능은?",
      "통합 단계 카드를 이번 달 어떻게 실천할까요?"
    ],
    en: [
      "What drives me according to the core drive card?",
      "What do I truly want according to the deep need card?",
      "What can't I see about myself according to the blind spot card?",
      "What talent does the unique gift card reveal?",
      "How can I practice the integration step card this month?"
    ]
  },
  "shadow-integration": {
    ko: [
      "그림자 패턴 카드가 보여주는 반복되는 패턴은?",
      "트리거 카드가 말하는 이것이 작동하는 상황은?",
      "보호적 역할 카드에서 이 그림자가 나를 보호하는 방식은?",
      "비용 카드가 경고하는 이 패턴의 대가는?",
      "치유 실천 카드를 매일 어떻게 할까요?",
      "통합 신호 카드로 봤을 때 치유의 징조는?"
    ],
    en: [
      "What repeating pattern does the shadow pattern card show?",
      "In what situations does this trigger according to the trigger card?",
      "How does this shadow protect me according to the protective role card?",
      "What price am I paying according to the cost card?",
      "How can I practice the healing practice card daily?",
      "What are the signs of healing according to the integration signal?"
    ]
  },
  // === Daily Reading ===
  "day-card": {
    ko: [
      "오늘 이 카드의 에너지를 어떻게 활용할까요?",
      "오늘 피해야 할 것이 있나요?",
      "이 카드가 암시하는 오늘의 행운은?",
      "오늘 중요한 만남이 있을까요?"
    ],
    en: [
      "How can I use this card's energy today?",
      "Is there anything to avoid today?",
      "What luck does this card hint at for today?",
      "Will there be an important encounter today?"
    ]
  },
  "three-times": {
    ko: [
      "아침 카드의 에너지를 어떻게 시작할까요?",
      "오후 카드에서 주의해야 할 상황은?",
      "저녁 카드가 말하는 하루의 마무리 방법은?",
      "세 시간대 중 가장 중요한 시간은?",
      "오늘 에너지의 전체적인 흐름은?"
    ],
    en: [
      "How should I start with the morning card's energy?",
      "What should I watch out for in the afternoon card?",
      "How does the evening card suggest ending the day?",
      "Which time period is most important?",
      "What is the overall energy flow of today?"
    ]
  }
};

// === Dynamic Card-Based Questions (200% Premium) ===
// Questions specific to each Major Arcana card
const CARD_SPECIFIC_QUESTIONS: Record<string, Record<LangKey, string[]>> = {
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
const REVERSED_QUESTIONS: Record<LangKey, (cardName: string) => string[]> = {
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
const COMBINATION_QUESTIONS: Record<string, Record<LangKey, string[]>> = {
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
  // Additional powerful combinations
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
const SUIT_QUESTIONS: Record<string, Record<LangKey, string[]>> = {
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

// === NUMBER-BASED QUESTIONS (Ace through 10) ===
const _NUMBER_QUESTIONS: Record<string, Record<LangKey, string[]>> = {
  "Ace": {
    ko: ["이 새로운 시작의 씨앗을 어떻게 심어야 할까요?", "에이스가 가져오는 순수한 잠재력은?"],
    en: ["How should I plant this seed of new beginning?", "What pure potential does this Ace bring?"]
  },
  "Two": {
    ko: ["균형과 선택 사이에서 무엇이 중요한가요?", "파트너십이나 이중성의 의미는?"],
    en: ["What matters between balance and choice?", "What does partnership or duality mean?"]
  },
  "Three": {
    ko: ["확장과 성장의 다음 단계는?", "협력과 창조의 결과가 나타나고 있나요?"],
    en: ["What is the next step of expansion and growth?", "Are results of collaboration appearing?"]
  },
  "Four": {
    ko: ["안정과 기반이 필요한 영역은?", "구조를 세우거나 휴식이 필요한 곳은?"],
    en: ["What area needs stability and foundation?", "Where do I need structure or rest?"]
  },
  "Five": {
    ko: ["이 도전과 갈등에서 배울 교훈은?", "변화의 고통을 어떻게 극복할까요?"],
    en: ["What lesson is there in this challenge and conflict?", "How to overcome the pain of change?"]
  },
  "Six": {
    ko: ["조화와 균형을 회복하는 방법은?", "주고받음의 에너지가 흐르고 있나요?"],
    en: ["How to restore harmony and balance?", "Is the energy of giving and receiving flowing?"]
  },
  "Seven": {
    ko: ["성찰과 평가가 필요한 시점인가요?", "깊은 내면의 작업이 필요한 영역은?"],
    en: ["Is this a time for reflection and assessment?", "What area needs deep inner work?"]
  },
  "Eight": {
    ko: ["숙달과 움직임의 방향은?", "노력이 결실을 맺고 있나요?"],
    en: ["What is the direction of mastery and movement?", "Is my effort bearing fruit?"]
  },
  "Nine": {
    ko: ["거의 완성에 가까워졌나요?", "마지막 단계에서 주의할 점은?"],
    en: ["Am I near completion?", "What to watch in the final stage?"]
  },
  "Ten": {
    ko: ["이 사이클의 완성과 새 시작이 의미하는 것은?", "정점에 도달한 후 다음은?"],
    en: ["What does completion and new beginning mean?", "What comes after reaching the peak?"]
  }
};

// === COURT CARD QUESTIONS ===
const COURT_CARD_QUESTIONS: Record<string, Record<LangKey, string[]>> = {
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
const MINOR_ARCANA_QUESTIONS: Record<string, Record<LangKey, string[]>> = {
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
const ELEMENT_INTERACTION_QUESTIONS: Record<string, Record<LangKey, string[]>> = {
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
const COURT_RELATIONSHIP_QUESTIONS: Record<string, Record<LangKey, string[]>> = {
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

// Helper: Extract suit from card name
function getSuitFromCard(cardName: string): string | null {
  if (cardName.includes("Wands")) return "Wands";
  if (cardName.includes("Cups")) return "Cups";
  if (cardName.includes("Swords")) return "Swords";
  if (cardName.includes("Pentacles")) return "Pentacles";
  return null;
}

// Helper: Extract number/rank from card name
function getNumberFromCard(cardName: string): string | null {
  const numbers = ["Ace", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];
  for (const num of numbers) {
    if (cardName.includes(num)) return num;
  }
  return null;
}

// Helper: Extract court rank from card name
function getCourtRankFromCard(cardName: string): string | null {
  if (cardName.includes("Page")) return "Page";
  if (cardName.includes("Knight")) return "Knight";
  if (cardName.includes("Queen")) return "Queen";
  if (cardName.includes("King")) return "King";
  return null;
}

// Generate dynamic questions based on actual drawn cards (울트라 프리미엄)
function generateDynamicQuestions(
  drawnCards: { card: { name: string }; isReversed: boolean }[],
  language: LangKey
): string[] {
  const questions: string[] = [];
  const cardNames = drawnCards.map(dc => dc.card.name);

  // Track for advanced analysis
  const suitCounts: Record<string, number> = { Wands: 0, Cups: 0, Swords: 0, Pentacles: 0 };
  const numberCounts: Record<string, number> = {};
  const courtRanks: string[] = [];
  const elements: string[] = [];
  const suitToElement: Record<string, string> = {
    Wands: "Fire", Cups: "Water", Swords: "Air", Pentacles: "Earth"
  };

  for (const dc of drawnCards) {
    const cardName = dc.card.name;

    // 1. PRIORITY: Specific Minor Arcana questions (most precise)
    const specificMinorQ = MINOR_ARCANA_QUESTIONS[cardName]?.[language];
    if (specificMinorQ && specificMinorQ.length > 0 && questions.length < 2) {
      questions.push(specificMinorQ[0]);
      continue; // Skip generic suit/number for this card
    }

    // 2. Major Arcana - Card-specific questions
    const majorQuestions = CARD_SPECIFIC_QUESTIONS[cardName]?.[language];
    if (majorQuestions && majorQuestions.length > 0 && questions.length < 3) {
      questions.push(majorQuestions[0]);
    }

    // Track suit for element analysis
    const suit = getSuitFromCard(cardName);
    if (suit) {
      suitCounts[suit]++;
      elements.push(suitToElement[suit]);

      // Add suit question only if no specific minor arcana question
      if (suitCounts[suit] === 1 && !specificMinorQ && questions.length < 4) {
        const suitQs = SUIT_QUESTIONS[suit]?.[language];
        if (suitQs && suitQs.length > 0) {
          questions.push(suitQs[0]);
        }
      }
    }

    // Track number for numerology
    const number = getNumberFromCard(cardName);
    if (number) {
      numberCounts[number] = (numberCounts[number] || 0) + 1;
    }

    // Track court cards for relationship dynamics
    const courtRank = getCourtRankFromCard(cardName);
    if (courtRank) {
      courtRanks.push(courtRank);
      if (questions.length < 5) {
        const courtQs = COURT_CARD_QUESTIONS[courtRank]?.[language];
        if (courtQs && courtQs.length > 0) {
          questions.push(courtQs[0]);
        }
      }
    }
  }

  // 3. Court Card Relationship Dynamics (궁정 카드 관계)
  if (courtRanks.length >= 2) {
    const uniqueRanks = [...new Set(courtRanks)].sort();
    for (let i = 0; i < uniqueRanks.length - 1; i++) {
      for (let j = i + 1; j < uniqueRanks.length; j++) {
        const comboKey = `${uniqueRanks[i]}+${uniqueRanks[j]}`;
        const courtComboQ = COURT_RELATIONSHIP_QUESTIONS[comboKey]?.[language];
        if (courtComboQ && courtComboQ.length > 0) {
          questions.push(courtComboQ[0]);
          break;
        }
      }
    }
  }

  // 4. Element Interaction Questions (원소 상호작용)
  const uniqueElements = [...new Set(elements)];
  if (uniqueElements.length >= 2) {
    const elem1 = uniqueElements[0];
    const elem2 = uniqueElements[1];
    const elementComboKey = `${elem1}+${elem2}`;
    const reverseKey = `${elem2}+${elem1}`;
    const elementQ = ELEMENT_INTERACTION_QUESTIONS[elementComboKey]?.[language] ||
                     ELEMENT_INTERACTION_QUESTIONS[reverseKey]?.[language];
    if (elementQ && elementQ.length > 0) {
      questions.push(elementQ[0]);
    }
  }

  // 5. Reversed card questions
  const reversedCards = drawnCards.filter(dc => dc.isReversed).slice(0, 2);
  for (const rc of reversedCards) {
    if (questions.length < 7) {
      const reversedQs = REVERSED_QUESTIONS[language](rc.card.name);
      if (reversedQs.length > 0) {
        questions.push(reversedQs[0]);
      }
    }
  }

  // 6. Major Arcana Combinations
  for (const comboKey of Object.keys(COMBINATION_QUESTIONS)) {
    const [card1, card2] = comboKey.split("+");
    if (cardNames.includes(card1) && cardNames.includes(card2)) {
      const comboQuestions = COMBINATION_QUESTIONS[comboKey]?.[language];
      if (comboQuestions && comboQuestions.length > 0) {
        questions.push(comboQuestions[0]);
      }
      break;
    }
  }

  // 7. Dominant element analysis
  const dominantSuit = Object.entries(suitCounts).find(([_, count]) => count >= 2)?.[0];
  if (dominantSuit) {
    const elementNames: Record<string, Record<LangKey, string>> = {
      Wands: { ko: "불", en: "Fire" },
      Cups: { ko: "물", en: "Water" },
      Swords: { ko: "공기", en: "Air" },
      Pentacles: { ko: "땅", en: "Earth" }
    };
    const element = elementNames[dominantSuit]?.[language] || dominantSuit;
    questions.push(
      language === "ko"
        ? `${element}의 에너지가 지배적입니다. 이 원소의 균형을 어떻게 맞출까요?`
        : `${element} energy is dominant. How should I balance this element?`
    );
  }

  // 8. Missing element insight
  const presentElements = Object.entries(suitCounts).filter(([_, c]) => c > 0).map(([s]) => s);
  const allSuits = ["Wands", "Cups", "Swords", "Pentacles"];
  const missingSuits = allSuits.filter(s => !presentElements.includes(s));
  if (missingSuits.length > 0 && missingSuits.length < 4 && questions.length < 8) {
    const missingElementNames: Record<string, Record<LangKey, string>> = {
      Wands: { ko: "열정과 행동(불)", en: "passion and action (Fire)" },
      Cups: { ko: "감정과 직관(물)", en: "emotion and intuition (Water)" },
      Swords: { ko: "사고와 소통(공기)", en: "thought and communication (Air)" },
      Pentacles: { ko: "물질과 현실(땅)", en: "material and reality (Earth)" }
    };
    const missing = missingElementNames[missingSuits[0]]?.[language];
    if (missing) {
      questions.push(
        language === "ko"
          ? `${missing}의 에너지가 부족합니다. 이 영역에 더 주의를 기울여야 할까요?`
          : `${missing} energy is missing. Should I pay more attention to this area?`
      );
    }
  }

  // 9. Repeated number emphasis
  const repeatedNumber = Object.entries(numberCounts).find(([_, count]) => count >= 2)?.[0];
  if (repeatedNumber) {
    questions.push(
      language === "ko"
        ? `${repeatedNumber} 카드가 여러 장 나왔습니다. 이 숫자의 강조된 의미는?`
        : `Multiple ${repeatedNumber} cards appeared. What is the emphasized meaning of this number?`
    );
  }

  // 10. Transformation timing
  const timingCards = ["Death", "Wheel of Fortune", "The World", "The Sun", "The Tower", "Judgement"];
  if (cardNames.some(name => timingCards.includes(name)) && questions.length < 10) {
    questions.push(
      language === "ko"
        ? "이 변화나 완성이 언제쯤 일어날까요?"
        : "When will this change or completion happen?"
    );
  }

  // 11. Card flow/story question (for 3+ cards)
  if (drawnCards.length >= 3 && questions.length < 10) {
    questions.push(
      language === "ko"
        ? "이 카드들이 보여주는 전체적인 이야기의 흐름은?"
        : "What is the overall story flow these cards are showing?"
    );
  }

  // Return unique questions (max 10 for 울트라 프리미엄)
  return [...new Set(questions)].slice(0, 10);
}

// Fallback category questions (when spread-specific not available)
const CATEGORY_QUESTIONS: Record<string, Record<LangKey, string[]>> = {
  "general-insight": {
    ko: ["이 카드들의 핵심 메시지는?", "숨겨진 의미가 있나요?", "앞으로의 전망은?"],
    en: ["What is the core message?", "Is there a hidden meaning?", "What is the outlook?"]
  },
  "love-relationships": {
    ko: ["상대방의 진짜 마음은?", "우리의 미래는?", "내가 바꿔야 할 것은?"],
    en: ["What are their true feelings?", "What is our future?", "What should I change?"]
  },
  "career-work": {
    ko: ["이직해야 할까요?", "승진 가능성은?", "번아웃을 피하려면?"],
    en: ["Should I change jobs?", "What about promotion?", "How to avoid burnout?"]
  },
  "money-finance": {
    ko: ["투자해도 될까요?", "재정 상황이 나아질까요?", "돈을 모으려면?"],
    en: ["Should I invest?", "Will finances improve?", "How to save money?"]
  },
  "well-being-health": {
    ko: ["건강에서 주의할 점은?", "스트레스 해소법은?", "에너지 회복 방법은?"],
    en: ["Health concerns?", "Stress relief?", "Energy recovery?"]
  },
  "spiritual-growth": {
    ko: ["영적 메시지는?", "명상 시 집중할 것은?", "카르마가 있나요?"],
    en: ["Spiritual message?", "Focus in meditation?", "Any karma?"]
  },
  "decisions-crossroads": {
    ko: ["어떤 선택이 나을까요?", "지금이 적기인가요?", "후회하지 않으려면?"],
    en: ["Which choice is better?", "Is now the right time?", "How to avoid regret?"]
  },
  "self-discovery": {
    ko: ["나의 숨겨진 면은?", "진정한 목적은?", "내면의 장애물은?"],
    en: ["My hidden side?", "True purpose?", "Inner obstacles?"]
  },
  "daily-reading": {
    ko: ["오늘 주의할 점은?", "행운을 끌어당기려면?", "중요한 만남이 있을까요?"],
    en: ["What to watch today?", "How to attract luck?", "Important encounters?"]
  },
  default: {
    ko: ["이 카드 조합의 의미는?", "구체적인 조언은?", "숨겨진 경고가 있나요?"],
    en: ["What does this combination mean?", "Specific advice?", "Any hidden warnings?"]
  }
};

interface CardInsight {
  position: string;
  card_name: string;
  is_reversed: boolean;
  interpretation: string;
}

interface InterpretationResult {
  overall_message: string;
  card_insights: CardInsight[];
  guidance: string;
  affirmation: string;
}

interface ReadingResponse {
  category: string;
  spread: Spread;
  drawnCards: DrawnCard[];
}

type Message = { role: "user" | "assistant"; content: string };

interface TarotChatProps {
  readingResult: ReadingResponse;
  interpretation: InterpretationResult | null;
  categoryName: string;
  spreadId: string;
  language: LangKey;
}

export default function TarotChat({
  readingResult,
  interpretation,
  categoryName,
  spreadId,
  language = "ko"
}: TarotChatProps) {
  const tr = I18N[language] || I18N.ko;
  const loadingMessages = LOADING_MESSAGES[language] || LOADING_MESSAGES.ko;
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState<string>("");
  const [loadingMessage, setLoadingMessage] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [usedQuestionIndices, setUsedQuestionIndices] = useState<Set<number>>(new Set());
  const loadingMessageIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Generate dynamic questions based on actual drawn cards (만프로 Premium)
  const dynamicQuestions = generateDynamicQuestions(readingResult.drawnCards, language);

  // Priority: dynamic card-based > spreadId > categoryName > default
  // Merge dynamic questions with spread questions for comprehensive suggestions
  const spreadQuestions =
    SPREAD_QUESTIONS[spreadId]?.[language] ||
    CATEGORY_QUESTIONS[categoryName]?.[language] ||
    CATEGORY_QUESTIONS.default[language];

  // 울트라 프리미엄 Combination: card-specific > element > court > spread context
  // Dynamic: Specific Minor + Major + Element Interaction + Court Relations + Reversed + Combos
  const allSuggestedQuestions = [
    ...dynamicQuestions.slice(0, 6),  // Top 6 card-specific questions (울트라)
    ...spreadQuestions.slice(0, 4)     // Top 4 spread-specific questions
  ].slice(0, 10); // Max 10 total for ultra premium experience

  // Get next 2 questions that haven't been used yet
  const getNextSuggestions = (): string[] => {
    const available = allSuggestedQuestions.filter((_, idx) => !usedQuestionIndices.has(idx));
    return available.slice(0, 2);
  };

  // Check if last message is from assistant (for showing suggestions after response)
  const lastMessage = messages[messages.length - 1];
  const showSuggestionsAfterResponse = lastMessage?.role === 'assistant' && !loading;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const buildContext = () => {
    const cards = readingResult.drawnCards.map((dc, idx) => ({
      position: readingResult.spread.positions[idx]?.title || `Card ${idx + 1}`,
      name: dc.card.name,
      is_reversed: dc.isReversed, // snake_case for backend compatibility
      meaning: dc.isReversed ? dc.card.reversed.meaning : dc.card.upright.meaning,
      keywords: dc.isReversed
        ? (dc.card.reversed.keywordsKo || dc.card.reversed.keywords)
        : (dc.card.upright.keywordsKo || dc.card.upright.keywords)
    }));

    return {
      spread_title: readingResult.spread.title,
      category: categoryName,
      cards,
      overall_message: interpretation?.overall_message || "",
      guidance: interpretation?.guidance || ""
    };
  };

  // Start rotating loading messages
  const startLoadingMessages = () => {
    const randomIndex = Math.floor(Math.random() * loadingMessages.length);
    setLoadingMessage(loadingMessages[randomIndex]);

    loadingMessageIntervalRef.current = setInterval(() => {
      const newIndex = Math.floor(Math.random() * loadingMessages.length);
      setLoadingMessage(loadingMessages[newIndex]);
    }, 3000);
  };

  // Stop rotating loading messages
  const stopLoadingMessages = () => {
    if (loadingMessageIntervalRef.current) {
      clearInterval(loadingMessageIntervalRef.current);
      loadingMessageIntervalRef.current = null;
    }
    setLoadingMessage("");
  };

  async function handleSend(text?: string) {
    const messageText = text || input.trim();
    if (!messageText || loading) return;

    // Track used suggestion if it was from suggestions
    const suggestionIndex = allSuggestedQuestions.indexOf(messageText);
    if (suggestionIndex !== -1) {
      setUsedQuestionIndices(prev => new Set([...prev, suggestionIndex]));
    }

    const nextMessages: Message[] = [...messages, { role: "user", content: messageText }];
    setLoading(true);
    setMessages(nextMessages);
    setInput("");
    setStreamingContent("");
    startLoadingMessages();

    try {
      // Try streaming endpoint first
      const response = await fetch("/api/tarot/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages,
          context: buildContext(),
          language
        })
      });

      if (!response.ok) {
        throw new Error(`Stream failed: ${response.status}`);
      }

      const contentType = response.headers.get("content-type");

      if (contentType?.includes("text/event-stream") && response.body) {
        // Handle SSE streaming
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedContent = "";

        // Stop loading messages once streaming starts
        stopLoadingMessages();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value, { stream: true });
          const lines = text.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.content) {
                  accumulatedContent += data.content;
                  setStreamingContent(accumulatedContent);
                }
                if (data.done) {
                  // Streaming complete
                  setMessages(prev => [...prev, {
                    role: "assistant",
                    content: accumulatedContent || tr.error
                  }]);
                  setStreamingContent("");
                }
                if (data.error) {
                  throw new Error(data.error);
                }
              } catch (parseError) {
                // Ignore parse errors for incomplete chunks
              }
            }
          }
        }

        // If no done signal received, still add the message
        if (accumulatedContent && !messages.find(m => m.content === accumulatedContent)) {
          setMessages(prev => {
            // Check if last message is already this content
            const last = prev[prev.length - 1];
            if (last?.role === "assistant" && last?.content === accumulatedContent) {
              return prev;
            }
            return [...prev, { role: "assistant", content: accumulatedContent }];
          });
          setStreamingContent("");
        }
      } else {
        // Fallback to JSON response
        stopLoadingMessages();
        const data = await response.json();
        setMessages(prev => [...prev, {
          role: "assistant",
          content: data.reply || tr.error
        }]);
      }
    } catch (error) {
      console.error("[TarotChat] Streaming error, falling back:", error);
      stopLoadingMessages();

      // Fallback to non-streaming endpoint
      try {
        const fallbackResponse = await fetch("/api/tarot/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: nextMessages,
            context: buildContext(),
            language
          })
        });

        if (fallbackResponse.ok) {
          const data = await fallbackResponse.json();
          setMessages(prev => [...prev, {
            role: "assistant",
            content: data.reply || tr.error
          }]);
        } else {
          throw new Error("Fallback also failed");
        }
      } catch (fallbackError) {
        console.error("[TarotChat] Fallback error:", fallbackError);
        setMessages(prev => [...prev, {
          role: "assistant",
          content: tr.error
        }]);
      }
    } finally {
      setLoading(false);
      stopLoadingMessages();
      setStreamingContent("");
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className={styles.chatContainer}>
      {/* Messages Panel */}
      <div className={styles.messagesPanel}>
        {messages.length === 0 && !loading && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🔮</div>
            <p className={styles.emptyText}>{tr.empty}</p>
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={`${styles.messageRow} ${m.role === "assistant" ? styles.assistantRow : styles.userRow}`}
          >
            {m.role === "assistant" && (
              <div className={styles.avatar}>
                <span className={styles.avatarIcon}>🔮</span>
              </div>
            )}
            <div className={styles.messageBubble}>
              <div className={m.role === "assistant" ? styles.assistantMessage : styles.userMessage}>
                {m.content}
              </div>
            </div>
            {m.role === "user" && (
              <div className={styles.avatar}>
                <span className={styles.avatarIcon}>👤</span>
              </div>
            )}
          </div>
        ))}

        {/* Streaming content - show as it arrives */}
        {streamingContent && (
          <div className={`${styles.messageRow} ${styles.assistantRow}`}>
            <div className={styles.avatar}>
              <span className={styles.avatarIcon}>🔮</span>
            </div>
            <div className={styles.messageBubble}>
              <div className={styles.assistantMessage}>
                {streamingContent}
                <span className={styles.streamingCursor}>▊</span>
              </div>
            </div>
          </div>
        )}

        {/* Loading state - show fun messages before streaming starts */}
        {loading && !streamingContent && (
          <div className={`${styles.messageRow} ${styles.assistantRow}`}>
            <div className={styles.avatar}>
              <span className={styles.avatarIcon}>🔮</span>
            </div>
            <div className={styles.messageBubble}>
              <div className={styles.thinkingMessage}>
                <div className={styles.typingDots}>
                  <span className={styles.typingDot} />
                  <span className={styles.typingDot} />
                  <span className={styles.typingDot} />
                </div>
                <span className={styles.thinkingText}>{loadingMessage || tr.thinking}</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Questions (after assistant response) */}
      {showSuggestionsAfterResponse && getNextSuggestions().length > 0 && (
        <div className={styles.suggestedSection}>
          <h4 className={styles.suggestedTitle}>{tr.suggestedQuestions}</h4>
          <div className={styles.suggestedGrid}>
            {getNextSuggestions().map((q: string, idx: number) => (
              <button
                key={idx}
                className={styles.suggestedButton}
                onClick={() => handleSend(q)}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className={styles.inputArea}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={tr.placeholder}
          rows={2}
          className={styles.textarea}
          disabled={loading}
        />
        <button
          onClick={() => handleSend()}
          disabled={loading || !input.trim()}
          className={styles.sendButton}
        >
          {tr.send}
        </button>
      </div>
    </div>
  );
}
