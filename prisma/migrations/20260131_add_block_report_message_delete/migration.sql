-- AlterTable: MatchMessage에 isDeleted 컬럼 추가 (이미 있으면 skip — 스키마 드리프트 복구)
ALTER TABLE "MatchMessage" ADD COLUMN IF NOT EXISTS "isDeleted" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable: UserBlock (유저 차단)
CREATE TABLE IF NOT EXISTS "UserBlock" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "blockerId" TEXT NOT NULL,
    "blockedId" TEXT NOT NULL,
    "reason" TEXT,

    CONSTRAINT "UserBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable: UserReport (유저 신고)
CREATE TABLE IF NOT EXISTS "UserReport" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reporterId" TEXT NOT NULL,
    "reportedId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',

    CONSTRAINT "UserReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "UserBlock_blockerId_idx" ON "UserBlock"("blockerId");
CREATE INDEX IF NOT EXISTS "UserBlock_blockedId_idx" ON "UserBlock"("blockedId");
CREATE UNIQUE INDEX IF NOT EXISTS "UserBlock_blockerId_blockedId_key" ON "UserBlock"("blockerId", "blockedId");

CREATE INDEX IF NOT EXISTS "UserReport_reporterId_idx" ON "UserReport"("reporterId");
CREATE INDEX IF NOT EXISTS "UserReport_reportedId_idx" ON "UserReport"("reportedId");
CREATE INDEX IF NOT EXISTS "UserReport_status_idx" ON "UserReport"("status");

-- AddForeignKey (Postgres 는 ADD CONSTRAINT IF NOT EXISTS 미지원 → DO 블록으로 중복 무시)
DO $$ BEGIN
  ALTER TABLE "UserBlock" ADD CONSTRAINT "UserBlock_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "UserBlock" ADD CONSTRAINT "UserBlock_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "UserReport" ADD CONSTRAINT "UserReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "UserReport" ADD CONSTRAINT "UserReport_reportedId_fkey" FOREIGN KEY ("reportedId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
