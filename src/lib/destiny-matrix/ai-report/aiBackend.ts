// src/lib/destiny-matrix/ai-report/aiBackend.ts
// AI 백엔드 호출 함수들

import { logger } from '@/lib/logger'
import type { AIPremiumReport } from './reportTypes'

// 기본 타임아웃: 2분
const DEFAULT_TIMEOUT = 120000

interface AIBackendResponse<T> {
  sections: T
  model: string
  tokensUsed?: number
}

// ===========================
// 기본 AI 백엔드 호출
// ===========================

export async function callAIBackend(
  prompt: string,
  lang: 'ko' | 'en'
): Promise<AIBackendResponse<AIPremiumReport['sections']>> {
  return callAIBackendGeneric<AIPremiumReport['sections']>(prompt, lang)
}

// ===========================
// 제네릭 AI 백엔드 호출 (OpenAI 직접 호출)
// ===========================

export async function callAIBackendGeneric<T>(
  prompt: string,
  lang: 'ko' | 'en'
): Promise<AIBackendResponse<T>> {
  const openaiKey = process.env.OPENAI_API_KEY

  if (!openaiKey) {
    logger.error('[AI Backend] OPENAI_API_KEY not configured')
    throw new Error('OpenAI API key not configured')
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT)

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: process.env.FUSION_MODEL || 'gpt-4o',
        messages: [
          {
            role: 'system',
            content:
              lang === 'ko'
                ? '당신은 전문 운명 분석가입니다. 사주와 점성술을 융합하여 깊이 있는 통찰을 제공합니다. 응답은 반드시 JSON 형식으로 작성해주세요.'
                : 'You are a professional destiny analyst. You provide deep insights by combining Eastern and Western astrology. Please respond in JSON format.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 4000,
        temperature: 0.7,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      logger.error('[AI Backend] OpenAI API error', { status: response.status, error: errorData })
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const data = await response.json()
    const responseText = data?.choices?.[0]?.message?.content || ''

    let sections: T
    try {
      // JSON 추출 (코드 블록 또는 순수 JSON)
      const jsonMatch =
        responseText.match(/```json\s*([\s\S]*?)\s*```/) || responseText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const jsonStr = jsonMatch[1] || jsonMatch[0]
        sections = JSON.parse(jsonStr)
      } else {
        logger.warn('[AI Backend] No JSON found in response, using fallback')
        sections = {} as T
      }
    } catch (parseError) {
      logger.error('[AI Backend] Failed to parse JSON response', { error: parseError })
      sections = {} as T
    }

    return {
      sections,
      model: data?.model || 'gpt-4o',
      tokensUsed: data?.usage?.total_tokens,
    }
  } catch (error) {
    clearTimeout(timeoutId)
    logger.error('[AI Backend] Request failed', { error })
    throw error
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
