/**
 * Destiny Calendar — 타입 배럴 (type-only re-export).
 *
 * [마이그레이션 단계 5] 구 calendar 스코어링 엔진(scoring/transit-analysis/
 * public-api/date-analysis-orchestrator/grading/saju-temporal-scoring/analyzers
 * 등)은 삭제됐다. 라이브 캘린더는 v2 calendar-engine 으로 일원화됐고(src/lib/
 * calendar-engine/*, src/app/api/calendar/lib/cellsToImportantDates.ts), 구 엔진은
 * 라이브 호출처가 0이라 죽은 코드였다.
 *
 * 이 배럴에는 응답 타입 계층이 공유하는 타입만 남긴다. 실제 구현(함수/상수)은
 * 더 이상 re-export 하지 않는다 — 살아있는 상수/유틸은 ./calendar/constants,
 * ./calendar/utils 에서 직접 import 한다.
 */
export type {
  ImportanceGrade,
  EventCategory,
  ImportantDate,
  UserSajuProfile,
  UserAstroProfile,
  CalendarMonth,
} from './calendar/types'
