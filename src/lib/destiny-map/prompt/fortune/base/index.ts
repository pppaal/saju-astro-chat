/**
 * Prompt Builder Main Orchestrator (Refactored)
 * 프롬프트 빌더 메인 오케스트레이터 (리팩토링됨)
 *
 * This is the main entry point for prompt generation, orchestrating all
 * specialized modules to build comprehensive fortune-telling prompts.
 *
 * Architecture:
 * - translation-maps.ts: Korean translation mappings
 * - data-extractors.ts: Extract data from CombinedResult
 * - formatter-utils.ts: Format data into readable strings
 * - theme-sections.ts: Build theme-specific analysis sections
 * - prompt-template.ts: Assemble final prompt structure
 * - index.ts (this file): Main orchestrator
 *
 * This refactored version maintains backward compatibility with the original
 * buildAllDataPrompt function while providing better modularity, testability,
 * and maintainability.
 */

 

import type { CombinedResult } from "@/lib/destiny-map/astrologyengine";
import type { PlanetData } from "@/lib/astrology";
import { logger } from "@/lib/logger";
import type { AnnualItem, MonthlyItem, PillarSet } from './prompt-types';
import type { UnseDataForFormat } from './formatter-utils';

// Import all modules
import {
  extractPlanetaryData,
  extractSajuData,
  extractAdvancedAstrology,
  getCurrentTimeInfo,
  calculateAgeInfo,
} from './data-extractors';

import {
  formatPlanetLines,
  formatHouseLines,
  formatAspectLines,
  formatElements,
  formatPillarText,
  extractDayMaster,
  formatDaeunText,
  formatAllDaeunText,
  formatFutureAnnualList,
  formatFutureMonthlyList,
  formatSinsalLists,
  formatAdvancedSajuAnalysis,
  formatSignificantTransits,
} from './formatter-utils';

import { buildThemeSection } from './theme-sections';
import { assemblePromptTemplate, type PromptData } from './prompt-template';

/**
 * Build a comprehensive data snapshot for fortune prompts (Refactored)
 *
 * v3.1 - Includes ALL saju + ALL advanced astrology data for expert-level predictions.
 *
 * This is the main public API function that maintains backward compatibility
 * with the original implementation while leveraging the new modular architecture.
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
 *
 * @param lang - Language code (e.g., 'ko', 'en')
 * @param theme - Fortune theme (love, career, wealth, health, family, today, month, year, life)
 * @param data - Combined result from destiny map calculation
 * @returns Comprehensive formatted prompt string
 */
