import { NextResponse } from 'next/server';
import { generateWeeklyFortuneImage } from '@/lib/replicate';
import { saveWeeklyFortuneImage, getWeekNumber } from '@/lib/weeklyFortune';

// Vercel Cron이 호출할 엔드포인트
// 매주 월요일 오전 9시 (KST) = 월요일 0시 (UTC) 실행

// 주간 테마 목록 (replicate.ts와 동일)
const WEEKLY_THEMES = [
  'golden sunrise over mountains',
  'mystical full moon over calm ocean',
  'cherry blossoms floating in spring breeze',
  'northern lights dancing in arctic sky',
  'ancient temple under starry night',
  'crystal cave with glowing gems',
  'phoenix rising from golden flames',
  'serene zen garden with flowing water',
  'cosmic nebula with swirling galaxies',
  'enchanted forest with fairy lights',
  'lotus flower blooming on still pond',
  'majestic waterfall in misty mountains',
];

export async function GET(request: Request) {
  // Vercel Cron 인증 확인
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // 프로덕션에서는 CRON_SECRET 검증
  if (process.env.NODE_ENV === 'production' && cronSecret) {
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
  }

  try {
    console.warn('[WeeklyFortune] Starting image generation...');

    // 이미지 생성
    const imageUrl = await generateWeeklyFortuneImage();

    if (!imageUrl) {
      throw new Error('Failed to generate image');
    }

    // 주차 정보
    const weekNumber = getWeekNumber();
    const themeIndex = weekNumber % WEEKLY_THEMES.length;

    // Redis에 저장
    const saved = await saveWeeklyFortuneImage({
      imageUrl,
      generatedAt: new Date().toISOString(),
      weekNumber,
      theme: WEEKLY_THEMES[themeIndex],
    });

    if (!saved) {
      console.error('[WeeklyFortune] Failed to save to Redis');
    }

    console.warn('[WeeklyFortune] Image generated and saved successfully');

    return NextResponse.json({
      success: true,
      imageUrl,
      weekNumber,
      theme: WEEKLY_THEMES[themeIndex],
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[WeeklyFortune] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate weekly fortune image',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// POST도 지원 (수동 트리거용)
export async function POST(request: Request) {
  return GET(request);
}
