// tests/app/calendar/birthRequired.test.tsx
//
// BirthRequiredFallback(v9.2 종이 안내) — no-birth · rate-limited 두 갈래가 ko/en 문구로, 옛 '5 tier'
// 문구 없이, 공개 샘플 링크(/calendar/preview)와 프로필 링크를 낸다. locale 이 없으면 서버 로케일.

import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'

vi.mock('@/i18n/server', () => ({ detectServerLocale: vi.fn(async () => 'en') }))

import BirthRequiredFallback from '@/app/calendar/birth-required'

const HANGUL = /[가-힣]/

async function renderFallback(props: Parameters<typeof BirthRequiredFallback>[0]) {
  return render(await BirthRequiredFallback(props))
}

describe('BirthRequiredFallback', () => {
  it('no-birth · en — 제목 · 필요한 정보 · 프로필 · 샘플 링크, 한글 없음', async () => {
    const { container } = await renderFallback({ reason: 'no-birth', locale: 'en' })
    expect(container.querySelector('h1')?.textContent).toBe('Start with your birth details')
    expect(container.querySelectorAll('li')).toHaveLength(3)
    const hrefs = Array.from(container.querySelectorAll('a')).map((a) => a.getAttribute('href'))
    expect(hrefs).toEqual(['/profile', '/calendar/preview'])
    expect(container.textContent).not.toMatch(HANGUL)
    expect(container.textContent).not.toMatch(/tier/i)
  })

  it('no-birth · ko — 같은 구조를 한국어로(시각 미상 = 세 기둥)', async () => {
    const { container } = await renderFallback({ reason: 'no-birth', locale: 'ko' })
    expect(container.querySelector('h1')?.textContent).toBe('출생 정보를 넣으면 시작돼요')
    expect(container.textContent).toContain('세 기둥으로 읽어요')
    expect(container.textContent).toContain('샘플 먼저 보기')
  })

  it('locale 이 없으면 서버 로케일(en)', async () => {
    const { container } = await renderFallback({ reason: 'no-birth' })
    expect(container.querySelector('h1')?.textContent).toBe('Start with your birth details')
  })

  it('rate-limited — 재시도 안내만(링크 없음)', async () => {
    const { container } = await renderFallback({ reason: 'rate-limited', locale: 'ko' })
    expect(container.querySelector('h1')?.textContent).toBe('요청이 많아요')
    expect(container.querySelectorAll('a')).toHaveLength(0)
  })
})
