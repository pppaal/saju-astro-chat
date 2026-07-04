-- 방문 스트릭 — /calendar "N일째 확인 중" 칩의 서버 영속본(교차기기).
-- 로그인 사용자 1행(userId PK). 익명은 기존 localStorage 경로 유지.

-- CreateTable
CREATE TABLE "VisitStreak" (
    "userId" TEXT NOT NULL,
    "last" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "longest" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VisitStreak_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "VisitStreak" ADD CONSTRAINT "VisitStreak_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
