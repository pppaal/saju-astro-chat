/**
 * Asteroids and Fixed Stars Calculations for Destiny Map
 * 소행성 및 항성 계산
 */

import {
  calculateAllAsteroids,
  findAllAsteroidAspects,
  findFixedStarConjunctions,
  findEclipseImpact,
  getUpcomingEclipses,
  type Chart,
  type Asteroid,
  type FixedStarConjunction,
  type Eclipse,
  type EclipseImpact,
  type PlanetData,
} from "@/lib/astrology";
import { logger } from "@/lib/logger";

export interface AsteroidsResult {
  /** Ceres - nurturing, motherhood, food, agriculture */
  ceres?: Asteroid;
  /** Pallas - wisdom, strategy, creative intelligence */
  pallas?: Asteroid;
  /** Juno - partnership, marriage, commitment */
  juno?: Asteroid;
  /** Vesta - devotion, focus, sacred sexuality */
  vesta?: Asteroid;
  /** Aspects between asteroids and natal planets */
  aspects?: ReturnType<typeof findAllAsteroidAspects>;
}

export interface EclipsesResult {
  /** Impact of recent eclipses on natal chart */
  impact: EclipseImpact | null;
  /** Upcoming eclipses in the next year */
  upcoming: Eclipse[];
}

export interface AsteroidsStarsInput {
  /** Natal chart for calculations */
  natalChart: Chart;
  /** Julian Day (UT) for asteroid calculations */
  jdUT: number;
  /** House cusps in degrees */
  houseCusps: number[];
  /** Natal planets for aspect calculations */
  natalPlanets: PlanetData[];
  /** Number of upcoming eclipses to retrieve (default: 5) */
  upcomingEclipsesCount?: number;
}

/**
 * Calculate asteroid positions and aspects
 *
 * The four main asteroids (Ceres, Pallas, Juno, Vesta) add nuance to chart interpretation,
 * filling in details that the traditional planets don't address. They were discovered in
 * the early 1800s and have been used in astrology since the 1970s.
 *
 * **Asteroid Meanings:**
 *
 * **Ceres (goddess of agriculture and motherhood):**
 * - Nurturing style and needs
 * - Relationship with food and nourishment
 * - Motherhood and parenting
 * - How we care for others and ourselves
 * - Grief and loss (Ceres lost her daughter Persephone)
 * - House: Shows where we nurture
 * - Sign: Shows how we nurture
 *
 * **Pallas Athena (goddess of wisdom and warfare):**
 * - Creative intelligence and problem-solving
 * - Strategy and pattern recognition
 * - Healing and holistic understanding
 * - Political savvy and diplomacy
 * - Father-daughter relationships
 * - House: Where we apply wisdom
 * - Sign: How we strategize
 *
 * **Juno (goddess of marriage):**
 * - Partnership and marriage dynamics
 * - What we need from relationships
 * - Commitment and loyalty issues
 * - Jealousy and possessiveness
 * - Power dynamics in partnerships
 * - House: Where we seek commitment
 * - Sign: What we need in partnership
 *
 * **Vesta (goddess of hearth and home):**
 * - Devotion and dedication
 * - Where we focus our energy
 * - Sacred sexuality and celibacy
 * - Service and work ethic
 * - What we hold sacred
 * - House: Where we dedicate ourselves
 * - Sign: How we serve
 *
 * **Interpretation Tips:**
 * - Asteroids are most significant by house and sign
 * - Aspects to personal planets (Sun, Moon, Mercury, Venus, Mars) are strongest
 * - Conjunctions and oppositions are most powerful
 * - Use asteroids to add detail, not replace major planets
 *
 * @param input - Asteroids calculation input
 * @param enableDebugLogs - Enable detailed logging
 * @returns Asteroid positions and aspects to natal planets
 *
 * @example
 * ```typescript
 * const asteroids = await calculateAsteroidsAnalysis({
 *   natalChart: myChart,
 *   jdUT: 2451545.0,
 *   houseCusps: cusps,
 *   natalPlanets: planets
 * });
 *
 * // Nurturing style
 * console.log(`Ceres in ${asteroids.ceres?.sign} - nurturing through ${asteroids.ceres?.house}th house`);
 *
 * // Partnership needs
 * console.log(`Juno in ${asteroids.juno?.sign} - needs ${asteroids.juno?.house}th house themes in relationships`);
 *
 * // Check aspects
 * asteroids.aspects?.forEach(aspect => {
 *   console.log(`${aspect.asteroid} ${aspect.aspectType} ${aspect.planet}`);
 * });
 * ```
 */
