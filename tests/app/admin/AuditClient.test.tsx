import React from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AuditClient from '@/app/admin/audit/AuditClient'

const mockFetch = global.fetch as ReturnType<typeof vi.fn>

function fetchOnce(body: unknown, status = 200) {
  mockFetch.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  })
}

const AUDIT = {
  rangeDays: 30,
  totalLogs: 2,
  actionBreakdown: [
    { action: 'grant_credits', count: 5 },
    { action: 'refund', count: 1 },
  ],
  recentLogs: [
    {
      id: 'l1',
      createdAt: '2026-06-20T00:00:00.000Z',
      adminEmail: 'admin@x.com',
      action: 'grant_credits',
      targetType: 'user',
      targetId: 'u1',
      metadata: { amount: 40, source: 'bonus', targetEmail: 'u@x.com' },
      success: true,
      errorMessage: null,
    },
    {
      id: 'l2',
      createdAt: '2026-06-21T00:00:00.000Z',
      adminEmail: 'admin@x.com',
      action: 'refund',
      targetType: 'purchase',
      targetId: 'p1',
      metadata: { refundAmount: 50000, rejectionReason: 'bad' },
      success: false,
      errorMessage: 'failed badly',
    },
  ],
}

describe('AuditClient', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('shows loading then renders audit log table and breakdown', async () => {
    fetchOnce({ data: AUDIT })
    render(<AuditClient />)

    expect(screen.getByText('불러오는 중…')).toBeInTheDocument()

    await waitFor(() => expect(screen.getByText('액션별 건수')).toBeInTheDocument())
    expect(mockFetch).toHaveBeenCalledWith('/api/admin/audit-log?days=30', { cache: 'no-store' })
    // Rows rendered with admin + action + success/fail badges.
    expect(screen.getAllByText('admin@x.com')).toHaveLength(2)
    expect(screen.getByText('성공')).toBeInTheDocument()
    expect(screen.getByText('실패')).toBeInTheDocument()
    // summarizeMeta output present.
    expect(screen.getByText(/\+40/)).toBeInTheDocument()
    expect(screen.getByText(/거부: bad/)).toBeInTheDocument()
  })

  it('renders empty state when no logs', async () => {
    fetchOnce({ data: { rangeDays: 30, totalLogs: 0, actionBreakdown: [], recentLogs: [] } })
    render(<AuditClient />)

    await waitFor(() => expect(screen.getByText('기록 없음')).toBeInTheDocument())
  })

  it('renders an error banner on failure', async () => {
    fetchOnce({ error: { message: '감사로그 실패' } }, 500)
    render(<AuditClient />)

    await waitFor(() => expect(screen.getByText('감사로그 실패')).toBeInTheDocument())
  })

  it('renders an error banner when fetch rejects', async () => {
    mockFetch.mockRejectedValueOnce(new Error('audit boom'))
    render(<AuditClient />)

    await waitFor(() => expect(screen.getByText('audit boom')).toBeInTheDocument())
  })

  it('re-fetches with a new range when a range button is clicked', async () => {
    fetchOnce({ data: AUDIT })
    render(<AuditClient />)
    await waitFor(() => expect(screen.getByText('액션별 건수')).toBeInTheDocument())

    fetchOnce({ data: AUDIT })
    fireEvent.click(screen.getByRole('button', { name: '90일' }))

    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith('/api/admin/audit-log?days=90', { cache: 'no-store' })
    )
  })

  it('re-fetches on refresh', async () => {
    fetchOnce({ data: AUDIT })
    render(<AuditClient />)
    await waitFor(() => expect(screen.getByText('액션별 건수')).toBeInTheDocument())

    fetchOnce({ data: AUDIT })
    fireEvent.click(screen.getByRole('button', { name: '새로고침' }))

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2))
  })
})
