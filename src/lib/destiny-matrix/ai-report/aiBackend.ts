// src/lib/destiny-matrix/ai-report/aiBackend.ts
// AI 백엔드 호출 함수들 (Multi-provider failover 지원)

import { logger } from '@/lib/logger'
import { recordExternalCall } from '@/lib/metrics/index'
import type { AIPremiumReport } from './reportTypes'

// 기본 타임아웃: 9초 (Vercel Hobby 플랜 10초 제한 고려)
const DEFAULT_TIMEOUT = 9000

// 플랜별 AI 토큰 한도
// 종합 리포트(10개 섹션 JSON)에는 최소 2500+ 토큰 필요
const TOKEN_LIMITS_BY_PLAN = {
  free: 3000,
  starter: 4000,
  pro: 6000,
  premium: 8000,
} as const

interface AIBackendResponse<T> {
  sections: T
  model: string
  tokensUsed?: number
}

// AI 프로바이더 설정
interface AIProvider {
  name: string
  apiKey: string | undefined
  endpoint: string
  model: string
  enabled: boolean
}

function isValidApiKey(key: string | undefined): boolean {
  if (!key) return false
  const trimmed = key.trim()
  if (trimmed.length === 0) return false
  // 플레이스홀더 값 거부
  const placeholders = ['REPLACE_ME', 'your-api-key', 'sk-xxx', 'YOUR_KEY', 'TODO', 'CHANGE_ME']
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
  {
    name: 'together',
    apiKey: process.env.TOGETHER_API_KEY,
    endpoint: 'https://api.together.xyz/v1/chat/completions',
    model: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
    enabled: isValidApiKey(process.env.TOGETHER_API_KEY),
  },
]

// ===========================
// 기본 AI 백엔드 호출
// ===========================

export async function callAIBackend(
  prompt: string,
  lang: 'ko' | 'en',
  options?: { userPlan?: keyof typeof TOKEN_LIMITS_BY_PLAN }
): Promise<AIBackendResponse<AIPremiumReport['sections']>> {
  return callAIBackendGeneric<AIPremiumReport['sections']>(prompt, lang, options)
}

// ===========================
// 제네릭 AI 백엔드 호출 (Multi-provider failover)
// ===========================

export async function callAIBackendGeneric<T>(
  prompt: string,
  lang: 'ko' | 'en',
  options?: { userPlan?: keyof typeof TOKEN_LIMITS_BY_PLAN }
): Promise<AIBackendResponse<T>> {
  const systemMessage =
    lang === 'ko'
      ? '당신은 전문 운명 분석가입니다. 사주와 점성술을 융합하여 깊이 있는 통찰을 제공합니다. 응답은 반드시 JSON 형식으로 작성해주세요.'
      : 'You are a professional destiny analyst. You provide deep insights by combining Eastern and Western astrology. Please respond in JSON format.'

  // 플랜별 토큰 한도 결정 (비용 절감)
  const userPlan = options?.userPlan || 'free'
  const maxTokens = TOKEN_LIMITS_BY_PLAN[userPlan]

  // 활성화된 프로바이더만 필터링
  const enabledProviders = AI_PROVIDERS.filter((p) => p.enabled && p.apiKey)

  if (enabledProviders.length === 0) {
    logger.error('[AI Backend] No AI providers configured')
    throw new Error('No AI providers available')
  }

  // 각 프로바이더를 순서대로 시도
  let lastError: Error | null = null

  for (const provider of enabledProviders) {
    const startTime = Date.now()
    try {
      logger.info(`[AI Backend] Trying ${provider.name}...`, {
        plan: userPlan,
        maxTokens,
      })

      const result = await callProviderAPI<T>(provider, prompt, systemMessage, maxTokens)

      const durationMs = Date.now() - startTime
      logger.info(`[AI Backend] ${provider.name} succeeded`, {
        model: result.model,
        tokensUsed: result.tokensUsed,
        plan: userPlan,
        limit: maxTokens,
      })

      // 토큰 사용량 메트릭스 기록
      if (provider.name === 'openai') {
        recordExternalCall("openai", result.model, "success", durationMs, {
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
        recordExternalCall("openai", provider.model, "error", durationMs)
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
  maxTokens: number
): Promise<AIBackendResponse<T>> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT)

  try {
    // OpenAI 호환 API 호출
    if (provider.name === 'openai' || provider.name === 'together') {
      return await callOpenAICompatible<T>(provider, prompt, systemMessage, maxTokens, controller)
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

// OpenAI 호환 API 호출 (OpenAI, Together AI)
async function callOpenAICompatible<T>(
  provider: AIProvider,
  prompt: string,
  systemMessage: string,
  maxTokens: number,
  controller: AbortController
): Promise<AIBackendResponse<T>> {
  const response = await fetch(provider.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${provider.apiKey}`,
    },
    body: JSON.stringify({
      model: provider.model,
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
    logger.error(`[AI Backend] ${provider.name} API error`, { status: response.status, errorData })
    throw new Error(`${provider.name} API error: ${response.status}`)
  }

  const data = await response.json()
  const responseText = data?.choices?.[0]?.message?.content || ''

  return {
    sections: extractJSONFromResponse<T>(responseText),
    model: data?.model || provider.model,
    tokensUsed: data?.usage?.total_tokens,
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
    );
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
