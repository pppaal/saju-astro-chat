-- 직전 마이그레이션(20260616170000)이 NOT VALID 로 걸어둔 CHECK 제약을
-- 기존 행까지 확정(VALIDATE)한다. 그 전에 과거 드리프트로 제약을 위배하는
-- 기존 UserCredits 행을 유효 범위로 보정한다.
--
-- 보정 방향 = "일관성 우선": 이미 손상된 카운터를 유효 범위로 클램프한다.
-- usedCredits > monthlyCredits (과거 동시성 초과지출) 인 행은 한도까지만
-- 사용한 것으로 본다(사용자에게 한도 이상을 주지 않음). 음수는 0 으로.
--
--   - usedCredits  := GREATEST(0, LEAST(usedCredits, monthlyCredits))
--   - bonusCredits := GREATEST(0, bonusCredits)
--
-- raw SQL GREATEST/LEAST 패턴은 creditRefund.ts 에서 이미 쓰는 검증된 방식.
-- 멱등: 보정 UPDATE 는 이미 유효한 행엔 no-op, VALIDATE 는 아직 미검증
-- (pg_constraint.convalidated = false) 일 때만 실행 — phantom-apply 재실행 안전.

-- 1) 드리프트 행 보정 (제약 위배 행만 대상)
UPDATE "UserCredits"
SET "usedCredits" = GREATEST(0, LEAST("usedCredits", "monthlyCredits"))
WHERE "usedCredits" < 0 OR "usedCredits" > "monthlyCredits";

UPDATE "UserCredits"
SET "bonusCredits" = GREATEST(0, "bonusCredits")
WHERE "bonusCredits" < 0;

-- 2) NOT VALID 로 걸린 제약을 검증해 기존 행까지 불변식 확정 (멱등)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'UserCredits_usedCredits_nonneg' AND NOT convalidated
  ) THEN
    ALTER TABLE "UserCredits" VALIDATE CONSTRAINT "UserCredits_usedCredits_nonneg";
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'UserCredits_bonusCredits_nonneg' AND NOT convalidated
  ) THEN
    ALTER TABLE "UserCredits" VALIDATE CONSTRAINT "UserCredits_bonusCredits_nonneg";
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'UserCredits_used_within_monthly' AND NOT convalidated
  ) THEN
    ALTER TABLE "UserCredits" VALIDATE CONSTRAINT "UserCredits_used_within_monthly";
  END IF;
END $$;
