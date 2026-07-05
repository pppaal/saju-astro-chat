-- 2026-07 DB 감사 정리 (docs 없음 — 근거는 이 파일 주석이 정본)
--
-- 1) SecurityAuditLog 드랍 — writer/reader 0 인 죽은 테이블이 인덱스 5개를
--    유지하고 있었다. (계정 삭제 경로도 "보존" 주석만 있었을 뿐 접근 0.)
-- 2) CreditTransaction 의 lotId/expiresAt 인덱스 드랍 — Phase 0 additive
--    컬럼이라 어떤 코드도 아직 안 써 항상 NULL. 최다 쓰기 원장 테이블의
--    모든 INSERT 가 NULL 전용 인덱스 2개를 헛갱신하고 있었다.
--    (컬럼 자체는 ledger 전환 설계대로 보존 — 쓰기 시작할 때 인덱스 재생성.)
-- 3) User/BonusCreditPurchase 에 createdAt 인덱스 추가 — 어드민 대시보드
--    (overview/users/funnel/revenue)의 정렬·기간 스캔이 최대 테이블을
--    풀스캔하지 않게.

-- DropTable (인덱스는 테이블과 함께 자동 드랍)
DROP TABLE IF EXISTS "SecurityAuditLog";

-- DropIndex
DROP INDEX IF EXISTS "CreditTransaction_lotId_idx";
DROP INDEX IF EXISTS "CreditTransaction_expiresAt_idx";

-- CreateIndex
CREATE INDEX IF NOT EXISTS "User_createdAt_idx" ON "User"("createdAt");
CREATE INDEX IF NOT EXISTS "BonusCreditPurchase_createdAt_idx" ON "BonusCreditPurchase"("createdAt");
