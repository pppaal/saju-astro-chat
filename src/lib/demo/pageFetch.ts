import { headers } from 'next/headers'

export async function fetchDemoJson<T>(pathWithToken: string, token?: string): Promise<T> {
  const h = await headers()
  const host =
    h.get('x-forwarded-host') ||
    h.get('host') ||
    process.env.VERCEL_URL ||
    process.env.NEXT_PUBLIC_BASE_URL?.replace(/^https?:\/\//, '') ||
    'localhost:3000'
  const proto = h.get('x-forwarded-proto') || 'https'
  const url = `${proto}://${host}${pathWithToken}`

  const requestHeaders: HeadersInit = {}
  if (token) {
    requestHeaders['x-demo-token'] = token
  }

  const res = await fetch(url, {
    cache: 'no-store',
    headers: requestHeaders,
  })

  if (!res.ok) {
    throw new Error(`Demo fetch failed: ${res.status}`)
  }
  return (await res.json()) as T
}
