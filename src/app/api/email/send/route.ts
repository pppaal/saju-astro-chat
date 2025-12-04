import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/authOptions";
import {
  sendEmail,
  sendNotificationEmail,
  sendNotificationDigest,
} from "@/lib/email/emailService";

export const dynamic = "force-dynamic";

/**
 * POST /api/email/send
 * Send email notification to a user
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { type, targetEmail, notification, digest } = body;

    if (!targetEmail) {
      return NextResponse.json(
        { error: "Target email is required" },
        { status: 400 }
      );
    }

    let sent = false;

    if (type === "digest" && digest) {
      // Send notification digest
      sent = await sendNotificationDigest(targetEmail, digest);
    } else if (type === "notification" && notification) {
      // Send single notification
      sent = await sendNotificationEmail(targetEmail, notification);
    } else if (type === "custom") {
      // Send custom email
      const { subject, html, text } = body;
      if (!subject || !html) {
        return NextResponse.json(
          { error: "Subject and HTML are required for custom emails" },
          { status: 400 }
        );
      }
      sent = await sendEmail({ to: targetEmail, subject, html, text });
    } else {
      return NextResponse.json(
        { error: "Invalid email type or missing data" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: sent,
      message: sent ? "Email sent successfully" : "Failed to send email",
    });
  } catch (error) {
    console.error("Error sending email:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/email/send
 * Test endpoint to send a sample email
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Send test email
  const sent = await sendNotificationEmail(session.user.email, {
    type: "system",
    title: "Test Email Notification",
    message: "This is a test email from DestinyTracker. If you're seeing this, email notifications are working!",
    link: "/notifications",
  });

  return NextResponse.json({
    success: sent,
    message: sent
      ? "Test email sent successfully"
      : "Failed to send test email. Check your email configuration.",
  });
}
