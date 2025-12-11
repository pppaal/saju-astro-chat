import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { revokeGoogleTokensForUser } from '@/lib/auth/tokenRevoke';

export const runtime = 'nodejs';

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const result = await revokeGoogleTokensForUser(session.user.id);
  const reason = 'reason' in result ? result.reason : undefined;
  const status = result.cleared ? 200 : reason === 'no_account' ? 404 : 500;

  return NextResponse.json(
    {
      ok: result.cleared,
      revoked: result.revoked,
      reason,
    },
    { status }
  );
}
