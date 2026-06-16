-- Add `type` (service discriminator) + `meta` (type-specific JSON
-- context) to CounselorChatSession so the same model can carry both
-- destiny-counselor and compatibility-counselor chat history.
-- Existing rows are backfilled to type='destiny' via the column DEFAULT.
ALTER TABLE "CounselorChatSession"
  ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL DEFAULT 'destiny',
  ADD COLUMN IF NOT EXISTS "meta" JSONB;

-- Type-aware lookup for the past-chats sidebar.
CREATE INDEX IF NOT EXISTS "CounselorChatSession_userId_type_updatedAt_idx"
  ON "CounselorChatSession"("userId", "type", "updatedAt");
