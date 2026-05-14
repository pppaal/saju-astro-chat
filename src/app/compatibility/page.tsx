/**
 * /compatibility — redirects to the realtime counselor.
 *
 * The legacy deterministic-score + 12-paragraph dump UI lives at
 * `page.legacy.tsx` for reference and a future "report" feature; it's
 * no longer the user-facing entry point. Anyone hitting /compatibility
 * (bookmarks, old links, drawer link) lands on the chat counselor.
 */

import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function CompatibilityIndex() {
  redirect('/compatibility/realtime')
}
