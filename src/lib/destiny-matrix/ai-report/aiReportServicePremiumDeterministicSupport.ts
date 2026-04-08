// @ts-nocheck

function buildInterpretedTimingNarrative(interpretedAnswer, lang) {
  if (!interpretedAnswer) return ''
  const parts =
    lang === 'ko'
      ? [
          interpretedAnswer.timing?.bestWindow
            ? `강한 창은 ${interpretedAnswer.timing.bestWindow}입니다.`
            : '',
          interpretedAnswer.timing?.now || '',
          interpretedAnswer.timing?.next || '',
          interpretedAnswer.timing?.later || '',
        ]
      : [
          interpretedAnswer.timing?.bestWindow
            ? `The strongest window is ${interpretedAnswer.timing.bestWindow}.`
            : '',
          interpretedAnswer.timing?.now || '',
          interpretedAnswer.timing?.next || '',
          interpretedAnswer.timing?.later || '',
        ]

  return parts.filter(Boolean).join(' ').trim()
}

function buildDirectComprehensiveSectionFallbacks(
  reportCore,
  normalizedInput,
  lang,
  comprehensiveFallbackDeps,
  renderActionPlanSection
) {
  const introduction =
    String(
      comprehensiveFallbackDeps.renderIntroductionSection(reportCore, normalizedInput, lang) || ''
    ).trim() ||
    (lang === 'ko'
      ? `지금 흐름은 좋은 패가 손에 들어왔지만, 판의 순서를 먼저 세워야 결과가 남는 구간에 가깝습니다. 배경에서는 ${reportCore.focusDomain} 흐름이 움직이고, 실제로는 ${reportCore.actionFocusDomain || reportCore.focusDomain} 쪽에서 먼저 기준을 고정하는 편이 맞습니다.`
      : `This phase is less about speed and more about sequencing the board correctly before anything becomes final.`)

  const actionPlan =
    String(renderActionPlanSection(reportCore, normalizedInput, lang) || '').trim() ||
    (lang === 'ko'
      ? `이번 실행의 우선 행동은 ${reportCore.topDecisionLabel || reportCore.primaryAction}입니다. 먼저 역할과 범위를 적고, 확인 지점을 끼워 넣은 뒤에만 다음 단계를 확정하세요.`
      : `The current priority is ${reportCore.topDecisionLabel || reportCore.primaryAction}. Define scope first, add a review point, and only then move toward commitment.`)

  const conclusion =
    String(
      comprehensiveFallbackDeps.renderConclusionSection(reportCore, normalizedInput, lang) || ''
    ).trim() ||
    (lang === 'ko'
      ? `이번 총운의 결론은 단순합니다. 재능보다 운영이 결과를 가릅니다. 지금 차이를 만드는 건 기준을 세우는 순서와 확인의 리듬입니다.`
      : `The conclusion is simple: execution discipline matters more than raw talent in this phase.`)

  return { introduction, actionPlan, conclusion }
}

