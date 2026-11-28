// @vitest-environment node
/**
 * /free → / 통합 가드 — 무료 퍼널 허브(/free)를 지우고 홈으로 308 흡수한다.
 *
 * 소셜 바이오·공유 QR(?s=card)·푸시·외부 링크가 끊기지 않도록 next.config redirects 에
 * 영구(308) 규칙이 있어야 한다. destination 에 쿼리를 박지 않고 has/missing 조건도 없어야
 * Next 가 요청 쿼리를 그대로 넘긴다(/free?s=card → /?s=card). /ko 프리픽스는 proxy
 * 리라이트보다 redirects 가 먼저 돌므로 /ko/free → /ko 를 따로 둔다.
 */
import { existsSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import nextConfig from '../../../next.config'

type Redirect = {
  source: string
  destination: string
  permanent?: boolean
  statusCode?: number
  has?: unknown[]
  missing?: unknown[]
}

const ROOT = path.resolve(__dirname, '../../..')

async function loadRedirects(): Promise<Redirect[]> {
  const redirects = (nextConfig as { redirects?: () => Promise<Redirect[]> }).redirects
  expect(typeof redirects, 'next.config must define redirects()').toBe('function')
  return redirects!()
}

function findBySource(list: Redirect[], source: string): Redirect | undefined {
  return list.find((r) => r.source === source)
}

describe('/free → / redirect (merged into home)', () => {
  it.each([
    ['/free', '/'],
    ['/ko/free', '/ko'],
  ])('%s redirects permanently (308) to %s', async (source, destination) => {
    const rule = findBySource(await loadRedirects(), source)
    expect(rule, `missing redirect for ${source}`).toBeDefined()
    expect(rule!.destination).toBe(destination)
    expect(rule!.permanent).toBe(true)
    expect(rule!.statusCode).toBeUndefined()
  })

  it.each(['/free', '/ko/free'])(
    '%s carries no query or conditions, so Next passes the query through',
    async (source) => {
      const rule = findBySource(await loadRedirects(), source)!
      expect(rule.destination).not.toContain('?')
      expect(rule.has).toBeUndefined()
      expect(rule.missing).toBeUndefined()
    }
  )

  it('the /free page itself is gone (the redirect is the only entry point)', () => {
    expect(existsSync(path.join(ROOT, 'src/app/free'))).toBe(false)
  })

  it('/compatibility/free stays a live page, not caught by the /free redirect', async () => {
    const list = await loadRedirects()
    expect(findBySource(list, '/compatibility/free')).toBeUndefined()
    expect(existsSync(path.join(ROOT, 'src/app/compatibility/free/page.tsx'))).toBe(true)
  })
})
