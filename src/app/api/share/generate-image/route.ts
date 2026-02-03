import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { HTTP_STATUS } from '@/lib/constants/http'
import { rateLimit } from '@/lib/rateLimit'
import { getClientIp } from '@/lib/request-ip'

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req.headers)
    const limit = await rateLimit(`share-image:${ip}`, { limit: 10, windowSeconds: 60 })
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Try again soon.' },
        { status: HTTP_STATUS.RATE_LIMITED, headers: limit.headers }
      )
    }

    const session = await getServerSession(authOptions)
    // Allow sharing without login, but track userId if available
    const userId = session?.user?.id || null

    const { title, description, resultData, resultType } = await req.json()

    if (!title || !resultType) {
      return NextResponse.json(
        { error: 'Title and resultType are required' },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    }

    // Store share data in database
    const sharedResult = await prisma.sharedResult.create({
      data: {
        userId,
        resultType,
        title,
        description: description || null,
        resultData: resultData || null,
        // Set expiry to 30 days from now
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    })

    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || 'https://destinypal.com'
    const imageUrl = `/api/share/og-image?shareId=${sharedResult.id}&title=${encodeURIComponent(title)}&type=${resultType}`

    const res = NextResponse.json({
      success: true,
      shareId: sharedResult.id,
      imageUrl,
      shareUrl: `${baseUrl}/shared/${sharedResult.id}`,
    })
    limit.headers.forEach((value, key) => res.headers.set(key, value))
    return res
  } catch (error) {
    logger.error('Share image generation error:', { error: error })
    return NextResponse.json(
      { error: 'Failed to generate share image' },
      { status: HTTP_STATUS.SERVER_ERROR }
    )
  }
}
