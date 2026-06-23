/**
 * runBlogThreadsAutopost 코어 테스트 — blog/loader, prisma, threads, threadsToken
 * 을 모킹해 분기(미리보기/미설정/게시/force)를 검증한다.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

const getBlogMetadata = vi.fn()
vi.mock('@/data/blog/loader', () => ({ getBlogMetadata: () => getBlogMetadata() }))

const findMany = vi.fn()
const create = vi.fn()
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    socialPostLog: {
      findMany: (...a: unknown[]) => findMany(...a),
      create: (...a: unknown[]) => create(...a),
    },
  },
}))

const postToThreads = vi.fn()
vi.mock('@/lib/social/threads', async (importActual) => {
  const actual = await importActual<typeof import('@/lib/social/threads')>()
  return { ...actual, postToThreads: (...a: unknown[]) => postToThreads(...a) }
})

const getThreadsCreds = vi.fn()
vi.mock('@/lib/social/threadsToken', () => ({ getThreadsCreds: () => getThreadsCreds() }))

import { runBlogThreadsAutopost } from '@/lib/social/autopost'

const POSTS = [
  {
    slug: 'new',
    date: '2026-06-20',
    title: 'New',
    titleKo: '새글',
    excerpt: 'x',
    excerptKo: '요약',
  },
  { slug: 'old', date: '2026-01-01', title: 'Old', titleKo: '옛글', excerpt: '', excerptKo: '' },
]

describe('runBlogThreadsAutopost', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_SITE_URL = 'https://destinypal.com'
    getBlogMetadata.mockReturnValue(POSTS)
    findMany.mockResolvedValue([])
    create.mockResolvedValue({})
    getThreadsCreds.mockResolvedValue({ userId: '123', token: 'tok' })
    postToThreads.mockResolvedValue({ ok: true, id: 'ext_1' })
  })

  it('returns no_base_url when site url missing', async () => {
    delete process.env.NEXT_PUBLIC_SITE_URL
    delete process.env.NEXTAUTH_URL
    const r = await runBlogThreadsAutopost()
    expect(r).toEqual({ posted: false, reason: 'no_base_url' })
  })

  it('dryRun returns preview text without posting', async () => {
    const r = await runBlogThreadsAutopost({ dryRun: true })
    expect(r.posted).toBe(false)
    if ('dryRun' in r) {
      expect(r.dryRun).toBe(true)
      expect(r.slug).toBe('new')
      expect(r.text).toContain('https://destinypal.com/blog/new')
      expect(r.credsConfigured).toBe(true)
    }
    expect(postToThreads).not.toHaveBeenCalled()
  })

  it('skips already-posted slugs', async () => {
    findMany.mockResolvedValue([{ ref: 'new' }])
    const r = await runBlogThreadsAutopost({ dryRun: true })
    if ('slug' in r) expect(r.slug).toBe('old')
  })

  it('force ignores posted slugs', async () => {
    findMany.mockResolvedValue([{ ref: 'new' }, { ref: 'old' }])
    const r = await runBlogThreadsAutopost({ dryRun: true, force: true })
    if ('slug' in r) expect(r.slug).toBe('new')
  })

  it('returns not_configured when creds missing', async () => {
    getThreadsCreds.mockResolvedValue(null)
    const r = await runBlogThreadsAutopost()
    expect(r).toEqual({ posted: false, reason: 'not_configured' })
    expect(postToThreads).not.toHaveBeenCalled()
  })

  it('posts and records on success', async () => {
    const r = await runBlogThreadsAutopost()
    expect(r).toEqual({ posted: true, slug: 'new', externalId: 'ext_1' })
    expect(postToThreads).toHaveBeenCalledOnce()
    expect(create).toHaveBeenCalledWith({
      data: { platform: 'threads', ref: 'new', externalId: 'ext_1' },
    })
  })

  it('does not record when publish fails', async () => {
    postToThreads.mockResolvedValue({ ok: false, reason: 'publish_failed' })
    const r = await runBlogThreadsAutopost()
    expect(r).toMatchObject({ posted: false, reason: 'publish_failed', slug: 'new' })
    expect(create).not.toHaveBeenCalled()
  })

  it('returns no_new_post when everything posted', async () => {
    findMany.mockResolvedValue([{ ref: 'new' }, { ref: 'old' }])
    const r = await runBlogThreadsAutopost()
    expect(r).toEqual({ posted: false, reason: 'no_new_post' })
  })
})