export async function calculateAsteroidsAnalysis(
  input: AsteroidsStarsInput,
  enableDebugLogs = false
): Promise<AsteroidsResult | undefined> {
  const { jdUT, houseCusps, natalPlanets } = input;

  if (!jdUT) {
    if (enableDebugLogs) {
      logger.debug("[Asteroids] Skipped - no jdUT provided");
    }
    return undefined;
  }

  if (enableDebugLogs) {
    logger.debug("[Asteroids] Starting calculation");
  }

  try {
    // Calculate all asteroid positions
    const allAsteroids = calculateAllAsteroids(jdUT, houseCusps);

    // Find aspects between asteroids and natal planets
    // Cast to PlanetBase[] since PlanetData extends with compatible sign type
    const asteroidAspects = findAllAsteroidAspects(allAsteroids, natalPlanets as unknown as import('@/lib/astrology').PlanetBase[]);

    if (enableDebugLogs) {
      const totalAspects = Object.values(asteroidAspects || {}).reduce((sum, arr) => sum + arr.length, 0);
      logger.debug("[Asteroids] Calculation complete", {
        ceresSign: allAsteroids.Ceres?.sign,
        pallasSign: allAsteroids.Pallas?.sign,
        junoSign: allAsteroids.Juno?.sign,
        vestaSign: allAsteroids.Vesta?.sign,
        aspectsFound: totalAspects,
      });
    }

    return {
      ceres: allAsteroids.Ceres,
      pallas: allAsteroids.Pallas,
      juno: allAsteroids.Juno,
      vesta: allAsteroids.Vesta,
      aspects: asteroidAspects,
    };
  } catch (err) {
    logger.error("[Asteroids] Calculation failed", err);
    if (enableDebugLogs) {
      logger.debug("[Asteroids] Returning undefined due to error");
    }
    return undefined;
  }
}

/**
 * Find Fixed Star conjunctions with natal planets
 *
 * Fixed stars are actual stars (not planets) whose positions are essentially
 * fixed relative to Earth. They have been used in astrology for thousands of years
 * and are considered to add powerful, fated influences to charts.
 *
 * **Key Fixed Stars:**
 * - **Regulus** (Leo): Royal star of kings, leadership, success, arrogance
 * - **Spica** (Virgo): Gifts, artistic talent, protection, success
 * - **Algol** (Taurus): The "demon star", passion, transformation, danger
 * - **Antares** (Sagittarius): Warrior star, courage, obstinacy, honor
 * - **Aldebaran** (Gemini): Royal star, integrity, eloquence, courage
 * - **Fomalhaut** (Pisces): Royal star, idealism, vision, magic
 *
 * **Usage Notes:**
 * - Only conjunctions (within 1-2°) are traditionally used
 * - Fixed stars influence for life, not just temporarily
 * - Most significant when conjunct Sun, Moon, Ascendant, or MC
 * - Can indicate fame, talent, or challenging life themes
 * - Interpretation depends on the specific star's nature
 *
 * @param input - Fixed stars calculation input
 * @param enableDebugLogs - Enable detailed logging
 * @returns Array of fixed star conjunctions with natal points
 *
 * @example
 * ```typescript
 * const fixedStars = await findFixedStarsAnalysis({
 *   natalChart: myChart,
 *   jdUT: 2451545.0,
 *   houseCusps: cusps,
 *   natalPlanets: planets
 * });
 *
 * fixedStars?.forEach(star => {
 *   console.log(`${star.starName} conjunct ${star.planetName} - ${star.interpretation}`);
 * });
 * ```
 */
export async function findFixedStarsAnalysis(
  input: AsteroidsStarsInput,
  enableDebugLogs = false
): Promise<FixedStarConjunction[]> {
  const { natalChart } = input;

  if (enableDebugLogs) {
    logger.debug("[Fixed Stars] Starting search");
  }

  try {
    const fixedStars = findFixedStarConjunctions(natalChart);

    if (enableDebugLogs) {
      logger.debug("[Fixed Stars] Search complete", {
        starsFound: fixedStars.length,
        stars: fixedStars.map((s) => s.star.name),
      });
    }

    return fixedStars;
  } catch (err) {
    logger.error("[Fixed Stars] Search failed", err);
    return [];
  }
}

