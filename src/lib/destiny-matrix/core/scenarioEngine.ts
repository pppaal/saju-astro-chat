import type { SignalDomain } from '@/lib/destiny-matrix/ai-report/signalSynthesizer'
import type { StrategyEngineResult } from '@/lib/destiny-matrix/ai-report/strategyEngine'
import type { MatrixCalculationInputNormalized } from './runDestinyCore'
import type { PatternResult } from './patternEngine'

export type ScenarioWindow = 'now' | '1-3m' | '3-6m' | '6-12m'

export interface ScenarioDefinition {
  id: string
  patternId: string
  domain: SignalDomain
  branch: string
  title: string
  risk: string
  actions: string[]
}

export interface ScenarioResult {
  id: string
  patternId: string
  domain: SignalDomain
  branch: string
  title: string
  probability: number
  confidence: number
  window: ScenarioWindow
  risk: string
  actions: string[]
}

const DOMAIN_SENSITIVITY: Record<SignalDomain, number> = {
  career: 1.08,
  relationship: 1.04,
  wealth: 1.06,
  health: 1.02,
  timing: 1.05,
  personality: 1,
  spirituality: 1,
  move: 1.03,
}

const SCENARIO_DEFINITIONS: ScenarioDefinition[] = [
  {
    id: 'promotion_window',
    patternId: 'career_expansion',
    domain: 'career',
    branch: 'promotion',
    title: 'Promotion branch',
    risk: 'Role scope must be defined before yes.',
    actions: ['Clarify role scope', 'Lock deliverables', 'Verify reporting lines'],
  },
  {
    id: 'job_change_window',
    patternId: 'career_expansion',
    domain: 'career',
    branch: 'job_change',
    title: 'Job-change branch',
    risk: 'Fast exit without runway can cut leverage.',
    actions: ['Map offer quality', 'Check runway', 'Stage the handoff'],
  },
  {
    id: 'launch_project_window',
    patternId: 'career_expansion',
    domain: 'career',
    branch: 'project_launch',
    title: 'Project-launch branch',
    risk: 'Launching without owner clarity increases rework.',
    actions: ['Fix owner map', 'Set scope', 'Publish first milestone'],
  },
  {
    id: 'role_redefinition_window',
    patternId: 'career_reset_rebuild',
    domain: 'career',
    branch: 'role_reset',
    title: 'Role-reset branch',
    risk: 'Reset without thesis becomes drift.',
    actions: ['Write role thesis', 'List non-negotiables', 'Remove one legacy load'],
  },
  {
    id: 'internal_reset_window',
    patternId: 'career_reset_rebuild',
    domain: 'career',
    branch: 'internal_reset',
    title: 'Internal reset branch',
    risk: 'Silent frustration can harden into disengagement.',
    actions: ['Escalate with facts', 'Redraw scope', 'Request milestone review'],
  },
  {
    id: 'exit_preparation_window',
    patternId: 'career_reset_rebuild',
    domain: 'career',
    branch: 'exit_preparation',
    title: 'Exit-prep branch',
    risk: 'Leaving too early can weaken timing quality.',
    actions: ['Build runway', 'Audit options', 'Prepare portfolio evidence'],
  },
  {
    id: 'new_connection_window',
    patternId: 'relationship_activation',
    domain: 'relationship',
    branch: 'new_connection',
    title: 'New-connection branch',
    risk: 'Pacing matters more than intensity.',
    actions: ['Open one new channel', 'Respond clearly', 'Do not overcommit'],
  },
  {
    id: 'bond_deepening_window',
    patternId: 'relationship_activation',
    domain: 'relationship',
    branch: 'bond_deepening',
    title: 'Bond-deepening branch',
    risk: 'Assumed alignment can create drift.',
    actions: ['Name expectations', 'Define next step', 'Repeat key understanding'],
  },
  {
    id: 'reconciliation_window',
    patternId: 'relationship_activation',
    domain: 'relationship',
    branch: 'reconciliation',
    title: 'Reconciliation branch',
    risk: 'Repair fails if the old trigger is unnamed.',
    actions: ['Name the trigger', 'Set one boundary', 'Choose one repair action'],
  },
  {
    id: 'boundary_reset_window',
    patternId: 'relationship_tension',
    domain: 'relationship',
    branch: 'boundary_reset',
    title: 'Boundary-reset branch',
    risk: 'Blurred boundaries will recycle the same problem.',
    actions: ['State limits', 'Shorten response loop', 'Keep record of agreements'],
  },
  {
    id: 'clarify_expectations_window',
    patternId: 'relationship_tension',
    domain: 'relationship',
    branch: 'clarify_expectations',
    title: 'Expectation-clarity branch',
    risk: 'Mixed messages increase cost later.',
    actions: ['Ask one explicit question', 'Summarize in writing', 'Delay final commitment'],
  },
  {
    id: 'distance_tuning_window',
    patternId: 'relationship_tension',
    domain: 'relationship',
    branch: 'distance_tuning',
    title: 'Distance-tuning branch',
    risk: 'Overexposure can intensify conflict.',
    actions: ['Reduce contact frequency', 'Move to calmer channel', 'Review after 24h'],
  },
  {
    id: 'cashflow_swing_window',
    patternId: 'wealth_volatility',
    domain: 'wealth',
    branch: 'cashflow_swing',
    title: 'Cashflow-swing branch',
    risk: 'Short-term optimism can hide downside.',
    actions: ['Update cashflow', 'Cap downside', 'Delay nonessential spend'],
  },
  {
    id: 'high_risk_offer_window',
    patternId: 'wealth_volatility',
    domain: 'wealth',
    branch: 'high_risk_offer',
    title: 'High-risk-offer branch',
    risk: 'Promise-heavy offers need hard verification.',
    actions: ['Verify counterparty', 'Check terms', 'Use a waiting window'],
  },
  {
    id: 'expense_control_window',
    patternId: 'wealth_volatility',
    domain: 'wealth',
    branch: 'expense_control',
    title: 'Expense-control branch',
    risk: 'Leakage compounds fast under volatility.',
    actions: ['Freeze one category', 'Review subscriptions', 'Set a hard cap'],
  },
  {
    id: 'income_growth_window',
    patternId: 'wealth_accumulation',
    domain: 'wealth',
    branch: 'income_growth',
    title: 'Income-growth branch',
    risk: 'Too many channels can dilute quality.',
    actions: ['Pick one revenue lane', 'Tighten margin', 'Track conversion'],
  },
  {
    id: 'asset_build_window',
    patternId: 'wealth_accumulation',
    domain: 'wealth',
    branch: 'asset_build',
    title: 'Asset-build branch',
    risk: 'Compounding fails when rules are loose.',
    actions: ['Set contribution rule', 'Automate a transfer', 'Review monthly'],
  },
  {
    id: 'side_income_window',
    patternId: 'wealth_accumulation',
    domain: 'wealth',
    branch: 'side_income',
    title: 'Side-income branch',
    risk: 'New income without process can drain energy.',
    actions: ['Pilot one offer', 'Limit weekly hours', 'Measure retention'],
  },
]

