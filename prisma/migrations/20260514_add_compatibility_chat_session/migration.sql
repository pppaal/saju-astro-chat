-- CompatibilityChatSession — persistent chat history for the realtime
-- counselor. One session per (userId, pairHash) so revisiting the same
-- two people resumes the prior conversation.

CREATE TABLE IF NOT EXISTS "CompatibilityChatSession" (
  "id"           TEXT NOT NULL,
  "userId"       TEXT NOT NULL,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL,
  "pairHash"     TEXT NOT NULL,
  "personA"      JSONB NOT NULL,
  "personB"      JSONB NOT NULL,
  "relation"     TEXT NOT NULL,
  "relationNote" TEXT,
  "messages"     JSONB NOT NULL,
  "turnCount"    INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "CompatibilityChatSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CompatibilityChatSession_userId_pairHash_key"
  ON "CompatibilityChatSession" ("userId", "pairHash");

CREATE INDEX IF NOT EXISTS "CompatibilityChatSession_userId_updatedAt_idx"
  ON "CompatibilityChatSession" ("userId", "updatedAt");

ALTER TABLE "CompatibilityChatSession"
  ADD CONSTRAINT "CompatibilityChatSession_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
