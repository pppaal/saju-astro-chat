/**
 * POST /api/compatibility/realtime/session
 *
 * Get-or-create a chat session for a (logged-in) user × two-person pair.
 * Returns the sessionId + any prior messages so the client can restore
 * the conversation where it left off.
 *
 * Guests (no session) don't get persistence — the client just starts
 * fresh and we return a 200 with an empty session id.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import {
  deleteSession,
  findOrCreateSession,
} from '@/lib/compatibility/counselor/chatSession'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const personSchema = z.object({
  name: z.string().min(1).max(50),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  birthTime: z.string().regex(/^\d{2}:\d{2}$/).optional().default('00:00'),
  gender: z.enum(['male', 'female']),
  birthCity: z.string().max(120).nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  tzId: z.string().max(64).nullable().optional(),
})

const RELATION_KEYS = [
  'partner',
  'crush',
  'spouse',
  'engaged',
  'ex',
  'friend',
  'family',
  'colleague',
  'business',
  'other',
] as const

const requestSchema = z.object({
  personA: personSchema,
  personB: personSchema,
  relation: z.enum(RELATION_KEYS),
  relationNote: z.string().max(200).nullable().optional(),
})

export async function POST(req: NextRequest): Promise<Response> {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation_error', issues: parsed.error.issues },
      { status: 400 }
    )
  }

  const session = await getServerSession(authOptions).catch(() => null)
  const userId = session?.user?.id ?? null

  // Guests: no persistence. Return an empty session payload.
  if (!userId) {
    return NextResponse.json({
      sessionId: null,
      messages: [],
      isResumed: false,
      isGuest: true,
    })
  }

  const { personA, personB, relation, relationNote } = parsed.data
  try {
    const record = await findOrCreateSession(
      userId,
      { ...personA, birthCity: personA.birthCity ?? null },
      { ...personB, birthCity: personB.birthCity ?? null },
      relation,
      relationNote ?? null
    )
    if (!record) {
      // Migration not yet applied — fall back to ephemeral mode.
      return NextResponse.json({
        sessionId: null,
        messages: [],
        isResumed: false,
        isGuest: false,
        warning: 'persistence_unavailable',
      })
    }
    return NextResponse.json({
      sessionId: record.id,
      messages: record.messages,
      isResumed: record.messages.length > 0,
      isGuest: false,
    })
  } catch (err) {
    logger.error('[compat/realtime/session] failed', err)
    return NextResponse.json({ error: 'session_create_failed' }, { status: 500 })
  }
}

/**
 * DELETE /api/compatibility/realtime/session?id=<sessionId>
 *
 * Lets a logged-in user wipe a chat session (privacy + mistakes). Guests
 * have nothing persisted so a 401 is returned in that case.
 */
export async function DELETE(req: NextRequest): Promise<Response> {
  const session = await getServerSession(authOptions).catch(() => null)
  const userId = session?.user?.id ?? null
  if (!userId) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }
  const sessionId = new URL(req.url).searchParams.get('id')
  if (!sessionId) {
    return NextResponse.json({ error: 'missing_id' }, { status: 400 })
  }
  try {
    const ok = await deleteSession(userId, sessionId)
    if (!ok) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (err) {
    logger.error('[compat/realtime/session DELETE] failed', err)
    return NextResponse.json({ error: 'delete_failed' }, { status: 500 })
  }
}
