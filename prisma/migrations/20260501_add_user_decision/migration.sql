-- Decision Tracker (Tier 2B) — 사용자 결정 + 후속 검증 테이블
CREATE TABLE IF NOT EXISTS "UserDecision" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "decisionType" TEXT NOT NULL,
  "context" TEXT NOT NULL,
  "recommendedAction" TEXT,
  "tookAction" BOOLEAN,
  "decidedAt" TIMESTAMP(3),
  "reviewAt" TIMESTAMP(3),
  "outcome" TEXT,
  "outcomeNote" TEXT,
  "evaluatedAt" TIMESTAMP(3),
  "signalAtDecision" JSONB,
  CONSTRAINT "UserDecision_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "UserDecision_userId_createdAt_idx" ON "UserDecision"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "UserDecision_userId_outcome_idx" ON "UserDecision"("userId", "outcome");

ALTER TABLE "UserDecision"
  ADD CONSTRAINT "UserDecision_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;
