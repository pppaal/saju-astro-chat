// src/components/destiny-map/chat-followups.ts
// Follow-up questions data extracted from Chat component

import type { LangKey } from "./chat-i18n";

type FollowUpsByTheme = {
  career: string[];
  love: string[];
  health: string[];
  wealth: string[];
  family: string[];
};

// Universal follow-up questions (works for any response context)
export const UNIVERSAL_FOLLOWUPS: Record<"ko" | "en", string[]> = {
  ko: [
    // 깊이 파고들기
    "더 자세히 알려줘",
    "왜 그런 거예요?",
    "구체적으로 설명해줘",
    // 시기/타이밍
    "그럼 언제쯤이 좋아요?",
    "올해 안에 가능할까요?",
    "몇 월이 제일 좋아요?",
    // 조언/방향
    "어떻게 하면 좋을까요?",
    "주의할 점은 뭐예요?",
    "피해야 할 건 뭐예요?",
    // 다른 관점
    "다른 관점에서도 봐줘",
    "반대로 생각하면 어때요?",
    "최악의 경우는 뭐예요?",
    // 연결 질문
    "이거랑 연애운은 관련 있어요?",
    "돈 문제랑 연결해서 봐줘",
    "건강이랑 연관 있어요?",
    // 비교/선택
    "A랑 B 중에 뭐가 나아요?",
    "지금 vs 나중, 뭐가 좋아요?",
    // 미래/예측
    "앞으로 어떻게 될까요?",
    "내년에는 달라질까요?",
    "10년 후에는 어때요?",
    // 자기 이해
    "내 장점을 더 알려줘",
    "내 약점은 뭐예요?",
    "나한테 숨겨진 게 있어요?",
  ],
  en: [
    // Dig deeper
    "Tell me more",
    "Why is that?",
    "Explain in detail",
    // Timing
    "When would be good?",
    "Is it possible this year?",
    "Which month is best?",
    // Advice
    "What should I do?",
    "What should I watch out for?",
    "What to avoid?",
    // Different perspective
    "Show me another angle",
    "What about the opposite?",
    "What's the worst case?",
    // Connected topics
    "How does this relate to love?",
    "Connect this to money",
    "Any health connection?",
    // Compare/choose
    "Which is better, A or B?",
    "Now vs later - which is better?",
    // Future
    "What happens next?",
    "Will it change next year?",
    "How about in 10 years?",
    // Self understanding
    "Tell me more strengths",
    "What are my weaknesses?",
    "Any hidden aspects?",
  ],
};

// Theme-specific follow-up questions
export const THEMED_FOLLOWUPS: Record<"ko" | "en", FollowUpsByTheme> = {
  ko: {
    career: [
      "일자리/커리어에서 가장 중요한 변수는 뭐예요?",
      "지금 회사에서 바꿔야 할 한 가지는?",
      "이직 시기/준비 방법을 더 알려줘",
    ],
    love: [
      "관계에서 내가 놓치고 있는 신호가 있을까요?",
      "이 사람이 진지한지 확인하는 방법은?",
      "지금 관계를 개선하려면 구체적으로 무엇을 할까요?",
    ],
    health: [
      "어떤 생활 습관을 먼저 바꾸면 좋을까요?",
      "스트레스/수면에서 주의할 점은?",
      "이 증상에 대해 전문가 상담이 필요할까요?",
    ],
    wealth: [
      "지금 재정에서 새는 부분은 무엇인가요?",
      "투자/저축 우선순위를 어떻게 잡을까요?",
      "6개월 내 돈 흐름을 안정시키는 방법은?",
    ],
    family: [
      "가족과의 갈등을 풀기 위한 첫걸음은?",
      "지원이 필요한 가족 구성원은 누구인가요?",
      "대화를 시작할 때 조심할 점은?",
    ],
  },
  en: {
    career: [
      "What one change at work would help most?",
      "Is it time to switch jobs or role?",
      "How should I prepare for the next 6 months?",
    ],
    love: [
      "What signal am I missing in this relationship?",
      "How do I confirm their seriousness?",
      "What practical step improves this connection?",
    ],
    health: [
      "Which habit should I change first?",
      "How to reduce stress or improve sleep?",
      "Should I consult a professional for this?",
    ],
    wealth: [
      "Where is money leaking now?",
      "How to prioritize invest vs save?",
      "How to stabilize cash flow in 6 months?",
    ],
    family: [
      "What's the first step to ease family tension?",
      "Who needs support most right now?",
      "How to start a careful conversation?",
    ],
  },
};

