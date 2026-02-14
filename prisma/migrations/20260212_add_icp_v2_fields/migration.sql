-- Add ICP v2 metadata fields
ALTER TABLE "ICPResult"
  ADD COLUMN IF NOT EXISTS "testVersion" TEXT NOT NULL DEFAULT 'icp_v2',
  ADD COLUMN IF NOT EXISTS "resultId" TEXT,
  ADD COLUMN IF NOT EXISTS "confidence" INTEGER,
  ADD COLUMN IF NOT EXISTS "axes" JSONB,
  ADD COLUMN IF NOT EXISTS "completionSeconds" INTEGER,
  ADD COLUMN IF NOT EXISTS "missingAnswerCount" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "ICPResult_testVersion_idx" ON "ICPResult"("testVersion");
CREATE INDEX IF NOT EXISTS "ICPResult_resultId_idx" ON "ICPResult"("resultId");
