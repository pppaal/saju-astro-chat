import { ICP_V2_QUESTIONS } from './questions'

type RawAnswers = Record<string, unknown>

function isLikert(value: unknown): boolean {
  if (value === 1 || value === 2 || value === 3 || value === 4 || value === 5) {
    return true
  }

  return value === '1' || value === '2' || value === '3' || value === '4' || value === '5'
}

function toAnswerRecord(value: unknown): RawAnswers | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  return value as RawAnswers
}

export function hasCompleteIcpV2Answers(value: unknown): boolean {
  const answers = toAnswerRecord(value)
  if (!answers) {
    return false
  }

  return ICP_V2_QUESTIONS.every((question) => isLikert(answers[question.id]))
}
