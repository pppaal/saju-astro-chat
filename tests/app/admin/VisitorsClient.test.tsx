import React from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import VisitorsClient from '@/app/admin/visitors/VisitorsClient'

const mockFetch = global.fetch as ReturnType<typeof vi.fn>

function fetchOnce(body: unknown, status = 200) {
  mockFetch.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  })
}

const VISITORS = {
  rangeDays: 30,
  today: {
    visits: 120,
    pageviews: 400,
    loggedInVisits: 50,
    anonymousVisits: 70,
    yesterdayVisits: 100,
  },
  realtime: { active: 5, pageviews: 12 },
  conversion: { visits: 1000, signups: 30, rate: 3 },
  hourly: [
    { hour: 0, visits: 2, pageviews: 5 },
    { hour: 3, visits: 7, pageviews: 11 },
  ],
  countries: [
    { country: 'KR', visits: 80, pageviews: 200 },
    { country: '??', visits: 5, pageviews: 7 },
  ],
  summary: {
    pageviews: 1000,
    visits: 300,
    loggedInVisits: 120,
    anonymousVisits: 180,
    loginShare: 40,
  },
  daily: [
    { day: '2026-06-20', pageviews: 100, visits: 30, loggedInVisits: 10, anonymousVisits: 20 },
    { day: '2026-06-21', pageviews: 120, visits: 40, loggedInVisits: 15, anonymousVisits: 25 },
  ],
  topPaths: [{ path: '/tarot', pageviews: 200, visits: 80 }],
  topReferrers: [{ host: 'google.com', pageviews: 50, visits: 20 }],
  devices: [{ device: 'mobile', visits: 200 }],
}

describe('VisitorsClient', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('shows loading then renders visitor dashboard', async () => {
    fetchOnce({ data: VISITORS })
    render(<VisitorsClient />)

    expect(screen.getByText('불러오는 중…')).toBeInTheDocument()

    await waitFor(() => expect(screen.getByText('오늘 방문자 (KST)')).toBeInTheDocument())
    expect(mockFetch).toHaveBeenCalledWith('/api/admin/visitors?days=30', { cache: 'no-store' })
    // Summary cards, realtime, conversion, country/path/referrer/device sections.
    expect(screen.getByText('실시간 활성 (최근 30분)')).toBeInTheDocument()
    expect(screen.getByText('방문 → 가입 전환')).toBeInTheDocument()
    expect(screen.getByText('국가/지역별')).toBeInTheDocument()
    expect(screen.getByText('인기 경로')).toBeInTheDocument()
    expect(screen.getByText('/tarot')).toBeInTheDocument()
    expect(screen.getByText('google.com')).toBeInTheDocument()
    expect(screen.getByText(/mobile/)).toBeInTheDocument()
  })

  it('renders the notReady state', async () => {
    fetchOnce({
      data: {
        rangeDays: 30,
        notReady: true,
        summary: {},
        daily: [],
        topPaths: [],
        topReferrers: [],
        devices: [],
      },
    })
    render(<VisitorsClient />)

    await waitFor(() =>
      expect(screen.getByText(/방문자 집계 테이블이 아직 준비 중/)).toBeInTheDocument()
    )
  })

  it('renders an error banner on failure', async () => {
    fetchOnce({ error: { message: '방문자 로드 실패' } }, 500)
    render(<VisitorsClient />)

    await waitFor(() => expect(screen.getByText('방문자 로드 실패')).toBeInTheDocument())
  })

  it('renders an error banner when fetch rejects', async () => {
    mockFetch.mockRejectedValueOnce(new Error('netfail'))
    render(<VisitorsClient />)

    await waitFor(() => expect(screen.getByText('netfail')).toBeInTheDocument())
  })

  it('re-fetches with a new range when a range button is clicked', async () => {
    fetchOnce({ data: VISITORS })
    render(<VisitorsClient />)
    await waitFor(() => expect(screen.getByText('오늘 방문자 (KST)')).toBeInTheDocument())

    fetchOnce({ data: VISITORS })
    fireEvent.click(screen.getByRole('button', { name: '전체' }))

    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith('/api/admin/visitors?days=all', { cache: 'no-store' })
    )
  })

  it('shows empty daily/country/device states', async () => {
    fetchOnce({
      data: {
        ...VISITORS,
        today: undefined,
        realtime: undefined,
        conversion: undefined,
        hourly: undefined,
        countries: [],
        daily: [],
        topPaths: [],
        topReferrers: [],
        devices: [],
      },
    })
    render(<VisitorsClient />)

    await waitFor(() => expect(screen.getByText('순방문 (일 기준)')).toBeInTheDocument())
    expect(screen.getByText(/아직 방문 데이터가 없습니다/)).toBeInTheDocument()
    // ListCard + device empty states.
    expect(screen.getAllByText('데이터 없음').length).toBeGreaterThan(0)
  })
})
