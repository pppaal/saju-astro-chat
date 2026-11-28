// @vitest-environment node
/**
 * 띠궁합 [pair] 페이지 — 한 가지 정규 순서만 쓴다 (재감사 CS-4).
 *
 * 예전엔 /compatibility/zodiac/ox-rat 이 슬러그 순서대로 계산돼 97점, rat-ox 는 93점이었고
 * 몇 쌍은 등급까지 갈렸다(rooster-rat 50 'Needs work' vs rat-rooster 49 'High-friction').
 * 이제 역순 슬러그는 정규 슬러그로 308 리다이렉트하고, 메타데이터도 정규 순서로 만든다.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { permanentRedirect, notFound } = vi.hoisted(() => ({
  permanentRedirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`)
  }),
  notFound: vi.fn(() => {
    throw new Error('NOT_FOUND')
  }),
}))
vi.mock('next/navigation', () => ({ permanentRedirect, notFound }))

import ZodiacCompatPage, { generateMetadata } from '@/app/compatibility/zodiac/[pair]/page'
import { allPairSlugs } from '@/lib/compatibility/zodiacCompat'

const props = (pair: string) => ({ params: Promise.resolve({ pair }) })
const titleOf = async (pair: string) => {
  const meta = await generateMetadata(props(pair))
  return typeof meta.title === 'string' ? meta.title : JSON.stringify(meta.title)
}

describe('zodiac [pair] page — one canonical order', () => {
  beforeEach(() => vi.clearAllMocks())

  it('308-redirects a reverse slug to the canonical slug', async () => {
    await expect(ZodiacCompatPage(props('ox-rat'))).rejects.toThrow(
      'REDIRECT:/compatibility/zodiac/rat-ox'
    )
    expect(permanentRedirect).toHaveBeenCalledWith('/compatibility/zodiac/rat-ox')
    await expect(ZodiacCompatPage(props('rooster-rat'))).rejects.toThrow(
      'REDIRECT:/compatibility/zodiac/rat-rooster'
    )
  })

  it('renders the canonical slug without redirecting', async () => {
    const el = await ZodiacCompatPage(props('rat-ox'))
    expect(el).toBeTruthy()
    expect(permanentRedirect).not.toHaveBeenCalled()
  })

  it('unknown slug is still a 404', async () => {
    await expect(ZodiacCompatPage(props('rat-nope'))).rejects.toThrow('NOT_FOUND')
  })

  it('metadata is identical for both slug orders (score, grade, names) — all 66 cross pairs', async () => {
    expect(await titleOf('ox-rat')).toBe(await titleOf('rat-ox'))
    expect(await titleOf('rat-ox')).toContain('Rat & Ox')
    expect(await titleOf('rat-ox')).toContain('(93/100)')
    for (const slug of allPairSlugs()) {
      const [x, y] = slug.split('-')
      if (x === y) continue
      expect(await titleOf(`${y}-${x}`), slug).toBe(await titleOf(slug))
    }
  })
})
