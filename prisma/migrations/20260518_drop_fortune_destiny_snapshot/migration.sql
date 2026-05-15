-- Drop the legacy `Fortune` and `DestinySnapshot` tables. Neither is
-- referenced anywhere in the application code (`prisma.fortune.*` /
-- `prisma.destinySnapshot.*` counts: 0 across src/, scripts/, tests/).
-- `DailyFortune` is the active fortune model and stays untouched.
--
-- Tables are dropped with CASCADE in case they hold rows linked via
-- foreign key — there are no other tables referencing them, so the
-- only cascade effect is dropping their own indexes.

DROP TABLE IF EXISTS "Fortune" CASCADE;
DROP TABLE IF EXISTS "DestinySnapshot" CASCADE;
