import { recordCounter } from '@/lib/metrics'
import type { PatternResult } from '@/lib/destiny-matrix/core/patternEngine'
import { buildDeterministicCore } from './deterministicCore'
import { buildUnifiedEnvelope } from './unifiedReport'
import type { SectionEvidenceRefs } from './evidenceRefs'
import type { TopMatchedPattern } from './types'
import type { ReportCoreViewModel } from './reportCoreHelpers'
import type { AIPremiumReport, AIUserPlan } from './reportTypes'
import {
  buildReportQualityMetrics as buildReportQualityMetricsCore,
  recordReportQualityMetrics as recordReportQualityMetricsCore,
  type ReportQualityContext,
  type ReportQualityMetrics,
} from './reportQuality'
import { validateEvidenceBinding } from './rewriteGuards'
import {
  hasEvidenceSupport,
  MIN_EVIDENCE_REFS_PER_SECTION as MIN_EVIDENCE_REFS_PER_SECTION_EXTERNAL,
} from './reportEvidenceSupport'
import { sanitizeUserFacingNarrative } from './reportNarrativeSanitizer'
import { applyReportBrandVoice, buildReportStyleMetrics } from './reportBrandVoice'
import { getMaxRepairPassesByPlan } from './repairPrompts'
import { getReportDomainLabel, localizeReportNarrativeText } from './reportTextHelpers'

const RECHECK_REGEX = /verify|recheck|double-check|checklist|review|confirm/i
const ABSOLUTE_RISK_REGEX = /100%|always|never|guaranteed|certainly|inevitable/i
const IRREVERSIBLE_ACTION_REGEX =
  /sign|finalize|commit now|book|wedding|invitation|big decision|launch|submit payment/i
const CAUTION_INDICATOR_REGEX = /caution|risk|warning|recheck|conflict|overreach|fragile/i
const IMMEDIATE_FORCE_REGEX = /today\s*finalize|sign now|commit now|immediately|rush|right away/i
const MITIGATION_REGEX = /avoid|before|recheck|verify|defer|hold|slow down|stage/i
const RECOMMENDATION_TONE_REGEX = /recommended|recommend|should|must|do this|proceed|best move/i

function isCostOptimizedAiPath(): boolean {
  const explicit = process.env.AI_BACKEND_COST_OPTIMIZED?.trim().toLowerCase()
  if (explicit) return explicit === 'true' || explicit === '1' || explicit === 'yes'
  const provider = process.env.AI_BACKEND_PROVIDER?.trim().toLowerCase()
  return provider === 'claude' || provider === 'anthropic'
}

function getAiQualityTier(stage: 'base' | 'repair'): 'fast' | 'quality' {
  if (!isCostOptimizedAiPath()) return 'quality'
  return stage === 'base' ? 'fast' : 'quality'
}

function getEffectiveMaxRepairPasses(plan?: AIUserPlan): number {
  const base = getMaxRepairPassesByPlan(plan)
  if (!isCostOptimizedAiPath()) return base
  return 0
}

function getCostOptimizedComprehensiveLiveSectionKeys(): Array<keyof AIPremiumReport['sections']> {
  return [
    'introduction',
    'careerPath',
    'relationshipDynamics',
    'timingAdvice',
    'actionPlan',
    'conclusion',
  ]
}

function recordRewriteModeMetric(
  reportType: 'comprehensive' | 'timing' | 'themed',
  modelUsed: string,
  tokensUsed: number | undefined
) {
  const fallback = modelUsed.includes('rewrite-fallback') ? 'true' : 'false'
  recordCounter('destiny.ai_report.rewrite.mode', 1, {
    report_type: reportType,
    model_used: modelUsed,
    fallback,
  })
  if (typeof tokensUsed === 'number') {
    recordCounter('destiny.ai_report.rewrite.tokens', tokensUsed, {
      report_type: reportType,
      model_used: modelUsed,
    })
  }
}

function buildDirectToneOverride(lang: 'ko' | 'en'): string {
  if (lang === 'ko') {
    return [
      '## ?? ?? ??',
      '- ??? ??? ?? ??? ??? ??? ?????.',
      '- ? ?? ? ??? ????? ?????.',
      '- ????? ?? ?? ??? ?? ??? ?????.',
      '- ??(??/??) -> ?? -> ?? ??? ?????.',
      '- ??? ??? ????? ????, ??? ?? ???? ???.',
    ].join('\n')
  }
  return [
    '## Tone Override',
    '- Use a professional consultant tone, not friendly consolation.',
    '- Start each paragraph with a conclusion sentence.',
    '- Prefer clear judgments over vague hedging.',
    '- Keep the flow: evidence (Saju/Astrology) -> interpretation -> action.',
    '- Keep short, assertive paragraph sentences.',
  ].join('\n')
}

function countSectionChars(sections: Record<string, unknown>): number {
  const values = Object.values(sections || {}) as unknown[]
  return values.reduce<number>((acc, value) => {
    if (typeof value === 'string') {
      return acc + value.length
    }
    if (Array.isArray(value)) {
      return acc + value.join(' ').length
    }
    if (value && typeof value === 'object') {
      return acc + countSectionChars(value as Record<string, unknown>)
    }
    return acc
  }, 0)
}

function buildTopMatchedPatterns(
  patterns: PatternResult[] | undefined,
  limit = 10
): TopMatchedPattern[] {
  if (!Array.isArray(patterns) || patterns.length === 0) return []
  return patterns.slice(0, limit).map((pattern) => ({
    id: pattern.id,
    label: pattern.label,
    score: pattern.score,
    confidence: pattern.confidence,
    domains: [...(pattern.domains || [])],
    activationReason: pattern.activationReason,
    matchedSignalIds: [...(pattern.matchedSignalIds || [])].slice(0, 8),
    matchedKeywords: [...(pattern.matchedKeywords || [])].slice(0, 8),
  }))
}

