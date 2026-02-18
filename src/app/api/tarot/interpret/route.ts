// src/app/api/tarot/interpret/route.ts
// Premium Tarot Interpretation API using Hybrid RAG

import { NextRequest, NextResponse } from 'next/server'
import { withApiMiddleware, createPublicStreamGuard } from '@/lib/api/middleware'
import { apiClient } from '@/lib/api/ApiClient'
import { prisma } from '@/lib/db/prisma'
import { captureServerError } from '@/lib/telemetry'
import { enforceBodySize } from '@/lib/http'
import { checkAndConsumeCredits, creditErrorResponse } from '@/lib/credits/withCredits'
import { logger } from '@/lib/logger'
import { HTTP_STATUS } from '@/lib/constants/http'
import { tarotInterpretRequestSchema } from '@/lib/api/zodValidation'

interface CardInput {
  name: string
  nameKo?: string
  isReversed: boolean
  position: string
  positionKo?: string
  meaning?: string
  meaningKo?: string
  keywords?: string[]
  keywordsKo?: string[]
}

export const POST = withApiMiddleware(
  async (req: NextRequest, context) => {
    try {
      const oversized = enforceBodySize(req, 256 * 1024)
      if (oversized) {
        return oversized
      }

      const rawBody = await req.json()

      // Validate with Zod
      const validationResult = tarotInterpretRequestSchema.safeParse(rawBody)
      if (!validationResult.success) {
        logger.warn('[Tarot interpret] validation failed', {
          errors: validationResult.error.issues,
        })
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

      const {
        categoryId,
        spreadId,
        spreadTitle,
        cards: validatedCards,
        userQuestion,
        language = 'ko',
        birthdate,
        moonPhase,
        includeAstrology = true,
        includeSaju = true,
        sajuContext,
        astroContext,
      } = validationResult.data

      const creditResult = await checkAndConsumeCredits('reading', 1)
      if (!creditResult.allowed) {
        return creditErrorResponse(creditResult)
      }

      // Call Python backend for Hybrid RAG interpretation (with fallback on connection failure)
      let interpretation = null
      try {
        const response = await apiClient.post(
          '/api/tarot/interpret',
          {
            category: categoryId,
            spread_id: spreadId,
            spread_title: spreadTitle,
            cards: validatedCards.map((c) => ({
              name: c.name,
              is_reversed: c.isReversed,
              position: c.position,
            })),
            user_question: userQuestion,
            language,
            birthdate: includeAstrology ? birthdate : undefined,
            moon_phase: moonPhase,
            saju_context: includeSaju ? sajuContext : undefined,
            astro_context: includeAstrology ? astroContext : undefined,
          },
          { timeout: 20000 }
        )

        if (response.ok) {
          interpretation = response.data
        }
      } catch (fetchError) {
        logger.warn('Backend connection failed, using fallback:', fetchError)
      }

      // Use backend response or GPT fallback
      let result
      if (interpretation && !(interpretation as Record<string, unknown>).error) {
        result = interpretation
      } else {
        logger.warn('Backend unavailable, using GPT interpretation')
        result = await generateGPTInterpretation(
          validatedCards,
          spreadTitle,
          language,
          userQuestion,
          includeSaju ? sajuContext : undefined,
          includeAstrology ? astroContext : undefined
        )
      }

      // ======== ê¸°ë¡ ì €ìž¥ (ë¡œê·¸ì¸ ì‚¬ìš©ìžë§Œ) ========
      const session = context.session
      if (session?.user?.id) {
        try {
          await prisma.reading.create({
            data: {
              userId: session.user.id,
              type: 'tarot',
              title: `${spreadTitle} - ${validatedCards.map((c: CardInput) => c.nameKo || c.name).join(', ')}`,
              content: JSON.stringify({
                categoryId,
                spreadId,
                spreadTitle,
                cards: validatedCards.map((c: CardInput) => ({
                  name: c.name,
                  nameKo: c.nameKo,
                  isReversed: c.isReversed,
                  position: c.position,
                })),
                userQuestion,
              }),
            },
          })
        } catch (saveErr) {
          logger.warn('[Tarot API] Failed to save reading:', saveErr)
        }
      }

      return NextResponse.json(result)
    } catch (err: unknown) {
      captureServerError(err as Error, { route: '/api/tarot/interpret' })

      // Return fallback even on error
      logger.error('Tarot interpretation error:', err)
      return NextResponse.json(
        { error: 'Server error', fallback: true },
        { status: HTTP_STATUS.SERVER_ERROR }
      )
    }
  },
  createPublicStreamGuard({
    route: 'tarot/interpret',
    limit: 10,
    windowSeconds: 60,
  })
)

// GPT-4o-mini API í˜¸ì¶œ í—¬í¼ (ì†ë„ ìµœì í™”)
async function callGPT(prompt: string, maxTokens = 400): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens,
      temperature: 0.75,
    }),
  })

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`)
  }

  const data = await response.json()
  return data.choices[0]?.message?.content || ''
}

// GPTë¥¼ ì‚¬ìš©í•œ í•´ì„ ìƒì„± (ë°±ì—”ë“œ ì—†ì´ ì§ì ‘ í˜¸ì¶œ) - í†µí•© í”„ë¡¬í”„íŠ¸ë¡œ ì†ë„ ìµœì í™”
async function generateGPTInterpretation(
  cards: CardInput[],
  spreadTitle: string,
  language: string,
  userQuestion?: string,
  sajuContext?: string,
  astroContext?: string
) {
  const isKorean = language === 'ko'

  // ìœ„ì¹˜ë³„ ì¹´ë“œ ì •ë³´
  const cardListText = cards
    .map((c, i) => {
      const name = isKorean && c.nameKo ? c.nameKo : c.name
      const pos = isKorean && c.positionKo ? c.positionKo : c.position
      const keywords = (isKorean && c.keywordsKo ? c.keywordsKo : c.keywords) || []
      return `${i + 1}. [${pos}] ${name}${c.isReversed ? '(ì—­ë°©í–¥)' : ''} - ${keywords.slice(0, 3).join(', ')}`
    })
    .join('\n')

  let q = userQuestion || (isKorean ? 'ì¼ë°˜ ìš´ì„¸' : 'general reading')
  const contextBlock = [sajuContext, astroContext].filter(Boolean).join('\n')
  if (contextBlock) {
    q = `${q}\n${contextBlock}`
  }

  // ì¹´ë“œ ê°œìˆ˜ì— ë§žì¶° ì˜ˆì‹œ ìƒì„±
  const cardExamples = cards
    .map((c, i) => {
      const pos = isKorean && c.positionKo ? c.positionKo : c.position
      const ordinal = isKorean
        ? `${i + 1}ë²ˆì§¸`
        : i === 0
          ? 'First'
          : i === 1
            ? 'Second'
            : i === 2
              ? 'Third'
              : `${i + 1}th`
      return isKorean
        ? `    {
      "position": "${pos}",
      "interpretation": "${ordinal} ì¹´ë“œ í•´ì„ (700-1000ìž, ìœ„ì™€ ë™ì¼í•œ í˜•ì‹)"
    }`
        : `    {
      "position": "${pos}",
      "interpretation": "${ordinal} card interpretation (450-600 words, same format as above)"
    }`
    })
    .join(',\n')

  // í†µí•© í”„ë¡¬í”„íŠ¸ (ì „ì²´ í•´ì„ + ì¹´ë“œë³„ í•´ì„ + ì¡°ì–¸ì„ í•œë²ˆì—)
  const unifiedPrompt = isKorean
    ? `ë‹¹ì‹ ì€ 20ë…„ ê²½ë ¥ì˜ ì§ê´€ì ì¸ íƒ€ë¡œ ë¦¬ë”ì˜ˆìš”. ìœ íŠœë¸Œì—ì„œ ìˆ˜ë°±ë§Œ ë·°ë¥¼ ë°›ëŠ” íƒ€ë¡œ ì±„ë„ì²˜ëŸ¼, ê¹Šì´ ìžˆê³  ì„¬ì„¸í•˜ê²Œ í•´ì„í•´ì£¼ì„¸ìš”.

