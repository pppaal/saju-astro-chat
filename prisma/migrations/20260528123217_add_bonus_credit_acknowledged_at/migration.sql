-- 자동 지급된 보너스 크레딧 (추천 보상 등) 에 대해 "크레딧 받았어요" 모달을
-- 사용자가 봤는지 추적. null = 아직 못 봄 → 다음 진입/로그인 시 모달 노출.
-- 본인 결제는 Stripe success 페이지가 acknowledgment 이므로 grant 시점에
-- createdAt 으로 미리 채움.
ALTER TABLE "BonusCreditPurchase"
ADD COLUMN IF NOT EXISTS "acknowledgedAt" TIMESTAMP(3);

-- 기존 모든 purchase row 는 이미 안 보였다고 가정하기보다 "본 것" 처리 —
-- 이전 사용자에게 옛 구매 분량 모달이 갑자기 떠서 혼란스럽지 않게.
UPDATE "BonusCreditPurchase"
SET "acknowledgedAt" = "createdAt"
WHERE "acknowledgedAt" IS NULL;

-- 미확인 보상 빠른 조회용 복합 인덱스.
CREATE INDEX IF NOT EXISTS "BonusCreditPurchase_userId_acknowledgedAt_idx"
  ON "BonusCreditPurchase" ("userId", "acknowledgedAt");
