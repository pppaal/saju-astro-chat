import { describe, expect, it } from 'vitest'
import { evaluateTarotInterpretationQuality } from '@/lib/Tarot/interpretationQuality'

const cards = [
  { name: 'The Chariot', position: 'Present' },
  { name: 'Strength', position: 'Near Future' },
  { name: 'The World', position: 'Outcome' },
]

describe('tarot interpretation quality benchmark', () => {
  it('keeps quality floor across backend, gpt fallback, and simple fallback tiers', () => {
    const backendQuality = evaluateTarotInterpretationQuality({
      language: 'en',
      cards,
      result: {
        overall_message:
          'Your spread shows controlled momentum. The Chariot in the present asks for disciplined focus, while Strength in the near future asks you to regulate intensity instead of forcing outcomes. The World as outcome indicates completion if you keep pace and close loops intentionally.',
        card_insights: [
          {
            position: 'Present',
            card_name: 'The Chariot',
            interpretation:
              'The Chariot points to active steering. You are not blocked; you are deciding where to direct finite effort. Keep one measurable objective per day and protect that block from context switching.',
          },
          {
            position: 'Near Future',
            card_name: 'Strength',
            interpretation:
              'Strength highlights emotional regulation. Progress will come from stable rhythm, not spikes. Use a short reset routine before key decisions so you respond from clarity instead of urgency.',
          },
          {
            position: 'Outcome',
            card_name: 'The World',
            interpretation:
              'The World confirms completion potential. Ship the current scope, capture lessons, and define the next cycle. Completion here is operational, not symbolic: close one chapter and then expand.',
          },
        ],
        guidance:
          '1) Today: write one concrete objective and one stop-doing rule. 2) This week: run a daily checkpoint with output metrics. 3) Within 7 days: review what moved and lock one repeatable routine.',
      },
    })

    const gptFallbackQuality = evaluateTarotInterpretationQuality({
      language: 'en',
      cards,
      result: {
        overall_message:
          'This reading suggests momentum with caution. You can make progress if you reduce noise and keep clear priorities. Your next week is about consistency and measured execution.',
        card_insights: [
          {
            position: 'Present',
            card_name: 'The Chariot',
            interpretation:
              'You have drive, but your result depends on where attention goes first.',
          },
          {
            position: 'Near Future',
            card_name: 'Strength',
            interpretation: 'Stability and patience protect decisions from overreaction.',
          },
          {
            position: 'Outcome',
            card_name: 'The World',
            interpretation: 'A complete cycle is possible if you stay disciplined.',
          },
        ],
        guidance: 'Keep one clear priority and review your progress with a simple weekly check.',
      },
    })

    const simpleFallbackQuality = evaluateTarotInterpretationQuality({
      language: 'en',
      cards,
      result: {
        overall_message: 'You drew The Chariot, Strength, and The World.',
        card_insights: [
          {
            position: 'Present',
            card_name: 'The Chariot',
            interpretation: 'Move forward with focus.',
          },
          {
            position: 'Near Future',
            card_name: 'Strength',
            interpretation: 'Be patient and calm.',
          },
          {
            position: 'Outcome',
            card_name: 'The World',
            interpretation: 'Completion is possible.',
          },
        ],
        guidance: 'Listen to the cards.',
        fallback: true,
      },
    })

    expect(backendQuality.overallScore).toBeGreaterThanOrEqual(85)
    expect(backendQuality.grade).toBe('A')

    expect(gptFallbackQuality.overallScore).toBeGreaterThanOrEqual(70)
    expect(['A', 'B']).toContain(gptFallbackQuality.grade)

    expect(simpleFallbackQuality.overallScore).toBeGreaterThanOrEqual(50)
    expect(simpleFallbackQuality.overallScore).toBeLessThan(70)
    expect(simpleFallbackQuality.grade).toBe('C')

    expect(backendQuality.overallScore).toBeGreaterThanOrEqual(gptFallbackQuality.overallScore)
    expect(gptFallbackQuality.overallScore).toBeGreaterThan(simpleFallbackQuality.overallScore)
  })

  it('flags encoding corruption and key leakage patterns', () => {
    const degraded = evaluateTarotInterpretationQuality({
      language: 'en',
      cards: [{ name: 'The Fool', position: 'Past' }],
      result: {
        overall_message: 'Hero Title \u00E2\u20AC\u201D keyword list subtitle',
        card_insights: [
          {
            position: 'Past',
            card_name: 'The Fool',
            interpretation: 'Short generic line.',
          },
        ],
        guidance: 'Listen to the cards.',
      },
    })

    expect(degraded.languageScore).toBeLessThan(70)
    expect(degraded.issues).toContain('contains mojibake/encoding artifacts')
    expect(degraded.issues).toContain('contains placeholder-like key text')
  })
})
