-- 6개 dead 모델 통째 제거 — 옛 페이지 (ICP / personality / daily-fortune /
-- consultation history / section feedback / user preferences) 제거 후
-- DB 모델만 잔재. 코드 caller 0 + production row 0 검증 완료.
--
-- destiny-matrix 정리 (PR #1237) 와 같은 패턴.

DROP TABLE IF EXISTS "DailyFortune";
DROP TABLE IF EXISTS "UserPreferences";
DROP TABLE IF EXISTS "ConsultationHistory";
DROP TABLE IF EXISTS "SectionFeedback";
DROP TABLE IF EXISTS "ICPResult";
DROP TABLE IF EXISTS "PersonalityResult";
