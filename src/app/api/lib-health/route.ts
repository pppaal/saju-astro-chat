import { HTTP_STATUS } from '@/lib/constants/http';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// src/app/api/lib-health/route.ts
export async function GET() {
  // 동적 import: 빌드 시 평가 안전
  const SajuLib = await import('@/lib/Saju/saju').catch(() => ({} as Record<string, unknown>));
  const AstroLib = await import('@/lib/astrology/foundation/astrologyService').catch(() => ({} as Record<string, unknown>));

  const sajuExports = Object.keys(SajuLib || {});
  const astroExports = Object.keys(AstroLib || {});

  let sajuSample: unknown = null;
  let astroSample: unknown = null;
  let sajuError: string | null = null;
  let astroError: string | null = null;
  const isFunction = (value: unknown): value is (...args: unknown[]) => unknown => typeof value === 'function';

  // Saju: 가능한 엔트리 호출 시도
  try {
    const sajuFn =
      (SajuLib as Record<string, unknown>).getSaju ||
      (SajuLib as Record<string, unknown>).saju ||
      (SajuLib as Record<string, unknown>).default ||
      null;

    if (isFunction(sajuFn)) {
      sajuSample = await sajuFn({
        birthDate: '1993-05-01',
        birthTime: '06:00',
        gender: 'male',
        city: 'Seoul',
      });
    } else {
      sajuError = 'No function: getSaju/saju/default';
    }
  } catch (e: unknown) {
    sajuError = e instanceof Error ? e.message : String(e);
  }

  // Astrology: Gemini 의존 엔트리 실행 제거
  // 가능한 경우, 순수 계산/생성 함수만 호출 (예: buildChartData, calculateHouses 등)
  try {
    const astroFn =
      (AstroLib as Record<string, unknown>).buildChartData ||
      (AstroLib as Record<string, unknown>).calculateChart ||
      (AstroLib as Record<string, unknown>).default ||
      null;

    if (isFunction(astroFn)) {
      astroSample = await astroFn({
        year: 1993,
        month: 5,
        date: 1,
        hour: 6,
        minute: 0,
        latitude: 37.5665,
        longitude: 126.978,
        locationName: 'Seoul',
        timeZone: 'Asia/Seoul',
      });
    } else {
      astroError = 'No function: buildChartData/calculateChart/default';
    }
  } catch (e: unknown) {
    astroError = e instanceof Error ? e.message : String(e);
  }

  return new Response(
    JSON.stringify(
      {
        sajuExports,
        astroExports,
        sajuError,
        astroError,
        sajuSamplePreview:
          sajuSample && typeof sajuSample === 'object'
            ? JSON.stringify(sajuSample).slice(0, 1000)
            : sajuSample,
        astroSamplePreview:
          astroSample && typeof astroSample === 'object'
            ? JSON.stringify(astroSample).slice(0, 1000)
            : String(astroSample ?? ''),
      },
      null,
      2
    ),
    { status: HTTP_STATUS.OK, headers: { 'Content-Type': 'application/json' } }
  );
}
