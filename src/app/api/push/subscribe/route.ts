import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/authOptions";

export const dynamic = "force-dynamic";

/**
 * POST /api/push/subscribe
 * Save user's push notification subscription
 */
export async function POST(_request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const subscription = await _request.json();

    // Validate subscription object
    if (!subscription || !subscription.endpoint) {
      return NextResponse.json(
        { error: "Invalid subscription" },
        { status: 400 }
      );
    }

    // TODO: Store subscription in database
    // For now, we'll just log it
    console.log("Push subscription received for user:", session.user.email);
    console.log("Subscription:", JSON.stringify(subscription, null, 2));

    // In production, store in database:
    // await prisma.pushSubscription.upsert({
    //   where: { userId: session.user.email },
    //   update: { subscription: JSON.stringify(subscription) },
    //   create: {
    //     userId: session.user.email,
    //     subscription: JSON.stringify(subscription),
    //   },
    // });

    return NextResponse.json({
      success: true,
      message: "Subscription saved successfully",
    });
  } catch (error) {
    console.error("Error saving push subscription:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/push/subscribe
 * Remove user's push notification subscription
 */
export async function DELETE(_request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // TODO: Remove subscription from database
    console.log("Removing push subscription for user:", session.user.email);

    // In production:
    // await prisma.pushSubscription.delete({
    //   where: { userId: session.user.email },
    // });

    return NextResponse.json({
      success: true,
      message: "Subscription removed successfully",
    });
  } catch (error) {
    console.error("Error removing push subscription:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
