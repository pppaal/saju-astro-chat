import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/authOptions";

export const dynamic = "force-dynamic";

/**
 * POST /api/push/send
 * Send a push notification to a user
 *
 * NOTE: This requires web-push library and VAPID keys to be configured
 * Install: npm install web-push
 * Generate VAPID keys: npx web-push generate-vapid-keys
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { targetUserId, title, message, url, icon } = await request.json();

    if (!targetUserId || !title || !message) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check VAPID keys are configured
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
    const vapidSubject = process.env.VAPID_SUBJECT || "mailto:admin@destinytracker.com";

    if (!vapidPublicKey || !vapidPrivateKey) {
      return NextResponse.json(
        { error: "Push notifications not configured. Install: npm install web-push, then run: npx web-push generate-vapid-keys" },
        { status: 500 }
      );
    }

    // Try to dynamically import web-push (optional dependency)
    let webpush: any;
    try {
      // @ts-ignore - web-push is an optional dependency
      webpush = (await import("web-push")).default;
    } catch {
      return NextResponse.json(
        { error: "web-push module not installed. Run: npm install web-push" },
        { status: 500 }
      );
    }

    // Configure web-push with VAPID keys
    webpush.setVapidDetails(
      vapidSubject,
      vapidPublicKey,
      vapidPrivateKey
    );

    // TODO: Retrieve user's push subscription from database
    // For now, return a placeholder response
    console.log("Would send push notification to:", targetUserId);
    console.log("Notification:", { title, message, url, icon });

    // In production:
    // const subscription = await prisma.pushSubscription.findUnique({
    //   where: { userId: targetUserId },
    // });
    //
    // if (!subscription) {
    //   return NextResponse.json({ error: "User not subscribed" }, { status: 404 });
    // }
    //
    // const payload = JSON.stringify({
    //   title,
    //   message,
    //   icon: icon || "/icon-192.png",
    //   badge: "/badge-72.png",
    //   data: { url: url || "/notifications" },
    // });
    //
    // await webpush.sendNotification(
    //   JSON.parse(subscription.subscription),
    //   payload
    // );

    return NextResponse.json({
      success: true,
      message: "Push notification sent (placeholder - configure database to enable)",
    });
  } catch (error) {
    console.error("Error sending push notification:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
