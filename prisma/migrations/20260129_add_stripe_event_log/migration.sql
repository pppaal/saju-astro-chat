-- CreateTable
CREATE TABLE "StripeEventLog" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorMsg" TEXT,
    "metadata" JSONB,

    CONSTRAINT "StripeEventLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StripeEventLog_eventId_key" ON "StripeEventLog"("eventId");

-- CreateIndex
CREATE INDEX "StripeEventLog_type_processedAt_idx" ON "StripeEventLog"("type", "processedAt");

-- CreateIndex
CREATE INDEX "StripeEventLog_processedAt_idx" ON "StripeEventLog"("processedAt");
