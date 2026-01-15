// src/lib/destiny-map/calendar/scoring-factory.ts
/**
 * Generic score calculator factory
 * Eliminates code duplication in scoring functions
 */

import { calculateAdjustedScore } from './scoring-config';

export interface ScorerInput {
  sibsin?: string;
  [key: string]: any;
}

export interface ScorerConfig<T extends ScorerInput> {
  categoryName: string;
  maxScore: number;
  maxRaw: number;

  // Scoring configurations
  sibsinScores?: {
    positive?: Record<string, number>;
    negative?: Record<string, number>;
  };

  sipsinScores?: Record<string, number>;
  branchScores?: Record<string, number>;
  specialScores?: Record<string, number>;
  negativeScores?: Record<string, number>;

  // Property mappings for boolean checks
  booleanPropertyMap: {
    positive?: string[];
    negative?: string[];
    branch?: string[];
    special?: string[];
  };

  // Special conditional logic
  samjaeConfig?: {
    base: number;
    withChung: number;
    withGwiin: number;
  };
}

/**
 * Generic factory function that creates a score calculator
 *
 * @param config - Configuration object with scoring rules
 * @returns Score calculator function
 */
export function createScoreCalculator<T extends ScorerInput>(
  config: ScorerConfig<T>
): (input: T) => number {

  return (input: T): number => {
    const adjustments: number[] = [];

    // Step 1: Process sibsin (for Daeun/Seun/Wolun)
    if (config.sibsinScores && input.sibsin) {
      const sibsinValue = input.sibsin as string;

      // Check positive sibsin scores
      if (config.sibsinScores.positive && sibsinValue in config.sibsinScores.positive) {
        adjustments.push(config.sibsinScores.positive[sibsinValue]);
      }
      // Check negative sibsin scores
      else if (config.sibsinScores.negative && sibsinValue in config.sibsinScores.negative) {
        adjustments.push(config.sibsinScores.negative[sibsinValue]);
      }
    }

    // Step 1b: Process sipsin (for Iljin - different structure)
    if (config.sipsinScores && input.sibsin) {
      const sipsinKey = input.sibsin as string;
      if (sipsinKey in config.sipsinScores) {
        adjustments.push(config.sipsinScores[sipsinKey]);
      }
    }

    // Step 2: Process positive boolean properties
    if (config.booleanPropertyMap.positive) {
      for (const propKey of config.booleanPropertyMap.positive) {
        if (input[propKey]) {
          // Try to find score in sibsinScores.positive or branchScores
          const scoreValue = config.sibsinScores?.positive?.[propKey];
          if (scoreValue !== undefined) {
            adjustments.push(scoreValue);
          }
        }
      }
    }

    // Step 3: Process negative boolean properties
    if (config.booleanPropertyMap.negative) {
      for (const propKey of config.booleanPropertyMap.negative) {
        if (input[propKey]) {
          // Try to find score in sibsinScores.negative (keys have "has" prefix)
          let scoreValue = config.sibsinScores?.negative?.[propKey];

          // If not found, try negativeScores (keys DON'T have "has" prefix)
          if (scoreValue === undefined && config.negativeScores) {
            const scoreKey = propKey.startsWith('has')
              ? propKey.slice(3).charAt(0).toLowerCase() + propKey.slice(4)
              : propKey;
            scoreValue = config.negativeScores[scoreKey];
          }

          if (scoreValue !== undefined) {
            adjustments.push(scoreValue);
          }
        }
      }
    }

    // Step 4: Process branch interaction properties
    if (config.booleanPropertyMap.branch && config.branchScores) {
      for (const propKey of config.booleanPropertyMap.branch) {
        if (input[propKey]) {
          // Strip "has" prefix to match score keys (e.g., hasYukhap -> yukhap)
          const scoreKey = propKey.startsWith('has')
            ? propKey.slice(3).charAt(0).toLowerCase() + propKey.slice(4)
            : propKey;
          const scoreValue = config.branchScores[scoreKey];
          if (scoreValue !== undefined) {
            adjustments.push(scoreValue);
          }
        }
      }
    }

    // Step 5: Process special properties (길일, special days)
    if (config.booleanPropertyMap.special && config.specialScores) {
      for (const propKey of config.booleanPropertyMap.special) {
        if (input[propKey]) {
          // Strip "has" prefix to match score keys (e.g., hasCheoneulGwiin -> cheoneulGwiin)
          const scoreKey = propKey.startsWith('has')
            ? propKey.slice(3).charAt(0).toLowerCase() + propKey.slice(4)
            : propKey;
          const scoreValue = config.specialScores[scoreKey];
          if (scoreValue !== undefined) {
            adjustments.push(scoreValue);
          }
        }
      }
    }

    // Step 6: Handle samjae special case (only for Seun)
    if (config.samjaeConfig && (input as any).isSamjaeYear) {
      if ((input as any).hasGwiin) {
        adjustments.push(config.samjaeConfig.withGwiin);
      } else if ((input as any).hasChung) {
        adjustments.push(config.samjaeConfig.withChung);
      } else {
        adjustments.push(config.samjaeConfig.base);
      }
    }

    // Step 7: Calculate final score
    return calculateAdjustedScore(config.maxScore, adjustments, config.maxRaw);
  };
}
