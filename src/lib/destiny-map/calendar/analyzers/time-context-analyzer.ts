/**
 * Time Context Analyzer - 시간 맥락 분석 모듈
 *
 * 과거/현재/미래 컨텍스트 및 회고적 분석을 담당합니다.
 */

import type { ImportanceGrade } from '../types';

// ═══════════════════════════════════════════════════════════
// 타입 정의
// ═══════════════════════════════════════════════════════════

export interface TimeContextInput {
  date: Date;
  grade: ImportanceGrade;
  gongmangStatus: { isEmpty: boolean };
  shinsalActive: Array<{ type: 'lucky' | 'unlucky' | 'special' }>;
  transitSync: { isMajorTransitYear: boolean; transitType?: string };
}

export interface TimeContextResult {
  isPast: boolean;
  isFuture: boolean;
  isToday: boolean;
  daysFromToday: number;
  retrospectiveNote?: string;
}

// ═══════════════════════════════════════════════════════════
// 시간 맥락 분석 함수
// ═══════════════════════════════════════════════════════════

export function analyzeTimeContext(input: TimeContextInput): TimeContextResult {
  const { date, grade, gongmangStatus, shinsalActive, transitSync } = input;

  const now = new Date();
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const targetUtc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const daysFromToday = Math.round((targetUtc - todayUtc) / (1000 * 60 * 60 * 24));

  const isPast = daysFromToday < 0;
  const isFuture = daysFromToday > 0;
  const isToday = daysFromToday === 0;

  // 과거 날짜에 대한 회고적 분석 노트 생성
  let retrospectiveNote: string | undefined;

  if (isPast) {
    if (grade <= 1) {
      retrospectiveNote = '이 날은 매우 좋은 기운이 있었습니다. 주요 성과나 좋은 일이 있었을 가능성이 높습니다.';
    } else if (grade >= 4) {
      retrospectiveNote = '이 날은 도전적인 기운이 있었습니다. 어려움이나 장애물이 있었을 수 있습니다.';
    } else if (gongmangStatus.isEmpty) {
      retrospectiveNote = '공망이 활성화된 날이었습니다. 계획했던 일이 예상대로 진행되지 않았을 수 있습니다.';
    } else if (shinsalActive.some(s => s.type === 'lucky')) {
      retrospectiveNote = '길신이 활성화된 날이었습니다. 예상치 못한 도움이나 행운이 있었을 수 있습니다.';
    } else if (transitSync.isMajorTransitYear) {
      retrospectiveNote = `${transitSync.transitType} 주기의 해였습니다. 인생의 중요한 전환점이었을 수 있습니다.`;
    }
  }

  return {
    isPast,
    isFuture,
    isToday,
    daysFromToday,
    retrospectiveNote,
  };
}
