import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";

export const dynamic = "force-dynamic";

// GET: 저장된 성격 유형 조회
// TODO: PersonalityResult 모델이 Prisma 스키마에 추가되면 DB 연동 활성화
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
    }

    // PersonalityResult 모델이 없어서 임시로 false 반환
    return NextResponse.json({ saved: false });
  } catch (error) {
    console.error("GET /api/personality error:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

// POST: 성격 유형 저장 (로그인 필요)
// TODO: PersonalityResult 모델이 Prisma 스키마에 추가되면 DB 연동 활성화
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { typeCode, personaName } = body;

    // 필수 필드 검증
    if (!typeCode || !personaName) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }

    // PersonalityResult 모델이 없어서 임시 응답
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
