import koLocale from '@/i18n/locales/ko/personality.json'
import enLocale from '@/i18n/locales/en/personality.json'
import { questions } from '@/lib/persona/questions'
import { runAudit } from '../../../scripts/audit-personality-questions'

const EXPECTED_QUESTION_IDS = [
  'q1_energy_network',
  'q2_energy_weekend',
  'q3_energy_spontaneous',
  'q4_energy_transit',
  'q5_energy_idealday',
  'q21_energy_focus',
  'q22_energy_solo_group',
  'q23_energy_interruptions',
  'q24_energy_events',
  'q25_energy_noise',
  'q6_cog_problem',
  'q7_cog_explain',
  'q8_cog_evaluate',
  'q9_cog_basis',
  'q10_cog_constraints',
  'q26_cog_detail_bigpicture',
  'q27_cog_rule_break',
  'q28_cog_metrics_story',
  'q29_cog_timehorizon',
  'q30_cog_changecomfort',
  'q11_decision_conflict',
  'q12_decision_feedback',
  'q13_decision_resources',
  'q14_decision_rules',
  'q15_decision_delay',
  'q31_decision_dataemotion',
  'q32_decision_feedback_tone',
  'q33_decision_risk',
  'q34_decision_delegate',
  'q35_decision_conflict_speed',
  'q16_rhythm_deadline',
  'q17_rhythm_change',
  'q18_rhythm_workstyle',
  'q19_rhythm_holiday',
  'q20_rhythm_feeling',
  'q36_rhythm_morning_evening',
  'q37_rhythm_planslack',
  'q38_rhythm_batching',
  'q39_rhythm_contextswitch',
  'q40_rhythm_deadtime',
] as const

type QuestionLocaleTable = Record<
  string,
  {
    text: string
    options: Record<'A' | 'B' | 'C', string>
  }
>

function expectLocaleQuestionKeys(localeQuestions: QuestionLocaleTable, localeName: string): void {
  EXPECTED_QUESTION_IDS.forEach((questionId) => {
    const entry = localeQuestions[questionId]
    expect(entry, `[${localeName}] ${questionId} 키가 없습니다.`).toBeDefined()
    expect(typeof entry.text, `[${localeName}] ${questionId}.text 타입이 올바르지 않습니다.`).toBe(
      'string'
    )
    expect(
      entry.text.length,
      `[${localeName}] ${questionId}.text 값이 비어 있습니다.`
    ).toBeGreaterThan(0)

    ;(['A', 'B', 'C'] as const).forEach((optionId) => {
      const value = entry.options?.[optionId]
      expect(
        value,
        `[${localeName}] ${questionId}.options.${optionId} 키가 없습니다.`
      ).toBeDefined()
      expect(
        typeof value,
        `[${localeName}] ${questionId}.options.${optionId} 타입이 올바르지 않습니다.`
      ).toBe('string')
      expect(
        value.length,
        `[${localeName}] ${questionId}.options.${optionId} 값이 비어 있습니다.`
      ).toBeGreaterThan(0)
    })
  })
}

describe('Persona question regression checks', () => {
  it('keeps question ids and per-question choice count unchanged', () => {
    expect(questions).toHaveLength(EXPECTED_QUESTION_IDS.length)
    expect(questions.map((question) => question.id)).toEqual(EXPECTED_QUESTION_IDS)
    questions.forEach((question) => {
      expect(question.options).toHaveLength(3)
      expect(question.options.map((option) => option.id)).toEqual(['A', 'B', 'C'])
    })
  })

  it('has required translation keys for ko/en personality question sets', () => {
    const koQuestions = (koLocale as { personality: { questions: QuestionLocaleTable } })
      .personality.questions
    const enQuestions = (enLocale as { personality: { questions: QuestionLocaleTable } })
      .personality.questions

    expectLocaleQuestionKeys(koQuestions, 'ko')
    expectLocaleQuestionKeys(enQuestions, 'en')
  })

  it('passes the personality question audit script', () => {
    expect(runAudit()).toBe(0)
  })
})
