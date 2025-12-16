import type { CombinedResult } from "@/lib/destiny-map/astrologyengine";

/**
 * Structured output format for fortune prompts with date recommendations
 */
export interface StructuredFortuneOutput {
  sections: {
    id: string;
    title: string;
    icon: string;
    content: string;
    reasoning?: string;
    terminology?: Array<{ term: string; explanation: string }>;
  }[];
  dateRecommendations: {
    lucky: Array<{
      date: string;
      reason: string;
      sajuFactor?: string;
      astroFactor?: string;
      rating: 1 | 2 | 3 | 4 | 5;
    }>;
    caution: Array<{
      date: string;
      reason: string;
      sajuFactor?: string;
      astroFactor?: string;
    }>;
    bestPeriod?: {
      start: string;
      end: string;
      reason: string;
    };
  };
  keyInsights: Array<{
    type: "strength" | "opportunity" | "caution" | "advice";
    text: string;
    icon: string;
  }>;
  sajuHighlight?: {
    pillar: string;
    element: string;
    meaning: string;
  };
  astroHighlight?: {
    planet: string;
    sign: string;
    meaning: string;
  };
}

/**
 * Build structured fortune prompt that returns JSON with date recommendations
 * Includes ALL advanced astrology and saju data (v6.0 - Complete Data Integration)
 */
