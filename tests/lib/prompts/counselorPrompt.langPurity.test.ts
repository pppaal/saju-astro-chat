/**
 * Language-purity guard for the counselor SYSTEM prompts. The EN prompt's
 * instructions must not contain Hangul, and must reference the same English
 * data labels the EN context emits (e.g. == Participants ==, [conjunction],
 * daeun) — otherwise the model is told to look for Korean section names that
 * the English data no longer uses. Hanja (甲乙, 辛) is universal saju notation.
 */
import { describe, it, expect } from 'vitest'
import { buildDestinyCounselorPrompt } from '@/lib/prompts/destinyCounselorPrompt'
import { buildCompatibilityCounselorPrompt } from '@/lib/prompts/compatibilityCounselorPrompt'

const HANGUL = /[가-힣]/
const hangulLines = (s: string) =>
  s
    .split('\n')
    .filter((l) => HANGUL.test(l))
    .map((l) => l.trim())

describe('counselor system prompt language purity', () => {
  it('EN destiny prompt has no Hangul; KO does', () => {
    const en = buildDestinyCounselorPrompt('en')
    expect(hangulLines(en), `Hangul in EN destiny prompt:\n${hangulLines(en).join('\n')}`).toEqual(
      []
    )
    expect(HANGUL.test(buildDestinyCounselorPrompt('ko'))).toBe(true)
  })
  it('EN compatibility prompt has no Hangul; KO does', () => {
    const en = buildCompatibilityCounselorPrompt('en')
    expect(hangulLines(en), `Hangul in EN compat prompt:\n${hangulLines(en).join('\n')}`).toEqual(
      []
    )
    expect(HANGUL.test(buildCompatibilityCounselorPrompt('ko'))).toBe(true)
  })
  // Single-source compat prompts add SAJU_ONLY/ASTRO_ONLY scope + focus blocks;
  // their EN sides must stay Hangul-free too (the scope blocks were a new place
  // for Korean to leak into the English prompt).
  it.each([
    { saju: true, astro: false },
    { saju: false, astro: true },
  ])(
    'EN single-source compat prompt (saju=$saju astro=$astro) has no Hangul; KO does',
    (sources) => {
      const en = buildCompatibilityCounselorPrompt('en', sources)
      expect(
        hangulLines(en),
        `Hangul in EN compat prompt (${JSON.stringify(sources)}):\n${hangulLines(en).join('\n')}`
      ).toEqual([])
      expect(HANGUL.test(buildCompatibilityCounselorPrompt('ko', sources))).toBe(true)
    }
  )
})
