-- CreateTable (스키마 드리프트 재실행 안전)
CREATE TABLE IF NOT EXISTS "SocialCredential" (
    "id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialCredential_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (플랫폼당 1개 자격증명)
CREATE UNIQUE INDEX IF NOT EXISTS "SocialCredential_platform_key" ON "SocialCredential"("platform");
