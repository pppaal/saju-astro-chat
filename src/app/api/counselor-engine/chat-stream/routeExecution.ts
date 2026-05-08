import type { CombinedResult } from '@/lib/counselor/astrology'
import { ErrorCodes, type ErrorCode } from '@/lib/api/errorHandler'
import { isValidDate, isValidLatitude, isValidLongitude, isValidTime } from '@/lib/validation'
import { logger } from '@/lib/logger'
import { buildFortuneWithIcpSection } from '@/lib/prompts/fortuneWithIcp'
import { formatCounselorEvidencePacket } from '@/lib/matrix/counselorEvidence'
import {
  buildInterpretedAnswerContract,
  evaluateInterpretedAnswerQuality,
  type InterpretedAnswerQualityResult,
} from '@/lib/matrix/interpretedAnswer'
import { persistDestinyPredictionSnapshot } from '@/lib/matrix/predictionSnapshot'
import type {
  DestinyReliabilityBand,
  DestinyTimingConflictMode,
  DestinyTimingGranularity,
  DestinyTimingWindow,
} from '@/lib/matrix/core/logging'
import { clampMessages, counselorSystemPrompt } from './lib/helpers'
import { loadPersonaMemory, loadUserProfile, type ProfileLoadResult } from './lib/profileLoader'
import { appendUserUtteranceToRecall } from '@/lib/ai/personaMemoryRecall'
import { buildCVCounselorContextKo } from '@/lib/ai/cvSajuCross'
import { calculateChartData } from './lib/chart-calculator'
import {
  buildContextSections,
  buildPredictionSection,
  buildLongTermMemorySection,
} from './lib/context-builder'
import {
  analyzeCounselorQuestion,
  buildCounselingStructureGuide,
  describeQuestionAnalysis,
  mapFocusDomainToTheme,
} from './lib/focusDomain'
import { assembleFinalPromptSplit } from './builders/promptAssembly'
import type { AstroDataStructure, SajuDataStructure } from './lib/types'
import {
  buildCompactPromptSections,
  buildMatrixProfileSection,
  mapFocusDomainToPromptTheme,
} from './routePromptSupport'
import {
  encodeCounselorUiEvidence,
  ensureAdvancedAstroData,
  fetchMatrixSnapshot,
} from './routeMatrixSnapshot'
import type { DestinyMapChatStreamInput } from './lib/validation'

export interface EffectiveCounselorInputs {
  name?: string
  effectiveBirthDate: string
  effectiveBirthTime: string
  effectiveLatitude: number
  effectiveLongitude: number
  effectiveGender: 'male' | 'female'
  effectiveSaju?: SajuDataStructure
  effectiveAstro?: AstroDataStructure
  advancedAstro?: Partial<CombinedResult>
  effectiveTheme: string
  lang: 'ko' | 'en'
  trimmedHistory: DestinyMapChatStreamInput['messages']
  lastUserContent?: string
  predictionContext?: Record<string, unknown>
  userContext?: Record<string, unknown>
  cvText?: string
  counselingBrief?: DestinyMapChatStreamInput['counselingBrief']
  questionAnalysis: ReturnType<typeof analyzeCounselorQuestion>
}

export interface EffectiveCounselorInputError {
  code: ErrorCode
  message: string
}

