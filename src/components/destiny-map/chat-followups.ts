// src/components/destiny-map/chat-followups.ts
// Follow-up questions data extracted from Chat component

import type { LangKey } from './chat-i18n'
import { shuffle } from '@/lib/utils/array'

type FollowUpsByTheme = {
  career: string[]
  love: string[]
  health: string[]
  wealth: string[]
  family: string[]
}

// Universal follow-up questions (works for any response context)
// 폴백 후속질문 — LLM 이 마커를 누락했을 때만 사용. generic 대신 1인칭·호기심
// 갭으로 "누르고 싶게". (평소엔 LLM 이 답변 맥락에 맞춰 직접 생성한다.)
const UNIVERSAL_FOLLOWUPS: Record<'ko' | 'en', string[]> = {
  ko: [
    '그게 내 인생엔 어떤 영향 줘?',
    '나만 모르는 내 약점이 있어?',
    '그럼 난 뭘 먼저 해야 해?',
    '내 인생 최고의 시기는 언제야?',
    '이거 연애운이랑도 엮여 있어?',
    '돈 쪽은 어떻게 연결돼?',
    '내가 지금 놓치는 게 뭐야?',
    '반대로 움직이면 어떻게 돼?',
    '올해 안에 바뀔 수 있어?',
    '최악의 경우엔 뭘 조심해?',
    '숨겨진 내 재능이 따로 있어?',
    '남들은 모르는 내 매력은?',
  ],
  en: [
    'How does that shape my life?',
    "Any weakness I can't see?",
    'So what should I do first?',
    "When's my best window?",
    'Is this tied to my love life?',
    'How does money connect here?',
    'What am I missing right now?',
    'What if I do the opposite?',
    'Can this change this year?',
    'Worst case — what do I watch?',
    'Do I have a hidden talent?',
    "What's my hidden charm?",
  ],
}

// Theme-specific follow-up questions
const THEMED_FOLLOWUPS: Record<'ko' | 'en', FollowUpsByTheme> = {
  ko: {
    career: [
      '일자리/커리어에서 가장 중요한 변수는 뭐예요?',
      '지금 회사에서 바꿔야 할 한 가지는?',
      '이직 시기/준비 방법을 더 알려줘',
    ],
    love: [
      '관계에서 내가 놓치고 있는 신호가 있을까요?',
      '이 사람이 진지한지 확인하는 방법은?',
      '지금 관계를 개선하려면 구체적으로 무엇을 할까요?',
    ],
    health: [
      '어떤 생활 습관을 먼저 바꾸면 좋을까요?',
      '스트레스/수면에서 주의할 점은?',
      '이 증상에 대해 전문가 상담이 필요할까요?',
    ],
    wealth: [
      '지금 재정에서 새는 부분은 무엇인가요?',
      '투자/저축 우선순위를 어떻게 잡을까요?',
      '6개월 내 돈 흐름을 안정시키는 방법은?',
    ],
    family: [
      '가족과의 갈등을 풀기 위한 첫걸음은?',
      '지원이 필요한 가족 구성원은 누구인가요?',
      '대화를 시작할 때 조심할 점은?',
    ],
  },
  en: {
    career: [
      'What one change at work would help most?',
      'Is it time to switch jobs or role?',
      'How should I prepare for the next 6 months?',
    ],
    love: [
      'What signal am I missing in this relationship?',
      'How do I confirm their seriousness?',
      'What practical step improves this connection?',
    ],
    health: [
      'Which habit should I change first?',
      'How to reduce stress or improve sleep?',
      'Should I consult a professional for this?',
    ],
    wealth: [
      'Where is money leaking now?',
      'How to prioritize invest vs save?',
      'How to stabilize cash flow in 6 months?',
    ],
    family: [
      "What's the first step to ease family tension?",
      'Who needs support most right now?',
      'How to start a careful conversation?',
    ],
  },
}

