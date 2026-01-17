/**
 * @file Compatibility page helper functions
 * Extracted from page.tsx for modularity
 */

import { getUserTimezone } from '@/lib/Saju/timezone';
import type { PersonForm, ParsedSection } from './types';
import { sectionPatterns } from './constants';

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
});

/**
 * Parse result text into sections for beautiful display
 */
export function parseResultSections(text: string): ParsedSection[] {
  const sections: ParsedSection[] = [];

  // Split by common section markers
  const lines = text.split('\n');
  let currentSection: { title: string; icon: string; content: string[] } | null = null;

  for (const line of lines) {
    let foundSection = false;

    for (const { pattern, icon, title } of sectionPatterns) {
      if (pattern.test(line)) {
        if (currentSection && currentSection.content.length > 0) {
          sections.push({
            title: currentSection.title,
            icon: currentSection.icon,
            content: currentSection.content.join('\n').trim(),
          });
        }
        currentSection = { title, icon, content: [] };
        foundSection = true;
        break;
      }
    }

    if (!foundSection && line.match(/^#{1,3}\s+.+/)) {
      // Generic heading
      if (currentSection && currentSection.content.length > 0) {
        sections.push({
          title: currentSection.title,
          icon: currentSection.icon,
          content: currentSection.content.join('\n').trim(),
        });
      }
      const headingText = line.replace(/^#+\s*/, '').trim();
      currentSection = { title: headingText, icon: '✨', content: [] };
    } else if (currentSection) {
      currentSection.content.push(line);
    } else if (line.trim()) {
      // Content before any section header
      if (!currentSection) {
        currentSection = { title: 'Overview', icon: '💫', content: [] };
      }
      currentSection.content.push(line);
    }
  }

  // Add last section
  if (currentSection && currentSection.content.length > 0) {
    sections.push({
      title: currentSection.title,
      icon: currentSection.icon,
      content: currentSection.content.join('\n').trim(),
    });
  }

  return sections;
}

/**
 * Extract score from text
 */
export function extractScore(text: string): number | null {
  const patterns = [
    /(\d{1,3})(?:\s*)?(?:%|점|\/100|out of 100)/i,
    /(?:score|점수|compatibility|궁합)[\s:]*(\d{1,3})/i,
    /(\d{1,3})(?:\s*)?(?:percent|퍼센트)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const score = parseInt(match[1], 10);
      if (score >= 0 && score <= 100) return score;
    }
  }
  return null;
}
