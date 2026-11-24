/**
 * 무료 궁합 페이지 — 초대 링크(?invite=) 흐름의 프라이버시.
 *
 * 공유자(초대자)의 출생정보는 클라이언트에 오지 않는다:
 *  - GET /api/compatibility/share 는 이름만 준다 → 첫 번째 사람 폼 대신 "초대한
 *    사람" 카드(이름)만 보이고, 받은 사람은 자기 정보만 넣는다.
 *  - 궁합은 POST /api/compatibility/share/invite(토큰 + 내 정보)로 서버가 계산해
 *    결과만 준다 — /api/saju·/api/astrology 를 공유자 몫으로 부르지 않는다.
 *  - 결과 화면에서 남(공유자)의 정보를 재공유하는 옵트인을 넘기지 않는다.
 *  - 링크가 만료(404)되면 초대 모드를 풀고 두 사람 직접 입력으로 돌아간다.
 */
import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'

vi.mock('@/i18n/I18nProvider', () => ({ useI18n: () => ({ locale: 'ko' }) }))
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))
const trackFunnel = vi.fn()
vi.mock('@/lib/metrics/trackFunnel', () => ({
  trackFunnel: (...a: unknown[]) => trackFunnel(...a),
}))

// 출생정보 입력은 스텁 — 버튼 하나로 도시까지 고른 상태를 만든다.
vi.mock('@/components/birth/BirthInfoFields', () => ({
  BirthInfoFields: ({
    idPrefix,
    onChange,
  }: {
    idPrefix: string
    onChange: (p: Record<string, unknown>) => void
  }) => (
    <button
      type="button"
      data-testid={`fill-${idPrefix}`}
      onClick={() =>
        onChange({
          birthDate: '1996-11-20',
          birthTime: '08:15',
          timeUnknown: false,
          gender: 'male',
          city: 'Seoul',
          latitude: 37.5665,
          longitude: 126.978,
          timeZone: 'Asia/Seoul',
        })
      }
    >
      fill {idPrefix}
    </button>
  ),
}))

vi.mock('@/components/report/atoms/ScoreBreakdown', () => ({ ScoreBreakdown: () => null }))
vi.mock('@/components/referral/ReferralInviteButton', () => ({ ReferralInviteButton: () => null }))
const shareButtonProps = vi.fn()
vi.mock('@/components/compatibility/ShareCompatibilityButton', () => ({
  ShareCompatibilityButton: (props: Record<string, unknown>) => {
    shareButtonProps(props)
    return <div data-testid="share-button" />
  },
}))
vi.mock('@/lib/compatibility/freeReport/buildNarrative', () => ({
  buildFreeCompatNarrative: () => ({
    verdict: { text: '서로를 키워 주는 사이예요.', tone: 'aligned', expansion: '' },
    themes: [],
    glossary: [],
    intro: '',
    closing: '',
    overallScore: 82,
    overallGrade: '꽤 잘 맞아',
    scoreDrivers: null,
  }),
  freeCompatShareCopy: () => ({ grade: '꽤 잘 맞아', punch: null, accent: null }),
  josa: (w: string) => w,
}))

import FreeCompatibilityPage from '@/app/compatibility/free/page'

const REPORT = {
  synView: null,
  dayMaster: null,
  spouseStars: [],
  pillarRelations: [],
  branchCombos: [],
  band: {},
}

type FetchCall = [string, RequestInit | undefined]
const fetchMock = () => global.fetch as unknown as ReturnType<typeof vi.fn>
const calls = () => fetchMock().mock.calls as FetchCall[]

function jsonRes(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body }
}

function mockApi(opts: { inviteStatus?: number } = {}) {
  fetchMock().mockImplementation(async (url: string) => {
    if (url.startsWith('/api/compatibility/share?token=')) {
      return jsonRes({ invite: { name: '지민' } })
    }
    if (url === '/api/compatibility/share/invite') {
      if (opts.inviteStatus === 404) return jsonRes({ success: false }, 404)
      return jsonRes({
        success: true,
        data: { inviter: { name: '지민', timeUnknown: false }, report: REPORT },
      })
    }
    return jsonRes({}, 500)
  })
}

describe('무료 궁합 — 초대 링크 흐름', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/compatibility/free?invite=tok_inv')
  })
  afterEach(() => {
    cleanup()
    window.history.replaceState(null, '', '/')
  })

  it('공유자는 이름 카드만 — 첫 번째 사람 입력 폼이 없다', async () => {
    mockApi()
    render(<FreeCompatibilityPage />)
    await waitFor(() => expect(screen.getByText('초대한 사람')).toBeInTheDocument())
    expect(calls()[0][0]).toBe('/api/compatibility/share?token=tok_inv')
    expect(screen.queryByText('첫 번째 사람')).not.toBeInTheDocument()
    expect(screen.queryByTestId('fill-cf-a')).not.toBeInTheDocument()
    expect(screen.getByTestId('fill-cf-b')).toBeInTheDocument()
    expect(screen.getByText('내 정보')).toBeInTheDocument()
    expect(trackFunnel).toHaveBeenCalledWith('compat_free.invite_prefilled')
  })

  it('내 정보 + 토큰만 서버로 보내고, 서버가 준 결과를 보여준다', async () => {
    mockApi()
    render(<FreeCompatibilityPage />)
    await waitFor(() => expect(screen.getByText('초대한 사람')).toBeInTheDocument())

    fireEvent.click(screen.getByTestId('fill-cf-b'))
    fireEvent.click(screen.getByRole('button', { name: /궁합 보기/ }))

    await waitFor(() => expect(screen.getByTestId('share-button')).toBeInTheDocument())

    const invitePost = calls().find(([u]) => u === '/api/compatibility/share/invite')
    expect(invitePost).toBeTruthy()
    const body = JSON.parse(String(invitePost![1]!.body))
    expect(body).toEqual({
      token: 'tok_inv',
      person: {
        birthDate: '1996-11-20',
        birthTime: '08:15',
        timeUnknown: false,
        gender: 'male',
        lat: 37.5665,
        lon: 126.978,
        tz: 'Asia/Seoul',
      },
      lang: 'ko',
    })
    // 공유자 몫의 사주·차트 계산을 클라가 하지 않는다(출생정보가 없으니까).
    expect(calls().some(([u]) => u === '/api/saju' || u === '/api/astrology')).toBe(false)
    // 결과 — 공유자 이름으로 표시, 남의 정보 재공유 옵트인은 넘기지 않는다.
    expect(screen.getByText(/지민님도 결과를 기다려요/)).toBeInTheDocument()
    expect(shareButtonProps.mock.calls.at(-1)?.[0]).toMatchObject({ inviter: undefined })
    expect(trackFunnel).toHaveBeenCalledWith('compat_free.invite_converted')
  })

  it('링크가 만료(404)되면 초대 모드를 풀고 두 사람 직접 입력으로', async () => {
    mockApi({ inviteStatus: 404 })
    render(<FreeCompatibilityPage />)
    await waitFor(() => expect(screen.getByText('초대한 사람')).toBeInTheDocument())

    fireEvent.click(screen.getByTestId('fill-cf-b'))
    fireEvent.click(screen.getByRole('button', { name: /궁합 보기/ }))

    await waitFor(() => expect(screen.getByText(/초대 링크가 만료됐어요/)).toBeInTheDocument())
    expect(screen.queryByText('초대한 사람')).not.toBeInTheDocument()
    expect(screen.getByText('첫 번째 사람')).toBeInTheDocument()
    expect(screen.getByTestId('fill-cf-a')).toBeInTheDocument()
  })
})
