// src/components/destiny-map/counselorDraft.ts
//
// Local (browser) persistence for an in-progress counselor conversation.
//
// Why this exists: the counselor chats kept the live conversation only in
// React state + (for signed-in users) a debounced DB autosave. So any
// remount — mobile app foreground/background reload, webview eviction
// under memory pressure, a plain refresh, or even an in-place resetKey
// bump — dropped the whole conversation. Guests fared worse: the save API
// requires auth, so a 401 meant nothing persisted at all and a refresh
// wiped everything ("상담서비스 다 리셋돼").
//
// localStorage covers everyone (guests included), survives reload AND
// mobile re-entry, and needs no network. The DB autosave still runs for
// signed-in users (it powers the sidebar history); this is the
// instant-resume layer on top.
//
// The store is a factory so each chat surface gets its own key and its own
// optional `meta` payload (the destiny counselor needs none; the
// compatibility counselor stashes the couple snapshot so a resume doesn't
// have to recompute both charts).

import type { Message } from './chat-constants'

// localStorage caps around ~5MB. A long conversation of full messages is a
// few hundred KB at most, but cap defensively so we never blow quota on a
// marathon session. We keep the leading system context (LLM grounding) plus
// the most recent turns.
const MAX_DRAFT_MESSAGES = 120

// Drop drafts older than this on read. A week-old "in-progress" chat is
// almost certainly abandoned; the user reaches old chats via the sidebar.
const DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

export interface CounselorDraft<Meta = undefined> {
  /** Session id the messages are saved under (matches the DB row id).
   *  May be null for a guest whose conversation never reached a DB save. */
  sessionId: string | null
  /** Locale the chat was conducted in. */
  locale: string
  /** Full message list, including any system context turn. */
  messages: Message[]
  /** Surface-specific extra payload (e.g. compatibility couple snapshot). */
  meta?: Meta
  /** Epoch ms of the last write — lets us age out stale drafts. */
  savedAt: number
}

export interface CounselorDraftInput<Meta = undefined> {
  sessionId: string | null
  locale: string
  messages: Message[]
  meta?: Meta
}

export interface CounselorDraftStore<Meta = undefined> {
  read: () => CounselorDraft<Meta> | null
  write: (draft: CounselorDraftInput<Meta>) => void
  clear: () => void
}

function capMessages(messages: Message[]): Message[] {
  if (messages.length <= MAX_DRAFT_MESSAGES) return messages
  const head = messages[0]?.role === 'system' ? [messages[0]] : []
  const tailCount = MAX_DRAFT_MESSAGES - head.length
  return [...head, ...messages.slice(messages.length - tailCount)]
}

export function createCounselorDraftStore<Meta = undefined>(
  storageKey: string
): CounselorDraftStore<Meta> {
  function clear(): void {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.removeItem(storageKey)
    } catch {
      // ignore
    }
  }

  function read(): CounselorDraft<Meta> | null {
    if (typeof window === 'undefined') return null
    try {
      const raw = window.localStorage.getItem(storageKey)
      if (!raw) return null
      const parsed = JSON.parse(raw) as Partial<CounselorDraft<Meta>> | null
      if (
        !parsed ||
        (parsed.sessionId !== null && typeof parsed.sessionId !== 'string') ||
        !Array.isArray(parsed.messages) ||
        parsed.messages.length === 0
      ) {
        return null
      }
      if (typeof parsed.savedAt === 'number' && Date.now() - parsed.savedAt > DRAFT_MAX_AGE_MS) {
        clear()
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
        sessionId: parsed.sessionId ?? null,
        locale: typeof parsed.locale === 'string' ? parsed.locale : 'ko',
        messages,
        meta: parsed.meta,
        savedAt: typeof parsed.savedAt === 'number' ? parsed.savedAt : Date.now(),
      }
    } catch {
      // Corrupt JSON, private-mode lockdown, etc. — treat as no draft.
      return null
    }
  }

  function write(draft: CounselorDraftInput<Meta>): void {
    if (typeof window === 'undefined') return
    // An empty-string id is "no real session"; null is allowed (guest who
    // hasn't hit a DB save yet). Either way we still want a non-empty convo.
    if (draft.sessionId === '' || draft.messages.length === 0) return
    try {
      const payload: CounselorDraft<Meta> = {
        sessionId: draft.sessionId,
        locale: draft.locale || 'ko',
        messages: capMessages(draft.messages),
        ...(draft.meta !== undefined ? { meta: draft.meta } : {}),
        savedAt: Date.now(),
      }
      window.localStorage.setItem(storageKey, JSON.stringify(payload))
    } catch {
      // Quota exceeded / private mode — non-fatal. The DB autosave (for
      // signed-in users) is the durable backstop.
    }
  }

  return { read, write, clear }
}

// ── Destiny counselor (no meta) ────────────────────────────────────────
const destinyStore = createCounselorDraftStore('destinypal:counselor:draft')
export const readCounselorDraft = destinyStore.read
export const writeCounselorDraft = destinyStore.write
export const clearCounselorDraft = destinyStore.clear

// ── Compatibility counselor (couple snapshot meta) ─────────────────────
export interface CompatCounselorDraftMeta {
  persons: unknown[]
  person1Saju: Record<string, unknown> | null
  person2Saju: Record<string, unknown> | null
  person1Astro: Record<string, unknown> | null
  person2Astro: Record<string, unknown> | null
  chatTitle: string | null
}

const compatStore = createCounselorDraftStore<CompatCounselorDraftMeta>(
  'destinypal:compat-counselor:draft'
)
export const readCompatCounselorDraft = compatStore.read
export const writeCompatCounselorDraft = compatStore.write
export const clearCompatCounselorDraft = compatStore.clear
