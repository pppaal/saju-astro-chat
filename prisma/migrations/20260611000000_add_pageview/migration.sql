-- 📊 익명 방문 로그 (PageView) — 비로그인 방문자 포함 트래픽 집계용.
-- visitorId 는 일별 회전 해시(sha256(날짜+ip+ua+salt))라 원본 PII 미저장.
-- IF NOT EXISTS — phantom-apply 재실행 안전(레포 마이그레이션 관례).
CREATE TABLE IF NOT EXISTS "PageView" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "visitorId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "referrerHost" TEXT,
    "isLoggedIn" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT,
    "country" TEXT,
    "device" TEXT,
    CONSTRAINT "PageView_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PageView_createdAt_idx" ON "PageView"("createdAt");
CREATE INDEX IF NOT EXISTS "PageView_visitorId_createdAt_idx" ON "PageView"("visitorId", "createdAt");
CREATE INDEX IF NOT EXISTS "PageView_isLoggedIn_createdAt_idx" ON "PageView"("isLoggedIn", "createdAt");
CREATE INDEX IF NOT EXISTS "PageView_path_createdAt_idx" ON "PageView"("path", "createdAt");
