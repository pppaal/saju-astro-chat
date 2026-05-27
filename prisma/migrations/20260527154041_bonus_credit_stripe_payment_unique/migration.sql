-- BonusCreditPurchase.stripePaymentId 에 unique 추가.
-- Stripe webhook 의 같은 결제 이벤트가 (재시도 등으로) 두 번 처리될 때
-- DB 레벨 멱등성으로 두 번째 INSERT 를 P2002 로 막아 중복 크레딧 지급을
-- 차단한다. nullable column 이라 source != 'purchase' 행들은 NULL 로
-- 여러 개 공존 (Postgres 기본 동작).
--
-- 만약 과거 데이터에 stripePaymentId 중복이 있으면 이 migration 이
-- 실패한다. 그 경우 NULL 처리 또는 중복 row 정리 후 재시도.
CREATE UNIQUE INDEX "BonusCreditPurchase_stripePaymentId_key"
  ON "BonusCreditPurchase"("stripePaymentId");
