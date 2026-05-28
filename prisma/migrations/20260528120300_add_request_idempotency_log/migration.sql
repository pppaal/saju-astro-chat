-- 새로고침/탭 복제 등 같은 API 호출 재진입 시 크레딧 중복 차감 방지.
-- 모듈 스코프 Map 만으로는 Vercel cold start 시 잊혀서 더블 차지 발생.
-- DB 저장으로 instance / restart 후에도 유지.
CREATE TABLE IF NOT EXISTS "RequestIdempotencyLog" (
  "scopedKey" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "RequestIdempotencyLog_pkey" PRIMARY KEY ("scopedKey")
);

CREATE INDEX IF NOT EXISTS "RequestIdempotencyLog_expiresAt_idx"
  ON "RequestIdempotencyLog" ("expiresAt");
