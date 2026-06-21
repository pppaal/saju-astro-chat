import React from 'react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ReconcileClient from '@/app/admin/reconcile/ReconcileClient'

const mockFetch = global.fetch as ReturnType<typeof vi.fn>

function fetchOnce(body: unknown, status = 200) {
  mockFetch.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  })
}

const RESULT = {
  query: 'pi_123',
  apply: false,
  sessionsFound: 2,
  summary: { ok: 1, missing: 1 },
  results: [
    {
      sessionId: 'cs_1',
      status: 'ok',
      userId: 'u1',
      email: 'a@x.com',
      pack: '40',
      credits: 40,
      paymentIntentId: 'pi_1',
    },
    {
      sessionId: 'cs_2',
      status: 'missing',
      userId: 'u2',
      email: 'b@x.com',
      pack: '100',
      credits: 100,
      paymentIntentId: 'pi_2',
      detail: '웹훅 누락',
    },
  ],
}

function typeQuery(q: string) {
  fireEvent.change(screen.getByPlaceholderText('pi_3Q… / cs_… / ch_… / buyer@email.com'), {
    target: { value: q },
  })
}

describe('ReconcileClient', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the form and instructions', () => {
    render(<ReconcileClient />)
    expect(screen.getByText('결제 점검·복구')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '점검 (확인만)' })).toBeInTheDocument()
  })

  it('validates short queries without fetching', () => {
    render(<ReconcileClient />)
    typeQuery('ab')
    fireEvent.click(screen.getByRole('button', { name: '점검 (확인만)' }))
    expect(
      screen.getByText('결제 ID(pi_… / cs_… / ch_…) 또는 이메일을 입력하세요')
    ).toBeInTheDocument()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('runs a check (apply=false) and renders result rows', async () => {
    render(<ReconcileClient />)
    typeQuery('pi_123')
    fetchOnce({ data: RESULT })
    fireEvent.click(screen.getByRole('button', { name: '점검 (확인만)' }))

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1))
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('/api/admin/reconcile-purchase')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ query: 'pi_123', apply: false })

    await waitFor(() => expect(screen.getByText('정상(이미 반영됨)')).toBeInTheDocument())
    expect(screen.getByText('누락 — 복구 대상')).toBeInTheDocument()
    expect(screen.getByText('웹훅 누락')).toBeInTheDocument()
    // Banner that prompts recovery for missing rows.
    expect(screen.getByText(/누락 1건/)).toBeInTheDocument()
  })

  it('shows empty state when no sessions found', async () => {
    render(<ReconcileClient />)
    typeQuery('pi_none')
    fetchOnce({
      data: { query: 'pi_none', apply: false, sessionsFound: 0, summary: {}, results: [] },
    })
    fireEvent.click(screen.getByRole('button', { name: '점검 (확인만)' }))

    await waitFor(() =>
      expect(screen.getByText(/해당하는 Stripe 결제 세션을 찾지 못했습니다/)).toBeInTheDocument()
    )
  })

  it('shows an error banner on failure', async () => {
    render(<ReconcileClient />)
    typeQuery('pi_123')
    fetchOnce({ error: { message: '점검 실패' } }, 500)
    fireEvent.click(screen.getByRole('button', { name: '점검 (확인만)' }))

    await waitFor(() => expect(screen.getByText('점검 실패')).toBeInTheDocument())
  })

  it('shows an error banner when fetch rejects', async () => {
    render(<ReconcileClient />)
    typeQuery('pi_123')
    mockFetch.mockRejectedValueOnce(new Error('reconcile boom'))
    fireEvent.click(screen.getByRole('button', { name: '점검 (확인만)' }))

    await waitFor(() => expect(screen.getByText('reconcile boom')).toBeInTheDocument())
  })

  it('confirms before applying recovery (apply=true)', async () => {
    window.confirm = vi.fn(() => true)
    render(<ReconcileClient />)
    typeQuery('pi_123')
    fetchOnce({ data: { ...RESULT, apply: true } })
    fireEvent.click(screen.getByRole('button', { name: '복구 (크레딧 지급)' }))

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1))
    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual({ query: 'pi_123', apply: true })
    await waitFor(() => expect(screen.getByText(/복구 실행/)).toBeInTheDocument())
  })

  it('does not fetch when the apply confirmation is cancelled', () => {
    window.confirm = vi.fn(() => false)
    render(<ReconcileClient />)
    typeQuery('pi_123')
    fireEvent.click(screen.getByRole('button', { name: '복구 (크레딧 지급)' }))

    expect(mockFetch).not.toHaveBeenCalled()
  })
})