export function buildStructuredFortunePrompt(
  lang: string,
  theme: string,
  data: CombinedResult
): string {
  const { astrology = {}, saju } = data ?? {};
  const {
    planets = [],
    aspects = [],
    ascendant,
    mc,
    transits = [],
  } = astrology as any;
  const { pillars, dayMaster, unse, sinsal, advancedAnalysis } = saju ?? {} as any;

  // ========== BASIC PLANETARY DATA ==========
  const getPlanet = (name: string) => planets.find((p: any) => p.name === name);
  const sun = getPlanet("Sun");
  const moon = getPlanet("Moon");
  const mercury = getPlanet("Mercury");
  const venus = getPlanet("Venus");
  const mars = getPlanet("Mars");
  const jupiter = getPlanet("Jupiter");
  const saturn = getPlanet("Saturn");
  const uranus = getPlanet("Uranus");
  const neptune = getPlanet("Neptune");
  const pluto = getPlanet("Pluto");
  const northNode = getPlanet("North Node");

  // ========== PILLARS FORMATTING ==========
  const formatPillar = (p: any) => {
    if (!p) return null;
    const stem = p.heavenlyStem?.name || p.ganji?.split?.('')?.[0] || '';
    const branch = p.earthlyBranch?.name || p.ganji?.split?.('')?.[1] || '';
    return stem && branch ? `${stem}${branch}` : null;
  };
  const pillarText = [
    formatPillar(pillars?.year),
    formatPillar(pillars?.month),
    formatPillar(pillars?.day),
    formatPillar(pillars?.time),
  ].filter(Boolean).join(" / ") || "-";

  // ========== CURRENT LUCK CYCLES (운세) ==========
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  // 대운 (10-year cycle)
  const currentDaeun: any = (unse?.daeun ?? []).find((d: any) => {
    const now = currentYear;
    return d.startYear <= now && d.endYear >= now;
  });

  // 세운 (annual)
  const currentAnnual: any = (unse?.annual ?? []).find((a: any) => a.year === currentYear);

  // 월운 (monthly)
  const currentMonthly: any = (unse?.monthly ?? []).find(
    (m: any) => m.year === currentYear && m.month === currentMonth
  );

  // Upcoming months
  const upcomingMonths = (unse?.monthly ?? [])
    .filter((m: any) => {
      if (m.year > currentYear) return true;
      if (m.year === currentYear && m.month >= currentMonth) return true;
      return false;
    })
    .slice(0, 6);

  // ========== SINSAL (신살) ==========
  const luckyList = ((sinsal as any)?.luckyList ?? []).map((x: any) => x.name).join(", ");
  const unluckyList = ((sinsal as any)?.unluckyList ?? []).map((x: any) => x.name).join(", ");
  const twelveGods = ((sinsal as any)?.twelveAll ?? []).slice(0, 5).map((x: any) => x.name).join(", ");

  // ========== TRANSITS ==========
  const significantTransits = transits
    .filter((t: any) => ["conjunction", "trine", "sextile", "square", "opposition"].includes(t.type))
    .slice(0, 8);

  // ========== ASPECTS ==========
  const majorAspects = (aspects ?? [])
    .filter((a: any) => ["conjunction", "trine", "square", "opposition", "sextile"].includes(a.type))
    .slice(0, 10)
    .map((a: any) => `${a.planet1?.name ?? a.from}-${a.type}-${a.planet2?.name ?? a.to}`);

  // ========== EXTRA POINTS (Chiron, Lilith, Part of Fortune, Vertex) ==========
  const extraPoints = data.extraPoints;
  const extraPointsText = extraPoints ? [
    extraPoints.chiron ? `Chiron: ${extraPoints.chiron.sign} (House ${extraPoints.chiron.house})` : null,
    extraPoints.lilith ? `Lilith: ${extraPoints.lilith.sign} (House ${extraPoints.lilith.house})` : null,
    extraPoints.partOfFortune ? `Part of Fortune: ${extraPoints.partOfFortune.sign} (House ${extraPoints.partOfFortune.house})` : null,
    extraPoints.vertex ? `Vertex: ${extraPoints.vertex.sign} (House ${extraPoints.vertex.house})` : null,
  ].filter(Boolean).join("\n") : "-";

  // ========== SOLAR RETURN (연간 차트) ==========
  const solarReturn = data.solarReturn as any;
  const solarReturnText = solarReturn ? [
    `SR Ascendant: ${solarReturn.summary?.ascSign ?? solarReturn.summary?.ascendant ?? "-"}`,
    `SR Sun House: ${solarReturn.summary?.sunHouse ?? "-"}`,
    `SR Moon: ${solarReturn.summary?.moonSign ?? "-"} (House ${solarReturn.summary?.moonHouse ?? "-"})`,
    `SR Theme: ${solarReturn.summary?.theme ?? solarReturn.summary?.yearTheme ?? "-"}`,
  ].join("\n") : "-";

  // ========== LUNAR RETURN (월간 차트) ==========
  const lunarReturn = data.lunarReturn as any;
  const lunarReturnText = lunarReturn ? [
    `LR Ascendant: ${lunarReturn.summary?.ascSign ?? lunarReturn.summary?.ascendant ?? "-"}`,
    `LR Moon House: ${lunarReturn.summary?.moonHouse ?? "-"}`,
    `LR Theme: ${lunarReturn.summary?.theme ?? lunarReturn.summary?.monthTheme ?? "-"}`,
  ].join("\n") : "-";

  // ========== PROGRESSIONS ==========
  const progressions = data.progressions as any;
  const progressionsText = progressions ? [
    `Secondary Progressed Sun: ${progressions.secondary?.summary?.keySigns?.sun ?? progressions.secondary?.summary?.progressedSun ?? "-"}`,
    `Secondary Progressed Moon: ${progressions.secondary?.summary?.keySigns?.moon ?? progressions.secondary?.summary?.progressedMoon ?? "-"}`,
    `Progressed Moon Phase: ${progressions.secondary?.moonPhase?.phase ?? "-"} (${progressions.secondary?.moonPhase?.description ?? ""})`,
    progressions.solarArc ? `Solar Arc Sun: ${progressions.solarArc.summary?.keySigns?.sun ?? progressions.solarArc.summary?.progressedSun ?? "-"}` : null,
  ].filter(Boolean).join("\n") : "-";

  // ========== DRACONIC (드라코닉 - 영혼 차트) ==========
  const draconic = data.draconic as any;
  const draconicText = draconic ? [
    `Draconic Sun: ${draconic.chart?.planets?.find((p: any) => p.name === "Sun")?.sign ?? "-"}`,
    `Draconic Moon: ${draconic.chart?.planets?.find((p: any) => p.name === "Moon")?.sign ?? "-"}`,
    `Draconic ASC: ${draconic.chart?.ascendant?.sign ?? "-"}`,
    draconic.comparison?.alignments ? `Key Alignments: ${draconic.comparison.alignments.slice(0, 3).map((a: any) => a.description).join("; ")}` : null,
  ].filter(Boolean).join("\n") : "-";

  // ========== HARMONICS (하모닉) ==========
  const harmonics = data.harmonics as any;
  const harmonicsText = harmonics ? [
    harmonics.profile?.dominant ? `Dominant Harmonic: H${harmonics.profile.dominant} (${getHarmonicMeaning(harmonics.profile.dominant)})` : null,
    harmonics.profile?.creative ? `Creative Harmonic (H5): ${harmonics.profile.creative?.toFixed?.(1) ?? harmonics.profile.creative}%` : null,
    harmonics.profile?.spiritual ? `Spiritual Harmonic (H9): ${harmonics.profile.spiritual?.toFixed?.(1) ?? harmonics.profile.spiritual}%` : null,
    harmonics.profile?.intuitive ? `Intuitive Harmonic (H7): ${harmonics.profile.intuitive?.toFixed?.(1) ?? harmonics.profile.intuitive}%` : null,
  ].filter(Boolean).join("\n") : "-";

  // ========== ASTEROIDS (소행성) ==========
  const asteroids = data.asteroids as any;
  const asteroidsText = asteroids ? [
    asteroids.ceres ? `Ceres (양육): ${asteroids.ceres.sign} (House ${asteroids.ceres.house})` : null,
    asteroids.pallas ? `Pallas (지혜): ${asteroids.pallas.sign} (House ${asteroids.pallas.house})` : null,
    asteroids.juno ? `Juno (관계): ${asteroids.juno.sign} (House ${asteroids.juno.house})` : null,
    asteroids.vesta ? `Vesta (헌신): ${asteroids.vesta.sign} (House ${asteroids.vesta.house})` : null,
    asteroids.aspects ? `Asteroid Aspects: ${formatAsteroidAspects(asteroids.aspects)}` : null,
  ].filter(Boolean).join("\n") : "-";

  // ========== FIXED STARS (항성) ==========
  const fixedStars = data.fixedStars as any;
  const fixedStarsText = fixedStars?.length ? fixedStars.slice(0, 5).map((fs: any) =>
    `${fs.star} conjunct ${fs.planet} (${fs.meaning ?? ""})`
  ).join("\n") : "-";

  // ========== ECLIPSES (일/월식) ==========
  const eclipses = data.eclipses as any;
  const eclipsesText = eclipses ? [
    eclipses.impact ? `Eclipse Impact: ${eclipses.impact.eclipseType ?? eclipses.impact.type ?? "-"} eclipse affecting ${eclipses.impact.affectedPoint ?? eclipses.impact.affectedPlanet ?? "natal chart"} - ${eclipses.impact.interpretation ?? ""}` : "No recent eclipse impact",
    eclipses.upcoming?.length ? `Next Eclipse: ${eclipses.upcoming[0]?.date ?? "-"} (${eclipses.upcoming[0]?.type ?? "-"})` : null,
  ].filter(Boolean).join("\n") : "-";

  // ========== ELECTIONAL (택일 분석) ==========
  const electional = data.electional as any;
  const electionalText = electional ? [
    `Moon Phase: ${typeof electional.moonPhase === 'string' ? electional.moonPhase : (electional.moonPhase?.phase ?? electional.moonPhase?.name ?? "-")} (${electional.moonPhase?.illumination?.toFixed?.(0) ?? ""}%)`,
    electional.voidOfCourse ? `Void of Course Moon: ${electional.voidOfCourse.isVoid ? "YES - avoid important decisions" : "No"}` : null,
    `Planetary Hour: ${electional.planetaryHour?.planet ?? "-"} (${electional.planetaryHour?.quality ?? electional.planetaryHour?.dayType ?? "-"})`,
    electional.retrograde?.length ? `Retrograde Planets: ${electional.retrograde.join(", ")}` : "No retrogrades",
    electional.analysis?.score ? `Overall Score: ${electional.analysis.score}/100 - ${electional.analysis.recommendation ?? ""}` : null,
  ].filter(Boolean).join("\n") : "-";

  // ========== MIDPOINTS (미드포인트) ==========
  const midpoints = data.midpoints as any;
  const midpointsText = midpoints ? [
    midpoints.sunMoon ? `Sun/Moon Midpoint: ${midpoints.sunMoon.sign} ${midpoints.sunMoon.degree?.toFixed?.(0) ?? midpoints.sunMoon.degree ?? 0}° (심리적 통합점)` : null,
    midpoints.ascMc ? `ASC/MC Midpoint: ${midpoints.ascMc.sign} ${midpoints.ascMc.degree?.toFixed?.(0) ?? midpoints.ascMc.degree ?? 0}° (자아 표현점)` : null,
    midpoints.activations?.length ? `Active Midpoints: ${midpoints.activations.slice(0, 3).map((a: any) => a.description).join("; ")}` : null,
  ].filter(Boolean).join("\n") : "-";

  // ========== ADVANCED SAJU ANALYSIS ==========
  // Cast to any to avoid type errors with dynamic property access
  const adv = advancedAnalysis as any;

  // 신강/신약 (Strength Analysis)
  const strengthText = adv?.extended?.strength ? [
    `일간 강도: ${adv.extended.strength.level} (${adv.extended.strength.score?.toFixed?.(0) ?? adv.extended.strength.score ?? 0}점)`,
    `지지 근: ${adv.extended.strength.rootCount ?? adv.extended.strength.roots ?? 0}개`,
    `인비 비율: ${adv.extended.strength.supportRatio?.toFixed?.(0) ?? adv.extended.strength.ratio ?? 0}%`,
  ].join(" | ") : "-";

  // 격국 (Geokguk - Chart Pattern)
  const geokgukText = adv?.geokguk ? [
    `격국: ${adv.geokguk.type ?? adv.geokguk.name ?? "-"}`,
    `등급: ${adv.geokguk.grade ?? adv.geokguk.level ?? "-"}`,
    adv.geokguk.description ? `설명: ${adv.geokguk.description}` : null,
    adv.geokguk.characteristics?.length ? `특성: ${adv.geokguk.characteristics.join(", ")}` : null,
  ].filter(Boolean).join("\n") : (adv?.extended?.geokguk ? `격국: ${adv.extended.geokguk.type ?? adv.extended.geokguk.name ?? "-"} (${adv.extended.geokguk.description ?? adv.extended.geokguk.explanation ?? ""})` : "-");

  // 용신 (Yongsin - Favorable God)
  const yongsinText = adv?.yongsin ? [
    `용신: ${adv.yongsin.primary?.element ?? adv.yongsin.yongsin ?? "-"} (${adv.yongsin.primary?.reason ?? adv.yongsin.reason ?? ""})`,
    adv.yongsin.secondary ? `희신: ${adv.yongsin.secondary?.element ?? adv.yongsin.secondary ?? "-"}` : (adv.yongsin.huisin ? `희신: ${adv.yongsin.huisin}` : null),
    adv.yongsin.avoid ? `기신: ${adv.yongsin.avoid?.element ?? adv.yongsin.avoid ?? "-"}` : (adv.yongsin.gisin ? `기신: ${adv.yongsin.gisin}` : null),
    adv.yongsin.recommendations?.length ? `권장사항: ${adv.yongsin.recommendations.join(", ")}` : null,
  ].filter(Boolean).join("\n") : (adv?.extended?.yongsin ? `용신: ${adv.extended.yongsin.primary ?? adv.extended.yongsin.yongsin ?? "-"} | 희신: ${adv.extended.yongsin.secondary ?? adv.extended.yongsin.huisin ?? "-"}` : "-");

  // 조후용신 (Johu Yongsin - Seasonal Balance)
  const johuText = adv?.extended?.johuYongsin ? [
    `조후용신: ${adv.extended.johuYongsin.needed ?? adv.extended.johuYongsin.element ?? "-"}`,
    `계절 밸런스: ${adv.extended.johuYongsin.seasonalBalance ?? adv.extended.johuYongsin.balance ?? "-"}`,
  ].join(" | ") : (adv?.extended?.johu ? `조후용신: ${adv.extended.johu.needed ?? adv.extended.johu.element ?? "-"}` : "-");

  // 통근 (Tonggeun - Root Strength)
  const tonggeunText = adv?.tonggeun ? [
    `통근 점수: ${adv.tonggeun.score ?? adv.tonggeun.strength ?? 0}`,
    `통근 상태: ${adv.tonggeun.status ?? adv.tonggeun.level ?? "-"}`,
    adv.tonggeun.details ? `상세: ${JSON.stringify(adv.tonggeun.details)}` : (adv.tonggeun.branches ? `지지: ${JSON.stringify(adv.tonggeun.branches)}` : null),
  ].filter(Boolean).join("\n") : "-";

  // 투출 (Tuechul - Stem Emergence)
  const tuechulText = adv?.tuechul?.length ? adv.tuechul.map((t: any) =>
    `${t.stem ?? t.gan ?? "-"} 투출: ${t.branch ?? t.ji ?? "-"}에서 (${t.strength ?? t.level ?? "-"})`
  ).join("\n") : "-";

  // 회국 (Hoeguk - Branch Combination)
  const hoegukText = adv?.hoeguk?.length ? adv.hoeguk.map((h: any) =>
    `${h.type ?? h.name ?? "-"}: ${h.branches?.join?.("-") ?? "-"} → ${h.result ?? h.element ?? "-"}`
  ).join("\n") : "-";

  // 득령 (Deukryeong - Seasonal Timing)
  const deukryeongText = adv?.deukryeong ? [
    `득령 여부: ${adv.deukryeong.isDeukryeong ?? adv.deukryeong.status ? "YES" : "NO"}`,
    `계절 기운: ${adv.deukryeong.seasonalEnergy ?? adv.deukryeong.season ?? "-"}`,
    adv.deukryeong.explanation ? `설명: ${adv.deukryeong.explanation}` : (adv.deukryeong.description ? `설명: ${adv.deukryeong.description}` : null),
  ].filter(Boolean).join("\n") : "-";

  // 형충회합 (Hyeongchung - Interactions)
  const hyeongchungText = adv?.hyeongchung ? [
    adv.hyeongchung.chung?.length ? `충(沖): ${adv.hyeongchung.chung.map((c: any) => `${c.branch1 ?? c.from}-${c.branch2 ?? c.to}`).join(", ")}` : (adv.hyeongchung.clashes?.length ? `충(沖): ${adv.hyeongchung.clashes.map((c: any) => c.description ?? `${c.from}-${c.to}`).join(", ")}` : null),
    adv.hyeongchung.hyeong?.length ? `형(刑): ${adv.hyeongchung.hyeong.map((h: any) => `${h.branch1 ?? h.from}-${h.branch2 ?? h.to}`).join(", ")}` : (adv.hyeongchung.punishments?.length ? `형(刑): ${adv.hyeongchung.punishments.map((p: any) => p.description ?? `${p.from}-${p.to}`).join(", ")}` : null),
    adv.hyeongchung.hap?.length ? `합(合): ${adv.hyeongchung.hap.map((h: any) => `${h.branch1 ?? h.from}-${h.branch2 ?? h.to}→${h.result ?? ""}`).join(", ")}` : (adv.hyeongchung.combinations?.length ? `합(合): ${adv.hyeongchung.combinations.map((c: any) => c.description ?? `${c.branches?.join?.("-")}`).join(", ")}` : null),
    adv.hyeongchung.samhap?.length ? `삼합(三合): ${adv.hyeongchung.samhap.map((s: any) => s.branches?.join?.("-") ?? s.description).join("; ")}` : null,
    adv.hyeongchung.banghap?.length ? `방합(方合): ${adv.hyeongchung.banghap.map((b: any) => b.branches?.join?.("-") ?? b.description).join("; ")}` : null,
  ].filter(Boolean).join("\n") : "-";

  // 십신 분석 (Sibsin - Ten Gods)
  const sibsinText = adv?.sibsin ? [
    adv.sibsin.distribution ? `십신 분포: ${Object.entries(adv.sibsin.distribution).map(([k, v]) => `${k}(${v})`).join(", ")}` : (adv.sibsin.counts ? `십신 분포: ${Object.entries(adv.sibsin.counts).map(([k, v]) => `${k}(${v})`).join(", ")}` : null),
    adv.sibsin.dominant ? `주요 십신: ${adv.sibsin.dominant}` : (adv.sibsin.primary ? `주요 십신: ${adv.sibsin.primary}` : null),
    adv.sibsin.missing?.length ? `결핍 십신: ${adv.sibsin.missing.join(", ")}` : (adv.sibsin.absent?.length ? `결핍 십신: ${adv.sibsin.absent.join(", ")}` : null),
    adv.sibsin.personality ? `성격 특성: ${adv.sibsin.personality}` : (adv.sibsin.personalityTraits ? `성격 특성: ${adv.sibsin.personalityTraits}` : null),
    adv.sibsin.careerAptitude ? `직업 적성: ${adv.sibsin.careerAptitude}` : (adv.sibsin.careerAptitudes?.length ? `직업 적성: ${adv.sibsin.careerAptitudes.join(", ")}` : null),
    adv.sibsin.relationships ? `인간관계: ${adv.sibsin.relationships}` : (adv.sibsin.relationshipStyle ? `인간관계: ${adv.sibsin.relationshipStyle}` : null),
  ].filter(Boolean).join("\n") : "-";

  // 건강/직업 분석
  const healthCareerText = adv?.healthCareer ? [
    adv.healthCareer.health?.vulnerabilities?.length ? `건강 취약점: ${adv.healthCareer.health.vulnerabilities.join(", ")}` : (adv.healthCareer.health?.weakOrgans?.length ? `건강 취약점: ${adv.healthCareer.health.weakOrgans.join(", ")}` : null),
    adv.healthCareer.health?.strengths?.length ? `건강 강점: ${adv.healthCareer.health.strengths.join(", ")}` : (adv.healthCareer.health?.strongOrgans?.length ? `건강 강점: ${adv.healthCareer.health.strongOrgans.join(", ")}` : null),
    adv.healthCareer.career?.suitableFields?.length ? `적합 직업: ${adv.healthCareer.career.suitableFields.join(", ")}` : (adv.healthCareer.career?.aptitudes?.length ? `적합 직업: ${adv.healthCareer.career.aptitudes.join(", ")}` : null),
    adv.healthCareer.career?.workStyle ? `업무 스타일: ${adv.healthCareer.career.workStyle}` : null,
  ].filter(Boolean).join("\n") : "-";

  // 종합 점수
  const scoreText = adv?.score ? [
    `종합 점수: ${adv.score.total ?? adv.score.overall ?? 0}/100`,
    `사업운: ${adv.score.business ?? adv.score.career ?? 0}`,
    `재물운: ${adv.score.wealth ?? adv.score.finance ?? 0}`,
    `건강운: ${adv.score.health ?? 0}`,
    `인간관계: ${adv.score.relationships ?? adv.score.social ?? 0}`,
  ].join(" | ") : "-";

  // 🔥 Ultra Advanced (종격, 화격, 일주론, 공망, 삼기)
  const ultraText = adv?.ultraAdvanced ? [
    adv.ultraAdvanced.jonggeok ? `종격: ${adv.ultraAdvanced.jonggeok.type ?? adv.ultraAdvanced.jonggeok.name ?? "-"} (${adv.ultraAdvanced.jonggeok.description ?? ""})` : null,
    adv.ultraAdvanced.hwagyeok ? `화격: ${adv.ultraAdvanced.hwagyeok.type ?? adv.ultraAdvanced.hwagyeok.name ?? "-"} (${adv.ultraAdvanced.hwagyeok.description ?? ""})` : null,
    adv.ultraAdvanced.iljuAnalysis ? `일주론: ${adv.ultraAdvanced.iljuAnalysis.character ?? adv.ultraAdvanced.iljuAnalysis.personality ?? "-"} - ${adv.ultraAdvanced.iljuAnalysis.advice ?? adv.ultraAdvanced.iljuAnalysis.guidance ?? ""}` : null,
    adv.ultraAdvanced.gongmang ? `공망: ${adv.ultraAdvanced.gongmang.branches?.join?.(", ") ?? adv.ultraAdvanced.gongmang.emptyBranches?.join?.(", ") ?? "-"} (${adv.ultraAdvanced.gongmang.impact ?? adv.ultraAdvanced.gongmang.interpretation ?? ""})` : null,
    adv.ultraAdvanced.samgi ? `삼기: ${adv.ultraAdvanced.samgi.type ?? adv.ultraAdvanced.samgi.name ?? "없음"} ${adv.ultraAdvanced.samgi.present ?? adv.ultraAdvanced.samgi.found ? "- 발견!" : ""}` : null,
  ].filter(Boolean).join("\n") : "-";

  // ========== BUILD THE PROMPT ==========
  const dateText = data.analysisDate ?? new Date().toISOString().slice(0, 10);
  const tzInfo = data.userTimezone ? ` (${data.userTimezone})` : "";

  const themeInstructions: Record<string, string> = {
    today: "Focus on today's energy and micro-actions. Give specific timing advice for the day.",
    love: "Focus on relationships, attraction, and emotional connections. Give date recommendations for romantic activities.",
    career: "Focus on work, professional growth, and opportunities. Give timing for important meetings, negotiations, or job changes.",
    health: "Focus on physical and mental wellness. Give timing for starting new health routines or rest periods.",
    wealth: "Focus on finances, investments, and abundance. Give timing for financial decisions and opportunities.",
    family: "Focus on family dynamics and relationships. Give timing for family gatherings or important conversations.",
    month: "Focus on the month's overall energy. Give week-by-week date recommendations.",
    year: "Focus on the year's themes. Give month-by-month recommendations for major decisions.",
    newyear: "Focus on new year prospects. Give quarterly recommendations for the year ahead.",
    life: "Focus on life purpose and direction. Give timing for major life transitions.",
  };

  const instruction = themeInstructions[theme] || themeInstructions.today;

  return `
[COMPREHENSIVE FORTUNE ANALYSIS v6.0 - ${theme.toUpperCase()}]
Date: ${dateText}${tzInfo}
Locale: ${lang}

===========================================
PART 1: SAJU (사주) - KOREAN ASTROLOGY
===========================================

=== 기본 사주 정보 ===
Day Master (일간): ${dayMaster?.name ?? "-"} (${dayMaster?.element ?? "-"})
Four Pillars (사주): ${pillarText}

=== 운세 흐름 (대운/세운/월운) ===
Current Daeun (대운): ${currentDaeun?.name ?? "-"} (${currentDaeun?.startYear ?? ""}-${currentDaeun?.endYear ?? ""})
Annual Fortune (세운): ${currentAnnual?.element ?? "-"} ${currentAnnual?.year ?? ""}
Monthly Fortune (월운): ${currentMonthly?.element ?? "-"} ${currentMonthly?.year ?? ""}-${currentMonthly?.month ?? ""}

=== 신강/신약 분석 ===
${strengthText}

=== 격국 (Chart Pattern) ===
${geokgukText}

=== 용신 (Favorable Elements) ===
${yongsinText}

=== 조후용신 (Seasonal Balance) ===
${johuText}

=== 통근/투출/득령 ===
통근 (Root Strength):
${tonggeunText}

투출 (Stem Emergence):
${tuechulText}

득령 (Seasonal Timing):
${deukryeongText}

=== 회국 (Branch Combinations) ===
${hoegukText}

=== 형충회합 (Interactions) ===
${hyeongchungText}

=== 십신 분석 (Ten Gods) ===
${sibsinText}

=== 건강/직업 적성 ===
${healthCareerText}

=== 종합 점수 ===
${scoreText}

=== 고급 분석 (종격/화격/일주론/공망/삼기) ===
${ultraText}

=== 신살 (Lucky/Unlucky Factors) ===
Lucky (길신): ${luckyList || "-"}
Unlucky (흉신): ${unluckyList || "-"}
Twelve Gods: ${twelveGods || "-"}

=== 향후 월운 (Next 6 Months) ===
${upcomingMonths.map((m: any) => `${m.year}-${String(m.month).padStart(2, "0")}: ${m.element ?? "-"} (${m.heavenlyStem ?? ""} ${m.earthlyBranch ?? ""})`).join("\n")}

===========================================
PART 2: WESTERN ASTROLOGY (서양 점성술)
===========================================

=== 기본 행성 배치 ===
Sun: ${sun?.sign ?? "-"} ${sun?.degree ?? 0}° (House ${sun?.house ?? "-"})
Moon: ${moon?.sign ?? "-"} ${moon?.degree ?? 0}° (House ${moon?.house ?? "-"})
Mercury: ${mercury?.sign ?? "-"} (House ${mercury?.house ?? "-"})
Venus: ${venus?.sign ?? "-"} (House ${venus?.house ?? "-"})
Mars: ${mars?.sign ?? "-"} (House ${mars?.house ?? "-"})
Jupiter: ${jupiter?.sign ?? "-"} (House ${jupiter?.house ?? "-"})
Saturn: ${saturn?.sign ?? "-"} (House ${saturn?.house ?? "-"})
Uranus: ${uranus?.sign ?? "-"} (House ${uranus?.house ?? "-"})
Neptune: ${neptune?.sign ?? "-"} (House ${neptune?.house ?? "-"})
Pluto: ${pluto?.sign ?? "-"} (House ${pluto?.house ?? "-"})
North Node: ${northNode?.sign ?? "-"} (House ${northNode?.house ?? "-"})

=== Angles ===
Ascendant: ${ascendant?.sign ?? "-"} ${ascendant?.degree ?? 0}°
MC (Midheaven): ${mc?.sign ?? "-"} ${mc?.degree ?? 0}°

=== Extra Points (키론, 릴리스 등) ===
${extraPointsText}

=== Major Aspects ===
${majorAspects.join("\n") || "-"}

=== Solar Return (연간 차트 - ${currentYear}) ===
${solarReturnText}

=== Lunar Return (월간 차트) ===
${lunarReturnText}

=== Progressions (진행 차트) ===
${progressionsText}

=== Draconic Chart (드라코닉 - 영혼 차트) ===
${draconicText}

=== Harmonics (하모닉 분석) ===
${harmonicsText}

=== Asteroids (소행성) ===
${asteroidsText}

=== Fixed Stars (항성) ===
${fixedStarsText}

=== Eclipses (일/월식 영향) ===
${eclipsesText}

=== Current Transits (현재 트랜짓) ===
${significantTransits.map((t: any) => `${t.type}: ${t.from?.name ?? "?"} -> ${t.to?.name ?? "?"} (orb: ${t.orb})`).join("\n") || "No significant transits"}

===========================================
PART 3: ELECTIONAL (택일 분석)
===========================================
${electionalText}

===========================================
PART 4: MIDPOINTS (미드포인트)
===========================================
${midpointsText}

===========================================
TASK: ${theme.toUpperCase()} ANALYSIS
===========================================
${instruction}

IMPORTANT ANALYSIS GUIDELINES:
1. CROSS-REFERENCE both Saju and Western astrology for deeper insights
2. DATE RECOMMENDATIONS should use BOTH systems:
   - Saju: 오행 흐름, 충/합 관계, 월운/일진
   - Astrology: 트랜짓, 문페이즈, 보이드오브코스
3. Use the ADVANCED data (격국, 용신, 십신) for personality insights
4. Reference PROGRESSIONS for timing of life developments
5. Use DRACONIC for soul-level/karmic insights
6. Use HARMONICS for creative/spiritual potential
7. Consider ASTEROIDS (Juno for relationships, Ceres for nurturing, etc.)
8. Check FIXED STARS for exceptional talents or challenges
9. Factor in ECLIPSE impacts for major life events
10. Use MIDPOINTS for psychological integration points

You MUST return a valid JSON object with this exact structure:

{
  "sections": [
    {
      "id": "unique-id",
      "title": "Section Title in ${lang}",
      "icon": "emoji",
      "content": "Main content text (2-3 sentences). Use simple, accessible language.",
      "reasoning": "Brief explanation of WHY this is relevant based on the data above (reference specific data points)",
      "terminology": [
        { "term": "Technical term", "explanation": "Simple explanation in ${lang}" }
      ]
    }
  ],
  "dateRecommendations": {
    "lucky": [
      {
        "date": "YYYY-MM-DD",
        "reason": "Why this date is favorable in ${lang}",
        "sajuFactor": "e.g., 월운의 오행이 용신과 일치",
        "astroFactor": "e.g., Jupiter trine natal Sun, Moon not void",
        "rating": 5
      }
    ],
    "caution": [
      {
        "date": "YYYY-MM-DD or date range",
        "reason": "Why to be cautious",
        "sajuFactor": "e.g., 충 관계, 기신 기운",
        "astroFactor": "e.g., Saturn square Moon, Mercury retrograde"
      }
    ],
    "bestPeriod": {
      "start": "YYYY-MM-DD",
      "end": "YYYY-MM-DD",
      "reason": "Why this period is optimal (cross-reference saju and astro)"
    }
  },
  "keyInsights": [
    {
      "type": "strength",
      "text": "Key strength based on 격국/용신/natal chart in ${lang}",
      "icon": "emoji"
    },
    {
      "type": "opportunity",
      "text": "Opportunity from transits/progressions/월운",
      "icon": "emoji"
    },
    {
      "type": "caution",
      "text": "What to watch based on 충/형/difficult aspects",
      "icon": "emoji"
    },
    {
      "type": "advice",
      "text": "Actionable advice synthesizing both systems",
      "icon": "emoji"
    }
  ],
  "sajuHighlight": {
    "pillar": "e.g., 일주 甲子",
    "element": "e.g., 목(木) - 용신",
    "meaning": "What this means for the user in ${lang}"
  },
  "astroHighlight": {
    "planet": "e.g., Venus in Libra",
    "sign": "House 7",
    "meaning": "What this means for the user in ${lang}"
  }
}

IMPORTANT GUIDELINES:
1. Cross-analyze SAJU + ASTROLOGY for date recommendations
2. Explain terminology in simple terms - no jargon without explanation
3. Give reasoning based on SPECIFIC data points from above
4. Reference advanced features (격국, 용신, progressions, draconic) in your analysis
5. All text should be in ${lang}
6. Return ONLY the JSON object, no markdown formatting

Respond in ${lang} for all text content.
`.trim();
}

