/**
 * Specialized Charts Calculations for Destiny Map
 * 특수 차트 계산 (Draconic, Harmonics)
 */

import {
  calculateDraconicChart,
  compareDraconicToNatal,
  calculateHarmonicChart,
  generateHarmonicProfile,
  type Chart,
  type DraconicChart,
  type DraconicComparison,
  type HarmonicChart,
  type HarmonicProfile,
} from "@/lib/astrology";
import { logger } from "@/lib/logger";

export interface DraconicResult {
  /** The Draconic chart (soul chart) */
  chart: DraconicChart;
  /** Comparison between Draconic and Natal charts */
  comparison: DraconicComparison;
}

export interface HarmonicsResult {
  /** 5th Harmonic - Creativity, talents, and artistic expression */
  h5: HarmonicChart;
  /** 7th Harmonic - Spiritual insights, inspiration, and destiny */
  h7: HarmonicChart;
  /** 9th Harmonic - Completion, mastery, and wholeness */
  h9: HarmonicChart;
  /** Harmonic profile showing strengths across different harmonics */
  profile: HarmonicProfile;
}

export interface SpecializedChartsInput {
  /** Natal chart for calculations */
  natalChart: Chart;
  /** Current age for harmonic profile */
  currentAge: number;
}

/**
 * Calculate Draconic Chart (Soul Chart / 영혼 차트)
 *
 * The Draconic chart is calculated by shifting all planets by the distance of the
 * North Node from 0° Aries. It represents the soul's purpose and karmic mission,
 * showing the eternal and spiritual dimension of the personality.
 *
 * **Key Concepts:**
 * - Reveals soul-level motivations and karmic patterns
 * - Shows what the soul truly desires vs. what the personality desires
 * - Represents the "spiritual blueprint" of the chart
 * - Often feels more authentic than the natal chart to the individual
 *
 * **Interpretation:**
 * - Draconic Sun: Soul's core identity and purpose
 * - Draconic Moon: Soul's emotional needs and nurturing style
 * - Draconic Rising: How the soul naturally expresses itself
 * - Comparison to Natal: Reveals conflicts between ego and soul
 *
 * @param input - Specialized charts calculation input
 * @param enableDebugLogs - Enable detailed logging
 * @returns Draconic chart with comparison to natal chart
 *
 * @example
 * ```typescript
 * const draconic = await calculateDraconicChartAnalysis({
 *   natalChart: myNatalChart,
 *   currentAge: 34
 * });
 *
 * console.log(`Soul Purpose (Draconic Sun): ${draconic.chart.sun.sign}`);
 * console.log(`Natal vs Draconic Sun: ${draconic.comparison.sunComparison}`);
 * ```
 */
export async function calculateDraconicChartAnalysis(
  input: SpecializedChartsInput,
  enableDebugLogs = false
): Promise<DraconicResult> {
  const { natalChart } = input;

  if (enableDebugLogs) {
    logger.debug("[Draconic] Starting calculation");
  }

  try {
    // Calculate Draconic chart
    const draconicChart = calculateDraconicChart(natalChart);

    // Compare Draconic to Natal
    const draconicComparison = compareDraconicToNatal(natalChart);

    if (enableDebugLogs) {
      const draconicSun = draconicChart.planets.find(p => p.name === 'Sun');
      const draconicMoon = draconicChart.planets.find(p => p.name === 'Moon');
      logger.debug("[Draconic] Calculation complete", {
        draconicSun: draconicSun?.sign,
        draconicMoon: draconicMoon?.sign,
        draconicRising: draconicChart.ascendant?.sign,
      });
    }

    return {
      chart: draconicChart,
      comparison: draconicComparison,
    };
  } catch (err) {
    logger.error("[Draconic] Calculation failed", err);
    throw err;
  }
}

