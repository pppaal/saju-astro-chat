/**
 * Returns and Progressions Calculations for Destiny Map
 * 회귀도 및 진행도 계산 (Solar/Lunar Returns, Secondary Progressions, Solar Arc)
 */

import {
  calculateSolarReturn,
  calculateLunarReturn,
  getSolarReturnSummary,
  getLunarReturnSummary,
  calculateSecondaryProgressions,
  calculateSolarArcDirections,
  getProgressedMoonPhase,
  getProgressionSummary,
  type ReturnChart,
  type ProgressedChart,
} from "@/lib/astrology";
import { logger } from "@/lib/logger";

export interface NatalInput {
  year: number;
  month: number;
  date: number;
  hour: number;
  minute: number;
  latitude: number;
  longitude: number;
  timeZone: string;
}

export interface CurrentDate {
  year: number;
  month: number;
  day: number;
}

export interface SolarReturnResult {
  chart: ReturnChart;
  summary: ReturnType<typeof getSolarReturnSummary>;
}

export interface LunarReturnResult {
  chart: ReturnChart;
  summary: ReturnType<typeof getLunarReturnSummary>;
}

export interface SecondaryProgressionResult {
  chart: ProgressedChart;
  moonPhase: ReturnType<typeof getProgressedMoonPhase>;
  summary: ReturnType<typeof getProgressionSummary>;
}

export interface SolarArcResult {
  chart: ProgressedChart;
  summary: ReturnType<typeof getProgressionSummary>;
}

export interface ProgressionsResult {
  secondary: SecondaryProgressionResult;
  solarArc?: SolarArcResult;
}

export interface ReturnsProgressionsInput {
  /** Natal chart birth data */
  natal: NatalInput;
  /** Current date for calculations */
  currentDate: CurrentDate;
  /** Include Solar Arc Directions (optional, adds computation time) */
  includeSolarArc?: boolean;
}

/**
 * Calculate Solar Return chart
 *
 * The Solar Return is a chart calculated for the exact moment when the transiting Sun
 * returns to its natal position each year. It provides insights into themes and energies
 * for the upcoming year until the next Solar Return.
 *
 * @param input - Solar Return calculation input
 * @param enableDebugLogs - Enable detailed logging
 * @returns Solar Return chart with interpretive summary
 *
 * @example
 * ```typescript
 * const solarReturn = await calculateSolarReturnChart({
 *   natal: { year: 1990, month: 6, date: 15, hour: 10, minute: 30, latitude: 37.5, longitude: 126.9, timeZone: 'Asia/Seoul' },
 *   currentDate: { year: 2024, month: 1, day: 13 }
 * });
 *
 * console.log(`Solar Return ASC: ${solarReturn.summary.ascendant.sign}`);
 * ```
 */
export async function calculateSolarReturnChart(
  input: ReturnsProgressionsInput,
  enableDebugLogs = false
): Promise<SolarReturnResult> {
  const { natal, currentDate } = input;

  if (enableDebugLogs) {
    logger.debug("[Solar Return] Calculating for year", currentDate.year);
  }

  try {
    const srChart = await calculateSolarReturn({
      natal,
      year: currentDate.year,
    });

    const srSummary = getSolarReturnSummary(srChart);

    if (enableDebugLogs) {
      logger.debug("[Solar Return] Calculated", {
        year: currentDate.year,
        asc: srChart.ascendant?.sign,
        mc: srChart.mc?.sign,
      });
    }

    return { chart: srChart, summary: srSummary };
  } catch (err) {
    logger.error("[Solar Return] Calculation failed", err);
    throw err;
  }
}

