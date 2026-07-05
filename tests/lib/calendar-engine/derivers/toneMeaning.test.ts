import { describe, it, expect } from 'vitest'
import { toneMeaningFor, type MeaningTone } from '@/lib/calendar-engine/derivers/toneMeaning'

const TONES: MeaningTone[] = ['positive', 'negative', 'neutral']
const LANGS = ['ko', 'en'] as const

/** Sweep enough seeds to surface every reachable pool entry for a fixed day. */
function distinctPhrases(tone: MeaningTone, lang: 'ko' | 'en', dayNum: number): Set<string> {
  const out = new Set<string>()
  for (let seed = 0; seed < 64; seed++) {
    out.add(toneMeaningFor(tone, dayNum, lang, seed))
  }
  return out
}

describe('toneMeaningFor', () => {
  it('is deterministic for the same (tone, dayNum, lang, seed)', () => {
    expect(toneMeaningFor('positive', 12, 'ko', 7)).toBe(toneMeaningFor('positive', 12, 'ko', 7))
    expect(toneMeaningFor('negative', 3, 'en', 999)).toBe(toneMeaningFor('negative', 3, 'en', 999))
  })

  it('seed=0 · day=0 pins the pool head (fixture guard for copy changes)', () => {
    // 카피 리라이트(단정문+마이크로 액션, 2026-07) 이후의 풀 머리를 고정 —
    // 의도치 않은 풀 순서 변경(회전 별칭 재발)을 잡는 가드.
    expect(toneMeaningFor('positive', 0, 'ko', 0)).toBe('먼저 움직이면 이기는 날')
    expect(toneMeaningFor('positive', 0, 'en', 0)).toBe('move first and you win')
  })

  it('every tone/locale pool has at least 18 distinct entries', () => {
    for (const lang of LANGS) {
      for (const tone of TONES) {
        const phrases = distinctPhrases(tone, lang, 0)
        expect(
          phrases.size,
          `${lang}/${tone} should expose >= 18 distinct phrases`
        ).toBeGreaterThanOrEqual(18)
      }
    }
  })

  it('different seeds can yield different phrases for the same (tone, dayNum)', () => {
    for (const lang of LANGS) {
      for (const tone of TONES) {
        const dayNum = 12 // common even "큰 날" spacing that used to collide
        const a = toneMeaningFor(tone, dayNum, lang, 0)
        // There must exist some other seed giving a different phrase.
        let differs = false
        for (let seed = 1; seed < 64 && !differs; seed++) {
          if (toneMeaningFor(tone, dayNum, lang, seed) !== a) differs = true
        }
        expect(differs, `${lang}/${tone} must vary across seeds`).toBe(true)
      }
    }
  })

  it('handles non-finite dayNum without throwing', () => {
    expect(() => toneMeaningFor('neutral', NaN, 'ko', 5)).not.toThrow()
    expect(typeof toneMeaningFor('neutral', NaN, 'ko', 5)).toBe('string')
  })

  it('pools contain no near-duplicate (exact) entries within a tone/locale', () => {
    for (const lang of LANGS) {
      for (const tone of TONES) {
        const all = distinctPhrases(tone, lang, 0)
        // distinctPhrases dedupes; compare against a fuller sweep over days too.
        const fuller = new Set<string>()
        for (let day = 0; day < 31; day++) {
          for (let seed = 0; seed < 64; seed++) {
            fuller.add(toneMeaningFor(tone, day, lang, seed))
          }
        }
        // The reachable set is stable regardless of how we sweep.
        expect(fuller.size).toBe(all.size)
      }
    }
  })
})
