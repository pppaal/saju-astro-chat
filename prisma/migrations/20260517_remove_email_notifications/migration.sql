-- Remove the email-notification preference plumbing. The
-- `emailNotifications` boolean on UserSettings was write-only
-- (nothing in the codebase actually read it to gate sends), and the
-- `notificationSettings` JSON on UserPreferences was wired up to a
-- TEMPORARILY DISABLED branch in the profile PATCH handler — the
-- field has been carrying writes that no UI surfaced and no sender
-- consulted.
--
-- Email sending paths (welcome, payment receipts, subscription
-- confirms, referral rewards) are unaffected: they were already
-- unconditional and gated only by RESEND_API_KEY presence.

ALTER TABLE "UserSettings" DROP COLUMN IF EXISTS "emailNotifications";
ALTER TABLE "UserPreferences" DROP COLUMN IF EXISTS "notificationSettings";
