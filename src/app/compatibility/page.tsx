/**
 * /compatibility — redirects to the realtime counselor.
 *
 * The legacy deterministic-score + matrix UI was deleted; the only
 * user-facing compatibility surface is the realtime chat. Anyone hitting
 * /compatibility (bookmarks, old links, drawer link) lands on the chat
 * counselor. The score lib is preserved under `@/lib/compatibility/*`
 * for a future report feature.
 */

import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function CompatibilityIndex() {
  redirect('/compatibility/realtime')
}