/**
 * Calculate Lunar Return chart
 *
 * The Lunar Return is calculated for when the Moon returns to its natal position,
 * occurring approximately every 27-28 days. It provides insights into the monthly
 * emotional and domestic themes.
 *
 * @param input - Lunar Return calculation input
 * @param enableDebugLogs - Enable detailed logging
 * @returns Lunar Return chart with interpretive summary
 *
 * @example
 * ```typescript
 * const lunarReturn = await calculateLunarReturnChart({
 *   natal: { year: 1990, month: 6, date: 15, hour: 10, minute: 30, latitude: 37.5, longitude: 126.9, timeZone: 'Asia/Seoul' },
 *   currentDate: { year: 2024, month: 1, day: 13 }
 * });
 *
 * console.log(`Lunar Return Moon: ${lunarReturn.summary.moon.sign}`);
 * ```
 */
export async function calculateLunarReturnChart(
  input: ReturnsProgressionsInput,
  enableDebugLogs = false
): Promise<LunarReturnResult> {
  const { natal, currentDate } = input;

  if (enableDebugLogs) {
    logger.debug("[Lunar Return] Calculating for month", {
      year: currentDate.year,
      month: currentDate.month,
    });
  }

  try {
    const lrChart = await calculateLunarReturn({
      natal,
      month: currentDate.month,
      year: currentDate.year,
    });

    const lrSummary = getLunarReturnSummary(lrChart);

    if (enableDebugLogs) {
      logger.debug("[Lunar Return] Calculated", {
        month: currentDate.month,
        moon: lrChart.planets.find((p) => p.name === "Moon")?.sign,
      });
    }

    return { chart: lrChart, summary: lrSummary };
  } catch (err) {
    logger.error("[Lunar Return] Calculation failed", err);
    throw err;
  }
}

/**
 * Calculate Secondary Progressions
 *
 * Secondary Progressions use the "day-for-a-year" method where each day after birth
 * represents one year of life. The progressed chart shows inner psychological development
 * and maturation over time.
 *
 * Key Points:
 * - Progressed Sun moves ~1° per year (changes sign every ~30 years)
 * - Progressed Moon moves ~1° per month (changes sign every ~2.5 years)
 * - Progressed Moon phase reflects evolving consciousness
 *
 * @param input - Progressions calculation input
 * @param enableDebugLogs - Enable detailed logging
 * @returns Secondary Progressions with Moon phase and summary
 *
 * @example
 * ```typescript
 * const progressions = await calculateSecondaryProgressionsChart({
 *   natal: { year: 1990, month: 6, date: 15, hour: 10, minute: 30, latitude: 37.5, longitude: 126.9, timeZone: 'Asia/Seoul' },
 *   currentDate: { year: 2024, month: 1, day: 13 }
 * });
 *
 * console.log(`Progressed Moon phase: ${progressions.moonPhase.phase}`);
 * ```
 */
export async function calculateSecondaryProgressionsChart(
  input: ReturnsProgressionsInput,
  enableDebugLogs = false
): Promise<SecondaryProgressionResult> {
  const { natal, currentDate } = input;

  const targetDate = `${currentDate.year}-${String(currentDate.month).padStart(2, "0")}-${String(currentDate.day).padStart(2, "0")}`;

  if (enableDebugLogs) {
    logger.debug("[Secondary Progressions] Calculating for date", targetDate);
  }

  try {
    const secProgChart = await calculateSecondaryProgressions({
      natal,
      targetDate,
    });

    const secProgSun = secProgChart.planets.find((p) => p.name === "Sun");
    const secProgMoon = secProgChart.planets.find((p) => p.name === "Moon");

    const secMoonPhase: ReturnType<typeof getProgressedMoonPhase> =
      secProgSun && secProgMoon
        ? getProgressedMoonPhase(secProgSun.longitude, secProgMoon.longitude)
        : "Dark Moon";

    const secProgSummary = getProgressionSummary(secProgChart);

    if (enableDebugLogs) {
      logger.debug("[Secondary Progressions] Calculated", {
        progSun: secProgSun?.sign,
        progMoon: secProgMoon?.sign,
        moonPhase: secMoonPhase,
      });
    }

    return {
      chart: secProgChart,
      moonPhase: secMoonPhase,
      summary: secProgSummary,
    };
  } catch (err) {
    logger.error("[Secondary Progressions] Calculation failed", err);
    throw err;
  }
}

