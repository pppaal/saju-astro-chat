"use server";

import { prisma } from '@/lib/db/prisma';
import { decryptToken } from '@/lib/security/tokenCrypto';
import { logger } from '@/lib/logger';

/**
 * Calling contract for `revokeGoogleTokensForAccount`:
 *  - `access_token` / `refresh_token` MUST be passed in *plaintext* (already
 *    decrypted). The caller (`revokeGoogleTokensForUser`) is responsible for
 *    decryption — this function performs none.
 *  - `id_token` is intentionally NOT part of the input. Google's
 *    `https://oauth2.googleapis.com/revoke` endpoint accepts ONLY
 *    `access_token` or `refresh_token`; posting an `id_token` silently
 *    returns 400 `invalid_token` and the grant stays active.
 *  - Prefer `refresh_token` because revoking it cascades to all issued access
 *    tokens. If only an access token exists, revoking it invalidates that one
 *    token but leaves any outstanding refresh token alive.
 */
type GoogleAccountForRevoke = {
  provider: string;
  providerAccountId: string;
  access_token?: string | null;
  refresh_token?: string | null;
};

type RevokeOutcome =
  | { revoked: true; reason?: undefined }
  | {
      revoked: false;
      reason:
        | 'not_google'
        | 'no_revokable_token'
        | 'google_error'
        | 'network_error';
    };

const scrubData = {
  access_token: null,
  refresh_token: null,
  id_token: null,
  session_state: null,
  scope: null,
  token_type: null,
  expires_at: null,
};

// A plaintext OAuth token is opaque but never matches the ciphertext shape
// produced by `encryptToken` (iv.b64 "." authTag.b64 "." data.b64 — exactly
// three non-empty base64-ish segments). If a value with that exact shape
// reaches this function, treat it as suspected ciphertext and refuse to POST
// it to Google. Guards against a future regression where an encrypted value
// bypasses the decryption layer and gets shipped to the revoke endpoint.
function looksLikeCiphertext(token: string): boolean {
  const parts = token.split('.');
  if (parts.length !== 3) {return false;}
  const base64ish = /^[A-Za-z0-9+/=_-]+$/;
  return parts.every((p) => p.length > 0 && base64ish.test(p));
}

async function revokeWithGoogle(token: string): Promise<RevokeOutcome> {
  try {
    const res = await fetch('https://oauth2.googleapis.com/revoke', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ token }),
    });
    if (res.ok) {
      return { revoked: true };
    }
    logger.error(
      `[auth] Google revoke endpoint returned non-OK status: ${res.status}`
    );
    return { revoked: false, reason: 'google_error' };
  } catch (e) {
    logger.error('[auth] Failed to revoke Google token (network)', e);
    return { revoked: false, reason: 'network_error' };
  }
}

/**
 * Revoke a Google OAuth grant at Google's `/revoke` endpoint.
 *
 * IMPORTANT: callers MUST pass plaintext tokens (see `GoogleAccountForRevoke`).
 * This function performs no decryption — it just selects the best token,
 * sanity-checks it, and POSTs.
 */
export async function revokeGoogleTokensForAccount(
  account: GoogleAccountForRevoke
): Promise<RevokeOutcome> {
  if (account.provider !== 'google') {
    return { revoked: false, reason: 'not_google' };
  }

  // Prefer refresh_token: revoking it cascades to issued access tokens.
  const token = account.refresh_token || account.access_token || null;

  if (!token) {
    return { revoked: false, reason: 'no_revokable_token' };
  }

  if (looksLikeCiphertext(token)) {
    // Defensive: refuse to ship ciphertext to Google. Treat as failure so the
    // caller leaves the DB row intact for a retry path.
    logger.error(
      '[auth] revokeGoogleTokensForAccount received token shaped like ciphertext; refusing to POST'
    );
    return { revoked: false, reason: 'google_error' };
  }

  return revokeWithGoogle(token);
}

/**
 * High-level user-scoped revoke: load the Google account row for `userId`,
 * decrypt its tokens, ask Google to revoke, and ONLY scrub the DB row when
 * (a) Google confirmed the revoke OR (b) the row had no revokable token to
 * begin with.
 *
 * If Google returns an error or the network fails, the DB row is left
 * untouched so a future retry path (next signOut, a scheduled cron, or a
 * manual admin action) still has a refresh_token to revoke. Wiping the row
 * on failure would orphan the grant at Google with no way for the server to
 * ever revoke it again.
 *
 * Returns:
 *  - `{ revoked: true,  cleared: true,  reason?: undefined }` — Google confirmed
 *  - `{ revoked: false, cleared: true,  reason: 'no_revokable_token' }` — nothing to revoke; row scrubbed
 *  - `{ revoked: false, cleared: false, reason: 'no_account' }` — no Google account on file
 *  - `{ revoked: false, cleared: false, reason: 'google_error' | 'network_error' }` — failure; DB row left intact
 */
export async function revokeGoogleTokensForUser(userId: string): Promise<{
  revoked: boolean;
  cleared: boolean;
  reason?:
    | 'no_account'
    | 'no_revokable_token'
    | 'google_error'
    | 'network_error'
    | 'not_google';
}> {
  const account = await prisma.account.findFirst({
    where: { provider: 'google', userId },
    select: {
      id: true,
      provider: true,
      providerAccountId: true,
      access_token: true,
      refresh_token: true,
      id_token: true,
    },
  });

  if (!account) {
    return { revoked: false, cleared: false, reason: 'no_account' };
  }

  const decryptedAccessToken = decryptToken(account.access_token);
  const decryptedRefreshToken = decryptToken(account.refresh_token);

  const outcome = await revokeGoogleTokensForAccount({
    provider: account.provider,
    providerAccountId: account.providerAccountId,
    access_token: decryptedAccessToken,
    refresh_token: decryptedRefreshToken,
  });

  // Scrub the DB row only when:
  //   - Google confirmed the revoke, OR
  //   - There was nothing to revoke (still safe to clear stale columns).
  // On google_error / network_error we leave the row alone so a retry can
  // succeed later — otherwise the grant stays alive at Google with no token
  // left on our side to revoke it with (orphan grant).
  if (outcome.revoked || outcome.reason === 'no_revokable_token') {
    await prisma.account.updateMany({
      where: {
        provider: 'google',
        providerAccountId: account.providerAccountId,
      },
      data: scrubData,
    });
    return {
      revoked: outcome.revoked,
      cleared: true,
      reason: outcome.reason,
    };
  }

  logger.error(
    `[auth] revokeGoogleTokensForUser left DB row intact after revoke failure: userId=${userId} reason=${outcome.reason}`
  );
  return {
    revoked: false,
    cleared: false,
    reason: outcome.reason,
  };
}
