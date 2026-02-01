/**
 * @file Compatibility page constants
 * Extracted from page.tsx for modularity
 */

import type { Relation } from './types';

export const relationIcons: Record<Relation, string> = {
  lover: '💕',
  friend: '🤝',
  other: '✨',
};

// Section title translation keys mapping
export const sectionTitleKeys: Record<string, string> = {
  'Overall Score': 'compatibilityPage.sections.overallScore',
  'Saju Analysis': 'compatibilityPage.sections.sajuAnalysis',
  'Astrology Analysis': 'compatibilityPage.sections.astrologyAnalysis',
  'Element Harmony': 'compatibilityPage.sections.elementHarmony',
  'Love Compatibility': 'compatibilityPage.sections.loveCompatibility',
  'Communication': 'compatibilityPage.sections.communication',
  'Emotional Connection': 'compatibilityPage.sections.emotionalConnection',
  'Strengths': 'compatibilityPage.sections.strengths',
  'Challenges': 'compatibilityPage.sections.challenges',
  'Advice': 'compatibilityPage.sections.advice',
  'Summary': 'compatibilityPage.sections.summary',
  'Sun Sign': 'compatibilityPage.sections.sunSign',
  'Moon Sign': 'compatibilityPage.sections.moonSign',
  'Venus Aspect': 'compatibilityPage.sections.venusAspect',
  'Mars Aspect': 'compatibilityPage.sections.marsAspect',
  'Overview': 'compatibilityPage.sections.overview',
  'Relationship Analysis': 'compatibilityPage.sections.relationshipAnalysis',
  'Detailed Scores': 'compatibilityPage.sections.detailedScores',
};

// Section patterns with icons for parsing results
export const sectionPatterns = [
  { pattern: /(?:^|\n)#+\s*(?:Overall|총합|종합|전체)\s*(?:Score|점수|Compatibility|궁합)/i, icon: '💫', title: 'Overall Score' },
  { pattern: /(?:^|\n)#+\s*(?:Saju|사주|Four Pillars)/i, icon: '☯️', title: 'Saju Analysis' },
  { pattern: /(?:^|\n)#+\s*(?:Astrology|점성술|별자리|Zodiac)/i, icon: '✨', title: 'Astrology Analysis' },
  { pattern: /(?:^|\n)#+\s*(?:Element|오행|五行)/i, icon: '🔮', title: 'Element Harmony' },
  { pattern: /(?:^|\n)#+\s*(?:Love|사랑|연애|Romance)/i, icon: '💕', title: 'Love Compatibility' },
  { pattern: /(?:^|\n)#+\s*(?:Communication|소통|대화)/i, icon: '💬', title: 'Communication' },
  { pattern: /(?:^|\n)#+\s*(?:Emotion|감정|Feeling)/i, icon: '💗', title: 'Emotional Connection' },
  { pattern: /(?:^|\n)#+\s*(?:Strength|강점|장점)/i, icon: '💪', title: 'Strengths' },
  { pattern: /(?:^|\n)#+\s*(?:Challenge|도전|과제|주의)/i, icon: '⚡', title: 'Challenges' },
  { pattern: /(?:^|\n)#+\s*(?:Advice|조언|충고)/i, icon: '💡', title: 'Advice' },
  { pattern: /(?:^|\n)#+\s*(?:Summary|요약|결론)/i, icon: '📝', title: 'Summary' },
  { pattern: /(?:^|\n)#+\s*(?:Sun|태양)/i, icon: '☀️', title: 'Sun Sign' },
  { pattern: /(?:^|\n)#+\s*(?:Moon|달|월)/i, icon: '🌙', title: 'Moon Sign' },
  { pattern: /(?:^|\n)#+\s*(?:Venus|금성)/i, icon: '💖', title: 'Venus Aspect' },
  { pattern: /(?:^|\n)#+\s*(?:Mars|화성)/i, icon: '🔥', title: 'Mars Aspect' },
  { pattern: /(?:^|\n)#+\s*(?:Relationship|관계)\s*(?:Analysis|분석)/i, icon: '💑', title: 'Relationship Analysis' },
  { pattern: /(?:^|\n)#+\s*(?:Detailed|상세)\s*(?:Scores?|점수)/i, icon: '📊', title: 'Detailed Scores' },
];
