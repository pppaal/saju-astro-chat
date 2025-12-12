import { NextResponse } from 'next/server';
import { getWeeklyFortuneImage } from '@/lib/weeklyFortune';

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
        { status: 200 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[WeeklyFortune] Error fetching:', error);
    return NextResponse.json(
      { error: 'Failed to fetch weekly fortune image' },
      { status: 500 }
    );
  }
}
