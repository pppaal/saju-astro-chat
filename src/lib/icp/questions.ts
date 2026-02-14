import { ICP_LIKERT_OPTIONS, ICP_V2_QUESTIONS } from '@/lib/icpTest/questions'

export type ICPOption = { id: string; text: string; textKo: string }
export type ICPQuestion = {
  id: string
  axis: 'dominance' | 'affiliation' | 'boundary' | 'resilience'
  text: string
  textKo: string
  reverse?: boolean
  options: ICPOption[]
}

const axisMap = {
  agency: 'dominance',
  warmth: 'affiliation',
  boundary: 'boundary',
  resilience: 'resilience',
} as const

export const icpQuestions: ICPQuestion[] = ICP_V2_QUESTIONS.map((q) => ({
  id: q.id,
  axis: axisMap[q.axis],
  text: q.text,
  textKo: q.textKo,
  reverse: q.reverse,
  options: ICP_LIKERT_OPTIONS.map((o) => ({ id: o.id, text: o.text, textKo: o.textKo })),
}))

export const TOTAL_ICP_QUESTIONS = icpQuestions.length
