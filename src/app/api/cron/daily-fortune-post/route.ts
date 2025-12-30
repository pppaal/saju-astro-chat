// src/app/api/cron/daily-fortune-post/route.ts
// Vercel Cron Job - 매일 자동으로 운세 포스팅

import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

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
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.warn('[Cron] Unauthorized request');
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  console.log('[Cron] Starting daily fortune auto-post...');

  try {
    // 자동 포스팅 스크립트 실행
    const { stdout, stderr } = await execAsync(
      'node scripts/auto-post-daily-fortune.mjs',
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          NODE_ENV: 'production',
        },
        timeout: 300000, // 5분 타임아웃
      }
    );

    console.log('[Cron] Script output:', stdout);

    if (stderr) {
      console.warn('[Cron] Script errors:', stderr);
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      output: stdout,
      warnings: stderr || null,
    });

  } catch (error) {
    console.error('[Cron] Execution failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * 수동 실행용 (테스트)
 */
export async function POST(request: NextRequest) {
  // API 키 인증
  const apiKey = request.headers.get('x-api-key');

  if (!apiKey || apiKey !== process.env.ADMIN_API_KEY) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // GET과 동일한 로직 실행
  return GET(request);
}
