/**
 * @file Spread-specific suggested questions for TarotChat
 */

import type { LangKey } from './tarot-chat-i18n';

// Suggested questions based on spread (more specific than category)
export const SPREAD_QUESTIONS: Record<string, Record<LangKey, string[]>> = {
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

// Fallback category questions (when spread-specific not available)
export const CATEGORY_QUESTIONS: Record<string, Record<LangKey, string[]>> = {
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
