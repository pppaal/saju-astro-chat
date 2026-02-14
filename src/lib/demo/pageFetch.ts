import { headers } from 'next/headers'

export async function fetchDemoJson<T>(pathWithToken: string): Promise<T> {
  const h = await headers()
  const host = h.get('host') || 'localhost:3000'
  const proto = h.get('x-forwarded-proto') || 'http'
  const url = `${proto}://${host}${pathWithToken}`

  const res = await fetch(url, {
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error(`Demo fetch failed: ${res.status}`)
  }
  return (await res.json()) as T
}
