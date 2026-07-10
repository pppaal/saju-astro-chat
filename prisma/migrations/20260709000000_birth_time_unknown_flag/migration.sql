-- 출생 시각 미상 명시 플래그 — '00:00'(실제 자정 출생)과 "시간 모름"을 구분.
--
-- 왜 nullable 인가: 기존 행은 플래그가 보존된 적이 없어 '00:00' 이 자정인지
-- 미상인지 알 수 없다. NULL 로 두면 소비처(birthTimeAnchor SSOT)가 기존
-- 휴리스틱('00:00' = 미상)으로 폴백해 레거시 의미가 보존되고, 새 저장부터
-- true/false 가 명시돼 실제 자정 출생자가 올바르게 계산된다.
-- (DEFAULT false 백필은 금지 — 기존 시간모름 사용자가 전부 "자정 출생"으로
--  오분류되는 회귀가 난다.)

-- AlterTable
ALTER TABLE "UserProfile" ADD COLUMN "birthTimeUnknown" BOOLEAN;

-- AlterTable
ALTER TABLE "SavedPerson" ADD COLUMN "birthTimeUnknown" BOOLEAN;
