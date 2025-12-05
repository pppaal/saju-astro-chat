import { NextRequest, NextResponse } from "next/server";
import { sendNotificationDigest as _sendNotificationDigest } from "@/lib/email/emailService";

export const dynamic = "force-dynamic";

/**
 * POST /api/email/digest
 * Cron job endpoint to send notification digests
 *
 * This should be called by a cron service (Vercel Cron, GitHub Actions, etc.)
 * Schedule examples:
 * - Daily: 0 9 * * * (9 AM every day)
 * - Weekly: 0 9 * * 1 (9 AM every Monday)
 *
 * Vercel Cron configuration (vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/email/digest",
 *     "schedule": "0 9 * * *"
 *   }]
 * }
 */
export async function POST(request: NextRequest) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // TODO: Query database for users with unread notifications
    // and their email preferences

    // Example implementation:
    // const usersWithNotifications = await prisma.user.findMany({
    //   where: {
    //     emailNotifications: true,
    //     notifications: {
    //       some: {
    //         read: false,
    //         createdAt: {
    //           gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
    //         },
    //       },
    //     },
    //   },
    //   include: {
    //     notifications: {
    //       where: {
    //         read: false,
    //       },
    //       orderBy: {
    //         createdAt: "desc",
    //       },
    //       take: 10, // Limit to 10 most recent
    //     },
    //   },
    // });

    // for (const user of usersWithNotifications) {
    //   await sendNotificationDigest(user.email, {
    //     userName: user.name || "there",
    //     notifications: user.notifications.map((n) => ({
    //       type: n.type,
    //       title: n.title,
    //       message: n.message,
    //       link: n.link || "/notifications",
    //       createdAt: n.createdAt.getTime(),
    //     })),
    //     unreadCount: user.notifications.length,
    //   });
    // }

    console.log("Email digest cron job executed");

    return NextResponse.json({
      success: true,
      message: "Digest emails sent (placeholder - configure database to enable)",
    });
  } catch (error) {
    console.error("Error sending digest emails:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/email/digest
 * Manual trigger for testing
 */
export async function GET(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "This endpoint is only available in development" },
      { status: 403 }
    );
  }

  return POST(request);
}
