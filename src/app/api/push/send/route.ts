import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/authOptions';
import {
  sendPushNotification,
  sendTestNotification,
} from '@/lib/notifications/pushService';

export const dynamic = 'force-dynamic';

/**
 * POST /api/push/send
 * Send a push notification to a user
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { targetUserId, title, message, icon, url, tag, test } = body;

    // 테스트 알림 발송
    if (test) {
      const result = await sendTestNotification(session.user.id);
      return NextResponse.json({
        success: result.success,
        sent: result.sent,
        failed: result.failed,
        error: result.error,
      });
    }

    // 일반 알림 발송
    const userId = targetUserId || session.user.id;

    // 본인에게만 발송 가능 (관리자 기능은 추후 추가)
    if (targetUserId && targetUserId !== session.user.id) {
      return NextResponse.json(
        { error: 'Cannot send to other users' },
        { status: 403 }
      );
    }

    if (!title || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: title, message' },
        { status: 400 }
      );
    }

    const result = await sendPushNotification(userId, {
      title,
      message,
      icon: icon || '/icon-192.png',
      tag: tag || 'destinypal',
      data: { url: url || '/notifications' },
    });

    return NextResponse.json({
      success: result.success,
      sent: result.sent,
      failed: result.failed,
      error: result.error,
    });
  } catch (error) {
    console.error('Error sending push notification:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
