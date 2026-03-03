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
}
