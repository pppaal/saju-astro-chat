import type { CombinedResult } from '@/lib/destiny-map/astrologyengine'
import { ErrorCodes, type ErrorCode } from '@/lib/api/errorHandler'
import { isValidDate, isValidLatitude, isValidLongitude, isValidTime } from '@/lib/validation'
import { logger } from '@/lib/logger'
import { buildFortuneWithIcpSection } from '@/lib/prompts/fortuneWithIcp'
import { formatCounselorEvidencePacket } from '@/lib/destiny-matrix/counselorEvidence'
import { persistDestinyPredictionSnapshot } from '@/lib/destiny-matrix/predictionSnapshot'
import type {
  DestinyReliabilityBand,
  DestinyTimingConflictMode,
  DestinyTimingGranularity,
  DestinyTimingWindow,
} from '@/lib/destiny-matrix/core/logging'
import { clampMessages, counselorSystemPrompt } from './lib/helpers'
import { loadPersonaMemory, loadUserProfile, type ProfileLoadResult } from './lib/profileLoader'
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
import { assembleFinalPrompt } from './builders/promptAssembly'
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
    cvText: _cvText,
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
      cvText: _cvText,
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
  chatPrompt: string
  counselorUiEvidence: string
  predictionId: string | null
  isStrictMatrixFailure: boolean
  backendSaju?: SajuDataStructure
  backendAstro?: AstroDataStructure
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
    cvText: _cvText,
    counselingBrief,
    questionAnalysis,
  } = inputs

  let personaMemoryContext = ''
  let recentSessionSummaries = ''
  if (userId) {
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
  })

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
  })

  if (strictMatrixEnabled && !matrixSnapshot) {
    return {
      lang,
      promptTheme: effectiveTheme,
      chatPrompt: '',
      counselorUiEvidence: '',
      predictionId: null,
      isStrictMatrixFailure: true,
      backendSaju: finalSaju,
      backendAstro: finalAstro,
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
  const matrixProfileSection = buildMatrixProfileSection(matrixSnapshot, lang, promptTheme)
  const counselorUiEvidence = encodeCounselorUiEvidence(matrixSnapshot, lang) || ''
  const predictionPacket = coreCounselorPacket as PredictionPacket
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

  const responseDensityContract =
    lang === 'ko'
      ? [
          '[Response Contract: Projection-first]',
          '- 첫 1~2문장에서 직접 답부터 말하세요.',
          '- 첫 1~2문장 안에 Opening Rationale의 핵심 두 줄을 흡수해서, 왜 이런 결론인지 바로 드러내세요.',
          '- 아래 순서를 유지하세요: "## 직접 답", "## 구조와 상황", "## 타이밍과 충돌", "## 실행", "## 리스크와 재확인".',
          '- 불릿 남발보다 짧은 문단을 우선하세요.',
          '- 각 문단은 2~4문장으로 유지하고, 문단 역할을 섞지 마세요.',
          '- "구조와 상황"에서는 structure_detail과 structure_driver를 먼저 쓰고, summary는 보조로만 사용하세요.',
          '- "타이밍과 충돌"에서는 timing_detail, timing_driver, timing_counterweight, timing_next를 먼저 쓰고 readiness/trigger/convergence를 자연어로 풀어 쓰세요.',
          '- "실행"에서는 action_detail과 action_next를 먼저 쓰고, 실제 다음 행동을 2~3문장으로 단정하게 정리하세요.',
          '- "리스크와 재확인"에서는 risk_detail과 risk_counterweight를 먼저 쓰고, 과속·지속성·검증 리스크를 분명히 적으세요.',
          '- 기술적 신호 이름은 그대로 던지지 말고 자연어로 번역하세요.',
          '- "중심축/행동축/리스크축" 같은 엔진 용어를 그대로 쓰지 말고, "삶의 배경 흐름", "지금 먼저 움직여야 할 영역", "가장 조심해야 할 변수"처럼 사람말로 바꾸세요.',
          '- 답변 마지막에 "사주에서는", "점성에서는", "타이밍은" 같은 메타 요약 꼬리를 따로 덧붙이지 마세요.',
          '- 최종 답변은 상담문으로 끝내고, 내부 근거 요약이나 엔진 설명 꼬리를 붙이지 마세요.',
          '- 문단끼리 문장을 반복하지 마세요. 각 문단은 새로운 정보를 추가해야 합니다.',
          '- projection summary는 fallback 용도로만 쓰고, detail/driver/counterweight/next lines를 우선 사용하세요.',
          '- 일반론, 자기계발체, 추상 격려 문장을 피하세요.',
          '- 최종 결론은 core phase / top claims / cautions와 맞아야 합니다.',
          '- 총 분량은 650~1100자 정도로 유지하세요.',
        ].join('\n')
      : [
          '[Response Contract: Projection-first]',
          '- Answer the user question directly within the first two sentences.',
          '- In those first two sentences, absorb the two Opening Rationale lines so the user immediately sees why this conclusion is being made.',
          '- Use headings in this exact order: "## Direct Answer", "## Structure and Situation", "## Timing and Tension", "## Action Plan", "## Risk and Recheck".',
          '- Prefer short paragraphs over bullet dumping.',
          '- Keep each section to 2-4 sentences and do not mix section roles.',
          '- In "Structure and Situation", use structure_detail and structure_driver first; use summary only as backup.',
          '- In "Timing and Tension", use timing_detail, timing_driver, timing_counterweight, and timing_next first; translate readiness, trigger, convergence, and timing conflict into natural language.',
          '- In "Action Plan", use action_detail and action_next first, then state the next move in 2-3 assertive sentences.',
          '- In "Risk and Recheck", use risk_detail and risk_counterweight first, then state overreach, persistence, and verification risk clearly.',
          '- Translate technical signals into natural language instead of dumping jargon.',
          '- Do not expose engine terms like focus/action/risk axis directly; rewrite them as background flow, live priority, and main risk in plain language.',
          '- Do not repeat sentences across sections; each paragraph must add a new piece of information.',
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

  const chatPrompt = assembleFinalPrompt({
    systemPrompt: counselorSystemPrompt(lang),
    baseContext,
    memoryContext: '',
    sections: compactSections,
    messages: trimmedHistory.filter((m) => m.role !== 'system'),
    userQuestion: contextSections.userQuestion,
  })

  return {
    lang,
    promptTheme,
    chatPrompt,
    counselorUiEvidence,
    predictionId,
    isStrictMatrixFailure: false,
    backendSaju: finalSaju,
    backendAstro: finalAstro,
  }
}
