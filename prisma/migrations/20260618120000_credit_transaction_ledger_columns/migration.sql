-- Ledger SSOT 전환 Phase 0 — additive only. CreditTransaction 에 잔액=거래합
-- 모델을 위한 nullable 컬럼 + 인덱스를 추가한다. 전부 nullable 이고 현재 코드는
-- 읽지/쓰지 않으므로 기존 동작에 무영향. 롤백 = 컬럼/인덱스 drop.
-- 설계: docs/architecture/credit-ledger-redesign.md (Phase 0)
--
-- IF NOT EXISTS 로 멱등 — phantom-apply 재실행 안전 (레포 마이그레이션 관례).

-- AlterTable (nullable 컬럼)
ALTER TABLE "CreditTransaction" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);
ALTER TABLE "CreditTransaction" ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT;
ALTER TABLE "CreditTransaction" ADD COLUMN IF NOT EXISTS "lotId" TEXT;
ALTER TABLE "CreditTransaction" ADD COLUMN IF NOT EXISTS "period" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "CreditTransaction_idempotencyKey_key" ON "CreditTransaction"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "CreditTransaction_userId_pool_createdAt_idx" ON "CreditTransaction"("userId", "pool", "createdAt");
CREATE INDEX IF NOT EXISTS "CreditTransaction_lotId_idx" ON "CreditTransaction"("lotId");
CREATE INDEX IF NOT EXISTS "CreditTransaction_expiresAt_idx" ON "CreditTransaction"("expiresAt");