// Suggested questions based on theme (shown initially)
export const SUGGESTED_QUESTIONS: Record<"ko" | "en", Record<string, string[]>> = {
  ko: {
    career: [
      "나한테 천직이 뭐예요? 🎯",
      "올해 이직해도 될까요?",
      "사장 체질인지 직원 체질인지 궁금해요",
    ],
    love: [
      "내 인연은 어디서 만나요? 💕",
      "이번 연애 진지하게 가도 될까요?",
      "왜 나는 연애가 안 될까요?",
    ],
    wealth: [
      "부자 될 팔자인가요? 💰",
      "주식 해도 될까요?",
      "돈 복이 있는 편인가요?",
    ],
    health: [
      "타고난 체질이 뭐예요? 🏃",
      "조심해야 할 질병 있어요?",
      "살 빠지는 시기가 있을까요?",
    ],
    life_path: [
      "내 인생 최고의 해는 언제예요? ⭐",
      "숨겨진 재능이 뭐예요?",
      "올해 대운이 어때요?",
    ],
    chat: [
      "나는 어떤 사람이에요? ✨",
      "올해 무슨 일이 생길까요?",
      "행운의 숫자/색깔 알려줘",
    ],
  },
  en: {
    career: [
      "What's my dream job? 🎯",
      "Should I change jobs this year?",
      "Am I a boss or employee type?",
    ],
    love: [
      "Where will I meet my soulmate? 💕",
      "Is this relationship serious?",
      "Why can't I find love?",
    ],
    wealth: [
      "Am I destined to be rich? 💰",
      "Should I invest in stocks?",
      "Do I have money luck?",
    ],
    health: [
      "What's my body type? 🏃",
      "Any diseases to watch?",
      "When's good for weight loss?",
    ],
    life_path: [
      "When's my best year? ⭐",
      "What's my hidden talent?",
      "How's my fortune this year?",
    ],
    chat: [
      "What kind of person am I? ✨",
      "What will happen this year?",
      "Tell me my lucky number/color",
    ],
  },
};

/**
 * Generate follow-up questions based on the user's last message.
 */
export function generateFollowUpQuestions(
  lastUserMsg: string,
  lang: LangKey,
  maxCount: number = 2
): string[] {
  const effectiveLang = lang === "ko" ? "ko" : "en";
  const text = (lastUserMsg || "").toLowerCase();
  const picks: string[] = [];

  const add = (arr: string[] = []) => {
    for (const q of arr) {
      if (!picks.includes(q)) {picks.push(q);}
    }
  };

  const themed = THEMED_FOLLOWUPS[effectiveLang];

  // Bias by topic detected in the user message
  if (text.match(/job|work|이직|커리어|직업/)) {
    add(themed.career);
  }
  if (text.match(/love|relationship|연애|사랑|썸/)) {
    add(themed.love);
  }
  if (text.match(/health|몸|건강|스트레스|수면/)) {
    add(themed.health);
  }
  if (text.match(/money|finance|돈|재정|투자|주식/)) {
    add(themed.wealth);
  }
  if (text.match(/family|가족|부모|형제|자녀/)) {
    add(themed.family);
  }

  // Fill with universal if needed
  const shuffledUniversal = [...UNIVERSAL_FOLLOWUPS[effectiveLang]].sort(
    () => Math.random() - 0.5
  );
  add(shuffledUniversal);

  return picks.slice(0, maxCount);
}

/**
 * Get suggested initial questions for the chat hero.
 */
export function getSuggestedQuestions(lang: LangKey): string[] {
  const effectiveLang = lang === "ko" ? "ko" : "en";
  return SUGGESTED_QUESTIONS[effectiveLang].chat;
}
