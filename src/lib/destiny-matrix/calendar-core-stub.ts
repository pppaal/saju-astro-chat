/**
 * destiny-matrix/core 통째 제거 (Phase B Step 4) 후 캘린더가 type-only 로 사용하던
 * CalendarCoreAdapterResult 의 stub.
 *
 * 캘린더 route 가 calendarCoreCanonical = null 로 고정 → runtime 접근 0건.
 * 모든 코드가 optional chaining (canonicalCore?.X) + null fallback 이라 type 만
 * 통과시키면 안전. 정확한 shape 불필요.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CalendarCoreAdapterResult = any
