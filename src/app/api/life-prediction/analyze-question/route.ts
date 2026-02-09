// src/app/api/life-prediction/analyze-question/route.ts
// AI 기반 질문 분석 API - GPT-4o-mini를 사용하여 사용자 질문을 해석

import { NextRequest, NextResponse } from 'next/server'
import { withApiMiddleware, createPublicStreamGuard } from '@/lib/api/middleware'
import { logger } from '@/lib/logger'
import { HTTP_STATUS } from '@/lib/constants/http'
import { lifePredictionAnalyzeQuestionSchema } from '@/lib/api/zodValidation'

// ============================================================
// OpenAI API 호출 헬퍼
// ============================================================
async function callOpenAI(messages: { role: string; content: string }[], maxTokens = 200) {
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
      temperature: 0.1,
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
export type EventType =
  | 'marriage'
  | 'career'
  | 'investment'
  | 'move'
  | 'study'
  | 'health'
  | 'relationship'
  | 'general'

interface AnalyzeQuestionResponse {
  success: boolean
  data?: {
    eventType: EventType
    eventLabel: string
    questionSummary: string
    analysisContext: string
  }
  error?: string
}

// ============================================================
// 질문 분석 시스템 프롬프트
// ============================================================
const ANALYSIS_SYSTEM_PROMPT = `당신은 사주/점성술 기반 인생 예측 서비스의 질문 분석가입니다.
사용자의 질문을 분석하여 다음 정보를 JSON 형식으로 반환하세요:

1. eventType: 질문의 주제 분류
   - marriage: 결혼, 혼인, 배우자, 약혼 관련
   - career: 취업, 이직, 승진, 사업, 창업, 직장 관련
   - investment: 투자, 재물, 돈, 부자, 재테크, 수입, 복권, 로또, 금전 관련
   - move: 이사, 이주, 이민, 집, 부동산 계약 관련
   - study: 공부, 시험, 유학, 자격증, 학업, 합격 관련
   - health: 건강, 수술, 병원, 치료, 운동 관련
   - relationship: 연애, 만남, 소개팅, 이별, 재회 관련
   - general: 위에 해당하지 않는 일반적인 운세/타이밍 질문

2. eventLabel: 한글로 된 주제 라벨 (예: "재물운", "결혼운", "취업/이직")

3. questionSummary: 질문의 핵심을 한 문장으로 요약 (최대 30자)

4. analysisContext: 분석 결과를 설명할 때 사용할 맥락 (예: "부자가 되는 최적의 시기", "결혼 적기")

반드시 유효한 JSON만 출력하세요. 다른 텍스트는 포함하지 마세요.`

// ============================================================
// POST 핸들러
// ============================================================
export const POST = withApiMiddleware(
  async (request: NextRequest): Promise<NextResponse<AnalyzeQuestionResponse>> => {
    try {
      const rawBody = await request.json()

      // Validate with Zod
      const validationResult = lifePredictionAnalyzeQuestionSchema.safeParse(rawBody)
      if (!validationResult.success) {
        logger.warn('[analyze-question] validation failed', {
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

      const { question, locale = 'ko' } = validationResult.data

      // OpenAI API 호출
      const responseText = await callOpenAI([
        { role: 'system', content: ANALYSIS_SYSTEM_PROMPT },
        { role: 'user', content: `질문: "${question}"` },
      ])
      if (!responseText) {
        throw new Error('AI 응답이 비어있습니다.')
      }

      // JSON 파싱
      const analysisResult = JSON.parse(responseText)

      // 유효성 검사
      const validEventTypes: EventType[] = [
        'marriage',
        'career',
        'investment',
        'move',
        'study',
        'health',
        'relationship',
        'general',
      ]

      const eventType = validEventTypes.includes(analysisResult.eventType)
        ? analysisResult.eventType
        : 'general'

      const res = NextResponse.json({
        success: true,
        data: {
          eventType,
          eventLabel: analysisResult.eventLabel || getDefaultLabel(eventType, locale),
          questionSummary: analysisResult.questionSummary || question.slice(0, 30),
          analysisContext:
            analysisResult.analysisContext || `${getDefaultLabel(eventType, locale)} 분석`,
        },
      })
      return res
    } catch (error) {
      logger.error('Question analysis failed:', error)

      // 에러 시 기본값 반환 (서비스 계속 작동)
      return NextResponse.json({
        success: true,
        data: {
          eventType: 'general',
          eventLabel: '종합 운세',
          questionSummary: '운세 분석',
          analysisContext: '최적 시기 분석',
        },
      })
    }
  },
  createPublicStreamGuard({
    route: '/api/life-prediction/analyze-question',
    limit: 10,
    windowSeconds: 60,
  })
)

// ============================================================
// 헬퍼 함수
// ============================================================
function getDefaultLabel(eventType: EventType, locale: string): string {
  const labels: Record<EventType, { ko: string; en: string }> = {
    marriage: { ko: '결혼운', en: 'Marriage' },
    career: { ko: '취업/이직', en: 'Career' },
    investment: { ko: '재물운', en: 'Wealth' },
    move: { ko: '이사', en: 'Moving' },
    study: { ko: '학업/시험', en: 'Study' },
    health: { ko: '건강', en: 'Health' },
    relationship: { ko: '연애운', en: 'Relationship' },
    general: { ko: '종합 운세', en: 'General Fortune' },
  }

  return labels[eventType]?.[locale as 'ko' | 'en'] || labels.general.ko
}
