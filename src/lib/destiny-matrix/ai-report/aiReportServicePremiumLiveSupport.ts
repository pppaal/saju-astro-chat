// @ts-nocheck

export async function runPremiumLiveMode(ctx) {
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

  const requestedChars =
    typeof options.targetChars === 'number' && Number.isFinite(options.targetChars)
      ? Math.max(3500, Math.min(32000, Math.floor(options.targetChars)))
      : detailLevel === 'comprehensive'
        ? lang === 'ko'
          ? 18000
          : 14000
        : detailLevel === 'detailed'
          ? lang === 'ko'
            ? 11000
            : 8500
          : undefined
  const maxTokensOverride = requestedChars ? Math.ceil(requestedChars / 2) + 1200 : undefined
  const costOptimizedAiPath = isCostOptimizedAiPath()
  const sectionTokenBudget = maxTokensOverride
    ? costOptimizedAiPath
      ? Math.max(700, Math.min(1400, Math.floor(maxTokensOverride / 6)))
      : Math.max(850, Math.min(2400, Math.floor(maxTokensOverride / 4)))
    : undefined
  const sectionMinChars =
    detailLevel === 'comprehensive'
      ? lang === 'ko'
        ? 850
        : 650
      : detailLevel === 'detailed'
        ? lang === 'ko'
          ? 600
          : 450
        : lang === 'ko'
          ? 380
          : 300

  const sectionAnchors = new Map(
    (graphRagEvidence.anchors || []).map((anchor) => [anchor.section, anchor])
  )
  const deterministicFallbackSections = buildComprehensiveFallbackSectionsExternal(
    normalizedInput,
    matrixReport,
    deterministicCore,
    lang,
    comprehensiveFallbackDeps,
    reportCore,
    { matrixSummary: options.matrixSummary }
  ) as Record<string, unknown>
  let sections: Record<string, unknown> = costOptimizedAiPath
    ? { ...deterministicFallbackSections }
    : {}
  let tokensUsed = 0
  const models = new Set<string>()
  let usedDeterministicFallback = false

  try {
    const liveSectionKeys = costOptimizedAiPath
      ? getCostOptimizedComprehensiveLiveSectionKeys()
      : COMPREHENSIVE_SECTION_KEYS
    for (const sectionKey of liveSectionKeys) {
      const anchor = sectionAnchors.get(sectionKey)
      const factPack = buildSectionFactPack(
        sectionKey,
        anchor,
        matrixReport,
        input,
        reportCore,
        signalSynthesis,
        strategyEngine,
        lang
      )
      const draftPrompt = buildSectionPrompt(sectionKey, factPack, lang, undefined, sectionMinChars)

      const draft = await callAIBackendGeneric<{ text: string }>(draftPrompt, lang, {
        userPlan: options.userPlan,
        maxTokensOverride: sectionTokenBudget,
        qualityTier: getAiQualityTier('base'),
        debugTag: `comprehensive.sectionDraft.${sectionKey}`,
      })
      tokensUsed += draft.tokensUsed || 0
      models.add(draft.model)
      const draftText = sanitizeSectionNarrative(draft.sections?.text || '')
      let sectionText = sanitizeTimingContradictionsExternal(
        postProcessSectionNarrative(draftText, sectionKey, lang),
        input
      )

      if (!costOptimizedAiPath) {
        const synthesisPrompt = buildSectionPrompt(
          sectionKey,
          factPack,
          lang,
          draftText,
          sectionMinChars
        )
        const synthesized = await callAIBackendGeneric<{ text: string }>(synthesisPrompt, lang, {
          userPlan: options.userPlan,
          maxTokensOverride: sectionTokenBudget,
          qualityTier: getAiQualityTier('base'),
          debugTag: `comprehensive.sectionSynthesis.${sectionKey}`,
        })
        tokensUsed += synthesized.tokensUsed || 0
        models.add(synthesized.model)
        sectionText = sanitizeTimingContradictionsExternal(
          postProcessSectionNarrative(synthesized.sections?.text || draftText, sectionKey, lang),
          input
        )
      }

      const quality = evaluateSectionGate(sectionText, factPack, sectionKey, containsBannedPhrase)
      if (!quality.pass && !costOptimizedAiPath) {
        const repairPrompt = [
          buildSectionPrompt(sectionKey, factPack, lang, sectionText, sectionMinChars),
          lang === 'ko'
            ? `?? ??: ? ???? ?? 3? ??, ?? ??? ?? 2? ??, ?? ?? ?? ??? ?? 2? ?? ???. ?? ?? ??? 40? ??? ??? ?? ??? ??? ???. current novelty=${quality.novelty}, specificity=${quality.specificity}, evidence=${quality.evidenceDensity}, avgLen=${Math.round(quality.avgSentenceLength)}, advice=${quality.adviceCount}, banned=${quality.banned}`
            : `Repair rules: add at least 3 new points, include at least 2 concrete nouns, and reflect at least 2 fact-pack points. Keep average sentence length under 40 chars and remove banned phrases. current novelty=${quality.novelty}, specificity=${quality.specificity}, evidence=${quality.evidenceDensity}, avgLen=${Math.round(quality.avgSentenceLength)}, advice=${quality.adviceCount}, banned=${quality.banned}`,
        ].join('\n')
        try {
          const repaired = await callAIBackendGeneric<{ text: string }>(repairPrompt, lang, {
            userPlan: options.userPlan,
            maxTokensOverride: sectionTokenBudget,
            qualityTier: getAiQualityTier('repair'),
            debugTag: `comprehensive.sectionRepair.${sectionKey}`,
          })
          tokensUsed += repaired.tokensUsed || 0
          models.add(repaired.model)
          sectionText = sanitizeTimingContradictionsExternal(
            postProcessSectionNarrative(repaired.sections?.text || sectionText, sectionKey, lang),
            input
          )
        } catch (error) {
          logger.warn('[AI Report] Section repair failed; keeping synthesized text', {
            section: sectionKey,
            error: error instanceof Error ? error.message : String(error),
          })
        }
      }

      sections[sectionKey] = sectionText
    }
  } catch (error) {
    usedDeterministicFallback = true
    const fallbackSections = buildComprehensiveFallbackSectionsExternal(
      input,
      matrixReport,
      deterministicCore,
      lang,
      comprehensiveFallbackDeps,
      reportCore,
      { matrixSummary: options.matrixSummary }
    )
    for (const sectionKey of COMPREHENSIVE_SECTION_KEYS) {
      sections[sectionKey] = fallbackSections[sectionKey]
    }
    logger.warn('[AI Report] Falling back to deterministic narrative sections', {
      error: error instanceof Error ? error.message : String(error),
      lang,
    })
  }

  const maxRepairPasses = getEffectiveMaxRepairPasses(options.userPlan)
  if (!usedDeterministicFallback && maxRepairPasses > 0) {
    const sectionPaths = [...COMPREHENSIVE_SECTION_KEYS] as string[]
    const crossPaths = sectionPaths.filter((path) => path !== 'conclusion')
    const timingPaths = ['timingAdvice', 'actionPlan', 'careerPath', 'wealthPotential']
    const minCharsPerSection =
      detailLevel === 'comprehensive'
        ? lang === 'ko'
          ? 600
          : 450
        : detailLevel === 'detailed'
          ? lang === 'ko'
            ? 420
            : 300
          : lang === 'ko'
            ? 280
            : 220
    const minTotalChars =
      detailLevel === 'comprehensive'
        ? lang === 'ko'
          ? 9000
          : 7000
        : detailLevel === 'detailed'
          ? lang === 'ko'
            ? 6200
            : 4600
          : lang === 'ko'
            ? 4200
            : 3200
    const minCrossCoverage = 0.75
    const minActionCoverage = 0.7
    const minEvidenceTripletCoverage = 0.68
    const minTimingCoverage = 0.55

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
    const evidenceTripletCoverageRatio = getCoverageRatioByPredicate(
      sections,
      crossPaths,
      hasEvidenceTriplet
    )
    const missingTimingPaths = getMissingPathsByPredicate(sections, timingPaths, hasTimingInText)
    const timingCoverageRatio = getCoverageRatioByPredicate(sections, timingPaths, hasTimingInText)
    const listStylePaths = getListStylePaths(sections, sectionPaths)
    const repetitivePaths = getRepetitivePaths(sections, sectionPaths)
    const totalChars = countSectionChars(sections)
    const needsRepair =
      shortPaths.length > 0 ||
      missingCross.length > 0 ||
      totalChars < minTotalChars ||
      crossCoverageRatio < minCrossCoverage ||
      actionCoverageRatio < minActionCoverage ||
      evidenceTripletCoverageRatio < minEvidenceTripletCoverage ||
      timingCoverageRatio < minTimingCoverage ||
      listStylePaths.length > 0 ||
      repetitivePaths.length > 0

    if (needsRepair && maxRepairPasses > 0) {
      const rewritePrompt = buildNarrativeRewritePrompt(lang, sections, {
        minCharsPerSection,
        minTotalChars,
        requiredTimingSections: timingPaths,
      })
      const repairPrompt = [
        rewritePrompt,
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
        timingCoverageRatio < minTimingCoverage
          ? buildTimingRepairInstruction(
              lang,
              timingCoverageRatio,
              minTimingCoverage,
              missingTimingPaths
            )
          : '',
        listStylePaths.length > 0 ? buildNarrativeStyleRepairInstruction(lang, listStylePaths) : '',
        repetitivePaths.length > 0 ? buildAntiRepetitionInstruction(lang, repetitivePaths) : '',
      ]
        .filter(Boolean)
        .join('\n')

      try {
        const repaired = await callAIBackendGeneric(repairPrompt, lang, {
          userPlan: options.userPlan,
          maxTokensOverride,
          qualityTier: getAiQualityTier('repair'),
          debugTag: 'comprehensive.globalRepair',
        })
        const candidateSections = repaired.sections as unknown
        if (isComprehensiveSectionsPayload(candidateSections)) {
          sections = candidateSections
        }
        tokensUsed = (tokensUsed || 0) + (repaired.tokensUsed || 0)
        models.add(repaired.model)

        const secondShortPaths = getShortSectionPaths(sections, sectionPaths, minCharsPerSection)
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
        const secondTimingCoverageRatio = getCoverageRatioByPredicate(
          sections,
          timingPaths,
          hasTimingInText
        )
        const secondTotalChars = countSectionChars(sections)
        if (
          maxRepairPasses > 1 &&
          (secondShortPaths.length > 0 ||
            secondTotalChars < minTotalChars ||
            secondCrossCoverageRatio < minCrossCoverage ||
            secondActionCoverageRatio < minActionCoverage ||
            secondEvidenceTripletCoverageRatio < minEvidenceTripletCoverage ||
            secondTimingCoverageRatio < minTimingCoverage)
        ) {
          const secondPrompt = [repairPrompt, buildSecondPassInstruction(lang)].join('\n')
          try {
            const second = await callAIBackendGeneric(secondPrompt, lang, {
              userPlan: options.userPlan,
              maxTokensOverride,
              qualityTier: getAiQualityTier('repair'),
              debugTag: 'comprehensive.globalRepair.second',
            })
            const secondCandidate = second.sections as unknown
            if (isComprehensiveSectionsPayload(secondCandidate)) {
              sections = secondCandidate
            }
            tokensUsed = (tokensUsed || 0) + (second.tokensUsed || 0)
            models.add(second.model)
          } catch (error) {
            logger.warn(
              '[AI Report] Second global repair pass failed; keeping first repaired result',
              {
                error: error instanceof Error ? error.message : String(error),
                plan: options.userPlan || 'free',
              }
            )
          }
        }
      } catch (error) {
        logger.warn('[AI Report] Global narrative repair failed; keeping section-wise result', {
          error: error instanceof Error ? error.message : String(error),
          plan: options.userPlan || 'free',
        })
      }
    }
  }

  const comprehensiveSectionPaths = [...COMPREHENSIVE_SECTION_KEYS] as string[]
  const comprehensiveEvidenceRefs = buildComprehensiveEvidenceRefs(signalSynthesis)
  if (!usedDeterministicFallback) {
    const evidenceCheck = validateEvidenceBinding(
      sections,
      comprehensiveSectionPaths,
      comprehensiveEvidenceRefs
    )
    if (evidenceCheck.needsRepair && maxRepairPasses > 0) {
      try {
        const repairPrompt = buildEvidenceBindingRepairPrompt(
          lang,
          sections,
          comprehensiveEvidenceRefs,
          evidenceCheck.violations
        )
        const repaired = await callAIBackendGeneric(repairPrompt, lang, {
          userPlan: options.userPlan,
          maxTokensOverride,
          qualityTier: getAiQualityTier('repair'),
          debugTag: 'comprehensive.evidenceRepair',
        })
        const candidate = repaired.sections as unknown
        if (isComprehensiveSectionsPayload(candidate)) {
          sections = candidate
        }
        tokensUsed = (tokensUsed || 0) + (repaired.tokensUsed || 0)
        models.add(repaired.model)
      } catch (error) {
        logger.warn('[AI Report] Evidence-binding repair failed; keeping current sections', {
          error: error instanceof Error ? error.message : String(error),
          plan: options.userPlan || 'free',
        })
      }
    }

    const finalEvidenceCheck = validateEvidenceBinding(
      sections,
      comprehensiveSectionPaths,
      comprehensiveEvidenceRefs
    )
    if (finalEvidenceCheck.needsRepair) {
      sections = enforceEvidenceBindingFallback(
        sections,
        finalEvidenceCheck.violations,
        comprehensiveEvidenceRefs,
        lang
      )
    }
  }
  sections = enforceEvidenceRefFooters(
    sections,
    comprehensiveSectionPaths,
    comprehensiveEvidenceRefs,
    lang
  )
  sections = sanitizeSectionsByPathsExternal(
    sections,
    comprehensiveSectionPaths,
    narrativePathSanitizerDeps
  )
  sections = sanitizeComprehensiveSectionsForUser(
    sections,
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
  sections = enforceEvidenceRefFooters(
    sections,
    comprehensiveSectionPaths,
    comprehensiveEvidenceRefs,
    lang
  )

  const model = usedDeterministicFallback ? 'deterministic-fallback' : [...models].join(' -> ')
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
    sectionPaths: comprehensiveSectionPaths,
    evidenceRefs: comprehensiveEvidenceRefs,
  })
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
  sections = enforceEvidenceRefFooters(
    sections as Record<string, unknown>,
    comprehensiveSectionPaths,
    comprehensiveEvidenceRefs,
    lang
  )
  let qualityMetrics = buildReportQualityMetrics(
    sections as Record<string, unknown>,
    comprehensiveSectionPaths,
    comprehensiveEvidenceRefs,
    {
      requiredPaths: comprehensiveSectionPaths,
      claims: unified.claims,
      anchors: unified.anchors,
      scenarioBundles: unified.scenarioBundles,
      timelineEvents: unified.timelineEvents,
      coreQuality: coreSeed.quality,
    }
  )
  if (shouldForceComprehensiveNarrativeFallback(qualityMetrics)) {
    sections = enforceComprehensiveNarrativeQualityFallback(
      sections as AIPremiumReport['sections'],
      reportCore,
      normalizedInput,
      lang
    )
    sections = enforceEvidenceRefFooters(
      sections as Record<string, unknown>,
      comprehensiveSectionPaths,
      comprehensiveEvidenceRefs,
      lang
    ) as AIPremiumReport['sections']
    qualityMetrics = buildReportQualityMetrics(
      sections as Record<string, unknown>,
      comprehensiveSectionPaths,
      comprehensiveEvidenceRefs,
      {
        requiredPaths: comprehensiveSectionPaths,
        claims: unified.claims,
        anchors: unified.anchors,
        scenarioBundles: unified.scenarioBundles,
        timelineEvents: unified.timelineEvents,
        coreQuality: coreSeed.quality,
      }
    )
  }
  recordReportQualityMetrics('comprehensive', model, qualityMetrics)

  sections = repairMalformedComprehensiveSections(
    sections as AIPremiumReport['sections'],
    reportCore,
    normalizedInput,
    lang
  ) as unknown as Record<string, unknown>
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
  outputSectionPaths = getComprehensiveRenderPaths(outputSections)
  outputSections = applyFinalReportStyle(outputSections, outputSectionPaths, lang, reportCore)
  outputSections = ensureFinalActionPlanGrounding(outputSections, lang, reportCore)
  outputSections = ensureFinalReportPolish(outputSections, lang, reportCore)
  outputSectionPaths = getComprehensiveRenderPaths(outputSections)
  qualityMetrics = buildReportQualityMetrics(
    outputSections as Record<string, unknown>,
    outputSectionPaths,
    comprehensiveEvidenceRefs,
    {
      requiredPaths: outputSectionPaths,
      claims: unified.claims,
      anchors: unified.anchors,
      scenarioBundles: unified.scenarioBundles,
      timelineEvents: unified.timelineEvents,
      coreQuality: coreSeed.quality,
    }
  )

  // 3. ??? ??
  const report: AIPremiumReport = {
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
    evidenceRefs: comprehensiveEvidenceRefs,
    evidenceRefsByPara: unified.evidenceRefsByPara,
    deterministicCore: attachDeterministicArtifacts(deterministicCore, unified),
    renderedMarkdown: [
      renderSectionsAsMarkdown(outputSections as Record<string, unknown>, outputSectionPaths, lang),
    ]
      .filter(Boolean)
      .join('\n\n'),
    renderedText: [
      renderProjectionBlocksAsText(
        buildReportOutputCoreFields(reportCore, lang).projections,
        lang,
        {
          matrixView: buildReportOutputCoreFields(reportCore, lang).matrixView,
          singleUserModel: buildReportOutputCoreFields(reportCore, lang).singleUserModel,
          branchSet: buildReportOutputCoreFields(reportCore, lang).branchSet,
          singleSubjectView: buildReportOutputCoreFields(reportCore, lang).singleSubjectView,
        }
      ),
      renderSectionsAsText(outputSections as Record<string, unknown>, outputSectionPaths, lang),
    ]
      .filter(Boolean)
      .join('\n\n'),

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
      modelUsed: model,
      tokensUsed,
      processingTime: Math.max(1, Date.now() - startTime),
      reportVersion: '1.0.0',
      qualityMetrics,
    },
  }

  return report
}
