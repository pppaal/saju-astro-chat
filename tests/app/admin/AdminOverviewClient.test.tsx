import React from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AdminOverviewClient from '@/app/admin/AdminOverviewClient'

// next/link is a server component wrapper; stub to a plain anchor so it renders
// in happy-dom without the App Router runtime.
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

const mockFetch = global.fetch as ReturnType<typeof vi.fn>

function fetchOnce(body: unknown, status = 200) {
  mockFetch.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  })
}

const OVERVIEW = {
  generatedAt: '2026-06-21T00:00:00.000Z',
  users: { total: 1234, today: 5, last7d: 30, last30d: 120, activeToday: 8, paying: 42 },
  readings: { total: 9000, today: 17 },
  credits: { outstanding: 555 },
  purchases: { total: 99, today: 2, last7d: 11, last30d: 50 },
  recentSignups: [],
  signupsDaily: [
    { date: '2026-05-22', count: 1 },
    { date: '2026-06-21', count: 3 },
  ],
}

describe('AdminOverviewClient', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('shows loading state then renders metrics from the overview payload', async () => {
    fetchOnce({ data: OVERVIEW })
    render(<AdminOverviewClient />)

    // Loading state appears before fetch resolves.
    expect(screen.getByText('불러오는 중…')).toBeInTheDocument()

    await waitFor(() => expect(screen.getByText('1,234')).toBeInTheDocument())
    expect(mockFetch).toHaveBeenCalledWith('/api/admin/overview', { cache: 'no-store' })
    // Formatted metrics from various sections.
    expect(screen.getByText('총 회원')).toBeInTheDocument()
    expect(screen.getByText('555')).toBeInTheDocument() // outstanding credits
    expect(screen.getByText('일별 신규 가입 (최근 30일)')).toBeInTheDocument()
    // Shortcut links rendered.
    expect(screen.getByText('유저 검색')).toBeInTheDocument()
  })

  it('renders an error banner when the overview request fails', async () => {
    fetchOnce({ error: { message: '권한 없음' } }, 403)
    render(<AdminOverviewClient />)

    await waitFor(() => expect(screen.getByText('권한 없음')).toBeInTheDocument())
  })

  it('renders an error banner when fetch rejects', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network down'))
    render(<AdminOverviewClient />)

    await waitFor(() => expect(screen.getByText('network down')).toBeInTheDocument())
  })

  it('expands a user segment on card click and fetches the segment users', async () => {
    fetchOnce({ data: OVERVIEW })
    render(<AdminOverviewClient />)
    await waitFor(() => expect(screen.getByText('1,234')).toBeInTheDocument())

    fetchOnce({
      data: {
        count: 2,
        users: [
          { id: 'u1', email: 'a@x.com', name: 'A', createdAt: '2026-06-01T00:00:00.000Z' },
          { id: 'u2', email: 'b@x.com', name: 'B', createdAt: '2026-06-02T00:00:00.000Z' },
        ],
      },
    })

    fireEvent.click(screen.getByText('총 회원'))

    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith('/api/admin/users-by?segment=total', {
        cache: 'no-store',
      })
    )
    await waitFor(() => expect(screen.getByText('a@x.com')).toBeInTheDocument())
    expect(screen.getByText('b@x.com')).toBeInTheDocument()
    // Panel + signups chart both expose a CSV export button.
    expect(screen.getAllByText('CSV 내보내기').length).toBeGreaterThan(0)
  })

  it('uses the active-users endpoint for the active-today segment', async () => {
    fetchOnce({ data: OVERVIEW })
    render(<AdminOverviewClient />)
    await waitFor(() => expect(screen.getByText('1,234')).toBeInTheDocument())

    fetchOnce({
      data: {
        count: 1,
        users: [
          {
            id: 'u9',
            email: 'act@x.com',
            name: 'Act',
            readings: 3,
            lastActiveAt: '2026-06-21T05:00:00.000Z',
          },
        ],
      },
    })

    fireEvent.click(screen.getByText('오늘 활성 유저'))

    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith('/api/admin/active-users', { cache: 'no-store' })
    )
    await waitFor(() => expect(screen.getByText('act@x.com')).toBeInTheDocument())
    expect(screen.getByText('마지막 활동')).toBeInTheDocument()
  })

  it('shows an empty-state panel when a segment returns no users', async () => {
    fetchOnce({ data: OVERVIEW })
    render(<AdminOverviewClient />)
    await waitFor(() => expect(screen.getByText('1,234')).toBeInTheDocument())

    fetchOnce({ data: { count: 0, users: [] } })
    fireEvent.click(screen.getByText('오늘 신규'))

    await waitFor(() => expect(screen.getByText('해당하는 유저가 없습니다.')).toBeInTheDocument())
  })

  it('shows a segment error panel when the segment request fails', async () => {
    fetchOnce({ data: OVERVIEW })
    render(<AdminOverviewClient />)
    await waitFor(() => expect(screen.getByText('1,234')).toBeInTheDocument())

    fetchOnce({ error: { message: '세그먼트 오류' } }, 500)
    fireEvent.click(screen.getByText('최근 7일 신규'))

    await waitFor(() => expect(screen.getByText('세그먼트 오류')).toBeInTheDocument())
  })

  it('expands a purchase card and fetches purchases for the chosen window', async () => {
    fetchOnce({ data: OVERVIEW })
    render(<AdminOverviewClient />)
    await waitFor(() => expect(screen.getByText('1,234')).toBeInTheDocument())

    fetchOnce({
      data: {
        count: 1,
        purchases: [
          {
            id: 'p1',
            userId: 'u1',
            email: 'buy@x.com',
            name: 'Buy',
            amount: 40,
            stripePaymentId: 'pi_1',
            createdAt: '2026-06-20T00:00:00.000Z',
          },
        ],
      },
    })

    fireEvent.click(screen.getByText('총 구매 건수'))

    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith('/api/admin/purchases?window=all', {
        cache: 'no-store',
      })
    )
    await waitFor(() => expect(screen.getByText('buy@x.com')).toBeInTheDocument())
    expect(screen.getByText(/전체 결제 내역/)).toBeInTheDocument()
    expect(screen.getByText('+40')).toBeInTheDocument()
  })

  it('re-fetches the overview when the refresh button is clicked', async () => {
    fetchOnce({ data: OVERVIEW })
    render(<AdminOverviewClient />)
    await waitFor(() => expect(screen.getByText('1,234')).toBeInTheDocument())

    fetchOnce({ data: { ...OVERVIEW, users: { ...OVERVIEW.users, total: 2000 } } })
    fireEvent.click(screen.getByText('새로고침'))

    await waitFor(() => expect(screen.getByText('2,000')).toBeInTheDocument())
  })

  it('collapses an open segment when its card is clicked again', async () => {
    fetchOnce({ data: OVERVIEW })
    render(<AdminOverviewClient />)
    await waitFor(() => expect(screen.getByText('1,234')).toBeInTheDocument())

    fetchOnce({
      data: {
        count: 1,
        users: [{ id: 'u1', email: 'a@x.com', name: 'A', createdAt: '2026-06-01T00:00:00.000Z' }],
      },
    })
    fireEvent.click(screen.getByText('총 회원'))
    await waitFor(() => expect(screen.getByText('a@x.com')).toBeInTheDocument())

    // Clicking again collapses the panel (cached, no new fetch).
    fireEvent.click(screen.getByText('총 회원'))
    await waitFor(() => expect(screen.queryByText('a@x.com')).not.toBeInTheDocument())
  })
})
