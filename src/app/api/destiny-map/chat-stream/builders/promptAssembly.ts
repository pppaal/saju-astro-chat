/**
 * Prompt Assembly
 *
 * 최종 프롬프트 조합 및 구성
 */

import type { ChatMessage } from '../lib/types';

export interface PromptSection {
  name: string;
  content: string;
  priority: number;
}

/**
 * 메시지 포맷팅
 */
function formatMessages(messages: ChatMessage[]): string {
  if (messages.length === 0) {
    return '';
  }

  return messages.map((m) => `${m.role}: ${m.content}`).join('\n');
}

/**
 * 최종 프롬프트 조합
 *
 * @param systemPrompt - 시스템 프롬프트
 * @param baseContext - 기본 컨텍스트 (사주/점성 데이터)
 * @param memoryContext - 장기 기억 컨텍스트
 * @param sections - 분석 섹션 배열
 * @param messages - 대화 히스토리
 * @param userQuestion - 사용자 질문
 * @returns 조합된 최종 프롬프트
 */
export function assembleFinalPrompt(params: {
  systemPrompt: string;
  baseContext: string;
  memoryContext: string;
  sections: PromptSection[];
  messages: ChatMessage[];
  userQuestion: string;
}): string {
  const {
    systemPrompt,
    baseContext,
    memoryContext,
    sections,
    messages,
    userQuestion,
  } = params;

  // 우선순위 정렬 (높은 우선순위가 먼저)
  const sortedSections = sections
    .filter((s) => s.content && s.content.trim().length > 0)
    .sort((a, b) => b.priority - a.priority);

  const parts: string[] = [];

  // 1. 시스템 프롬프트
  if (systemPrompt) {
    parts.push(systemPrompt);
  }

  // 2. 기본 데이터 컨텍스트
  if (baseContext) {
    parts.push(baseContext);
  }

  // 3. 장기 기억 컨텍스트
  if (memoryContext) {
    parts.push(memoryContext);
  }

  // 4. 분석 섹션들
  for (const section of sortedSections) {
    parts.push(section.content);
  }

  // 5. 대화 히스토리
  const formattedHistory = formatMessages(messages);
  if (formattedHistory) {
    parts.push('\n--- 대화 기록 ---');
    parts.push(formattedHistory);
  }

  // 6. 사용자 질문
  if (userQuestion) {
    parts.push('\n--- 사용자 질문 ---');
    parts.push(userQuestion);
  }

  return parts.filter(Boolean).join('\n\n');
}

/**
 * 섹션 우선순위 정의
 */
export const SECTION_PRIORITIES = {
  BASE_DATA: 100, // 기본 사주/점성 데이터
  TIMING: 90, // 타이밍 분석
  DAILY_PRECISION: 85, // 일진 정밀 분석
  DAEUN_TRANSIT: 80, // 대운-트랜짓
  TIER3_ASTRO: 75, // 고급 점성술
  TIER4_HARMONICS: 70, // 하모닉/이클립스
  LIFE_PREDICTION: 65, // 인생 예측
  PAST_ANALYSIS: 60, // 과거 분석
  DATE_RECOMMENDATION: 55, // 날짜 추천
  WEEKLY: 50, // 주간 예측
} as const;
