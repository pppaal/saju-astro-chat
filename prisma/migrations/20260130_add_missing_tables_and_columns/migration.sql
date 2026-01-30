-- Add missing columns to User table
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailNotifications" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "referralCode" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "referrerId" TEXT;

-- CreateIndex (User)
CREATE UNIQUE INDEX IF NOT EXISTS "User_referralCode_key" ON "User"("referralCode");
CREATE INDEX IF NOT EXISTS "User_referrerId_idx" ON "User"("referrerId");

-- AddForeignKey (User self-referral)
DO $$ BEGIN
  ALTER TABLE "User" ADD CONSTRAINT "User_referrerId_fkey"
    FOREIGN KEY ("referrerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable: DailyFortune
CREATE TABLE IF NOT EXISTS "DailyFortune" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "loveScore" INTEGER NOT NULL,
    "careerScore" INTEGER NOT NULL,
    "wealthScore" INTEGER NOT NULL,
    "healthScore" INTEGER NOT NULL,
    "overallScore" INTEGER NOT NULL,
    "luckyColor" TEXT,
    "luckyNumber" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DailyFortune_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "DailyFortune_userId_date_key" ON "DailyFortune"("userId", "date");
CREATE INDEX IF NOT EXISTS "DailyFortune_userId_date_idx" ON "DailyFortune"("userId", "date");
DO $$ BEGIN
  ALTER TABLE "DailyFortune" ADD CONSTRAINT "DailyFortune_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable: UserInteraction
CREATE TABLE IF NOT EXISTS "UserInteraction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "theme" TEXT,
    "rating" INTEGER,
    "metadata" JSONB,
    CONSTRAINT "UserInteraction_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "UserInteraction_userId_createdAt_idx" ON "UserInteraction"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "UserInteraction_userId_service_idx" ON "UserInteraction"("userId", "service");
CREATE INDEX IF NOT EXISTS "UserInteraction_userId_theme_idx" ON "UserInteraction"("userId", "theme");
DO $$ BEGIN
  ALTER TABLE "UserInteraction" ADD CONSTRAINT "UserInteraction_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable: UserPreferences
CREATE TABLE IF NOT EXISTS "UserPreferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "preferredLanguage" TEXT NOT NULL DEFAULT 'en',
    "preferredThemes" JSONB,
    "preferredServices" JSONB,
    "notificationSettings" JSONB,
    "readingLength" TEXT NOT NULL DEFAULT 'medium',
    "tonePreference" TEXT NOT NULL DEFAULT 'casual',
    CONSTRAINT "UserPreferences_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "UserPreferences_userId_key" ON "UserPreferences"("userId");
DO $$ BEGIN
  ALTER TABLE "UserPreferences" ADD CONSTRAINT "UserPreferences_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable: ConsultationHistory
CREATE TABLE IF NOT EXISTS "ConsultationHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "theme" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "fullReport" TEXT NOT NULL,
    "jungQuotes" JSONB,
    "signals" JSONB,
    "userQuestion" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'ko',
    CONSTRAINT "ConsultationHistory_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ConsultationHistory_userId_createdAt_idx" ON "ConsultationHistory"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "ConsultationHistory_userId_theme_idx" ON "ConsultationHistory"("userId", "theme");
DO $$ BEGIN
  ALTER TABLE "ConsultationHistory" ADD CONSTRAINT "ConsultationHistory_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable: SectionFeedback
CREATE TABLE IF NOT EXISTS "SectionFeedback" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userHash" TEXT,
    "service" TEXT NOT NULL,
    "theme" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "helpful" BOOLEAN NOT NULL,
    "dayMaster" TEXT,
    "sunSign" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'ko',
    CONSTRAINT "SectionFeedback_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SectionFeedback_service_theme_idx" ON "SectionFeedback"("service", "theme");
CREATE INDEX IF NOT EXISTS "SectionFeedback_sectionId_helpful_idx" ON "SectionFeedback"("sectionId", "helpful");
CREATE INDEX IF NOT EXISTS "SectionFeedback_dayMaster_idx" ON "SectionFeedback"("dayMaster");
CREATE INDEX IF NOT EXISTS "SectionFeedback_createdAt_idx" ON "SectionFeedback"("createdAt");

-- CreateTable: PersonaMemory
CREATE TABLE IF NOT EXISTS "PersonaMemory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "dominantThemes" JSONB,
    "keyInsights" JSONB,
    "emotionalTone" TEXT,
    "growthAreas" JSONB,
    "lastTopics" JSONB,
    "recurringIssues" JSONB,
    "sessionCount" INTEGER NOT NULL DEFAULT 0,
    "birthChart" JSONB,
    "sajuProfile" JSONB,
    CONSTRAINT "PersonaMemory_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "PersonaMemory_userId_key" ON "PersonaMemory"("userId");
DO $$ BEGIN
  ALTER TABLE "PersonaMemory" ADD CONSTRAINT "PersonaMemory_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable: SavedPerson
CREATE TABLE IF NOT EXISTS "SavedPerson" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "relation" TEXT NOT NULL,
    "birthDate" TEXT,
    "birthTime" TEXT,
    "gender" TEXT,
    "birthCity" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "tzId" TEXT,
    "note" TEXT,
    CONSTRAINT "SavedPerson_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SavedPerson_userId_idx" ON "SavedPerson"("userId");
CREATE INDEX IF NOT EXISTS "SavedPerson_userId_relation_idx" ON "SavedPerson"("userId", "relation");

-- CreateTable: Subscription
CREATE TABLE IF NOT EXISTS "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "stripePriceId" TEXT,
    "status" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "billingCycle" TEXT,
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "paymentMethod" TEXT,
    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Subscription_stripeSubscriptionId_key" ON "Subscription"("stripeSubscriptionId");
CREATE INDEX IF NOT EXISTS "Subscription_userId_idx" ON "Subscription"("userId");
CREATE INDEX IF NOT EXISTS "Subscription_stripeCustomerId_idx" ON "Subscription"("stripeCustomerId");
CREATE INDEX IF NOT EXISTS "Subscription_status_idx" ON "Subscription"("status");
DO $$ BEGIN
  ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable: PremiumContentAccess
CREATE TABLE IF NOT EXISTS "PremiumContentAccess" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "service" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "contentId" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'ko',
    "metadata" JSONB,
    "creditUsed" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "PremiumContentAccess_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "PremiumContentAccess_userId_createdAt_idx" ON "PremiumContentAccess"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "PremiumContentAccess_userId_service_idx" ON "PremiumContentAccess"("userId", "service");
CREATE INDEX IF NOT EXISTS "PremiumContentAccess_service_contentType_idx" ON "PremiumContentAccess"("service", "contentType");
DO $$ BEGIN
  ALTER TABLE "PremiumContentAccess" ADD CONSTRAINT "PremiumContentAccess_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable: CounselorChatSession
CREATE TABLE IF NOT EXISTS "CounselorChatSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "theme" TEXT NOT NULL DEFAULT 'chat',
    "locale" TEXT NOT NULL DEFAULT 'ko',
    "messages" JSONB NOT NULL,
    "summary" TEXT,
    "keyTopics" JSONB,
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CounselorChatSession_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "CounselorChatSession_userId_updatedAt_idx" ON "CounselorChatSession"("userId", "updatedAt");
CREATE INDEX IF NOT EXISTS "CounselorChatSession_userId_theme_idx" ON "CounselorChatSession"("userId", "theme");
DO $$ BEGIN
  ALTER TABLE "CounselorChatSession" ADD CONSTRAINT "CounselorChatSession_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable: UserCredits
CREATE TABLE IF NOT EXISTS "UserCredits" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "monthlyCredits" INTEGER NOT NULL DEFAULT 1,
    "usedCredits" INTEGER NOT NULL DEFAULT 0,
    "bonusCredits" INTEGER NOT NULL DEFAULT 0,
    "totalBonusReceived" INTEGER NOT NULL DEFAULT 0,
    "compatibilityUsed" INTEGER NOT NULL DEFAULT 0,
    "followUpUsed" INTEGER NOT NULL DEFAULT 0,
    "compatibilityLimit" INTEGER NOT NULL DEFAULT 0,
    "followUpLimit" INTEGER NOT NULL DEFAULT 0,
    "periodStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "periodEnd" TIMESTAMP(3),
    "historyRetention" INTEGER NOT NULL DEFAULT 7,
    CONSTRAINT "UserCredits_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "UserCredits_userId_key" ON "UserCredits"("userId");
CREATE INDEX IF NOT EXISTS "UserCredits_plan_idx" ON "UserCredits"("plan");
CREATE INDEX IF NOT EXISTS "UserCredits_periodEnd_idx" ON "UserCredits"("periodEnd");
DO $$ BEGIN
  ALTER TABLE "UserCredits" ADD CONSTRAINT "UserCredits_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable: SavedCalendarDate
CREATE TABLE IF NOT EXISTS "SavedCalendarDate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "grade" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "summary" TEXT,
    "categories" JSONB NOT NULL,
    "bestTimes" JSONB,
    "sajuFactors" JSONB,
    "astroFactors" JSONB,
    "recommendations" JSONB,
    "warnings" JSONB,
    "birthDate" TEXT,
    "birthTime" TEXT,
    "birthPlace" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'ko',
    CONSTRAINT "SavedCalendarDate_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "SavedCalendarDate_userId_date_key" ON "SavedCalendarDate"("userId", "date");
CREATE INDEX IF NOT EXISTS "SavedCalendarDate_userId_date_idx" ON "SavedCalendarDate"("userId", "date");
CREATE INDEX IF NOT EXISTS "SavedCalendarDate_userId_year_idx" ON "SavedCalendarDate"("userId", "year");
DO $$ BEGIN
  ALTER TABLE "SavedCalendarDate" ADD CONSTRAINT "SavedCalendarDate_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable: BonusCreditPurchase
CREATE TABLE IF NOT EXISTS "BonusCreditPurchase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amount" INTEGER NOT NULL,
    "remaining" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "expired" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT NOT NULL DEFAULT 'purchase',
    "stripePaymentId" TEXT,
    CONSTRAINT "BonusCreditPurchase_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "BonusCreditPurchase_userId_idx" ON "BonusCreditPurchase"("userId");
CREATE INDEX IF NOT EXISTS "BonusCreditPurchase_userId_expired_idx" ON "BonusCreditPurchase"("userId", "expired");
CREATE INDEX IF NOT EXISTS "BonusCreditPurchase_expiresAt_idx" ON "BonusCreditPurchase"("expiresAt");

-- CreateTable: ReferralReward
CREATE TABLE IF NOT EXISTS "ReferralReward" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "referredUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creditsAwarded" INTEGER NOT NULL DEFAULT 3,
    "rewardType" TEXT NOT NULL DEFAULT 'signup_complete',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "ReferralReward_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ReferralReward_userId_referredUserId_rewardType_key" ON "ReferralReward"("userId", "referredUserId", "rewardType");
CREATE INDEX IF NOT EXISTS "ReferralReward_userId_idx" ON "ReferralReward"("userId");
CREATE INDEX IF NOT EXISTS "ReferralReward_referredUserId_idx" ON "ReferralReward"("referredUserId");
CREATE INDEX IF NOT EXISTS "ReferralReward_status_idx" ON "ReferralReward"("status");
DO $$ BEGIN
  ALTER TABLE "ReferralReward" ADD CONSTRAINT "ReferralReward_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable: TarotReading
CREATE TABLE IF NOT EXISTS "TarotReading" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "question" TEXT NOT NULL,
    "theme" TEXT,
    "spreadId" TEXT NOT NULL,
    "spreadTitle" TEXT NOT NULL,
    "cards" JSONB NOT NULL,
    "overallMessage" TEXT,
    "cardInsights" JSONB,
    "guidance" TEXT,
    "affirmation" TEXT,
    "source" TEXT NOT NULL DEFAULT 'standalone',
    "counselorSessionId" TEXT,
    "isSharedReading" BOOLEAN NOT NULL DEFAULT false,
    "sharedWithUserId" TEXT,
    "matchConnectionId" TEXT,
    "paidByUserId" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'ko',
    CONSTRAINT "TarotReading_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "TarotReading_userId_createdAt_idx" ON "TarotReading"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "TarotReading_userId_theme_idx" ON "TarotReading"("userId", "theme");
CREATE INDEX IF NOT EXISTS "TarotReading_sharedWithUserId_idx" ON "TarotReading"("sharedWithUserId");
CREATE INDEX IF NOT EXISTS "TarotReading_matchConnectionId_idx" ON "TarotReading"("matchConnectionId");
DO $$ BEGIN
  ALTER TABLE "TarotReading" ADD CONSTRAINT "TarotReading_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable: PushSubscription
CREATE TABLE IF NOT EXISTS "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "failCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");
CREATE INDEX IF NOT EXISTS "PushSubscription_userId_idx" ON "PushSubscription"("userId");
CREATE INDEX IF NOT EXISTS "PushSubscription_isActive_idx" ON "PushSubscription"("isActive");
DO $$ BEGIN
  ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable: EmailLog
CREATE TABLE IF NOT EXISTS "EmailLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "errorMsg" TEXT,
    "provider" TEXT NOT NULL,
    "messageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "EmailLog_userId_idx" ON "EmailLog"("userId");
CREATE INDEX IF NOT EXISTS "EmailLog_type_idx" ON "EmailLog"("type");
CREATE INDEX IF NOT EXISTS "EmailLog_createdAt_idx" ON "EmailLog"("createdAt");

-- CreateTable: PersonalityResult
CREATE TABLE IF NOT EXISTS "PersonalityResult" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "typeCode" TEXT NOT NULL,
    "personaName" TEXT NOT NULL,
    "avatarGender" TEXT NOT NULL DEFAULT 'M',
    "energyScore" INTEGER NOT NULL,
    "cognitionScore" INTEGER NOT NULL,
    "decisionScore" INTEGER NOT NULL,
    "rhythmScore" INTEGER NOT NULL,
    "consistencyScore" INTEGER,
    "analysisData" JSONB NOT NULL,
    "answers" JSONB,
    CONSTRAINT "PersonalityResult_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "PersonalityResult_userId_key" ON "PersonalityResult"("userId");
CREATE INDEX IF NOT EXISTS "PersonalityResult_typeCode_idx" ON "PersonalityResult"("typeCode");
CREATE INDEX IF NOT EXISTS "PersonalityResult_createdAt_idx" ON "PersonalityResult"("createdAt");
DO $$ BEGIN
  ALTER TABLE "PersonalityResult" ADD CONSTRAINT "PersonalityResult_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable: ICPResult
CREATE TABLE IF NOT EXISTS "ICPResult" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "primaryStyle" TEXT NOT NULL,
    "secondaryStyle" TEXT,
    "dominanceScore" INTEGER NOT NULL,
    "affiliationScore" INTEGER NOT NULL,
    "octantScores" JSONB NOT NULL,
    "analysisData" JSONB NOT NULL,
    "answers" JSONB,
    "locale" TEXT NOT NULL DEFAULT 'en',
    CONSTRAINT "ICPResult_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ICPResult_userId_createdAt_idx" ON "ICPResult"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "ICPResult_primaryStyle_idx" ON "ICPResult"("primaryStyle");
DO $$ BEGIN
  ALTER TABLE "ICPResult" ADD CONSTRAINT "ICPResult_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable: CompatibilityResult
CREATE TABLE IF NOT EXISTS "CompatibilityResult" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "person1UserId" TEXT,
    "person1Name" TEXT,
    "person1ICP" JSONB NOT NULL,
    "person1Persona" JSONB NOT NULL,
    "person2UserId" TEXT,
    "person2Name" TEXT,
    "person2ICP" JSONB NOT NULL,
    "person2Persona" JSONB NOT NULL,
    "icpCompatibility" JSONB NOT NULL,
    "personaCompatibility" JSONB NOT NULL,
    "crossSystemScore" INTEGER NOT NULL,
    "crossSystemAnalysis" JSONB NOT NULL,
    "person1Answers" JSONB,
    "person2Answers" JSONB,
    "locale" TEXT NOT NULL DEFAULT 'en',
    CONSTRAINT "CompatibilityResult_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "CompatibilityResult_userId_createdAt_idx" ON "CompatibilityResult"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "CompatibilityResult_person1UserId_idx" ON "CompatibilityResult"("person1UserId");
CREATE INDEX IF NOT EXISTS "CompatibilityResult_person2UserId_idx" ON "CompatibilityResult"("person2UserId");
DO $$ BEGIN
  ALTER TABLE "CompatibilityResult" ADD CONSTRAINT "CompatibilityResult_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable: DestinyMatrixReport
CREATE TABLE IF NOT EXISTS "DestinyMatrixReport" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "reportType" TEXT NOT NULL,
    "period" TEXT,
    "theme" TEXT,
    "reportData" JSONB NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "overallScore" INTEGER,
    "grade" TEXT,
    "pdfGenerated" BOOLEAN NOT NULL DEFAULT false,
    "pdfUrl" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'ko',
    CONSTRAINT "DestinyMatrixReport_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "DestinyMatrixReport_userId_createdAt_idx" ON "DestinyMatrixReport"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "DestinyMatrixReport_reportType_idx" ON "DestinyMatrixReport"("reportType");
CREATE INDEX IF NOT EXISTS "DestinyMatrixReport_period_idx" ON "DestinyMatrixReport"("period");
CREATE INDEX IF NOT EXISTS "DestinyMatrixReport_theme_idx" ON "DestinyMatrixReport"("theme");
DO $$ BEGIN
  ALTER TABLE "DestinyMatrixReport" ADD CONSTRAINT "DestinyMatrixReport_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable: MatchProfile
CREATE TABLE IF NOT EXISTS "MatchProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "displayName" TEXT NOT NULL,
    "bio" TEXT,
    "occupation" TEXT,
    "photos" JSONB NOT NULL DEFAULT '[]',
    "city" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "ageMin" INTEGER NOT NULL DEFAULT 18,
    "ageMax" INTEGER NOT NULL DEFAULT 99,
    "maxDistance" INTEGER NOT NULL DEFAULT 50,
    "genderPreference" TEXT NOT NULL DEFAULT 'all',
    "interests" JSONB NOT NULL DEFAULT '[]',
    "personalityType" TEXT,
    "personalityName" TEXT,
    "personalityScores" JSONB,
    "likesReceived" INTEGER NOT NULL DEFAULT 0,
    "likesGiven" INTEGER NOT NULL DEFAULT 0,
    "matchCount" INTEGER NOT NULL DEFAULT 0,
    "superLikeCount" INTEGER NOT NULL DEFAULT 3,
    "superLikeResetAt" TIMESTAMP(3),
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MatchProfile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "MatchProfile_userId_key" ON "MatchProfile"("userId");
CREATE INDEX IF NOT EXISTS "MatchProfile_isActive_isVisible_idx" ON "MatchProfile"("isActive", "isVisible");
CREATE INDEX IF NOT EXISTS "MatchProfile_city_idx" ON "MatchProfile"("city");
CREATE INDEX IF NOT EXISTS "MatchProfile_lastActiveAt_idx" ON "MatchProfile"("lastActiveAt");
DO $$ BEGIN
  ALTER TABLE "MatchProfile" ADD CONSTRAINT "MatchProfile_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable: MatchSwipe
CREATE TABLE IF NOT EXISTS "MatchSwipe" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "swiperId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "compatibilityScore" INTEGER,
    "isMatched" BOOLEAN NOT NULL DEFAULT false,
    "matchedAt" TIMESTAMP(3),
    CONSTRAINT "MatchSwipe_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "MatchSwipe_swiperId_targetId_key" ON "MatchSwipe"("swiperId", "targetId");
CREATE INDEX IF NOT EXISTS "MatchSwipe_swiperId_idx" ON "MatchSwipe"("swiperId");
CREATE INDEX IF NOT EXISTS "MatchSwipe_targetId_idx" ON "MatchSwipe"("targetId");
CREATE INDEX IF NOT EXISTS "MatchSwipe_action_idx" ON "MatchSwipe"("action");
CREATE INDEX IF NOT EXISTS "MatchSwipe_isMatched_idx" ON "MatchSwipe"("isMatched");
DO $$ BEGIN
  ALTER TABLE "MatchSwipe" ADD CONSTRAINT "MatchSwipe_swiperId_fkey"
    FOREIGN KEY ("swiperId") REFERENCES "MatchProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "MatchSwipe" ADD CONSTRAINT "MatchSwipe_targetId_fkey"
    FOREIGN KEY ("targetId") REFERENCES "MatchProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable: MatchConnection
CREATE TABLE IF NOT EXISTS "MatchConnection" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "user1Id" TEXT NOT NULL,
    "user2Id" TEXT NOT NULL,
    "compatibilityScore" INTEGER,
    "compatibilityData" JSONB,
    "status" TEXT NOT NULL DEFAULT 'active',
    "lastInteractionAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "chatStarted" BOOLEAN NOT NULL DEFAULT false,
    "isSuperLikeMatch" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "MatchConnection_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "MatchConnection_user1Id_user2Id_key" ON "MatchConnection"("user1Id", "user2Id");
CREATE INDEX IF NOT EXISTS "MatchConnection_user1Id_idx" ON "MatchConnection"("user1Id");
CREATE INDEX IF NOT EXISTS "MatchConnection_user2Id_idx" ON "MatchConnection"("user2Id");
CREATE INDEX IF NOT EXISTS "MatchConnection_status_idx" ON "MatchConnection"("status");
CREATE INDEX IF NOT EXISTS "MatchConnection_createdAt_idx" ON "MatchConnection"("createdAt");
DO $$ BEGIN
  ALTER TABLE "MatchConnection" ADD CONSTRAINT "MatchConnection_user1Id_fkey"
    FOREIGN KEY ("user1Id") REFERENCES "MatchProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "MatchConnection" ADD CONSTRAINT "MatchConnection_user2Id_fkey"
    FOREIGN KEY ("user2Id") REFERENCES "MatchProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable: MatchMessage
CREATE TABLE IF NOT EXISTS "MatchMessage" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "connectionId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "messageType" TEXT NOT NULL DEFAULT 'text',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    CONSTRAINT "MatchMessage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MatchMessage_connectionId_createdAt_idx" ON "MatchMessage"("connectionId", "createdAt");
CREATE INDEX IF NOT EXISTS "MatchMessage_senderId_idx" ON "MatchMessage"("senderId");
DO $$ BEGIN
  ALTER TABLE "MatchMessage" ADD CONSTRAINT "MatchMessage_connectionId_fkey"
    FOREIGN KEY ("connectionId") REFERENCES "MatchConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "MatchMessage" ADD CONSTRAINT "MatchMessage_senderId_fkey"
    FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
