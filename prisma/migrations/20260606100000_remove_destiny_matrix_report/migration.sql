-- DestinyMatrixReport (옛 AI 프리미엄 리포트 — timing/themed score/grade 가짜
-- 등급 시스템) 영구 제거. 같은 PR 에서 코드측 잔재 (zodValidation schema 3개
-- + sibsinAnalysis 의 analyzeCareerAptitude / CareerAptitude / careerAptitudes
-- 필드) 도 정리.
--
-- 영향:
--   - DestinyMatrixReport 테이블 통째 DROP
--   - User.destinyMatrixReports relation 사라짐 (schema-level만, DB column 없음)
--
-- ⚠️ destructive: DestinyMatrixReport 테이블의 모든 row 영구 손실.
-- 머지 전 production DB count 수동 확인 필수.

DROP TABLE IF EXISTS "DestinyMatrixReport";
