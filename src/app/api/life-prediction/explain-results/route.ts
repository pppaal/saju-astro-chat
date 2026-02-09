// src/app/api/life-prediction/explain-results/route.ts
// AI 기반 결과 설명 생성 API - 사주 분석 결과를 사용자 친화적으로 변환
// RAG 컨텍스트를 활용하여 더 풍부한 해석 제공

import { NextRequest, NextResponse } from 'next/server'
import { withApiMiddleware, createPublicStreamGuard } from '@/lib/api/middleware'
import { logger } from '@/lib/logger'
import { getBackendUrl } from '@/lib/backend-url'
import { HTTP_STATUS } from '@/lib/constants/http'
import { lifePredictionExplainResultsSchema } from '@/lib/api/zodValidation'

// ============================================================
// 백엔드 RAG 컨텍스트 호출
// ============================================================
const BACKEND_URL = getBackendUrl()

async function fetchRagContext(sipsin?: string, eventType?: string): Promise<string> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/prediction/rag-context`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sipsin,
        event_type: eventType,
      }),
    })

    if (!response.ok) {
      logger.warn('[explain-results] RAG context fetch failed:', response.status)
      return ''
    }

    const data = await response.json()
    const ragContext = data.rag_context || {}

    // RAG 컨텍스트를 하나의 문자열로 결합
    const parts: string[] = []
    if (ragContext.sipsin) {
      parts.push(ragContext.sipsin)
    }
    if (ragContext.timing) {
      parts.push(ragContext.timing)
    }
    if (ragContext.query_result) {
      parts.push(ragContext.query_result)
    }

    return parts.join('\n\n')
  } catch (error) {
    logger.warn('[explain-results] RAG context error:', error)
    return ''
  }
}

// ============================================================
// OpenAI API 호출 헬퍼
// ============================================================
async function callOpenAI(messages: { role: string; content: string }[], maxTokens = 1000) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      max_tokens: maxTokens,
      temperature: 0.3,
      response_format: { type: 'json_object' },
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenAI API error: ${error}`)
  }

  const data = await response.json()
  return data.choices[0]?.message?.content
}

// ============================================================
// 타입 정의
// ============================================================
interface OptimalPeriod {
  startDate: string
  endDate: string
  score: number
  grade: string
  reasons: string[]
}

interface ExplainedPeriod {
  startDate: string
  endDate: string
  score: number
  grade: string
  reasons: string[] // AI가 변환한 사용자 친화적 설명
  summary: string // 한 문장 요약
}

interface ExplainResponse {
  success: boolean
  data?: {
    periods: ExplainedPeriod[]
    overallAdvice: string
  }
  error?: string
}

// ============================================================
// 결과 설명 시스템 프롬프트
// ============================================================
const EXPLAIN_SYSTEM_PROMPT = `당신은 사주/점성술 전문가입니다. 기술적인 사주 분석 결과를 일반인이 이해하기 쉽게 설명해주세요.

**역할:**
- 사주 용어(십신, 12운성, 오행 등)를 쉬운 일상어로 번역
- 사용자의 질문 맥락에 맞춰 설명
- 따뜻하고 희망적인 톤 유지
- 구체적이고 실용적인 조언 포함

**출력 형식:**
JSON 형식으로 각 기간에 대해:
{
  "periods": [
    {
      "reasons": ["이모지 + 쉬운 설명 1", "이모지 + 쉬운 설명 2", ...],
      "summary": "이 시기가 좋은 이유 한 문장 요약"
    }
  ],
  "overallAdvice": "전체적인 조언 (2-3문장)"
}

**변환 예시:**
- "정재운 - investment에 유리" → "💰 안정적인 수입과 재물이 들어오는 시기"
- "건록 - 에너지 상승기" → "🔥 활력이 넘치고 무엇이든 시작하기 좋은 때"
- "未-午 육합 → 화 기운 생성" → "✨ 열정과 추진력이 결합되어 목표 달성에 유리"
- "대운 제왕" → "👑 인생의 전성기, 큰 결실을 맺을 수 있는 시기"

반드시 유효한 JSON만 출력하세요.`

// ============================================================
// POST 핸들러
// ============================================================
export const POST = withApiMiddleware(
  async (request: NextRequest): Promise<NextResponse<ExplainResponse>> => {
    try {
      const rawBody = await request.json()

      // Validate with Zod
      const validationResult = lifePredictionExplainResultsSchema.safeParse(rawBody)
      if (!validationResult.success) {
        logger.warn('[explain-results] validation failed', {
          errors: validationResult.error.issues,
        })
        return NextResponse.json(
          {
            success: false,
            error: 'validation_failed',
            details: validationResult.error.issues.map((e) => ({
              path: e.path.join('.'),
              message: e.message,
            })),
          },
          { status: HTTP_STATUS.BAD_REQUEST }
        )
      }

      const {
        question,
        eventType,
        eventLabel,
        optimalPeriods,
        sipsin,
        useRag = true,
      } = validationResult.data

      // RAG 컨텍스트 가져오기 (백엔드에서)
      let ragContext = ''
      if (useRag) {
        ragContext = await fetchRagContext(sipsin, eventType)
      }

      // 프롬프트 구성 (RAG 컨텍스트 포함)
      const userPrompt = `
**사용자 질문:** "${question}"
**분석 주제:** ${eventLabel} (${eventType})

**분석 결과 (기술적 용어):**
${optimalPeriods
  .map(
    (p, i) => `
${i + 1}위: ${p.startDate} ~ ${p.endDate}
   점수: ${p.score}점 (${p.grade}등급)
   이유: ${p.reasons.join(', ')}
`
  )
  .join('\n')}
${
  ragContext
    ? `
**참고 지식 (RAG):**
${ragContext.slice(0, 1000)}
`
    : ''
}
위 결과를 사용자의 질문("${question}")에 맞춰 쉽고 따뜻하게 설명해주세요.
${ragContext ? '참고 지식의 내용을 자연스럽게 녹여서 설명해주세요.' : ''}
각 이유에 적절한 이모지를 붙여주세요.`

      // OpenAI API 호출
      const responseText = await callOpenAI([
        { role: 'system', content: EXPLAIN_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ])
      if (!responseText) {
        throw new Error('AI 응답이 비어있습니다.')
      }

      // JSON 파싱
      const aiResult = JSON.parse(responseText)

      // 결과 병합
      const explainedPeriods: ExplainedPeriod[] = optimalPeriods.map((period, index) => ({
        ...period,
        reasons: aiResult.periods?.[index]?.reasons || period.reasons,
        summary: aiResult.periods?.[index]?.summary || `${period.grade}등급 추천 시기`,
      }))

      const res = NextResponse.json({
        success: true,
        data: {
          periods: explainedPeriods,
          overallAdvice: aiResult.overallAdvice || `${eventLabel}에 좋은 시기를 찾았습니다.`,
        },
      })
      return res
    } catch (error) {
      logger.error('Result explanation failed:', error)

      // 에러 시 원본 반환
      const body = await request.clone().json()
      return NextResponse.json({
        success: true,
        data: {
          periods:
            body.optimalPeriods?.map((p: OptimalPeriod) => ({
              ...p,
              summary: `${p.grade}등급 추천 시기`,
            })) || [],
          overallAdvice: '분석 결과를 확인해보세요.',
        },
      })
    }
  },
  createPublicStreamGuard({
    route: '/api/life-prediction/explain-results',
    limit: 10,
    windowSeconds: 60,
  })
)
