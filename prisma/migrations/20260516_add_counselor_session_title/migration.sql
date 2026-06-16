-- Add a user-editable chat title to CounselorChatSession. Nullable so
-- existing sessions stay valid; the sidebar already falls back to
-- summary / preview / id when title is null.
ALTER TABLE "CounselorChatSession" ADD COLUMN IF NOT EXISTS "title" TEXT;