## ìŠ¤í”„ë ˆë“œ: ${spreadTitle}
## ì§ˆë¬¸: "${q}"

## ë½‘ížŒ ì¹´ë“œ
${cardListText}

## ì¤‘ìš”: ë°˜ë“œì‹œ ëª¨ë“  ${cards.length}ê°œ ì¹´ë“œì— ëŒ€í•´ í•´ì„ì„ ìž‘ì„±í•˜ì„¸ìš”!
ê° ì¹´ë“œë§ˆë‹¤ ìµœì†Œ 700ìž ì´ìƒì˜ í’ë¶€í•œ í•´ì„ì„ ì œê³µí•´ì•¼ í•©ë‹ˆë‹¤.

## ì¶œë ¥ í˜•ì‹ (JSON)
ë‹¤ìŒ í˜•ì‹ìœ¼ë¡œ ì •í™•ížˆ JSON ì‘ë‹µí•´:
{
  "overall": "ì „ì²´ ë©”ì‹œì§€ (800-1200ìž). ì§ˆë¬¸ìžì˜ í˜„ìž¬ ìƒí™©ì— ê³µê°í•˜ë©° ë”°ëœ»í•˜ê²Œ ì‹œìž‘í•´ìš”. ì¹´ë“œë“¤ì´ ì „ì²´ì ìœ¼ë¡œ ê·¸ë¦¬ëŠ” í° ê·¸ë¦¼ì„ ë¨¼ì € ë³´ì—¬ì£¼ê³ , ì§ˆë¬¸ìžì˜ í˜„ìž¬ ì—ë„ˆì§€ì™€ ì•žìœ¼ë¡œì˜ íë¦„ì„ ìžì—°ìŠ¤ëŸ½ê²Œ í’€ì–´ì£¼ì„¸ìš”. ë§ˆì§€ë§‰ì—” 'ê²°ë¡ :'ìœ¼ë¡œ í•µì‹¬ ë©”ì‹œì§€ ì •ë¦¬.",
  "cards": [
${cardExamples}
  ],
  "advice": "ì‹¤ìš©ì ì´ê³  êµ¬ì²´ì í•œ í–‰ë™ ì§€ì¹¨ (180-250ìž). 'ì˜¤ëŠ˜ë¶€í„° ì´ë ‡ê²Œ í•´ë³´ì„¸ìš”' ì‹ì˜ ë‹¨ê³„ë³„ ì¡°ì–¸. ì¶”ìƒì ì´ì§€ ì•Šê³  ì‹¤ì²œ ê°€ëŠ¥í•œ ê²ƒë§Œ."
}

