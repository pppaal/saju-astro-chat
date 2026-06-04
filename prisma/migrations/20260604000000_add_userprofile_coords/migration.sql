-- UserProfile 에 출생지 좌표(위도/경도) 추가.
-- 사주 진태양시(진경도) 보정과 점성 하우스 계산을 화면 간 일관되게 적용하기
-- 위함. 기존 row 는 NULL → 계산 시 한국 LMT 폴백(옛 동작)으로 안전.
ALTER TABLE "UserProfile" ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION;
ALTER TABLE "UserProfile" ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION;