function buildReportQualityMetrics(
  sections: Record<string, unknown>,
  sectionPaths: string[],
  evidenceRefs: SectionEvidenceRefs,
  context: ReportQualityContext = {}
): ReportQualityMetrics {
  const forbiddenAdditionsPass = !validateEvidenceBinding(
    sections,
    sectionPaths,
    evidenceRefs
  ).violations.some((violation) => violation.unsupportedTokens.length > 0)

  return {
    ...buildReportQualityMetricsCore({
      sections,
      sectionPaths,
      evidenceRefs,
      context,
      minEvidenceRefsPerSection: MIN_EVIDENCE_REFS_PER_SECTION_EXTERNAL,
      regex: {
        recheck: RECHECK_REGEX,
        absoluteRisk: ABSOLUTE_RISK_REGEX,
        irreversibleAction: IRREVERSIBLE_ACTION_REGEX,
        cautionIndicator: CAUTION_INDICATOR_REGEX,
        immediateForce: IMMEDIATE_FORCE_REGEX,
        mitigation: MITIGATION_REGEX,
        recommendationTone: RECOMMENDATION_TONE_REGEX,
      },
      hasEvidenceSupport,
      forbiddenAdditionsPass,
    }),
    ...buildReportStyleMetrics(sections, sectionPaths, 'ko'),
  }
}

function recordReportQualityMetrics(
  reportType: 'comprehensive' | 'timing' | 'themed',
  modelUsed: string,
  quality: ReportQualityMetrics
) {
  recordReportQualityMetricsCore(reportType, modelUsed, quality)
}

function applyFinalReportStyle<T extends Record<string, unknown>>(
  sections: T,
  sectionPaths: string[],
  lang: 'ko' | 'en',
  reportCore: ReportCoreViewModel
): T {
  return applyReportBrandVoice(sections, sectionPaths, lang, {
    focusDomain: reportCore.focusDomain,
    actionFocusDomain: reportCore.actionFocusDomain,
    riskAxisLabel: reportCore.riskAxisLabel,
    topDecisionLabel: reportCore.topDecisionLabel || reportCore.primaryAction,
    riskControl: reportCore.riskControl,
  }) as T
}

function ensureFinalActionPlanGrounding<T extends Record<string, unknown>>(
  sections: T,
  lang: 'ko' | 'en',
  reportCore: ReportCoreViewModel
): T {
  const current = String(sections.actionPlan || '').trim()
  if (!current) return sections

  const decision = String(reportCore.topDecisionLabel || reportCore.primaryAction || '').trim()
  const riskControl = String(reportCore.riskControl || '').trim()
  const prefix: string[] = []

  if (lang === 'ko') {
    if (decision && !current.includes(decision)) {
      prefix.push(`지금 가장 맞는 기본 자세는 ${decision}입니다.`)
    }
    if (riskControl && !current.includes(riskControl)) {
      prefix.push(riskControl)
    }
  }

  const cleaned = sanitizeUserFacingNarrative(
    `${prefix.join(' ')} ${current}`
      .replace(/건강 관계 흐름은 확장 관리 국면이며, 핵심 패턴이 중심을 잡고 있습니다\./g, '')
      .replace(/건강 주의 신호\s*action\?*/gi, '')
      .replace(
        /Pushing through fatigue can degrade judgment quality\.?/gi,
        '무리해서 버티면 판단 품질이 급격히 떨어질 수 있습니다.'
      )
      .replace(
        /Pushing through irritation or heat signals often turns a short warning into a longer slowdown\.?/gi,
        '경고 신호를 무시하고 밀어붙이면 짧게 끝날 문제도 길게 끌 수 있습니다.'
      )
      .replace(
        /이후에도 이동·변화 경계 구간 근거가 이어질 것\.?/g,
        '이후에도 이동과 변화는 한 번 더 확인 절차를 거쳐야 합니다.'
      )
      .replace(/\s{2,}/g, ' ')
      .trim()
  )

  return {
    ...sections,
    actionPlan: cleaned,
  }
}

function ensureFinalReportPolish<T extends Record<string, unknown>>(
  sections: T,
  lang: 'ko' | 'en',
  reportCore: ReportCoreViewModel
): T {
  if (lang !== 'ko') return sections

  const actionDomain = reportCore.actionFocusDomain || reportCore.focusDomain
  const branchLabel = sanitizeUserFacingNarrative(
    localizeReportNarrativeText(
      String(
        reportCore.branchSet?.[0]?.label || reportCore.projections?.branches?.detailLines?.[0] || ''
      ),
      lang
    )
  ).trim()

  let actionPlan = String(sections.actionPlan || '').trim()
  let conclusion = String(sections.conclusion || '').trim()

  if (actionDomain === 'move') {
    actionPlan = sanitizeUserFacingNarrative(
      [
        reportCore.riskControl || '이동·변화는 한 번에 확정하지 말고 단계 별로 작게 검증하세요.',
        '예를 들어 이번 주에는 후보 지역을 세 곳으로 좁히고, 통근 시간과 생활비, 계약 조건을 나란히 비교하며 생활 거점을 다시 잡을 준비가 되었는지 확인하세요.',
        '서두르기보다 확인 절차를 먼저 두고, 큰 이동보다 작은 조정부터 시험하는 편이 손실을 줄입니다.',
      ].join(' ')
    )
    conclusion = sanitizeUserFacingNarrative(
      [
        '지금은 경로를 다시 확인하는 쪽이 가장 현실적인 1안입니다.',
        '이번 승부는 서두르지 않고 순서를 지키는 데 달려 있습니다.',
        '생활 거점을 바꾸더라도 기준을 먼저 세운 사람이 결과를 더 안정적으로 가져갑니다.',
      ].join(' ')
    )
  } else {
    conclusion = sanitizeUserFacingNarrative(
      conclusion
        .split('distance tuning')
        .join('거리 조절')
        .split('1안은 거리 조절 쪽입니다.')
        .join('지금은 거리를 다시 조절하는 쪽이 가장 현실적인 1안입니다.')
        .split('지금 차이를 만드는 건 를 어떤 순서로 쓰느냐입니다.')
        .join('지금 차이를 만드는 건 기준과 속도를 어떤 순서로 맞추느냐입니다.')
        .split('성과를 남기고. 기준 없이 받은 사람은')
        .join('성과를 남기고, 기준 없이 받은 사람은')
    )
  }

  return {
    ...sections,
    actionPlan,
    conclusion,
  }
}

