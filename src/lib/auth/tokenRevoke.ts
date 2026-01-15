"use server";

import { prisma } from '@/lib/db/prisma';
import { decryptToken } from '@/lib/security/tokenCrypto';
import { logger } from '@/lib/logger';

type GoogleAccountLike = {
  provider: string;
  providerAccountId: string;
  access_token?: string | null;
  refresh_token?: string | null;
  id_token?: string | null;
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

async function revokeWithGoogle(token: string) {
  try {
    const res = await fetch('https://oauth2.googleapis.com/revoke', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ token }),
    });
    return res.ok;
  } catch (e) {
    logger.error('[auth] Failed to revoke Google token', e);
    return false;
  }
}

export async function revokeGoogleTokensForAccount(account: GoogleAccountLike) {
  if (account.provider !== 'google') return { revoked: false, cleared: false };

  const token =
    account.refresh_token ||
    account.access_token ||
    account.id_token ||
    decryptToken(account.refresh_token) ||
    decryptToken(account.access_token) ||
    decryptToken(account.id_token);

  if (token) {
    await revokeWithGoogle(token);
  }

  await prisma.account.updateMany({
    where: {
      provider: 'google',
      providerAccountId: account.providerAccountId,
    },
    data: scrubData,
  });

  return { revoked: Boolean(token), cleared: true };
}

export async function revokeGoogleTokensForUser(userId: string) {
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

  if (!account) return { revoked: false, cleared: false, reason: 'no_account' };

  const decryptedAccount = {
    ...account,
    access_token: decryptToken(account.access_token),
    refresh_token: decryptToken(account.refresh_token),
    id_token: decryptToken(account.id_token),
  };

  return revokeGoogleTokensForAccount(decryptedAccount);
}
