-- Add lifetime free-question counter for the realtime compatibility counselor.
-- First 2 questions per account are free; after that the route falls back to
-- the shared "reading" credit pool.

ALTER TABLE "UserCredits"
  ADD COLUMN IF NOT EXISTS "compatRealtimeFreeUsed" INTEGER NOT NULL DEFAULT 0;
