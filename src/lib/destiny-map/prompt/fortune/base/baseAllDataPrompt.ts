import type { CombinedResult } from "@/lib/destiny-map/astrologyengine";

// Type definitions for data structures
interface PlanetData {
  name: string;
  longitude?: number;
  sign?: string;
  degree?: number;
  house?: number;
  speed?: number;
  retrograde?: boolean;
  [key: string]: unknown;
}

interface HouseData {
  index: number;
  cusp?: number;
  sign?: string;
  [key: string]: unknown;
}

interface AspectData {
  from?: string;
  to?: string;
  type?: string;
  angle?: number;
  orb?: number;
  [key: string]: unknown;
}

interface AstrologyData {
  planets?: PlanetData[];
  houses?: HouseData[];
  aspects?: AspectData[];
  ascendant?: PlanetData;
  mc?: PlanetData;
  facts?: unknown;
  transits?: unknown[];
  [key: string]: unknown;
}

interface PillarData {
  heavenlyStem?: { name?: string };
  earthlyBranch?: { name?: string };
  ganji?: string;
  [key: string]: unknown;
}

interface SajuData {
  pillars?: {
    year?: PillarData;
    month?: PillarData;
    day?: PillarData;
    time?: PillarData;
  };
  dayMaster?: {
    name?: string;
    element?: string;
    heavenlyStem?: string;
  };
  unse?: {
    daeun?: Array<{
      startAge?: number;
      age?: number;
      stem?: string;
      heavenlyStem?: string;
      branch?: string;
      earthlyBranch?: string;
    }>;
  };
  sinsal?: unknown;
  advancedAnalysis?: unknown;
  [key: string]: unknown;
}


/**
 * Build a comprehensive data snapshot for fortune prompts.
 * v3.1 - Includes ALL saju + ALL advanced astrology data for expert-level predictions.
 *
 * Added in v3.0:
 * - Chiron, Lilith (extra points)
 * - All asteroids (Ceres, Pallas, Vesta, Juno)
 * - Solar Return (연간 차트)
 * - Lunar Return (월간 차트)
 * - Progressions (Secondary, Solar Arc)
 * - Draconic Chart (영혼 차트)
 * - Harmonics (H5/H7/H9)
 * - Fixed Stars (항성)
 * - Eclipses (일/월식)
 * - Electional (택일)
 * - Midpoints (미드포인트)
 */
