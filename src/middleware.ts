import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export function middleware(_req: NextRequest) {
  return NextResponse.next()
}

if (process.env.NODE_ENV !== 'production') {
  const origFetch = global.fetch as any
  // @ts-ignore
  global.fetch = async (input: any, init?: any) => {
    const url = typeof input === 'string' ? input : String(input?.url || '')
    // Gemini 모든 버전 차단(원하면 1.5만으로 축소)
    if (/generativelanguage\.googleapis\.com\/.+gemini/i.test(url)) {
      const method = init?.method || 'GET'
      let bodyPreview = ''
      try {
        const raw = init?.body
        if (typeof raw === 'string') bodyPreview = raw.slice(0, 200)
        else if (raw && typeof raw === 'object') bodyPreview = JSON.stringify(raw).slice(0, 200)
      } catch {}
      const err = new Error(
        `[BLOCKED] Gemini call detected in dev: ${method} ${url}\nBodyPreview: ${bodyPreview}`
      )
      console.error(err.stack || String(err))
      throw err
    }
    return origFetch(input, init)
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}