export type I18nMessages = Record<string, unknown>

/**
 * `/ko` 로케일 프리픽스를 벗겨 베어(영어) 경로를 돌려준다.
 *
 * proxy.ts 가 `/ko/...` 를 실제 라우트로 리라이트하지만 클라이언트의
 * `usePathname()` 은 브라우저 주소(`/ko/blog`) 를 그대로 돌려준다. 헤더/푸터가
 * "지금 홈인가 / 몰입형 라우트인가" 를 경로로 판정할 때는 반드시 이 함수를
 * 거쳐야 한국어 URL 에서도 같은 판정이 나온다.
 *
 *   '/ko'        → '/'
 *   '/ko/'       → '/'
 *   '/ko/blog/x' → '/blog/x'
 *   '/korea'     → '/korea'   (프리픽스가 아닌 경로는 그대로)
 *   null / ''    → '/'
 */
export function stripLocalePrefix(pathname: string | null | undefined): string {
  if (!pathname) return '/'
  if (pathname === '/ko' || pathname === '/ko/') return '/'
  if (pathname.startsWith('/ko/')) return pathname.slice(3)
  return pathname
}

export function toSafeFallbackText(path: string): string {
  const candidate = path.split('.').pop() || path
  const normalized = candidate
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim()

  if (!normalized) {
    return 'Content unavailable'
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

export function getPathValue(source: unknown, path: string): unknown {
  if (!path) {
    return undefined
  }

  const parts = path.split('.')
  let current: unknown = source

  for (const part of parts) {
    if (
      current !== null &&
      typeof current === 'object' &&
      part in (current as Record<string, unknown>)
    ) {
      current = (current as Record<string, unknown>)[part]
      continue
    }
    return undefined
  }

  return current
}

export function isPlaceholderTranslation(value: string, path: string): boolean {
  const leaf = path.split('.').pop() || path
  return value === path || value === leaf || value === toSafeFallbackText(path)
}