export async function resolveEffectiveCounselorInputs(params: {
  validated: DestinyMapChatStreamInput
  userId?: string | null
}): Promise<{ data?: EffectiveCounselorInputs; error?: EffectiveCounselorInputError }> {
  const { validated, userId } = params
  const {
    name,
    birthDate,
    birthTime,
    gender,
    latitude,
    longitude,
    theme,
    lang,
    messages,
    saju,
    astro,
    advancedAstro,
    predictionContext,
    userContext: _userContext,
    cvText,
    counselingBrief,
  } = validated

  const trimmedHistory = clampMessages(messages)
  const lastUser = [...trimmedHistory].reverse().find((m) => m.role === 'user')
  const questionAnalysis = analyzeCounselorQuestion({
    lastUserMessage: lastUser?.content,
    theme,
  })
  const inferredTheme = mapFocusDomainToTheme(questionAnalysis.primaryDomain)
  const effectiveTheme = theme === 'chat' ? inferredTheme : theme

  let effectiveBirthDate = birthDate || ''
  let effectiveBirthTime = birthTime || ''
  let effectiveLatitude = latitude || 0
  let effectiveLongitude = longitude || 0
  let effectiveGender: 'male' | 'female' = gender
  let effectiveSaju = saju
  let effectiveAstro = astro

  const needsProfileLoad = userId && (!birthDate || !birthTime || !latitude || !longitude)

  if (needsProfileLoad) {
    try {
      const profileResult: ProfileLoadResult = await loadUserProfile(
        userId,
        birthDate,
        birthTime,
        latitude,
        longitude,
        saju as SajuDataStructure | undefined,
        astro as AstroDataStructure | undefined
      )
      if (profileResult.saju) effectiveSaju = profileResult.saju
      if (profileResult.astro) effectiveAstro = profileResult.astro
      if (profileResult.birthDate) effectiveBirthDate = profileResult.birthDate
      if (profileResult.birthTime) effectiveBirthTime = profileResult.birthTime
      if (profileResult.latitude) effectiveLatitude = profileResult.latitude
      if (profileResult.longitude) effectiveLongitude = profileResult.longitude
      if (profileResult.gender === 'male' || profileResult.gender === 'female') {
        effectiveGender = profileResult.gender
      }
    } catch (profileError) {
      logger.warn('[chat-stream] Failed to load user profile, proceeding with provided data', {
        userId,
        error: profileError instanceof Error ? profileError.message : 'Unknown error',
      })
    }
  }

  if (!effectiveBirthDate || !isValidDate(effectiveBirthDate)) {
    return { error: { code: ErrorCodes.INVALID_DATE, message: 'Invalid or missing birthDate' } }
  }
  if (!effectiveBirthTime || !isValidTime(effectiveBirthTime)) {
    return { error: { code: ErrorCodes.INVALID_TIME, message: 'Invalid or missing birthTime' } }
  }
  if (!isValidLatitude(effectiveLatitude)) {
    return { error: { code: ErrorCodes.VALIDATION_ERROR, message: 'Invalid or missing latitude' } }
  }
  if (!isValidLongitude(effectiveLongitude)) {
    return { error: { code: ErrorCodes.VALIDATION_ERROR, message: 'Invalid or missing longitude' } }
  }

  return {
    data: {
      name,
      effectiveBirthDate,
      effectiveBirthTime,
      effectiveLatitude,
      effectiveLongitude,
      effectiveGender,
      effectiveSaju: effectiveSaju as SajuDataStructure | undefined,
      effectiveAstro: effectiveAstro as AstroDataStructure | undefined,
      advancedAstro: advancedAstro as Partial<CombinedResult> | undefined,
      effectiveTheme,
      lang,
      trimmedHistory,
      lastUserContent: lastUser?.content,
      predictionContext,
      userContext: _userContext,
      cvText,
      counselingBrief,
      questionAnalysis,
    },
  }
}

type PredictionPacket = {
  focusDomain?: string
  actionFocusDomain?: string
  strategyBrief?: {
    overallPhase?: string
    overallPhaseLabel?: string
  }
  canonicalBrief?: {
    topDecisionId?: string
    topDecisionAction?: string
    topDecisionLabel?: string
  }
  topTimingWindow?: {
    window?: DestinyTimingWindow
    timingGranularity?: DestinyTimingGranularity
    precisionReason?: string
    timingConflictMode?: DestinyTimingConflictMode
    timingConflictNarrative?: string
    readinessScore?: number
    triggerScore?: number
    convergenceScore?: number
    timingReliabilityScore?: number
    timingReliabilityBand?: DestinyReliabilityBand
  }
  verdictLead?: string
} | null

