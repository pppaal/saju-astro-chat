import React from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import UsersClient from '@/app/admin/users/UsersClient'

const mockFetch = global.fetch as ReturnType<typeof vi.fn>

function fetchOnce(body: unknown, status = 200) {
  mockFetch.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  })
}

const SEARCH_RESULT = {
  users: [
    {
      id: 'u1',
      email: 'alice@x.com',
      name: 'Alice',
      role: 'user',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'u2',
      email: 'bob@x.com',
      name: 'Bob',
      role: 'admin',
      createdAt: '2026-02-01T00:00:00.000Z',
    },
  ],
  capped: false,
}

const DETAIL = {
  user: {
    id: 'u1',
    email: 'alice@x.com',
    name: 'Alice',
    role: 'user',
    image: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    hasPassword: true,
    providers: ['google'],
  },
  credits: { usable: 100, bonusCredits: 10, totalBonusReceived: 30 },
  activity: { tarot: 4, counselor: 2, total: 6, lastActiveAt: '2026-06-01T00:00:00.000Z' },
  spend: {
    purchasedCredits: 240,
    consumedCredits: 140,
    firstPurchaseAt: '2026-03-01T00:00:00.000Z',
  },
  purchases: {
    paidCount: 2,
    recent: [
      {
        amount: 40,
        remaining: 20,
        source: 'stripe',
        expired: false,
        createdAt: '2026-03-01T00:00:00.000Z',
        stripePaymentId: 'pi_1',
      },
      {
        amount: 10,
        remaining: 0,
        source: 'bonus',
        expired: true,
        createdAt: '2026-02-01T00:00:00.000Z',
        stripePaymentId: null,
      },
    ],
  },
  timeline: [{ type: 'tarot', label: '타로', detail: 'reading x', at: '2026-06-01T00:00:00.000Z' }],
}

function typeAndSearch(query: string) {
  fireEvent.change(screen.getByPlaceholderText('이메일 / 이름 / User ID'), {
    target: { value: query },
  })
  fireEvent.click(screen.getByRole('button', { name: '검색' }))
}

describe('UsersClient', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('renders search input and heading', () => {
    render(<UsersClient />)
    expect(screen.getByText('유저 검색')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('이메일 / 이름 / User ID')).toBeInTheDocument()
  })

  it('validates short queries without calling fetch', () => {
    render(<UsersClient />)
    typeAndSearch('a')
    expect(screen.getByText('검색어는 2자 이상 입력하세요')).toBeInTheDocument()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('searches and renders the result rows', async () => {
    render(<UsersClient />)
    fetchOnce({ data: SEARCH_RESULT })
    typeAndSearch('alice')

    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith('/api/admin/users?q=alice', { cache: 'no-store' })
    )
    await waitFor(() => expect(screen.getByText('alice@x.com')).toBeInTheDocument())
    expect(screen.getByText('bob@x.com')).toBeInTheDocument()
    expect(screen.getByText(/검색 결과 \(2/)).toBeInTheDocument()
  })

  it('shows empty state when no users match', async () => {
    render(<UsersClient />)
    fetchOnce({ data: { users: [], capped: false } })
    typeAndSearch('nobody')

    await waitFor(() => expect(screen.getByText('일치하는 유저가 없습니다.')).toBeInTheDocument())
  })

  it('shows a search error banner on failure', async () => {
    render(<UsersClient />)
    fetchOnce({ error: { message: '검색 실패' } }, 500)
    typeAndSearch('alice')

    await waitFor(() => expect(screen.getByText('검색 실패')).toBeInTheDocument())
  })

  it('opens user detail when a result row is clicked', async () => {
    render(<UsersClient />)
    fetchOnce({ data: SEARCH_RESULT })
    typeAndSearch('alice')
    await waitFor(() => expect(screen.getByText('alice@x.com')).toBeInTheDocument())

    fetchOnce({ data: DETAIL })
    fireEvent.click(screen.getByText('Alice'))

    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith('/api/admin/users/u1', { cache: 'no-store' })
    )
    await waitFor(() => expect(screen.getByText('유저 상세')).toBeInTheDocument())
    // Detail metrics & purchase history rendered.
    expect(screen.getByText('사용가능 잔액')).toBeInTheDocument()
    expect(screen.getByText('+40')).toBeInTheDocument()
    expect(screen.getByText('최근 활동 타임라인')).toBeInTheDocument()
    // Refund link only for non-expired stripe purchase with remaining > 0.
    expect(screen.getByText('환불')).toBeInTheDocument()
  })

  it('shows a detail error banner when detail fetch fails', async () => {
    render(<UsersClient />)
    fetchOnce({ data: SEARCH_RESULT })
    typeAndSearch('alice')
    await waitFor(() => expect(screen.getByText('alice@x.com')).toBeInTheDocument())

    fetchOnce({ error: { message: '상세 로드 실패' } }, 500)
    fireEvent.click(screen.getByText('Alice'))

    await waitFor(() => expect(screen.getByText('상세 로드 실패')).toBeInTheDocument())
  })

  it('renders empty purchase history when there are no purchases', async () => {
    render(<UsersClient />)
    fetchOnce({ data: SEARCH_RESULT })
    typeAndSearch('alice')
    await waitFor(() => expect(screen.getByText('alice@x.com')).toBeInTheDocument())

    fetchOnce({
      data: {
        ...DETAIL,
        purchases: { paidCount: 0, recent: [] },
        timeline: [],
      },
    })
    fireEvent.click(screen.getByText('Alice'))

    await waitFor(() => expect(screen.getByText('내역 없음')).toBeInTheDocument())
  })
})
