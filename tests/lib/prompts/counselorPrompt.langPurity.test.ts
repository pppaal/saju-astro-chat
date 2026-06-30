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

  // 둘 다(both) 모드는 한쪽 시스템으로 쏠리지 않게 "각 시스템에서 최소 하나씩"
  // 균형 지시를 가져야 한다. 예전엔 EN both 만 이 지시가 비어(balanceEn='') 있어
  // EN 에서 "둘 다 선택 → 점성만 나옴" 이 났다. ko/en 둘 다 균형 지시 보장.
  it.each(['ko', 'en'] as const)(
    '%s destiny prompt (both sources) carries a both-systems balance instruction',
    (lang) => {
      const both = buildDestinyCounselorPrompt(lang, { saju: true, astro: true })
      const balanceRe =
        lang === 'ko'
          ? /사주에서 최소 하나.*점성에서 최소 하나|한 시스템만 쓰지 말/
          : /at least one signal from saju.*at least one from astrology|never lean on just one system/i
      expect(balanceRe.test(both), `missing both-systems balance rule in ${lang} prompt`).toBe(true)
    }
  )
})
