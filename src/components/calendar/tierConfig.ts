/* ============================================================
   destinypal 티어 표시 범위 토글 — 서버(buildDestinyView·page) 와
   클라이언트(DestinypalShell) 가 공유하는 단일 스위치.

   true  → 인생·10년·1년·1달·1일 5티어 전부. 캘린더도 1년치 빌드.
   false → 1달·1일만. 보고 있는 *그 달·그 날* 만 계산(저비용).

   이 상수 하나만 바꾸면 다음이 모두 따라온다:
     · DestinypalShell  — HIDDEN_TIERS (레일·줌 레이어)
     · buildDestinyView — toLifetime / toDecade / toYear 어셈블
     · calendar page    — getOrBuildCalendar 범위(그 달 ↔ 1년)
   ============================================================ */
export const SHOW_FULL_TIERS = false
