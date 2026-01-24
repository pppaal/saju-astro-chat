import { NextRequest } from 'next/server';
import { withApiMiddleware, type ApiContext } from '@/lib/api/middleware';
import { ErrorCodes } from '@/lib/api/errorHandler';
import { revokeGoogleTokensForUser } from '@/lib/auth/tokenRevoke';

export const runtime = 'nodejs';

interface RevokeResponse {
  ok: boolean;
  revoked: boolean;
  reason?: string;
}

export const POST = withApiMiddleware<RevokeResponse>(
  async (_req: NextRequest, context: ApiContext) => {
    if (!context.userId) {
      return { error: { code: ErrorCodes.UNAUTHORIZED } };
    }

    const result = await revokeGoogleTokensForUser(context.userId);
    const reason = 'reason' in result ? result.reason : undefined;

    if (!result.cleared) {
      if (reason === 'no_account') {
        return {
          error: {
            code: ErrorCodes.NOT_FOUND,
            message: 'Account not found',
          },
        };
      }
      return {
        error: {
          code: ErrorCodes.INTERNAL_ERROR,
          message: 'Failed to revoke tokens',
        },
      };
    }

    return {
      data: {
        ok: result.cleared,
        revoked: result.revoked,
        reason,
      },
    };
  },
  {
    requireAuth: true,
    route: 'auth/revoke',
  }
);
