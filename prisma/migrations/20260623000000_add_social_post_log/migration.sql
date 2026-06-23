-- CreateTable (스키마 드리프트 재실행 안전)
CREATE TABLE IF NOT EXISTS "SocialPostLog" (
    "id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "ref" TEXT NOT NULL,
    "externalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SocialPostLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (한 글을 한 플랫폼에 한 번만 — 중복 게시 방지)
CREATE UNIQUE INDEX IF NOT EXISTS "SocialPostLog_platform_ref_key" ON "SocialPostLog"("platform", "ref");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SocialPostLog_platform_createdAt_idx" ON "SocialPostLog"("platform", "createdAt");
