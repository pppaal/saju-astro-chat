/**
 * Advanced Points Calculations for Destiny Map
 * 고급 포인트 계산 (Chiron, Lilith, Part of Fortune, Vertex)
 */

import {
  calculateChiron,
  calculateLilith,
  calculatePartOfFortune,
  calculateVertex,
  type ExtraPoint,
} from "@/lib/astrology";
import { logger } from "@/lib/logger";

export interface AdvancedPointsInput {
  /** Julian Day (UT) - for Chiron calculation */
  jdUT: number;
  /** House cusps in degrees */
  houseCusps: number[];
  /** Ascendant longitude in degrees */
  ascendantLongitude: number;
  /** Sun longitude in degrees */
  sunLongitude: number;
  /** Moon longitude in degrees */
  moonLongitude: number;
  /** Whether the chart is a night chart (Sun below horizon) */
  isNightChart: boolean;
  /** Birth latitude (for Vertex calculation) */
  latitude: number;
  /** Birth longitude (for Vertex calculation) */
  longitude: number;
}

export interface AdvancedPointsResult {
  /** Chiron - the wounded healer */
  chiron?: ExtraPoint;
  /** Lilith (Black Moon Lilith) - the shadow self */
  lilith?: ExtraPoint;
  /** Part of Fortune - luck and prosperity point */
  partOfFortune?: ExtraPoint;
  /** Vertex - fated encounters point */
  vertex?: ExtraPoint;
}

/**
 * Calculate all advanced astrological points
 *
 * This function computes four special points in the natal chart:
 * 1. **Chiron**: The wounded healer, representing deep wounds and healing potential
 * 2. **Lilith**: The Black Moon Lilith, representing shadow self and repressed desires
 * 3. **Part of Fortune**: Traditional Arabic part indicating areas of luck and prosperity
 * 4. **Vertex**: A sensitive point on the western horizon, indicating fated encounters
 *
 * @param input - Advanced points calculation input parameters
 * @param enableDebugLogs - Enable detailed logging (default: false)
 * @returns Object containing all calculated advanced points
 *
 * @example
 * ```typescript
 * const points = await calculateAdvancedPoints({
 *   jdUT: 2451545.0,
 *   houseCusps: [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330],
 *   ascendantLongitude: 15.5,
 *   sunLongitude: 120.0,
 *   moonLongitude: 240.0,
 *   isNightChart: false,
 *   latitude: 37.5665,
 *   longitude: 126.9780
 * });
 *
 * console.log(`Part of Fortune in ${points.partOfFortune?.sign}`);
 * ```
 */
export async function calculateAdvancedPoints(
  input: AdvancedPointsInput,
  enableDebugLogs = false
): Promise<AdvancedPointsResult> {
  const {
    jdUT,
    houseCusps,
    ascendantLongitude,
    sunLongitude,
    moonLongitude,
    isNightChart,
    latitude,
    longitude,
  } = input;

  if (enableDebugLogs) {
    logger.debug("[Advanced Points] Starting calculation", {
      isNightChart,
      sunLon: sunLongitude.toFixed(2),
      moonLon: moonLongitude.toFixed(2),
      ascLon: ascendantLongitude.toFixed(2),
    });
  }

  const result: AdvancedPointsResult = {};

  try {
    // Calculate Chiron (minor planet, the wounded healer)
    // Chiron represents deep wounds and the ability to heal others
    result.chiron = calculateChiron(jdUT, houseCusps);

    if (enableDebugLogs && result.chiron) {
      logger.debug("[Advanced Points] Chiron calculated", {
        sign: result.chiron.sign,
        house: result.chiron.house,
      });
    }
  } catch (err) {
    if (enableDebugLogs) {
      logger.debug("[Advanced Points] Chiron calculation failed", err);
    }
  }

  try {
    // Calculate Lilith (Black Moon Lilith - lunar apogee)
    // Represents the shadow self, repressed desires, and dark feminine energy
    result.lilith = calculateLilith(jdUT, houseCusps);

    if (enableDebugLogs && result.lilith) {
      logger.debug("[Advanced Points] Lilith calculated", {
        sign: result.lilith.sign,
        house: result.lilith.house,
      });
    }
  } catch (err) {
    if (enableDebugLogs) {
      logger.debug("[Advanced Points] Lilith calculation failed", err);
    }
  }

  try {
    // Calculate Part of Fortune (traditional Arabic part)
    // Formula (day chart): ASC + Moon - Sun
    // Formula (night chart): ASC + Sun - Moon
    // Represents areas of luck, prosperity, and material success
    result.partOfFortune = calculatePartOfFortune(
      ascendantLongitude,
      sunLongitude,
      moonLongitude,
      isNightChart,
      houseCusps
    );

    if (enableDebugLogs && result.partOfFortune) {
      logger.debug("[Advanced Points] Part of Fortune calculated", {
        sign: result.partOfFortune.sign,
        house: result.partOfFortune.house,
        chartType: isNightChart ? "night" : "day",
      });
    }
  } catch (err) {
    if (enableDebugLogs) {
      logger.debug("[Advanced Points] Part of Fortune calculation failed", err);
    }
  }

  try {
    // Calculate Vertex (sensitive point on western horizon)
    // The Vertex is considered a "fated encounters" point
    // Represents people and events that feel destined or karmic
    result.vertex = calculateVertex(jdUT, latitude, longitude, houseCusps);

    if (enableDebugLogs && result.vertex) {
      logger.debug("[Advanced Points] Vertex calculated", {
        sign: result.vertex.sign,
        house: result.vertex.house,
      });
    }
  } catch (err) {
    if (enableDebugLogs) {
      logger.debug("[Advanced Points] Vertex calculation failed", err);
    }
  }

  if (enableDebugLogs) {
    const calculated = Object.entries(result)
      .filter(([, value]) => value !== undefined)
      .map(([key]) => key);
    logger.debug("[Advanced Points] Calculation complete", {
      calculated: calculated.length > 0 ? calculated : "none",
    });
  }

  return result;
}
