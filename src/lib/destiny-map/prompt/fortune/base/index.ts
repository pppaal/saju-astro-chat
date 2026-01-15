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

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { CombinedResult } from "@/lib/destiny-map/astrologyengine";
import { logger } from "@/lib/logger";

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
    const ageInfo = calculateAgeInfo(saju.facts, saju.pillars);

    // Debug logging
    logger.debug("[buildAllDataPrompt] saju keys:", saju ? Object.keys(saju) : "null");
    logger.debug("[buildAllDataPrompt] unse:", saju.unse ? JSON.stringify(saju.unse).slice(0, 500) : "null");
    logger.debug("[buildAllDataPrompt] daeun count:", saju.unse?.daeun?.length ?? 0);
    logger.debug("[buildAllDataPrompt] first daeun:", saju.unse?.daeun?.[0] ? JSON.stringify(saju.unse.daeun[0]) : "null");

    // Step 2: Format basic planetary/saju data
    const planetLines = formatPlanetLines(planetary.planets);
    const houseLines = formatHouseLines(planetary.houses);
    const aspectLines = formatAspectLines(planetary.aspects);
    const elements = formatElements(planetary.facts?.elementRatios);
    const pillarText = formatPillarText(saju.pillars);
    const dayMaster = extractDayMaster(saju.pillars, saju.dayMaster);

    // Step 3: Format luck cycles (daeun, annual, monthly)
    const daeunText = formatDaeunText(saju.unse, ageInfo.currentAge);
    const allDaeunText = formatAllDaeunText(saju.unse, ageInfo.currentAge);
    const futureAnnualList = formatFutureAnnualList(saju.unse, timeInfo.currentYear);
    const futureMonthlyList = formatFutureMonthlyList(saju.unse, timeInfo.currentYear, timeInfo.currentMonth);

    // Step 4: Format sinsal and advanced saju analysis
    const { lucky, unlucky } = formatSinsalLists(saju.sinsal);
    const advancedAnalysis = formatAdvancedSajuAnalysis(saju.advancedAnalysis);

    // Step 5: Find current annual and monthly
    const currentAnnual = (saju.unse?.annual ?? []).find((a: any) => a.year === timeInfo.currentYear);
    const currentMonthly = (saju.unse?.monthly ?? []).find((m: any) =>
      m.year === timeInfo.currentYear && m.month === timeInfo.currentMonth
    );

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
    const asteroidAspectsText = advancedAstro.asteroids.aspects ? (() => {
      if (Array.isArray(advancedAstro.asteroids.aspects)) {
        return advancedAstro.asteroids.aspects.slice(0, 4).map((a: any) =>
          `${a.asteroid ?? a.from}-${a.type ?? a.aspect}-${a.planet ?? a.to}`
        ).join("; ");
      }
      if (typeof advancedAstro.asteroids.aspects === 'object') {
        const allAsp: string[] = [];
        for (const [name, hits] of Object.entries(advancedAstro.asteroids.aspects)) {
          if (Array.isArray(hits)) {
            for (const h of (hits as any[]).slice(0, 2)) {
              allAsp.push(`${name}-${h.type ?? h.aspect}-${h.planet2?.name ?? h.to ?? h.planet}`);
            }
          }
        }
        return allAsp.slice(0, 4).join("; ");
      }
      return "-";
    })() : "-";

    // Step 8: Format advanced astrology data
    const solarReturnText = advancedAstro.solarReturn ? [
      `SR ASC: ${advancedAstro.solarReturn.summary?.ascSign ?? advancedAstro.solarReturn.summary?.ascendant ?? "-"}`,
      `SR Sun House: ${advancedAstro.solarReturn.summary?.sunHouse ?? "-"}`,
      `SR Moon: ${advancedAstro.solarReturn.summary?.moonSign ?? "-"} (H${advancedAstro.solarReturn.summary?.moonHouse ?? "-"})`,
      `Year Theme: ${advancedAstro.solarReturn.summary?.theme ?? advancedAstro.solarReturn.summary?.yearTheme ?? "-"}`,
    ].join("; ") : "-";

    const lunarReturnText = advancedAstro.lunarReturn ? [
      `LR ASC: ${advancedAstro.lunarReturn.summary?.ascSign ?? advancedAstro.lunarReturn.summary?.ascendant ?? "-"}`,
      `LR Moon House: ${advancedAstro.lunarReturn.summary?.moonHouse ?? "-"}`,
      `Month Theme: ${advancedAstro.lunarReturn.summary?.theme ?? advancedAstro.lunarReturn.summary?.monthTheme ?? "-"}`,
    ].join("; ") : "-";

    const progressionsText = advancedAstro.progressions ? [
      `Progressed Sun: ${advancedAstro.progressions.secondary?.summary?.keySigns?.sun ?? advancedAstro.progressions.secondary?.summary?.progressedSun ?? "-"}`,
      `Progressed Moon: ${advancedAstro.progressions.secondary?.summary?.keySigns?.moon ?? advancedAstro.progressions.secondary?.summary?.progressedMoon ?? "-"}`,
      `Moon Phase: ${advancedAstro.progressions.secondary?.moonPhase?.phase ?? "-"}`,
      advancedAstro.progressions.solarArc ? `Solar Arc Sun: ${advancedAstro.progressions.solarArc.summary?.keySigns?.sun ?? advancedAstro.progressions.solarArc.summary?.progressedSun ?? "-"}` : null,
    ].filter(Boolean).join("; ") : "-";

    const draconicText = advancedAstro.draconic ? [
      `Draconic Sun: ${advancedAstro.draconic.chart?.planets?.find((p: any) => p.name === "Sun")?.sign ?? "-"}`,
      `Draconic Moon: ${advancedAstro.draconic.chart?.planets?.find((p: any) => p.name === "Moon")?.sign ?? "-"}`,
      `Draconic ASC: ${advancedAstro.draconic.chart?.ascendant?.sign ?? "-"}`,
      advancedAstro.draconic.comparison?.alignments?.length ? `Alignments: ${advancedAstro.draconic.comparison.alignments.slice(0, 2).map((a: any) => a.description).join("; ")}` : null,
    ].filter(Boolean).join("; ") : "-";

    const harmonicsText = advancedAstro.harmonics?.profile ? [
      advancedAstro.harmonics.profile.dominant ? `Dominant: H${advancedAstro.harmonics.profile.dominant}` : null,
      advancedAstro.harmonics.profile.creative ? `Creative(H5): ${advancedAstro.harmonics.profile.creative?.toFixed?.(0) ?? advancedAstro.harmonics.profile.creative}%` : null,
      advancedAstro.harmonics.profile.intuitive ? `Intuitive(H7): ${advancedAstro.harmonics.profile.intuitive?.toFixed?.(0) ?? advancedAstro.harmonics.profile.intuitive}%` : null,
      advancedAstro.harmonics.profile.spiritual ? `Spiritual(H9): ${advancedAstro.harmonics.profile.spiritual?.toFixed?.(0) ?? advancedAstro.harmonics.profile.spiritual}%` : null,
    ].filter(Boolean).join("; ") : "-";

    const h5Sun = advancedAstro.harmonics?.h5?.planets?.find((p: any) => p.name === "Sun");
    const h7Sun = advancedAstro.harmonics?.h7?.planets?.find((p: any) => p.name === "Sun");
    const h9Sun = advancedAstro.harmonics?.h9?.planets?.find((p: any) => p.name === "Sun");
    const harmonicChartsText = [
      h5Sun ? `H5 Sun: ${h5Sun.sign}` : null,
      h7Sun ? `H7 Sun: ${h7Sun.sign}` : null,
      h9Sun ? `H9 Sun: ${h9Sun.sign}` : null,
    ].filter(Boolean).join("; ") || "-";

    const fixedStarsText = advancedAstro.fixedStars?.length
      ? advancedAstro.fixedStars.slice(0, 4).map((fs: any) => `${fs.star ?? fs.starName}↔${fs.planet ?? fs.planetName}(${fs.meaning ?? ""})`).join("; ")
      : "-";

    const eclipsesText = advancedAstro.eclipses ? [
      advancedAstro.eclipses.impact ? `Impact: ${advancedAstro.eclipses.impact.eclipseType ?? advancedAstro.eclipses.impact.type ?? "-"} on ${advancedAstro.eclipses.impact.affectedPoint ?? advancedAstro.eclipses.impact.affectedPlanet ?? "-"}` : null,
      advancedAstro.eclipses.upcoming?.length ? `Next: ${advancedAstro.eclipses.upcoming[0]?.date ?? "-"} (${advancedAstro.eclipses.upcoming[0]?.type ?? "-"})` : null,
    ].filter(Boolean).join("; ") : "-";

    const electionalText = advancedAstro.electional ? [
      `Moon Phase: ${typeof advancedAstro.electional.moonPhase === 'string' ? advancedAstro.electional.moonPhase : (advancedAstro.electional.moonPhase?.phase ?? advancedAstro.electional.moonPhase?.name ?? "-")}`,
      advancedAstro.electional.voidOfCourse ? `VOC: ${advancedAstro.electional.voidOfCourse.isVoid ? "YES - 중요한 결정 피하기" : "No"}` : null,
      `Planetary Hour: ${advancedAstro.electional.planetaryHour?.planet ?? "-"}`,
      advancedAstro.electional.retrograde?.length ? `Retrograde: ${advancedAstro.electional.retrograde.join(", ")}` : null,
      advancedAstro.electional.analysis?.score ? `Score: ${advancedAstro.electional.analysis.score}/100` : null,
      advancedAstro.electional.analysis?.recommendation ? `Tip: ${advancedAstro.electional.analysis.recommendation}` : null,
    ].filter(Boolean).join("; ") : "-";

    const midpointsText = advancedAstro.midpoints ? [
      advancedAstro.midpoints.sunMoon ? `Sun/Moon(심리): ${advancedAstro.midpoints.sunMoon.sign} ${advancedAstro.midpoints.sunMoon.degree?.toFixed?.(0) ?? advancedAstro.midpoints.sunMoon.degree ?? 0}°` : null,
      advancedAstro.midpoints.ascMc ? `ASC/MC(자아): ${advancedAstro.midpoints.ascMc.sign} ${advancedAstro.midpoints.ascMc.degree?.toFixed?.(0) ?? advancedAstro.midpoints.ascMc.degree ?? 0}°` : null,
      advancedAstro.midpoints.activations?.length ? `Activated: ${advancedAstro.midpoints.activations.slice(0, 3).map((a: any) => a.description ?? `${a.midpoint}-${a.activator}`).join("; ")}` : null,
    ].filter(Boolean).join("; ") : "-";

    const allMidpointsText = advancedAstro.midpoints?.all?.length
      ? advancedAstro.midpoints.all.slice(0, 5).map((mp: any) => `${mp.planet1}-${mp.planet2}: ${mp.sign} ${mp.degree?.toFixed?.(0) ?? 0}°`).join("; ")
      : "-";

    const significantTransits = formatSignificantTransits(planetary.transits);

    // Debug: log generated daeun text
    logger.debug("[buildAllDataPrompt] currentAge:", ageInfo.currentAge);
    logger.debug("[buildAllDataPrompt] daeunText:", daeunText);
    logger.debug("[buildAllDataPrompt] allDaeunText preview:", allDaeunText.slice(0, 200));

    // Step 9: Build theme-specific section
    const themeSection = buildThemeSection(theme, {
      theme,
      planetary,
      saju,
      advanced: advancedAnalysis,
      advancedAstro,
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
      sunHouse: planetary.sun?.house ?? "-",
      moonSign: planetary.moon?.sign ?? "-",
      moonHouse: planetary.moon?.house ?? "-",
      mercurySign: planetary.mercury?.sign ?? "-",
      mercuryHouse: planetary.mercury?.house ?? "-",
      venusSign: planetary.venus?.sign ?? "-",
      venusHouse: planetary.venus?.house ?? "-",
      marsSign: planetary.mars?.sign ?? "-",
      marsHouse: planetary.mars?.house ?? "-",
      jupiterSign: planetary.jupiter?.sign ?? "-",
      jupiterHouse: planetary.jupiter?.house ?? "-",
      saturnSign: planetary.saturn?.sign ?? "-",
      saturnHouse: planetary.saturn?.house ?? "-",
      uranusSign: planetary.uranus?.sign ?? "-",
      uranusHouse: planetary.uranus?.house ?? "-",
      neptuneSign: planetary.neptune?.sign ?? "-",
      neptuneHouse: planetary.neptune?.house ?? "-",
      plutoSign: planetary.pluto?.sign ?? "-",
      plutoHouse: planetary.pluto?.house ?? "-",
      northNodeSign: planetary.northNode?.sign ?? "-",
      northNodeHouse: planetary.northNode?.house ?? "-",
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
