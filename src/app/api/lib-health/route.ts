export async function GET() {
  const SajuLib = await import("@/lib/Saju/saju");
  const AstroLib = await import("@/lib/astrology/astrology");

  const sajuExports = Object.keys(SajuLib || {});
  const astroExports = Object.keys(AstroLib || {});

  let sajuSample: any = null;
  let astroSample: any = null;
  let sajuError: string | null = null;
  let astroError: string | null = null;

  try {
    const sajuFn: any =
      (SajuLib as any).getSaju ||
      (SajuLib as any).saju ||
      (SajuLib as any).default ||
      null;

    if (sajuFn) {
      sajuSample = await sajuFn({
        birthDate: "1993-05-01",
        birthTime: "06:00",
        gender: "male",
        city: "Seoul",
      });
    } else {
      sajuError = "No function: getSaju/saju/default";
    }
  } catch (e: any) {
    sajuError = String(e?.message || e);
  }

  try {
    const astroFn: any =
      (AstroLib as any).getAstrology ||
      (AstroLib as any).astrology ||
      (AstroLib as any).default ||
      null;

    if (astroFn) {
      astroSample = await astroFn({
        birthDate: "1993-05-01",
        birthTime: "06:00",
        city: "Seoul",
      });
    } else {
      astroError = "No function: getAstrology/astrology/default";
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
          sajuSample && JSON.stringify(sajuSample).slice(0, 1000),
        astroSamplePreview:
          astroSample && JSON.stringify(astroSample).slice(0, 1000),
      },
      null,
      2
    ),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}