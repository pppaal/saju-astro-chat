import 'server-only'

import type { NextRequest } from 'next/server'

export async function proxyToInternalApi(
  request: NextRequest,
  path: string,
  init: {
    method?: 'GET' | 'POST'
    query?: Record<string, string | number | undefined>
    body?: unknown
    demoToken?: string
  }
) {
  const url = new URL(path, request.nextUrl.origin)
  if (init.query) {
    for (const [key, value] of Object.entries(init.query)) {
      if (value === undefined) {
        continue
      }
      url.searchParams.set(key, String(value))
    }
  }

  const headers: HeadersInit = {
    'content-type': 'application/json',
    origin: request.nextUrl.origin,
  }
  if (init.demoToken) {
    headers['x-demo-token'] = init.demoToken
  }

  return fetch(url, {
    method: init.method || 'POST',
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: 'no-store',
  })
}