function reinforceComprehensiveSectionsWithInterpretedAnswer(
  sections,
  interpretedAnswer,
  lang,
  ensureFinalReportPolish,
  reportCore
) {
  if (!sections || !interpretedAnswer) return sections

  const directAnswer = String(interpretedAnswer.directAnswer || '').trim()
  const why = (interpretedAnswer.why || []).slice(0, 2).filter(Boolean).join(' ')
  const entry = (interpretedAnswer.conditions?.entry || []).slice(0, 2).filter(Boolean).join(', ')
  const abort = (interpretedAnswer.conditions?.abort || []).slice(0, 2).filter(Boolean).join(', ')
  const nextMove = String(interpretedAnswer.nextMove || '').trim()
  const branchSummary = String(interpretedAnswer.branches?.[0]?.summary || '').trim()
  const timingNarrative = buildInterpretedTimingNarrative(interpretedAnswer, lang)

  const reinforced =
    lang === 'ko'
      ? {
          ...sections,
          introduction: [
            String(sections.introduction || '').trim(),
            directAnswer && !String(sections.introduction || '').includes(directAnswer)
              ? `직접 답을 먼저 말하면, ${directAnswer}`
              : '',
          ]
            .filter(Boolean)
            .join(' ')
            .trim(),
          timingAdvice: [
            String(sections.timingAdvice || '').trim(),
            timingNarrative &&
            !String(sections.timingAdvice || '').includes(
              String(interpretedAnswer.timing?.bestWindow || '')
            )
              ? timingNarrative
              : '',
          ]
            .filter(Boolean)
            .join(' ')
            .trim(),
          actionPlan: [
            String(sections.actionPlan || '').trim(),
            why && !String(sections.actionPlan || '').includes(why) ? why : '',
            entry ? `착수 조건은 ${entry}입니다.` : '',
            abort ? `보류 조건은 ${abort}입니다.` : '',
            nextMove && !String(sections.actionPlan || '').includes(nextMove)
              ? `지금 다음 행동은 ${nextMove}`
              : '',
          ]
            .filter(Boolean)
            .join(' ')
            .trim(),
          conclusion: [
            String(sections.conclusion || '').trim(),
            branchSummary && !String(sections.conclusion || '').includes(branchSummary)
              ? `가장 현실적인 경로는 ${branchSummary}`
              : '',
            nextMove && !String(sections.conclusion || '').includes(nextMove)
              ? `결국 지금은 ${nextMove}`
              : '',
          ]
            .filter(Boolean)
            .join(' ')
            .trim(),
        }
      : {
          ...sections,
          introduction: [
            String(sections.introduction || '').trim(),
            directAnswer && !String(sections.introduction || '').includes(directAnswer)
              ? `Directly put, ${directAnswer}`
              : '',
          ]
            .filter(Boolean)
            .join(' ')
            .trim(),
          timingAdvice: [
            String(sections.timingAdvice || '').trim(),
            timingNarrative &&
            !String(sections.timingAdvice || '').includes(
              String(interpretedAnswer.timing?.bestWindow || '')
            )
              ? timingNarrative
              : '',
          ]
            .filter(Boolean)
            .join(' ')
            .trim(),
          actionPlan: [
            String(sections.actionPlan || '').trim(),
            why && !String(sections.actionPlan || '').includes(why) ? why : '',
            entry ? `Entry conditions: ${entry}.` : '',
            abort ? `Abort conditions: ${abort}.` : '',
            nextMove && !String(sections.actionPlan || '').includes(nextMove)
              ? `Next move: ${nextMove}`
              : '',
          ]
            .filter(Boolean)
            .join(' ')
            .trim(),
          conclusion: [
            String(sections.conclusion || '').trim(),
            branchSummary && !String(sections.conclusion || '').includes(branchSummary)
              ? `The most realistic branch is ${branchSummary}.`
              : '',
            nextMove && !String(sections.conclusion || '').includes(nextMove)
              ? `The next move is ${nextMove}`
              : '',
          ]
            .filter(Boolean)
            .join(' ')
            .trim(),
        }

  return ensureFinalReportPolish(reinforced, lang, reportCore)
}

