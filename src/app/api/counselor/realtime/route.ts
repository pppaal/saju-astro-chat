/**
 * Realtime Counselor — minimal endpoint.
 *
 * Pipeline (the only one we want):
 *   1. Compute saju + astrology
 *   2. Compute cross (runFortune)  — saju ↔ astro signal agreement
 *   3. Hand the cross summary + chat history + question to the LLM
 *   4. Stream the answer back via SSE
 *
 * No Interpreted Answer Contract, no evidence packets, no pre-decided
 * direct answers, no theme-applied contexts. Just cross signals + question.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { runFortune, renderToText } from '@/lib/fortune/cross-rules'
import { streamClaudeAsSSE } from '@/lib/llm/claudeSSE'
import { logger } from '@/lib/logger'
import { containsForbidden, safetyMessage } from '@/lib/textGuards'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 120

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface RealtimeBody {
  messages: ChatMessage[]
  lang?: 'ko' | 'en'
  birthDate?: string
  birthTime?: string
  gender?: 'male' | 'female'
  latitude?: number
  longitude?: number
  timezone?: string
}

const SYSTEM_PROMPT_KO = `당신은 동양 사주명리와 서양 점성술을 함께 보는 운명 상담사입니다.

규칙:
- 아래 [Cross Signals] 블록에 사주·점성·교차분석이 이미 정리되어 있습니다.
- 사용자의 질문을 그 신호에 비추어 직접 답하세요.
- 결론을 먼저 1~2문장. 그다음 근거를 cross signal로 연결.
- 양쪽 시스템이 같이 가리키면 "강한 신호", 한쪽만이면 "약함" 또는 "참고용"으로 표시.
- 모르면 모른다고. 단정 금지.
- 한 번에 한 가지에 집중. 산만한 만물상담 금지.`

const SYSTEM_PROMPT_EN = `You are a destiny counselor combining Eastern Saju and Western Astrology.

Rules:
- The [Cross Signals] block below already contains the computed saju, astrology, and cross-analysis.
- Answer the user's question by interpreting those signals directly.
- Lead with the conclusion (1–2 sentences). Then link evidence from cross signals.
- If both systems agree, mark as "strong signal". If only one, mark as "weak" or "for reference".
- Say "I don't know" when uncertain. No absolute claims.
- Focus on one question at a time.`

export async function POST(req: NextRequest) {
  // 1) Auth
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // 2) Parse body
  let body: RealtimeBody
  try {
    body = (await req.json()) as RealtimeBody
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return NextResponse.json({ error: 'messages_required' }, { status: 400 })
  }
  if (!body.birthDate) {
    return NextResponse.json({ error: 'birthDate_required' }, { status: 400 })
  }

  const lang: 'ko' | 'en' = body.lang === 'en' ? 'en' : 'ko'
  const userMessage = body.messages[body.messages.length - 1]?.content ?? ''
  if (!userMessage.trim()) {
    return NextResponse.json({ error: 'empty_message' }, { status: 400 })
  }
  if (containsForbidden(userMessage)) {
    return NextResponse.json({ message: safetyMessage(lang) }, { status: 200 })
  }

  // 3) Compute cross signals (saju + astro + agreement)
  let crossText = ''
  try {
    const report = await runFortune({
      birth: {
        birthDate: body.birthDate,
        birthTime: body.birthTime ?? '12:00',
        gender: body.gender === 'female' ? 'female' : 'male',
        timezone: body.timezone ?? 'Asia/Seoul',
        latitude: body.latitude ?? 37.5665,
        longitude: body.longitude ?? 126.978,
        astroTimezone: body.timezone ?? 'Asia/Seoul',
      },
      queryDate: new Date(),
    })
    crossText = renderToText(report)
  } catch (err) {
    logger.error('[counselor/realtime] cross compute failed', { err })
    return NextResponse.json({ error: 'cross_failed' }, { status: 500 })
  }

  // 4) Build prompt (small system + cached cross context + chat history)
  const systemPrompt = lang === 'en' ? SYSTEM_PROMPT_EN : SYSTEM_PROMPT_KO

  const history = body.messages
    .slice(-8) // keep last 8 turns for short context
    .map((m) => `${m.role === 'user' ? 'User' : 'Counselor'}: ${m.content}`)
    .join('\n')

  const cachedUserContext = `[Cross Signals]\n${crossText}`
  const userPrompt =
    lang === 'en'
      ? `Conversation so far:\n${history}\n\nAnswer the latest user question using the cross signals.`
      : `이전 대화:\n${history}\n\n위 cross signals를 근거로 마지막 질문에 답하세요.`

  // 5) Stream
  return streamClaudeAsSSE({
    systemPrompt,
    userPrompt,
    cachedUserContext,
    maxTokens: 1500,
    temperature: 0.7,
    label: 'counselor.realtime',
  })
}
