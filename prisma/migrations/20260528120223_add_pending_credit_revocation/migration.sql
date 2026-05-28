-- Stripe webhook 순서 race 방어 (charge.refunded 가 checkout.session.completed
-- 보다 먼저 도착하는 케이스). refund webhook 이 매칭 purchase 못 찾으면 여기에
-- 기록 → purchase webhook 이 BonusCreditPurchase 만들고 즉시 매칭 확인 → 회수.
CREATE TABLE IF NOT EXISTS "PendingCreditRevocation" (
  "id" TEXT NOT NULL,
  "stripePaymentIntentId" TEXT NOT NULL,
  "refundAmountCents" INTEGER,
  "currency" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PendingCreditRevocation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PendingCreditRevocation_stripePaymentIntentId_key"
  ON "PendingCreditRevocation" ("stripePaymentIntentId");

CREATE INDEX IF NOT EXISTS "PendingCreditRevocation_expiresAt_idx"
  ON "PendingCreditRevocation" ("expiresAt");
