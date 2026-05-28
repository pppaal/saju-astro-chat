// destiny-matrix 라이브러리 — 대량 정리 후 남은 활성 모듈만.
// 이전엔 engine.ts + 다양한 derivers + interpreter/ + data/ + core/ 가 있었으나
// 캘린더가 모두 사용 안 함 (canonicalCore=null 고정). 외부 import 검증 후 통째 제거.
//
// 남은 활성 의존:
//   - types.ts            : DomainKey / DomainScore / MonthlyOverlapPoint / TimingCalibrationSummary 등 (캘린더 type)
//   - guidanceLanguage.ts : normalizeUserFacingGuidance (helpers.ts 사용)
//   - interpretation/     : humanSemantics 등 (캘린더 presentation 사용)
//   - calendar-core-stub  : CalendarCoreAdapterResult type stub
//   - predictionSnapshot  : persistDestinyPredictionSnapshot (calendar/route 동적 import)
//   - predictionLogging   : predictionSnapshot 의 type/함수 의존

export * from './types'
