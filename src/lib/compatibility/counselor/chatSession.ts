/**
 * Persistence helpers for the realtime compatibility counselor.
 *
 * One row per (userId, pairHash). Same two people = same session continued.
 */

import crypto from 'node:crypto'
import { prisma } from '@/lib/db/prisma'
import type { CounselorPerson, RelationKey } from '@/lib/compatibility/counselor'

const MAX_PERSISTED_MESSAGES = 60

export interface StoredChatMessage {
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

export interface ChatSessionRecord {
  id: string
  userId: string
  pairHash: string
  personA: CounselorPerson
  personB: CounselorPerson
  relation: RelationKey
  relationNote: string | null
  messages: StoredChatMessage[]
  turnCount: number
  createdAt: Date
  updatedAt: Date
}

/**
 * Stable, order-independent hash of two birth profiles + relation.
 * Order-independent so (A, B) and (B, A) collapse to the same session.
 */
export function computePairHash(
  a: CounselorPerson,
  b: CounselorPerson,
  relation: RelationKey
): string {
  const keyA = personKey(a)
  const keyB = personKey(b)
  const [first, second] = [keyA, keyB].sort()
  return crypto
    .createHash('sha1')
    .update(`${first}|${second}|${relation}`)
    .digest('hex')
}

function personKey(p: CounselorPerson): string {
  return [
    p.birthDate,
    p.birthTime || '00:00',
    p.gender,
    p.birthCity || '',
    p.latitude ?? '',
    p.longitude ?? '',
    p.tzId || '',
  ].join(':')
}

/** Tolerate the table being absent (migration not yet applied). */
async function safeAccess<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    // P2021 / "does not exist" — fall back silently so missing migration
    // doesn't 500 the route. The migration must be applied for sessions
    // to actually persist.
    if (
      msg.includes('P2021') ||
      msg.includes('does not exist') ||
      msg.includes('relation "CompatibilityChatSession"')
    ) {
      return fallback
    }
    throw err
  }
}

export async function findOrCreateSession(
  userId: string,
  personA: CounselorPerson,
  personB: CounselorPerson,
  relation: RelationKey,
  relationNote: string | null
): Promise<ChatSessionRecord | null> {
  const pairHash = computePairHash(personA, personB, relation)
  return safeAccess(async () => {
    const existing = await prisma.compatibilityChatSession.findUnique({
      where: { userId_pairHash: { userId, pairHash } },
    })
    if (existing) {
      return rowToRecord(existing)
    }
    const created = await prisma.compatibilityChatSession.create({
      data: {
        userId,
        pairHash,
        personA: personA as unknown as object,
        personB: personB as unknown as object,
        relation,
        relationNote: relationNote ?? null,
        messages: [],
        turnCount: 0,
      },
    })
    return rowToRecord(created)
  }, null)
}

export async function getSession(
  userId: string,
  sessionId: string
): Promise<ChatSessionRecord | null> {
  return safeAccess(async () => {
    const row = await prisma.compatibilityChatSession.findUnique({
      where: { id: sessionId },
    })
    if (!row || row.userId !== userId) return null
    return rowToRecord(row)
  }, null)
}

/**
 * Append new messages to a session. Pass either:
 *   - `[assistant]` for the auto-greeting turn (no user side to record)
 *   - `[user, assistant]` for a normal follow-up turn
 *
 * The "__start__" sentinel is never persisted; callers should filter it
 * out before calling this.
 */
export async function appendTurn(
  userId: string,
  sessionId: string,
  newMessages: StoredChatMessage[]
): Promise<void> {
  if (newMessages.length === 0) return
  await safeAccess(async () => {
    const existing = await prisma.compatibilityChatSession.findUnique({
      where: { id: sessionId },
      select: { userId: true, messages: true, turnCount: true },
    })
    if (!existing || existing.userId !== userId) return null
    const prior = (existing.messages as unknown as StoredChatMessage[]) || []
    const merged = [...prior, ...newMessages].slice(-MAX_PERSISTED_MESSAGES)
    await prisma.compatibilityChatSession.update({
      where: { id: sessionId },
      data: {
        messages: merged as unknown as object,
        turnCount: existing.turnCount + 1,
      },
    })
    return null
  }, null)
}

function rowToRecord(row: {
  id: string
  userId: string
  pairHash: string
  personA: unknown
  personB: unknown
  relation: string
  relationNote: string | null
  messages: unknown
  turnCount: number
  createdAt: Date
  updatedAt: Date
}): ChatSessionRecord {
  return {
    id: row.id,
    userId: row.userId,
    pairHash: row.pairHash,
    personA: row.personA as CounselorPerson,
    personB: row.personB as CounselorPerson,
    relation: row.relation as RelationKey,
    relationNote: row.relationNote,
    messages: ((row.messages as unknown as StoredChatMessage[]) || []).slice(
      -MAX_PERSISTED_MESSAGES
    ),
    turnCount: row.turnCount,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}
