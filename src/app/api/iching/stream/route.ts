// src/app/api/iching/stream/route.ts
// Streaming I Ching Interpretation API - Real-time SSE for fast display

import { NextRequest, NextResponse } from 'next/server'
import { initializeApiContext, createPublicStreamGuard } from '@/lib/api/middleware'
import { createSSEStreamProxy, createFallbackSSEStream } from '@/lib/streaming'
import { apiClient } from '@/lib/api/ApiClient'
import { logger } from '@/lib/logger'
import {
  generateWisdomPrompt,
  getHexagramWisdom,
  type WisdomPromptContext,
} from '@/lib/iChing/ichingWisdom'
import { calculateNuclearHexagram, calculateRelatedHexagrams } from '@/lib/iChing/iChingPremiumData'
import { HTTP_STATUS } from '@/lib/constants/http'
import { iChingStreamRequestSchema } from '@/lib/api/zodValidation'

interface ChangingLine {
  index: number
  text: string
}

interface StreamIChingRequest {
  hexagramNumber: number
  hexagramName: string
  hexagramSymbol: string
  judgment: string
  image: string
  coreMeaning?: string
  changingLines?: ChangingLine[]
  resultingHexagram?: {
    number: number
    name: string
    symbol: string
    judgment?: string
  }
  question?: string
  locale?: 'ko' | 'en'
  themes?: {
    career?: string
    love?: string
    health?: string
    wealth?: string
    timing?: string
  }
}

export async function POST(req: NextRequest) {
  try {
    // Apply middleware: rate limiting + public token auth
    const guardOptions = createPublicStreamGuard({
      route: 'iching-stream',
      limit: 30,
      windowSeconds: 60,
    })

    const { context, error } = await initializeApiContext(req, guardOptions)
    if (error) {
      return error
    }

    const rawBody = await req.json()

    // Validate request body with Zod
    const validationResult = iChingStreamRequestSchema.safeParse(rawBody)
    if (!validationResult.success) {
      logger.warn('[IChingStream] validation failed', { errors: validationResult.error.issues })
      return NextResponse.json(
        {
          error: 'validation_failed',
          details: validationResult.error.issues.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    }

    const body = validationResult.data
    const {
      hexagramNumber,
      hexagramName,
      hexagramSymbol,
      judgment,
      image,
      coreMeaning = '',
      changingLines = [],
      resultingHexagram,
      question = '',
      locale = context.locale as 'ko' | 'en',
      themes = {},
    } = body

    // hexagramNumber and hexagramName are already validated by Zod schema
    if (false) {
      // This block is now redundant
      return NextResponse.json(
        { error: 'Hexagram data required' },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    }

    // Generate advanced wisdom context using ichingWisdom library
    const changingLineIndices = changingLines.map((cl: ChangingLine) => cl.index + 1)
    const wisdomContext: WisdomPromptContext = {
      hexagramNumber,
      changingLines: changingLineIndices,
      targetHexagram: resultingHexagram?.number,
      userQuestion: question,
      consultationType: 'general',
    }
    const wisdomPrompt = generateWisdomPrompt(wisdomContext)
    const hexagramWisdom = getHexagramWisdom(hexagramNumber)

    // Calculate nuclear and related hexagrams for deeper insight
    const nuclearHexagram = calculateNuclearHexagram(hexagramNumber)
    const relatedHexagrams = calculateRelatedHexagrams(hexagramNumber)

    // Call backend streaming endpoint with enriched data using apiClient
    const streamResult = await apiClient.postSSEStream('/iching/reading-stream', {
      hexagramNumber,
      hexagramName,
      hexagramSymbol,
      judgment,
      image,
      coreMeaning,
      changingLines,
      resultingHexagram,
      question,
      locale,
      themes,
      // Enhanced data from advanced iChing library
      wisdomPrompt,
      hexagramWisdom: hexagramWisdom
        ? {
            keyword: hexagramWisdom.keyword,
            coreWisdom: hexagramWisdom.coreWisdom,
            situationAdvice: hexagramWisdom.situationAdvice,
            warnings: hexagramWisdom.warnings,
            opportunities: hexagramWisdom.opportunities,
          }
        : null,
      nuclearHexagram,
      relatedHexagrams,
    })

    if (!streamResult.ok) {
      logger.error('[IChingStream] Backend error:', {
        status: streamResult.status,
        error: streamResult.error,
      })

      // Return fallback SSE stream with error message
      return createFallbackSSEStream({
        content:
          locale === 'ko'
            ? '일시적으로 서비스를 이용할 수 없습니다. 잠시 후 다시 시도해주세요.'
            : 'Service temporarily unavailable. Please try again later.',
        done: true,
        error: streamResult.error,
      })
    }

    // Proxy the SSE stream from backend to client
    return createSSEStreamProxy({
      source: streamResult.response,
      route: 'IChingStream',
    })
  } catch (err: unknown) {
    logger.error('I Ching stream error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: HTTP_STATUS.SERVER_ERROR })
  }
}