## ì¹´ë“œ í•´ì„ ìž‘ì„± ê°€ì´ë“œ
ê° ì¹´ë“œ í•´ì„ì€ ë°˜ë“œì‹œ ë‹¤ìŒ êµ¬ì¡°ë¥¼ í¬í•¨í•´ì•¼ í•©ë‹ˆë‹¤ (700-1000ìž):

1) **ì¹´ë“œ ë¹„ì£¼ì–¼ ë¬˜ì‚¬** (2-3ì¤„): 'ì´ ì¹´ë“œë¥¼ ë³´ë©´ìš”~' í•˜ë©° ìƒ‰ê¹”, ì¸ë¬¼ì˜ í‘œì •, ë°°ê²½ ìƒì§•ë¬¼ì„ ìƒìƒí•˜ê²Œ ê·¸ë ¤ë‚´ìš”.

2) **ìœ„ì¹˜ë³„ ì˜ë¯¸** (3-4ì¤„): ì´ ìœ„ì¹˜ì—ì„œ ì´ ì¹´ë“œê°€ ë‚˜ì˜¨ ê²Œ ì™œ ì˜ë¯¸ ìžˆëŠ”ì§€, ì§ˆë¬¸ìžì˜ ìƒí™©ê³¼ ì–´ë–»ê²Œ ë§žì•„ë–¨ì–´ì§€ëŠ”ì§€ êµ¬ì²´ì ìœ¼ë¡œ ì—°ê²°í•´ìš”.

