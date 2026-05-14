-- Drop the counselor routing `theme` column from tables that no longer
-- pre-route by topic (the LLM infers domain from context). DestinyMatrixReport
-- keeps its `theme` column because the themed premium-reports product still
-- uses it for user-selected themed reports.

-- UserInteraction
DROP INDEX IF EXISTS "UserInteraction_userId_theme_idx";
ALTER TABLE "UserInteraction" DROP COLUMN IF EXISTS "theme";

-- ConsultationHistory
DROP INDEX IF EXISTS "ConsultationHistory_userId_theme_idx";
DROP INDEX IF EXISTS "ConsultationHistory_userId_theme_createdAt_idx";
ALTER TABLE "ConsultationHistory" DROP COLUMN IF EXISTS "theme";

-- SectionFeedback
DROP INDEX IF EXISTS "SectionFeedback_service_theme_idx";
CREATE INDEX IF NOT EXISTS "SectionFeedback_service_idx" ON "SectionFeedback"("service");
ALTER TABLE "SectionFeedback" DROP COLUMN IF EXISTS "theme";

-- CounselorChatSession
DROP INDEX IF EXISTS "CounselorChatSession_userId_theme_idx";
ALTER TABLE "CounselorChatSession" DROP COLUMN IF EXISTS "theme";

-- TarotReading
DROP INDEX IF EXISTS "TarotReading_userId_theme_idx";
ALTER TABLE "TarotReading" DROP COLUMN IF EXISTS "theme";
