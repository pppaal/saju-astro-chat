export type TarotQuestionExample = {
  ko: string
  en: string
}

export type TarotThemeExampleGroup = {
  themeId: string
  icon: string
  questions: TarotQuestionExample[]
}

export const tarotThemeExamples: TarotThemeExampleGroup[] = [
  {
    themeId: 'general-insight',
    icon: '✨',
    questions: [
      {
        ko: '지금 나를 둘러싼 전체 흐름은 어떤가요?',
        en: 'What is the overall energy around me right now?',
      },
      { ko: '현재 내 삶의 방향이 맞는지 알고 싶어요', en: 'Am I on the right path right now?' },
    ],
  },
  {
    themeId: 'love-relationships',
    icon: '💕',
    questions: [
      { ko: '그 사람이 나를 어떻게 생각하나요?', en: 'How does that person feel about me?' },
      { ko: '우리 관계가 앞으로 어떻게 흘러갈까요?', en: 'How will our relationship unfold?' },
    ],
  },
  {
    themeId: 'career-work',
    icon: '💼',
    questions: [
      { ko: '이직 타이밍이 언제가 좋을까요?', en: 'When is a good time to change jobs?' },
      {
        ko: '지금 커리어에서 집중할 포인트는?',
        en: 'What should I focus on in my career right now?',
      },
    ],
  },
  {
    themeId: 'money-finance',
    icon: '💰',
    questions: [
      { ko: '이번 달 재정 흐름은 어떤가요?', en: 'How will my finances look this month?' },
      { ko: '돈을 모으기 위해 지금 해야 할 일은?', en: 'What should I do now to build wealth?' },
    ],
  },
  {
    themeId: 'well-being-health',
    icon: '🌿',
    questions: [
      {
        ko: '몸과 마음의 균형을 어떻게 회복할까요?',
        en: 'How can I restore balance in mind and body?',
      },
      {
        ko: '지금 나에게 필요한 힐링은 무엇인가요?',
        en: 'What kind of healing do I need right now?',
      },
    ],
  },
  {
    themeId: 'spiritual-growth',
    icon: '🔮',
    questions: [
      { ko: '지금 배워야 할 영적 메시지는?', en: 'What spiritual lesson am I learning now?' },
      {
        ko: '내면의 성장을 위해 필요한 실천은?',
        en: 'What practice will support my inner growth?',
      },
    ],
  },
  {
    themeId: 'decisions-crossroads',
    icon: '⚖️',
    questions: [
      { ko: 'A와 B 중 나에게 맞는 선택은?', en: 'Which choice suits me better, A or B?' },
      { ko: '지금 결정을 내려도 될까요?', en: 'Is now the right time to decide?' },
    ],
  },
  {
    themeId: 'self-discovery',
    icon: '🧭',
    questions: [
      { ko: '내가 가진 숨은 강점은 무엇인가요?', en: 'What hidden strengths do I have?' },
      { ko: '나는 어떤 사람이 되고 싶은가요?', en: 'Who am I becoming?' },
    ],
  },
  {
    themeId: 'daily-reading',
    icon: '☀️',
    questions: [
      { ko: '오늘 하루의 키워드는 무엇인가요?', en: 'What is the key message for today?' },
      { ko: '이번 주 흐름은 어떤가요?', en: "What will this week's energy be like?" },
    ],
  },
]
