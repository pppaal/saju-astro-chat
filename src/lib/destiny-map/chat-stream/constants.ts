/**
 * Chat Stream Constants
 * Centralized constants for destiny-map chat-stream API
 */

import type { ActivityType } from '@/lib/prediction/specificDateEngine';

/**
 * Activity keyword mappings for detecting user intent
 */
export const ACTIVITY_KEYWORD_MAP: Array<{
  keywords: string[];
  activity: ActivityType;
}> = [
  { keywords: ['결혼', '혼례', '웨딩', 'marry', 'wedding', 'marriage'], activity: 'marriage' },
  { keywords: ['이사', 'move', '입주', 'relocation'], activity: 'moving' },
  { keywords: ['개업', '창업', 'business', 'start', 'open', '오픈'], activity: 'business' },
  { keywords: ['계약', 'contract', '서명', 'sign'], activity: 'contract' },
  { keywords: ['면접', 'interview', '취업'], activity: 'interview' },
  { keywords: ['투자', 'invest', '주식', 'stock', '부동산'], activity: 'investment' },
  { keywords: ['여행', 'travel', 'trip', '휴가'], activity: 'travel' },
  { keywords: ['수술', 'surgery', '치료', 'operation'], activity: 'surgery' },
  { keywords: ['미팅', 'meeting', '회의', '상담'], activity: 'meeting' },
  { keywords: ['고백', '프로포즈', 'propose', 'confession', '데이트'], activity: 'proposal' },
  { keywords: ['시험', '공부', 'exam', 'test', 'study', '학습'], activity: 'study' },
  { keywords: ['이직', 'job change', 'career change', '퇴사', '전직'], activity: 'career_change' },
  { keywords: ['협상', 'negotiation', '거래'], activity: 'negotiation' },
];

/**
 * Date-related keywords for detecting date recommendation questions
 */
export const DATE_QUESTION_KEYWORDS = [
  '언제', '날짜', '시기', '때', 'when', 'date', 'time', 'timing',
  '좋은 날', '길일', '최적', 'best day', 'good day', '추천'
];

/**
 * Past analysis keywords for detecting retrospective questions
 */
export const PAST_ANALYSIS_KEYWORDS = {
  ko: ['지난', '과거', '그때', '당시'],
  en: ['past', 'previous', 'back then', 'at that time'],
};

/**
 * Life prediction theme keywords
 */
export const LIFE_PREDICTION_THEMES = [
  'future',
  'life-plan',
  'career',
  'marriage',
  'investment',
  'money',
  'love',
  'general',
];
