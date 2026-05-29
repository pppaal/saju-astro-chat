// src/components/destiny-map/counselorDraft.ts
//
// Local (browser) persistence for the in-progress counselor conversation.
//
// Why this exists: the counselor chat kept the live conversation only in
// React state + (for signed-in users) a debounced DB autosave. So any
// remount — mobile app foreground/background reload, webview eviction
// under memory pressure, a plain refresh, or even an in-place chatResetKey
// bump — dropped the whole conversation. Guests fared worse: the save API
// requires auth, so a 401 meant nothing persisted at all and a refresh
// wiped everything ("상담서비스 다 리셋돼").
//
// localStorage covers everyone (guests included), survives reload AND
// mobile re-entry, and needs no network. The DB autosave still runs for
// signed-in users (it powers the sidebar history); this is the
// instant-resume layer on top.

import type { Message } from './chat-constants'

const DRAFT_KEY = 'destinypal:counselor:draft'

// localStorage caps around ~5MB. A long conversation of full messages is a
// few hundred KB at most, but cap defensively so we never blow quota on a
// marathon session. We keep the leading system context (LLM grounding) plus
// the most recent turns.
const MAX_DRAFT_MESSAGES = 120

export interface CounselorDraft {
  /** Session id the messages are saved under (matches the DB row id). */
  sessionId: string
  /** Locale the chat was conducted in. */
  locale: string
  /** Full message list, including the system context turn. */
  messages: Message[]
  /** Epoch ms of the last write — lets us age out stale drafts. */
  savedAt: number
}

// Drop drafts older than this on read. A week-old "in-progress" chat is
// almost certainly abandoned; the user reaches old chats via the sidebar.
const DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

function capMessages(messages: Message[]): Message[] {
  if (messages.length <= MAX_DRAFT_MESSAGES) return messages
  const head = messages[0]?.role === 'system' ? [messages[0]] : []
  const tailCount = MAX_DRAFT_MESSAGES - head.length
  return [...head, ...messages.slice(messages.length - tailCount)]
}

export function readCounselorDraft(): CounselorDraft | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<CounselorDraft> | null
    if (
      !parsed ||
      typeof parsed.sessionId !== 'string' ||
      !Array.isArray(parsed.messages) ||
      parsed.messages.length === 0
    ) {
      return null
    }
    if (typeof parsed.savedAt === 'number' && Date.now() - parsed.savedAt > DRAFT_MAX_AGE_MS) {
      clearCounselorDraft()
      return null
    }
    // Strip the transient `streaming` flag so a draft saved mid-stream
    // doesn't restore a message stuck in the "typing…" state. `incomplete`
    // is intentionally preserved — a turn that was cut off should still
    // surface its retry affordance after restore.
    const messages = (parsed.messages as Message[]).map((m) =>
      m.streaming ? { ...m, streaming: false } : m
    )
    return {
      sessionId: parsed.sessionId,
      locale: typeof parsed.locale === 'string' ? parsed.locale : 'ko',
      messages,
      savedAt: typeof parsed.savedAt === 'number' ? parsed.savedAt : Date.now(),
    }
  } catch {
    // Corrupt JSON, private-mode lockdown, etc. — treat as no draft.
    return null
  }
}

export function writeCounselorDraft(draft: {
  sessionId: string
  locale: string
  messages: Message[]
}): void {
  if (typeof window === 'undefined') return
  if (!draft.sessionId || draft.messages.length === 0) return
  try {
    const payload: CounselorDraft = {
      sessionId: draft.sessionId,
      locale: draft.locale || 'ko',
      messages: capMessages(draft.messages),
      savedAt: Date.now(),
    }
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(payload))
  } catch {
    // Quota exceeded / private mode — non-fatal. The DB autosave (for
    // signed-in users) is the durable backstop.
  }
}

export function clearCounselorDraft(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(DRAFT_KEY)
  } catch {
    // ignore
  }
}
