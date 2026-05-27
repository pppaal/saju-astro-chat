// src/app/api/cron/daily-fortune-post/route.ts
// Vercel Cron Job - 매일 자동으로 운세 포스팅

import { NextRequest, NextResponse } from 'next/server'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { logger } from '@/lib/logger'
import path from 'path'
import { createErrorResponse, ErrorCodes } from '@/lib/api/errorHandler'
import { extractLocale } from '@/lib/api/middleware'

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
    return createErrorResponse({
      code: ErrorCodes.UNAUTHORIZED,
      locale: extractLocale(request),
      route: 'cron/daily-fortune-post',
    })
  }

  logger.info('[Cron] Starting daily fortune auto-post...')

  try {
    // 자동 포스팅 스크립트 실행 (execFile로 명령어 주입 방지)
    const scriptPath = path.join(process.cwd(), 'scripts', 'auto-post-daily-fortune.mjs')
    const nodePath = process.execPath // Node.js 실행 파일 경로

    const { stdout, stderr } = await execFileAsync(nodePath, [scriptPath], {
      cwd: process.cwd(),
      // 스크립트가 실제로 필요한 env 만 명시. 이전엔 ...process.env 로 전체를
      // spread 해 STRIPE_SECRET_KEY / DATABASE_URL / ANTHROPIC_API_KEY 같은
      // secrets 가 child process 에 전부 노출됐다 (보안 회귀). 스크립트는
      // 현재 REPLICATE_API_TOKEN 만 쓰므로 그것만 전달.
      env: {
        NODE_ENV: 'production',
        PATH: process.env.PATH ?? '',
        REPLICATE_API_TOKEN: process.env.REPLICATE_API_TOKEN ?? '',
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

    return createErrorResponse({
      code: ErrorCodes.INTERNAL_ERROR,
      route: 'cron/daily-fortune-post',
      originalError: error instanceof Error ? error : new Error(String(error)),
    })
  }
}

/**
 * 수동 실행용 (테스트)
 */
export async function POST(request: NextRequest) {
  // API 키 인증
  const apiKey = request.headers.get('x-api-key')

  if (!apiKey || apiKey !== process.env.ADMIN_API_KEY) {
    return createErrorResponse({
      code: ErrorCodes.UNAUTHORIZED,
      locale: extractLocale(request),
      route: 'cron/daily-fortune-post',
    })
  }

  // GET과 동일한 로직 실행
  return GET(request)
}