/**
 * Get harmonic meaning for a given harmonic number
 */
function getHarmonicMeaning(h: number): string {
  const meanings: Record<number, string> = {
    5: "창조성/재능",
    7: "영감/직관",
    9: "완성/이상",
  };
  return meanings[h] || "";
}

/**
 * Format asteroid aspects - handles both array and object formats
 */
function formatAsteroidAspects(aspects: any): string {
  if (!aspects) return "-";

  // If it's an array, format directly
  if (Array.isArray(aspects)) {
    return aspects.slice(0, 3).map((a: any) =>
      `${a.asteroid ?? a.from}-${a.type ?? a.aspect}-${a.planet ?? a.to}`
    ).join(", ");
  }

  // If it's an object (Record<AsteroidName, AspectHit[]>), flatten it
  if (typeof aspects === 'object') {
    const allAspects: any[] = [];
    for (const [asteroidName, hits] of Object.entries(aspects)) {
      if (Array.isArray(hits)) {
        for (const hit of hits.slice(0, 2)) {
          allAspects.push({
            asteroid: asteroidName,
            type: (hit as any).type ?? (hit as any).aspect,
            planet: (hit as any).planet2?.name ?? (hit as any).to ?? (hit as any).planet
          });
        }
      }
    }
    return allAspects.slice(0, 3).map(a => `${a.asteroid}-${a.type}-${a.planet}`).join(", ");
  }

  return "-";
}

/**
 * Parse the structured JSON response from the AI
 */
export function parseStructuredResponse(response: string): StructuredFortuneOutput | null {
  try {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate required fields
    if (!parsed.sections || !Array.isArray(parsed.sections)) return null;
    if (!parsed.dateRecommendations) return null;

    return parsed as StructuredFortuneOutput;
  } catch (error) {
    console.error("[parseStructuredResponse] Error:", error);
    return null;
  }
}
