/**
 * POST /api/compatibility/realtime
 *
 * 2-person compatibility counselor — chat-style streaming endpoint.
 *
 * Architecture:
 *   - Server builds a long system prompt from the two people's raw saju +
 *     astro data (via `buildCounselorPrompt`).
 *   - The system block is sent with `cache_control: ephemeral ttl=1h` so
 *     multi-turn chats reuse the cache (~90% input-token discount).
 *   - Client owns the full conversation history (v1 — no server-side
 *     persistence yet). To open a chat, send a single user message with
 *     content "__start__" — the prompt's "[첫 응답 규칙]" makes the model
 *     auto-greet with a 3~4 paragraph 종합 인상.
 *   - Response is plain SSE: `data: {"content": "...", "done": false}\n\n`,
 *     ending with `data: {"content": "", "done": true}\n\n`.
 *
 * Free-quota enforcement (1 free question for guests, 2 for logged-in,
 * then per-turn credit deduction) lives one layer up — this endpoint
 * trusts the caller. Wiring that into auth middleware is a follow-up.
 */

import { NextRequest, NextResponse } from 'next/server'
import { buildCounselorPrompt } from '@/lib/compatibility/counselor'
import { RealtimeChatRequestSchema } from './validation'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

const ANTHROPIC_ENDPOINT = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_VERSION = '2023-06-01'
const PROMPT_CACHE_BETA_HEADER = 'extended-cache-ttl-2025-04-11'
const CACHE_CONTROL_1H = { type: 'ephemeral' as const, ttl: '1h' as const }

const MODEL = process.env.COUNSELOR_CLAUDE_MODEL || 'claude-sonnet-4-5-20250929'
const MAX_TOKENS = 1800

export async function POST(req: NextRequest): Promise<Response> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY is not configured on the server.' },
      { status: 503 }
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const parsed = RealtimeChatRequestSchema.safeParse(body)
  if (!parsed.success) {
    logger.warn('[compat/realtime] validation failed', { issues: parsed.error.issues })
    return NextResponse.json(
      { error: 'validation_error', issues: parsed.error.issues },
      { status: 400 }
    )
  }

  const { personA, personB, relation, relationNote, messages } = parsed.data

  let systemPrompt: string
  let missingLocation: string[]
  try {
    const built = await buildCounselorPrompt({
      personA: { ...personA, birthCity: personA.birthCity ?? null },
      personB: { ...personB, birthCity: personB.birthCity ?? null },
      relation,
      relationNote: relationNote ?? null,
    })
    systemPrompt = built.systemPrompt
    missingLocation = built.missingLocation
  } catch (err) {
    logger.error('[compat/realtime] system prompt build failed', err)
    return NextResponse.json({ error: 'prompt_build_failed' }, { status: 500 })
  }

  // Anthropic accepts the messages array verbatim. The "__start__" sentinel
  // for the first turn is interpreted by the system prompt itself — no
  // server-side translation needed.
  const anthropicMessages = messages.map((m) => ({ role: m.role, content: m.content }))

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 55_000)

  let upstream: Response
  try {
    upstream = await fetch(ANTHROPIC_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
        'anthropic-beta': PROMPT_CACHE_BETA_HEADER,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        temperature: 0.7,
        stream: true,
        system: [{ type: 'text', text: systemPrompt, cache_control: CACHE_CONTROL_1H }],
        messages: anthropicMessages,
      }),
      signal: controller.signal,
    })
  } catch (err) {
    clearTimeout(timer)
    logger.error('[compat/realtime] upstream fetch failed', err)
    return NextResponse.json({ error: 'upstream_unreachable' }, { status: 502 })
  }

  if (!upstream.ok || !upstream.body) {
    clearTimeout(timer)
    const errText = await upstream.text().catch(() => '')
    logger.error('[compat/realtime] upstream error', {
      status: upstream.status,
      body: errText.slice(0, 300),
    })
    return NextResponse.json(
      { error: 'upstream_error', status: upstream.status },
      { status: 502 }
    )
  }

  const reader = upstream.body.getReader()
  const decoder = new TextDecoder()
  const encoder = new TextEncoder()

  const stream = new ReadableStream<Uint8Array>({
    async start(streamController) {
      // Emit a single meta event so the client knows which person(s) had
      // no city — useful for an inline "(출생지 미상으로 위치 기반 결론은
      // 제외했어요)" banner.
      const metaLine = `data: ${JSON.stringify({ type: 'meta', missingLocation })}\n\n`
      streamController.enqueue(encoder.encode(metaLine))

      let buffer = ''
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          let idx
          while ((idx = buffer.indexOf('\n\n')) !== -1) {
            const block = buffer.slice(0, idx)
            buffer = buffer.slice(idx + 2)
            const dataLine = block.split('\n').find((l) => l.startsWith('data: '))
            if (!dataLine) continue
            const json = dataLine.slice(6).trim()
            if (json === '[DONE]') continue
            try {
              const event = JSON.parse(json) as {
                type?: string
                delta?: { text?: string; type?: string }
              }
              if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
                const text = event.delta.text || ''
                if (text) {
                  const line = `data: ${JSON.stringify({ content: text, done: false })}\n\n`
                  streamController.enqueue(encoder.encode(line))
                }
              }
            } catch {
              // partial JSON — ignore, will pick up on the next chunk
            }
          }
        }
        const finalLine = `data: ${JSON.stringify({ content: '', done: true })}\n\n`
        streamController.enqueue(encoder.encode(finalLine))
        streamController.close()
      } catch (err) {
        logger.error('[compat/realtime] stream error', err)
        try {
          const errLine = `data: ${JSON.stringify({ content: '', done: true, error: 'stream_error' })}\n\n`
          streamController.enqueue(encoder.encode(errLine))
        } catch {
          // already closed
        }
        streamController.close()
      } finally {
        clearTimeout(timer)
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-store',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
