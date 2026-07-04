import { render, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// useSession 모킹 — 기본 unauthenticated(로컬 경로). 로그인 테스트에서 갈아끼움.
let mockStatus: 'authenticated' | 'unauthenticated' | 'loading' = 'unauthenticated'
vi.mock('next-auth/react', () => ({
  useSession: () => ({ status: mockStatus, data: null }),
}))

import StreakChip from '@/components/calendar/StreakChip'

/** 컴포넌트가 쓰는 것과 동일한 로컬 오늘 'YYYY-MM-DD'. */
function localToday(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

const KEY = 'dp:calendar:streak'

describe('StreakChip', () => {
  beforeEach(() => {
    localStorage.clear()
    mockStatus = 'unauthenticated'
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('오늘 기록 + count≥2 면 "N일째 확인 중" 을 보여준다', async () => {
    // 오늘 날짜로 저장돼 있으면 computeStreak 가 count 를 유지 → 결정적.
    localStorage.setItem(KEY, JSON.stringify({ last: localToday(), count: 5 }))
    const { container } = render(<StreakChip ko={true} />)
    await waitFor(() => expect(container.textContent).toContain('5일째 확인 중'))
  })

  it('영문 로케일은 "Day N streak"', async () => {
    localStorage.setItem(KEY, JSON.stringify({ last: localToday(), count: 4 }))
    const { container } = render(<StreakChip ko={false} />)
    await waitFor(() => expect(container.textContent).toContain('Day 4 streak'))
  })

  it('첫 방문(1일째)엔 아무것도 안 그린다', async () => {
    const { container } = render(<StreakChip ko={true} />)
    // 방문 기록은 남는다(다음날 이어지도록) — 기록될 때까지 대기 후 미노출 확인.
    await waitFor(() => expect(localStorage.getItem(KEY)).toContain(localToday()))
    expect(container.textContent).toBe('')
  })

  it('로그인 사용자는 서버 스트릭(POST /api/me/streak)을 쓴다', async () => {
    mockStatus = 'authenticated'
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { count: 7, longest: 9 } }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const { container } = render(<StreakChip ko={true} />)
    await waitFor(() => expect(container.textContent).toContain('7일째 확인 중'))
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/me/streak',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ today: localToday() }),
      })
    )
    // 서버 경로에선 localStorage 를 건드리지 않는다(서버가 정본).
    expect(localStorage.getItem(KEY)).toBeNull()
    vi.unstubAllGlobals()
  })

  it('서버 실패(오프라인 등)면 localStorage 로 조용히 폴백', async () => {
    mockStatus = 'authenticated'
    localStorage.setItem(KEY, JSON.stringify({ last: localToday(), count: 3 }))
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))

    const { container } = render(<StreakChip ko={true} />)
    await waitFor(() => expect(container.textContent).toContain('3일째 확인 중'))
    vi.unstubAllGlobals()
  })
})
