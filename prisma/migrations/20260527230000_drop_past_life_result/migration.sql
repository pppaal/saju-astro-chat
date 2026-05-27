-- Drop the legacy `PastLifeResult` table.
-- Page UI was removed earlier; schema model has been orphan since.
-- User decision (2026-05-27): keep all other Result models (PersonalityResult,
-- ICPResult, DestinyMatrixReport, MatchProfile, etc.) but drop past-life.
--
-- Active code reference: only admin/metrics/comprehensive/route.ts counts rows.
-- That count needs to be removed in the same PR.
--
-- IF EXISTS guard for idempotency. CASCADE in case any FK exists (none expected).

DROP TABLE IF EXISTS "PastLifeResult" CASCADE;
