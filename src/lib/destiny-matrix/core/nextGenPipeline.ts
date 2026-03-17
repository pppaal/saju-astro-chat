import type { MatrixCalculationInput } from '@/lib/destiny-matrix/types'
import type { DestinyCoreResult } from './runDestinyCore'
import { compileFeatureTokens } from './tokenCompiler'
import { buildActivationEngine } from './activationEngine'
import { buildRuleEngine } from './ruleEngine'
import { buildStateEngine } from './stateEngine'
import { evaluateCoreArchitecture } from './evaluationSuite'
import { buildInputVerdictAudit } from './inputVerdictAudit'

export interface NextGenCorePipelineResult {
  featureZone: ReturnType<typeof compileFeatureTokens>
  ruleZone: {
    activation: ReturnType<typeof buildActivationEngine>
    rules: ReturnType<typeof buildRuleEngine>
  }
  scenarioZone: {
    states: ReturnType<typeof buildStateEngine>
  }
  verdictZone: {
    canonicalFocusDomain: DestinyCoreResult['canonical']['focusDomain']
    canonicalPhase: DestinyCoreResult['canonical']['phase']
    canonicalGradeLabel: DestinyCoreResult['canonical']['gradeLabel']
  }
  evaluation: ReturnType<typeof evaluateCoreArchitecture>
  inputAudit: ReturnType<typeof buildInputVerdictAudit>
}

export function buildNextGenCorePipeline(input: {
  matrixInput: MatrixCalculationInput
  core: DestinyCoreResult
}): NextGenCorePipelineResult {
  const featureZone = compileFeatureTokens(input.matrixInput)
  const activation = buildActivationEngine({
    matrixInput: input.matrixInput,
    tokens: featureZone.tokens,
  })
  const rules = buildRuleEngine({ activation, tokens: featureZone.tokens })
  const states = buildStateEngine({
    lang: input.core.normalizedInput.lang || 'ko',
    activation,
    rules,
  })
  const evaluation = evaluateCoreArchitecture({
    features: featureZone,
    activation,
    rules,
    states,
    patterns: input.core.patterns,
    scenarios: input.core.scenarios,
    decisionEngine: input.core.decisionEngine,
    canonical: input.core.canonical,
  })
  const inputAudit = buildInputVerdictAudit({
    matrixInput: input.matrixInput,
    features: featureZone,
    activation,
    rules,
    states,
    patterns: input.core.patterns,
    scenarios: input.core.scenarios,
    decisionEngine: input.core.decisionEngine,
    canonical: input.core.canonical,
  })

  return {
    featureZone,
    ruleZone: {
      activation,
      rules,
    },
    scenarioZone: {
      states,
    },
    verdictZone: {
      canonicalFocusDomain: input.core.canonical.focusDomain,
      canonicalPhase: input.core.canonical.phase,
      canonicalGradeLabel: input.core.canonical.gradeLabel,
    },
    evaluation,
    inputAudit,
  }
}
