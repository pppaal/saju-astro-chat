-- 추가 dead 모델 7개 제거 — 전체 DB 통합 감사 결과 (caller 0 + row 0 확인).
-- destiny-matrix 정리 (#1237) / 1차 dead 정리 (#1239) 와 같은 패턴.
--
-- 제거 대상:
--   - UserBlock / UserReport (destiny-match 잔재 — #1218 본체 제거 후 차단·신고
--     모델만 남았음)
--   - UserDecision (Decision Tracker Tier 2B — production caller 0)
--   - CompatibilityResult (ICP / Persona 궁합 결과 — ICP/Personality 모델 이미
--     #1239 에서 제거됨)
--   - PremiumContentAccess (옛 프리미엄 콘텐츠 로그 — UserCredits +
--     CreditTransaction 이 대체)
--   - SavedCalendarDate (날짜별 운세 score/grade — CalendarBuildCache +
--     NatalContextCache 가 대체)
--   - PushSubscription (웹 푸시 — 등록 라우트 / 발송 코드 0)
--
-- 보존:
--   - VerificationToken (NextAuth schema 요구사항 — authOptions adapter 가
--     create/useVerificationToken 정의)

DROP TABLE IF EXISTS "UserBlock";
DROP TABLE IF EXISTS "UserReport";
DROP TABLE IF EXISTS "UserDecision";
DROP TABLE IF EXISTS "CompatibilityResult";
DROP TABLE IF EXISTS "PremiumContentAccess";
DROP TABLE IF EXISTS "SavedCalendarDate";
DROP TABLE IF EXISTS "PushSubscription";
