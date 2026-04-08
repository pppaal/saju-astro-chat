// @ts-nocheck

export async function runPremiumDeterministicMode(ctx) {
  const {
    input,
    matrixReport,
    options,
    startTime,
    lang,
    detailLevel,
    normalizedInput,
    graphRagEvidence,
    deterministicCore,
    coreSeed,
    reportCore,
    signalSynthesis,
    strategyEngine,
    topMatchedPatterns,
    graphRagSummary,
    COMPREHENSIVE_SECTION_KEYS,
    comprehensiveFallbackDeps,
    buildComprehensiveEvidenceRefs,
    buildComprehensiveFallbackSectionsExternal,
    buildUnifiedEnvelope,
    mergeComprehensiveDraftWithBlocksExternal,
    maybePolishPremiumSections,
    validateEvidenceBinding,
    enforceEvidenceBindingFallback,
    sanitizeSectionsByPathsExternal,
    narrativePathSanitizerDeps,
    sanitizeComprehensiveSectionsForUser,
    comprehensivePostProcessDeps,
    applyComprehensiveSectionRoleGuards,
    repairMalformedComprehensiveSections,
    enforceComprehensiveNarrativeQualityFallback,
    stripGenericEvidenceFooters,
    enforceEvidenceRefFooters,
    buildReportQualityMetrics,
    shouldForceComprehensiveNarrativeFallback,
    renderPersonalityDeepSection,
    renderTimingAdviceSection,
    renderActionPlanSection,
    recordReportQualityMetrics,
    buildExtendedComprehensiveSections,
    getComprehensiveRenderPaths,
    applyFinalReportStyle,
    ensureFinalActionPlanGrounding,
    ensureFinalReportPolish,
    buildReportOutputCoreFields,
    attachDeterministicArtifacts,
    renderSectionsAsMarkdown,
    renderSectionsAsText,
    rewriteSectionsWithFallback,
    recordRewriteModeMetric,
    buildReportTrustNarratives,
    attachTrustNarrativeToSections,
    buildNarrativeSupplementsBySectionExternal,
    generateNarrativeSectionsFromSynthesis,
    buildSectionFactPack,
    buildSectionPrompt,
    buildSynthesisPromptBlock,
    buildThemeSchemaPromptBlock,
    inferAgeFromBirthDate,
    buildLifeCyclePromptBlock,
    buildMatrixSummary,
    summarizeGraphRAGEvidence,
    buildDirectToneOverride,
    sanitizeSectionNarrative,
    sanitizeTimingContradictionsExternal,
    postProcessSectionNarrative,
    evaluateSectionGate,
    containsBannedPhrase,
    hasTimingInText,
    buildNarrativeRewritePrompt,
    buildTimingRepairInstruction,
    renderProjectionBlocksAsText,
    callAIBackendGeneric,
    getAiQualityTier,
    isComprehensiveSectionsPayload,
    hasRequiredSectionPaths,
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
    buildAntiRepetitionInstruction,
    getRepetitivePaths,
    hasRepetitiveSentences,
    buildEvidenceBindingRepairPrompt,
    buildComprehensiveEvidenceRefsExternal,
    getEffectiveMaxRepairPasses,
    getCostOptimizedComprehensiveLiveSectionKeys,
    isCostOptimizedAiPath,
    reportCoreEnrichmentDeps,
    logger,
  } = ctx

  const evidenceRefs = buildComprehensiveEvidenceRefs(signalSynthesis)
  const sectionPaths = [...COMPREHENSIVE_SECTION_KEYS] as string[]
  const fallbackSections = buildComprehensiveFallbackSectionsExternal(
    normalizedInput,
    matrixReport,
    deterministicCore,
    lang,
    comprehensiveFallbackDeps,
    reportCore,
    { matrixSummary: options.matrixSummary }
  )
  const generatedAt = new Date().toISOString()
  const unified = buildUnifiedEnvelope({
    mode: 'comprehensive',
    lang,
    generatedAt,
    matrixInput: normalizedInput,
    matrixReport,
    matrixSummary: options.matrixSummary,
    signalSynthesis,
    graphRagEvidence,
    birthDate: options.birthDate,
    timingData: options.timingData,
    sectionPaths,
    evidenceRefs,
  })
  const draftSections = mergeComprehensiveDraftWithBlocksExternal(
    [...COMPREHENSIVE_SECTION_KEYS],
    fallbackSections,
    unified.blocksBySection,
    lang,
    comprehensiveFallbackDeps
  )
  let sections = draftSections as unknown as Record<string, unknown>
  if (lang === 'ko') {
    const trustNarratives = buildReportTrustNarratives(reportCore, coreSeed.quality, lang)
    sections = attachTrustNarrativeToSections(
      'comprehensive',
      sections,
      trustNarratives.trust,
      trustNarratives.provenance
    )
  }
  const polished = await maybePolishPremiumSections({
    reportType: 'comprehensive',
    sections: sections as AIPremiumReport['sections'],
    lang,
    userPlan: options.userPlan,
    evidenceRefs,
    blocksBySection: unified.blocksBySection,
    minCharsPerSection: lang === 'ko' ? 360 : 260,
  })
  sections = polished.sections as unknown as Record<string, unknown>
  const finalEvidenceCheck = validateEvidenceBinding(sections, sectionPaths, evidenceRefs)
  if (finalEvidenceCheck.needsRepair) {
    sections = enforceEvidenceBindingFallback(
      sections,
      finalEvidenceCheck.violations,
      evidenceRefs,
      lang
    )
  }
  sections = sanitizeSectionsByPathsExternal(sections, sectionPaths, narrativePathSanitizerDeps)
  sections = sanitizeComprehensiveSectionsForUser(
    sections as Record<string, unknown>,
    [...COMPREHENSIVE_SECTION_KEYS],
    comprehensivePostProcessDeps,
    lang
  )
  sections = applyComprehensiveSectionRoleGuards(
    sections as AIPremiumReport['sections'],
    reportCore,
    normalizedInput,
    comprehensivePostProcessDeps,
    lang
  )
  sections = repairMalformedComprehensiveSections(
    sections as AIPremiumReport['sections'],
    reportCore,
    normalizedInput,
    lang
  )
  if (lang === 'en') {
    sections = enforceComprehensiveNarrativeQualityFallback(
      sections as AIPremiumReport['sections'],
      reportCore,
      normalizedInput,
      lang
    ) as unknown as Record<string, unknown>
  }
  sections = stripGenericEvidenceFooters(sections, sectionPaths, lang)
  sections = enforceEvidenceRefFooters(sections, sectionPaths, evidenceRefs, lang)

  const topInsights = (matrixReport.topInsights || []).slice(0, 3).map((i) => i.title)
  const keyStrengths = (matrixReport.topInsights || [])
    .filter((i) => i.category === 'strength')
    .slice(0, 3)
    .map((i) => i.title)
  const keyChallenges = (matrixReport.topInsights || [])
    .filter((i) => i.category === 'challenge' || i.category === 'caution')
    .slice(0, 3)
    .map((i) => i.title)
  const domainFallback = [...(matrixReport.domainAnalysis || [])]
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((d) =>
      lang === 'ko' ? `${d.domain} ??(${d.score})` : `${d.domain} strength (${d.score})`
    )
  const anchorFallback = (graphRagEvidence.anchors || [])
    .slice(0, 3)
    .map((a) =>
      lang === 'ko' ? `${a.section} ?? ?? ??` : `${a.section} section evidence alignment`
    )
  const safeTopInsights = topInsights.length > 0 ? topInsights : anchorFallback
  const safeKeyStrengths = keyStrengths.length > 0 ? keyStrengths : domainFallback
  const safeKeyChallenges =
    keyChallenges.length > 0
      ? keyChallenges
      : lang === 'ko'
        ? ['?? ?? ?? ??', '?? ? ??? ??', '?????? ??? ??']
        : [
            'Caution signals require review',
            'Recheck before final commitment',
            'Communication risk check',
          ]
  let qualityMetrics = buildReportQualityMetrics(sections, sectionPaths, evidenceRefs, {
    requiredPaths: sectionPaths,
    claims: unified.claims,
    anchors: unified.anchors,
    scenarioBundles: unified.scenarioBundles,
    timelineEvents: unified.timelineEvents,
    coreQuality: coreSeed.quality,
  })
  if (shouldForceComprehensiveNarrativeFallback(qualityMetrics)) {
    sections = enforceComprehensiveNarrativeQualityFallback(
      sections as AIPremiumReport['sections'],
      reportCore,
      normalizedInput,
      lang
    ) as unknown as Record<string, unknown>
    sections = enforceEvidenceRefFooters(sections, sectionPaths, evidenceRefs, lang)
    qualityMetrics = buildReportQualityMetrics(sections, sectionPaths, evidenceRefs, {
      requiredPaths: sectionPaths,
      claims: unified.claims,
      anchors: unified.anchors,
      scenarioBundles: unified.scenarioBundles,
      timelineEvents: unified.timelineEvents,
      coreQuality: coreSeed.quality,
    })
  }
  if (lang === 'en') {
    sections = {
      ...(sections as Record<string, unknown>),
      personalityDeep: renderPersonalityDeepSection(reportCore, normalizedInput, lang),
      timingAdvice: renderTimingAdviceSection(
        reportCore,
        normalizedInput,
        lang,
        options.matrixSummary
      ),
      actionPlan: renderActionPlanSection(reportCore, normalizedInput, lang),
    }
    sections = enforceEvidenceRefFooters(sections, sectionPaths, evidenceRefs, lang)
  }
  const finalModelUsed = polished.modelUsed
    ? `deterministic+${polished.modelUsed}`
    : 'deterministic-only'
  const finalReportVersion = polished.modelUsed
    ? '1.2.0-deterministic+rewrite'
    : '1.2.0-deterministic-only'
  recordReportQualityMetrics('comprehensive', finalModelUsed, qualityMetrics)
  let outputSections = buildExtendedComprehensiveSections(
    sections as AIPremiumReport['sections'],
    reportCore,
    normalizedInput,
    lang,
    options.matrixSummary
  )
  let outputSectionPaths = getComprehensiveRenderPaths(outputSections)
  outputSections = sanitizeComprehensiveSectionsForUser(
    outputSections as Record<string, unknown>,
    outputSectionPaths,
    comprehensivePostProcessDeps,
    lang
  ) as AIPremiumReport['sections']
  outputSections = applyComprehensiveSectionRoleGuards(
    outputSections as AIPremiumReport['sections'],
    reportCore,
    normalizedInput,
    comprehensivePostProcessDeps,
    lang
  )
  outputSections = repairMalformedComprehensiveSections(
    outputSections as AIPremiumReport['sections'],
    reportCore,
    normalizedInput,
    lang
  )
  outputSectionPaths = getComprehensiveRenderPaths(outputSections)
  outputSections = applyFinalReportStyle(outputSections, outputSectionPaths, lang, reportCore)
  outputSections = ensureFinalActionPlanGrounding(outputSections, lang, reportCore)
  outputSections = ensureFinalReportPolish(outputSections, lang, reportCore)
  if (lang === 'ko') {
    const cleanKoreanComprehensive = (text) =>
      String(text || '')
        .replace(/현실적으로는\s*,\s*/g, '현실적으로는 ')
        .replace(/현실적인 경로는\s*,\s*/g, '현실적인 경로는 ')
        .replace(/\s+/g, ' ')
        .trim()
    outputSections.turningPoints = cleanKoreanComprehensive(outputSections.turningPoints)
    outputSections.futureOutlook = cleanKoreanComprehensive(outputSections.futureOutlook)
  }
  if (!String(outputSections.introduction || '').trim()) {
    outputSections.introduction = comprehensiveFallbackDeps.renderIntroductionSection(
      reportCore,
      normalizedInput,
      lang
    )
  }
  if (!String(outputSections.timingAdvice || '').trim()) {
    outputSections.timingAdvice = renderTimingAdviceSection(
      reportCore,
      normalizedInput,
      lang,
      options.matrixSummary
    )
  }
  outputSectionPaths = getComprehensiveRenderPaths(outputSections)
  qualityMetrics = buildReportQualityMetrics(
    outputSections as Record<string, unknown>,
    outputSectionPaths,
    evidenceRefs,
    {
      requiredPaths: outputSectionPaths,
      claims: unified.claims,
      anchors: unified.anchors,
      scenarioBundles: unified.scenarioBundles,
      timelineEvents: unified.timelineEvents,
      coreQuality: coreSeed.quality,
    }
  )

  return {
    id: `air_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
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
      geokguk: input.geokguk,
    },
    sections: outputSections,
    graphRagEvidence,
    graphRagSummary,
    evidenceRefs,
    evidenceRefsByPara: unified.evidenceRefsByPara,
    deterministicCore: attachDeterministicArtifacts(deterministicCore, unified),
    renderedMarkdown: renderSectionsAsMarkdown(outputSections, outputSectionPaths, lang),
    renderedText: renderSectionsAsText(outputSections, outputSectionPaths),
    matrixSummary: {
      overallScore: matrixReport.overallScore.total,
      grade: matrixReport.overallScore.grade,
      topInsights: safeTopInsights,
      keyStrengths: safeKeyStrengths,
      keyChallenges: safeKeyChallenges,
    },
    signalSynthesis,
    strategyEngine,
    meta: {
      modelUsed: finalModelUsed,
      tokensUsed: polished.tokensUsed || 0,
      processingTime: Math.max(1, Date.now() - startTime),
      reportVersion: finalReportVersion,
      qualityMetrics,
    },
  }
}
