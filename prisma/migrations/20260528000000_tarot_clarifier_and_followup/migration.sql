-- TarotReading 에 보충 카드 (클래리파이어) + followup 채팅 내역 두 컬럼 추가.
-- 두 필드 다 nullable JSON — 신규 리딩에서만 사용되고 옛 데이터엔 영향 없음.

ALTER TABLE "TarotReading"
  ADD COLUMN IF NOT EXISTS "clarifierCard" JSONB,
  ADD COLUMN IF NOT EXISTS "followupTurns" JSONB;