export function buildAllDataPrompt(lang: string, theme: string, data: CombinedResult): string {
  try {
    // Step 1: Extract data from CombinedResult
    const planetary = extractPlanetaryData(data);
    const saju = extractSajuData(data);
    const advancedAstro = extractAdvancedAstrology(data);
    const timeInfo = getCurrentTimeInfo();
    const ageInfo = calculateAgeInfo(saju.facts, saju.pillars as PillarSet);

    // Debug logging
    logger.debug("[buildAllDataPrompt] saju keys:", saju ? Object.keys(saju) : "null");
    logger.debug("[buildAllDataPrompt] unse:", saju.unse ? JSON.stringify(saju.unse).slice(0, 500) : "null");
    logger.debug("[buildAllDataPrompt] daeun count:", saju.unse?.daeun?.length ?? 0);
    logger.debug("[buildAllDataPrompt] first daeun:", saju.unse?.daeun?.[0] ? JSON.stringify(saju.unse.daeun[0]) : "null");

    // Step 2: Format basic planetary/saju data
    const planetLines = formatPlanetLines(planetary.planets);
    const houseLines = formatHouseLines(planetary.houses);
    const aspectLines = formatAspectLines(planetary.aspects);
    const elements = formatElements(planetary.facts?.elementRatios as Record<string, number> | undefined);
    const pillarText = formatPillarText(saju.pillars);
    const dayMaster = extractDayMaster(saju.pillars, saju.dayMaster);

    // Step 3: Format luck cycles (daeun, annual, monthly)
    // Cast unse to UnseDataForFormat since arrays may contain unknown items
    const unseForFormat = saju.unse as UnseDataForFormat | undefined;
    const daeunText = formatDaeunText(unseForFormat, ageInfo.currentAge);
    const allDaeunText = formatAllDaeunText(unseForFormat, ageInfo.currentAge);
    const futureAnnualList = formatFutureAnnualList(unseForFormat, timeInfo.currentYear);
    const futureMonthlyList = formatFutureMonthlyList(unseForFormat, timeInfo.currentYear, timeInfo.currentMonth);

    // Step 4: Format sinsal and advanced saju analysis
    const { lucky, unlucky } = formatSinsalLists(saju.sinsal);
    const advancedAnalysis = formatAdvancedSajuAnalysis(saju.advancedAnalysis);

    // Step 5: Find current annual and monthly
    const currentAnnual = (saju.unse?.annual ?? []).find((a) => (a as AnnualItem).year === timeInfo.currentYear) as AnnualItem | undefined;
    const currentMonthly = (saju.unse?.monthly ?? []).find((m) => {
      const item = m as MonthlyItem;
      return item.year === timeInfo.currentYear && item.month === timeInfo.currentMonth;
    }) as MonthlyItem | undefined;

    // Step 6: Format extra points (Chiron, Lilith, Vertex, Part of Fortune)
    const extraPointsText = [
      advancedAstro.extraPoints.chiron ? `Chiron(상처/치유): ${advancedAstro.extraPoints.chiron.sign} (H${advancedAstro.extraPoints.chiron.house})` : null,
      advancedAstro.extraPoints.lilith ? `Lilith(그림자): ${advancedAstro.extraPoints.lilith.sign} (H${advancedAstro.extraPoints.lilith.house})` : null,
      advancedAstro.extraPoints.vertex ? `Vertex(운명): ${advancedAstro.extraPoints.vertex.sign} (H${advancedAstro.extraPoints.vertex.house})` : null,
      advancedAstro.extraPoints.partOfFortune ? `Part of Fortune(행운): ${advancedAstro.extraPoints.partOfFortune.sign} (H${advancedAstro.extraPoints.partOfFortune.house})` : null,
    ].filter(Boolean).join("; ") || "-";

    // Step 7: Format asteroids
    const asteroidsText = [
      advancedAstro.asteroids.ceres ? `Ceres(양육): ${advancedAstro.asteroids.ceres.sign} (H${advancedAstro.asteroids.ceres.house})` : null,
      advancedAstro.asteroids.pallas ? `Pallas(지혜): ${advancedAstro.asteroids.pallas.sign} (H${advancedAstro.asteroids.pallas.house})` : null,
      advancedAstro.asteroids.juno ? `Juno(결혼): ${advancedAstro.asteroids.juno.sign} (H${advancedAstro.asteroids.juno.house})` : null,
      advancedAstro.asteroids.vesta ? `Vesta(헌신): ${advancedAstro.asteroids.vesta.sign} (H${advancedAstro.asteroids.vesta.house})` : null,
    ].filter(Boolean).join("; ") || "-";

    // Asteroid aspects
    type AsteroidAspect = { asteroid?: string; from?: string; type?: string; aspect?: string; planet?: string; to?: string; planet2?: { name?: string } };
    const asteroidAspectsText = advancedAstro.asteroids.aspects ? (() => {
      if (Array.isArray(advancedAstro.asteroids.aspects)) {
        return advancedAstro.asteroids.aspects.slice(0, 4).map((a: AsteroidAspect) =>
          `${a.asteroid ?? a.from}-${a.type ?? a.aspect}-${a.planet ?? a.to}`
        ).join("; ");
      }
      if (typeof advancedAstro.asteroids.aspects === 'object') {
        const allAsp: string[] = [];
        for (const [name, hits] of Object.entries(advancedAstro.asteroids.aspects)) {
          if (Array.isArray(hits)) {
            for (const h of (hits as AsteroidAspect[]).slice(0, 2)) {
              allAsp.push(`${name}-${h.type ?? h.aspect}-${h.planet2?.name ?? h.to ?? h.planet}`);
            }
          }
        }
        return allAsp.slice(0, 4).join("; ");
      }
      return "-";
    })() : "-";

    // Step 8: Format advanced astrology data
    // Use type assertions for flexible API response structures
    type FlexibleSummary = Record<string, unknown>;
    type FlexibleProfile = Record<string, unknown>;
    type FlexibleImpact = Record<string, unknown>;
    type FlexibleMoonPhase = Record<string, unknown>;
    type FlexibleAnalysis = Record<string, unknown>;
    type FlexibleActivation = Record<string, unknown>;
    type FlexibleAlignment = Record<string, unknown>;

    const srSummary = advancedAstro.solarReturn?.summary as FlexibleSummary | undefined;
    const solarReturnText = advancedAstro.solarReturn ? [
      `SR ASC: ${srSummary?.ascSign ?? srSummary?.ascendant ?? "-"}`,
      `SR Sun House: ${srSummary?.sunHouse ?? "-"}`,
      `SR Moon: ${srSummary?.moonSign ?? "-"} (H${srSummary?.moonHouse ?? "-"})`,
      `Year Theme: ${srSummary?.theme ?? srSummary?.yearTheme ?? "-"}`,
    ].join("; ") : "-";

    const lrSummary = advancedAstro.lunarReturn?.summary as FlexibleSummary | undefined;
    const lunarReturnText = advancedAstro.lunarReturn ? [
      `LR ASC: ${lrSummary?.ascSign ?? lrSummary?.ascendant ?? "-"}`,
      `LR Moon House: ${lrSummary?.moonHouse ?? "-"}`,
      `Month Theme: ${lrSummary?.theme ?? lrSummary?.monthTheme ?? "-"}`,
    ].join("; ") : "-";

    const secSummary = advancedAstro.progressions?.secondary?.summary as FlexibleSummary | undefined;
    const secMoonPhase = advancedAstro.progressions?.secondary?.moonPhase as FlexibleMoonPhase | undefined;
    const saSummary = advancedAstro.progressions?.solarArc?.summary as FlexibleSummary | undefined;
    const progressionsText = advancedAstro.progressions ? [
      `Progressed Sun: ${(secSummary?.keySigns as FlexibleSummary)?.sun ?? secSummary?.progressedSun ?? "-"}`,
      `Progressed Moon: ${(secSummary?.keySigns as FlexibleSummary)?.moon ?? secSummary?.progressedMoon ?? "-"}`,
      `Moon Phase: ${secMoonPhase?.phase ?? "-"}`,
      advancedAstro.progressions.solarArc ? `Solar Arc Sun: ${(saSummary?.keySigns as FlexibleSummary)?.sun ?? saSummary?.progressedSun ?? "-"}` : null,
    ].filter(Boolean).join("; ") : "-";

    const draconicText = advancedAstro.draconic ? [
      `Draconic Sun: ${advancedAstro.draconic.chart?.planets?.find((p: PlanetData) => p.name === "Sun")?.sign ?? "-"}`,
      `Draconic Moon: ${advancedAstro.draconic.chart?.planets?.find((p: PlanetData) => p.name === "Moon")?.sign ?? "-"}`,
      `Draconic ASC: ${advancedAstro.draconic.chart?.ascendant?.sign ?? "-"}`,
      advancedAstro.draconic.comparison?.alignments?.length ? `Alignments: ${(advancedAstro.draconic.comparison.alignments as unknown as FlexibleAlignment[]).slice(0, 2).map((a) => a.description).join("; ")}` : null,
    ].filter(Boolean).join("; ") : "-";

    const harmProfile = advancedAstro.harmonics?.profile as FlexibleProfile | undefined;
    const harmonicsText = harmProfile ? [
      harmProfile.dominant ? `Dominant: H${harmProfile.dominant}` : null,
      harmProfile.creative ? `Creative(H5): ${(harmProfile.creative as number)?.toFixed?.(0) ?? harmProfile.creative}%` : null,
      harmProfile.intuitive ? `Intuitive(H7): ${(harmProfile.intuitive as number)?.toFixed?.(0) ?? harmProfile.intuitive}%` : null,
      harmProfile.spiritual ? `Spiritual(H9): ${(harmProfile.spiritual as number)?.toFixed?.(0) ?? harmProfile.spiritual}%` : null,
    ].filter(Boolean).join("; ") : "-";

    const h5Sun = advancedAstro.harmonics?.h5?.planets?.find((p: PlanetData) => p.name === "Sun");
    const h7Sun = advancedAstro.harmonics?.h7?.planets?.find((p: PlanetData) => p.name === "Sun");
    const h9Sun = advancedAstro.harmonics?.h9?.planets?.find((p: PlanetData) => p.name === "Sun");
    const harmonicChartsText = [
      h5Sun ? `H5 Sun: ${h5Sun.sign}` : null,
      h7Sun ? `H7 Sun: ${h7Sun.sign}` : null,
      h9Sun ? `H9 Sun: ${h9Sun.sign}` : null,
    ].filter(Boolean).join("; ") || "-";

    type FixedStarItem = { star?: unknown; starName?: string; planet?: unknown; planetName?: string; meaning?: string };
    const fixedStarsText = advancedAstro.fixedStars?.length
      ? (advancedAstro.fixedStars as FixedStarItem[]).slice(0, 4).map((fs) => {
          const starName = typeof fs.star === 'object' ? (fs.star as { name?: string })?.name : fs.star ?? fs.starName;
          const planetName = typeof fs.planet === 'object' ? (fs.planet as { name?: string })?.name : fs.planet ?? fs.planetName;
          return `${starName}↔${planetName}(${fs.meaning ?? ""})`;
        }).join("; ")
      : "-";

    const eclipseImpact = advancedAstro.eclipses?.impact as FlexibleImpact | undefined;
    const eclipsesText = advancedAstro.eclipses ? [
      eclipseImpact ? `Impact: ${eclipseImpact.eclipseType ?? eclipseImpact.type ?? "-"} on ${eclipseImpact.affectedPoint ?? eclipseImpact.affectedPlanet ?? "-"}` : null,
      advancedAstro.eclipses.upcoming?.length ? `Next: ${advancedAstro.eclipses.upcoming[0]?.date ?? "-"} (${advancedAstro.eclipses.upcoming[0]?.type ?? "-"})` : null,
    ].filter(Boolean).join("; ") : "-";

    const electMoonPhase = advancedAstro.electional?.moonPhase as FlexibleMoonPhase | string | undefined;
    const electAnalysis = advancedAstro.electional?.analysis as FlexibleAnalysis | undefined;
    const electionalText = advancedAstro.electional ? [
      `Moon Phase: ${typeof electMoonPhase === 'string' ? electMoonPhase : (electMoonPhase?.phase ?? electMoonPhase?.name ?? "-")}`,
      advancedAstro.electional.voidOfCourse ? `VOC: ${advancedAstro.electional.voidOfCourse.isVoid ? "YES - 중요한 결정 피하기" : "No"}` : null,
      `Planetary Hour: ${advancedAstro.electional.planetaryHour?.planet ?? "-"}`,
      advancedAstro.electional.retrograde?.length ? `Retrograde: ${advancedAstro.electional.retrograde.join(", ")}` : null,
      electAnalysis?.score ? `Score: ${electAnalysis.score}/100` : null,
      electAnalysis?.recommendation ?? electAnalysis?.recommendations ? `Tip: ${electAnalysis.recommendation ?? (electAnalysis.recommendations as string[])?.[0] ?? ""}` : null,
    ].filter(Boolean).join("; ") : "-";

    const midpointsText = advancedAstro.midpoints ? [
      advancedAstro.midpoints.sunMoon ? `Sun/Moon(심리): ${advancedAstro.midpoints.sunMoon.sign} ${advancedAstro.midpoints.sunMoon.degree?.toFixed?.(0) ?? advancedAstro.midpoints.sunMoon.degree ?? 0}°` : null,
      advancedAstro.midpoints.ascMc ? `ASC/MC(자아): ${advancedAstro.midpoints.ascMc.sign} ${advancedAstro.midpoints.ascMc.degree?.toFixed?.(0) ?? advancedAstro.midpoints.ascMc.degree ?? 0}°` : null,
      advancedAstro.midpoints.activations?.length ? `Activated: ${(advancedAstro.midpoints.activations as unknown as FlexibleActivation[]).slice(0, 3).map((a) => a.description ?? `${a.midpoint}-${a.activator}`).join("; ")}` : null,
    ].filter(Boolean).join("; ") : "-";

    type MidpointItem = { planet1?: string; planet2?: string; sign?: string; degree?: number };
    const allMidpointsText = advancedAstro.midpoints?.all?.length
      ? advancedAstro.midpoints.all.slice(0, 5).map((mp: MidpointItem) => `${mp.planet1}-${mp.planet2}: ${mp.sign} ${mp.degree?.toFixed?.(0) ?? 0}°`).join("; ")
      : "-";

    const significantTransits = formatSignificantTransits(planetary.transits);

    // Debug: log generated daeun text
    logger.debug("[buildAllDataPrompt] currentAge:", ageInfo.currentAge);
    logger.debug("[buildAllDataPrompt] daeunText:", daeunText);
    logger.debug("[buildAllDataPrompt] allDaeunText preview:", allDaeunText.slice(0, 200));

    // Step 9: Build theme-specific section
    // Use type assertions for flexible data structures
    const themeSection = buildThemeSection(theme, {
      theme,
      planetary,
      saju: saju as Parameters<typeof buildThemeSection>[1]['saju'],
      advanced: advancedAnalysis,
      advancedAstro: advancedAstro as Parameters<typeof buildThemeSection>[1]['advancedAstro'],
      formatting: {
        ...advancedAnalysis,
        lucky,
        unlucky,
        daeunText,
        allDaeunText,
        futureAnnualList,
        futureMonthlyList,
        significantTransits,
      },
      ageInfo,
      timeInfo,
    });

    // Step 10: Assemble final prompt using template
    const promptData: PromptData = {
      lang,
      theme,
      birthYear: ageInfo.birthYear,
      currentAge: ageInfo.currentAge,
      currentYear: timeInfo.currentYear,
      currentMonth: timeInfo.currentMonth,

      // Eastern destiny
      dayMaster,
      pillarText,
      ...advancedAnalysis,
      daeunText,
      currentAnnualElement: currentAnnual?.element ?? "-",
      currentAnnualGanji: currentAnnual?.ganji ?? "",
      currentMonthlyElement: currentMonthly?.element ?? "-",
      lucky,
      unlucky,
      allDaeunText,
      futureAnnualList,
      futureMonthlyList,

      // Western astrology
      ascendantSign: planetary.ascendant?.sign ?? "-",
      mcSign: planetary.mc?.sign ?? "-",
      sunSign: planetary.sun?.sign ?? "-",
      sunHouse: String(planetary.sun?.house ?? "-"),
      moonSign: planetary.moon?.sign ?? "-",
      moonHouse: String(planetary.moon?.house ?? "-"),
      mercurySign: planetary.mercury?.sign ?? "-",
      mercuryHouse: String(planetary.mercury?.house ?? "-"),
      venusSign: planetary.venus?.sign ?? "-",
      venusHouse: String(planetary.venus?.house ?? "-"),
      marsSign: planetary.mars?.sign ?? "-",
      marsHouse: String(planetary.mars?.house ?? "-"),
      jupiterSign: planetary.jupiter?.sign ?? "-",
      jupiterHouse: String(planetary.jupiter?.house ?? "-"),
      saturnSign: planetary.saturn?.sign ?? "-",
      saturnHouse: String(planetary.saturn?.house ?? "-"),
      uranusSign: planetary.uranus?.sign ?? "-",
      uranusHouse: String(planetary.uranus?.house ?? "-"),
      neptuneSign: planetary.neptune?.sign ?? "-",
      neptuneHouse: String(planetary.neptune?.house ?? "-"),
      plutoSign: planetary.pluto?.sign ?? "-",
      plutoHouse: String(planetary.pluto?.house ?? "-"),
      northNodeSign: planetary.northNode?.sign ?? "-",
      northNodeHouse: String(planetary.northNode?.house ?? "-"),
      elements,
      planetLines,
      houseLines,
      aspectLines,
      significantTransits,

      // Extra points & asteroids
      extraPointsText,
      asteroidsText,
      asteroidAspectsText,

      // Advanced astrology
      solarReturnText,
      lunarReturnText,
      progressionsText,
      draconicText,
      harmonicsText,
      harmonicChartsText,
      fixedStarsText,
      eclipsesText,
      electionalText,
      midpointsText,
      allMidpointsText,

      // Theme section
      themeSection,
    };

    return assemblePromptTemplate(promptData);
  } catch (err) {
    logger.error("[buildAllDataPrompt] Error building prompt", err);
    throw err;
  }
}

/**
 * Export backward compatibility alias
 */
export const buildBasePrompt = buildAllDataPrompt;
