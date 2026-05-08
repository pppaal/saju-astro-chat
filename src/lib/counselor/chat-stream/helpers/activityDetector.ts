/**
 * Activity Detection Helper
 * Detects user activity intent from question text
 */

import type { ActivityType } from '@/lib/prediction/specificDateEngine';
import { ACTIVITY_KEYWORD_MAP, DATE_QUESTION_KEYWORDS } from '../constants';

/**
 * Detect activity type from question text
 * @param questionText - User's question text
 * @returns Detected activity type or null
 */
export function detectActivity(questionText: string): ActivityType | null {
  const questionLower = questionText.toLowerCase();

  for (const { keywords, activity } of ACTIVITY_KEYWORD_MAP) {
    if (keywords.some(kw => questionLower.includes(kw))) {
      return activity;
    }
  }

  return null;
}

/**
 * Check if question is asking about dates/timing
 * @param questionText - User's question text
 * @returns True if question is about dates
 */
export function isDateRelatedQuestion(questionText: string): boolean {
  const questionLower = questionText.toLowerCase();
  return DATE_QUESTION_KEYWORDS.some(kw => questionLower.includes(kw));
}

/**
 * Detect activity and check if it's a date question
 * @param questionText - User's question text
 * @returns Object with detected activity and isDateQuestion flag
 */
export function analyzeActivityIntent(questionText: string): {
  activity: ActivityType | null;
  isDateQuestion: boolean;
} {
  return {
    activity: detectActivity(questionText),
    isDateQuestion: isDateRelatedQuestion(questionText),
  };
}
