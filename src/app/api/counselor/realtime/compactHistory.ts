/**
 * Per-turn cache-miss preamble builder for the realtime counselor.
 *
 * The realtime user prompt is the only block that misses cache every
 * turn — system + birth snapshot are ephemeral-cached. Older assistant
 * replies are derived from the same snapshot the model still has, so
 * re-sending them is near-pure overhead. We instead emit:
 *   - the last `HISTORY_KEEP_VERBATIM` messages whole (covers the
 *     current question and the assistant turn it follows up on), and
 *   - older user turns as a short topic list ("Earlier topics: …").
 */

export interface CompactHistoryMessage {
  role: 'user' | 'assistant'
  content: string
}

// Verbatim window for the user prompt. The latest turn (= the question
// being answered) is always emitted whole; previous turns up to this
// count are also emitted whole so the model has immediate context for
// pronouns and follow-ups. Everything older collapses to a topic line.
export const HISTORY_KEEP_VERBATIM = 2
export const HISTORY_OLDER_TOPIC_CHARS = 50
export const HISTORY_OLDER_TOPIC_MAX = 6

export function compactHistory(messages: CompactHistoryMessage[]): string {
  if (messages.length === 0) return ''

  const recent = messages.slice(-HISTORY_KEEP_VERBATIM)
  const older = messages.slice(0, -recent.length)

  const olderTopics = older
    .filter((m) => m.role === 'user')
    .map((m) => m.content.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .slice(-HISTORY_OLDER_TOPIC_MAX)
    .map((q) =>
      q.length > HISTORY_OLDER_TOPIC_CHARS ? q.slice(0, HISTORY_OLDER_TOPIC_CHARS) + '…' : q
    )

  const lines: string[] = []
  if (olderTopics.length > 0) {
    lines.push(`(Earlier topics: ${olderTopics.map((t) => `"${t}"`).join(', ')})`)
  }
  for (const m of recent) {
    lines.push(`${m.role === 'user' ? 'User' : 'Counselor'}: ${m.content}`)
  }
  return lines.join('\n')
}
