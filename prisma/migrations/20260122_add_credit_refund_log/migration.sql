-- Create CreditRefundLog table for automatic credit refunds
CREATE TABLE IF NOT EXISTS "CreditRefundLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "creditType" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "apiRoute" TEXT,
    "errorMessage" TEXT,
    "transactionId" TEXT,
    "metadata" JSONB
);

-- Create indexes for CreditRefundLog
CREATE INDEX IF NOT EXISTS "CreditRefundLog_userId_createdAt_idx" ON "CreditRefundLog"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "CreditRefundLog_creditType_createdAt_idx" ON "CreditRefundLog"("creditType", "createdAt");
CREATE INDEX IF NOT EXISTS "CreditRefundLog_apiRoute_createdAt_idx" ON "CreditRefundLog"("apiRoute", "createdAt");
