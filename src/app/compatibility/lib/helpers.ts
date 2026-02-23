/**
 * @file Compatibility page helper functions
 * Extracted from page.tsx for modularity
 */

import { getUserTimezone } from '@/lib/Saju/timezone'
import type { PersonForm, ParsedSection } from './types'
import { sectionPatterns } from './constants'
import { repairMojibakeText } from '@/lib/text/mojibake'

/**
 * Create an empty person form with optional defaults
 */
export const makeEmptyPerson = (defaults?: Partial<PersonForm>): PersonForm => ({
  name: '',
  date: '',
  time: '',
  cityQuery: '',
  lat: null,
  lon: null,
  timeZone: getUserTimezone() || 'Asia/Seoul',
  suggestions: [],
  showDropdown: false,
  ...(defaults || {}),
})

/**
 * Parse result text into sections for beautiful display
 */
export function parseResultSections(text: string): ParsedSection[] {
  const sections: ParsedSection[] = []

  // Split by common section markers
  const lines = text.split('\n')
  let currentSection: { title: string; icon: string; content: string[] } | null = null

  for (const line of lines) {
    const normalizedLine = repairMojibakeText(line)
    let foundSection = false

    for (const { pattern, icon, title } of sectionPatterns) {
      if (pattern.test(normalizedLine)) {
        if (currentSection && currentSection.content.length > 0) {
          sections.push({
            title: currentSection.title,
            icon: currentSection.icon,
            content: currentSection.content.join('\n').trim(),
          })
        }
        currentSection = { title, icon, content: [] }
        foundSection = true
        break
      }
    }

    if (!foundSection && normalizedLine.match(/^#{1,3}\s+.+/)) {
      // Generic heading
      if (currentSection && currentSection.content.length > 0) {
        sections.push({
          title: currentSection.title,
          icon: currentSection.icon,
          content: currentSection.content.join('\n').trim(),
        })
      }
      const headingText = normalizedLine.replace(/^#+\s*/, '').trim()
      currentSection = { title: headingText, icon: '\u2728', content: [] }
    } else if (currentSection) {
      currentSection.content.push(normalizedLine)
    } else if (normalizedLine.trim()) {
      // Content before any section header
      if (!currentSection) {
        currentSection = { title: 'Overview', icon: '\u{1F4AB}', content: [] }
      }
      currentSection.content.push(normalizedLine)
    }
  }

  // Add last section
  if (currentSection && currentSection.content.length > 0) {
    sections.push({
      title: currentSection.title,
      icon: currentSection.icon,
      content: currentSection.content.join('\n').trim(),
    })
  }

  return sections
}

/**
 * Extract score from text
 */
export function extractScore(text: string): number | null {
  const patterns = [
    /(\d{1,3})(?:\s*)?(?:%|\uC810|\/100|out of 100)/i,
    /(?:score|\uC810\uC218|compatibility|\uAD81\uD569)[\s:]*(\d{1,3})/i,
    /(\d{1,3})(?:\s*)?(?:percent|\uD37C\uC13C\uD2B8)/i,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      const score = Number.parseInt(match[1], 10)
      if (score >= 0 && score <= 100) {
        return score
      }
    }
  }
  return null
}
