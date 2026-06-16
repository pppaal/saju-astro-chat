-- Backfill CreditTransaction from historical data.
--
-- 드리프트 메모(2026-06-16): 이 백필이 참조하는 "CreditRefundLog" 는 이후
-- 마이그레이션 20260606130000_remove_dead_models_3 에서 DROP 된다. 스키마가
-- 최종 상태로 앞서간 DB(드리프트)에선 그 테이블이 이미 없어 INSERT 가
-- undefined_table 로 실패하고 전체 트랜잭션이 abort 됐다. 소스 테이블/컬럼이
-- 없으면 건너뛰도록 각 INSERT 를 DO 블록(undefined_table/undefined_column 무시)
-- 으로 감싼다. 백필은 과거 데이터 채우기용이라 소스가 없으면 채울 것도 없다.
--
-- 멱등성: 각 INSERT 는 NOT EXISTS(sourceRef) 가드로 중복 스킵.

-- 1) BonusCreditPurchase → GRANT (BONUS)
DO $$ BEGIN
  INSERT INTO "CreditTransaction" (
    "id", "userId", "type", "pool", "amount", "reason", "sourceRef", "metadata", "createdAt"
  )
  SELECT
    gen_random_uuid()::text,
    bcp."userId",
    'GRANT'::"CreditTxnType",
    'BONUS'::"CreditPool",
    bcp."amount",
    'grant_' || COALESCE(bcp."source", 'purchase'),
    COALESCE(bcp."stripePaymentId", bcp."id"),
    jsonb_build_object(
      'backfilled', true,
      'source', bcp."source",
      'purchaseId', bcp."id",
      'stripePaymentId', bcp."stripePaymentId",
      'expiresAt', bcp."expiresAt"
    ),
    bcp."createdAt"
  FROM "BonusCreditPurchase" bcp
  WHERE EXISTS (SELECT 1 FROM "User" u WHERE u."id" = bcp."userId")
    AND NOT EXISTS (
      SELECT 1 FROM "CreditTransaction" ct
      WHERE ct."sourceRef" = COALESCE(bcp."stripePaymentId", bcp."id")
        AND ct."type" = 'GRANT'
    );
EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
END $$;

-- 2) CreditRefundLog → REFUND (CreditRefundLog 가 이미 제거됐으면 skip)
DO $$ BEGIN
  INSERT INTO "CreditTransaction" (
    "id", "userId", "type", "pool", "amount", "reason", "sourceRef", "metadata", "createdAt"
  )
  SELECT
    gen_random_uuid()::text,
    crl."userId",
    'REFUND'::"CreditTxnType",
    CASE crl."creditType"
      WHEN 'compatibility' THEN 'COMPATIBILITY'::"CreditPool"
      WHEN 'followUp'      THEN 'FOLLOWUP'::"CreditPool"
      ELSE                      'MONTHLY'::"CreditPool"
    END,
    crl."amount",
    COALESCE(crl."reason", 'backfill_refund'),
    crl."id",
    jsonb_build_object(
      'backfilled', true,
      'creditRefundLogId', crl."id",
      'originalCreditType', crl."creditType",
      'apiRoute', crl."apiRoute"
    ),
    crl."createdAt"
  FROM "CreditRefundLog" crl
  WHERE EXISTS (SELECT 1 FROM "User" u WHERE u."id" = crl."userId")
    AND NOT EXISTS (
      SELECT 1 FROM "CreditTransaction" ct
      WHERE ct."sourceRef" = crl."id"
        AND ct."type" = 'REFUND'
    );
EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
END $$;
