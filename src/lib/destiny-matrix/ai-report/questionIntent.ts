export type QuestionIntent = 'binary_decision' | 'open_guidance' | 'unknown'

const KO_BINARY = /(맞나|맞나요|괜찮나|괜찮을까|될까|해도 될까|가도 될까|맞냐)/i
const EN_BINARY_START =
  /^\s*(should i|can i|will it|is it right|is this right|is it okay|do i)\b/i
const EN_BINARY_INLINE = /\b(yes or no)\b/i

function normalizeQuestion(question?: string): string {
  return typeof question === 'string' ? question.trim() : ''
}

export function detectQuestionIntent(question?: string): QuestionIntent {
  const q = normalizeQuestion(question)
  if (!q) return 'unknown'
  if (KO_BINARY.test(q) || EN_BINARY_START.test(q) || EN_BINARY_INLINE.test(q)) {
    return 'binary_decision'
  }
  return 'open_guidance'
}

export function buildQuestionIntentInstruction(
  question: string | undefined,
  lang: 'ko' | 'en'
): string {
  const q = normalizeQuestion(question)
  if (!q) return ''

  const intent = detectQuestionIntent(q)
  if (lang === 'ko') {
    if (intent === 'binary_decision') {
      return [
        '## 사용자 질문 의도',
        `- 원문 질문: "${q}"`,
        '- 질문 유형: 예/아니오(결정형)',
        '- 작성 지시: 단순 Yes/No로 끝내지 말고, 반드시 "지금 해야 할 행동"과 "피해야 할 행동"을 구체적으로 제시하세요.',
        '- 행동 가이드는 오늘/이번주/이번달 순서로 실행 가능하게 제시하세요.',
      ].join('\n')
    }

    return [
      '## 사용자 질문 의도',
      `- 원문 질문: "${q}"`,
      '- 질문 유형: 개방형(방향/해석형)',
      '- 작성 지시: 핵심 흐름을 먼저 제시하고, 근거 기반 실행전략을 구체적으로 제시하세요.',
    ].join('\n')
  }

  if (intent === 'binary_decision') {
    return [
      '## User Question Intent',
      `- Original Question: "${q}"`,
      '- Type: Yes/No decision question',
      '- Instruction: Do not end with a simple yes/no. Provide concrete "what to do now" and "what to avoid".',
      '- Action guidance must be practical across today/this week/this month.',
    ].join('\n')
  }

  return [
    '## User Question Intent',
    `- Original Question: "${q}"`,
    '- Type: Open guidance question',
    '- Instruction: Lead with the core direction, then provide evidence-based practical strategy.',
  ].join('\n')
}