/**
 * Calculate Harmonic Charts (하모닉 차트)
 *
 * Harmonic charts multiply all planetary positions by a harmonic number,
 * revealing hidden patterns and potentials in the natal chart. Each harmonic
 * emphasizes different life themes and talents.
 *
 * **Harmonic Numbers and Meanings:**
 *
 * **5th Harmonic (Quintile/Biquintile aspects - 72°/144°):**
 * - Creativity and artistic talent
 * - Problem-solving abilities
 * - Unique skills and gifts
 * - Innovation and originality
 * - Best for: Artists, inventors, creative professionals
 *
 * **7th Harmonic (Septile aspects - 51.43°):**
 * - Spiritual insights and mystical experiences
 * - Inspiration and divine guidance
 * - Fate and destiny
 * - Irrational/non-linear thinking
 * - Best for: Spiritual seekers, mystics, visionaries
 *
 * **9th Harmonic (Novile aspects - 40°):**
 * - Completion and fulfillment
 * - Mastery and expertise
 * - Spiritual completion
 * - Wholeness and integration
 * - Best for: Understanding life purpose and spiritual maturity
 *
 * **Usage Tips:**
 * - Harmonics reveal talents not obvious in the natal chart
 * - Strong harmonic patterns indicate special gifts
 * - Use with natal chart for complete understanding
 * - Different harmonics are relevant at different life stages
 *
 * @param input - Specialized charts calculation input
 * @param enableDebugLogs - Enable detailed logging
 * @returns Harmonic charts (H5, H7, H9) with profile analysis
 *
 * @example
 * ```typescript
 * const harmonics = await calculateHarmonicChartsAnalysis({
 *   natalChart: myNatalChart,
 *   currentAge: 34
 * });
 *
 * // Check creativity (5th harmonic)
 * console.log(`Creative talents: ${harmonics.h5.planets[0].sign}`);
 *
 * // Check spiritual gifts (7th harmonic)
 * console.log(`Spiritual insights: ${harmonics.h7.planets[0].sign}`);
 *
 * // Check mastery (9th harmonic)
 * console.log(`Areas of mastery: ${harmonics.h9.planets[0].sign}`);
 *
 * // Overall harmonic strengths
 * console.log(`Profile: ${harmonics.profile.dominantHarmonics}`);
 * ```
 */
export async function calculateHarmonicChartsAnalysis(
  input: SpecializedChartsInput,
  enableDebugLogs = false
): Promise<HarmonicsResult> {
  const { natalChart, currentAge } = input;

  if (enableDebugLogs) {
    logger.debug("[Harmonics] Starting calculation", { currentAge });
  }

  try {
    // Calculate individual harmonic charts
    const h5 = calculateHarmonicChart(natalChart, 5);
    const h7 = calculateHarmonicChart(natalChart, 7);
    const h9 = calculateHarmonicChart(natalChart, 9);

    // Generate harmonic profile (shows strengths across harmonics)
    const profile = generateHarmonicProfile(natalChart, currentAge);

    if (enableDebugLogs) {
      logger.debug("[Harmonics] Calculation complete", {
        h5Planets: h5.planets?.length || 0,
        h7Planets: h7.planets?.length || 0,
        h9Planets: h9.planets?.length || 0,
        strongestHarmonics: profile.strongestHarmonics?.map(h => h.harmonic),
      });
    }

    return {
      h5,
      h7,
      h9,
      profile,
    };
  } catch (err) {
    logger.error("[Harmonics] Calculation failed", err);
    throw err;
  }
}

/**
 * Calculate all specialized charts (Draconic + Harmonics)
 *
 * This is a convenience function that calculates both Draconic and Harmonic charts
 * in one call. Use this when you need a complete specialized chart analysis.
 *
 * **Combined Interpretation:**
 * - Draconic shows the soul's purpose and karmic patterns
 * - Harmonics reveal hidden talents and potentials
 * - Together, they provide a multi-dimensional view of the chart
 * - Especially useful for spiritual counseling and life purpose analysis
 *
 * @param input - Specialized charts calculation input
 * @param enableDebugLogs - Enable detailed logging
 * @returns Combined Draconic and Harmonics analysis
 *
 * @example
 * ```typescript
 * const specialized = await calculateAllSpecializedCharts({
 *   natalChart: myNatalChart,
 *   currentAge: 34
 * });
 *
 * // Soul purpose
 * console.log(`Soul Sun: ${specialized.draconic.chart.sun.sign}`);
 *
 * // Creative talents
 * console.log(`Creative H5: ${specialized.harmonics.h5.planets[0].sign}`);
 *
 * // Spiritual gifts
 * console.log(`Mystical H7: ${specialized.harmonics.h7.planets[0].sign}`);
 * ```
 */
export async function calculateAllSpecializedCharts(
  input: SpecializedChartsInput,
  enableDebugLogs = false
): Promise<{
  draconic: DraconicResult;
  harmonics: HarmonicsResult;
}> {
  if (enableDebugLogs) {
    logger.debug("[Specialized Charts] Starting all calculations");
  }

  try {
    // Calculate in parallel for better performance
    const [draconic, harmonics] = await Promise.all([
      calculateDraconicChartAnalysis(input, enableDebugLogs),
      calculateHarmonicChartsAnalysis(input, enableDebugLogs),
    ]);

    if (enableDebugLogs) {
      logger.debug("[Specialized Charts] All calculations complete");
    }

    return {
      draconic,
      harmonics,
    };
  } catch (err) {
    logger.error("[Specialized Charts] Calculation failed", err);
    throw err;
  }
}
