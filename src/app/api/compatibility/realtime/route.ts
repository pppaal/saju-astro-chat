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
 * Free-quota policy (enforced here):
 *   - Guest (no session): 1 free question lifetime per device — tracked via
 *     httpOnly cookie. After that → 402 with reason="login_required".
 *   - Logged-in: 2 free questions lifetime (UserCredits.compatRealtimeFreeUsed).
 *     After that → consume 1 `reading` credit per question. If the user has
 *     no credits → 402 with reason="no_credits".
 *   - The "__start__" sentinel + the assistant's auto-greeting also count as
 *     1 question — the auto greeting is the first answer the user sees.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { prisma } from '@/lib/db/prisma'
import { canUseCredits, consumeCredits, getCreditBalance } from '@/lib/credits/creditService'
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

const GUEST_FREE_LIMIT = 1
const LOGGED_IN_FREE_LIMIT = 2
const GUEST_COOKIE_NAME = 'compat_realtime_guest_used'
const GUEST_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

interface QuotaDecision {
  /** When set, the request is rejected with this status + payload. */
  reject?: { status: number; body: Record<string, unknown> }
  /** True if this turn consumed the free quota — caller increments at end. */
  consumedFree?: boolean
  /** True if this turn should consume 1 paid `reading` credit on success. */
  needsPaidConsume?: boolean
  /** Cookie value to set on the response (guest only). */
  setGuestCookie?: string
}

async function decideQuota(
  req: NextRequest,
  userId: string | null
): Promise<QuotaDecision> {
  // Guest path — cookie-based, no DB
  if (!userId) {
    const usedRaw = req.cookies.get(GUEST_COOKIE_NAME)?.value
    const used = Number.parseInt(usedRaw || '0', 10) || 0
    if (used >= GUEST_FREE_LIMIT) {
      return {
        reject: {
          status: 402,
          body: {
            error: 'quota_exhausted',
            reason: 'login_required',
            message: '이 기기에선 무료 상담을 다 쓰셨어요. 로그인하면 2회 더 무료예요.',
          },
        },
      }
    }
    return {
      consumedFree: true,
      setGuestCookie: buildGuestCookie(used + 1),
    }
  }

  // Logged-in path — DB-backed counter, then `reading` credit pool.
  // The `compatRealtimeFreeUsed` column was added in 20260514 migration.
  // If the migration hasn't been deployed yet we fail soft (allow the
  // turn as "free") rather than 500'ing the whole route.
  let freeUsed = 0
  try {
    const credits = await prisma.userCredits.findUnique({
      where: { userId },
      select: { compatRealtimeFreeUsed: true },
    })
    freeUsed = credits?.compatRealtimeFreeUsed ?? 0
  } catch (err) {
    logger.warn(
      '[compat/realtime] compatRealtimeFreeUsed column missing — falling back to free mode (apply migration 20260514_add_compat_realtime_free_used)',
      err
    )
    return { consumedFree: true }
  }

  if (freeUsed < LOGGED_IN_FREE_LIMIT) {
    return { consumedFree: true }
  }

  // Out of free quota — check paid credits
  const check = await canUseCredits(userId, 'reading', 1)
  if (!check.allowed) {
    const balance = await getCreditBalance(userId).catch(() => null)
    return {
      reject: {
        status: 402,
        body: {
          error: 'quota_exhausted',
          reason: 'no_credits',
          message: '무료 상담을 모두 쓰셨어요. 크레딧 1개로 한 번 더 이어갈 수 있어요.',
          remainingCredits: balance?.remainingCredits ?? 0,
        },
      },
    }
  }
  return { needsPaidConsume: true }
}

function buildGuestCookie(next: number): string {
  const parts = [
    `${GUEST_COOKIE_NAME}=${next}`,
    'Path=/',
    `Max-Age=${GUEST_COOKIE_MAX_AGE}`,
    'SameSite=Lax',
    'HttpOnly',
  ]
  if (process.env.NODE_ENV === 'production') parts.push('Secure')
  return parts.join('; ')
}

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

  // Resolve identity + enforce free / paid quota BEFORE we burn an LLM call.
  const session = await getServerSession(authOptions).catch(() => null)
  const userId = session?.user?.id ?? null
  const quota = await decideQuota(req, userId)
  if (quota.reject) {
    const res = NextResponse.json(quota.reject.body, { status: quota.reject.status })
    if (quota.setGuestCookie) res.headers.set('Set-Cookie', quota.setGuestCookie)
    return res
  }

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
        // Settlement: now that we know the LLM answered, charge the user.
        // Done at-most-once per turn, only on success.
        await settleQuota(userId, quota).catch((err) => {
          logger.warn('[compat/realtime] quota settle failed', err)
        })
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

  const headers = new Headers({
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-store',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  })
  if (quota.setGuestCookie) {
    headers.set('Set-Cookie', quota.setGuestCookie)
  }
  return new Response(stream, { headers })
}

async function settleQuota(userId: string | null, quota: QuotaDecision): Promise<void> {
  if (!userId) {
    // Guest accounting is done up-front via cookie — nothing to settle.
    return
  }
  if (quota.consumedFree) {
    try {
      await prisma.userCredits.update({
        where: { userId },
        data: { compatRealtimeFreeUsed: { increment: 1 } },
      })
    } catch (err) {
      logger.warn('[compat/realtime] failed to increment compatRealtimeFreeUsed', err)
    }
    return
  }
  if (quota.needsPaidConsume) {
    await consumeCredits(userId, 'reading', 1)
  }
}