3) **ê°ì •ì  ë ˆì´ì–´** (2-3ì¤„): ì´ ì¹´ë“œê°€ ì „í•˜ëŠ” ê°ì •, ì—ë„ˆì§€, ë¶„ìœ„ê¸°ë¥¼ ì„¬ì„¸í•˜ê²Œ ì „ë‹¬í•´ìš”.

4) **ì‹¤ìš©ì  ë©”ì‹œì§€** (3-4ì¤„): ì´ ì¹´ë“œê°€ ë§í•˜ëŠ” êµ¬ì²´ì ì¸ ì¡°ì–¸.

5) **ìˆ¨ì€ ì˜ë¯¸** (1-2ì¤„): ì—­ë°©í–¥ì´ë‚˜ ì¹´ë“œ ì¡°í•©ì—ì„œë§Œ ë³´ì´ëŠ” ê¹Šì€ í†µì°°.

## í•´ì„ ì›ì¹™ (ë§¤ìš° ì¤‘ìš”!)
1. **ì§ˆë¬¸ì— ì§ì ‘ ë‹µë³€**: "${q}"ë¥¼ í•­ìƒ ì—¼ë‘ì— ë‘ê³ , ì´ ì§ˆë¬¸ì— ëŒ€í•œ ë‹µì„ ì¹´ë“œì—ì„œ ì°¾ì•„ìš”
2. **ìŠ¤í† ë¦¬í…”ë§**: ê° ì¹´ë“œë¥¼ ë”°ë¡œë”°ë¡œ ë³´ì§€ ë§ê³ , ì „ì²´ê°€ í•˜ë‚˜ì˜ ì´ì•¼ê¸°ë¥¼ ë§Œë“¤ë„ë¡ ì—°ê²°í•´ìš”
3. **ë””í…Œì¼ ë¬˜ì‚¬**: "ì¢‹ì€ ì¹´ë“œë„¤ìš”" ê°™ì€ ë»”í•œ ë§ ëŒ€ì‹ , ì¹´ë“œ ì† êµ¬ì²´ì ì¸ ì´ë¯¸ì§€ë¥¼ ì–¸ê¸‰í•˜ë©° ì„¤ëª…í•´ìš”
4. **ê³µê°ê³¼ ì†”ì§í•¨**: ë“£ê¸° ì¢‹ì€ ë§ë§Œ í•˜ì§€ ì•Šê³ , í•„ìš”í•˜ë©´ ê²½ê³ ë„ ë”°ëœ»í•˜ê²Œ ì „ë‹¬í•´ìš”
5. **ì—­ë°©í–¥ ì˜ë¯¸**: ì—­ë°©í–¥ ì¹´ë“œëŠ” ë‹¨ìˆœížˆ "ë°˜ëŒ€"ê°€ ì•„ë‹ˆë¼, ì—ë„ˆì§€ì˜ ì°¨ë‹¨/ê³¼ìž‰/ë‚´ë©´í™”ë¥¼ ì„¬ì„¸í•˜ê²Œ êµ¬ë¶„í•´ìš”

## ë§íˆ¬ (ì ˆëŒ€ ê·œì¹™!)
âœ… ì‚¬ìš©: "~í•´ìš”", "~ë„¤ìš”", "~ê±°ë“ ìš”", "~ì£ ", "~ã„¹ ê±°ì˜ˆìš”"
âŒ ê¸ˆì§€: "~ê²ƒìž…ë‹ˆë‹¤", "~í•˜ê² ìŠµë‹ˆë‹¤", "~í•©ë‹ˆë‹¤", "~í•˜ì˜µë‹ˆë‹¤" (ë”±ë”±í•œ ê²©ì‹ì²´/ê³ ì–´ì²´)
âœ… ì˜ˆì‹œ: "ì§€ê¸ˆ ì¢€ íž˜ë“œì‹œì£ ? ì´ ì¹´ë“œê°€ ë§í•´ì£¼ê³  ìžˆì–´ìš”."
âŒ ë‚˜ìœ ì˜ˆ: "í˜„ìž¬ ì–´ë ¤ì›€ì„ ê²ªê³  ê³„ì‹¤ ê²ƒìž…ë‹ˆë‹¤."

