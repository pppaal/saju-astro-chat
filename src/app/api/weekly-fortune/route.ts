import { NextResponse } from 'next/server';
import { getWeeklyFortuneImage } from '@/lib/weeklyFortune';
import { logger } from '@/lib/logger';

// 클라이언트에서 주간 운세 이미지 조회
export async function GET() {
  try {
    const data = await getWeeklyFortuneImage();

    if (!data) {
      return NextResponse.json(
        {
          imageUrl: null,
          message: 'No weekly fortune image available yet'
        },
        {
          status: 200,
          headers: {
            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
          }
        }
      );
    }

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
      }
    });
  } catch (error) {
    logger.error('[WeeklyFortune] Error fetching', { error });
    return NextResponse.json(
      { error: 'Failed to fetch weekly fortune image' },
      { status: 500 }
    );
  }
}
