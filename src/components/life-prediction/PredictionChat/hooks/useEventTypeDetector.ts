/**
 * 질문에서 EventType을 자동 감지하는 훅
 */

import { useMemo } from 'react';

export type EventType =
  | 'marriage'
  | 'career'
  | 'investment'
  | 'move'
  | 'study'
  | 'health'
  | 'relationship';

// 키워드 → EventType 매핑
const EVENT_KEYWORDS: Record<EventType, string[]> = {
  marriage: ['결혼', '혼인', '약혼', '배우자', '신부', '신랑', '웨딩', '프로포즈', '청첩장'],
  career: ['취업', '이직', '승진', '직장', '회사', '사업', '창업', '퇴직', '면접', '채용', '커리어', '진급'],
  investment: [
    '투자', '주식', '부동산', '재테크', '펀드', '코인', '암호화폐', '매매', '매수', '매도', '자산',
    '부자', '돈', '재물', '재산', '수입', '소득', '월급', '연봉', '로또', '복권', '대박', '횡재',
    '금전', '경제', '저축', '예금', '적금', '수익', '부업', '재정', '금융', '투잡',
  ],
  move: ['이사', '이주', '이민', '집', '아파트', '전세', '월세', '부동산계약', '입주'],
  study: ['공부', '시험', '유학', '자격증', '합격', '수능', '대학', '학교', '석사', '박사', '토익', '편입'],
  health: ['건강', '수술', '병원', '치료', '입원', '검진', '다이어트', '운동', '체력', '회복'],
  relationship: ['연애', '애인', '만남', '소개팅', '데이트', '썸', '고백', '이별', '재회', '짝'],
};

// EventType별 한글 라벨
export const EVENT_LABELS: Record<EventType, string> = {
  marriage: '결혼',
  career: '취업/이직',
  investment: '투자',
  move: '이사',
  study: '시험/학업',
  health: '건강',
  relationship: '연애',
};

// EventType별 아이콘 이모지
export const EVENT_ICONS: Record<EventType, string> = {
  marriage: '💍',
  career: '💼',
  investment: '📈',
  move: '🏠',
  study: '📚',
  health: '💪',
  relationship: '💕',
};

/**
 * 질문 텍스트에서 EventType을 감지
 */
export function detectEventType(question: string): EventType | null {
  const normalizedQuestion = question.toLowerCase();

  for (const [eventType, keywords] of Object.entries(EVENT_KEYWORDS) as [EventType, string[]][]) {
    for (const keyword of keywords) {
      if (normalizedQuestion.includes(keyword)) {
        return eventType;
      }
    }
  }

  return null;
}

/**
 * 질문에서 모든 관련 EventType들을 감지 (복수 가능)
 */
export function detectAllEventTypes(question: string): EventType[] {
  const normalizedQuestion = question.toLowerCase();
  const detectedTypes: EventType[] = [];

  for (const [eventType, keywords] of Object.entries(EVENT_KEYWORDS) as [EventType, string[]][]) {
    for (const keyword of keywords) {
      if (normalizedQuestion.includes(keyword)) {
        detectedTypes.push(eventType);
        break; // 해당 타입은 한 번만 추가
      }
    }
  }

  return detectedTypes;
}

/**
 * useEventTypeDetector 훅
 * 질문이 변경될 때마다 EventType을 자동 감지
 */
export function useEventTypeDetector(question: string) {
  const detectedType = useMemo(() => detectEventType(question), [question]);
  const allDetectedTypes = useMemo(() => detectAllEventTypes(question), [question]);

  return {
    detectedType,
    allDetectedTypes,
    label: detectedType ? EVENT_LABELS[detectedType] : null,
    icon: detectedType ? EVENT_ICONS[detectedType] : null,
    hasMatch: detectedType !== null,
  };
}

export default useEventTypeDetector;
