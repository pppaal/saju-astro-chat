import { pathToFileURL } from 'node:url'
import { questions, type PersonaQuestion } from '../src/lib/persona/questions'

const STEM_ENDINGS = ['때', '할 때', '면', '경우', '이라면'] as const
const FORBIDDEN_PATTERNS: Array<{ label: string; regex: RegExp }> = [
  { label: '조심하세요 계열', regex: /조심(?:하세요|해요|하)/ },
  { label: '피하세요 계열', regex: /피하(?:세요|는|면|고)/ },
  { label: '문제될 수 있어요 계열', regex: /문제될\s*수/ },
  { label: '운이 계열', regex: /운이/ },
]

type ViolationType = 'choice-count' | 'stem-ending' | 'choice-length' | 'forbidden-tone'

type AuditViolation = {
  questionId: string
  type: ViolationType
  message: string
}

function normalizeStem(text: string): string {
  return text.replace(/[.?!:;,\s]+$/g, '').trim()
}

function visibleLength(text: string): number {
  return text.replace(/\s+/g, '').length
}

function hasValidStemEnding(text: string): boolean {
  const stem = normalizeStem(text)
  return STEM_ENDINGS.some((ending) => stem.endsWith(ending))
}

function checkForbiddenTone(text: string): string[] {
  return FORBIDDEN_PATTERNS.filter((item) => item.regex.test(text)).map((item) => item.label)
}

export function auditPersonalityQuestions(inputQuestions: PersonaQuestion[]): AuditViolation[] {
  const violations: AuditViolation[] = []

  inputQuestions.forEach((question) => {
    if (question.options.length !== 3) {
      violations.push({
        questionId: question.id,
        type: 'choice-count',
        message: `선택지 수가 3개가 아닙니다 (${question.options.length}개).`,
      })
    }

    if (!hasValidStemEnding(question.textKo)) {
      violations.push({
        questionId: question.id,
        type: 'stem-ending',
        message: `질문 끝맺음이 허용 규칙과 다릅니다: "${question.textKo}"`,
      })
    }

    const lengths = question.options.map((option) => visibleLength(option.textKo))
    const average = lengths.reduce((sum, length) => sum + length, 0) / lengths.length
    const min = average * 0.8
    const max = average * 1.2

    question.options.forEach((option, index) => {
      const length = lengths[index]
      if (length < min || length > max) {
        violations.push({
          questionId: question.id,
          type: 'choice-length',
          message: `선택지 ${option.id} 길이 ${length}자가 평균 ${average.toFixed(1)}자의 ±20% 범위를 벗어납니다.`,
        })
      }
    })

    const chunks = [question.textKo, ...question.options.map((option) => option.textKo)]
    chunks.forEach((chunk) => {
      const matchedLabels = checkForbiddenTone(chunk)
      matchedLabels.forEach((label) => {
        violations.push({
          questionId: question.id,
          type: 'forbidden-tone',
          message: `금지된 어투(${label})가 포함되어 있습니다: "${chunk}"`,
        })
      })
    })
  })

  return violations
}

export function runAudit(): number {
  const violations = auditPersonalityQuestions(questions)

  if (violations.length === 0) {
    console.log(`[personality-audit] OK: ${questions.length}개 문항, 모든 규칙 통과`)
    return 0
  }

  console.error(`[personality-audit] FAILED: ${violations.length}개 위반`)
  violations.forEach((violation) => {
    console.error(`- [${violation.questionId}] (${violation.type}) ${violation.message}`)
  })
  return 1
}

const isDirectRun = process.argv[1]
  ? import.meta.url === pathToFileURL(process.argv[1]).href
  : false

if (isDirectRun) {
  process.exit(runAudit())
}
