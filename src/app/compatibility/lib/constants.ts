/**
 * @file Compatibility page constants
 * Extracted from page.tsx for modularity
 */

import type { Relation } from './types'

export const relationIcons: Record<Relation, string> = {
  lover: '\u{1F495}',
  friend: '\u{1F91D}',
  other: '\u2728',
}

// Section title translation keys mapping
export const sectionTitleKeys: Record<string, string> = {
  'Overall Score': 'compatibilityPage.sections.overallScore',
  '종합 점수': 'compatibilityPage.sections.overallScore',
  'Saju Analysis': 'compatibilityPage.sections.sajuAnalysis',
  '사주 분석': 'compatibilityPage.sections.sajuAnalysis',
  'Astrology Analysis': 'compatibilityPage.sections.astrologyAnalysis',
  '점성 분석': 'compatibilityPage.sections.astrologyAnalysis',
  'Element Harmony': 'compatibilityPage.sections.elementHarmony',
  'Love Compatibility': 'compatibilityPage.sections.loveCompatibility',
  Communication: 'compatibilityPage.sections.communication',
  'Emotional Connection': 'compatibilityPage.sections.emotionalConnection',
  Strengths: 'compatibilityPage.sections.strengths',
  강점: 'compatibilityPage.sections.strengths',
  Challenges: 'compatibilityPage.sections.challenges',
  과제: 'compatibilityPage.sections.challenges',
  Advice: 'compatibilityPage.sections.advice',
  조언: 'compatibilityPage.sections.advice',
  Summary: 'compatibilityPage.sections.summary',
  요약: 'compatibilityPage.sections.summary',
  'Sun Sign': 'compatibilityPage.sections.sunSign',
  'Moon Sign': 'compatibilityPage.sections.moonSign',
  'Venus Aspect': 'compatibilityPage.sections.venusAspect',
  'Mars Aspect': 'compatibilityPage.sections.marsAspect',
  Overview: 'compatibilityPage.sections.overview',
  'Relationship Analysis': 'compatibilityPage.sections.relationshipAnalysis',
  '관계 분석': 'compatibilityPage.sections.relationshipAnalysis',
  'Detailed Scores': 'compatibilityPage.sections.detailedScores',
  '상세 점수': 'compatibilityPage.sections.detailedScores',
  'Cross-System Analysis': 'compatibilityPage.sections.crossSystemAnalysis',
  '교차 시스템 분석': 'compatibilityPage.sections.crossSystemAnalysis',
  'Plain-Language Compatibility Guide': 'compatibilityPage.sections.plainGuide',
  '한눈에 보는 궁합 해설': 'compatibilityPage.sections.plainGuide',
  'Personality & Emotional Fit': 'compatibilityPage.sections.personalityEmotionalFit',
  '성격/감정 궁합': 'compatibilityPage.sections.personalityEmotionalFit',
  'Intimacy Chemistry': 'compatibilityPage.sections.intimacyChemistry',
  '속궁합 & 친밀도': 'compatibilityPage.sections.intimacyChemistry',
  'Future Flow & Best Meeting Windows': 'compatibilityPage.sections.futureTiming',
  '미래 흐름 & 만남 타이밍': 'compatibilityPage.sections.futureTiming',
  'Scenario-Based Relationship Guide': 'compatibilityPage.sections.scenarioGuide',
  '상황별 관계 운영 가이드': 'compatibilityPage.sections.scenarioGuide',
}

