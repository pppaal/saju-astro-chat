// src/lib/Saju/index.ts

// 타입/상수
export * from './types';
export * from './constants';

// 원국 계산기
export { calculateSajuData } from './saju';

// 운세/캘린더
export { getDaeunCycles, getAnnualCycles, getMonthlyCycles, getIljinCalendar } from './unse';

// 관계(이미 구성해둔 함수만)
export { analyzeRelations, toAnalyzeInputFromSaju } from './relations';

// 신살: 이 파일(shinsal.ts)의 실존 함수만 선택적으로 공개
export {
  annotateShinsal,
  getTwelveStagesForPillars,      // 12운성
  getShinsalHits,                 // 신살 히트 리스트
  toSajuPillarsLike,              // 어댑터
  getTwelveShinsalSingleByPillar, // 표용: 일지 기준 12신살(각 기둥 1개)
  getLuckySingleByPillar,         // 표용: 길성(각 기둥 1개)
} from './shinsal';

// 타임존
export * from './timezone';