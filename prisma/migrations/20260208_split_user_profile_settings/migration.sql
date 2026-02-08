-- CreateTable: UserProfile (사용자 프로필 정보)
CREATE TABLE "UserProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "profilePhoto" TEXT,
    "birthDate" TEXT,
    "birthTime" TEXT,
    "gender" TEXT,
    "birthCity" TEXT,
    "tzId" TEXT,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable: UserSettings (사용자 설정)
CREATE TABLE "UserSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "emailNotifications" BOOLEAN NOT NULL DEFAULT false,
    "referralCode" TEXT,

    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_userId_key" ON "UserProfile"("userId");
CREATE INDEX "UserProfile_birthDate_idx" ON "UserProfile"("birthDate");

CREATE UNIQUE INDEX "UserSettings_userId_key" ON "UserSettings"("userId");
CREATE UNIQUE INDEX "UserSettings_referralCode_key" ON "UserSettings"("referralCode");
CREATE INDEX "UserSettings_referralCode_idx" ON "UserSettings"("referralCode");

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate existing data from User to UserProfile
INSERT INTO "UserProfile" ("id", "userId", "createdAt", "updatedAt", "profilePhoto", "birthDate", "birthTime", "gender", "birthCity", "tzId")
SELECT
    gen_random_uuid()::text,
    "id",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    "profilePhoto",
    "birthDate",
    "birthTime",
    "gender",
    "birthCity",
    "tzId"
FROM "User"
WHERE "birthDate" IS NOT NULL
   OR "birthTime" IS NOT NULL
   OR "profilePhoto" IS NOT NULL
   OR "gender" IS NOT NULL
   OR "birthCity" IS NOT NULL
   OR "tzId" IS NOT NULL;

-- Migrate existing data from User to UserSettings
INSERT INTO "UserSettings" ("id", "userId", "createdAt", "updatedAt", "emailNotifications", "referralCode")
SELECT
    gen_random_uuid()::text,
    "id",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    "emailNotifications",
    "referralCode"
FROM "User"
WHERE "emailNotifications" = true
   OR "referralCode" IS NOT NULL;

-- Drop old columns from User table (after data migration)
ALTER TABLE "User" DROP COLUMN IF EXISTS "profilePhoto";
ALTER TABLE "User" DROP COLUMN IF EXISTS "birthDate";
ALTER TABLE "User" DROP COLUMN IF EXISTS "birthTime";
ALTER TABLE "User" DROP COLUMN IF EXISTS "gender";
ALTER TABLE "User" DROP COLUMN IF EXISTS "birthCity";
ALTER TABLE "User" DROP COLUMN IF EXISTS "tzId";
ALTER TABLE "User" DROP COLUMN IF EXISTS "emailNotifications";

-- Drop referralCode constraint first, then column
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_referralCode_key";
ALTER TABLE "User" DROP COLUMN IF EXISTS "referralCode";