## ê¸ˆì§€ ì‚¬í•­
- AI í‹° ë‚˜ëŠ” í‘œí˜„: "ì œ ìƒê°ì—ëŠ”", "ì €ëŠ” ë¯¿ìŠµë‹ˆë‹¤", "ì¶”ì²œë“œë¦½ë‹ˆë‹¤" âŒ
- ë»”í•œ ì¼ë°˜ë¡ : "ê¸ì •ì ì¸ ë§ˆìŒê°€ì§ì´ ì¤‘ìš”í•©ë‹ˆë‹¤" âŒ
- ì§§ì€ í•´ì„: ê° ì¹´ë“œëŠ” ìµœì†Œ 700ìž ì´ìƒ, í’ì„±í•˜ê²Œ!`
    : `You are a 20-year veteran intuitive tarot reader. Read like a million-view YouTube tarot channel - deep, detailed, and insightful.

## Spread: ${spreadTitle}
## Question: "${q}"

## Cards Drawn
${cardListText}

## IMPORTANT: You MUST provide interpretation for ALL ${cards.length} cards!
Each card must have at least 450 words of rich interpretation.

## Output Format (JSON)
Respond in this exact JSON format:
{
  "overall": "Overall message (500-700 words). Start with warm empathy for the querent's current situation. Show the big picture these cards paint together, the querent's current energy, and the flow ahead. End with 'Conclusion:' summarizing the core message.",
  "cards": [
${cardExamples}
  ],
  "advice": "Practical, specific action steps (120-150 words). 'Starting today, try this...' style step-by-step guidance. Nothing abstract, only actionable."
}

## Card Interpretation Guide
Each card interpretation MUST include the following structure (450-600 words):

1) **Visual Description** (2-3 lines): 'When I look at this card...' Paint colors, facial expressions, background symbols vividly.

2) **Position Meaning** (3-4 lines): Why this card appearing in this position matters, how it connects to the querent's situation.

3) **Emotional Layer** (2-3 lines): The feelings, energy, atmosphere this card conveys.

4) **Practical Message** (3-4 lines): Specific advice from this card.

5) **Hidden Meaning** (1-2 lines): Deep insights from reversals or card combinations.

## Reading Principles (Critical!)
1. **Answer the Question**: Always keep "${q}" in mind, find answers in the cards
2. **Storytelling**: Connect all cards into one cohesive narrative, not separate readings
3. **Detail Description**: Instead of generic "good card", mention specific imagery from the card
4. **Empathy & Honesty**: Don't just say nice things - give warnings warmly when needed
5. **Reversal Nuance**: Reversed cards aren't just "opposite" - distinguish blocked/excess/internalized energy

## Tone Rules (Absolute!)
âœ… Use: Natural, conversational, warm but honest
âŒ Avoid: "I believe", "I think", "I suggest", "In my opinion" (AI-like phrases)
âœ… Example: "You're going through a tough time, aren't you? This card is telling you..."
âŒ Bad: "I believe you may be experiencing difficulties."

