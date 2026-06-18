-- 크레딧 잔액 불변식을 DB CHECK 제약으로 강제 — 앱 코드(트랜잭션 관례)에만
-- 의존하던 방어를 가장 신뢰 가능한 층(DB)으로 끌어내린다. 어떤 경로든
-- 가드를 빠뜨리면 DB 가 쓰기를 거부하므로 "월간 음수 침범 / 잔액 드리프트"
-- 버그 클래스가 조용히 통과하지 못한다.
--
--   - usedCredits >= 0           : 사용량은 음수가 될 수 없다.
--   - bonusCredits >= 0          : 보너스 집계는 음수가 될 수 없다.
--   - usedCredits <= monthlyCredits : 월간 사용량이 월간 한도를 넘을 수 없다
--                                   (동시성 초과지출 = 무료 사용 방지).
--
-- NOT VALID: 과거 드리프트로 이미 위배된 기존 행이 있어도 마이그레이션이
-- 실패하지 않도록 초기 전체 스캔을 건너뛴다. 제약은 이후 모든 INSERT/UPDATE
-- 에는 그대로 적용된다(새 쓰기는 전부 가드). 데이터 정리 후 별도
-- `VALIDATE CONSTRAINT` 로 기존 행까지 확정할 수 있다.
--
-- DO 블록 + pg_constraint 존재 검사로 멱등 — phantom-apply 재실행 안전
-- (레포 마이그레이션 관례).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'UserCredits_usedCredits_nonneg'
  ) THEN
    ALTER TABLE "UserCredits"
      ADD CONSTRAINT "UserCredits_usedCredits_nonneg"
      CHECK ("usedCredits" >= 0) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'UserCredits_bonusCredits_nonneg'
  ) THEN
    ALTER TABLE "UserCredits"
      ADD CONSTRAINT "UserCredits_bonusCredits_nonneg"
      CHECK ("bonusCredits" >= 0) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'UserCredits_used_within_monthly'
  ) THEN
    ALTER TABLE "UserCredits"
      ADD CONSTRAINT "UserCredits_used_within_monthly"
      CHECK ("usedCredits" <= "monthlyCredits") NOT VALID;
  END IF;
END $$;
