import type { CombinedResult } from '@/lib/destiny-map/astrology'
import { ErrorCodes, type ErrorCode } from '@/lib/api/errorHandler'
import { isValidDate, isValidLatitude, isValidLongitude, isValidTime } from '@/lib/validation'
import { logger } from '@/lib/logger'
import { buildFortuneWithIcpSection } from '@/lib/prompts/fortuneWithIcp'
import { formatCounselorEvidencePacket } from '@/lib/destiny-matrix/counselorEvidence'
import {
  buildInterpretedAnswerContract,
  evaluateInterpretedAnswerQuality,
  type InterpretedAnswerQualityResult,
} from '@/lib/destiny-matrix/interpretedAnswer'
import { persistDestinyPredictionSnapshot } from '@/lib/destiny-matrix/predictionSnapshot'
import type {
  DestinyReliabilityBand,
  DestinyTimingConflictMode,
  DestinyTimingGranularity,
  DestinyTimingWindow,
} from '@/lib/destiny-matrix/core/logging'
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
import { assembleFinalPrompt } from './builders/promptAssembly'
import { buildPillarTableSection } from './builders/pillarTableBuilder'
import { buildCrossRulesSection } from './builders/crossRulesBuilder'
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
  chatPrompt: string
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
  })

  // 사주 4기둥 테이블 (지장간 + 십신 + 12운성 + 신살) — 사주 결과 페이지가 보여주는
  // 그 테이블을 그대로 LLM에 넣어 "辛/未 일주의 지장간 丁(편관)·乙(편재)·己(편인)"
  // 같은 정통적 디테일이 prompt에 살아있게 함.
  const pillarTableSection = buildPillarTableSection(finalSaju, lang === 'ko' ? 'ko' : 'en')

  // 교차 룰 엔진 (5106 라인 정통 패턴) — 종왕격/종강격/격국·관성·재성/stellium/
  // mutual reception/sect/lots/zodiacal releasing 등 사주×점성 cross-confirmed
  // 신호. runFortune 한 번 호출해서 narrative 한 덩어리로 prompt에 추가.
  const crossRulesSection = await buildCrossRulesSection({
    birthDate: effectiveBirthDate,
    birthTime: effectiveBirthTime,
    gender: effectiveGender,
    latitude: effectiveLatitude,
    longitude: effectiveLongitude,
    lang: lang === 'ko' ? 'ko' : 'en',
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

  // Single-block flowing response — no markdown headings, no bullets.
  // The counselor speaks like a person, not a structured report.
  const responseDensityContract =
    lang === 'ko'
      ? [
          '[Response Contract: 한 덩어리 자연어]',
          '- 헤딩(##), 섹션 라벨, 불릿 리스트 모두 쓰지 마세요. 한 호흡으로 흐르는 산문(prose)으로만 답하세요.',
          '- 첫 1~2문장에서 사용자 질문에 직접 답하고, 그 안에서 왜 그런 결론인지 핵심 근거 하나를 자연스럽게 흡수하세요.',
          '- 이어지는 2~4문단으로 구조·타이밍·다음 행동·리스크를 *문장 안에 녹여서* 풀어쓰세요. "근거는", "실행 계획은", "주의할 점은" 같은 메타 라벨을 절대 쓰지 마세요.',
          '- 정통 라벨(격국·용신·십신·12운성·신살·dignity·stellium·lots 등)은 자연어로 풀어 쓰세요. "정인격" 같은 단어를 한 번 정도 그대로 노출해도 좋지만, 의미를 바로 옆 평어로 녹여주세요.',
          '- 기술적 신호 이름·엔진 용어(structure_detail / driver / readiness / trigger / convergence / 중심축 / 행동축)를 그대로 던지지 마세요.',
          '- 비가역 행동(서명·확정·계약·송금·결혼·이주)을 권할 때는 caution 신호와 충돌하지 않게 한 박자 늦추는 결로 표현하세요.',
          '- "사주에서는", "점성에서는", "타이밍은" 같은 메타 요약 꼬리를 마지막에 따로 붙이지 마세요.',
          '- 일반론·자기계발체·추상 격려 문장(예: "당신은 충분히 잘하고 있어요")을 피하세요.',
          '- 분량은 질문 무게에 맞춰 — 짧은 안부 150~300자, 일반 의사결정 400~700자, 인생 전반·복합 600~900자. 한 줄 단답으로 끝내지 마세요.',
        ].join('\n')
      : [
          '[Response Contract: single flowing prose]',
          '- Do not use markdown headings, section labels, or bullet lists. Speak in flowing prose only.',
          '- Open with a direct answer in the first 1-2 sentences, absorbing one core piece of evidence inline.',
          '- Continue in 2-4 paragraphs that weave structure, timing, next action, and risk inline — never label them.',
          '- Translate technical signals (geokguk, sibsin, dignity, stellium, lots, readiness/trigger) into plain English; mention a classical term once at most and explain it conversationally.',
          '- If caution signals exist, do not push irreversible actions (sign / commit / wire / marry / move) immediately.',
          '- Do not append meta-summary tails like "in saju this means..." or "from astrology...".',
          '- Avoid generic encouragement and abstract self-help phrasing.',
          '- Length: light check-ins 80-150 words, decision questions 200-350 words, life-overview 300-500 words.',
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
    pillarTableSection,
    crossRulesSection,
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
    interpretedAnswerQuality,
  }
}
