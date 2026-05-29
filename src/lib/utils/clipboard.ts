/**
 * Cross-environment clipboard helper.
 *
 * `navigator.clipboard.writeText` only works in secure contexts (HTTPS or
 * localhost) and a few old WebViews don't implement it at all. We try the
 * async API first, then fall back to the deprecated `document.execCommand`
 * path which still works in non-HTTPS embeds (in-app browsers, file://,
 * legacy Android WebView).
 *
 * Returns `true` when the copy completed, `false` otherwise. Callers should
 * surface a fallback UI (toast / manual selection) on `false`.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // fall through to execCommand fallback
    }
  }
  if (typeof document === 'undefined') return false
  // execCommand fallback (deprecated but works in non-HTTPS + old webviews)
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.focus()
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}