/**
 * Analyze eclipse impacts on natal chart
 *
 * Eclipses are powerful astrological events that mark major turning points and
 * life changes. When an eclipse falls near a natal planet or angle, it can trigger
 * significant events for up to 6 months after the eclipse.
 *
 * **Eclipse Types:**
 * - **Solar Eclipse (New Moon)**: New beginnings, fresh starts, forward momentum
 * - **Lunar Eclipse (Full Moon)**: Endings, culminations, revelations, emotional releases
 *
 * **Impact by Point:**
 * - **Sun**: Identity changes, life direction shifts, recognition
 * - **Moon**: Emotional changes, home/family shifts, inner work
 * - **Ascendant**: Physical changes, new image, life path shifts
 * - **MC**: Career changes, public role shifts, reputation events
 * - **Personal Planets**: Changes in the area ruled by that planet
 *
 * **Orbs:**
 * - Tight conjunction (0-2°): Very powerful, life-changing events
 * - Wide conjunction (2-5°): Noticeable effects, important changes
 * - Opposition (within 5°): Relationships, external events
 *
 * **Timing:**
 * - Eclipse effects can manifest from 1 month before to 6 months after
 * - Exact timing often coincides with subsequent New/Full Moons
 * - Eclipses in same sign/degree can reactivate earlier eclipse themes
 *
 * @param input - Eclipse analysis input
 * @param enableDebugLogs - Enable detailed logging
 * @returns Eclipse impact analysis and upcoming eclipses
 *
 * @example
 * ```typescript
 * const eclipses = await analyzeEclipsesImpact({
 *   natalChart: myChart,
 *   jdUT: 2451545.0,
 *   houseCusps: cusps,
 *   natalPlanets: planets,
 *   upcomingEclipsesCount: 5
 * });
 *
 * if (eclipses.impact) {
 *   console.log(`Eclipse ${eclipses.impact.eclipseType} near ${eclipses.impact.affectedPoint}`);
 *   console.log(`Orb: ${eclipses.impact.orb}° - ${eclipses.impact.interpretation}`);
 * }
 *
 * eclipses.upcoming.forEach(eclipse => {
 *   console.log(`${eclipse.type} on ${eclipse.date} at ${eclipse.sign} ${eclipse.degree}°`);
 * });
 * ```
 */
export async function analyzeEclipsesImpact(
  input: AsteroidsStarsInput,
  enableDebugLogs = false
): Promise<EclipsesResult> {
  const { natalChart, upcomingEclipsesCount = 5 } = input;

  if (enableDebugLogs) {
    logger.debug("[Eclipses] Starting analysis");
  }

  try {
    // Find impact of recent eclipses on natal chart
    const eclipseImpacts = findEclipseImpact(natalChart);
    const firstImpact = eclipseImpacts.length > 0 ? eclipseImpacts[0] : null;

    // Get upcoming eclipses
    const upcomingEclipses = getUpcomingEclipses(new Date(), upcomingEclipsesCount);

    if (enableDebugLogs) {
      logger.debug("[Eclipses] Analysis complete", {
        hasImpact: !!firstImpact,
        upcomingCount: upcomingEclipses.length,
      });
    }

    return {
      impact: firstImpact,
      upcoming: upcomingEclipses,
    };
  } catch (err) {
    logger.error("[Eclipses] Analysis failed", err);
    return {
      impact: null,
      upcoming: [],
    };
  }
}

/**
 * Calculate all asteroids, fixed stars, and eclipse analysis
 *
 * This is a comprehensive function that performs all asteroid and fixed star
 * calculations in one call. Use this for complete analysis of these deeper
 * chart layers.
 *
 * **Combined Interpretation:**
 * - Asteroids add psychological detail and nuance
 * - Fixed stars indicate fated themes and talents
 * - Eclipses show timing of major life changes
 * - Together, they reveal hidden potentials and life themes
 *
 * @param input - Complete asteroids/stars analysis input
 * @param enableDebugLogs - Enable detailed logging
 * @returns Complete asteroids, fixed stars, and eclipse analysis
 *
 * @example
 * ```typescript
 * const analysis = await calculateAllAsteroidsStars({
 *   natalChart: myChart,
 *   jdUT: 2451545.0,
 *   houseCusps: cusps,
 *   natalPlanets: planets,
 *   upcomingEclipsesCount: 5
 * });
 *
 * // Asteroids
 * console.log(`Ceres: ${analysis.asteroids?.ceres?.sign}`);
 *
 * // Fixed Stars
 * console.log(`Stars: ${analysis.fixedStars.length} conjunctions`);
 *
 * // Eclipses
 * console.log(`Eclipse impact: ${analysis.eclipses.impact?.interpretation || 'none'}`);
 * ```
 */
export async function calculateAllAsteroidsStars(
  input: AsteroidsStarsInput,
  enableDebugLogs = false
): Promise<{
  asteroids?: AsteroidsResult;
  fixedStars: FixedStarConjunction[];
  eclipses: EclipsesResult;
}> {
  if (enableDebugLogs) {
    logger.debug("[Asteroids & Stars] Starting all calculations");
  }

  try {
    // Calculate all in parallel for better performance
    const [asteroids, fixedStars, eclipses] = await Promise.all([
      calculateAsteroidsAnalysis(input, enableDebugLogs),
      findFixedStarsAnalysis(input, enableDebugLogs),
      analyzeEclipsesImpact(input, enableDebugLogs),
    ]);

    if (enableDebugLogs) {
      logger.debug("[Asteroids & Stars] All calculations complete", {
        hasAsteroids: !!asteroids,
        fixedStarsCount: fixedStars.length,
        hasEclipseImpact: !!eclipses.impact,
      });
    }

    return {
      asteroids,
      fixedStars,
      eclipses,
    };
  } catch (err) {
    logger.error("[Asteroids & Stars] Calculation failed", err);
    throw err;
  }
}
