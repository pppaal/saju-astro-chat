export interface StrategyDomainWeightConfig {
  strengthWeight: number
  cautionWeight: number
  balanceWeight: number
  volatilityWeight: number
}

export interface StrategyEngineTuning {
  timeActivation: {
    daeunMultiplier: number
    seunMultiplier: number
    transitMultiplier: number
  }
  domainWeights: {
    default: StrategyDomainWeightConfig
    career: StrategyDomainWeightConfig
    relationship: StrategyDomainWeightConfig
    health: StrategyDomainWeightConfig
  }
  phaseRules: {
    highTensionExpansion: {
      minStrength: number
      minCaution: number
    }
    expansion: {
      minStrength: number
      maxCaution: number
    }
    expansionGuarded: {
      minStrength: number
      minCaution: number
    }
    defensiveReset: {
      minCaution: number
      maxStrength: number
    }
    lowMomentumReset: {
      maxStrength: number
      minVolatility: number
    }
    stabilize: {
      minBalance: number
      minCaution: number
    }
  }
  attackFormula: {
    base: number
    momentumCoeff: number
    volatilityCoeff: number
    balanceCoeff: number
    min: number
    max: number
    expansionMin: number
    highTensionRange: { min: number; max: number }
    expansionGuardedRange: { min: number; max: number }
    stabilizeRange: { min: number; max: number }
    defensiveResetMax: number
  }
  vectorFormula: {
    expansionBase: number
    expansionFromStrength: number
    expansionFromBalance: number
    expansionFromCaution: number
    volatilityBase: number
    volatilityFromCaution: number
    volatilityFromImbalance: number
    volatilityFromBalance: number
    structureBase: number
    structureFromBalance: number
    structureFromCaution: number
    structureFromStrength: number
  }
  vectorPhaseRules: {
    highTension: {
      minExpansion: number
      minVolatility: number
    }
    defensiveReset: {
      maxExpansion: number
      minVolatility: number
    }
    expansion: {
      minExpansion: number
      maxVolatility: number
    }
    expansionGuarded: {
      minExpansion: number
      maxVolatility: number
    }
    stabilize: {
      minStructure: number
      maxVolatility: number
    }
  }
}

export const STRATEGY_ENGINE_TUNING: StrategyEngineTuning = {
  timeActivation: {
    daeunMultiplier: 1.2,
    seunMultiplier: 1.1,
    transitMultiplier: 1.15,
  },
  domainWeights: {
    default: {
      strengthWeight: 1,
      cautionWeight: 1,
      balanceWeight: 1,
      volatilityWeight: 1,
    },
    career: {
      strengthWeight: 1.2,
      cautionWeight: 1,
      balanceWeight: 1,
      volatilityWeight: 1,
    },
    relationship: {
      strengthWeight: 1,
      cautionWeight: 1,
      balanceWeight: 1,
      volatilityWeight: 1.3,
    },
    health: {
      strengthWeight: 1,
      cautionWeight: 1.2,
      balanceWeight: 1,
      volatilityWeight: 1,
    },
  },
  phaseRules: {
    highTensionExpansion: {
      minStrength: 8,
      minCaution: 6,
    },
    expansion: {
      minStrength: 8,
      maxCaution: 3,
    },
    expansionGuarded: {
      minStrength: 6,
      minCaution: 5,
    },
    defensiveReset: {
      minCaution: 7,
      maxStrength: 4,
    },
    lowMomentumReset: {
      maxStrength: 4,
      minVolatility: 1.1,
    },
    stabilize: {
      minBalance: 6,
      minCaution: 5,
    },
  },
  attackFormula: {
    base: 52,
    momentumCoeff: 5,
    volatilityCoeff: 10,
    balanceCoeff: 1.4,
    min: 20,
    max: 80,
    expansionMin: 65,
    highTensionRange: { min: 52, max: 66 },
    expansionGuardedRange: { min: 55, max: 72 },
    stabilizeRange: { min: 45, max: 58 },
    defensiveResetMax: 40,
  },
  vectorFormula: {
    expansionBase: 20,
    expansionFromStrength: 1.9,
    expansionFromBalance: 0.8,
    expansionFromCaution: 0.9,
    volatilityBase: 12,
    volatilityFromCaution: 2.1,
    volatilityFromImbalance: 16,
    volatilityFromBalance: 0.6,
    structureBase: 18,
    structureFromBalance: 2.4,
    structureFromCaution: 0.8,
    structureFromStrength: 0.5,
  },
  vectorPhaseRules: {
    highTension: {
      minExpansion: 58,
      minVolatility: 55,
    },
    defensiveReset: {
      maxExpansion: 36,
      minVolatility: 62,
    },
    expansion: {
      minExpansion: 62,
      maxVolatility: 38,
    },
    expansionGuarded: {
      minExpansion: 45,
      maxVolatility: 55,
    },
    stabilize: {
      minStructure: 48,
      maxVolatility: 50,
    },
  },
}