// Section patterns with icons for parsing results
export const sectionPatterns = [
  {
    pattern:
      /(?:^|\n)#+\s*(?:Overall|\uCD1D\uD569|\uC885\uD569|\uC804\uCCB4)\s*(?:Score|\uC810\uC218|Compatibility|\uAD81\uD569)/i,
    icon: '\u{1F4AF}',
    title: 'Overall Score',
  },
  {
    pattern: /(?:^|\n)#+\s*(?:Saju|\uC0AC\uC8FC|Four Pillars)/i,
    icon: '\u262F\uFE0F',
    title: 'Saju Analysis',
  },
  {
    pattern: /(?:^|\n)#+\s*(?:Astrology|\uC810\uC131\uC220|Zodiac|Synastry)/i,
    icon: '\u2728',
    title: 'Astrology Analysis',
  },
  {
    pattern: /(?:^|\n)#+\s*(?:Element|\uC624\uD589)/i,
    icon: '\u{1F52E}',
    title: 'Element Harmony',
  },
  {
    pattern: /(?:^|\n)#+\s*(?:Love|\uC0AC\uB791|\uC5F0\uC560|Romance)/i,
    icon: '\u{1F495}',
    title: 'Love Compatibility',
  },
  {
    pattern: /(?:^|\n)#+\s*(?:Communication|\uC18C\uD1B5|\uB300\uD654)/i,
    icon: '\u{1F4AC}',
    title: 'Communication',
  },
  {
    pattern: /(?:^|\n)#+\s*(?:Emotion|\uAC10\uC815|Feeling)/i,
    icon: '\u{1F497}',
    title: 'Emotional Connection',
  },
  {
    pattern: /(?:^|\n)#+\s*(?:Strength|\uAC15\uC810|\uC7A5\uC810)/i,
    icon: '\u{1F4AA}',
    title: 'Strengths',
  },
  {
    pattern: /(?:^|\n)#+\s*(?:Challenge|\uB3C4\uC804|\uACFC\uC81C|\uC8FC\uC758)/i,
    icon: '\u26A1',
    title: 'Challenges',
  },
  {
    pattern: /(?:^|\n)#+\s*(?:Advice|\uC870\uC5B8|\uCD94\uCC9C)/i,
    icon: '\u{1F4A1}',
    title: 'Advice',
  },
  {
    pattern: /(?:^|\n)#+\s*(?:Summary|\uC694\uC57D|\uACB0\uB860)/i,
    icon: '\u{1F4DD}',
    title: 'Summary',
  },
  {
    pattern: /(?:^|\n)#+\s*(?:Sun|\uD0DC\uC591)/i,
    icon: '\u2600\uFE0F',
    title: 'Sun Sign',
  },
  {
    pattern: /(?:^|\n)#+\s*(?:Moon|\uB2EC|\uC6D4)/i,
    icon: '\u{1F319}',
    title: 'Moon Sign',
  },
  {
    pattern: /(?:^|\n)#+\s*(?:Venus|\uAE08\uC131)/i,
    icon: '\u{1F496}',
    title: 'Venus Aspect',
  },
  {
    pattern: /(?:^|\n)#+\s*(?:Mars|\uD654\uC131)/i,
    icon: '\u{1F525}',
    title: 'Mars Aspect',
  },
  {
    pattern: /(?:^|\n)#+\s*(?:Relationship|\uAD00\uACC4)\s*(?:Analysis|\uBD84\uC11D)/i,
    icon: '\u{1F491}',
    title: 'Relationship Analysis',
  },
  {
    pattern: /(?:^|\n)#+\s*(?:Detailed|\uC0C1\uC138)\s*(?:Scores?|\uC810\uC218)/i,
    icon: '\u{1F4CA}',
    title: 'Detailed Scores',
  },
  {
    pattern:
      /(?:^|\n)#+\s*(?:Cross(?:-|\s*)System|\uAD50\uCC28\s*\uC2DC\uC2A4\uD15C)\s*(?:Analysis|\uBD84\uC11D)?/i,
    icon: '\u{1F91D}',
    title: 'Cross-System Analysis',
  },
  {
    pattern:
      /(?:^|\n)#+\s*(?:Plain(?:-|\s*)Language\s*Compatibility\s*Guide|\uD55C\uB208\uC5D0\s*\uBCF4\uB294\s*\uAD81\uD569\s*\uD574\uC124)/i,
    icon: '\u{1F4D8}',
    title: 'Plain-Language Compatibility Guide',
  },
  {
    pattern:
      /(?:^|\n)#+\s*(?:Personality(?:\s*&\s*Emotional)?\s*(?:Fit)?|\uC131\uACA9\s*\/?\s*\uAC10\uC815\s*\uAD81\uD569)/i,
    icon: '\u{1F9E0}',
    title: 'Personality & Emotional Fit',
  },
  {
    pattern: /(?:^|\n)#+\s*(?:Intimacy(?:\s*Chemistry)?|\uC18D\uAD81\uD569|\uCE5C\uBC00\uB3C4)/i,
    icon: '\u{1F525}',
    title: 'Intimacy Chemistry',
  },
  {
    pattern:
      /(?:^|\n)#+\s*(?:Future(?:\s*Flow)?(?:\s*&\s*Best\s*Meeting\s*Windows)?|\uBBF8\uB798\s*\uD750\uB984|\uB9CC\uB0A8\s*\uD0C0\uC774\uBC0D)/i,
    icon: '\u{1F4C5}',
    title: 'Future Flow & Best Meeting Windows',
  },
  {
    pattern:
      /(?:^|\n)#+\s*(?:Scenario(?:-|\s*)Based\s*Relationship\s*Guide|\uC0C1\uD669\uBCC4\s*\uAD00\uACC4\s*\uC6B4\uC601\s*\uAC00\uC774\uB4DC)/i,
    icon: '\u{1F5FA}',
    title: 'Scenario-Based Relationship Guide',
  },
]
