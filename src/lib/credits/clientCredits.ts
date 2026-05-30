// Client-side credit balance peek for *upfront* gating.
//
// Credit-spending features (tarot draw/interpret) only surfaced a 402 after
// the user had done the work — e.g. drawn a whole spread — which felt like a
// bait-and-switch. Call this when the user commits (submits a question, picks
// a spread, starts a couple reading) to decide whether to show the depleted
// modal *before* sending them down the flow.
//
// Returns the remaining credit count, or `null` when it's unknown — a guest
// (no per-user balance), an error, or an unexpected shape. Callers must treat
// `null` as "let the server decide" and proceed, so we never trap a paying
// user behind a flaky balance read.
export async function fetchRemainingCredits(): Promise<number | null> {
  if (typeof window === 'undefined') return null
  try {
    const res = await fetch('/api/me/credits')
    if (!res.ok) return null
    const data = await res.json()
    const remaining = data?.credits?.remaining
    return typeof remaining === 'number' ? remaining : null
  } catch {
    return null
  }
}
