-- 본명 차트 영구 캐시 — CalendarBuildCache 의 본명 1회 계산 버전.
-- 사주 + 점성 통합 NatalContext 를 JSON 으로 영구 보관. Redis (30일 TTL)
-- 만료 시 재계산 대신 이 row 에서 cold fallback.

CREATE TABLE IF NOT EXISTS "NatalContextCache" (
  "id" TEXT NOT NULL,
  "birthKey" TEXT NOT NULL,
  "engineSignature" TEXT NOT NULL,
  "data" JSONB NOT NULL,
  "builtAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NatalContextCache_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "NatalContextCache_birthKey_key"
  ON "NatalContextCache"("birthKey");

CREATE INDEX IF NOT EXISTS "NatalContextCache_builtAt_idx"
  ON "NatalContextCache"("builtAt");

CREATE INDEX IF NOT EXISTS "NatalContextCache_engineSignature_idx"
  ON "NatalContextCache"("engineSignature");
