-- One-time premium report purchases (Stripe Checkout, mode=payment).
-- Each row is a single purchase that unlocks exactly one report generation.
CREATE TABLE IF NOT EXISTS "PremiumReportPurchase" (
  "id"               TEXT NOT NULL,
  "userId"           TEXT NOT NULL,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL,
  "sku"              TEXT NOT NULL,
  "status"           TEXT NOT NULL DEFAULT 'pending',
  "stripeSessionId"  TEXT NOT NULL,
  "stripePriceId"    TEXT,
  "stripePaymentId"  TEXT,
  "amountPaid"       INTEGER,
  "currency"         TEXT,
  "expiresAt"        TIMESTAMP(3),
  "paidAt"           TIMESTAMP(3),
  "consumedAt"       TIMESTAMP(3),
  "consumedReportId" TEXT,

  CONSTRAINT "PremiumReportPurchase_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PremiumReportPurchase_stripeSessionId_key"
  ON "PremiumReportPurchase"("stripeSessionId");

CREATE INDEX IF NOT EXISTS "PremiumReportPurchase_userId_status_idx"
  ON "PremiumReportPurchase"("userId", "status");

CREATE INDEX IF NOT EXISTS "PremiumReportPurchase_userId_sku_status_idx"
  ON "PremiumReportPurchase"("userId", "sku", "status");

CREATE INDEX IF NOT EXISTS "PremiumReportPurchase_status_expiresAt_idx"
  ON "PremiumReportPurchase"("status", "expiresAt");

ALTER TABLE "PremiumReportPurchase"
  ADD CONSTRAINT "PremiumReportPurchase_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