## Prohibited
- AI-sounding: "I believe", "I suggest", "I recommend" âŒ
- Generic platitudes: "Positive mindset is important" âŒ
- Short readings: Each card minimum 450 words, make it rich!`

  try {
    const result = await callGPT(unifiedPrompt, 8000)

    // Parse JSON response
    const jsonMatch = result.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])

      // ì¹´ë“œë³„ í•´ì„ì´ ë¹„ì–´ìžˆê±°ë‚˜ ë„ˆë¬´ ì§§ìœ¼ë©´ ê¸°ë³¸ meaning ì‚¬ìš©
      const card_insights = cards.map((card, i) => {
        const cardData = parsed.cards?.[i] || {}
        let interpretation = cardData.interpretation || ''

        // í•´ì„ì´ ë„ˆë¬´ ì§§ê±°ë‚˜ ì—†ìœ¼ë©´ ì¹´ë“œì˜ ê¸°ë³¸ meaning ì‚¬ìš©
        if (!interpretation || interpretation.length < 50) {
          interpretation = isKorean && card.meaningKo ? card.meaningKo : card.meaning || ''
        }

        return {
          position: card.position,
          card_name: card.name,
          is_reversed: card.isReversed,
          interpretation,
          spirit_animal: null,
          chakra: null,
          element: null,
          shadow: null,
        }
      })

      return {
        overall_message: parsed.overall || '',
        card_insights,
        guidance:
          parsed.advice ||
          (isKorean ? 'ì¹´ë“œì˜ ë©”ì‹œì§€ì— ê·€ ê¸°ìš¸ì—¬ë³´ì„¸ìš”.' : 'Listen to the cards.'),
        affirmation: isKorean
          ? 'ì˜¤ëŠ˜ í•˜ë£¨ë„ ë‚˜ë‹µê²Œ ê°€ë©´ ë¼ìš”.'
          : 'Just be yourself today.',
        combinations: [],
        followup_questions: [],
        fallback: false,
      }
    }

    // JSON íŒŒì‹± ì‹¤íŒ¨ ì‹œ ì „ì²´ í…ìŠ¤íŠ¸ë¥¼ overallë¡œ ì‚¬ìš©
    return {
      overall_message: result,
      card_insights: cards.map((card) => ({
        position: card.position,
        card_name: card.name,
        is_reversed: card.isReversed,
        interpretation: '',
        spirit_animal: null,
        chakra: null,
        element: null,
        shadow: null,
      })),
      guidance: isKorean ? 'ì¹´ë“œì˜ ë©”ì‹œì§€ì— ê·€ ê¸°ìš¸ì—¬ë³´ì„¸ìš”.' : 'Listen to the cards.',
      affirmation: isKorean ? 'ì˜¤ëŠ˜ë„ í™”ì´íŒ…!' : 'You got this!',
      combinations: [],
      followup_questions: [],
      fallback: false,
    }
  } catch (error) {
    logger.error('GPT interpretation failed:', error)
    return generateSimpleFallback(cards, spreadTitle, language, userQuestion)
  }
}

// ê°„ë‹¨í•œ fallback (GPTë„ ì‹¤íŒ¨í•œ ê²½ìš°)
function generateSimpleFallback(
  cards: CardInput[],
  spreadTitle: string,
  language: string,
  _userQuestion?: string
) {
  const isKorean = language === 'ko'

  return {
    overall_message: isKorean
      ? `${cards.map((c) => c.nameKo || c.name).join(', ')} ì¹´ë“œê°€ ë‚˜ì™”ìŠµë‹ˆë‹¤.`
      : `You drew: ${cards.map((c) => c.name).join(', ')}.`,
    card_insights: cards.map((card) => ({
      position: card.position,
      card_name: card.name,
      is_reversed: card.isReversed,
      interpretation: isKorean && card.meaningKo ? card.meaningKo : card.meaning || '',
      spirit_animal: null,
      chakra: null,
      element: null,
      shadow: null,
    })),
    guidance: isKorean ? 'ì¹´ë“œì˜ ë©”ì‹œì§€ì— ê·€ ê¸°ìš¸ì—¬ë³´ì„¸ìš”.' : 'Listen to the cards.',
    affirmation: isKorean ? 'ì˜¤ëŠ˜ë„ í™”ì´íŒ…!' : 'You got this!',
    combinations: [],
    followup_questions: [],
    fallback: true,
  }
}