export function buildAllDataPrompt(lang: string, theme: string, data: CombinedResult) {
  const { astrology = {}, saju } = data ?? {};
  const {
    planets = [],
    houses = [],
    aspects = [],
    ascendant,
    mc,
    facts,
    transits = [],
  } = astrology as AstrologyData;
  const { pillars, dayMaster, unse, sinsal, advancedAnalysis } = saju ?? {} as SajuData;

  // 🔍 DEBUG: Log what we receive from saju
  console.warn("[buildAllDataPrompt] saju keys:", saju ? Object.keys(saju) : "null");
  console.warn("[buildAllDataPrompt] unse:", unse ? JSON.stringify(unse).slice(0, 500) : "null");
  console.warn("[buildAllDataPrompt] daeun count:", unse?.daeun?.length ?? 0);
  console.warn("[buildAllDataPrompt] first daeun:", unse?.daeun?.[0] ? JSON.stringify(unse.daeun[0]) : "null");

  // ========== HELPER FUNCTIONS ==========
  const getPlanet = (name: string) => planets.find((p: PlanetData) => p.name === name);

  // 한자 → 쉬운 한글 변환 맵
  const stemToKorean: Record<string, string> = {
    '甲': '갑목(나무+)', '乙': '을목(나무-)',
    '丙': '병화(불+)', '丁': '정화(불-)',
    '戊': '무토(흙+)', '己': '기토(흙-)',
    '庚': '경금(쇠+)', '辛': '신금(쇠-)',
    '壬': '임수(물+)', '癸': '계수(물-)',
  };
  const branchToKorean: Record<string, string> = {
    '子': '자(쥐/물)', '丑': '축(소/흙)',
    '寅': '인(호랑이/나무)', '卯': '묘(토끼/나무)',
    '辰': '진(용/흙)', '巳': '사(뱀/불)',
    '午': '오(말/불)', '未': '미(양/흙)',
    '申': '신(원숭이/쇠)', '酉': '유(닭/쇠)',
    '戌': '술(개/흙)', '亥': '해(돼지/물)',
  };
  // 간지를 쉬운 형태로 변환
  const formatGanjiEasy = (stem?: string, branch?: string) => {
    if (!stem || !branch) return '-';
    const stemKo = stemToKorean[stem] || stem;
    const branchKo = branchToKorean[branch] || branch;
    return `${stemKo} + ${branchKo}`;
  };

  const formatPillar = (p: PlanetData) => {
    if (!p) return null;
    const stem = p.heavenlyStem?.name || p.ganji?.split?.('')?.[0] || '';
    const branch = p.earthlyBranch?.name || p.ganji?.split?.('')?.[1] || '';
    return stem && branch ? `${stem}${branch}` : null;
  };

  // ========== BASIC PLANETARY DATA ==========
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

  const planetLines = planets
    .slice(0, 12)
    .map((p: PlanetData) => `${p.name ?? "?"}: ${p.sign ?? "-"} (H${p.house ?? "-"})`)
    .join("; ");

  // 하우스 정보 (배열 또는 객체 모두 지원)
  const houseLines = Array.isArray(houses)
    ? houses.slice(0, 12).map((h: HouseData, i: number) => `H${i + 1}: ${h?.sign ?? h?.formatted ?? "-"}`).join("; ")
    : Object.entries(houses ?? {}).slice(0, 12).map(([num, val]: [string, unknown]) => `H${num}: ${val?.sign ?? "-"}`).join("; ");

  const aspectLines = aspects
    .slice(0, 12)
    .map((a: AspectData) => `${a.planet1?.name ?? a.from?.name ?? "?"}-${a.type ?? a.aspect ?? ""}-${a.planet2?.name ?? a.to?.name ?? "?"}`)
    .join("; ");

  const elements = Object.entries(facts?.elementRatios ?? {})
    .map(([k, v]) => `${k}:${(v as number).toFixed?.(1) ?? v}`)
    .join(", ");

  // ========== PILLARS ==========
  const pillarText = [
    formatPillar(pillars?.year),
    formatPillar(pillars?.month),
    formatPillar(pillars?.day),
    formatPillar(pillars?.time),
  ].filter(Boolean).join(" / ") || "-";

  // 일간 추출
  const dayPillarStem = pillars?.day?.heavenlyStem?.name;
  const dayPillarElement = pillars?.day?.heavenlyStem?.element;
  const actualDayMaster = dayMaster?.name || dayPillarStem || "-";
  const actualDayMasterElement = dayMaster?.element || dayPillarElement || "-";

  // ========== LUCK CYCLES (현재 + 미래 예측용) ==========
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  // Get birth year from facts (for age-based daeun calculation)
  const birthYear = facts?.birthDate ? new Date(facts.birthDate).getFullYear() :
                   pillars?.year?.year ?? currentYear - 30;
  const currentAge = currentYear - birthYear;

  // 현재 대운 찾기 (age 기반)
  const currentDaeun: unknown = (unse?.daeun ?? []).find((d: unknown) => {
    const startAge = d.age;
    const endAge = startAge + 9; // 대운은 10년 단위
    return currentAge >= startAge && currentAge <= endAge;
  });

  // 현재 세운
  const currentAnnual: unknown = (unse?.annual ?? []).find((a: AspectData) => a.year === currentYear);
  // 현재 월운
  const currentMonthly: unknown = (unse?.monthly ?? []).find((m: unknown) =>
    m.year === currentYear && m.month === currentMonth
  );

  // 현재 대운 텍스트 (age 기반) - 쉬운 한글로 변환
  const daeunText = currentDaeun
    ? `${currentDaeun.age}-${currentDaeun.age + 9}세: ${formatGanjiEasy(currentDaeun.heavenlyStem, currentDaeun.earthlyBranch)}`
    : (unse?.daeun ?? []).slice(0, 3).map((u: unknown) =>
        `${u.age}-${u.age + 9}세: ${formatGanjiEasy(u.heavenlyStem, u.earthlyBranch)}`
      ).join("; ");

  // ========== 미래 운세 데이터 (FUTURE PREDICTIONS) ==========
  // 전체 대운 흐름 (과거~미래) - age 기반, 쉬운 한글로 표시
  const allDaeunText = (unse?.daeun ?? [])
    .map((d: unknown) => {
      const startAge = d.age;
      const endAge = startAge + 9;
      const isCurrent = currentAge >= startAge && currentAge <= endAge;
      const marker = isCurrent ? "★현재★" : "";
      const easyGanji = formatGanjiEasy(d.heavenlyStem, d.earthlyBranch);
      return `${startAge}-${endAge}세: ${easyGanji} ${marker}`;
    })
    .join("\n  ");

  // 🔍 DEBUG: Log generated daeun text
  console.warn("[buildAllDataPrompt] currentAge:", currentAge);
  console.warn("[buildAllDataPrompt] currentDaeun:", currentDaeun ? JSON.stringify(currentDaeun) : "null");
  console.warn("[buildAllDataPrompt] daeunText:", daeunText);
  console.warn("[buildAllDataPrompt] allDaeunText preview:", allDaeunText.slice(0, 200));

  // 간지 문자열에서 천간/지지 분리 후 쉬운 형태로 변환
  const parseGanjiEasy = (ganji?: string) => {
    if (!ganji || ganji.length < 2) return ganji || '-';
    const stem = ganji[0];
    const branch = ganji[1];
    return formatGanjiEasy(stem, branch);
  };

  // 향후 연운 (현재년도 ~ +5년) - 쉬운 한글로 표시
  const futureAnnualList = (unse?.annual ?? [])
    .filter((a: AspectData) => a.year >= currentYear && a.year <= currentYear + 5)
    .map((a: AspectData) => {
      const isCurrent = a.year === currentYear;
      const marker = isCurrent ? "★현재★" : "";
      const easyGanji = parseGanjiEasy(a.ganji ?? a.name);
      return `${a.year}년: ${easyGanji} ${marker}`;
    })
    .join("\n  ");

  // 향후 월운 (현재월 ~ 12개월) - 쉬운 한글로 표시
  const futureMonthlyList = (unse?.monthly ?? [])
    .filter((m: unknown) => {
      if (m.year > currentYear) return true;
      if (m.year === currentYear && m.month >= currentMonth) return true;
      return false;
    })
    .slice(0, 12)
    .map((m: unknown) => {
      const isCurrent = m.year === currentYear && m.month === currentMonth;
      const marker = isCurrent ? "★현재★" : "";
      const easyGanji = parseGanjiEasy(m.ganji ?? m.name);
      return `${m.year}년 ${m.month}월: ${easyGanji} ${marker}`;
    })
    .join("\n  ");

  // ========== SINSAL ==========
  const sinsalRecord = sinsal as Record<string, unknown> | undefined;
  const lucky = (sinsalRecord?.luckyList as { name?: string }[] ?? []).map((x) => x.name).join(", ");
  const unlucky = (sinsalRecord?.unluckyList as { name?: string }[] ?? []).map((x) => x.name).join(", ");

  // ========== ADVANCED SAJU ANALYSIS ==========
  const adv = advancedAnalysis as Record<string, unknown> | undefined;

  // 신강/신약
  const strengthText = adv?.extended?.strength
    ? `${adv.extended.strength.level} (${adv.extended.strength.score ?? 0}점, 통근${adv.extended.strength.rootCount ?? 0}개)`
    : "-";

  // 격국
  const geokgukText = adv?.geokguk?.type ?? adv?.extended?.geokguk?.type ?? "-";
  const geokgukDesc = adv?.geokguk?.description ?? adv?.extended?.geokguk?.description ?? "";

  // 용신/희신/기신
  const yongsinPrimary = adv?.yongsin?.primary?.element ?? adv?.extended?.yongsin?.primary ?? "-";
  const yongsinSecondary = adv?.yongsin?.secondary?.element ?? adv?.extended?.yongsin?.secondary ?? "-";
  const yongsinAvoid = adv?.yongsin?.avoid?.element ?? adv?.extended?.yongsin?.avoid ?? "-";

  // 십신 분석
  const sibsin = adv?.sibsin;
  const sibsinDist = sibsin?.count ?? sibsin?.distribution ?? sibsin?.counts ?? {};
  const sibsinDistText = Object.entries(sibsinDist)
    .filter(([, v]) => (v as number) > 0)
    .map(([k, v]) => `${k}(${v})`)
    .join(", ");
  const sibsinDominant = sibsin?.dominantSibsin?.join?.(", ") ?? sibsin?.dominant ?? sibsin?.primary ?? "-";
  const sibsinMissing = sibsin?.missingSibsin?.join?.(", ") ?? sibsin?.missing?.join?.(", ") ?? "-";

  // 십신 기반 인간관계/직업
  const sibsinRelationships = sibsin?.relationships ?? [];
  const sibsinCareerAptitudes = sibsin?.careerAptitudes ?? [];
  const relationshipText = Array.isArray(sibsinRelationships)
    ? sibsinRelationships.slice(0, 3).map((r: unknown) => `${r.type}:${r.quality ?? r.description ?? ""}`).join("; ")
    : "-";
  const careerText = Array.isArray(sibsinCareerAptitudes)
    ? sibsinCareerAptitudes.slice(0, 4).map((c: unknown) => `${c.field}(${c.score ?? 0})`).join(", ")
    : "-";

  // 형충회합
  const hyeongchung = adv?.hyeongchung ?? {};
  const chungText = hyeongchung.chung?.length
    ? hyeongchung.chung.map((c: unknown) => `${c.branch1 ?? c.from}-${c.branch2 ?? c.to}`).join(", ")
    : "-";
  const hapText = hyeongchung.hap?.length
    ? hyeongchung.hap.map((h: unknown) => `${h.branch1 ?? h.from}-${h.branch2 ?? h.to}→${h.result ?? ""}`).join(", ")
    : "-";
  const samhapText = hyeongchung.samhap?.length
    ? hyeongchung.samhap.map((s: { branches?: string[] }) => s.branches?.join?.("-") ?? "-").join("; ")
    : "-";

  // 건강/직업
  const healthCareer = adv?.healthCareer ?? {};
  const healthWeak = healthCareer.health?.vulnerabilities?.join?.(", ") ?? healthCareer.health?.weakOrgans?.join?.(", ") ?? "-";
  const suitableCareers = healthCareer.career?.suitableFields?.join?.(", ") ?? healthCareer.career?.aptitudes?.join?.(", ") ?? "-";

  // 종합 점수
  const score = adv?.score ?? {};
  const scoreText = score.total ?? score.overall
    ? `총${score.total ?? score.overall}/100 (사업${score.business ?? score.career ?? 0}, 재물${score.wealth ?? score.finance ?? 0}, 건강${score.health ?? 0})`
    : "-";

  // 통근/투출/회국/득령 (고급 분석)
  const tonggeunText = adv?.tonggeun
    ? `${adv.tonggeun.stem ?? "-"}→${adv.tonggeun.rootBranch ?? "-"} (${adv.tonggeun.strength ?? "-"})`
    : "-";
  const tuechulText = adv?.tuechul?.length
    ? adv.tuechul.slice(0, 3).map((t: unknown) => `${t.element ?? t.stem}(${t.type ?? "-"})`).join(", ")
    : "-";
  const hoegukText = adv?.hoeguk?.length
    ? adv.hoeguk.slice(0, 2).map((h: unknown) => `${h.type ?? h.name}→${h.resultElement ?? "-"}`).join("; ")
    : "-";
  const deukryeongText = adv?.deukryeong
    ? `${adv.deukryeong.status ?? adv.deukryeong.type ?? "-"} (${adv.deukryeong.score ?? 0}점)`
    : "-";

  // 고급 분석 (종격, 화격, 일주론, 공망)
  const ultra = adv?.ultraAdvanced ?? {};
  const jonggeokText = ultra.jonggeok?.type ?? ultra.jonggeok?.name ?? "";
  const iljuText = ultra.iljuAnalysis?.character ?? ultra.iljuAnalysis?.personality ?? "";
  const gongmangText = ultra.gongmang?.branches?.join?.(", ") ?? ultra.gongmang?.emptyBranches?.join?.(", ") ?? "";

  // ========== EXTRA ASTROLOGY POINTS (Chiron, Lilith, Vertex, Part of Fortune) ==========
  const extraPoints = data.extraPoints ?? {} as Record<string, unknown>;
  const vertex = extraPoints.vertex;
  const partOfFortune = extraPoints.partOfFortune;
  const chiron = extraPoints.chiron;
  const lilith = extraPoints.lilith;

  const extraPointsText = [
    chiron ? `Chiron(상처/치유): ${chiron.sign} (H${chiron.house})` : null,
    lilith ? `Lilith(그림자): ${lilith.sign} (H${lilith.house})` : null,
    vertex ? `Vertex(운명): ${vertex.sign} (H${vertex.house})` : null,
    partOfFortune ? `Part of Fortune(행운): ${partOfFortune.sign} (H${partOfFortune.house})` : null,
  ].filter(Boolean).join("; ") || "-";

  // ========== ASTEROIDS (소행성 - Ceres, Pallas, Juno, Vesta) ==========
  const asteroids = data.asteroids ?? {} as Record<string, unknown>;
  const juno = asteroids.juno;
  const ceres = asteroids.ceres;
  const pallas = asteroids.pallas;
  const vesta = asteroids.vesta;

  const asteroidsText = [
    ceres ? `Ceres(양육): ${ceres.sign} (H${ceres.house})` : null,
    pallas ? `Pallas(지혜): ${pallas.sign} (H${pallas.house})` : null,
    juno ? `Juno(결혼): ${juno.sign} (H${juno.house})` : null,
    vesta ? `Vesta(헌신): ${vesta.sign} (H${vesta.house})` : null,
  ].filter(Boolean).join("; ") || "-";

  // Asteroid Aspects (소행성 어스팩트)
  const asteroidAspects = asteroids.aspects;
  const asteroidAspectsText = asteroidAspects ? (() => {
    if (Array.isArray(asteroidAspects)) {
      return asteroidAspects.slice(0, 4).map((a: AspectData) =>
        `${a.asteroid ?? a.from}-${a.type ?? a.aspect}-${a.planet ?? a.to}`
      ).join("; ");
    }
    if (typeof asteroidAspects === 'object') {
      const allAsp: string[] = [];
      for (const [name, hits] of Object.entries(asteroidAspects)) {
        if (Array.isArray(hits)) {
          for (const h of (hits as unknown[]).slice(0, 2)) {
            allAsp.push(`${name}-${h.type ?? h.aspect}-${h.planet2?.name ?? h.to ?? h.planet}`);
          }
        }
      }
      return allAsp.slice(0, 4).join("; ");
    }
    return "-";
  })() : "-";

  // ========== SOLAR RETURN (연간 차트) ==========
  const solarReturn = data.solarReturn as Record<string, unknown> | undefined;
  const solarReturnText = solarReturn ? [
    `SR ASC: ${solarReturn.summary?.ascSign ?? solarReturn.summary?.ascendant ?? "-"}`,
    `SR Sun House: ${solarReturn.summary?.sunHouse ?? "-"}`,
    `SR Moon: ${solarReturn.summary?.moonSign ?? "-"} (H${solarReturn.summary?.moonHouse ?? "-"})`,
    `Year Theme: ${solarReturn.summary?.theme ?? solarReturn.summary?.yearTheme ?? "-"}`,
  ].join("; ") : "-";

  // ========== LUNAR RETURN (월간 차트) ==========
  const lunarReturn = data.lunarReturn as Record<string, unknown> | undefined;
  const lunarReturnText = lunarReturn ? [
    `LR ASC: ${lunarReturn.summary?.ascSign ?? lunarReturn.summary?.ascendant ?? "-"}`,
    `LR Moon House: ${lunarReturn.summary?.moonHouse ?? "-"}`,
    `Month Theme: ${lunarReturn.summary?.theme ?? lunarReturn.summary?.monthTheme ?? "-"}`,
  ].join("; ") : "-";

  // ========== PROGRESSIONS (진행 차트) ==========
  const progressions = data.progressions as Record<string, unknown> | undefined;
  const progressionsText = progressions ? [
    `Progressed Sun: ${progressions.secondary?.summary?.keySigns?.sun ?? progressions.secondary?.summary?.progressedSun ?? "-"}`,
    `Progressed Moon: ${progressions.secondary?.summary?.keySigns?.moon ?? progressions.secondary?.summary?.progressedMoon ?? "-"}`,
    `Moon Phase: ${progressions.secondary?.moonPhase?.phase ?? "-"}`,
    progressions.solarArc ? `Solar Arc Sun: ${progressions.solarArc.summary?.keySigns?.sun ?? progressions.solarArc.summary?.progressedSun ?? "-"}` : null,
  ].filter(Boolean).join("; ") : "-";

  // ========== DRACONIC CHART (드라코닉 - 영혼 차트) ==========
  const draconic = data.draconic as Record<string, unknown> | undefined;
  const draconicText = draconic ? [
    `Draconic Sun: ${draconic.chart?.planets?.find((p: PlanetData) => p.name === "Sun")?.sign ?? "-"}`,
    `Draconic Moon: ${draconic.chart?.planets?.find((p: PlanetData) => p.name === "Moon")?.sign ?? "-"}`,
    `Draconic ASC: ${draconic.chart?.ascendant?.sign ?? "-"}`,
    draconic.comparison?.alignments?.length ? `Alignments: ${draconic.comparison.alignments.slice(0, 2).map((a: AspectData) => a.description).join("; ")}` : null,
  ].filter(Boolean).join("; ") : "-";

  // ========== HARMONICS (하모닉 분석) ==========
  const harmonics = data.harmonics as Record<string, unknown> | undefined;
  const harmonicsText = harmonics?.profile ? [
    harmonics.profile.dominant ? `Dominant: H${harmonics.profile.dominant}` : null,
    harmonics.profile.creative ? `Creative(H5): ${harmonics.profile.creative?.toFixed?.(0) ?? harmonics.profile.creative}%` : null,
    harmonics.profile.intuitive ? `Intuitive(H7): ${harmonics.profile.intuitive?.toFixed?.(0) ?? harmonics.profile.intuitive}%` : null,
    harmonics.profile.spiritual ? `Spiritual(H9): ${harmonics.profile.spiritual?.toFixed?.(0) ?? harmonics.profile.spiritual}%` : null,
  ].filter(Boolean).join("; ") : "-";

  // Harmonic Charts (H5, H7, H9 개별 차트)
  const h5Sun = harmonics?.h5?.planets?.find((p: PlanetData) => p.name === "Sun");
  const h7Sun = harmonics?.h7?.planets?.find((p: PlanetData) => p.name === "Sun");
  const h9Sun = harmonics?.h9?.planets?.find((p: PlanetData) => p.name === "Sun");
  const harmonicChartsText = [
    h5Sun ? `H5 Sun: ${h5Sun.sign}` : null,
    h7Sun ? `H7 Sun: ${h7Sun.sign}` : null,
    h9Sun ? `H9 Sun: ${h9Sun.sign}` : null,
  ].filter(Boolean).join("; ") || "-";

  // ========== FIXED STARS (항성) ==========
  const fixedStars = data.fixedStars as unknown[] | undefined;
  const fixedStarsText = fixedStars?.length
    ? fixedStars.slice(0, 4).map((fs: { star?: string; planet?: string; meaning?: string }) => `${fs.star}↔${fs.planet}(${fs.meaning ?? ""})`).join("; ")
    : "-";

  // ========== ECLIPSES (일/월식 영향) ==========
  const eclipses = data.eclipses as Record<string, unknown> | undefined;
  const eclipsesText = eclipses ? [
    eclipses.impact ? `Impact: ${eclipses.impact.eclipseType ?? eclipses.impact.type ?? "-"} on ${eclipses.impact.affectedPoint ?? eclipses.impact.affectedPlanet ?? "-"}` : null,
    eclipses.upcoming?.length ? `Next: ${eclipses.upcoming[0]?.date ?? "-"} (${eclipses.upcoming[0]?.type ?? "-"})` : null,
  ].filter(Boolean).join("; ") : "-";

  // ========== ELECTIONAL (택일 분석) ==========
  const electional = data.electional as Record<string, unknown> | undefined;
  const electionalText = electional ? [
    `Moon Phase: ${typeof electional.moonPhase === 'string' ? electional.moonPhase : (electional.moonPhase?.phase ?? electional.moonPhase?.name ?? "-")}`,
    electional.voidOfCourse ? `VOC: ${electional.voidOfCourse.isVoid ? "YES - 중요한 결정 피하기" : "No"}` : null,
    `Planetary Hour: ${electional.planetaryHour?.planet ?? "-"}`,
    electional.retrograde?.length ? `Retrograde: ${electional.retrograde.join(", ")}` : null,
    electional.analysis?.score ? `Score: ${electional.analysis.score}/100` : null,
    electional.analysis?.recommendation ? `Tip: ${electional.analysis.recommendation}` : null,
  ].filter(Boolean).join("; ") : "-";

  // ========== MIDPOINTS (미드포인트) ==========
  const midpoints = data.midpoints as Record<string, unknown> | undefined;
  const midpointsText = midpoints ? [
    midpoints.sunMoon ? `Sun/Moon(심리): ${midpoints.sunMoon.sign} ${midpoints.sunMoon.degree?.toFixed?.(0) ?? midpoints.sunMoon.degree ?? 0}°` : null,
    midpoints.ascMc ? `ASC/MC(자아): ${midpoints.ascMc.sign} ${midpoints.ascMc.degree?.toFixed?.(0) ?? midpoints.ascMc.degree ?? 0}°` : null,
    midpoints.activations?.length ? `Activated: ${midpoints.activations.slice(0, 3).map((a: AspectData) => a.description ?? `${a.midpoint}-${a.activator}`).join("; ")}` : null,
  ].filter(Boolean).join("; ") : "-";

  // All Midpoints (주요 미드포인트 목록)
  const allMidpointsText = midpoints?.all?.length
    ? midpoints.all.slice(0, 5).map((mp: unknown) => `${mp.planet1}-${mp.planet2}: ${mp.sign} ${mp.degree?.toFixed?.(0) ?? 0}°`).join("; ")
    : "-";

  // ========== TRANSITS (현재 트랜짓) ==========
  const significantTransits = transits
    .filter((t: unknown) => ["conjunction", "trine", "square", "opposition"].includes(t.type || t.aspectType))
    .slice(0, 8)
    .map((t: unknown) => {
      // Support both old format (from/to) and new format (transitPlanet/natalPoint)
      const planet1 = t.transitPlanet ?? t.from?.name ?? "?";
      const planet2 = t.natalPoint ?? t.to?.name ?? "?";
      const aspectType = t.aspectType ?? t.type ?? "?";
      const applyingText = t.isApplying ? "(접근중)" : "(분리중)";
      return `${planet1}-${aspectType}-${planet2} ${applyingText}`;
    })
    .join("; ");

  // ========== 연애/배우자 전용 분석 (love theme) ==========
  const loveAnalysisSection = theme === "love" ? `
═══════════════════════════════════════
💕 연애/배우자 심층 분석 데이터
═══════════════════════════════════════

[동양 배우자 분석]
- 배우자 자리: ${pillars?.day?.earthlyBranch?.name ?? "-"} (${pillars?.day?.earthlyBranch?.element ?? "-"})
- 안정 파트너 에너지(남성): ${(sibsinDist as Record<string, number> | undefined)?.["정재"] ?? 0}개
- 자유 파트너 에너지(남성): ${(sibsinDist as Record<string, number> | undefined)?.["편재"] ?? 0}개
- 안정 파트너 에너지(여성): ${(sibsinDist as Record<string, number> | undefined)?.["정관"] ?? 0}개
- 자유 파트너 에너지(여성): ${(sibsinDist as Record<string, number> | undefined)?.["편관"] ?? 0}개
- 연애 매력: ${lucky.includes("도화") ? "있음 - 이성 인기" : "없음"}
- 강한 끌림: ${lucky.includes("홍염") ? "있음 - 강한 이성 끌림" : "없음"}
- 인간관계 패턴: ${relationshipText}

[점성술 연애 분석]
- Venus(금성): ${venus?.sign ?? "-"} (House ${venus?.house ?? "-"}) - 연애 스타일/취향
- Mars(화성): ${mars?.sign ?? "-"} (House ${mars?.house ?? "-"}) - 성적 매력/끌림
- 7th House(결혼/파트너): 커스프 확인 필요
- Juno(결혼 소행성): ${juno ? `${juno.sign} (House ${juno.house})` : "-"}
- Vertex(운명적 만남): ${vertex ? `${vertex.sign} (House ${vertex.house})` : "-"}
- 5th House(연애/로맨스): 확인 필요
- 8th House(깊은 결합): 확인 필요

[배우자 성향 추론 근거]
- 배우자 자리 오행 → 배우자 기질
- 금성 사인 → 끌리는 타입
- 7하우스 사인 → 배우자 외적 특성
- Juno 사인 → 결혼 파트너 이상형

[연령대 추론 근거]
- 금성 사인 (염소/토성 영향 → 연상 선호)
- 토성-달 각도 → 관계 안정성 선호
- 1하우스 토성 → 성숙한 파트너 선호

[만남 장소 추론 근거]
- 금성 하우스 위치
- 11하우스 (친구/네트워크 소개)
- 6하우스 (직장)
- 9하우스 (해외/학업)
` : "";

  // ========== 직업/재물 전용 분석 (career/wealth theme) ==========
  const careerAnalysisSection = (theme === "career" || theme === "wealth") ? `
═══════════════════════════════════════
💼 직업/재물 심층 분석 데이터
═══════════════════════════════════════

[동양 직업 분석]
- 성향 유형: ${geokgukText} - ${geokgukDesc}
- 핵심 에너지: ${yongsinPrimary} (보조: ${yongsinSecondary}, 주의: ${yongsinAvoid})
- 직장 에너지: 안정(${(sibsinDist as Record<string, number> | undefined)?.["정관"] ?? 0}), 도전(${(sibsinDist as Record<string, number> | undefined)?.["편관"] ?? 0})
- 재물 에너지: 안정(${(sibsinDist as Record<string, number> | undefined)?.["정재"] ?? 0}), 투자(${(sibsinDist as Record<string, number> | undefined)?.["편재"] ?? 0})
- 창의 에너지: 표현(${(sibsinDist as Record<string, number> | undefined)?.["식신"] ?? 0}), 혁신(${(sibsinDist as Record<string, number> | undefined)?.["상관"] ?? 0})
- 적합 직업: ${careerText}
- 업계 추천: ${suitableCareers}

[점성술 직업 분석]
- MC(천정/직업): ${mc?.sign ?? "-"}
- 10th House(사회적 지위): MC 사인 참조
- Saturn(책임/구조): ${saturn?.sign ?? "-"} (House ${saturn?.house ?? "-"})
- Jupiter(확장/기회): ${jupiter?.sign ?? "-"} (House ${jupiter?.house ?? "-"})
- 2nd House(수입): 확인 필요
- 6th House(일상 업무): 확인 필요
` : "";

  // ========== 건강 전용 분석 (health theme) ==========
  const healthAnalysisSection = theme === "health" ? `
═══════════════════════════════════════
🏥 건강 심층 분석 데이터
═══════════════════════════════════════

[사주 건강 분석]
- 오행 균형: ${Object.entries(facts?.elementRatios ?? {}).map(([k, v]) => `${k}:${(v as number).toFixed?.(1) ?? v}`).join(", ") || "-"}
- 부족 오행: ${yongsinPrimary} → 이 오행 관련 장기 주의
- 건강 취약점: ${healthWeak}
- 일간 체질: ${actualDayMaster} (${actualDayMasterElement})

[오행별 건강 연관]
- 木(목): 간, 담, 눈, 근육, 손톱
- 火(화): 심장, 소장, 혀, 혈관
- 土(토): 비장, 위장, 입술, 살
- 金(금): 폐, 대장, 코, 피부, 털
- 水(수): 신장, 방광, 귀, 뼈, 치아

[점성술 건강 분석]
- 6th House(건강/질병): 해당 사인 참조
- Mars(화성): ${mars?.sign ?? "-"} (House ${mars?.house ?? "-"}) - 에너지/염증
- Saturn(토성): ${saturn?.sign ?? "-"} (House ${saturn?.house ?? "-"}) - 만성질환/뼈
- Chiron(카이론): ${chiron ? `${chiron.sign} (House ${chiron.house})` : "-"} - 상처/치유

[해석 가이드]
- 부족 오행 → 해당 장기 보강 필요
- 과다 오행 → 해당 장기 과부하 주의
- Chiron 하우스 → 건강 트라우마 영역
` : "";

  // ========== 가족/인간관계 전용 분석 (family theme) ==========
  const familyAnalysisSection = theme === "family" ? `
═══════════════════════════════════════
👨‍👩‍👧 가족/인간관계 심층 분석 데이터
═══════════════════════════════════════

[사주 가족 분석]
- 년주(조상/외부): ${formatPillar(pillars?.year) ?? "-"}
- 월주(부모/형제): ${formatPillar(pillars?.month) ?? "-"}
- 일주(배우자/자신): ${formatPillar(pillars?.day) ?? "-"}
- 시주(자녀/말년): ${formatPillar(pillars?.time) ?? "-"}
- 인간관계 패턴: ${relationshipText}
- 비겁(형제자매): ${(sibsinDist as Record<string, number> | undefined)?.["비견"] ?? 0} + ${(sibsinDist as Record<string, number> | undefined)?.["겁재"] ?? 0}개
- 인성(부모/스승): ${(sibsinDist as Record<string, number> | undefined)?.["정인"] ?? 0} + ${(sibsinDist as Record<string, number> | undefined)?.["편인"] ?? 0}개
- 식상(자녀/표현): ${(sibsinDist as Record<string, number> | undefined)?.["식신"] ?? 0} + ${(sibsinDist as Record<string, number> | undefined)?.["상관"] ?? 0}개

[점성술 가족 분석]
- 4th House(가정/어머니): IC 사인 참조
- 10th House(아버지/권위): MC ${mc?.sign ?? "-"}
- Moon(달): ${moon?.sign ?? "-"} (House ${moon?.house ?? "-"}) - 감정/어머니
- Saturn(토성): ${saturn?.sign ?? "-"} (House ${saturn?.house ?? "-"}) - 아버지/제한
- 5th House(자녀): 해당 사인 참조
- Ceres(케레스): ${ceres ? `${ceres.sign} (House ${ceres.house})` : "-"} - 양육

[해석 가이드]
- 월주 충돌 → 부모와의 갈등
- 4하우스 긴장 → 가정 환경 이슈
- 인성 부족 → 정서적 지지 부족
` : "";

  // ========== 오늘 운세 전용 분석 (today theme) ==========
  const todayAnalysisSection = theme === "today" ? `
═══════════════════════════════════════
📅 오늘의 운세 분석 데이터
═══════════════════════════════════════

[오늘의 사주 흐름]
- 현재 월운: ${currentMonthly?.ganji ?? "-"} (${currentMonthly?.element ?? "-"})
- 일간과의 관계: ${actualDayMaster} vs 오늘 천간
- 오늘의 에너지: 일간 기준 십신 확인

[오늘의 점성술 흐름]
- Current Transits: ${significantTransits || "-"}
- Lunar Return 월간 테마: ${lunarReturnText}
- 달 위치: ${moon?.sign ?? "-"} - 오늘의 감정/직관

[해석 가이드]
- 트랜짓 조화 → 순조로운 하루
- 트랜짓 긴장 → 도전적인 하루
- 달 사인 → 오늘의 감정 톤
` : "";

  // ========== 이달 운세 전용 분석 (month theme) ==========
  const monthAnalysisSection = theme === "month" ? `
═══════════════════════════════════════
📆 이달의 운세 분석 데이터
═══════════════════════════════════════

[이달의 사주 흐름]
- 현재 월운: ${currentMonthly?.ganji ?? "-"} (${currentMonthly?.element ?? "-"})
- 일간과의 관계: ${actualDayMaster} (${actualDayMasterElement}) vs ${currentMonthly?.element ?? "-"}
- 향후 월운 흐름:
  ${futureMonthlyList || "데이터 없음"}

[이달의 점성술 흐름]
- Lunar Return: ${lunarReturnText}
- 월간 테마: Lunar Return ASC와 Moon House 확인
- Current Transits: ${significantTransits || "-"}

[해석 가이드]
- 월운 오행이 용신과 같으면 → 좋은 달
- 월운 오행이 기신과 같으면 → 주의 필요
- LR Moon House → 이달의 감정적 초점
` : "";

  // ========== 올해 운세 전용 분석 (year theme) ==========
  const yearAnalysisSection = theme === "year" ? `
═══════════════════════════════════════
🗓️ 올해의 운세 분석 데이터
═══════════════════════════════════════

[올해의 사주 흐름]
- ${currentYear}년 세운: ${currentAnnual?.ganji ?? "-"} (${currentAnnual?.element ?? "-"})
- 현재 대운: ${daeunText}
- 일간과의 관계: ${actualDayMaster} (${actualDayMasterElement}) vs ${currentAnnual?.element ?? "-"}
- 향후 연운:
  ${futureAnnualList || "데이터 없음"}

[올해의 점성술 흐름]
- Solar Return: ${solarReturnText}
- SR 태양 하우스 → 올해의 핵심 테마
- SR ASC → 올해의 페르소나
- Progressions: ${progressionsText}
- Progressed Moon Phase → 인생 주기

[해석 가이드]
- 세운이 용신이면 → 발전의 해
- 세운이 기신이면 → 정리/인내의 해
- SR Sun House → 올해 집중해야 할 영역
- Progressed Moon → 현재 인생 단계
` : "";

  // ========== 인생 종합 전용 분석 (life theme) ==========
  const lifeAnalysisSection = theme === "life" ? `
═══════════════════════════════════════
🌟 인생 종합 분석 데이터
═══════════════════════════════════════

[인생 전체 대운 흐름]
${allDaeunText || "데이터 없음"}

[핵심 인생 포인트]
- 격국(성향): ${geokgukText} - ${geokgukDesc}
- 용신(필요): ${yongsinPrimary} | 기신(주의): ${yongsinAvoid}
- 강점: ${sibsinDominant}
- 보완점: ${sibsinMissing}

[점성술 인생 분석]
- North Node(노스노드): ${northNode?.sign ?? "-"} (House ${northNode?.house ?? "-"}) - 영혼의 목적
- Chiron(카이론): ${chiron ? `${chiron.sign} (House ${chiron.house})` : "-"} - 상처와 치유
- Pluto(명왕성): ${pluto?.sign ?? "-"} (House ${pluto?.house ?? "-"}) - 변환
- Draconic Chart: ${draconicText}

[해석 가이드]
- 대운 전환점 → 인생 변곡점
- North Node House → 이번 생의 과제
- Chiron House → 치유해야 할 영역
- Draconic → 영혼 레벨의 목적
` : "";

  // ========== BUILD FINAL PROMPT ==========
  return `
[COMPREHENSIVE DATA SNAPSHOT v3.1 - ${theme}]
Locale: ${lang}

📌 사용자 기본 정보
───────────────────────────────────────
생년: ${birthYear}년생
현재 만 나이: ${currentAge}세
오늘 날짜: ${currentYear}년 ${currentMonth}월

⚠️⚠️⚠️ CRITICAL DATA ACCURACY RULES ⚠️⚠️⚠️
═══════════════════════════════════════════════════════════════
1. 대운/세운/월운 등 운세 데이터는 반드시 아래 제공된 데이터만 사용하세요.
2. 절대로 대운 간지를 추측하거나 만들어내지 마세요!
3. "현재 대운" 정보는 아래 "현재 장기 흐름" 섹션을 정확히 참조하세요.
4. 질문에서 특정 나이나 시기를 물으면, 아래 "전체 장기 흐름" 목록에서 해당 나이 범위의 대운을 찾아 답변하세요.
5. 데이터에 없는 정보는 "해당 정보가 데이터에 없습니다"라고 솔직히 말하세요.

NEVER fabricate 대운/운세 data! ONLY use exact data from sections below!
═══════════════════════════════════════════════════════════════

════════════════════════════════════════════════════════════════
PART 1: 동양 운명 분석 (EASTERN DESTINY ANALYSIS)
════════════════════════════════════════════════════════════════

⚠️ 핵심 정체성 (CORE IDENTITY)
───────────────────────────────────────
Day Master: ${actualDayMaster} (${actualDayMasterElement})
Four Pillars: ${pillarText}
에너지 강도: ${strengthText}
성향 유형: ${geokgukText}
핵심 에너지: ${yongsinPrimary} | 보조: ${yongsinSecondary} | 주의: ${yongsinAvoid}
뿌리 연결: ${tonggeunText}
표출: ${tuechulText}
결합: ${hoegukText}
시기 조화: ${deukryeongText}

📊 에너지 분포 (Energy Distribution)
───────────────────────────────────────
분포: ${sibsinDistText || "-"}
주요 에너지: ${sibsinDominant}
부족 에너지: ${sibsinMissing}
인간관계 패턴: ${relationshipText}
직업 적성: ${careerText}

🔄 에너지 상호작용 (Energy Interactions)
───────────────────────────────────────
충돌: ${chungText}
조화: ${hapText}
삼중 조화: ${samhapText}

📅 현재 운세 흐름 (Current Luck)
───────────────────────────────────────
현재 장기 흐름: ${daeunText}
${currentYear}년 연간 흐름: ${currentAnnual?.element ?? "-"} (${currentAnnual?.ganji ?? ""})
${currentYear}년 ${currentMonth}월 월간 흐름: ${currentMonthly?.element ?? "-"}
길한 에너지: ${lucky || "-"}
주의 에너지: ${unlucky || "-"}

🔮 미래 예측용 운세 데이터 (Future Predictions)
───────────────────────────────────────
[전체 장기 흐름 - 10년 주기]
  ${allDaeunText || "데이터 없음"}

[향후 5년 연간 운세]
  ${futureAnnualList || "데이터 없음"}

[향후 12개월 월간 흐름]
  ${futureMonthlyList || "데이터 없음"}

⚠️ 미래 예측 시 활용:
- "연애는 언제?" → 연간/월간 흐름에서 연애 에너지, 금성 트랜짓 시기 분석
- "결혼 시기?" → 장기 흐름 전환점, 7하우스 트랜짓, 파트너 에너지 활성화 시기
- "취업/이직?" → 연간 흐름에서 직업 에너지 활성화, MC 트랜짓 시기
- "재물운?" → 재물 에너지 활성화, 2하우스/8하우스 트랜짓

🏥 건강/종합 점수
───────────────────────────────────────
건강 취약점: ${healthWeak}
종합 점수: ${scoreText}
${jonggeokText ? `특수 성향: ${jonggeokText}` : ""}
${iljuText ? `핵심 성격: ${iljuText}` : ""}
${gongmangText ? `빈 에너지: ${gongmangText}` : ""}

════════════════════════════════════════════════════════════════
PART 2: 서양 점성술 (WESTERN ASTROLOGY)
════════════════════════════════════════════════════════════════

🌟 핵심 행성 배치 (Core Planets)
───────────────────────────────────────
ASC: ${ascendant?.sign ?? "-"} | MC: ${mc?.sign ?? "-"}
Sun: ${sun?.sign ?? "-"} (H${sun?.house ?? "-"})
Moon: ${moon?.sign ?? "-"} (H${moon?.house ?? "-"})
Mercury: ${mercury?.sign ?? "-"} (H${mercury?.house ?? "-"})
Venus: ${venus?.sign ?? "-"} (H${venus?.house ?? "-"})
Mars: ${mars?.sign ?? "-"} (H${mars?.house ?? "-"})
Jupiter: ${jupiter?.sign ?? "-"} (H${jupiter?.house ?? "-"})
Saturn: ${saturn?.sign ?? "-"} (H${saturn?.house ?? "-"})
Uranus: ${uranus?.sign ?? "-"} (H${uranus?.house ?? "-"})
Neptune: ${neptune?.sign ?? "-"} (H${neptune?.house ?? "-"})
Pluto: ${pluto?.sign ?? "-"} (H${pluto?.house ?? "-"})
North Node: ${northNode?.sign ?? "-"} (H${northNode?.house ?? "-"})
Elements: ${elements || "-"}

All Planets: ${planetLines}
Houses: ${houseLines}
Major Aspects: ${aspectLines}
Current Transits: ${significantTransits || "-"}

🔮 Extra Points (특수점)
───────────────────────────────────────
${extraPointsText}

🌠 Asteroids (소행성)
───────────────────────────────────────
${asteroidsText}
Asteroid Aspects: ${asteroidAspectsText}

════════════════════════════════════════════════════════════════
PART 3: 고급 점성 분석 (ADVANCED ASTROLOGY)
════════════════════════════════════════════════════════════════

☀️ Solar Return (연간 차트 - ${currentYear})
───────────────────────────────────────
${solarReturnText}

🌙 Lunar Return (월간 차트)
───────────────────────────────────────
${lunarReturnText}

📈 Progressions (진행 차트)
───────────────────────────────────────
${progressionsText}

🐉 Draconic Chart (드라코닉 - 영혼 차트)
───────────────────────────────────────
${draconicText}

🎵 Harmonics (하모닉 분석)
───────────────────────────────────────
Profile: ${harmonicsText}
Charts: ${harmonicChartsText}

⭐ Fixed Stars (항성)
───────────────────────────────────────
${fixedStarsText}

🌑 Eclipses (일/월식 영향)
───────────────────────────────────────
${eclipsesText}

📆 Electional (택일 분석)
───────────────────────────────────────
${electionalText}

🎯 Midpoints (미드포인트)
───────────────────────────────────────
Key: ${midpointsText}
All: ${allMidpointsText}
${loveAnalysisSection}${careerAnalysisSection}${healthAnalysisSection}${familyAnalysisSection}${todayAnalysisSection}${monthAnalysisSection}${yearAnalysisSection}${lifeAnalysisSection}
════════════════════════════════════════════════════════════════
`.trim();
}

export const buildBasePrompt = buildAllDataPrompt;
