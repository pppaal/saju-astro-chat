-- 크레딧 변동 감사 테이블 — 모든 grant / consume / refund / expire / revoke
-- 이벤트가 행 하나씩 남기는 단일 시계열. 기존 분산 로그
-- (CreditRefundLog / AdminAuditLog / BonusCreditPurchase) 와 중복이지만,
-- 잔액 재현·정합성 감사·환불 분쟁 추적을 위해 별도 테이블로 둔다.
--
-- 완전 additive — 기존 테이블에 ALTER 하지 않으며, FK 는 새 테이블에서
-- User 로 가는 ON DELETE CASCADE 한 줄뿐. 운영 적용 시 락 없음.

-- 1) 트랜잭션 타입 enum
CREATE TYPE "CreditTxnType" AS ENUM (
  'GRANT',
  'CONSUME',
  'REFUND',
  'EXPIRE',
  'REVOKE',
  'SIGNUP_BONUS'
);

-- 2) 영향받는 잔액 풀 enum
CREATE TYPE "CreditPool" AS ENUM (
  'BONUS',
  'MONTHLY',
  'COMPATIBILITY',
  'FOLLOWUP'
);

-- 3) CreditTransaction 테이블
CREATE TABLE "CreditTransaction" (
  "id"        TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "type"      "CreditTxnType" NOT NULL,
  "pool"      "CreditPool" NOT NULL,
  "amount"    INTEGER NOT NULL,
  "reason"    TEXT NOT NULL,
  "sourceRef" TEXT,
  "metadata"  JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CreditTransaction_pkey" PRIMARY KEY ("id")
);

-- 4) FK → User (ON DELETE CASCADE: 계정 삭제 시 감사 행도 함께 제거)
ALTER TABLE "CreditTransaction"
  ADD CONSTRAINT "CreditTransaction_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 5) 인덱스
-- (userId, createdAt DESC) — 사용자 history 페이지 / 잔액 재현 쿼리.
CREATE INDEX "CreditTransaction_userId_createdAt_idx"
  ON "CreditTransaction" ("userId", "createdAt" DESC);
-- sourceRef — Stripe paymentId / purchaseId 로 역추적 (환불 분쟁 / 백필 idempotency).
CREATE INDEX "CreditTransaction_sourceRef_idx"
  ON "CreditTransaction" ("sourceRef");
-- (type, createdAt) — 타입별 운영 모니터링 (예: 일별 EXPIRE 총량).
CREATE INDEX "CreditTransaction_type_createdAt_idx"
  ON "CreditTransaction" ("type", "createdAt");
