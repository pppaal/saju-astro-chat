-- Backfill CreditTransaction from historical data.
--
-- 20260529000000_add_credit_transaction 가 새 테이블을 만들어 deploy 시점부터
-- 의 mutation 은 모두 instrument 되지만, 과거 데이터(이전 결제·환불)는 비어
-- 있다. 이 마이그레이션은 기존 분산 로그에서 끌어와 GRANT / REFUND 행을 채워
-- 넣는다.
--
-- 범위:
--   1) BonusCreditPurchase  →  GRANT (BONUS).
--      Stripe 결제 / referral / promotion / gift / admin grant 모두 여기서
--      커버 — addBonusCredits 가 모든 경로의 단일 진입점이라 BCP 행이 1:1
--      로 남는다. AdminAuditLog 를 별도로 처리하지 않는 이유.
--   2) CreditRefundLog      →  REFUND (pool = creditType 별 매핑).
--      reading 환불은 BONUS / MONTHLY 어느 쪽이었는지 reconstruct 불가 →
--      MONTHLY 로 보수적. compatibility / followUp 은 명확히 매핑.
--
-- 범위 밖 (불가):
--   - CONSUME : 어디로 얼마 나갔는지 기록이 어디에도 없음. deploy 이후만 정확.
--   - EXPIRE  : 만료 cron 이 언제 flip 했는지 timestamp 가 없음.
--   - REVOKE  : Stripe 환불 시점 timestamp 가 BonusCreditPurchase 에 없음.
--   - SIGNUP_BONUS : initializeUserCredits 가 별도 row 안 남김 (UserCredits
--               직접 write). 사용자별 가입 시각으로 추정 가능하지만 위험.
--
-- 멱등성:
--   각 INSERT 는 NOT EXISTS 가드로 sourceRef 중복 시 스킵. Prisma migrate
--   자체도 한 번만 적용하지만 방어차원. Forward-instrumented 코드와의
--   sourceRef 포맷 충돌이 없도록 BCP / CRL ID 그대로 사용 (forward 도
--   동일 ID 를 sourceRef 에 쓰므로 사후 동일 BCP / CRL 에 대한 재기록은
--   자동으로 차단).
--
-- 트랜잭션:
--   전체를 한 트랜잭션으로. 한 단계 실패 시 모두 롤백 (운영 일관성).

BEGIN;

-- 1) BonusCreditPurchase → GRANT (BONUS)
--    sourceRef = stripePaymentId (있으면) || BonusCreditPurchase.id (없으면).
--    Forward (addBonusCredits) 도 `stripePaymentId ?? createdPurchaseId` 패턴
--    이라 sourceRef 포맷이 동일 → NOT EXISTS 가 중복 차단.
--    reason 도 forward 와 동일하게 `grant_<source>` 형태로 통일.
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
WHERE NOT EXISTS (
  SELECT 1 FROM "CreditTransaction" ct
  WHERE ct."sourceRef" = COALESCE(bcp."stripePaymentId", bcp."id")
    AND ct."type" = 'GRANT'
);

-- 2) CreditRefundLog → REFUND
--    sourceRef = CreditRefundLog.id (forward 의 transactionId 와 다른 키를
--    써서 충돌 방지 — forward 는 외부 transactionId 또는 null 을 쓰므로
--    백필이 CRL.id 를 쓰면 절대 겹치지 않음).
--    pool 매핑: compatibility → COMPATIBILITY, followUp → FOLLOWUP,
--    그 외 (reading 등) → MONTHLY (reading 환불 시 BONUS / MONTHLY 어느
--    쪽 풀에서 복원됐는지 reconstruct 불가 → 보수적으로 MONTHLY).
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
WHERE NOT EXISTS (
  SELECT 1 FROM "CreditTransaction" ct
  WHERE ct."sourceRef" = crl."id"
    AND ct."type" = 'REFUND'
);

COMMIT;
