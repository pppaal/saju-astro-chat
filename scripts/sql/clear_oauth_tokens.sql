-- Null out stored OAuth tokens (Google/Kakao) to force re-login with encrypted storage.
UPDATE "Account"
SET
  access_token = NULL,
  refresh_token = NULL,
  id_token = NULL,
  scope = NULL,
  token_type = NULL,
  expires_at = NULL,
  session_state = NULL;
