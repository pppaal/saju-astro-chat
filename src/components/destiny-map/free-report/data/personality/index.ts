/**
 * Personality (성격) 도메인 해석 — 일간·십신·12운성·ASC·태양/달 등
 * 성격 차원의 raw 차원을 통합 정리.
 *
 * 본 폴더는 personalityAnalyzer.ts 에 인라인되어 있던 lookup 테이블을
 * 데이터 레이어로 분리한 사전. 같은 데이터를 다른 analyzer 에서도 재사용한다.
 */

export * from './sibsinPersonality';
export * from './ascendantImage';
export * from './sunMoonAspects';
export * from './mercuryThinking';
export * from './venusCommunication';
export * from './marsDecision';
export * from './moonStress';
export * from './elementConflict';
