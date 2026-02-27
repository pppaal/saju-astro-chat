// src/lib/destiny-matrix/ai-report/aiBackend.ts
// AI 백엔드 호출 함수들 (Multi-provider failover 지원)

import { logger } from '@/lib/logger'
import { recordExternalCall } from '@/lib/metrics/index'
import type { AIPremiumReport } from './reportTypes'

function parseTimeoutMs(value: string | undefined, fallback: number): number {
  if (!value) return fallback
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 1000) return fallback
  return Math.floor(parsed)
}

// NOTE:
// 9초는 3k+ 토큰 JSON 응답에 너무 짧아 AbortError가 빈번합니다.
// 기본값을 현실적으로 상향하고, 환경변수로 조절 가능하게 둡니다.
const DEFAULT_TIMEOUT_MS = parseTimeoutMs(process.env.AI_BACKEND_TIMEOUT_MS, 120000)
const OPENAI_TIMEOUT_MS = parseTimeoutMs(
  process.env.AI_BACKEND_OPENAI_TIMEOUT_MS,
  DEFAULT_TIMEOUT_MS
)
const REPLICATE_TIMEOUT_MS = parseTimeoutMs(
  process.env.AI_BACKEND_REPLICATE_TIMEOUT_MS,
  Math.max(DEFAULT_TIMEOUT_MS, 60000)
)

// 플랜별 AI 토큰 한도
// 종합 리포트(10개 섹션 JSON)에는 최소 2500+ 토큰 필요
const TOKEN_LIMITS_BY_PLAN = {
  free: 3000,
  starter: 4000,
  pro: 6000,
  premium: 8000,
} as const

const TOKEN_CEILING_BY_PLAN = {
  free: 4000,
  starter: 6000,
  pro: 10000,
  premium: 14000,
} as const

interface AIBackendResponse<T> {
  sections: T
  model: string
  tokensUsed?: number
}

type AIPlan = keyof typeof TOKEN_LIMITS_BY_PLAN

// AI 프로바이더 설정
interface AIProvider {
  name: string
  apiKey: string | undefined
  endpoint: string
  model: string
  enabled: boolean
}

function getProviderTimeoutMs(providerName: AIProvider['name']): number {
  switch (providerName) {
    case 'openai':
      return OPENAI_TIMEOUT_MS
    case 'replicate':
      return REPLICATE_TIMEOUT_MS
    default:
      return DEFAULT_TIMEOUT_MS
  }
}

function isValidApiKey(key: string | undefined): boolean {
  if (!key) return false
  const trimmed = key.trim()
  if (trimmed.length === 0) return false
  // 플레이스홀더 값 거부
  const placeholders = ['REPLACE_ME', 'your-api-key', 'sk-xxx', 'YOUR_KEY', 'CHANGE_ME']
  return !placeholders.includes(trimmed)
}

const AI_PROVIDERS: AIProvider[] = [
  {
    name: 'openai',
    apiKey: process.env.OPENAI_API_KEY,
    endpoint: 'https://api.openai.com/v1/chat/completions',
    model: process.env.FUSION_MODEL || 'gpt-4o-mini',
    enabled: isValidApiKey(process.env.OPENAI_API_KEY),
  },
  {
    name: 'replicate',
    apiKey: process.env.REPLICATE_API_KEY,
    endpoint: 'https://api.replicate.com/v1/predictions',
    model: 'meta/llama-2-70b-chat',
    enabled: isValidApiKey(process.env.REPLICATE_API_KEY),
  },
]

// ===========================
// 기본 AI 백엔드 호출
// ===========================

export async function callAIBackend(
  prompt: string,
  lang: 'ko' | 'en',
  options?: {
    userPlan?: AIPlan
    maxTokensOverride?: number
    modelOverride?: string
  }
): Promise<AIBackendResponse<AIPremiumReport['sections']>> {
  return callAIBackendGeneric<AIPremiumReport['sections']>(prompt, lang, options)
}

// ===========================
// 제네릭 AI 백엔드 호출 (Multi-provider failover)
// ===========================

