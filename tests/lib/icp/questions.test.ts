import {
  icpQuestions,
  TOTAL_ICP_QUESTIONS,
  type ICPQuestion,
  type ICPOption,
} from '@/lib/icp/questions'
import { ICP_LIKERT_OPTIONS, ICP_V2_QUESTIONS } from '@/lib/icpTest/questions'

describe('TOTAL_ICP_QUESTIONS', () => {
  it('matches generated question length', () => {
    expect(TOTAL_ICP_QUESTIONS).toBe(icpQuestions.length)
  })

  it('matches source V2 question length', () => {
    expect(TOTAL_ICP_QUESTIONS).toBe(ICP_V2_QUESTIONS.length)
  })
})

describe('icpQuestions shape', () => {
  it('contains V2 IDs in order', () => {
    expect(icpQuestions.map((q) => q.id)).toEqual(ICP_V2_QUESTIONS.map((q) => q.id))
  })

  it('keeps exact source text mapping', () => {
    for (let i = 0; i < ICP_V2_QUESTIONS.length; i++) {
      expect(icpQuestions[i].text).toBe(ICP_V2_QUESTIONS[i].text)
      expect(icpQuestions[i].textKo).toBe(ICP_V2_QUESTIONS[i].textKo)
    }
  })

  it('maps four normalized axes', () => {
    const axes = new Set(icpQuestions.map((q) => q.axis))
    expect(axes).toEqual(new Set(['dominance', 'affiliation', 'boundary', 'resilience']))
  })

  it('keeps balanced five-per-axis distribution in V2', () => {
    const counts = icpQuestions.reduce(
      (acc, q) => {
        acc[q.axis] += 1
        return acc
      },
      { dominance: 0, affiliation: 0, boundary: 0, resilience: 0 }
    )
    expect(counts).toEqual({
      dominance: 5,
      affiliation: 5,
      boundary: 5,
      resilience: 5,
    })
  })

  it('uses current id convention', () => {
    for (const q of icpQuestions) {
      expect(q.id).toMatch(/^(ag|wa|bo|re)_\d{2}$/)
    }
  })
})

describe('options', () => {
  it('attaches the shared likert options to every question', () => {
    for (const q of icpQuestions) {
      expect(q.options).toHaveLength(ICP_LIKERT_OPTIONS.length)
      expect(q.options.map((o) => o.id)).toEqual(ICP_LIKERT_OPTIONS.map((o) => o.id))
    }
  })

  it('uses 1..5 option ids', () => {
    for (const q of icpQuestions) {
      expect(q.options.map((o) => o.id)).toEqual(['1', '2', '3', '4', '5'])
    }
  })

  it('keeps bilingual option labels', () => {
    for (const q of icpQuestions) {
      for (const opt of q.options) {
        expect(opt.text.length).toBeGreaterThan(0)
        expect(opt.textKo.length).toBeGreaterThan(0)
        expect(opt.text).not.toBe(opt.textKo)
      }
    }
  })
})

describe('bilingual content', () => {
  it('has korean characters in textKo', () => {
    for (const q of icpQuestions) {
      expect(q.textKo).toMatch(/[가-힣]/)
    }
  })

  it('does not leak korean chars in English text', () => {
    for (const q of icpQuestions) {
      expect(q.text).not.toMatch(/[가-힣]/)
    }
  })
})

describe('types', () => {
  it('ICPQuestion includes required fields', () => {
    const question: ICPQuestion = icpQuestions[0]
    expect(typeof question.id).toBe('string')
    expect(typeof question.axis).toBe('string')
    expect(typeof question.text).toBe('string')
    expect(typeof question.textKo).toBe('string')
    expect(Array.isArray(question.options)).toBe(true)
  })

  it('ICPOption includes required fields', () => {
    const option: ICPOption = icpQuestions[0].options[0]
    expect(typeof option.id).toBe('string')
    expect(typeof option.text).toBe('string')
    expect(typeof option.textKo).toBe('string')
  })
})
