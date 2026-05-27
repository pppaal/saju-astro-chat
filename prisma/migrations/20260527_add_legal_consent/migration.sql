-- 법령 동의 기록 — PIPA 22조의2 (14세 이상 self-attest) +
-- 전상법 §13 ②항 (이용약관·개인정보 명시 동의 입증 책임) 방어.
-- LegalConsentModal 에서 최초 1회 모달로 동의 후 기록한다.
-- legalAcceptedVersion 과 LEGAL_VERSION 이 다르면 재동의 모달이 뜬다.
ALTER TABLE "UserSettings"
ADD COLUMN IF NOT EXISTS "legalAcceptedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "legalAcceptedVersion" TEXT,
ADD COLUMN IF NOT EXISTS "ageConfirmedAt" TIMESTAMP(3);
