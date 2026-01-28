import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/authOptions';
import {
  savePushSubscription,
  removePushSubscription,
} from '@/lib/notifications/pushService';
import { logger } from '@/lib/logger';

import { parseRequestBody } from '@/lib/api/requestParser';
import { HTTP_STATUS } from '@/lib/constants/http';
export const dynamic = 'force-dynamic';

/**
 * POST /api/push/subscribe
 * Save user's push notification subscription
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: HTTP_STATUS.UNAUTHORIZED });
  }

  try {
    const subscription = await request.json();

    // Validate subscription object
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json(
        { error: 'Invalid subscription: missing endpoint or keys' },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    if (!subscription.keys.p256dh || !subscription.keys.auth) {
      return NextResponse.json(
        { error: 'Invalid subscription: missing p256dh or auth keys' },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    const userAgent = request.headers.get('user-agent') || undefined;

    // Store subscription in database
    await savePushSubscription(
      session.user.id,
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
      },
      userAgent
    );

    return NextResponse.json({
      success: true,
      message: 'Subscription saved successfully',
    });
  } catch (error) {
    logger.error('Error saving push subscription:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: HTTP_STATUS.SERVER_ERROR }
    );
  }
}

/**
 * DELETE /api/push/subscribe
 * Remove user's push notification subscription
 */
export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: HTTP_STATUS.UNAUTHORIZED });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const endpoint = body.endpoint;

    if (!endpoint) {
      return NextResponse.json(
        { error: 'Missing endpoint' },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // Remove subscription from database
    await removePushSubscription(endpoint);

    return NextResponse.json({
      success: true,
      message: 'Subscription removed successfully',
    });
  } catch (error) {
    logger.error('Error removing push subscription:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: HTTP_STATUS.SERVER_ERROR }
    );
  }
}
