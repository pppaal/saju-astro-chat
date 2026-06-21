import React from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import RevenueClient from '@/app/admin/revenue/RevenueClient'

const mockFetch = global.fetch as ReturnType<typeof vi.fn>

function fetchOnce(body: unknown, status = 200) {
  mockFetch.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  })
}

const REVENUE = {
  rangeDays: 30,
  revenue: {
    windowKrw: 1000000,
    netKrw: 950000,
    refundedKrw: 50000,
    todayKrw: 12000,
    purchaseCount: 33,
    daily: [
      { date: '2026-05-22', krw: 0, count: 0 },
      { date: '2026-06-21', krw: 12000, count: 2 },
    ],
    byPack: [
      { pack: '40', credits: 40, count: 5, krw: 250000 },
      { pack: '100', credits: 100, count: 3, krw: 450000 },
    ],
  },
  credits: {
    issuedPaid: 5000,
    issuedFree: 1200,
    consumed: 3000,
    outstanding: 3200,
    expiredLost: 100,
  },
  refunds: { count: 2, krw: 50000, creditsRefunded: 80 },
}

describe('RevenueClient', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('shows loading then renders revenue metrics', async () => {
    fetchOnce({ data: REVENUE })
    render(<RevenueClient />)

    expect(screen.getByText('불러오는 중…')).toBeInTheDocument()

    await waitFor(() => expect(screen.getByText('₩1,000,000')).toBeInTheDocument())
    expect(mockFetch).toHaveBeenCalledWith('/api/admin/revenue?days=30', { cache: 'no-store' })
    // Credit economy + by-pack table.
    expect(screen.getByText('팩별 판매')).toBeInTheDocument()
    expect(screen.getByText('₩450,000')).toBeInTheDocument()
    expect(screen.getByText('크레딧 경제 (전체 누적)')).toBeInTheDocument()
    // Refund footnote.
    expect(screen.getByText(/환불:/)).toBeInTheDocument()
  })

  it('renders an error banner on failure', async () => {
    fetchOnce({ error: { message: '매출 로드 실패' } }, 500)
    render(<RevenueClient />)

    await waitFor(() => expect(screen.getByText('매출 로드 실패')).toBeInTheDocument())
  })

  it('renders an error banner when fetch rejects', async () => {
    mockFetch.mockRejectedValueOnce(new Error('boom'))
    render(<RevenueClient />)

    await waitFor(() => expect(screen.getByText('boom')).toBeInTheDocument())
  })

  it('re-fetches with a new range when a range button is clicked', async () => {
    fetchOnce({ data: REVENUE })
    render(<RevenueClient />)
    await waitFor(() => expect(screen.getByText('₩1,000,000')).toBeInTheDocument())

    fetchOnce({
      data: { ...REVENUE, rangeDays: 7, revenue: { ...REVENUE.revenue, windowKrw: 300000 } },
    })
    fireEvent.click(screen.getByRole('button', { name: '7일' }))

    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith('/api/admin/revenue?days=7', { cache: 'no-store' })
    )
    await waitFor(() => expect(screen.getByText('₩300,000')).toBeInTheDocument())
  })

  it('re-fetches on refresh button click', async () => {
    fetchOnce({ data: REVENUE })
    render(<RevenueClient />)
    await waitFor(() => expect(screen.getByText('₩1,000,000')).toBeInTheDocument())

    fetchOnce({ data: REVENUE })
    fireEvent.click(screen.getByRole('button', { name: '새로고침' }))

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2))
  })

  it('hides daily chart and by-pack table when data is empty', async () => {
    fetchOnce({
      data: {
        ...REVENUE,
        revenue: {
          ...REVENUE.revenue,
          daily: [{ date: '2026-06-21', krw: 0, count: 0 }],
          byPack: [],
        },
        refunds: { count: 0, krw: 0, creditsRefunded: 0 },
      },
    })
    render(<RevenueClient />)
    await waitFor(() => expect(screen.getByText('₩1,000,000')).toBeInTheDocument())

    expect(screen.queryByText('일별 매출')).not.toBeInTheDocument()
    expect(screen.queryByText('팩별 판매')).not.toBeInTheDocument()
  })
})
