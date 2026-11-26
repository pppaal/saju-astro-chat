// tests/components/share/ShareLinkButton.test.tsx
//
// 링크 공유 버튼 — 라벨 전환(idle → copied), 에러 줄, 변형(pill · line · row),
// 그리고 이 버튼으로 옮긴 하루·이달·추천 버튼이 같은 요청을 보내는지.

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const apiFetch = vi.fn()
vi.mock('@/lib/api/client', () => ({
  apiFetch: (...a: unknown[]) => apiFetch(...a),
}))
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}))
const trackFunnel = vi.fn()
vi.mock('@/lib/metrics/trackFunnel', () => ({
  trackFunnel: (...a: unknown[]) => trackFunnel(...a),
}))
let sessionStatus: 'authenticated' | 'unauthenticated' | 'loading' = 'authenticated'
vi.mock('next-auth/react', () => ({
  useSession: () => ({ status: sessionStatus }),
}))

import { ShareLinkButton } from '@/components/share/ShareLinkButton'
import { ShareDayButton } from '@/components/calendar/ShareDayButton'
import { ShareCalendarButton } from '@/components/calendar/ShareCalendarButton'
import { ReferralInviteButton } from '@/components/referral/ReferralInviteButton'

const URL_OK = 'https://destinypal.com/r/tok_1'

function respond(data: unknown, status = 200) {
  return { ok: status < 300, status, json: async () => ({ success: true, data }) }
}

beforeEach(() => {
  apiFetch.mockReset()
  trackFunnel.mockReset()
  sessionStatus = 'authenticated'
  apiFetch.mockResolvedValue(respond({ url: URL_OK }))
  Object.defineProperty(navigator, 'share', { value: undefined, configurable: true })
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: vi.fn(async () => undefined) },
    configurable: true,
  })
})

const link = { endpoint: '/api/x/share', body: { a: 1 }, title: 'T', isKo: true }

describe('ShareLinkButton', () => {
  it('pill: 라벨 → 누르면 복사 후 copied 라벨', async () => {
    render(<ShareLinkButton link={link} label="공유하기" copiedLabel="링크 복사됨!" />)
    fireEvent.click(screen.getByRole('button', { name: '공유하기' }))
    await screen.findByRole('button', { name: '링크 복사됨!' })
    expect(apiFetch).toHaveBeenCalledWith(
      '/api/x/share',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('실패하면 에러 줄을 보여 준다', async () => {
    apiFetch.mockResolvedValueOnce(respond({}, 500))
    render(<ShareLinkButton link={link} label="공유하기" copiedLabel="복사됨" />)
    fireEvent.click(screen.getByRole('button'))
    expect(await screen.findByRole('status')).toHaveTextContent('링크를 만들지 못했어요.')
  })

  it('row: 라벨과 보조 줄을 한 버튼 안에 그린다', () => {
    render(
      <ShareLinkButton
        link={link}
        variant="row"
        label="Share today"
        sub="Send today's reading"
        copiedLabel="Link copied!"
      />
    )
    const btn = screen.getByRole('button')
    expect(btn).toHaveTextContent('Share today')
    expect(btn).toHaveTextContent("Send today's reading")
  })

  it('line: 버튼 하나, caption 은 pill 에서만', () => {
    render(
      <ShareLinkButton
        link={link}
        variant="line"
        size="sm"
        label="Share link"
        copiedLabel="Link copied!"
        caption="caption"
      />
    )
    expect(screen.getByRole('button')).toHaveTextContent('Share link')
    expect(screen.queryByText('caption')).toBeNull()
  })
})

describe('useShareLink 로 옮긴 버튼들', () => {
  it('ShareDayButton: 같은 엔드포인트·본문(점수·곡선 반올림)', async () => {
    render(
      <ShareDayButton
        data={{
          isKo: false,
          dateLabel: 'Sat, Jun 15',
          score: 71.6,
          tone: 'mixed',
          headline: 'A steady day',
          subline: '',
          curve: [10.4, 55.5],
          markerIndex: 1,
        }}
      />
    )
    // v9 row(운세 달력 '오늘 공유하기' 줄) — 문구는 calendarCopy.
    fireEvent.click(screen.getByRole('button', { name: 'Share today' }))
    await screen.findByRole('button', { name: 'Link copied' })
    const [url, init] = apiFetch.mock.calls[0]
    expect(url).toBe('/api/calendar/day/share')
    expect(JSON.parse(init.body)).toEqual({
      isKo: false,
      dateLabel: 'Sat, Jun 15',
      score: 72,
      tone: 'mixed',
      headline: 'A steady day',
      curve: [10, 56],
      markerIndex: 1,
    })
  })

  it('ShareCalendarButton: highlights 최대 5개', async () => {
    render(
      <ShareCalendarButton
        data={{
          isKo: true,
          periodLabel: '2026년 6월',
          headline: '정리의 달',
          highlights: ['a', 'b', 'c', 'd', 'e', 'f'],
        }}
      />
    )
    // v9 line(운세 달력 '이달 공유하기') — 문구는 calendarCopy.
    fireEvent.click(screen.getByRole('button', { name: '이달 공유하기' }))
    await screen.findByRole('button', { name: '링크를 복사했어요' })
    const [url, init] = apiFetch.mock.calls[0]
    expect(url).toBe('/api/calendar/share')
    expect(JSON.parse(init.body).highlights).toEqual(['a', 'b', 'c', 'd', 'e'])
  })

  it('ReferralInviteButton: 비로그인이면 렌더하지 않는다', () => {
    sessionStatus = 'unauthenticated'
    const { container } = render(<ReferralInviteButton isKo />)
    expect(container).toBeEmptyDOMElement()
  })

  it('ReferralInviteButton: 퍼널 기록 → 본문 없는 POST → referralUrl 복사', async () => {
    apiFetch.mockResolvedValue(respond({ referralUrl: 'https://destinypal.com/?ref=AB12' }))
    const writeText = vi.fn(async () => undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    render(<ReferralInviteButton isKo={false} />)
    expect(screen.getByText(/When your friend makes their first purchase/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Invite a friend, earn/ }))
    await screen.findByRole('button', { name: 'Invite link copied!' })
    expect(trackFunnel).toHaveBeenCalledWith('referral.invite_clicked')
    expect(apiFetch).toHaveBeenCalledWith('/api/referral/create-code', { method: 'POST' })
    expect(writeText).toHaveBeenCalledWith('https://destinypal.com/?ref=AB12')
  })

  it('ReferralInviteButton: 발급 실패 문구는 초대 링크용', async () => {
    apiFetch.mockResolvedValueOnce(respond({}, 500))
    render(<ReferralInviteButton isKo />)
    fireEvent.click(screen.getByRole('button'))
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('초대 링크를 만들지 못했어요.')
    )
  })
})