function applyKoDomainSpecificComprehensivePolish(sections, reportCore) {
  if (!sections) return sections

  const domain = reportCore?.actionFocusDomain || reportCore?.focusDomain || 'life'
  const timingLeadByDomain = {
    career:
      '지금은 결론을 서두르기보다 역할 범위, 평가 기준, 협상 범위를 먼저 잠그는 편이 맞습니다.',
    relationship:
      '지금은 관계를 밀어붙이기보다 연락 간격, 기대치, 감정 속도를 먼저 맞추는 편이 맞습니다.',
    love: '지금은 관계를 밀어붙이기보다 연락 간격, 기대치, 감정 속도를 먼저 맞추는 편이 맞습니다.',
    wealth: '지금은 수익 확대보다 금액 기준, 손실 한도, 정산 순서를 먼저 고정하는 편이 맞습니다.',
    money: '지금은 수익 확대보다 금액 기준, 손실 한도, 정산 순서를 먼저 고정하는 편이 맞습니다.',
    health: '지금은 강행보다 수면, 식사 간격, 과부하 신호를 먼저 복구하는 편이 맞습니다.',
    move: '지금은 이동 결정보다 후보 지역, 출퇴근 시간, 생활비, 계약 조건을 먼저 비교하는 편이 맞습니다.',
    relocation:
      '지금은 이동 결정보다 후보 지역, 출퇴근 시간, 생활비, 계약 조건을 먼저 비교하는 편이 맞습니다.',
    life: '지금은 결론을 서두르기보다 기준과 순서를 먼저 고정하는 편이 맞습니다.',
  }
  const actionLeadByDomain = {
    career: '오늘은 지원·협상·보고 중 하나만 정하고, 역할 기준을 한 문장으로 남기세요.',
    relationship: '오늘은 감정 해석보다 관계 리듬과 경계를 한 문장으로 확인하세요.',
    love: '오늘은 감정 해석보다 관계 리듬과 경계를 한 문장으로 확인하세요.',
    wealth: '오늘은 늘릴 돈보다 새는 돈과 보류할 지출을 먼저 나누세요.',
    money: '오늘은 늘릴 돈보다 새는 돈과 보류할 지출을 먼저 나누세요.',
    health: '오늘은 회복 블록 하나를 먼저 확보하고, 몸이 꺾이는 신호를 기록하세요.',
    move: '오늘은 한 번에 정하지 말고 후보 두 곳의 생활 조건부터 표로 정리하세요.',
    relocation: '오늘은 한 번에 정하지 말고 후보 두 곳의 생활 조건부터 표로 정리하세요.',
    life: '오늘은 먼저 닫을 것과 보류할 것을 분리해 기준을 짧게 적어 두세요.',
  }

  const timingLead = timingLeadByDomain[domain] || timingLeadByDomain.life
  const actionLead = actionLeadByDomain[domain] || actionLeadByDomain.life
  const currentTiming = String(sections.timingAdvice || '').trim()
  const currentAction = String(sections.actionPlan || '').trim()

  return {
    ...sections,
    timingAdvice: [timingLead, currentTiming].filter(Boolean).join(' ').trim(),
    actionPlan: [actionLead, currentAction].filter(Boolean).join(' ').trim(),
  }
}

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
  recordReportQualityMetrics('comprehensive', finalModelUsed, qualityMetrics, 'draft')
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
  if (!String(outputSections.conclusion || '').trim()) {
    outputSections.conclusion = comprehensiveFallbackDeps.renderConclusionSection(
      reportCore,
      normalizedInput,
      lang
    )
  }
  const reportOutputCoreFields = buildReportOutputCoreFields(reportCore, lang)
  outputSections = reinforceComprehensiveSectionsWithInterpretedAnswer(
    outputSections,
    reportOutputCoreFields.interpretedAnswer,
    lang,
    ensureFinalReportPolish,
    reportCore
  )
  if (lang === 'ko') {
    outputSections = applyKoDomainSpecificComprehensivePolish(outputSections, reportCore)
    outputSections = ensureFinalReportPolish(outputSections, lang, reportCore)
  }
  const directFallbacks = buildDirectComprehensiveSectionFallbacks(
    reportCore,
    normalizedInput,
    lang,
    comprehensiveFallbackDeps,
    renderActionPlanSection
  )
  if (!String(outputSections.introduction || '').trim()) {
    outputSections.introduction = directFallbacks.introduction
  }
  if (!String(outputSections.actionPlan || '').trim()) {
    outputSections.actionPlan = directFallbacks.actionPlan
  }
  if (!String(outputSections.conclusion || '').trim()) {
    outputSections.conclusion = directFallbacks.conclusion
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
  recordReportQualityMetrics('comprehensive', finalModelUsed, qualityMetrics, 'final')

  return {
    id: `air_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    generatedAt,
    lang,
    ...reportOutputCoreFields,
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
