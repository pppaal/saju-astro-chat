-- 멱등 락 소유권 토큰 — additive only. RequestIdempotencyLog 에 nullable owner
-- 컬럼을 추가한다. claim 이 per-call 랜덤 토큰을 박고, release 는 (scopedKey, owner)
-- 가 일치할 때만 삭제해 자기가 만들지 않은 락을 지우는 것을 막는다(이중차감 창 차단).
-- 전부 nullable 이라 기존 행/draw-nonce 마커(owner 없음)에 무영향. 롤백 = 컬럼 drop.
--
-- IF NOT EXISTS 로 멱등 — phantom-apply 재실행 안전 (레포 마이그레이션 관례).

-- AlterTable (nullable 컬럼)
ALTER TABLE "RequestIdempotencyLog" ADD COLUMN IF NOT EXISTS "owner" TEXT;
