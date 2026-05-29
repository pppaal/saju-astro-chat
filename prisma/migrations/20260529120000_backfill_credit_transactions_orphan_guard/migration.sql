-- Fix-forward for 20260529110000_backfill_credit_transactions.
--
-- 원본 backfill 마이그레이션의 두 결함을 보완:
--
-- 1. **삭제된 유저의 orphan 행 FK 위반**
--    BonusCreditPurchase / CreditRefundLog 는 둘 다 User 로의 FK 가 없는
--    bare String 컬럼이라 유저 삭제 후에도 행이 남는다. CreditTransaction.
--    userId 는 User 로 FK CASCADE 라 orphan userId 를 INSERT 하면 FK 위반
--    으로 마이그레이션이 fail 한다. EXISTS 가드로 살아 있는 유저만 backfill.
--
-- 2. **명시적 BEGIN/COMMIT 중복**
--    Prisma 가 각 마이그레이션 파일을 자체 트랜잭션으로 감싸므로 파일 내부
--    의 BEGIN/COMMIT 은 nested transaction 으로 처리되어 환경에 따라
--    경고/실패 가능. 다른 마이그레이션과 동일 패턴(no explicit BEGIN/COMMIT)
--    으로 정렬.
--
-- 멱등성: 원본이 prod 에 성공 적용됐다면 NOT EXISTS 가드가 모든 행을 스킵
-- → no-op. 원본이 부분/실패 적용됐거나 사후에 새 BCP/CRL 행이 들어왔다면
-- 누락분만 채워 넣음. 둘 중 어느 경우든 안전.

-- 1) BonusCreditPurchase → GRANT (BONUS)
--    sourceRef = stripePaymentId (있으면) || BonusCreditPurchase.id (없으면).
--    Forward (addBonusCredits) 와 동일 sourceRef 포맷 → 사후 동일 BCP 에
--    대한 재기록도 자동 차단.
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
WHERE EXISTS (
  SELECT 1 FROM "User" u WHERE u."id" = bcp."userId"
)
AND NOT EXISTS (
  SELECT 1 FROM "CreditTransaction" ct
  WHERE ct."sourceRef" = COALESCE(bcp."stripePaymentId", bcp."id")
    AND ct."type" = 'GRANT'
);

-- 2) CreditRefundLog → REFUND
--    sourceRef = CreditRefundLog.id. Forward 는 외부 transactionId 또는
--    null 을 쓰므로 백필이 CRL.id 를 쓰면 절대 안 겹침.
--    pool 매핑: compatibility → COMPATIBILITY, followUp → FOLLOWUP,
--    그 외 (reading 등) → MONTHLY (reading 환불 시 어느 풀에서 복원됐는지
--    reconstruct 불가 → 보수적으로 MONTHLY).
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
WHERE EXISTS (
  SELECT 1 FROM "User" u WHERE u."id" = crl."userId"
)
AND NOT EXISTS (
  SELECT 1 FROM "CreditTransaction" ct
  WHERE ct."sourceRef" = crl."id"
    AND ct."type" = 'REFUND'
);