function attachDeterministicArtifacts(
  deterministicCore: ReturnType<typeof buildDeterministicCore>,
  unified: ReturnType<typeof buildUnifiedEnvelope>
): ReturnType<typeof buildDeterministicCore> {
  return {
    ...deterministicCore,
    artifacts: {
      ...(deterministicCore.artifacts || {}),
      mappingRulebook: unified.mappingRulebook as unknown as Record<string, unknown>,
      blocksBySection: unified.blocksBySection,
      scenarioBundles: (unified.scenarioBundles || []).map((bundle) => ({
        id: bundle.id,
        domain: bundle.domain,
        mainTokens: bundle.main.summaryTokens || [],
        altTokens: (bundle.alt || []).map((alt) => alt.summaryTokens || []),
      })),
      evidenceLinks: (unified.evidenceLinks || []).map((link) => ({
        id: link.id,
        signalId: link.signalId,
        claimIds: link.claimIds || [],
        anchorId: link.anchorId,
        setIds: link.setIds || [],
        score: link.linkScore,
      })),
      timelinePriority: unified.timelinePriority,
    },
  }
}

function buildReportOutputCoreFields(
  reportCore: ReportCoreViewModel | null | undefined,
  lang: 'ko' | 'en' = 'ko'
) {
  if (!reportCore) return {}
  const localizeReportFreeText = (text: string | undefined | null): string => {
    const value = String(text || '').trim()
    if (!value || lang !== 'ko') return value
    return value
      .replace(/\bpersonality\b/gi, '??')
      .replace(/\bcareer\b/gi, '???')
      .replace(/\brelationship\b/gi, '??')
      .replace(/\bwealth\b/gi, '??')
      .replace(/\bhealth\b/gi, '??')
      .replace(/\bmove\b/gi, '??')
      .replace(/\bspirituality\b/gi, '??')
      .replace(/\bnow\b/gi, '??')
      .replace(/\bweek\b/gi, '?? ?')
      .replace(/\bfortnight\b/gi, '2?')
      .replace(/\bmonth\b/gi, '?? ?')
      .replace(/\bseason\b/gi, '?? ??')
      .replace(/\bverify\b/gi, '???')
      .replace(/\bprepare\b/gi, '??')
      .replace(/\bexecute\b/gi, '??')
      .replace(/\bTransit\s+saturnReturn\b/gi, '?? ?? ??')
      .replace(/\bTransit\s+jupiterReturn\b/gi, '?? ??')
      .replace(/\bTransit\s+nodeReturn\b/gi, '?? ?? ??')
      .replace(/\bTransit\s+mercuryRetrograde\b/gi, '?? ??? ??')
      .replace(/\bTransit\s+marsRetrograde\b/gi, '?? ??? ??')
      .replace(/\bTransit\s+venusRetrograde\b/gi, '?? ??? ??')
      .replace(/\bsaturnReturn\b/gi, '?? ?? ??')
      .replace(/\bjupiterReturn\b/gi, '?? ??')
      .replace(/\bnodeReturn\b/gi, '?? ?? ??')
      .replace(/\bmercuryRetrograde\b/gi, '?? ??? ??')
      .replace(/\bmarsRetrograde\b/gi, '?? ??? ??')
      .replace(/\bvenusRetrograde\b/gi, '?? ??? ??')
      .replace(/\bsolarReturn\b/gi, '?? ?? ??')
      .replace(/\blunarReturn\b/gi, '?? ?? ??')
      .replace(/\bprogressions?\b/gi, '?? ?? ??')
      .replace(/\bcaution\b/gi, '?? ??')
      .replace(/\bdowngrade pressure\b/gi, '?? ?? ??')
      .replace(/\bgeokguk strength\b/gi, '?? ???')
      .replace(/\bdebt restructure\b/gi, '?? ???')
      .replace(/\bliquidity defense\b/gi, '??? ??')
      .replace(/\bexpense spike\b/gi, '?? ?? ??')
      .replace(/\bpromotion review\b/gi, '?? ??')
      .replace(/\brecovery reset\b/gi, '?? ???')
      .replace(/\bbasecamp reset\b/gi, '?? ???')
      .replace(/\bmap full debt stack\b/gi, '?? ?? ??? ?? ????')
      .replace(/\bwealth volatility pattern\b/gi, '?? ??? ??')
      .replace(/\bcareer expansion pattern\b/gi, '??? ?? ??')
      .replace(/\brelationship tension pattern\b/gi, '?? ?? ??')
      .replace(/\bcashflow\b/gi, '????')
      .replace(/\bmoney expansion action\b/gi, '?? ??? ?? ???? ?????')
      .replace(/\brelationship caution\b/gi, '????? ???? ?? ??? ?????')
      .replace(/action pressure/gi, 'action pressure')
      .replace(/relationship caution/gi, 'relationship caution')
      .replace(/money expansion action/gi, 'money expansion action')
      .replace(/career expansion pattern/gi, 'career expansion pattern')
      .replace(/relationship tension pattern/gi, 'relationship tension pattern')
      .replace(
        /action pressure stayed narrow between ([^\s]+) and ([^\s]+)/gi,
        (_, left: string, right: string) =>
          `${getReportDomainLabel(left, 'ko')}? ${getReportDomainLabel(right, 'ko')} ??? ?? ??? ???? ?????.`
      )
      .replace(
        /\b\w+\s+stayed secondary because total support remained below the winner\b/gi,
        '?? ??? ????? ?? ???? ??????.'
      )
      .replace(/basecamp reset/gi, '?? ???')
      .replace(/promotion review/gi, '?? ??')
      .replace(/contract negotiation/gi, '?? ??')
      .replace(/specialist track/gi, '??? ??')
      .replace(/wealth volatility pattern/gi, '?? ??? ??')
      .replace(/career expansion pattern/gi, '??? ?? ??')
      .replace(/relationship tension pattern/gi, '?? ?? ??')
      .replace(/sleep disruption/gi, '?? ???')
      .replace(/burnout risk/gi, '??? ??')
      .replace(/liquidity defense/gi, '??? ??')
      .replace(/debt restructuring/gi, '?? ???')
      .replace(/route recheck/gi, '?? ???')
      .replace(/recovery reset/gi, '?? ???')
      .replace(/cashflow/gi, '????')
      .replace(/\s+/g, ' ')
      .trim()
  }
  const focusLabel = getReportDomainLabel(reportCore.focusDomain, lang)
  const actionLabel = getReportDomainLabel(
    reportCore.actionFocusDomain || reportCore.focusDomain,
    lang
  )
  const polishBranchSentence = (text: string | undefined | null): string => {
    const base = localizeReportFreeText(text)
    if (!base || lang !== 'ko') return base
    const replacements: Array<[RegExp, string]> = [
      [
        new RegExp(
          '([\\uAC00-\\uD7A3]+)\\s+Expansion Pattern\\s+\\uD328\\uD134\\s+\\uADFC\\uAC70\\uAC00\\s+\\uC720\\uC9C0\\uB420\\s+\\uAC83',
          'gi'
        ),
        '$1 \\uD655\\uC7A5 \\uD750\\uB984\\uC774 \\uC720\\uC9C0\\uB420 \\uAC83',
      ],
      [
        new RegExp(
          '(.+?)\\s+\\uC774\\uD6C4\\uC5D0\\uB3C4\\s+([\\uAC00-\\uD7A3]+)\\s+Expansion Pattern\\s+\\uADFC\\uAC70\\uAC00\\s+\\uC774\\uC5B4\\uC9C8\\s+\\uAC83',
          'gi'
        ),
        '$1 \\uC774\\uD6C4\\uC5D0\\uB3C4 $2 \\uD655\\uC7A5 \\uD750\\uB984\\uC774 \\uC774\\uC5B4\\uC9C8 \\uAC83',
      ],
      [new RegExp('\\bExpansion Pattern\\b', 'gi'), '\\uD655\\uC7A5 \\uD750\\uB984'],
      [
        new RegExp(
          '([\\uAC00-\\uD7A3]+)\\s+(?:\\uD655\\uC7A5|\\uAE34\\uC7A5|\\uBCC0\\uB3D9\\uC131)\\s+\\uD750\\uB984\\s+\\uD328\\uD134\\s+\\uADFC\\uAC70\\uAC00\\s+\\uC720\\uC9C0\\uB420\\s+\\uAC83',
          'gi'
        ),
        '$1 \\uD750\\uB984\\uC774 \\uC720\\uC9C0\\uB420 \\uAC83',
      ],
      [
        new RegExp(
          '\\uC2DC\\uB098\\uB9AC\\uC624\\s+\\uD655\\uB960\\s+[\\d.]+%\\uC640\\s+\\uC2E0\\uB8B0\\uB3C4\\s+[\\d.]+%\\uAC00\\s+\\uC720\\uC9C0\\uB420\\s+\\uAC83',
          'gi'
        ),
        '\\uD604\\uC7AC \\uAC00\\uB2A5\\uC131\\uACFC \\uC2E0\\uB8B0\\uB3C4\\uAC00 \\uC720\\uC9C0\\uB420 \\uAC83',
      ],
      [
        new RegExp(
          '\\uD0C0\\uC774\\uBC0D\\s+\\uC801\\uD569\\uB3C4\\s+[\\d.]+%\\s+\\uC774\\uC0C1\\uC5D0\\uC11C\\s+(.+?)\\uB97C\\s+\\uBC14\\uB85C\\s+\\uC2E4\\uD589\\uD560\\s+\\uC218\\s+\\uC788\\uC744\\s+\\uAC83',
          'gi'
        ),
        '\\uD0C0\\uC774\\uBC0D\\uC774 \\uCDA9\\uBD84\\uD788 \\uB9DE\\uC744 \\uB54C $1\\uB97C \\uC2E4\\uD589\\uD560 \\uC218 \\uC788\\uC744 \\uAC83',
      ],
      [
        new RegExp(
          '(.+?)\\s+\\uC774\\uD6C4\\uC5D0\\uB3C4\\s+([\\uAC00-\\uD7A3]+)\\s+\\uD750\\uB984\\s+\\uADFC\\uAC70\\uAC00\\s+\\uC774\\uC5B4\\uC9C8\\s+\\uAC83',
          'gi'
        ),
        '$1 \\uC774\\uD6C4\\uC5D0\\uB3C4 $2 \\uD750\\uB984\\uC774 \\uC774\\uC5B4\\uC9C8 \\uAC83',
      ],
    ]

    return replacements
      .reduce((current, [pattern, replacement]) => current.replace(pattern, replacement), base)
      .replace(/\s+/g, ' ')
      .trim()
  }
  const localizeProjectionList = (items: Array<string | undefined | null>) =>
    items.map((item) => polishBranchSentence(item)).filter(Boolean)
  const timingWindow = reportCore.domainTimingWindows.find(
    (item) => item.domain === reportCore.actionFocusDomain || item.domain === reportCore.focusDomain
  )
  const structureSummary =
    lang === 'ko'
      ? reportCore.actionFocusDomain && reportCore.actionFocusDomain !== reportCore.focusDomain
        ? `?? ?? ???? ? ??? ${actionLabel}??, ?? ?? ??? ${focusLabel}???. ?? ?? ?? ?? ${reportCore.latentTopAxes
            .slice(0, 3)
            .map((axis) => axis.label)
            .join(', ')}???.`
        : `?? ?? ?? ???? ??? ${focusLabel}??, ??? ?? ???? ? ??? ${actionLabel}???. ?? ?? ?? ?? ${reportCore.latentTopAxes
            .slice(0, 3)
            .map((axis) => axis.label)
            .join(', ')}???.`
      : reportCore.actionFocusDomain && reportCore.actionFocusDomain !== reportCore.focusDomain
        ? `The axis to handle directly right now is ${actionLabel}, while ${focusLabel} remains the background structural axis. The top latent drivers are ${reportCore.latentTopAxes
            .slice(0, 3)
            .map((axis) => axis.label)
            .join(', ')}.`
        : `The identity axis is ${focusLabel}, the action axis is ${actionLabel}, and the top latent drivers are ${reportCore.latentTopAxes
            .slice(0, 3)
            .map((axis) => axis.label)
            .join(', ')}.`
  const timingSummary =
    lang === 'ko'
      ? `${actionLabel} ??? ?? ?? ${localizeReportFreeText(timingWindow?.window || '??')}??, ${localizeReportFreeText(timingWindow?.timingConflictNarrative || '??? ??? ?? ?? ???.')}`
      : `Timing for ${actionLabel} reads as ${timingWindow?.window || 'unknown'}, and ${timingWindow?.timingConflictNarrative || 'structure and trigger need to be read together.'}`
  const conflictSummary =
    lang === 'ko'
      ? localizeReportFreeText(reportCore.arbitrationBrief.conflictReasons[0]) ||
        `${focusLabel}? ?? ??? ?? ??, ${actionLabel}? ?? ??? ??? ? ?? ?? ???.`
      : reportCore.arbitrationBrief.conflictReasons[0] ||
        `${focusLabel} and ${actionLabel} currently separate into identity and action axes.`
  const evidenceSummary =
    lang === 'ko'
      ? `?? ?? ${reportCore.topSignalIds.slice(0, 3).length}?, ?? ?? ${reportCore.topPatternIds.slice(0, 2).length}?, ?? ?? ${reportCore.topScenarioIds.slice(0, 2).length}?? ?? ??? ??? ????.`
      : `Top signals ${reportCore.topSignalIds.slice(0, 3).join(', ')}, patterns ${reportCore.topPatternIds.slice(0, 2).join(', ')}, and scenarios ${reportCore.topScenarioIds.slice(0, 2).join(', ')} form the current spine.`
  return {
    focusDomain: reportCore.focusDomain,
    actionFocusDomain: reportCore.actionFocusDomain,
    matrixView: (reportCore.matrixView || []).slice(0, 4).map((row) => ({
      domain: row.domain,
      label: localizeReportFreeText(row.label),
      cells: (row.cells || []).slice(0, 4).map((cell) => ({
        ...cell,
        summary: localizeReportFreeText(cell.summary),
      })),
    })),
    branchSet: (reportCore.branchSet || []).slice(0, 3).map((branch) => ({
      ...branch,
      label: localizeReportFreeText(branch.label),
      summary: localizeReportFreeText(branch.summary),
      entry: localizeProjectionList(branch.entry || []),
      abort: localizeProjectionList(branch.abort || []),
      sustain: localizeProjectionList(branch.sustain || []),
      reversalRisk: polishBranchSentence(branch.reversalRisk || ''),
      wrongMoveCost: polishBranchSentence(branch.wrongMoveCost || ''),
    })),
    singleUserModel: reportCore.singleUserModel
      ? {
          subject: localizeReportFreeText(reportCore.singleUserModel.subject),
          facets: reportCore.singleUserModel.facets.map((facet) => ({
            ...facet,
            label: localizeReportFreeText(facet.label),
            summary: localizeReportFreeText(facet.summary),
            details: localizeProjectionList(facet.details || []),
          })),
        }
      : undefined,
    singleSubjectView: reportCore.singleSubjectView
      ? {
          directAnswer: localizeReportFreeText(reportCore.singleSubjectView.directAnswer),
          structureAxis: {
            ...reportCore.singleSubjectView.structureAxis,
            label: localizeReportFreeText(reportCore.singleSubjectView.structureAxis.label),
            thesis: localizeReportFreeText(reportCore.singleSubjectView.structureAxis.thesis),
            topAxes: localizeProjectionList(
              reportCore.singleSubjectView.structureAxis.topAxes || []
            ),
          },
          actionAxis: {
            ...reportCore.singleSubjectView.actionAxis,
            label: localizeReportFreeText(reportCore.singleSubjectView.actionAxis.label),
            nowAction: localizeReportFreeText(reportCore.singleSubjectView.actionAxis.nowAction),
            whyThisFirst: localizeReportFreeText(
              reportCore.singleSubjectView.actionAxis.whyThisFirst
            ),
          },
          riskAxis: {
            ...reportCore.singleSubjectView.riskAxis,
            label: localizeReportFreeText(reportCore.singleSubjectView.riskAxis.label),
            warning: localizeReportFreeText(reportCore.singleSubjectView.riskAxis.warning),
            hardStops: localizeProjectionList(
              reportCore.singleSubjectView.riskAxis.hardStops || []
            ),
          },
          timingState: {
            ...reportCore.singleSubjectView.timingState,
            bestWindow: localizeReportFreeText(reportCore.singleSubjectView.timingState.bestWindow),
            whyNow: localizeReportFreeText(reportCore.singleSubjectView.timingState.whyNow),
            whyNotYet: localizeReportFreeText(reportCore.singleSubjectView.timingState.whyNotYet),
            windows: reportCore.singleSubjectView.timingState.windows.map((window) => ({
              ...window,
              summary: localizeReportFreeText(window.summary),
            })),
          },
          competingPressures: reportCore.singleSubjectView.competingPressures.map((pressure) => ({
            ...pressure,
            label: localizeReportFreeText(pressure.label),
            nextWindow: localizeReportFreeText(pressure.nextWindow),
            summary: localizeReportFreeText(pressure.summary),
          })),
          branches: reportCore.singleSubjectView.branches.map((branch) => ({
            label: localizeReportFreeText(branch.label),
            summary: localizeReportFreeText(branch.summary),
            entryConditions: localizeProjectionList(branch.entryConditions || []),
            abortConditions: localizeProjectionList(branch.abortConditions || []),
            nextMove: localizeReportFreeText(branch.nextMove),
          })),
          entryConditions: localizeProjectionList(
            reportCore.singleSubjectView.entryConditions || []
          ),
          abortConditions: localizeProjectionList(
            reportCore.singleSubjectView.abortConditions || []
          ),
          nextMove: localizeReportFreeText(reportCore.singleSubjectView.nextMove),
          confidence: reportCore.singleSubjectView.confidence,
          reliability: reportCore.singleSubjectView.reliability
            ? {
                crossAgreement: reportCore.singleSubjectView.reliability.crossAgreement,
                contradictionFlags: localizeProjectionList(
                  reportCore.singleSubjectView.reliability.contradictionFlags || []
                ),
                notes: localizeProjectionList(reportCore.singleSubjectView.reliability.notes || []),
              }
            : undefined,
        }
      : undefined,
    personModel: reportCore.personModel
      ? {
          subject: localizeReportFreeText(reportCore.personModel.subject),
          overview: localizeReportFreeText(reportCore.personModel.overview),
          structuralCore: {
            ...reportCore.personModel.structuralCore,
            overview: localizeReportFreeText(reportCore.personModel.structuralCore.overview),
            latentAxes: localizeProjectionList(
              reportCore.personModel.structuralCore.latentAxes || []
            ),
          },
          formationProfile: {
            ...reportCore.personModel.formationProfile,
            summary: localizeReportFreeText(reportCore.personModel.formationProfile.summary),
            repeatedPatternFamilies: localizeProjectionList(
              reportCore.personModel.formationProfile.repeatedPatternFamilies || []
            ),
            dominantLatentGroups: localizeProjectionList(
              reportCore.personModel.formationProfile.dominantLatentGroups || []
            ),
            pressureHabits: localizeProjectionList(
              reportCore.personModel.formationProfile.pressureHabits || []
            ),
            supportHabits: localizeProjectionList(
              reportCore.personModel.formationProfile.supportHabits || []
            ),
          },
          timeProfile: {
            ...reportCore.personModel.timeProfile,
            timingNarrative: localizeReportFreeText(
              reportCore.personModel.timeProfile.timingNarrative
            ),
            windows: reportCore.personModel.timeProfile.windows.map((window) => ({
              ...window,
              label: localizeReportFreeText(window.label),
              window: localizeReportFreeText(window.window),
              granularity: localizeReportFreeText(window.granularity),
              whyNow: localizeReportFreeText(window.whyNow),
              entryConditions: localizeProjectionList(window.entryConditions || []),
              abortConditions: localizeProjectionList(window.abortConditions || []),
            })),
            activationSources: reportCore.personModel.timeProfile.activationSources.map(
              (source) => ({
                ...source,
                label: localizeReportFreeText(source.label),
              })
            ),
          },
          layers: reportCore.personModel.layers.map((layer) => ({
            ...layer,
            label: localizeReportFreeText(layer.label),
            summary: localizeReportFreeText(layer.summary),
            bullets: localizeProjectionList(layer.bullets || []),
          })),
          dimensions: reportCore.personModel.dimensions.map((dimension) => ({
            ...dimension,
            label: localizeReportFreeText(dimension.label),
            summary: localizeReportFreeText(dimension.summary),
          })),
          domainStateGraph: reportCore.personModel.domainStateGraph.map((state) => ({
            ...state,
            label: localizeReportFreeText(state.label),
            thesis: localizeReportFreeText(state.thesis),
            supportSignals: localizeProjectionList(state.supportSignals || []),
            pressureSignals: localizeProjectionList(state.pressureSignals || []),
            firstMove: localizeReportFreeText(state.firstMove),
            holdMove: localizeReportFreeText(state.holdMove),
            timescales: (state.timescales || []).map((timescale) => ({
              ...timescale,
              thesis: localizeReportFreeText(timescale.thesis),
              entryConditions: localizeProjectionList(timescale.entryConditions || []),
              abortConditions: localizeProjectionList(timescale.abortConditions || []),
            })),
          })),
          domainPortraits: reportCore.personModel.domainPortraits.map((portrait) => ({
            ...portrait,
            label: localizeReportFreeText(portrait.label),
            summary: localizeReportFreeText(portrait.summary),
            baselineThesis: localizeReportFreeText(portrait.baselineThesis),
            activationThesis: localizeReportFreeText(portrait.activationThesis),
            likelyExpressions: localizeProjectionList(portrait.likelyExpressions || []),
            riskExpressions: localizeProjectionList(portrait.riskExpressions || []),
            allowedActions: localizeProjectionList(portrait.allowedActions || []),
            blockedActions: localizeProjectionList(portrait.blockedActions || []),
          })),
          states: reportCore.personModel.states.map((state) => ({
            ...state,
            label: localizeReportFreeText(state.label),
            summary: localizeReportFreeText(state.summary),
            drivers: localizeProjectionList(state.drivers || []),
            counterweights: localizeProjectionList(state.counterweights || []),
          })),
          appliedProfile: {
            foodProfile: {
              ...reportCore.personModel.appliedProfile.foodProfile,
              summary: localizeReportFreeText(
                reportCore.personModel.appliedProfile.foodProfile.summary
              ),
              thermalBias: localizeReportFreeText(
                reportCore.personModel.appliedProfile.foodProfile.thermalBias
              ),
              digestionStyle: localizeReportFreeText(
                reportCore.personModel.appliedProfile.foodProfile.digestionStyle
              ),
              helpfulFoods: localizeProjectionList(
                reportCore.personModel.appliedProfile.foodProfile.helpfulFoods || []
              ),
              cautionFoods: localizeProjectionList(
                reportCore.personModel.appliedProfile.foodProfile.cautionFoods || []
              ),
              rhythmGuidance: localizeProjectionList(
                reportCore.personModel.appliedProfile.foodProfile.rhythmGuidance || []
              ),
            },
            lifeRhythmProfile: {
              ...reportCore.personModel.appliedProfile.lifeRhythmProfile,
              summary: localizeReportFreeText(
                reportCore.personModel.appliedProfile.lifeRhythmProfile.summary
              ),
              peakWindows: localizeProjectionList(
                reportCore.personModel.appliedProfile.lifeRhythmProfile.peakWindows || []
              ),
              recoveryWindows: localizeProjectionList(
                reportCore.personModel.appliedProfile.lifeRhythmProfile.recoveryWindows || []
              ),
              stressBehaviors: localizeProjectionList(
                reportCore.personModel.appliedProfile.lifeRhythmProfile.stressBehaviors || []
              ),
              regulationMoves: localizeProjectionList(
                reportCore.personModel.appliedProfile.lifeRhythmProfile.regulationMoves || []
              ),
            },
            relationshipStyleProfile: {
              ...reportCore.personModel.appliedProfile.relationshipStyleProfile,
              summary: localizeReportFreeText(
                reportCore.personModel.appliedProfile.relationshipStyleProfile.summary
              ),
              attractionPatterns: localizeProjectionList(
                reportCore.personModel.appliedProfile.relationshipStyleProfile.attractionPatterns ||
                  []
              ),
              stabilizers: localizeProjectionList(
                reportCore.personModel.appliedProfile.relationshipStyleProfile.stabilizers || []
              ),
              ruptureTriggers: localizeProjectionList(
                reportCore.personModel.appliedProfile.relationshipStyleProfile.ruptureTriggers || []
              ),
              repairMoves: localizeProjectionList(
                reportCore.personModel.appliedProfile.relationshipStyleProfile.repairMoves || []
              ),
            },
            workStyleProfile: {
              ...reportCore.personModel.appliedProfile.workStyleProfile,
              summary: localizeReportFreeText(
                reportCore.personModel.appliedProfile.workStyleProfile.summary
              ),
              bestRoles: localizeProjectionList(
                reportCore.personModel.appliedProfile.workStyleProfile.bestRoles || []
              ),
              bestConditions: localizeProjectionList(
                reportCore.personModel.appliedProfile.workStyleProfile.bestConditions || []
              ),
              fatigueTriggers: localizeProjectionList(
                reportCore.personModel.appliedProfile.workStyleProfile.fatigueTriggers || []
              ),
              leverageMoves: localizeProjectionList(
                reportCore.personModel.appliedProfile.workStyleProfile.leverageMoves || []
              ),
            },
            moneyStyleProfile: {
              ...reportCore.personModel.appliedProfile.moneyStyleProfile,
              summary: localizeReportFreeText(
                reportCore.personModel.appliedProfile.moneyStyleProfile.summary
              ),
              earningPattern: localizeProjectionList(
                reportCore.personModel.appliedProfile.moneyStyleProfile.earningPattern || []
              ),
              savingPattern: localizeProjectionList(
                reportCore.personModel.appliedProfile.moneyStyleProfile.savingPattern || []
              ),
              leakageRisks: localizeProjectionList(
                reportCore.personModel.appliedProfile.moneyStyleProfile.leakageRisks || []
              ),
              controlRules: localizeProjectionList(
                reportCore.personModel.appliedProfile.moneyStyleProfile.controlRules || []
              ),
            },
            environmentProfile: {
              ...reportCore.personModel.appliedProfile.environmentProfile,
              summary: localizeReportFreeText(
                reportCore.personModel.appliedProfile.environmentProfile.summary
              ),
              preferredSettings: localizeProjectionList(
                reportCore.personModel.appliedProfile.environmentProfile.preferredSettings || []
              ),
              drainSignals: localizeProjectionList(
                reportCore.personModel.appliedProfile.environmentProfile.drainSignals || []
              ),
              resetActions: localizeProjectionList(
                reportCore.personModel.appliedProfile.environmentProfile.resetActions || []
              ),
            },
          },
          relationshipProfile: {
            ...reportCore.personModel.relationshipProfile,
            summary: localizeReportFreeText(reportCore.personModel.relationshipProfile.summary),
            partnerArchetypes: localizeProjectionList(
              reportCore.personModel.relationshipProfile.partnerArchetypes || []
            ),
            inflowPaths: localizeProjectionList(
              reportCore.personModel.relationshipProfile.inflowPaths || []
            ),
            commitmentConditions: localizeProjectionList(
              reportCore.personModel.relationshipProfile.commitmentConditions || []
            ),
            breakPatterns: localizeProjectionList(
              reportCore.personModel.relationshipProfile.breakPatterns || []
            ),
          },
          careerProfile: {
            ...reportCore.personModel.careerProfile,
            summary: localizeReportFreeText(reportCore.personModel.careerProfile.summary),
            suitableLanes: localizeProjectionList(
              reportCore.personModel.careerProfile.suitableLanes || []
            ),
            executionStyle: localizeProjectionList(
              reportCore.personModel.careerProfile.executionStyle || []
            ),
            hiringTriggers: localizeProjectionList(
              reportCore.personModel.careerProfile.hiringTriggers || []
            ),
            blockers: localizeProjectionList(reportCore.personModel.careerProfile.blockers || []),
          },
          futureBranches: reportCore.personModel.futureBranches.map((branch) => ({
            ...branch,
            label: localizeReportFreeText(branch.label),
            summary: localizeReportFreeText(branch.summary),
            conditions: localizeProjectionList(branch.conditions || []),
            blockers: localizeProjectionList(branch.blockers || []),
          })),
          eventOutlook: reportCore.personModel.eventOutlook.map((event) => ({
            ...event,
            label: localizeReportFreeText(event.label),
            summary: localizeReportFreeText(event.summary),
            bestWindow: localizeReportFreeText(event.bestWindow || ''),
            entryConditions: localizeProjectionList(event.entryConditions || []),
            abortConditions: localizeProjectionList(event.abortConditions || []),
            nextMove: localizeReportFreeText(event.nextMove),
          })),
          birthTimeHypotheses: reportCore.personModel.birthTimeHypotheses.map((item) => ({
            ...item,
            label: localizeReportFreeText(item.label),
            birthTime: localizeReportFreeText(item.birthTime),
            summary: localizeReportFreeText(item.summary),
            supportSignals: localizeProjectionList(item.supportSignals || []),
            cautionSignals: localizeProjectionList(item.cautionSignals || []),
          })),
          crossConflictMap: reportCore.personModel.crossConflictMap.map((item) => ({
            ...item,
            label: localizeReportFreeText(item.label),
            summary: localizeReportFreeText(item.summary),
            sajuView: localizeReportFreeText(item.sajuView),
            astroView: localizeReportFreeText(item.astroView),
            resolutionMove: localizeReportFreeText(item.resolutionMove),
          })),
          pastEventReconstruction: {
            summary: localizeReportFreeText(reportCore.personModel.pastEventReconstruction.summary),
            markers: reportCore.personModel.pastEventReconstruction.markers.map((marker) => ({
              ...marker,
              label: localizeReportFreeText(marker.label),
              ageWindow: localizeReportFreeText(marker.ageWindow),
              summary: localizeReportFreeText(marker.summary),
              evidence: localizeProjectionList(marker.evidence || []),
            })),
          },
          uncertaintyEnvelope: {
            ...reportCore.personModel.uncertaintyEnvelope,
            summary: localizeReportFreeText(reportCore.personModel.uncertaintyEnvelope.summary),
            reliableAreas: localizeProjectionList(
              reportCore.personModel.uncertaintyEnvelope.reliableAreas || []
            ),
            conditionalAreas: localizeProjectionList(
              reportCore.personModel.uncertaintyEnvelope.conditionalAreas || []
            ),
            unresolvedAreas: localizeProjectionList(
              reportCore.personModel.uncertaintyEnvelope.unresolvedAreas || []
            ),
          },
          evidenceLedger: {
            ...reportCore.personModel.evidenceLedger,
            coherenceNotes: localizeProjectionList(
              reportCore.personModel.evidenceLedger.coherenceNotes || []
            ),
            contradictionFlags: localizeProjectionList(
              reportCore.personModel.evidenceLedger.contradictionFlags || []
            ),
          },
        }
      : undefined,
    arbitrationBrief: reportCore.arbitrationBrief,
    latentTopAxes: reportCore.latentTopAxes,
    projections: {
      structure: {
        headline: lang === 'ko' ? '?? ??' : 'Structure Projection',
        summary: structureSummary,
        topAxes: reportCore.latentTopAxes.slice(0, 4).map((axis) => axis.label),
        detailLines: localizeProjectionList(reportCore.projections?.structure?.detailLines || []),
        drivers: localizeProjectionList(reportCore.projections?.structure?.drivers || []),
        counterweights: localizeProjectionList(
          reportCore.projections?.structure?.counterweights || []
        ),
        nextMoves: localizeProjectionList(reportCore.projections?.structure?.nextMoves || []),
      },
      timing: {
        headline: lang === 'ko' ? '??? ??' : 'Timing Projection',
        summary: timingSummary,
        window: timingWindow?.window,
        granularity: timingWindow?.timingGranularity,
        detailLines: localizeProjectionList(reportCore.projections?.timing?.detailLines || []),
        drivers: localizeProjectionList(reportCore.projections?.timing?.drivers || []),
        counterweights: localizeProjectionList(
          reportCore.projections?.timing?.counterweights || []
        ),
        nextMoves: localizeProjectionList(reportCore.projections?.timing?.nextMoves || []),
      },
      conflict: {
        headline: lang === 'ko' ? '?? ??' : 'Conflict Projection',
        summary: conflictSummary,
        detailLines: localizeProjectionList(reportCore.projections?.conflict?.detailLines || []),
        drivers: localizeProjectionList(reportCore.projections?.conflict?.drivers || []),
        counterweights: localizeProjectionList(
          reportCore.projections?.conflict?.counterweights || []
        ),
        nextMoves: localizeProjectionList(reportCore.projections?.conflict?.nextMoves || []),
        reasons:
          lang === 'ko'
            ? reportCore.arbitrationBrief.conflictReasons
                .slice(0, 3)
                .map((item) => localizeReportFreeText(item))
            : reportCore.arbitrationBrief.conflictReasons.slice(0, 3),
      },
      action: {
        headline: lang === 'ko' ? '?? ??' : 'Action Projection',
        summary:
          lang === 'ko'
            ? `${actionLabel}??? ${reportCore.topDecisionLabel || reportCore.topDecisionId || reportCore.primaryAction}? ?? ?? ???????.`
            : `On the ${actionLabel} axis, ${reportCore.topDecisionLabel || reportCore.topDecisionId || reportCore.primaryAction} is the live move.`,
        detailLines: localizeProjectionList(reportCore.projections?.action?.detailLines || []),
        drivers: localizeProjectionList(reportCore.projections?.action?.drivers || []),
        counterweights: localizeProjectionList(
          reportCore.projections?.action?.counterweights || []
        ),
        nextMoves: localizeProjectionList(reportCore.projections?.action?.nextMoves || []),
        reasons: [
          reportCore.topDecisionLabel || reportCore.topDecisionId || '',
          ...(reportCore.judgmentPolicy.allowedActionLabels || []).slice(0, 2),
        ].filter(Boolean),
      },
      risk: {
        headline: lang === 'ko' ? '??? ??' : 'Risk Projection',
        summary:
          lang === 'ko'
            ? [
                localizeReportFreeText(reportCore.primaryCaution),
                localizeReportFreeText(reportCore.riskControl),
              ]
                .filter(Boolean)
                .join('. ')
            : `${reportCore.primaryCaution} ${reportCore.riskControl}`.trim(),
        detailLines: localizeProjectionList(reportCore.projections?.risk?.detailLines || []),
        drivers: localizeProjectionList(reportCore.projections?.risk?.drivers || []),
        counterweights: localizeProjectionList(reportCore.projections?.risk?.counterweights || []),
        nextMoves: localizeProjectionList(reportCore.projections?.risk?.nextMoves || []),
        reasons: [
          ...(reportCore.judgmentPolicy.blockedActionLabels || []).slice(0, 2),
          ...(reportCore.judgmentPolicy.hardStopLabels || []).slice(0, 2),
        ]
          .map((item) => (lang === 'ko' ? localizeReportFreeText(item) : item))
          .filter(Boolean),
      },
      evidence: {
        headline: lang === 'ko' ? '?? ??' : 'Evidence Projection',
        summary: evidenceSummary,
        detailLines: localizeProjectionList(reportCore.projections?.evidence?.detailLines || []),
        drivers: localizeProjectionList(reportCore.projections?.evidence?.drivers || []),
        counterweights: localizeProjectionList(
          reportCore.projections?.evidence?.counterweights || []
        ),
        nextMoves: localizeProjectionList(reportCore.projections?.evidence?.nextMoves || []),
        reasons:
          lang === 'ko'
            ? [
                reportCore.topSignalIds.length
                  ? `?? ?? ${reportCore.topSignalIds.slice(0, 3).length}?? ??? ?? ????.`
                  : '',
                reportCore.topPatternIds.length
                  ? `?? ?? ${reportCore.topPatternIds.slice(0, 2).length}?? ?? ???? ????.`
                  : '',
                reportCore.topScenarioIds.length
                  ? `?? ???? ${reportCore.topScenarioIds.slice(0, 2).length}?? ?? ??? ?????.`
                  : '',
              ].filter(Boolean)
            : [
                ...reportCore.topSignalIds.slice(0, 2),
                ...reportCore.topPatternIds.slice(0, 1),
                ...reportCore.topScenarioIds.slice(0, 1),
              ].filter(Boolean),
      },
      branches: {
        headline: lang === 'ko' ? '?? ??' : 'Branch Projection',
        summary:
          localizeReportFreeText(reportCore.projections?.branches?.summary) ||
          (lang === 'ko'
            ? '??? ??? ??? ?????? 2~3?? ?? ??? ??? ?? ????.'
            : 'Multiple realistic branches are open rather than one fixed outcome.'),
        window: reportCore.projections?.branches?.window,
        granularity: reportCore.projections?.branches?.granularity,
        detailLines: localizeProjectionList(reportCore.projections?.branches?.detailLines || []),
        drivers: localizeProjectionList(reportCore.projections?.branches?.drivers || []),
        counterweights: localizeProjectionList(
          reportCore.projections?.branches?.counterweights || []
        ),
        nextMoves: localizeProjectionList(reportCore.projections?.branches?.nextMoves || []),
        reasons: localizeProjectionList(reportCore.projections?.branches?.reasons || []),
      },
    },
    topDecisionId: reportCore.topDecisionId,
    topDecisionLabel: reportCore.topDecisionLabel,
    riskControl: reportCore.riskControl,
  }
}

export {
  buildDirectToneOverride,
  buildReportOutputCoreFields,
  buildReportQualityMetrics,
  buildTopMatchedPatterns,
  countSectionChars,
  ensureFinalActionPlanGrounding,
  ensureFinalReportPolish,
  getAiQualityTier,
  getCostOptimizedComprehensiveLiveSectionKeys,
  getEffectiveMaxRepairPasses,
  isCostOptimizedAiPath,
  recordReportQualityMetrics,
  recordRewriteModeMetric,
  applyFinalReportStyle,
  attachDeterministicArtifacts,
}