function buildFallbackDefinitions(pattern: PatternResult): ScenarioDefinition[] {
  const domain = pattern.domains[0] || 'personality'
  return [
    {
      id: `${pattern.id}_main_window`,
      patternId: pattern.id,
      domain,
      branch: 'main',
      title: `${pattern.label} main branch`,
      risk: pattern.risk,
      actions: ['Pick one focus', 'Write one verification rule', 'Review after one cycle'],
    },
    {
      id: `${pattern.id}_alt_window`,
      patternId: pattern.id,
      domain,
      branch: 'alt',
      title: `${pattern.label} alternate branch`,
      risk: `Alternate path: ${pattern.risk}`,
      actions: ['Reduce scope', 'Keep optionality', 'Collect one more signal'],
    },
    {
      id: `${pattern.id}_defensive_window`,
      patternId: pattern.id,
      domain,
      branch: 'defensive',
      title: `${pattern.label} defensive branch`,
      risk: 'Use a slower sequence if evidence weakens.',
      actions: ['Pause final commitment', 'Draft before commit', 'Re-check constraints'],
    },
  ]
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function resolveWindow(
  input: MatrixCalculationInputNormalized,
  pattern: PatternResult
): ScenarioWindow {
  if (input.activeTransits.length > 0 && input.currentSaeunElement) return 'now'
  if (pattern.score >= 75 && input.currentDaeunElement) return '1-3m'
  if (pattern.score >= 60) return '3-6m'
  return '6-12m'
}

export function buildScenarioEngine(
  patterns: PatternResult[],
  strategyEngine: StrategyEngineResult,
  normalizedInput: MatrixCalculationInputNormalized
): ScenarioResult[] {
  const maxPatternCount = (() => {
    const raw = Number(process.env.DESTINY_SCENARIO_PATTERN_LIMIT || 24)
    if (!Number.isFinite(raw) || raw <= 0) return 24
    return Math.max(12, Math.min(120, Math.floor(raw)))
  })()
  const timingWeight =
    1 +
    (normalizedInput.currentDaeunElement ? 0.08 : 0) +
    (normalizedInput.currentSaeunElement ? 0.05 : 0) +
    (normalizedInput.activeTransits.length > 0 ? 0.06 : 0)

  return patterns
    .filter((pattern) => pattern.score >= 42)
    .slice(0, maxPatternCount)
    .flatMap((pattern) => {
      const definitions = SCENARIO_DEFINITIONS.filter((item) => item.patternId === pattern.id)
      const resolvedDefinitions =
        definitions.length > 0 ? definitions : buildFallbackDefinitions(pattern)
      const leadDomain = pattern.domains[0] || 'personality'
      const domainStrategy = strategyEngine.domainStrategies.find(
        (item) => item.domain === leadDomain
      )
      const executionWeight =
        ((domainStrategy?.attackPercent || strategyEngine.attackPercent) / 100) * 0.35 + 0.65
      const sensitivity = DOMAIN_SENSITIVITY[leadDomain] || 1
      return resolvedDefinitions.map((definition) => {
        const probability = clamp(
          Math.round(pattern.score * timingWeight * executionWeight * sensitivity),
          1,
          95
        )
        const confidence = clamp(
          Number((pattern.confidence * 0.7 + (probability / 100) * 0.3).toFixed(2)),
          0.1,
          0.98
        )
        return {
          id: definition.id,
          patternId: pattern.id,
          domain: definition.domain,
          branch: definition.branch,
          title: definition.title,
          probability,
          confidence,
          window: resolveWindow(normalizedInput, pattern),
          risk: definition.risk,
          actions: definition.actions,
        } satisfies ScenarioResult
      })
    })
    .sort((a, b) => b.probability - a.probability || b.confidence - a.confidence)
}
