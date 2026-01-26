// @ts-nocheck - Complex dynamic structures from external APIs
 
/**
 * Structured Fortune Prompt Builder
 * @deprecated Use index.ts for main prompt generation. This file provides structured output format.
 */
import type { CombinedResult } from "@/lib/destiny-map/astrologyengine";
import type { AstrologyData, SajuData } from "@/lib/destiny-map/astrology/types";
import type { PlanetData } from "@/lib/astrology";
import { logger } from "@/lib/logger";

// Internal helper types for loose data structures
type PlanetInput = { name?: string; sign?: string; house?: number; heavenlyStem?: { name?: string }; earthlyBranch?: { name?: string }; ganji?: string; description?: string; from?: string; to?: string };
type UnseItem = { year?: number; month?: number; element?: string; ganji?: string; heavenlyStem?: string; earthlyBranch?: string };
type AspectItem = { year?: number; month?: number };
type SinsalItem = { name?: string; stars?: string[] };
type MonthlyItem = { year?: number; month?: number; element?: string; heavenlyStem?: string; earthlyBranch?: string };
type TransitItem = { type?: string; aspectType?: string; from?: { name?: string }; to?: { name?: string }; transitPlanet?: string; natalPoint?: string; orb?: string; isApplying?: boolean };
type HoegukItem = { type?: string; name?: string; resultElement?: string };
type BranchInteraction = { branch1?: string; branch2?: string; from?: string; to?: string; result?: string; description?: string; branches?: string[] };

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
      easternFactor?: string;
      astroFactor?: string;
      rating: 1 | 2 | 3 | 4 | 5;
    }>;
    caution: Array<{
      date: string;
      reason: string;
      easternFactor?: string;
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
  easternHighlight?: {
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
  const astroData = astrology as AstrologyData | Record<string, unknown>;
  const {
    planets = [],
    aspects = [],
    ascendant,
    mc,
    transits = [],
  } = astroData as AstrologyData;
  const sajuData = (saju ?? {}) as SajuData;
  const { pillars, dayMaster, unse, sinsal, advancedAnalysis } = sajuData;

  // ========== BASIC PLANETARY DATA ==========
  const planetsArray = planets as PlanetInput[];
  const getPlanet = (name: string) => planetsArray.find((p: PlanetInput) => p.name === name);
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
  const formatPillar = (p: PlanetInput) => {
    if (!p) {return null;}
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
  const currentDaeun: UnseItem | undefined = (unse?.daeun ?? []).find((d: UnseItem) => {
    const now = currentYear;
    return d.startYear <= now && d.endYear >= now;
  });

  // 세운 (annual)
  const currentAnnual = (unse?.annual ?? []).find((a: AspectItem) => a.year === currentYear) as UnseItem | undefined;

  // 월운 (monthly)
  const currentMonthly = (unse?.monthly ?? []).find(
    (m: MonthlyItem) => m.year === currentYear && m.month === currentMonth
  ) as MonthlyItem | undefined;

  // Upcoming months
  const upcomingMonths = (unse?.monthly ?? [])
    .filter((m: MonthlyItem) => {
      if (m.year > currentYear) {return true;}
      if (m.year === currentYear && m.month >= currentMonth) {return true;}
      return false;
    })
    .slice(0, 6);

  // ========== SINSAL (신살) ==========
  type SinsalRecord = { luckyList?: SinsalItem[]; unluckyList?: SinsalItem[]; twelveAll?: SinsalItem[] };
  const sinsalData = sinsal as SinsalRecord | undefined;
  const luckyList = (sinsalData?.luckyList ?? []).map((x: SinsalItem) => x.name).join(", ");
  const unluckyList = (sinsalData?.unluckyList ?? []).map((x: SinsalItem) => x.name).join(", ");
  const twelveGods = (sinsalData?.twelveAll ?? []).slice(0, 5).map((x: SinsalItem) => x.name).join(", ");

  // ========== TRANSITS ==========
  const significantTransits = transits
    .filter((t: TransitItem) => ["conjunction", "trine", "sextile", "square", "opposition"].includes(t.type))
    .slice(0, 8);

  // ========== ASPECTS ==========
  const majorAspects = (aspects ?? [])
    .filter((a: AspectItem) => ["conjunction", "trine", "square", "opposition", "sextile"].includes(a.type))
    .slice(0, 10)
    .map((a: AspectItem) => `${a.planet1?.name ?? a.from}-${a.type}-${a.planet2?.name ?? a.to}`);

  // ========== EXTRA POINTS (Chiron, Lilith, Part of Fortune, Vertex) ==========
  const extraPoints = data.extraPoints;
  const extraPointsText = extraPoints ? [
    extraPoints.chiron ? `Chiron: ${extraPoints.chiron.sign} (House ${extraPoints.chiron.house})` : null,
    extraPoints.lilith ? `Lilith: ${extraPoints.lilith.sign} (House ${extraPoints.lilith.house})` : null,
    extraPoints.partOfFortune ? `Part of Fortune: ${extraPoints.partOfFortune.sign} (House ${extraPoints.partOfFortune.house})` : null,
    extraPoints.vertex ? `Vertex: ${extraPoints.vertex.sign} (House ${extraPoints.vertex.house})` : null,
  ].filter(Boolean).join("\n") : "-";

  // ========== SOLAR RETURN (연간 차트) ==========
  type ReturnSummary = { ascSign?: string; ascendant?: string; sunHouse?: number; moonSign?: string; moonHouse?: number; theme?: string; yearTheme?: string; monthTheme?: string };
  type ReturnData = { summary?: ReturnSummary };
  const solarReturn = data.solarReturn as ReturnData | undefined;
  const solarReturnText = solarReturn ? [
    `SR Ascendant: ${solarReturn.summary?.ascSign ?? solarReturn.summary?.ascendant ?? "-"}`,
    `SR Sun House: ${solarReturn.summary?.sunHouse ?? "-"}`,
    `SR Moon: ${solarReturn.summary?.moonSign ?? "-"} (House ${solarReturn.summary?.moonHouse ?? "-"})`,
    `SR Theme: ${solarReturn.summary?.theme ?? solarReturn.summary?.yearTheme ?? "-"}`,
  ].join("\n") : "-";

  // ========== LUNAR RETURN (월간 차트) ==========
  const lunarReturn = data.lunarReturn as ReturnData | undefined;
  const lunarReturnText = lunarReturn ? [
    `LR Ascendant: ${lunarReturn.summary?.ascSign ?? lunarReturn.summary?.ascendant ?? "-"}`,
    `LR Moon House: ${lunarReturn.summary?.moonHouse ?? "-"}`,
    `LR Theme: ${lunarReturn.summary?.theme ?? lunarReturn.summary?.monthTheme ?? "-"}`,
  ].join("\n") : "-";

  // ========== PROGRESSIONS ==========
  type ProgressionSummary = { keySigns?: { sun?: string; moon?: string }; progressedSun?: string; progressedMoon?: string };
  type ProgressionSecondary = { summary?: ProgressionSummary; moonPhase?: { phase?: string; description?: string } };
  type ProgressionSolarArc = { summary?: ProgressionSummary };
  type ProgressionData = { secondary?: ProgressionSecondary; solarArc?: ProgressionSolarArc };
  const progressions = data.progressions as ProgressionData | undefined;
  const progressionsText = progressions ? [
    `Secondary Progressed Sun: ${progressions.secondary?.summary?.keySigns?.sun ?? progressions.secondary?.summary?.progressedSun ?? "-"}`,
    `Secondary Progressed Moon: ${progressions.secondary?.summary?.keySigns?.moon ?? progressions.secondary?.summary?.progressedMoon ?? "-"}`,
    `Progressed Moon Phase: ${progressions.secondary?.moonPhase?.phase ?? "-"} (${progressions.secondary?.moonPhase?.description ?? ""})`,
    progressions.solarArc ? `Solar Arc Sun: ${progressions.solarArc.summary?.keySigns?.sun ?? progressions.solarArc.summary?.progressedSun ?? "-"}` : null,
  ].filter(Boolean).join("\n") : "-";

  // ========== DRACONIC (드라코닉 - 영혼 차트) ==========
  type DraconicAlignment = { description?: string };
  type DraconicComparison = { alignments?: DraconicAlignment[] };
  type DraconicChartData = { planets?: PlanetInput[]; ascendant?: { sign?: string } };
  type DraconicData = { chart?: DraconicChartData; comparison?: DraconicComparison };
  const draconic = data.draconic as DraconicData | undefined;
  const draconicText = draconic ? [
    `Draconic Sun: ${draconic.chart?.planets?.find((p: PlanetInput) => p.name === "Sun")?.sign ?? "-"}`,
    `Draconic Moon: ${draconic.chart?.planets?.find((p: PlanetInput) => p.name === "Moon")?.sign ?? "-"}`,
    `Draconic ASC: ${draconic.chart?.ascendant?.sign ?? "-"}`,
    draconic.comparison?.alignments ? `Key Alignments: ${draconic.comparison.alignments.slice(0, 3).map((a: DraconicAlignment) => a.description).join("; ")}` : null,
  ].filter(Boolean).join("\n") : "-";

  // ========== HARMONICS (하모닉) ==========
  type HarmonicProfile = { dominant?: number; creative?: number; spiritual?: number; intuitive?: number };
  type HarmonicsData = { profile?: HarmonicProfile };
  const harmonics = data.harmonics as HarmonicsData | undefined;
  const harmonicsText = harmonics ? [
    harmonics.profile?.dominant ? `Dominant Harmonic: H${harmonics.profile.dominant} (${getHarmonicMeaning(harmonics.profile.dominant)})` : null,
    harmonics.profile?.creative ? `Creative Harmonic (H5): ${harmonics.profile.creative?.toFixed?.(1) ?? harmonics.profile.creative}%` : null,
    harmonics.profile?.spiritual ? `Spiritual Harmonic (H9): ${harmonics.profile.spiritual?.toFixed?.(1) ?? harmonics.profile.spiritual}%` : null,
    harmonics.profile?.intuitive ? `Intuitive Harmonic (H7): ${harmonics.profile.intuitive?.toFixed?.(1) ?? harmonics.profile.intuitive}%` : null,
  ].filter(Boolean).join("\n") : "-";

  // ========== ASTEROIDS (소행성) ==========
  type AsteroidPoint = { sign?: string; house?: number };
  type AsteroidAspect = { asteroid?: string; from?: string; type?: string; aspect?: string; planet?: string; to?: string; planet2?: { name?: string } };
  type AsteroidsData = { ceres?: AsteroidPoint; pallas?: AsteroidPoint; juno?: AsteroidPoint; vesta?: AsteroidPoint; aspects?: AsteroidAspect[] | Record<string, AsteroidAspect[]> };
  const asteroids = (data as Record<string, unknown>).asteroids as AsteroidsData | undefined;
  const asteroidsText = asteroids ? [
    asteroids.ceres ? `Ceres (양육): ${asteroids.ceres.sign} (House ${asteroids.ceres.house})` : null,
    asteroids.pallas ? `Pallas (지혜): ${asteroids.pallas.sign} (House ${asteroids.pallas.house})` : null,
    asteroids.juno ? `Juno (관계): ${asteroids.juno.sign} (House ${asteroids.juno.house})` : null,
    asteroids.vesta ? `Vesta (헌신): ${asteroids.vesta.sign} (House ${asteroids.vesta.house})` : null,
    asteroids.aspects ? `Asteroid Aspects: ${formatAsteroidAspects(asteroids.aspects)}` : null,
  ].filter(Boolean).join("\n") : "-";

  // ========== FIXED STARS (항성) ==========
  type FixedStarItem = { star?: string; planet?: string; meaning?: string };
  const fixedStars = data.fixedStars as FixedStarItem[] | undefined;
  const fixedStarsText = fixedStars?.length ? fixedStars.slice(0, 5).map((fs: FixedStarItem) =>
    `${fs.star} conjunct ${fs.planet} (${fs.meaning ?? ""})`
  ).join("\n") : "-";

  // ========== ECLIPSES (일/월식) ==========
  type EclipseImpact = { eclipseType?: string; type?: string; affectedPoint?: string; affectedPlanet?: string; interpretation?: string };
  type UpcomingEclipse = { date?: string; type?: string };
  type EclipsesData = { impact?: EclipseImpact; upcoming?: UpcomingEclipse[] };
  const eclipses = data.eclipses as EclipsesData | undefined;
  const eclipsesText = eclipses ? [
    eclipses.impact ? `Eclipse Impact: ${eclipses.impact.eclipseType ?? eclipses.impact.type ?? "-"} eclipse affecting ${eclipses.impact.affectedPoint ?? eclipses.impact.affectedPlanet ?? "natal chart"} - ${eclipses.impact.interpretation ?? ""}` : "No recent eclipse impact",
    eclipses.upcoming?.length ? `Next Eclipse: ${eclipses.upcoming[0]?.date ?? "-"} (${eclipses.upcoming[0]?.type ?? "-"})` : null,
  ].filter(Boolean).join("\n") : "-";

  // ========== ELECTIONAL (택일 분석) ==========
  type MoonPhaseInfo = { phase?: string; name?: string; illumination?: number };
  type VOCInfo = { isVoid?: boolean };
  type PlanetaryHourInfo = { planet?: string; quality?: string; dayType?: string };
  type ElectionalAnalysis = { score?: number; recommendation?: string };
  type ElectionalData = { moonPhase?: string | MoonPhaseInfo; voidOfCourse?: VOCInfo; planetaryHour?: PlanetaryHourInfo; retrograde?: string[]; analysis?: ElectionalAnalysis };
  const electional = data.electional as ElectionalData | undefined;
  const electionalText = electional ? [
    `Moon Phase: ${typeof electional.moonPhase === 'string' ? electional.moonPhase : (electional.moonPhase?.phase ?? electional.moonPhase?.name ?? "-")} (${typeof electional.moonPhase === 'object' ? electional.moonPhase?.illumination?.toFixed?.(0) ?? "" : ""}%)`,
    electional.voidOfCourse ? `Void of Course Moon: ${electional.voidOfCourse.isVoid ? "YES - avoid important decisions" : "No"}` : null,
    `Planetary Hour: ${electional.planetaryHour?.planet ?? "-"} (${electional.planetaryHour?.quality ?? electional.planetaryHour?.dayType ?? "-"})`,
    electional.retrograde?.length ? `Retrograde Planets: ${electional.retrograde.join(", ")}` : "No retrogrades",
    electional.analysis?.score ? `Overall Score: ${electional.analysis.score}/100 - ${electional.analysis.recommendation ?? ""}` : null,
  ].filter(Boolean).join("\n") : "-";

  // ========== MIDPOINTS (미드포인트) ==========
  type MidpointPoint = { sign?: string; degree?: number };
  type MidpointActivation = { description?: string };
  type MidpointsData = { sunMoon?: MidpointPoint; ascMc?: MidpointPoint; activations?: MidpointActivation[] };
  const midpoints = data.midpoints as MidpointsData | undefined;
  const midpointsText = midpoints ? [
    midpoints.sunMoon ? `Sun/Moon Midpoint: ${midpoints.sunMoon.sign} ${midpoints.sunMoon.degree?.toFixed?.(0) ?? midpoints.sunMoon.degree ?? 0}° (심리적 통합점)` : null,
    midpoints.ascMc ? `ASC/MC Midpoint: ${midpoints.ascMc.sign} ${midpoints.ascMc.degree?.toFixed?.(0) ?? midpoints.ascMc.degree ?? 0}° (자아 표현점)` : null,
    midpoints.activations?.length ? `Active Midpoints: ${midpoints.activations.slice(0, 3).map((a: MidpointActivation) => a.description).join("; ")}` : null,
  ].filter(Boolean).join("\n") : "-";

  // ========== ADVANCED SAJU ANALYSIS ==========
  type AdvancedAnalysis = Record<string, unknown>;
  const adv = advancedAnalysis as AdvancedAnalysis | undefined;

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
  const tuechulText = adv?.tuechul?.length ? adv.tuechul.map((t: TransitItem) =>
    `${t.stem ?? t.gan ?? "-"} 투출: ${t.branch ?? t.ji ?? "-"}에서 (${t.strength ?? t.level ?? "-"})`
  ).join("\n") : "-";

  // 회국 (Hoeguk - Branch Combination)
  const hoegukText = adv?.hoeguk?.length ? adv.hoeguk.map((h: HoegukItem & { branches?: string[]; element?: string }) =>
    `${h.type ?? h.name ?? "-"}: ${h.branches?.join?.("-") ?? "-"} → ${h.resultElement ?? h.element ?? "-"}`
  ).join("\n") : "-";

  // 득령 (Deukryeong - Seasonal Timing)
  const deukryeongText = adv?.deukryeong ? [
    `득령 여부: ${adv.deukryeong.isDeukryeong ?? adv.deukryeong.status ? "YES" : "NO"}`,
    `계절 기운: ${adv.deukryeong.seasonalEnergy ?? adv.deukryeong.season ?? "-"}`,
    adv.deukryeong.explanation ? `설명: ${adv.deukryeong.explanation}` : (adv.deukryeong.description ? `설명: ${adv.deukryeong.description}` : null),
  ].filter(Boolean).join("\n") : "-";

  // 형충회합 (Hyeongchung - Interactions)
  const hyeongchungText = adv?.hyeongchung ? [
    adv.hyeongchung.chung?.length ? `충: ${adv.hyeongchung.chung.map((c: BranchInteraction) => `${c.branch1 ?? c.from}-${c.branch2 ?? c.to}`).join(", ")}` : (adv.hyeongchung.clashes?.length ? `충: ${adv.hyeongchung.clashes.map((c: BranchInteraction) => c.description ?? `${c.from}-${c.to}`).join(", ")}` : null),
    adv.hyeongchung.hyeong?.length ? `형: ${adv.hyeongchung.hyeong.map((h: BranchInteraction) => `${h.branch1 ?? h.from}-${h.branch2 ?? h.to}`).join(", ")}` : (adv.hyeongchung.punishments?.length ? `형: ${adv.hyeongchung.punishments.map((p: BranchInteraction) => p.description ?? `${p.from}-${p.to}`).join(", ")}` : null),
    adv.hyeongchung.hap?.length ? `합: ${adv.hyeongchung.hap.map((h: BranchInteraction) => `${h.branch1 ?? h.from}-${h.branch2 ?? h.to}→${h.result ?? ""}`).join(", ")}` : (adv.hyeongchung.combinations?.length ? `합: ${adv.hyeongchung.combinations.map((c: BranchInteraction) => c.description ?? `${c.branches?.join?.("-")}`).join(", ")}` : null),
    adv.hyeongchung.samhap?.length ? `삼합: ${adv.hyeongchung.samhap.map((s: SinsalItem) => s.branches?.join?.("-") ?? s.description).join("; ")}` : null,
    adv.hyeongchung.banghap?.length ? `방합: ${adv.hyeongchung.banghap.map((b: { branches?: string[]; description?: string }) => b.branches?.join?.("-") ?? b.description).join("; ")}` : null,
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
PART 1: EASTERN DESTINY ANALYSIS
===========================================

=== 기본 정보 ===
Day Master: ${dayMaster?.name ?? "-"} (${dayMaster?.element ?? "-"})
Four Pillars: ${pillarText}

=== 운세 흐름 (장기/연간/월간) ===
Long-term Flow: ${currentDaeun?.name ?? "-"} (${currentDaeun?.startYear ?? ""}-${currentDaeun?.endYear ?? ""})
Annual Flow: ${currentAnnual?.element ?? "-"} ${currentAnnual?.year ?? ""}
Monthly Flow: ${currentMonthly?.element ?? "-"} ${currentMonthly?.year ?? ""}-${currentMonthly?.month ?? ""}

=== 에너지 강도 분석 ===
${strengthText}

=== 성향 유형 (Chart Pattern) ===
${geokgukText}

=== 핵심 에너지 (Favorable Elements) ===
${yongsinText}

=== 계절 균형 (Seasonal Balance) ===
${johuText}

=== 뿌리/표출/시기 ===
Root Strength:
${tonggeunText}

Stem Emergence:
${tuechulText}

Seasonal Timing:
${deukryeongText}

=== 에너지 결합 (Branch Combinations) ===
${hoegukText}

=== 에너지 상호작용 (Interactions) ===
${hyeongchungText}

=== 에너지 분포 (Energy Distribution) ===
${sibsinText}

=== 건강/직업 적성 ===
${healthCareerText}

=== 종합 점수 ===
${scoreText}

=== 고급 분석 (특수 성향) ===
${ultraText}

=== 특수 에너지 (Lucky/Unlucky Factors) ===
Lucky: ${luckyList || "-"}
Unlucky: ${unluckyList || "-"}
Twelve Gods: ${twelveGods || "-"}

=== 향후 월간 흐름 (Next 6 Months) ===
${upcomingMonths.map((m: MonthlyItem) => `${m.year}-${String(m.month).padStart(2, "0")}: ${m.element ?? "-"} (${m.heavenlyStem ?? ""} ${m.earthlyBranch ?? ""})`).join("\n")}

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
${significantTransits.map((t: TransitItem) => `${t.type}: ${t.from?.name ?? "?"} -> ${t.to?.name ?? "?"} (orb: ${t.orb})`).join("\n") || "No significant transits"}

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
1. CROSS-REFERENCE both Eastern and Western systems for deeper insights
2. DATE RECOMMENDATIONS should use BOTH systems:
   - Eastern: 오행 흐름, 충/합 관계, 월간/일간 흐름
   - Astrology: 트랜짓, 문페이즈, 보이드오브코스
3. Use the ADVANCED data (성향 유형, 핵심 에너지, 에너지 분포) for personality insights
4. Reference PROGRESSIONS for timing of life developments
5. Use DRACONIC for soul-level/karmic insights
6. Use HARMONICS for creative/spiritual potential
7. Consider ASTEROIDS (Juno for relationships, Ceres for nurturing, etc.)
8. Check FIXED STARS for exceptional talents or challenges
9. Factor in ECLIPSE impacts for major life events
10. Use MIDPOINTS for psychological integration points

You MUST return a valid JSON object with this exact structure:

{
  "lifeTimeline": {
    "description": "Overview of life journey based on Eastern+Western cross-analysis in ${lang}",
    "importantYears": [
      {
        "year": 2025,
        "age": 30,
        "rating": 5,
        "title": "Major turning point title in ${lang}",
        "easternReason": "장기/연간 흐름 교체, 핵심 에너지 강화 등",
        "astroReason": "Jupiter return, Saturn trine natal Sun 등",
        "advice": "Specific advice for this year in ${lang}"
      }
    ]
  },
  "categoryAnalysis": {
    "personality": {
      "icon": "🧠",
      "title": "성격 / Personality",
      "easternAnalysis": "Day Master, 성향 유형, 에너지 분포 기반 성격 분석",
      "astroAnalysis": "Sun/Moon/Ascendant 기반 성격 분석",
      "crossInsight": "동양+서양 교차 분석으로 도출된 핵심 성격 특징",
      "keywords": ["키워드1", "키워드2", "키워드3"]
    },
    "appearance": {
      "icon": "✨",
      "title": "외모/인상 / Appearance",
      "easternAnalysis": "일주, 오행 균형 기반 외모/인상 분석",
      "astroAnalysis": "Ascendant, Venus, 1st house 기반 외모 분석",
      "crossInsight": "동양+서양 교차 분석으로 도출된 외모/인상 특징",
      "keywords": ["키워드1", "키워드2"]
    },
    "love": {
      "icon": "💕",
      "title": "연애/결혼 / Love",
      "easternAnalysis": "배우자 자리, 파트너 에너지 기반 연애운 분석",
      "astroAnalysis": "Venus, 7th house, Juno 기반 연애운 분석",
      "crossInsight": "동양+서양 교차 분석으로 도출된 연애/결혼 특징",
      "idealPartner": "이상적인 파트너 특징",
      "timing": "결혼/연애 좋은 시기"
    },
    "family": {
      "icon": "👨‍👩‍👧‍👦",
      "title": "가족 / Family",
      "easternAnalysis": "년주(조상), 월주(부모), 시주(자녀) 기반 가족운 분석",
      "astroAnalysis": "4th house, Moon, IC 기반 가족운 분석",
      "crossInsight": "동양+서양 교차 분석으로 도출된 가족관계 특징"
    },
    "friends": {
      "icon": "🤝",
      "title": "친구/대인관계 / Social",
      "easternAnalysis": "동료 에너지, 표현 에너지 기반 대인관계 분석",
      "astroAnalysis": "11th house, Mercury, 3rd house 기반 대인관계 분석",
      "crossInsight": "동양+서양 교차 분석으로 도출된 대인관계 특징"
    },
    "career": {
      "icon": "💼",
      "title": "직업/사업 / Career",
      "easternAnalysis": "직장 에너지, 성향 유형, 핵심 에너지 기반 직업 적성 분석",
      "astroAnalysis": "MC, 10th house, Saturn 기반 직업 분석",
      "crossInsight": "동양+서양 교차 분석으로 도출된 직업/사업 특징",
      "suitableCareers": ["적합 직업1", "적합 직업2", "적합 직업3"],
      "timing": "사업/이직 좋은 시기"
    },
    "wealth": {
      "icon": "💰",
      "title": "재물/금전 / Wealth",
      "easternAnalysis": "재물 에너지, 창의→재물 패턴 기반 재물운 분석",
      "astroAnalysis": "2nd house, 8th house, Jupiter 기반 재물 분석",
      "crossInsight": "동양+서양 교차 분석으로 도출된 재물운 특징",
      "wealthType": "부의 유형 (급여형/사업형/투자형 등)"
    },
    "health": {
      "icon": "🏥",
      "title": "건강 / Health",
      "easternAnalysis": "오행 과불급, Day Master 강약 기반 건강 분석",
      "astroAnalysis": "6th house, Mars, Chiron 기반 건강 분석",
      "crossInsight": "동양+서양 교차 분석으로 도출된 건강 특징",
      "vulnerabilities": ["취약 부위1", "취약 부위2"],
      "advice": "건강 관리 조언"
    }
  },
  "keyInsights": [
    {
      "type": "strength",
      "text": "Key strength based on 성향유형/핵심에너지/natal chart in ${lang}",
      "icon": "💪"
    },
    {
      "type": "opportunity",
      "text": "Current opportunity from transits/장기/연간 흐름",
      "icon": "🚀"
    },
    {
      "type": "caution",
      "text": "What to watch based on 충돌/어려운 aspects",
      "icon": "⚠️"
    },
    {
      "type": "advice",
      "text": "Actionable advice synthesizing both systems",
      "icon": "💡"
    }
  ],
  "luckyElements": {
    "colors": ["행운의 색상1", "색상2"],
    "directions": ["행운의 방향"],
    "numbers": [3, 8],
    "items": ["행운의 아이템1", "아이템2"]
  },
  "easternHighlight": {
    "pillar": "e.g., Day Pillar 甲子",
    "element": "e.g., 목(木) - 핵심 에너지",
    "meaning": "What this means for the user in ${lang}"
  },
  "astroHighlight": {
    "planet": "e.g., Venus in Libra",
    "sign": "House 7",
    "meaning": "What this means for the user in ${lang}"
  }
}

CRITICAL REQUIREMENTS:
1. lifeTimeline.importantYears: List 8-12 most significant years from birth to age 90
   - Rate importance 1-5 stars based on BOTH Eastern (장기/연간 흐름 교체점) AND astrology (major transits)
   - Include specific reasons from BOTH systems
2. categoryAnalysis: MUST include ALL 8 categories with CROSS-ANALYSIS
   - Each category must have easternAnalysis, astroAnalysis, AND crossInsight
   - crossInsight should synthesize BOTH systems, not just repeat
3. All text in ${lang}
4. Return ONLY valid JSON, no markdown

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
type AspectHitItem = { type?: string; aspect?: string; planet2?: { name?: string }; to?: string; planet?: string; asteroid?: string; from?: string };
function formatAsteroidAspects(aspects: AspectHitItem[] | Record<string, AspectHitItem[]> | undefined): string {
  if (!aspects) {return "-";}

  // If it's an array, format directly
  if (Array.isArray(aspects)) {
    return aspects.slice(0, 3).map((a: AspectHitItem) =>
      `${a.asteroid ?? a.from}-${a.type ?? a.aspect}-${a.planet ?? a.to}`
    ).join(", ");
  }

  // If it's an object (Record<AsteroidName, AspectHit[]>), flatten it
  if (typeof aspects === 'object') {
    const allAspects: { asteroid: string; type: string | undefined; planet: string | undefined }[] = [];
    for (const [asteroidName, hits] of Object.entries(aspects)) {
      if (Array.isArray(hits)) {
        for (const hit of hits.slice(0, 2)) {
          allAspects.push({
            asteroid: asteroidName,
            type: hit.type ?? hit.aspect,
            planet: hit.planet2?.name ?? hit.to ?? hit.planet
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
  if (typeof response !== "string" || response.trim().length === 0) {
    return null;
  }

  try {
    const candidates = extractJsonCandidates(response);

    for (let i = candidates.length - 1; i >= 0; i--) {
      const parsed = JSON.parse(candidates[i]);

      // Validate required fields
      if (!parsed.sections || !Array.isArray(parsed.sections)) {continue;}
      if (!parsed.dateRecommendations) {continue;}

      return parsed as StructuredFortuneOutput;
    }

    return null;
  } catch (error) {
    logger.error("[parseStructuredResponse] Error:", error);
    return null;
  }
}

function extractJsonCandidates(input: string): string[] {
  const results: string[] = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escape = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (ch === "\\" && inString) {
      escape = true;
      continue;
    }

    if (ch === "\"") {
      inString = !inString;
      continue;
    }

    if (inString) {continue;}

    if (ch === "{") {
      if (depth === 0) {start = i;}
      depth++;
      continue;
    }

    if (ch === "}") {
      if (depth > 0) {
        depth--;
        if (depth === 0 && start >= 0) {
          results.push(input.slice(start, i + 1));
          start = -1;
        }
      }
    }
  }

  return results;
}
