-- CalendarBuildCache — 캘린더 엔진 cell-cache 영속화 테이블.
-- 스키마에는 이미 model 있는데 (schema.prisma:1109) 마이그레이션 누락으로
-- 프로덕션에 테이블 없음. 매 요청마다 prisma.calendarBuildCache.findUnique/create
-- 가 P2021 (table does not exist) 로 실패. 다행히 in-memory Map cache HIT 라
-- 응답은 정상 작동했지만 cold start 마다 12달 전체 재계산.

CREATE TABLE IF NOT EXISTS "CalendarBuildCache" (
    "id" TEXT NOT NULL,
    "birthKey" TEXT NOT NULL,
    "monthKey" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "builtAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CalendarBuildCache_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CalendarBuildCache_birthKey_monthKey_key"
    ON "CalendarBuildCache"("birthKey", "monthKey");

CREATE INDEX IF NOT EXISTS "CalendarBuildCache_builtAt_idx"
    ON "CalendarBuildCache"("builtAt");
