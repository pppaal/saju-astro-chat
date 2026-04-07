/* eslint-disable @typescript-eslint/no-explicit-any */

import type { FusionReport } from '../interpreter/types'
import type { MatrixCalculationInput, MatrixSummary } from '../types'
import type {
  ReportPeriod,
  ReportTheme,
  TimingData,
  TimingAIPremiumReport,
  ThemedAIPremiumReport,
  TimingReportSections,
  ThemedReportSections,
} from './types'
import type { AIUserPlan } from './reportTypes'
import type { DeterministicProfile } from './deterministicCoreConfig'

type GenerationDeps = Record<string, any>

export async function generateTimingReportWithSupport(
  input: MatrixCalculationInput,
  matrixReport: FusionReport,
  period: ReportPeriod,
  timingData: TimingData,
  options: {
    name?: string
    birthDate?: string
    targetDate?: string
    lang?: 'ko' | 'en'
    userPlan?: AIUserPlan
    deterministicOnly?: boolean
    userQuestion?: string
    deterministicProfile?: DeterministicProfile
    matrixSummary?: MatrixSummary
  } = {},
  deps: GenerationDeps
): Promise<TimingAIPremiumReport> {
  const {
    FORCE_REWRITE_ONLY_MODE,
    logger,
    buildNormalizedMatrixInput,
    buildGraphRAGEvidence,
    formatGraphRAGEvidenceForPrompt,
    buildDeterministicCore,
    runDestinyCore,
    adaptCoreToReport,
    buildTopMatchedPatterns,
    buildGraphRagSummaryPayload,
    shouldUseDeterministicOnly,
    buildTimingFallbackSectionsExternal,
    buildTimingEvidenceRefs,
    buildUnifiedEnvelope,
    enrichTimingSectionsWithReportCore,
    buildReportTrustNarratives,
    attachTrustNarrativeToSections,
    maybePolishPremiumSections,
    validateEvidenceBinding,
    enforceEvidenceBindingFallback,
    enforceEvidenceRefFooters,
    sanitizeSectionsByPathsExternal,
    narrativePathSanitizerDeps,
    generatePeriodLabel,
    calculatePeriodScore,
    buildReportQualityMetrics,
    recordReportQualityMetrics,
    buildReportOutputCoreFields,
    attachDeterministicArtifacts,
    renderSectionsAsMarkdown,
    renderSectionsAsText,
    rewriteSectionsWithFallback,
    recordRewriteModeMetric,
    inferAgeFromBirthDate,
    buildLifeCyclePromptBlock,
    buildThemeSchemaPromptBlock,
    buildSynthesisPromptBlock,
    buildMatrixSummary,
    buildTimingPrompt,
    buildDirectToneOverride,
    callAIBackendGeneric,
    getAiQualityTier,
    hasRequiredSectionPaths,
    getEffectiveMaxRepairPasses,
    getShortSectionPaths,
    getMissingCrossPaths,
    getCrossCoverageRatio,
    getMissingPathsByPredicate,
    getCoverageRatioByPredicate,
    hasActionInText,
    hasEvidenceTriplet,
    getListStylePaths,
    countSectionChars,
    buildDepthRepairInstruction,
    buildCrossRepairInstruction,
    buildCrossCoverageRepairInstruction,
    buildActionRepairInstruction,
    buildEvidenceRepairInstruction,
    buildNarrativeStyleRepairInstruction,
    buildSecondPassInstruction,
    buildEvidenceBindingRepairPrompt,
    applyFinalReportStyle,
    ensureFinalActionPlanGrounding,
    ensureFinalReportPolish,
    reportCoreEnrichmentDeps,
    secondaryFallbackDeps,
  } = deps

  const startTime = Date.now()
  const lang = options.lang || 'ko'
  const targetDate = options.targetDate || new Date().toISOString().split('T')[0]
  const normalizedInput = buildNormalizedMatrixInput(input)
  const graphRagEvidence = buildGraphRAGEvidence(normalizedInput, matrixReport, {
    mode: 'timing',
    period,
  })
  const graphRagEvidencePrompt = formatGraphRAGEvidenceForPrompt(graphRagEvidence, lang)
  const deterministicCore = buildDeterministicCore({
    matrixInput: normalizedInput,
    matrixReport,
    graphEvidence: graphRagEvidence,
    userQuestion: options.userQuestion,
    lang,
    profile: options.deterministicProfile,
  })
  const coreSeed = runDestinyCore({
    mode: 'timing',
    lang,
    matrixInput: normalizedInput,
    matrixReport,
    matrixSummary: options.matrixSummary,
  })
  const reportCore = adaptCoreToReport(coreSeed, lang)
  const signalSynthesis = coreSeed.signalSynthesis
  const strategyEngine = coreSeed.strategyEngine
  const topMatchedPatterns = buildTopMatchedPatterns(coreSeed.patterns)
  const graphRagSummary = buildGraphRagSummaryPayload(
    lang,
    matrixReport,
    graphRagEvidence,
    signalSynthesis,
    strategyEngine,
    reportCore
  )
  const deterministicOnly = shouldUseDeterministicOnly(options.deterministicOnly)

  if (deterministicOnly) {
    const sectionPaths = [
      'overview',
      'energy',
      'opportunities',
      'cautions',
      'domains.career',
      'domains.love',
      'domains.wealth',
      'domains.health',
      'actionPlan',
      'luckyElements',
    ]
    const draftSections = buildTimingFallbackSectionsExternal(
      normalizedInput,
      reportCore,
      signalSynthesis,
      lang,
      secondaryFallbackDeps
    )
    const evidenceRefs = buildTimingEvidenceRefs(sectionPaths, signalSynthesis)
    const generatedAt = new Date().toISOString()
    const unified = buildUnifiedEnvelope({
      mode: 'timing',
      lang,
      generatedAt,
      matrixInput: normalizedInput,
      matrixReport,
      matrixSummary: options.matrixSummary,
      signalSynthesis,
      graphRagEvidence,
      period,
      targetDate,
      timingData,
      birthDate: options.birthDate,
      sectionPaths,
      evidenceRefs,
    })
    let sections = draftSections as unknown as Record<string, unknown>
    sections = enrichTimingSectionsWithReportCore(
      sections as unknown as TimingReportSections,
      reportCore,
      lang,
      reportCoreEnrichmentDeps
    ) as unknown as Record<string, unknown>
    {
      const trustNarratives = buildReportTrustNarratives(reportCore, coreSeed.quality, lang)
      sections = attachTrustNarrativeToSections(
        'timing',
        sections,
        trustNarratives.trust,
        trustNarratives.provenance
      )
    }
    const polished = await maybePolishPremiumSections({
      reportType: 'timing',
      sections: sections as unknown as TimingReportSections,
      lang,
      userPlan: options.userPlan,
      evidenceRefs,
      blocksBySection: unified.blocksBySection,
      minCharsPerSection: lang === 'ko' ? 320 : 240,
    })
    sections = polished.sections as unknown as Record<string, unknown>
    {
      const trustNarratives = buildReportTrustNarratives(reportCore, coreSeed.quality, lang)
      sections = attachTrustNarrativeToSections(
        'timing',
        sections,
        trustNarratives.trust,
        trustNarratives.provenance
      )
    }
    const finalEvidenceCheck = validateEvidenceBinding(sections, sectionPaths, evidenceRefs)
    if (finalEvidenceCheck.needsRepair) {
      sections = enforceEvidenceBindingFallback(
        sections,
        finalEvidenceCheck.violations,
        evidenceRefs,
        lang
      )
    }
    sections = enforceEvidenceRefFooters(sections, sectionPaths, evidenceRefs, lang)
    sections = sanitizeSectionsByPathsExternal(sections, sectionPaths, narrativePathSanitizerDeps)
    const periodLabel = generatePeriodLabel(period, targetDate, lang)
    const periodScore = calculatePeriodScore(timingData, input.dayMasterElement)
    const qualityMetrics = buildReportQualityMetrics(sections, sectionPaths, evidenceRefs, {
      requiredPaths: [
        'overview',
        'energy',
        'opportunities',
        'cautions',
        'domains.career',
        'domains.love',
        'domains.wealth',
        'domains.health',
        'actionPlan',
      ],
      claims: unified.claims,
      anchors: unified.anchors,
      scenarioBundles: unified.scenarioBundles,
      timelineEvents: unified.timelineEvents,
      coreQuality: coreSeed.quality,
    })
    const finalModelUsed = polished.modelUsed
      ? `deterministic+${polished.modelUsed}`
      : 'deterministic-only'
    const finalReportVersion = polished.modelUsed
      ? '1.2.0-deterministic+rewrite'
      : '1.2.0-deterministic-only'
    recordReportQualityMetrics('timing', finalModelUsed, qualityMetrics)
    return {
      id: `timing_${period}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      generatedAt,
      lang,
      ...buildReportOutputCoreFields(reportCore, lang),
      ...unified,
      coreHash: coreSeed.coreHash,
      patterns: coreSeed.patterns,
      topMatchedPatterns,
      scenarios: coreSeed.scenarios,
      profile: {
        name: options.name,
        birthDate: options.birthDate,
        dayMaster: input.dayMasterElement,
        dominantElement: input.dominantWesternElement || input.dayMasterElement,
      },
      period,
      targetDate,
      periodLabel,
      timingData,
      sections: sections as unknown as TimingReportSections,
      graphRagEvidence,
      graphRagSummary,
      evidenceRefs,
      evidenceRefsByPara: unified.evidenceRefsByPara,
      deterministicCore: attachDeterministicArtifacts(deterministicCore, unified),
      strategyEngine,
      renderedMarkdown: renderSectionsAsMarkdown(sections, sectionPaths, lang),
      renderedText: renderSectionsAsText(sections, sectionPaths),
      periodScore,
      meta: {
        modelUsed: finalModelUsed,
        tokensUsed: polished.tokensUsed || 0,
        processingTime: Math.max(1, Date.now() - startTime),
        reportVersion: finalReportVersion,
        qualityMetrics,
      },
    }
  }

  if (FORCE_REWRITE_ONLY_MODE && !deterministicOnly) {
    const sectionPaths = [
      'overview',
      'energy',
      'opportunities',
      'cautions',
      'domains.career',
      'domains.love',
      'domains.wealth',
      'domains.health',
      'actionPlan',
      'luckyElements',
    ]
    const requiredPaths = [
      'overview',
      'energy',
      'opportunities',
      'cautions',
      'domains.career',
      'domains.love',
      'domains.wealth',
      'domains.health',
      'actionPlan',
    ]
    const draftSections = buildTimingFallbackSectionsExternal(
      normalizedInput,
      reportCore,
      signalSynthesis,
      lang,
      secondaryFallbackDeps
    )
    const evidenceRefs = buildTimingEvidenceRefs(sectionPaths, signalSynthesis)
    const generatedAt = new Date().toISOString()
    const unified = buildUnifiedEnvelope({
      mode: 'timing',
      lang,
      generatedAt,
      matrixInput: normalizedInput,
      matrixReport,
      matrixSummary: options.matrixSummary,
      signalSynthesis,
      graphRagEvidence,
      period,
      targetDate,
      timingData,
      birthDate: options.birthDate,
      sectionPaths,
      evidenceRefs,
    })
    const rewrite = await rewriteSectionsWithFallback({
      lang,
      userPlan: options.userPlan,
      draftSections,
      evidenceRefs,
      blocksBySection: unified.blocksBySection,
      sectionPaths,
      requiredPaths,
      minCharsPerSection: lang === 'ko' ? 320 : 240,
    })
    let sections = rewrite.sections as unknown as Record<string, unknown>
    const finalEvidenceCheck = validateEvidenceBinding(sections, sectionPaths, evidenceRefs)
    if (finalEvidenceCheck.needsRepair) {
      sections = enforceEvidenceBindingFallback(
        sections,
        finalEvidenceCheck.violations,
        evidenceRefs,
        lang
      )
    }
    sections = enforceEvidenceRefFooters(sections, sectionPaths, evidenceRefs, lang)
    sections = sanitizeSectionsByPathsExternal(sections, sectionPaths, narrativePathSanitizerDeps)
    sections = enrichTimingSectionsWithReportCore(
      sections as unknown as TimingReportSections,
      reportCore,
      lang,
      reportCoreEnrichmentDeps
    ) as unknown as Record<string, unknown>
    const periodLabel = generatePeriodLabel(period, targetDate, lang)
    const periodScore = calculatePeriodScore(timingData, input.dayMasterElement)
    const qualityMetrics = buildReportQualityMetrics(sections, sectionPaths, evidenceRefs, {
      requiredPaths,
      claims: unified.claims,
      anchors: unified.anchors,
      scenarioBundles: unified.scenarioBundles,
      timelineEvents: unified.timelineEvents,
      coreQuality: coreSeed.quality,
    })
    recordReportQualityMetrics('timing', rewrite.modelUsed, qualityMetrics)
    recordRewriteModeMetric('timing', rewrite.modelUsed, rewrite.tokensUsed)
    return {
      id: `timing_${period}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      generatedAt,
      lang,
      ...unified,
      coreHash: coreSeed.coreHash,
      patterns: coreSeed.patterns,
      topMatchedPatterns,
      scenarios: coreSeed.scenarios,
      profile: {
        name: options.name,
        birthDate: options.birthDate,
        dayMaster: input.dayMasterElement,
        dominantElement: input.dominantWesternElement || input.dayMasterElement,
      },
      period,
      targetDate,
      periodLabel,
      timingData,
      sections: sections as unknown as TimingReportSections,
      graphRagEvidence,
      graphRagSummary,
      evidenceRefs,
      evidenceRefsByPara: unified.evidenceRefsByPara,
      deterministicCore: attachDeterministicArtifacts(deterministicCore, unified),
      strategyEngine,
      renderedMarkdown: renderSectionsAsMarkdown(sections, sectionPaths, lang),
      renderedText: renderSectionsAsText(sections, sectionPaths),
      periodScore,
      meta: {
        modelUsed: rewrite.modelUsed,
        tokensUsed: rewrite.tokensUsed,
        processingTime: Math.max(1, Date.now() - startTime),
        reportVersion: '1.1.0-rewrite-only',
        qualityMetrics,
      },
    }
  }
  const inferredAge = inferAgeFromBirthDate(options.birthDate)
  const lifecyclePrompt = inferredAge !== null ? buildLifeCyclePromptBlock(inferredAge, lang) : ''
  const themeSchemaPrompt = buildThemeSchemaPromptBlock('comprehensive', lang)
  const synthesisPromptBlock = buildSynthesisPromptBlock(
    signalSynthesis,
    strategyEngine,
    lang,
    'timing'
  )

  // 1. Build matrix summary
  const matrixSummary = buildMatrixSummary(matrixReport, lang)

  // 2. Build prompt
  const prompt = `${buildTimingPrompt(
    period,
    lang,
    {
      name: options.name,
      birthDate: options.birthDate,
      dayMaster: input.dayMasterElement,
      dayMasterElement: input.dayMasterElement,
    },
    timingData,
    targetDate,
    matrixSummary,
    graphRagEvidencePrompt,
    options.userQuestion,
    deterministicCore.promptBlock
  )}\n\n${themeSchemaPrompt}\n\n${lifecyclePrompt}\n\n${buildDirectToneOverride(lang)}\n\n${synthesisPromptBlock}`

  // 3. Call AI backend + quality gate (length/cross evidence)
  const base = await callAIBackendGeneric(prompt, lang, {
    userPlan: options.userPlan,
    qualityTier: getAiQualityTier('base'),
  })
  const timingRequiredPaths = [
    'overview',
    'energy',
    'opportunities',
    'cautions',
    'domains.career',
    'domains.love',
    'domains.wealth',
    'domains.health',
    'actionPlan',
  ]
  let sections = hasRequiredSectionPaths(base.sections as unknown, timingRequiredPaths)
    ? (base.sections as unknown as Record<string, unknown>)
    : (buildTimingFallbackSectionsExternal(
        normalizedInput,
        reportCore,
        signalSynthesis,
        lang,
        secondaryFallbackDeps
      ) as unknown as Record<string, unknown>)
  let model = base.model
  let tokensUsed = base.tokensUsed
  const maxRepairPasses = getEffectiveMaxRepairPasses(options.userPlan)

  const sectionPaths = [
    'overview',
    'energy',
    'opportunities',
    'cautions',
    'domains.career',
    'domains.love',
    'domains.wealth',
    'domains.health',
    'actionPlan',
    'luckyElements',
  ]
  const crossPaths = [
    'overview',
    'energy',
    'opportunities',
    'cautions',
    'domains.career',
    'domains.love',
    'domains.wealth',
    'domains.health',
    'actionPlan',
  ]
  const minCharsPerSection = lang === 'ko' ? 300 : 230
  const minTotalChars = lang === 'ko' ? 5200 : 4000
  const minCrossCoverage = 0.72
  const minActionCoverage = 0.65
  const minEvidenceTripletCoverage = 0.65

  const shortPaths = getShortSectionPaths(sections, sectionPaths, minCharsPerSection)
  const missingCross = getMissingCrossPaths(sections, crossPaths)
  const crossCoverageRatio = getCrossCoverageRatio(sections, crossPaths)
  const missingActionPaths = getMissingPathsByPredicate(sections, crossPaths, hasActionInText)
  const actionCoverageRatio = getCoverageRatioByPredicate(sections, crossPaths, hasActionInText)
  const missingEvidenceTripletPaths = getMissingPathsByPredicate(
    sections,
    crossPaths,
    hasEvidenceTriplet
  )
  const listStylePaths = getListStylePaths(sections, sectionPaths)
  const evidenceTripletCoverageRatio = getCoverageRatioByPredicate(
    sections,
    crossPaths,
    hasEvidenceTriplet
  )
  const totalChars = countSectionChars(sections)
  const needsRepair =
    shortPaths.length > 0 ||
    missingCross.length > 0 ||
    totalChars < minTotalChars ||
    crossCoverageRatio < minCrossCoverage ||
    actionCoverageRatio < minActionCoverage ||
    evidenceTripletCoverageRatio < minEvidenceTripletCoverage ||
    listStylePaths.length > 0

  if (needsRepair && maxRepairPasses > 0) {
    const repairPrompt = [
      prompt,
      buildDepthRepairInstruction(
        lang,
        sectionPaths,
        shortPaths,
        minCharsPerSection,
        minTotalChars
      ),
      missingCross.length > 0 ? buildCrossRepairInstruction(lang, missingCross) : '',
      crossCoverageRatio < minCrossCoverage
        ? buildCrossCoverageRepairInstruction(lang, crossCoverageRatio, minCrossCoverage)
        : '',
      actionCoverageRatio < minActionCoverage
        ? buildActionRepairInstruction(
            lang,
            actionCoverageRatio,
            minActionCoverage,
            missingActionPaths
          )
        : '',
      evidenceTripletCoverageRatio < minEvidenceTripletCoverage
        ? buildEvidenceRepairInstruction(
            lang,
            evidenceTripletCoverageRatio,
            minEvidenceTripletCoverage,
            missingEvidenceTripletPaths
          )
        : '',
      listStylePaths.length > 0 ? buildNarrativeStyleRepairInstruction(lang, listStylePaths) : '',
    ]
      .filter(Boolean)
      .join('\n')
    try {
      const repaired = await callAIBackendGeneric(repairPrompt, lang, {
        userPlan: options.userPlan,
        qualityTier: getAiQualityTier('repair'),
      })
      const repairedSections = repaired.sections as unknown
      if (hasRequiredSectionPaths(repairedSections, timingRequiredPaths)) {
        sections = repairedSections as Record<string, unknown>
      }
      model = repaired.model
      tokensUsed = (tokensUsed || 0) + (repaired.tokensUsed || 0)

      const secondShortPaths = getShortSectionPaths(sections, sectionPaths, minCharsPerSection)
      const secondMissingCross = getMissingCrossPaths(sections, crossPaths)
      const secondCrossCoverageRatio = getCrossCoverageRatio(sections, crossPaths)
      const secondActionCoverageRatio = getCoverageRatioByPredicate(
        sections,
        crossPaths,
        hasActionInText
      )
      const secondEvidenceTripletCoverageRatio = getCoverageRatioByPredicate(
        sections,
        crossPaths,
        hasEvidenceTriplet
      )
      const secondTotalChars = countSectionChars(sections)
      if (
        maxRepairPasses > 1 &&
        (secondShortPaths.length > 0 ||
          secondMissingCross.length > 0 ||
          secondTotalChars < minTotalChars ||
          secondCrossCoverageRatio < minCrossCoverage ||
          secondActionCoverageRatio < minActionCoverage ||
          secondEvidenceTripletCoverageRatio < minEvidenceTripletCoverage)
      ) {
        const secondPrompt = [repairPrompt, buildSecondPassInstruction(lang)].join('\n')
        try {
          const second = await callAIBackendGeneric(secondPrompt, lang, {
            userPlan: options.userPlan,
            qualityTier: getAiQualityTier('repair'),
          })
          const secondSections = second.sections as unknown
          if (hasRequiredSectionPaths(secondSections, timingRequiredPaths)) {
            sections = secondSections as Record<string, unknown>
          }
          model = second.model
          tokensUsed = (tokensUsed || 0) + (second.tokensUsed || 0)
        } catch (error) {
          logger.warn('[Timing Report] Second repair pass failed; using first repaired result', {
            error: error instanceof Error ? error.message : String(error),
            plan: options.userPlan || 'free',
          })
        }
      }
    } catch (error) {
      logger.warn('[Timing Report] Repair pass failed; using base response', {
        error: error instanceof Error ? error.message : String(error),
        plan: options.userPlan || 'free',
      })
    }
  }

  const timingEvidenceRefs = buildTimingEvidenceRefs(sectionPaths, signalSynthesis)
  const timingEvidenceCheck = validateEvidenceBinding(sections, sectionPaths, timingEvidenceRefs)
  if (timingEvidenceCheck.needsRepair && maxRepairPasses > 0) {
    try {
      const repairPrompt = buildEvidenceBindingRepairPrompt(
        lang,
        sections,
        timingEvidenceRefs,
        timingEvidenceCheck.violations
      )
      const repaired = await callAIBackendGeneric(repairPrompt, lang, {
        userPlan: options.userPlan,
        qualityTier: getAiQualityTier('repair'),
      })
      const repairedSections = repaired.sections as unknown
      if (hasRequiredSectionPaths(repairedSections, timingRequiredPaths)) {
        sections = repairedSections as Record<string, unknown>
      }
      model = repaired.model
      tokensUsed = (tokensUsed || 0) + (repaired.tokensUsed || 0)
    } catch (error) {
      logger.warn('[Timing Report] Evidence-binding repair failed; using current response', {
        error: error instanceof Error ? error.message : String(error),
        plan: options.userPlan || 'free',
      })
    }
  }

  const finalTimingEvidenceCheck = validateEvidenceBinding(
    sections,
    sectionPaths,
    timingEvidenceRefs
  )
  if (finalTimingEvidenceCheck.needsRepair) {
    sections = enforceEvidenceBindingFallback(
      sections,
      finalTimingEvidenceCheck.violations,
      timingEvidenceRefs,
      lang
    )
  }
  sections = enforceEvidenceRefFooters(sections, sectionPaths, timingEvidenceRefs, lang)
  sections = sanitizeSectionsByPathsExternal(sections, sectionPaths, narrativePathSanitizerDeps)
  sections = enrichTimingSectionsWithReportCore(
    sections as unknown as TimingReportSections,
    reportCore,
    lang,
    reportCoreEnrichmentDeps
  ) as unknown as Record<string, unknown>

  // 4. Build period label
  const periodLabel = generatePeriodLabel(period, targetDate, lang)

  // 5. Calculate score
  const periodScore = calculatePeriodScore(timingData, input.dayMasterElement)
  const generatedAt = new Date().toISOString()
  const unified = buildUnifiedEnvelope({
    mode: 'timing',
    lang,
    generatedAt,
    matrixInput: normalizedInput,
    matrixReport,
    matrixSummary: options.matrixSummary,
    signalSynthesis,
    graphRagEvidence,
    period,
    targetDate,
    timingData,
    birthDate: options.birthDate,
    sectionPaths,
    evidenceRefs: timingEvidenceRefs,
  })
  const qualityMetrics = buildReportQualityMetrics(
    sections as Record<string, unknown>,
    sectionPaths,
    timingEvidenceRefs,
    {
      requiredPaths: timingRequiredPaths,
      claims: unified.claims,
      anchors: unified.anchors,
      scenarioBundles: unified.scenarioBundles,
      timelineEvents: unified.timelineEvents,
      coreQuality: coreSeed.quality,
    }
  )
  sections = applyFinalReportStyle(
    sections as Record<string, unknown>,
    sectionPaths,
    lang,
    reportCore
  )
  sections = ensureFinalActionPlanGrounding(sections as Record<string, unknown>, lang, reportCore)
  sections = ensureFinalReportPolish(sections as Record<string, unknown>, lang, reportCore)
  const styledTimingQualityMetrics = buildReportQualityMetrics(
    sections as Record<string, unknown>,
    sectionPaths,
    timingEvidenceRefs,
    {
      requiredPaths: timingRequiredPaths,
      claims: unified.claims,
      anchors: unified.anchors,
      scenarioBundles: unified.scenarioBundles,
      timelineEvents: unified.timelineEvents,
      coreQuality: coreSeed.quality,
    }
  )

  // 6. Assemble report
  const report: TimingAIPremiumReport = {
    id: `timing_${period}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    generatedAt,
    lang,
    ...buildReportOutputCoreFields(reportCore, lang),
    ...unified,
    coreHash: coreSeed.coreHash,
    patterns: coreSeed.patterns,
    topMatchedPatterns,
    scenarios: coreSeed.scenarios,

    profile: {
      name: options.name,
      birthDate: options.birthDate,
      dayMaster: input.dayMasterElement,
      dominantElement: input.dominantWesternElement || input.dayMasterElement,
    },

    period,
    targetDate,
    periodLabel,

    timingData,
    sections: sections as unknown as TimingReportSections,
    graphRagEvidence,
    graphRagSummary,
    evidenceRefs: timingEvidenceRefs,
    evidenceRefsByPara: unified.evidenceRefsByPara,
    deterministicCore: attachDeterministicArtifacts(deterministicCore, unified),
    strategyEngine,
    renderedMarkdown: renderSectionsAsMarkdown(
      sections as Record<string, unknown>,
      [
        'overview',
        'energy',
        'opportunities',
        'cautions',
        'domains.career',
        'domains.love',
        'domains.wealth',
        'domains.health',
        'actionPlan',
        'luckyElements',
      ],
      lang
    ),
    renderedText: renderSectionsAsText(sections as Record<string, unknown>, [
      'overview',
      'energy',
      'opportunities',
      'cautions',
      'domains.career',
      'domains.love',
      'domains.wealth',
      'domains.health',
      'actionPlan',
      'luckyElements',
    ]),
    periodScore,

    meta: {
      modelUsed: model,
      tokensUsed,
      processingTime: Math.max(1, Date.now() - startTime),
      reportVersion: '1.0.0',
      qualityMetrics: styledTimingQualityMetrics,
    },
  }

  recordReportQualityMetrics('timing', model, report.meta.qualityMetrics!)

  return report
}
