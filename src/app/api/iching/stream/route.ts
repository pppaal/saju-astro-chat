// src/app/api/iching/stream/route.ts
// Streaming I Ching Interpretation API - Real-time SSE for fast display

import { createStreamRoute } from '@/lib/streaming'
import { createPublicStreamGuard } from '@/lib/api/middleware'
import {
  iChingStreamRequestSchema,
  type IChingStreamRequestValidated,
} from '@/lib/api/zodValidation'
import {
  generateWisdomPrompt,
  getHexagramWisdom,
  type WisdomPromptContext,
} from '@/lib/iChing/ichingWisdom'
import { calculateNuclearHexagram, calculateRelatedHexagrams } from '@/lib/iChing/iChingPremiumData'

export const POST = createStreamRoute<IChingStreamRequestValidated>({
  route: 'IChingStream',
  guard: createPublicStreamGuard({
    route: 'iching-stream',
    limit: 30,
    windowSeconds: 60,
  }),
  schema: iChingStreamRequestSchema,
  fallbackMessage: {
    ko: '일시적으로 서비스를 이용할 수 없습니다. 잠시 후 다시 시도해주세요.',
    en: 'Service temporarily unavailable. Please try again later.',
  },
  async buildPayload(validated, context) {
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
      themes = {},
    } = validated
    const locale = validated.locale || (context.locale as 'ko' | 'en')

    // Generate advanced wisdom context
    const changingLineIndices = changingLines.map((cl) => cl.index + 1)
    const wisdomContext: WisdomPromptContext = {
      hexagramNumber,
      changingLines: changingLineIndices,
      targetHexagram: resultingHexagram?.number,
      userQuestion: question,
      consultationType: 'general',
    }
    const wisdomPrompt = generateWisdomPrompt(wisdomContext)
    const hexagramWisdom = getHexagramWisdom(hexagramNumber)

    // Calculate nuclear and related hexagrams
    const nuclearHexagram = calculateNuclearHexagram(hexagramNumber)
    const relatedHexagrams = calculateRelatedHexagrams(hexagramNumber)

    return {
      endpoint: '/iching/reading-stream',
      body: {
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
      },
    }
  },
})
