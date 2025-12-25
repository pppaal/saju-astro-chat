import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/request-ip";

// Cache the stats for 5 minutes to reduce DB load
let cachedStats: { users: number; subscribers: number; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function GET(request: Request) {
  try {
    const ip = getClientIp(request.headers);
    const limit = await rateLimit(`stats:${ip}`, { limit: 30, windowSeconds: 60 });

    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: limit.headers }
      );
    }

    // Return cached stats if fresh
    if (cachedStats && Date.now() - cachedStats.timestamp < CACHE_TTL) {
      const res = NextResponse.json({
        users: cachedStats.users,
        subscribers: cachedStats.subscribers,
        cached: true,
      });
      limit.headers?.forEach((value, key) => res.headers.set(key, value));
      return res;
    }

    // Query fresh stats from database
    const [userCount, subscriberCount] = await Promise.all([
      prisma.user.count(),
      prisma.subscription.count({
        where: {
          status: {
            in: ["active", "trialing"],
          },
        },
      }),
    ]);

    // Update cache
    cachedStats = {
      users: userCount,
      subscribers: subscriberCount,
      timestamp: Date.now(),
    };

    const res = NextResponse.json({
      users: userCount,
      subscribers: subscriberCount,
      cached: false,
    });
    limit.headers?.forEach((value, key) => res.headers.set(key, value));
    return res;
  } catch (error: unknown) {
    const err = error instanceof Error ? error : undefined;
    console.error("[Stats API Error]", err?.message, err?.stack);
    return NextResponse.json(
      { error: "Failed to fetch stats", details: err?.message, users: 0, subscribers: 0 },
      { status: 500 }
    );
  }
}
