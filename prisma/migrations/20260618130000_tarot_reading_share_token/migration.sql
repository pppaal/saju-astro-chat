-- 공개 공유 링크 — TarotReading 에 사용자가 명시적으로 공개할 때만 발급되는
-- 단일 토큰 컬럼을 추가한다. 전부 nullable 이고 기본은 비공개(null)라 기존
-- 동작에 무영향. /r/[shareToken] 공개 페이지가 이 토큰으로 조회한다.
-- 롤백 = 컬럼/인덱스 drop.
--
-- IF NOT EXISTS 로 멱등 — phantom-apply 재실행 안전 (레포 마이그레이션 관례).

-- AlterTable (nullable 컬럼)
ALTER TABLE "TarotReading" ADD COLUMN IF NOT EXISTS "shareToken" TEXT;
ALTER TABLE "TarotReading" ADD COLUMN IF NOT EXISTS "sharedAt" TIMESTAMP(3);

-- CreateIndex (토큰 단일성 — 공개 페이지 조회 키)
CREATE UNIQUE INDEX IF NOT EXISTS "TarotReading_shareToken_key" ON "TarotReading"("shareToken");
