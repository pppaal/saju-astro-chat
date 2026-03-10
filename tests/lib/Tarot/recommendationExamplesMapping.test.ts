import { describe, it, expect } from 'vitest'
import { tarotThemeExamples } from '@/lib/Tarot/tarot-question-examples'
import { recommendSpreads } from '@/lib/Tarot/tarot-recommend'

describe('tarot example question mapping', () => {
  it('maps every example question to its intended theme', () => {
    const mismatches: Array<{ expectedTheme: string; actualTheme?: string; text: string }> = []

    for (const group of tarotThemeExamples) {
      for (const q of group.questions) {
        for (const text of [q.ko, q.en]) {
          const top = recommendSpreads(text, 1)[0]
          if (!top || top.themeId !== group.themeId) {
            mismatches.push({ expectedTheme: group.themeId, actualTheme: top?.themeId, text })
          }
        }
      }
    }

    expect(mismatches).toEqual([])
  })
})
