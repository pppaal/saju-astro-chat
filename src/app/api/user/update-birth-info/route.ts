import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/authOptions'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger';

// Edge 환경이면 Prisma/NextAuth 이슈가 있을 수 있어 Node 런타임을 강제
export const runtime = 'nodejs'

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  // 로그인 상태 확인
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // 클라이언트에서 보내는 필드: birthDate(필수), birthTime, gender, birthCity, tzId
    const body = await request.json().catch(() => ({}))
    const {
      birthDate,   // 'YYYY-MM-DD' 권장
      birthTime,   // 'HH:mm' (선택)
      gender,      // 'M' | 'F' | null (선택)
      birthCity,   // 예: 'Seoul, KR' (선택)
      tzId,        // 예: 'Asia/Seoul' (선택, 권장)
    } = body || {}

    // 기본 유효성 검사
    if (!birthDate) {
      return NextResponse.json({ error: 'Birth date is required' }, { status: 400 })
    }

    // DB 업데이트
    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        birthDate: birthDate ?? null,
        birthTime: birthTime ?? null,
        gender: gender ?? null,
        birthCity: birthCity ?? null,
        tzId: tzId ?? null,
      },
      select: {
        id: true,
        birthDate: true,
        birthTime: true,
        gender: true,
        birthCity: true,
        tzId: true,
      },
    })

    return NextResponse.json({ ok: true, user }, { status: 200 })
  } catch (error) {
    logger.error("POST /api/user/update-birth-info error:", error)
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}