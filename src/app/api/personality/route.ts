import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { enforceBodySize } from "@/lib/http";

export const dynamic = "force-dynamic";

// GET: fetch personality result metadata (placeholder)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
    }

    // Placeholder: no saved personality result yet
    return NextResponse.json({ saved: false });
  } catch (error) {
    console.error("GET /api/personality error:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

// POST: store personality result (placeholder)
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
    }

    const oversized = enforceBodySize(request as any, 16 * 1024);
    if (oversized) return oversized;

    const body = await request.json().catch(() => null);
    const typeCode = typeof body?.typeCode === "string" ? body.typeCode.trim().slice(0, 32) : "";
    const personaName = typeof body?.personaName === "string" ? body.personaName.trim().slice(0, 80) : "";

    if (!typeCode || !personaName) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }

    // Placeholder: persistence not implemented yet
    return NextResponse.json({
      success: true,
      typeCode,
      personaName,
      message: "Personality result storage not yet available",
    });
  } catch (error) {
    console.error("POST /api/personality error:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