/**
 * Calculate Solar Arc Directions
 *
 * Solar Arc Directions advance all chart points by the same amount the Sun has progressed.
 * This technique is simpler than Secondary Progressions but highly effective for timing
 * major life events. The Solar Arc typically moves about 1° per year.
 *
 * Solar Arc is particularly useful for:
 * - Predicting timing of major life changes
 * - Finding periods of opportunity or challenge
 * - Complementing Secondary Progressions for a fuller picture
 *
 * @param input - Solar Arc calculation input
 * @param enableDebugLogs - Enable detailed logging
 * @returns Solar Arc chart with summary
 *
 * @example
 * ```typescript
 * const solarArc = await calculateSolarArcChart({
 *   natal: { year: 1990, month: 6, date: 15, hour: 10, minute: 30, latitude: 37.5, longitude: 126.9, timeZone: 'Asia/Seoul' },
 *   currentDate: { year: 2024, month: 1, day: 13 }
 * });
 *
 * console.log(`Solar Arc Sun: ${solarArc.chart.planets[0].sign}`);
 * ```
 */
export async function calculateSolarArcChart(
  input: ReturnsProgressionsInput,
  enableDebugLogs = false
): Promise<SolarArcResult> {
  const { natal, currentDate } = input;

  const targetDate = `${currentDate.year}-${String(currentDate.month).padStart(2, "0")}-${String(currentDate.day).padStart(2, "0")}`;

  if (enableDebugLogs) {
    logger.debug("[Solar Arc] Calculating for date", targetDate);
  }

  try {
    const solarArcChart = await calculateSolarArcDirections({
      natal,
      targetDate,
    });

    const solarArcSummary = getProgressionSummary(solarArcChart);

    if (enableDebugLogs) {
      logger.debug("[Solar Arc] Calculated", {
        arcSun: solarArcChart.planets.find((p) => p.name === "Sun")?.sign,
      });
    }

    return {
      chart: solarArcChart,
      summary: solarArcSummary,
    };
  } catch (err) {
    logger.error("[Solar Arc] Calculation failed", err);
    throw err;
  }
}

/**
 * Calculate all progressions (Secondary and optionally Solar Arc)
 *
 * This is a convenience function that calculates both Secondary Progressions and
 * Solar Arc Directions in one call. Solar Arc can be optionally excluded to save
 * computation time when not needed.
 *
 * @param input - Progressions calculation input
 * @param enableDebugLogs - Enable detailed logging
 * @returns Combined progressions result
 *
 * @example
 * ```typescript
 * const progressions = await calculateAllProgressions({
 *   natal: { year: 1990, month: 6, date: 15, hour: 10, minute: 30, latitude: 37.5, longitude: 126.9, timeZone: 'Asia/Seoul' },
 *   currentDate: { year: 2024, month: 1, day: 13 },
 *   includeSolarArc: true
 * });
 *
 * console.log(`Secondary Moon: ${progressions.secondary.chart.planets[1].sign}`);
 * console.log(`Solar Arc Sun: ${progressions.solarArc?.chart.planets[0].sign}`);
 * ```
 */
export async function calculateAllProgressions(
  input: ReturnsProgressionsInput,
  enableDebugLogs = false
): Promise<ProgressionsResult> {
  const { includeSolarArc = true } = input;

  if (enableDebugLogs) {
    logger.debug("[Progressions] Starting calculation", {
      includeSolarArc,
    });
  }

  try {
    const secondary = await calculateSecondaryProgressionsChart(
      input,
      enableDebugLogs
    );

    let solarArc: SolarArcResult | undefined = undefined;
    if (includeSolarArc) {
      solarArc = await calculateSolarArcChart(input, enableDebugLogs);
    }

    if (enableDebugLogs) {
      logger.debug("[Progressions] Calculation complete", {
        hasSecondary: true,
        hasSolarArc: !!solarArc,
      });
    }

    return {
      secondary,
      solarArc,
    };
  } catch (err) {
    logger.error("[Progressions] Calculation failed", err);
    throw err;
  }
}