// Suggested questions based on theme (shown initially)
const SUGGESTED_QUESTIONS: Record<'ko' | 'en', Record<string, string[]>> = {
  ko: {
    career: [
      '나한테 천직이 뭐예요? 🎯',
      '올해 이직해도 될까요?',
      '사장 체질인지 직원 체질인지 궁금해요',
    ],
    love: [
      '내 인연은 어디서 만나요? 💕',
      '이번 연애 진지하게 가도 될까요?',
      '왜 나는 연애가 안 될까요?',
    ],
    wealth: ['부자 될 팔자인가요? 💰', '주식 해도 될까요?', '돈 복이 있는 편인가요?'],
    health: ['타고난 체질이 뭐예요? 🏃', '조심해야 할 질병 있어요?', '살 빠지는 시기가 있을까요?'],
    life_path: ['내 인생 최고의 해는 언제예요? ⭐', '숨겨진 재능이 뭐예요?', '올해 대운이 어때요?'],
    chat: ['나는 어떤 사람이에요? ✨', '올해 무슨 일이 생길까요?', '행운의 숫자/색깔 알려줘'],
  },
  en: {
    career: [
      "What's my dream job? 🎯",
      'Should I change jobs this year?',
      'Am I a boss or employee type?',
    ],
    love: [
      'Where will I meet my soulmate? 💕',
      'Is this relationship serious?',
      "Why can't I find love?",
    ],
    wealth: ['Am I destined to be rich? 💰', 'Should I invest in stocks?', 'Do I have money luck?'],
    health: ["What's my body type? 🏃", 'Any diseases to watch?', "When's good for weight loss?"],
    life_path: [
      "When's my best year? ⭐",
      "What's my hidden talent?",
      "How's my fortune this year?",
    ],
    chat: [
      'What kind of person am I? ✨',
      'What will happen this year?',
      'Tell me my lucky number/color',
    ],
  },
}

/**
 * Generate follow-up questions based on the user's last message.
 */
export function generateFollowUpQuestions(
  lastUserMsg: string,
  lang: LangKey,
  maxCount: number = 2,
  /** 직전 AI 답변 — 테마 감지에 같이 사용해 답변과 더 연관되게(폴백 경로). */
  answerText: string = ''
): string[] {
  const effectiveLang = lang === 'ko' ? 'ko' : 'en'
  const text = `${lastUserMsg || ''} ${answerText || ''}`.toLowerCase()
  const picks: string[] = []

  const add = (arr: string[] = []) => {
    for (const q of arr) {
      if (!picks.includes(q)) {
        picks.push(q)
      }
    }
  }

  const themed = THEMED_FOLLOWUPS[effectiveLang]

  // Bias by topic detected in the user message
  if (text.match(/job|work|이직|커리어|직업/)) {
    add(themed.career)
  }
  if (text.match(/love|relationship|연애|사랑|썸/)) {
    add(themed.love)
  }
  if (text.match(/health|몸|건강|스트레스|수면/)) {
    add(themed.health)
  }
  if (text.match(/money|finance|돈|재정|투자|주식/)) {
    add(themed.wealth)
  }
  if (text.match(/family|가족|부모|형제|자녀/)) {
    add(themed.family)
  }

  // Fill with universal if needed — Fisher-Yates via lib/utils/array.
  // `.sort(() => Math.random() - 0.5)` is biased by the engine sort
  // algorithm and was over-representing the first follow-up suggestion.
  const shuffledUniversal = shuffle(UNIVERSAL_FOLLOWUPS[effectiveLang])
  add(shuffledUniversal)

  return picks.slice(0, maxCount)
}

/**
 * Get suggested initial questions for the chat hero.
 */
export function getSuggestedQuestions(lang: LangKey): string[] {
  const effectiveLang = lang === 'ko' ? 'ko' : 'en'
  return SUGGESTED_QUESTIONS[effectiveLang].chat
}

/**
 * 후속질문이 "generic 잡담"인지 휴리스틱 판별.
 * realtime route 시스템 프롬프트가 "더 알려줘 / tell me more / why?" 류를
 * 금지하지만, 모델이 가끔 무시하고 뱉음. 클라이언트에서 결정적으로 거르고
 * 부족하면 generateFollowUpQuestions() 로 보충.
 */
export function isGenericFollowUp(q: string, lang: LangKey): boolean {
  const trimmed = (q || '').trim()
  if (trimmed.length < 6) return true
  if (lang === 'ko') {
    const koGeneric =
      /^(더\s*알려줘|왜\??|조언|어떻게(\s*해야)?\??|그래서\??|그럼\??|어때\??|정말\??|진짜\??|뭐\??|좀\s*더|더\s*자세히)/
    if (koGeneric.test(trimmed)) return true
    // "더 알려줘" / "조언 해줘" 가 문장 끝에 와도 잡힘.
    if (/더\s*알려줘|조언\s*해줘|더\s*자세히/.test(trimmed)) return true
    return false
  }
  const enGeneric =
    /^(tell me more|more about|explain|why\??|any advice|what (next|now|should i do)|how about|really\??|is it\??|can you (tell|explain))/i
  if (enGeneric.test(trimmed)) return true
  if (/\btell me more\b|\bmore about it\b|\bany advice\b/i.test(trimmed)) return true
  return false
}
