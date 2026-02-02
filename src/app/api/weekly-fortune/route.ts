import { NextRequest, NextResponse } from 'next/server';
import { withApiMiddleware, createSimpleGuard, type ApiContext } from '@/lib/api/middleware';
import { getWeeklyFortuneImage } from '@/lib/weeklyFortune';
import { HTTP_STATUS } from '@/lib/constants/http';

// 클라이언트에서 주간 운세 이미지 조회
export const GET = withApiMiddleware(
  async (_req: NextRequest, _context: ApiContext) => {
    const data = await getWeeklyFortuneImage();

    if (!data) {
      return NextResponse.json(
        {
          imageUrl: null,
          message: 'No weekly fortune image available yet'
        },
        {
          status: HTTP_STATUS.OK,
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
  },
  createSimpleGuard({
    route: '/api/weekly-fortune',
    limit: 120,
    windowSeconds: 60,
  })
)
