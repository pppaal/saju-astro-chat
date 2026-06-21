/**
 * Tests for compatibility page helper functions
 * src/app/compatibility/lib/helpers.ts
 */
import { describe, it, expect } from 'vitest'
import { makeEmptyPerson, parseResultSections, extractScore } from '@/app/compatibility/lib/helpers'

describe('compatibility helpers', () => {
  describe('makeEmptyPerson — 빈 폼 생성', () => {
    it('returns a fully blank person with sensible defaults', () => {
      const person = makeEmptyPerson()
      expect(person.name).toBe('')
      expect(person.date).toBe('')
      expect(person.time).toBe('')
      expect(person.cityQuery).toBe('')
      expect(person.lat).toBeNull()
      expect(person.lon).toBeNull()
      expect(person.suggestions).toEqual([])
      expect(person.showDropdown).toBe(false)
    })

    it('defaults timeZone to a non-empty IANA-style string', () => {
      const person = makeEmptyPerson()
      // getUserTimezone() in happy-dom may resolve, else falls back to Asia/Seoul.
      expect(typeof person.timeZone).toBe('string')
      expect(person.timeZone.length).toBeGreaterThan(0)
    })

    it('merges provided defaults over the blank base', () => {
      const person = makeEmptyPerson({
        name: 'Alice',
        date: '1990-01-01',
        time: '12:30',
        lat: 37.5,
        lon: 127.0,
        showDropdown: true,
        relation: 'lover',
      })
      expect(person.name).toBe('Alice')
      expect(person.date).toBe('1990-01-01')
      expect(person.time).toBe('12:30')
      expect(person.lat).toBe(37.5)
      expect(person.lon).toBe(127.0)
      expect(person.showDropdown).toBe(true)
      expect(person.relation).toBe('lover')
    })

    it('can override timeZone explicitly', () => {
      const person = makeEmptyPerson({ timeZone: 'America/New_York' })
      expect(person.timeZone).toBe('America/New_York')
    })

    it('treats an empty defaults object the same as no argument', () => {
      const a = makeEmptyPerson({})
      const b = makeEmptyPerson()
      expect(a).toEqual(b)
    })

    it('returns a new object on each call (no shared reference)', () => {
      const a = makeEmptyPerson()
      const b = makeEmptyPerson()
      expect(a).not.toBe(b)
      expect(a.suggestions).not.toBe(b.suggestions)
    })
  })

  describe('extractScore — 점수 추출', () => {
    it('extracts a percentage value', () => {
      expect(extractScore('Overall compatibility is 87%')).toBe(87)
    })

    it('extracts an /100 value', () => {
      expect(extractScore('Total: 92/100')).toBe(92)
    })

    it('extracts an "out of 100" value', () => {
      expect(extractScore('You scored 75 out of 100')).toBe(75)
    })

    it('extracts a labelled score (English "score")', () => {
      expect(extractScore('score: 64')).toBe(64)
    })

    it('extracts a "compatibility" labelled value', () => {
      expect(extractScore('compatibility 53')).toBe(53)
    })

    it('extracts a "percent" worded value', () => {
      expect(extractScore('roughly 41 percent match')).toBe(41)
    })

    it('extracts a Korean 점 suffixed value', () => {
      expect(extractScore('종합 80점')).toBe(80)
    })

    it('extracts a Korean 점수 labelled value', () => {
      expect(extractScore('점수: 70')).toBe(70)
    })

    it('returns null when no score is present', () => {
      expect(extractScore('No numbers about compatibility here')).toBeNull()
    })

    it('returns null when matched number exceeds 100', () => {
      // 250% does not satisfy 0..100 range, and there is no other valid match.
      expect(extractScore('A massive 250%')).toBeNull()
    })

    it('handles boundary value 100', () => {
      expect(extractScore('100%')).toBe(100)
    })

    it('handles boundary value 0', () => {
      expect(extractScore('0%')).toBe(0)
    })

    it('returns the first matching pattern when several could apply', () => {
      // The %/점/100 pattern is tried first and matches "88%".
      expect(extractScore('88% — score: 12')).toBe(88)
    })
  })

  describe('parseResultSections — 섹션 파싱', () => {
    it('returns an empty array for empty input', () => {
      expect(parseResultSections('')).toEqual([])
    })

    it('captures pre-section content under an Overview section', () => {
      const sections = parseResultSections('Just some intro text\nmore intro')
      expect(sections).toHaveLength(1)
      expect(sections[0].title).toBe('Overview')
      expect(sections[0].content).toContain('Just some intro text')
      expect(sections[0].content).toContain('more intro')
    })

    it('recognizes a known section pattern (Saju Analysis)', () => {
      const text = '## Saju Analysis\nThe pillars align nicely.'
      const sections = parseResultSections(text)
      expect(sections).toHaveLength(1)
      expect(sections[0].title).toBe('Saju Analysis')
      expect(sections[0].icon).toBe('☯️')
      // The matched header line starts a new section and is NOT part of the
      // body (consistent with the generic-heading branch).
      expect(sections[0].content).toBe('The pillars align nicely.')
    })

    it('recognizes the Korean Saju heading', () => {
      const text = '## 사주\nBody line.'
      const sections = parseResultSections(text)
      expect(sections).toHaveLength(1)
      expect(sections[0].title).toBe('Saju Analysis')
      expect(sections[0].content).toBe('Body line.')
    })

    it('splits multiple known sections', () => {
      const text = [
        '## Overall Score',
        '87/100 — great match.',
        '## Astrology Analysis',
        'Sun trine Sun.',
        '## Advice',
        'Communicate openly.',
      ].join('\n')
      const sections = parseResultSections(text)
      expect(sections.map((s) => s.title)).toEqual([
        'Overall Score',
        'Astrology Analysis',
        'Advice',
      ])
      // Header lines start sections and are excluded from section bodies.
      expect(sections[0].content).toBe('87/100 — great match.')
      expect(sections[1].content).toBe('Sun trine Sun.')
      expect(sections[2].content).toBe('Communicate openly.')
    })

    it('treats an unrecognized markdown heading as a generic section with sparkle icon', () => {
      const text = '## Random Custom Heading\nSome body.'
      const sections = parseResultSections(text)
      expect(sections).toHaveLength(1)
      expect(sections[0].title).toBe('Random Custom Heading')
      expect(sections[0].icon).toBe('✨')
      expect(sections[0].content).toBe('Some body.')
    })

    it('drops a known header section that has no body text', () => {
      // The header line no longer folds into content, so a header with no body
      // has empty content and is not flushed (nothing to display).
      const text = '## Advice'
      const sections = parseResultSections(text)
      expect(sections).toEqual([])
    })

    it('keeps content after the last known header (flushes final section)', () => {
      const text = '## Summary\nFinal thoughts here.'
      const sections = parseResultSections(text)
      expect(sections).toHaveLength(1)
      expect(sections[0].title).toBe('Summary')
      expect(sections[0].content).toBe('Final thoughts here.')
    })

    it('transitions from pre-section Overview content into a known section', () => {
      const text = ['Intro before any heading.', '## Strengths', 'Mutual trust.'].join('\n')
      const sections = parseResultSections(text)
      expect(sections).toHaveLength(2)
      expect(sections[0].title).toBe('Overview')
      expect(sections[0].content).toBe('Intro before any heading.')
      expect(sections[1].title).toBe('Strengths')
      expect(sections[1].content).toBe('Mutual trust.')
    })

    it('ignores blank lines that appear before any section header', () => {
      const text = '\n\n## Communication\nTalk it out.'
      const sections = parseResultSections(text)
      expect(sections).toHaveLength(1)
      expect(sections[0].title).toBe('Communication')
      expect(sections[0].content).toBe('Talk it out.')
    })
  })
})
