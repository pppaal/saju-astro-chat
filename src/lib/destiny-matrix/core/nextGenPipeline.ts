import type { MatrixCalculationInput } from '@/lib/destiny-matrix/types'
import type { DestinyCoreResult } from './runDestinyCore'
import { compileFeatureTokens } from './tokenCompiler'
import { buildActivationEngine } from './activationEngine'
import { buildRuleEngine } from './ruleEngine'
import { buildStateEngine } from './stateEngine'
import { evaluateCoreArchitecture } from './evaluationSuite'
import { buildInputVerdictAudit } from './inputVerdictAudit'
import { normalizeMatrixInput } from './inputNormalization'

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
  const matrixInput = normalizeMatrixInput(input.matrixInput)
  const featureZone = compileFeatureTokens(matrixInput)
  const activation = buildActivationEngine({
    matrixInput,
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
    matrixInput,
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