export async function callAIBackendGeneric<T>(
  prompt: string,
  lang: 'ko' | 'en',
  options?: {
    userPlan?: AIPlan
    maxTokensOverride?: number
    modelOverride?: string
  }
): Promise<AIBackendResponse<T>> {
  const systemMessage =
    lang === 'ko'
      ? '당신은 전문 운명 분석가입니다. 사주와 점성술을 융합하여 깊이 있는 통찰을 제공합니다. 응답은 반드시 JSON 형식으로 작성해주세요.'
      : 'You are a professional destiny analyst. You provide deep insights by combining Eastern and Western astrology. Please respond in JSON format.'

  // 플랜별 토큰 한도 결정 (비용 절감)
  const userPlan: AIPlan = options?.userPlan || 'free'
  const baseMaxTokens = TOKEN_LIMITS_BY_PLAN[userPlan]
  const planCeiling = TOKEN_CEILING_BY_PLAN[userPlan]
  const requestedOverride = options?.maxTokensOverride
  const maxTokens =
    typeof requestedOverride === 'number' && Number.isFinite(requestedOverride)
      ? Math.max(800, Math.min(planCeiling, Math.floor(requestedOverride)))
      : baseMaxTokens

  // 활성화된 프로바이더만 필터링
  const enabledProviders = AI_PROVIDERS.filter((p) => p.enabled && p.apiKey)

  if (enabledProviders.length === 0) {
    logger.error('[AI Backend] No AI providers configured')
    throw new Error('No AI providers available')
  }

  const preferredOpenAIModel = options?.modelOverride || process.env.FUSION_MODEL || 'gpt-4o-mini'

  // 각 프로바이더를 순서대로 시도
  let lastError: Error | null = null

  for (const provider of enabledProviders) {
    const startTime = Date.now()
    try {
      logger.info(`[AI Backend] Trying ${provider.name}...`, {
        plan: userPlan,
        maxTokens,
        timeoutMs: getProviderTimeoutMs(provider.name),
        model: provider.name === 'openai' ? preferredOpenAIModel : provider.model,
      })

      const result = await callProviderAPI<T>(provider, prompt, systemMessage, maxTokens, {
        modelOverride: provider.name === 'openai' ? preferredOpenAIModel : undefined,
      })

      const durationMs = Date.now() - startTime
      logger.info(`[AI Backend] ${provider.name} succeeded`, {
        model: result.model,
        tokensUsed: result.tokensUsed,
        plan: userPlan,
        limit: maxTokens,
      })

      // 토큰 사용량 메트릭스 기록
      if (provider.name === 'openai') {
        recordExternalCall('openai', result.model, 'success', durationMs, {
          input: result.tokensUsed ? Math.round(result.tokensUsed * 0.7) : undefined,
          output: result.tokensUsed ? Math.round(result.tokensUsed * 0.3) : undefined,
        })
      }

      return result
    } catch (error) {
      const durationMs = Date.now() - startTime
      lastError = error instanceof Error ? error : new Error(String(error))
      logger.warn(`[AI Backend] ${provider.name} failed, trying next provider`, {
        error: lastError.message,
      })

      if (provider.name === 'openai') {
        recordExternalCall('openai', provider.model, 'error', durationMs)
      }
      // 다음 프로바이더로 계속
    }
  }

  // 모든 프로바이더 실패
  logger.error('[AI Backend] All providers failed', { lastError })
  throw new Error(`All AI providers failed. Last error: ${lastError?.message || 'Unknown'}`)
}

// ===========================
// 개별 프로바이더 호출
// ===========================

async function callProviderAPI<T>(
  provider: AIProvider,
  prompt: string,
  systemMessage: string,
  maxTokens: number,
  options?: {
    modelOverride?: string
  }
): Promise<AIBackendResponse<T>> {
  const controller = new AbortController()
  const timeoutMs = getProviderTimeoutMs(provider.name)
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    // OpenAI API 호출
    if (provider.name === 'openai') {
      return await callOpenAICompatible<T>(provider, prompt, systemMessage, maxTokens, controller, {
        modelOverride: options?.modelOverride,
      })
    }

    // Replicate API 호출 (다른 형식)
    if (provider.name === 'replicate') {
      return await callReplicate<T>(provider, prompt, systemMessage, maxTokens, controller)
    }

    throw new Error(`Unsupported provider: ${provider.name}`)
  } finally {
    clearTimeout(timeoutId)
  }
}

// OpenAI API 호출
async function callOpenAICompatible<T>(
  provider: AIProvider,
  prompt: string,
  systemMessage: string,
  maxTokens: number,
  controller: AbortController,
  options?: {
    modelOverride?: string
  }
): Promise<AIBackendResponse<T>> {
  const preferredModel = options?.modelOverride || provider.model
  const fallbackModel = provider.model

  const requestOnce = async (model: string): Promise<AIBackendResponse<T>> => {
    const response = await fetch(provider.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: prompt },
        ],
        max_tokens: maxTokens,
        temperature: 0.7,
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      logger.error(`[AI Backend] ${provider.name} API error`, {
        status: response.status,
        errorData,
      })
      const apiMessage =
        typeof errorData?.error?.message === 'string' ? errorData.error.message : undefined
      const apiCode = typeof errorData?.error?.code === 'string' ? errorData.error.code : undefined
      const isInvalidKey =
        response.status === 401 &&
        (apiCode === 'invalid_api_key' || apiMessage?.toLowerCase().includes('invalid api key'))

      if (isInvalidKey && provider.enabled) {
        provider.enabled = false
        logger.warn(`[AI Backend] Disabled ${provider.name} provider due to invalid API key`)
      }

      const detail = apiMessage ? ` - ${apiMessage}` : ''
      throw new Error(`${provider.name} API error: ${response.status}${detail}`)
    }

    const data = await response.json()
    const responseText = data?.choices?.[0]?.message?.content || ''

    return {
      sections: extractJSONFromResponse<T>(responseText),
      model: data?.model || model,
      tokensUsed: data?.usage?.total_tokens,
    }
  }

  try {
    return await requestOnce(preferredModel)
  } catch (error) {
    const shouldRetryWithFallback =
      preferredModel !== fallbackModel &&
      error instanceof Error &&
      error.message.includes('No JSON found in AI response')
    if (!shouldRetryWithFallback) throw error

    logger.warn('[AI Backend] Preferred model returned non-JSON. Retrying with fallback model.', {
      preferredModel,
      fallbackModel,
    })
    return await requestOnce(fallbackModel)
  }
}

