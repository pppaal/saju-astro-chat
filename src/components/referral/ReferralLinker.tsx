'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { logger } from '@/lib/logger'

// Referral wiring (login-only app — no separate signup):
//  1) A friend opens the referral link `/?ref=CODE` (logged out). We stash the
//     code in a cookie so it survives the Google OAuth round-trip.
//  2) On their first authenticated render we POST /api/referral/link, which
//     grants the referrer's bonus credits (server gates to brand-new accounts),
//     then we clear the cookie.
const COOKIE = 'dp_ref'

function setCookie(name: string, value: string, days: number) {
  const exp = new Date(Date.now() + days * 864e5).toUTCString()
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${exp}; path=/; SameSite=Lax`
}
function getCookie(name: string): string | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return m ? decodeURIComponent(m[1]) : null
}
function deleteCookie(name: string) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
}

export default function ReferralLinker() {
  const { status } = useSession()

  // Capture ?ref=CODE on first load (before login).
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get('ref')
    if (ref && /^[A-Za-z0-9_-]{1,40}$/.test(ref)) {
      setCookie(COOKIE, ref, 30)
    }
  }, [])

  // Once authenticated, consume the stashed code exactly once.
  useEffect(() => {
    if (status !== 'authenticated') return
    if (!getCookie(COOKIE)) return
    fetch('/api/referral/link', { method: 'POST' })
      .catch((err) => {
        logger.debug('[ReferralLinker] link consume failed', { err })
      })
      .finally(() => deleteCookie(COOKIE))
  }, [status])

  return null
}
