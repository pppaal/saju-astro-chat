// src/app/api/cron/daily-fortune-post/route.ts
// Vercel Cron Job - 매일 자동으로 운세 포스팅

import { NextRequest, NextResponse } from 'next/server'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { logger } from '@/lib/logger'
import path from 'path'
import { HTTP_STATUS } from '@/lib/constants/http'

const execFileAsync = promisify(execFile)

/**
 * Vercel Cron Job Handler
 *
 * vercel.json에서 호출:
 * {
 *   "crons": [{
 *     "path": "/api/cron/daily-fortune-post",
 *     "schedule": "0 9 * * *"
 *   }]
 * }
 */
export async function GET(request: NextRequest) {
  // Vercel Cron 인증 확인
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    logger.warn('[Cron] Unauthorized request')
    return NextResponse.json({ error: 'Unauthorized' }, { status: HTTP_STATUS.UNAUTHORIZED })
  }

  logger.info('[Cron] Starting daily fortune auto-post...')

  try {
    // 자동 포스팅 스크립트 실행 (execFile로 명령어 주입 방지)
    const scriptPath = path.join(process.cwd(), 'scripts', 'auto-post-daily-fortune.mjs')
    const nodePath = process.execPath // Node.js 실행 파일 경로

    const { stdout, stderr } = await execFileAsync(nodePath, [scriptPath], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        NODE_ENV: 'production',
      },
      timeout: 300000, // 5분 타임아웃
    })

    logger.info('[Cron] Script output:', stdout)

    if (stderr) {
      logger.warn('[Cron] Script errors:', stderr)
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      output: stdout,
      warnings: stderr || null,
    })
  } catch (error) {
    logger.error('[Cron] Execution failed:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString(),
      },
      { status: HTTP_STATUS.SERVER_ERROR }
    )
  }
}

/**
 * 수동 실행용 (테스트)
 */
export async function POST(request: NextRequest) {
  // API 키 인증
  const apiKey = request.headers.get('x-api-key')

  if (!apiKey || apiKey !== process.env.ADMIN_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: HTTP_STATUS.UNAUTHORIZED })
  }

  // GET과 동일한 로직 실행
  return GET(request)
}
