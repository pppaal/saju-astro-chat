-- Supabase Manual Migration
-- Add UserInteraction and UserPreferences tables

-- Create UserInteraction table
CREATE TABLE IF NOT EXISTS "UserInteraction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "theme" TEXT,
    "rating" INTEGER,
    "metadata" JSONB
);

-- Create UserPreferences table
CREATE TABLE IF NOT EXISTS "UserPreferences" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL UNIQUE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "preferredLanguage" TEXT NOT NULL DEFAULT 'en',
    "preferredThemes" JSONB,
    "preferredServices" JSONB,
    "notificationSettings" JSONB,
    "readingLength" TEXT NOT NULL DEFAULT 'medium',
    "tonePreference" TEXT NOT NULL DEFAULT 'casual'
);

-- Create indexes for UserInteraction
CREATE INDEX IF NOT EXISTS "UserInteraction_userId_createdAt_idx" ON "UserInteraction"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "UserInteraction_userId_service_idx" ON "UserInteraction"("userId", "service");
CREATE INDEX IF NOT EXISTS "UserInteraction_userId_theme_idx" ON "UserInteraction"("userId", "theme");

-- Note: Foreign keys are not created due to relationMode = "prisma"
-- Prisma will handle referential integrity at the application level

-- Verify tables created
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('UserInteraction', 'UserPreferences');
