import { describe, it, expect } from 'vitest'
import { deriveDaySummary } from '@/lib/calendar-engine/derivers/daySummary'

describe('deriveDaySummary', () => {
  const goods = ['표현·소통이 잘 통해요', '돈·실속 챙기기 좋아요']
  const cautions = ['경쟁심·지출이 늘기 쉬워요']

  it('positive tone (ko): opener + themes + caution + close', () => {
    const s = deriveDaySummary({ tone: 'positive', topReasons: goods, cautions, lang: 'ko' })
    expect(s).toContain('흐름이 잘 받쳐주는')
    expect(s).toContain('표현·소통이 잘 통해요 · 돈·실속 챙기기 좋아요')
    expect(s).toContain('다만')
    expect(s).toContain('밀어붙여')
  })

  it('caution tone (ko): careful opener + tidy close', () => {
    const s = deriveDaySummary({ tone: 'caution', topReasons: [], cautions, lang: 'ko' })
    expect(s).toContain('조심스러운 날')
    expect(s).toContain('정리·점검')
  })

  it('mixed tone (en): swings opener', () => {
    const s = deriveDaySummary({ tone: 'mixed', topReasons: goods, cautions, lang: 'en' })
    expect(s).toContain('day of swings')
    expect(s).toContain('That said')
  })

  it('strips arrows/labels from reasons', () => {
    const s = deriveDaySummary({
      tone: 'positive',
      topReasons: ['↑ 표현·소통이 잘 통해요 — 식신'],
      cautions: [],
      lang: 'ko',
    })
    expect(s).toContain('표현·소통이 잘 통해요')
    expect(s).not.toContain('↑')
    expect(s).not.toContain('식신')
  })

  it('is deterministic', () => {
    const a = deriveDaySummary({ tone: 'mixed', topReasons: goods, cautions, lang: 'ko' })
    const b = deriveDaySummary({ tone: 'mixed', topReasons: goods, cautions, lang: 'ko' })
    expect(a).toBe(b)
  })
})