// Replicate API 호출 (비동기 예측 방식)
async function callReplicate<T>(
  provider: AIProvider,
  prompt: string,
  systemMessage: string,
  maxTokens: number,
  controller: AbortController
): Promise<AIBackendResponse<T>> {
  // 1. 예측 생성
  const createResponse = await fetch(provider.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Token ${provider.apiKey}`,
    },
    body: JSON.stringify({
      version: provider.model,
      input: {
        prompt: `${systemMessage}\n\nUser: ${prompt}\nAssistant:`,
        max_length: maxTokens,
        temperature: 0.7,
      },
    }),
    signal: controller.signal,
  })

  if (!createResponse.ok) {
    throw new Error(`Replicate API error: ${createResponse.status}`)
  }

  const prediction = await createResponse.json()
  const predictionUrl = prediction.urls?.get

  // 2. 결과 폴링 (최대 60초)
  let result = prediction
  let attempts = 0
  const maxAttempts = 30

  while (result.status !== 'succeeded' && result.status !== 'failed' && attempts < maxAttempts) {
    await new Promise((resolve) => setTimeout(resolve, 2000)) // 2초 대기
    const statusResponse = await fetch(predictionUrl, {
      headers: {
        Authorization: `Token ${provider.apiKey}`,
      },
    })
    result = await statusResponse.json()
    attempts++
  }

  if (result.status === 'failed') {
    throw new Error('Replicate prediction failed')
  }

  if (result.status !== 'succeeded') {
    throw new Error('Replicate prediction timeout')
  }

  const responseText = Array.isArray(result.output) ? result.output.join('') : result.output

  return {
    sections: extractJSONFromResponse<T>(responseText),
    model: provider.model,
    tokensUsed: undefined, // Replicate doesn't provide token usage
  }
}

// JSON 추출 헬퍼 함수
function extractJSONFromResponse<T>(responseText: string): T {
  if (!responseText || responseText.trim().length === 0) {
    throw new Error('AI response is empty - API key may be invalid or token limit too low')
  }

  try {
    // JSON 추출 (코드 블록 또는 순수 JSON)
    const jsonMatch =
      responseText.match(/```json\s*([\s\S]*?)\s*```/) || responseText.match(/\{[\s\S]*\}/)

    if (jsonMatch) {
      const jsonStr = jsonMatch[1] || jsonMatch[0]
      const parsed = JSON.parse(jsonStr)

      // 빈 객체 체크 - 의미있는 데이터가 있는지 확인
      if (typeof parsed === 'object' && Object.keys(parsed).length === 0) {
        throw new Error(
          'AI returned empty JSON - token limit may be too low for the requested report'
        )
      }

      return parsed
    }

    logger.error('[AI Backend] No JSON found in response', {
      responseLength: responseText.length,
      responsePreview: responseText.slice(0, 200),
    })
    throw new Error(
      'No JSON found in AI response - response may have been truncated due to token limit'
    )
  } catch (parseError) {
    if (parseError instanceof SyntaxError) {
      logger.error('[AI Backend] Failed to parse JSON response (likely truncated)', {
        error: parseError.message,
        responseLength: responseText.length,
        responsePreview: responseText.slice(0, 200),
        responseTail: responseText.slice(-100),
      })
      throw new Error(
        'AI response JSON is malformed - likely truncated due to insufficient token limit'
      )
    }
    throw parseError
  }
}

// ===========================
// 폴백 섹션 생성
// ===========================

export function createFallbackSections(lang: 'ko' | 'en'): AIPremiumReport['sections'] {
  return {
    introduction: '',
    personalityDeep: '',
    careerPath: '',
    relationshipDynamics: '',
    wealthPotential: '',
    healthGuidance: '',
    lifeMission: '',
    timingAdvice: '',
    actionPlan: '',
    conclusion: lang === 'ko' ? '행운을 빕니다!' : 'Wishing you the best!',
  }
}
