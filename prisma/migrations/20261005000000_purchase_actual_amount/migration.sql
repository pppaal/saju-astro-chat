-- 실제 결제액·통화 기록 — 매출 집계를 "크레딧 수량 → KRW 정가" 역산에서
-- 실결제액으로 옮기기 위한 컬럼.
--
-- 왜 nullable 인가: 기존 행에는 실결제액이 저장된 적이 없다. DEFAULT 0 으로
-- 백필하면 과거 매출이 전부 0 으로 보이고, DEFAULT 로 정가를 넣으면 추정값을
-- 실측값으로 위장하게 된다. NULL 로 두면 소비처(/api/admin/revenue)가 기존
-- 정가 추정으로 폴백해 과거 숫자가 그대로 보존되고, 새 결제부터 실측이 쌓인다.
--
-- amountMinor 는 **결제 통화의 최소 단위**다(KRW 1원, USD 1센트) — Stripe
-- Checkout Session.amount_total 과 같은 단위. currency 없이는 단위를 해석할
-- 수 없으므로 항상 같이 기록한다.
--
-- referral/promotion/gift 처럼 결제가 없는 지급분은 계속 NULL 이다.

-- AlterTable
ALTER TABLE "BonusCreditPurchase" ADD COLUMN "amountMinor" INTEGER;
ALTER TABLE "BonusCreditPurchase" ADD COLUMN "currency" TEXT;