export interface PreparedCounselorExecution {
  lang: 'ko' | 'en'
  promptTheme: string
  /** 합쳐진 단일 문자열 (호환용). */
  chatPrompt: string
  /** prompt-caching용 — 멀티턴에 안정적인 system + 차트 컨텍스트 + sections. */
  chatPromptCachedContext: string
  /** prompt-caching용 — 매 턴 바뀌는 history + 새 질문. */
  chatPromptDynamicTail: string
  counselorUiEvidence: string
  predictionId: string | null
  isStrictMatrixFailure: boolean
  backendSaju?: SajuDataStructure
  backendAstro?: AstroDataStructure
  interpretedAnswerQuality?: InterpretedAnswerQualityResult | null
}

export async function prepareCounselorExecution(params: {
  req: Request
  userId?: string | null
  inputs: EffectiveCounselorInputs
  strictMatrixEnabled: boolean
}): Promise<PreparedCounselorExecution> {
  const { req, userId, inputs, strictMatrixEnabled } = params
  const {
    name,
    effectiveBirthDate,
    effectiveBirthTime,
    effectiveLatitude,
    effectiveLongitude,
    effectiveGender,
    effectiveSaju,
    effectiveAstro,
    advancedAstro,
    effectiveTheme,
    lang,
    trimmedHistory,
    lastUserContent,
    predictionContext,
    userContext: _userContext,
    cvText,
    counselingBrief,
    questionAnalysis,
  } = inputs

  let personaMemoryContext = ''
  let recentSessionSummaries = ''
  if (userId) {
    // (Tier 2A) 이번 사용자 발화를 recall에 누적 (질문·결정 verbatim 추출)
    if (lastUserContent) {
      // fire-and-forget — recall append 실패가 메인 응답을 막지 않게
      appendUserUtteranceToRecall(userId, lastUserContent).catch(() => {})
    }
    const memoryResult = await loadPersonaMemory(userId, effectiveTheme, lang)
    personaMemoryContext = memoryResult.personaMemoryContext
    recentSessionSummaries = memoryResult.recentSessionSummaries
  }

  const chartResult = await calculateChartData(
    {
      birthDate: effectiveBirthDate,
      birthTime: effectiveBirthTime,
      gender: effectiveGender,
      latitude: effectiveLatitude,
      longitude: effectiveLongitude,
    },
    effectiveSaju,
    effectiveAstro
  )

  const finalSaju = chartResult.saju
  const finalAstro = chartResult.astro
  const { natalChartData, currentTransits } = chartResult
  const enrichedAdvancedAstro = await ensureAdvancedAstroData({
    name,
    birthDate: effectiveBirthDate,
    birthTime: effectiveBirthTime,
    gender: effectiveGender,
    latitude: effectiveLatitude,
    longitude: effectiveLongitude,
    theme: effectiveTheme,
    advancedAstro,
  })

  const contextSections = buildContextSections({
    saju: finalSaju,
    astro: finalAstro,
    advancedAstro: enrichedAdvancedAstro,
    natalChartData,
    currentTransits,
    birthDate: effectiveBirthDate,
    gender: effectiveGender,
    theme: effectiveTheme,
    lang,
    trimmedHistory,
    lastUserMessage: lastUserContent,
    // ⭐ 통합엔진 풍부 advice — LLM 이 fullInsights 받음
    unified: chartResult.unified,
  })

  // CV × 사주 cross — counselor가 사용자 실제 경력 데이터를 사주와 묶어 reference
  if (cvText && finalSaju) {
    try {
      const cvCross = buildCVCounselorContextKo(cvText, {
        geokguk: (finalSaju as { geokguk?: string }).geokguk,
        sibsinDistribution: (finalSaju as { sibsinDistribution?: Record<string, number> }).sibsinDistribution,
        shinsalList: (finalSaju as { shinsalList?: string[] }).shinsalList,
        dayMasterElement: (finalSaju as { dayMaster?: { element?: string } }).dayMaster?.element,
      })
      if (cvCross) {
        personaMemoryContext = personaMemoryContext
          ? `${personaMemoryContext}\n\n${cvCross}`
          : cvCross
      }
    } catch {
      // CV cross 실패가 메인 응답을 막지 않게
    }
  }

  const predictionSection = buildPredictionSection(predictionContext, lang)
  const longTermMemorySection = buildLongTermMemorySection(
    personaMemoryContext,
    recentSessionSummaries,
    lang
  )
  const matrixSnapshot = await fetchMatrixSnapshot({
    birthDate: effectiveBirthDate,
    birthTime: effectiveBirthTime,
    gender: effectiveGender,
    latitude: effectiveLatitude,
    longitude: effectiveLongitude,
    lang,
    saju: finalSaju,
    astro: finalAstro,
    natalChartData,
    advancedAstro: enrichedAdvancedAstro,
    currentTransits,
    theme: effectiveTheme,
    focusDomain: questionAnalysis.primaryDomain,
    questionText: lastUserContent,
    needsPreciseTiming: questionAnalysis.needsTimingGuidance,
  })

  if (strictMatrixEnabled && !matrixSnapshot) {
    return {
      lang,
      promptTheme: effectiveTheme,
      chatPrompt: '',
      chatPromptCachedContext: '',
      chatPromptDynamicTail: '',
      counselorUiEvidence: '',
      predictionId: null,
      isStrictMatrixFailure: true,
      backendSaju: finalSaju,
      backendAstro: finalAstro,
      interpretedAnswerQuality: null,
    }
  }

  const coreCounselorPacket = matrixSnapshot?.core?.counselorEvidence || null
  const coreFocusDomain = coreCounselorPacket?.focusDomain || questionAnalysis.primaryDomain || null
  const promptTheme = mapFocusDomainToPromptTheme(coreFocusDomain, effectiveTheme)
  const sessionId = req.headers.get('x-session-id') || undefined
  const canonicalCounselorSection = formatCounselorEvidencePacket(
    coreCounselorPacket as Parameters<typeof formatCounselorEvidencePacket>[0],
    lang === 'ko' ? 'ko' : 'en'
  )
  const matrixProfileSection = buildMatrixProfileSection(
    matrixSnapshot,
    lang,
    promptTheme,
    questionAnalysis
  )
  const counselorUiEvidence = encodeCounselorUiEvidence(matrixSnapshot, lang) || ''
  const predictionPacket = coreCounselorPacket as PredictionPacket
  const interpretedAnswer = buildInterpretedAnswerContract({
    packet: coreCounselorPacket as Parameters<typeof buildInterpretedAnswerContract>[0]['packet'],
    frame: questionAnalysis.frame,
    primaryDomain: questionAnalysis.primaryDomain,
  })
  const interpretedAnswerQuality = evaluateInterpretedAnswerQuality(interpretedAnswer)
  const predictionId = await persistDestinyPredictionSnapshot({
    userId,
    service: 'counselor',
    lang: lang === 'ko' ? 'ko' : 'en',
    theme: promptTheme,
    sessionId,
    questionText: lastUserContent,
    focusDomain: predictionPacket?.focusDomain,
    actionFocusDomain: predictionPacket?.actionFocusDomain,
    phase: predictionPacket?.strategyBrief?.overallPhase,
    phaseLabel: predictionPacket?.strategyBrief?.overallPhaseLabel,
    topDecisionId: predictionPacket?.canonicalBrief?.topDecisionId,
    topDecisionAction: predictionPacket?.canonicalBrief?.topDecisionAction,
    topDecisionLabel: predictionPacket?.canonicalBrief?.topDecisionLabel,
    timingWindow: predictionPacket?.topTimingWindow?.window,
    timingGranularity: predictionPacket?.topTimingWindow?.timingGranularity,
    precisionReason: predictionPacket?.topTimingWindow?.precisionReason,
    timingConflictMode: predictionPacket?.topTimingWindow?.timingConflictMode,
    timingConflictNarrative: predictionPacket?.topTimingWindow?.timingConflictNarrative,
    readinessScore: predictionPacket?.topTimingWindow?.readinessScore,
    triggerScore: predictionPacket?.topTimingWindow?.triggerScore,
    convergenceScore: predictionPacket?.topTimingWindow?.convergenceScore,
    timingReliabilityScore: predictionPacket?.topTimingWindow?.timingReliabilityScore,
    timingReliabilityBand: predictionPacket?.topTimingWindow?.timingReliabilityBand,
    predictionClaim: predictionPacket?.verdictLead || canonicalCounselorSection,
  })
  const questionAnalysisSection = describeQuestionAnalysis(
    questionAnalysis,
    lang === 'ko' ? 'ko' : 'en'
  )
  const counselingStructureGuide = buildCounselingStructureGuide(
    questionAnalysis,
    lang === 'ko' ? 'ko' : 'en'
  )

  const themeDescriptions: Record<string, { ko: string; en: string }> = {
    love: { ko: '연애/결혼/배우자 질문', en: 'Love, marriage, partner questions' },
    career: { ko: '커리어/직업/사업 질문', en: 'Career, job, business questions' },
    wealth: { ko: '재정/투자/돈 관련 질문', en: 'Money, investment, finance questions' },
    health: { ko: '건강/회복/컨디션 질문', en: 'Health, wellness questions' },
    family: { ko: '가족/대인관계 질문', en: 'Family, relationships questions' },
    today: { ko: '오늘 운세 질문', en: "Today's fortune and advice" },
    month: { ko: '이번 달 운세 질문', en: "This month's fortune" },
    year: { ko: '올해 운세 질문', en: "This year's fortune" },
    life: { ko: '인생 전반/총운 질문', en: 'Life overview, general counseling' },
    chat: { ko: '자유 주제 상담', en: 'Free topic counseling' },
  }
  const themeDesc = themeDescriptions[promptTheme] || themeDescriptions.chat
  const themeContext =
    lang === 'ko'
      ? [
          `요청 원본 테마: ${effectiveTheme}`,
          coreFocusDomain ? `현재 코어 초점 도메인: ${coreFocusDomain}` : '',
          `실제 응답 축: ${promptTheme} (${themeDesc.ko})`,
          '질문에 직접 답하고, 코어 초점과 맞는 근거를 우선 사용하세요.',
        ]
          .filter(Boolean)
          .join('\n')
      : [
          `Requested theme: ${effectiveTheme}`,
          coreFocusDomain ? `Current core focus domain: ${coreFocusDomain}` : '',
          `Primary answer track: ${promptTheme} (${themeDesc.en})`,
          'Answer the question first and prioritize evidence aligned with the core focus.',
        ]
          .filter(Boolean)
          .join('\n')

  const fortuneIcpSection = buildFortuneWithIcpSection(counselingBrief, lang)

  // Headings MUST match the canonical 4-section contract enforced by
  // `normalizeCounselorResponse` and `applyCounselorBrandVoice`. Any other
  // heading set causes the validator to discard the model output and fall
  // back to a generic template — i.e. the user sees a non-answer.
  const responseDensityContract =
    lang === 'ko'
      ? [
          '[Response Contract: Projection-first]',
          '- 첫 1~2문장에서 사용자 질문에 직접 답부터 말하세요.',
          '- 첫 1~2문장 안에 Opening Rationale의 핵심 두 줄을 흡수해서, 왜 이런 결론인지 바로 드러내세요.',
          '- 헤딩은 정확히 이 네 개만, 이 순서대로 사용하세요: "## 한 줄 결론", "## 근거", "## 실행 계획", "## 주의/재확인".',
          '- 다른 헤딩(직접 답, 구조와 상황, 타이밍과 충돌, 리스크와 재확인 등)은 절대 쓰지 마세요. 정확히 위 네 헤딩만 사용해야 합니다.',
          '- "## 한 줄 결론"은 1~2문장으로, 사용자 질문에 직접 답하세요.',
          '- "## 근거"에서는 구조(structure_detail/driver)와 타이밍(timing_detail/driver/counterweight/next)을 자연어로 묶어 2~4문장 또는 불릿 2~3개로 풀어쓰세요. readiness/trigger/convergence는 자연어로 번역하세요.',
          '- "## 실행 계획"에서는 action_detail과 action_next를 바탕으로 다음 행동을 2~3개 단정하게 정리하세요.',
          '- "## 주의/재확인"에서는 risk_detail과 risk_counterweight를 바탕으로 과속·지속성·검증 리스크와 재확인 항목을 1~2개 적으세요.',
          '- 기술적 신호 이름은 그대로 던지지 말고 자연어로 번역하세요.',
          '- "중심축/행동축/리스크축" 같은 엔진 용어를 그대로 쓰지 말고, "삶의 배경 흐름", "지금 먼저 움직여야 할 영역", "가장 조심해야 할 변수"처럼 사람말로 바꾸세요.',
          '- 답변 마지막에 "사주에서는", "점성에서는", "타이밍은" 같은 메타 요약 꼬리를 따로 덧붙이지 마세요.',
          '- 최종 답변은 상담문으로 끝내고, 내부 근거 요약이나 엔진 설명 꼬리를 붙이지 마세요.',
          '- 문단끼리 문장을 반복하지 마세요. 각 섹션은 새로운 정보를 추가해야 합니다.',
          '- projection summary는 fallback 용도로만 쓰고, detail/driver/counterweight/next lines를 우선 사용하세요.',
          '- 일반론, 자기계발체, 추상 격려 문장을 피하세요.',
          '- 최종 결론은 core phase / top claims / cautions와 맞아야 합니다.',
          '- 총 분량은 650~1100자 정도로 유지하세요.',
        ].join('\n')
      : [
          '[Response Contract: Projection-first]',
          "- Answer the user's question directly within the first two sentences.",
          '- In those first two sentences, absorb the two Opening Rationale lines so the user immediately sees why this conclusion is being made.',
          '- Use exactly these four headings, in this order: "## Direct Answer", "## Evidence", "## Action Plan", "## Avoid / Recheck".',
          '- Do not use any other headings (Structure and Situation, Timing and Tension, Risk and Recheck, etc.). Only the four headings above are allowed.',
          '- In "## Direct Answer", give 1-2 sentences answering the question directly.',
          '- In "## Evidence", weave structure (structure_detail/driver) and timing (timing_detail/driver/counterweight/next) into 2-4 sentences or 2-3 bullets, and translate readiness/trigger/convergence into natural language.',
          '- In "## Action Plan", use action_detail and action_next to state the next 2-3 moves assertively.',
          '- In "## Avoid / Recheck", use risk_detail and risk_counterweight to call out 1-2 overreach/persistence/verification risks and recheck items.',
          '- Translate technical signals into natural language instead of dumping jargon.',
          '- Do not expose engine terms like focus/action/risk axis directly; rewrite them as background flow, live priority, and main risk in plain language.',
          '- Do not repeat sentences across sections; each section must add a new piece of information.',
          '- Treat projection summaries as fallback only; prefer detail/driver/counterweight/next lines.',
          '- Avoid generic encouragement and abstract self-help phrasing.',
          '- Final verdict must align with core phase / top claims / cautions.',
          '- Keep total length around 170-280 words.',
        ].join('\n')

  const compactSections = buildCompactPromptSections({
    contextSections,
    longTermMemorySection,
    predictionSection,
    theme: promptTheme,
  })

  const baseContext = [
    responseDensityContract,
    `Name: ${name || 'User'}`,
    questionAnalysisSection,
    counselingStructureGuide,
    canonicalCounselorSection,
    themeContext,
    fortuneIcpSection,
    matrixProfileSection,
  ]
    .filter(Boolean)
    .join('\n\n')

  const split = assembleFinalPromptSplit({
    systemPrompt: counselorSystemPrompt(lang),
    baseContext,
    memoryContext: '',
    sections: compactSections,
    messages: trimmedHistory.filter((m) => m.role !== 'system'),
    userQuestion: contextSections.userQuestion,
  })
  const chatPrompt = [split.cachedContext, split.dynamicTail].filter(Boolean).join('\n\n')

  return {
    lang,
    promptTheme,
    chatPrompt,
    chatPromptCachedContext: split.cachedContext,
    chatPromptDynamicTail: split.dynamicTail,
    counselorUiEvidence,
    predictionId,
    isStrictMatrixFailure: false,
    backendSaju: finalSaju,
    backendAstro: finalAstro,
    interpretedAnswerQuality,
  }
}
