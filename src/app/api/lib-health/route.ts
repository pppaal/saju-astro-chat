// src/app/api/lib-health/route.ts

export async function GET() {
  // 동적 import: 빌드 시 평가 안전 + 경로 표준화
  const SajuLib = await import('@/lib/Saju/saju').catch(() => ({} as any));
  const AstroLib = await import('@/lib/astrology/astrologyService').catch(() => ({} as any));

  const sajuExports = Object.keys(SajuLib || {});
  const astroExports = Object.keys(AstroLib || {});

  let sajuSample: any = null;
  let astroSample: any = null;
  let sajuError: string | null = null;
  let astroError: string | null = null;

  // Saju: 기존 가능한 엔트리들을 시도
  try {
    const sajuFn: any =
      (SajuLib as any).getSaju ||
      (SajuLib as any).saju ||
      (SajuLib as any).default ||
      null;

    if (typeof sajuFn === 'function') {
      sajuSample = await sajuFn({
        birthDate: '1993-05-01',
        birthTime: '06:00',
        gender: 'male',
        city: 'Seoul',
      });
    } else {
      sajuError = 'No function: getSaju/saju/default';
    }
  } catch (e: any) {
    sajuError = String(e?.message || e);
  }

  // Astrology: 표준 API(generatePromptForGemini) 사용
  try {
    const gen: any =
      (AstroLib as any).generatePromptForGemini ||
      (AstroLib as any).default ||
      null;

    if (typeof gen === 'function') {
      astroSample = gen({
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
      astroError = 'No function: generatePromptForGemini/default';
    }
  } catch (e: any) {
    astroError = String(e?.message || e);
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
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}