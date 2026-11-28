// tests/lib/share/useShareLink.test.ts
//
// 링크 공유 훅 — POST 로 /r 토큰 발급 → Web Share 시트 → 실패/미지원이면 클립보드
// 복사(인앱 웹뷰는 execCommand 폴백) → 그래도 안 되면 링크를 에러 줄에 보여 준다.
// 사용자가 시트를 닫은 AbortError 는 조용히 무시한다.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

const apiFetch = vi.fn()
vi.mock('@/lib/api/client', () => ({
  apiFetch: (...a: unknown[]) => apiFetch(...a),
}))

const logError = vi.fn()
vi.mock('@/lib/logger', () => ({
  logger: { error: (...a: unknown[]) => logError(...a), warn: vi.fn(), info: vi.fn() },
}))

import { useShareLink, type UseShareLinkOptions } from '@/lib/share/useShareLink'

const URL_OK = 'https://destinypal.com/r/tok_1'

function okResponse(data: unknown = { url: URL_OK }, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => ({ success: true, data }),
  }
}

function stubShare(impl: ((d: ShareData) => Promise<void>) | undefined) {
  Object.defineProperty(navigator, 'share', { value: impl, configurable: true, writable: true })
}

function stubClipboard(writeText: ((t: string) => Promise<void>) | undefined) {
  Object.defineProperty(navigator, 'clipboard', {
    value: writeText ? { writeText } : undefined,
    configurable: true,
    writable: true,
  })
}

let execCommand: ReturnType<typeof vi.fn>

const baseOptions: UseShareLinkOptions = {
  endpoint: '/api/calendar/day/share',
  body: { isKo: true, dateLabel: '6월 15일 토', score: 72 },
  title: 'DestinyPal 오늘의 운',
  text: '오늘은 정리의 날',
  isKo: true,
}

beforeEach(() => {
  apiFetch.mockReset()
  logError.mockReset()
  apiFetch.mockResolvedValue(okResponse())
  stubShare(undefined)
  stubClipboard(undefined)
  execCommand = vi.fn(() => false)
  // happy-dom 은 execCommand 를 구현하지 않는다 — 인앱 웹뷰 폴백 경로를 직접 주입.
  Object.defineProperty(document, 'execCommand', {
    value: execCommand,
    configurable: true,
    writable: true,
  })
})

afterEach(() => {
  vi.useRealTimers()
  document.querySelectorAll('textarea').forEach((ta) => ta.remove())
})

describe('useShareLink — 링크 발급 요청', () => {
  it('endpoint 로 JSON 본문을 POST 한다', async () => {
    stubClipboard(vi.fn(async () => undefined))
    const { result } = renderHook(() => useShareLink(baseOptions))
    await act(() => result.current.share())
    expect(apiFetch).toHaveBeenCalledTimes(1)
    const [url, init] = apiFetch.mock.calls[0]
    expect(url).toBe('/api/calendar/day/share')
    expect(init.method).toBe('POST')
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' })
    expect(JSON.parse(init.body)).toEqual(baseOptions.body)
  })

  it('body 가 함수면 share() 시점에 평가한다', async () => {
    stubClipboard(vi.fn(async () => undefined))
    const body = vi.fn(() => ({ n: 1 }))
    const { result } = renderHook(() => useShareLink({ ...baseOptions, body }))
    expect(body).not.toHaveBeenCalled()
    await act(() => result.current.share())
    expect(body).toHaveBeenCalledTimes(1)
    expect(JSON.parse(apiFetch.mock.calls[0][1].body)).toEqual({ n: 1 })
  })

  it('body 가 없으면 본문·Content-Type 없이 POST 하고, readUrl 로 URL 을 꺼낸다', async () => {
    stubClipboard(vi.fn(async () => undefined))
    apiFetch.mockResolvedValue(okResponse({ referralUrl: 'https://destinypal.com/?ref=AB12' }))
    const { result } = renderHook(() =>
      useShareLink({
        endpoint: '/api/referral/create-code',
        title: 'DestinyPal 초대',
        isKo: true,
        readUrl: (json) =>
          (json as { data?: { referralUrl?: string } } | null)?.data?.referralUrl ?? null,
      })
    )
    await act(() => result.current.share())
    expect(apiFetch).toHaveBeenCalledWith('/api/referral/create-code', { method: 'POST' })
    expect(result.current.phase).toBe('copied')
  })

  it('동시에 두 번 눌러도 토큰은 한 번만 발급한다(동기 가드)', async () => {
    stubClipboard(vi.fn(async () => undefined))
    const { result } = renderHook(() => useShareLink(baseOptions))
    await act(async () => {
      await Promise.all([result.current.share(), result.current.share()])
    })
    expect(apiFetch).toHaveBeenCalledTimes(1)
  })

  it('onStart 는 가드를 통과한 클릭마다 네트워크 전에 한 번 호출된다', async () => {
    stubClipboard(vi.fn(async () => undefined))
    const onStart = vi.fn(() => {
      expect(apiFetch).not.toHaveBeenCalled()
    })
    const { result } = renderHook(() => useShareLink({ ...baseOptions, onStart }))
    await act(async () => {
      await Promise.all([result.current.share(), result.current.share()])
    })
    expect(onStart).toHaveBeenCalledTimes(1)
  })
})

describe('useShareLink — Web Share', () => {
  it('navigator.share 가 있으면 title·text·url 로 시트를 연다(복사 안 함)', async () => {
    const share = vi.fn(async () => undefined)
    const writeText = vi.fn(async () => undefined)
    stubShare(share)
    stubClipboard(writeText)
    const { result } = renderHook(() => useShareLink(baseOptions))
    await act(() => result.current.share())
    expect(share).toHaveBeenCalledWith({
      title: 'DestinyPal 오늘의 운',
      text: '오늘은 정리의 날',
      url: URL_OK,
    })
    expect(writeText).not.toHaveBeenCalled()
    expect(result.current.phase).toBe('idle')
    expect(result.current.error).toBeNull()
  })

  it('사용자가 시트를 닫으면(AbortError) 조용히 끝낸다 — 복사·에러 없음', async () => {
    const abort = Object.assign(new Error('cancelled'), { name: 'AbortError' })
    stubShare(vi.fn(async () => Promise.reject(abort)))
    const writeText = vi.fn(async () => undefined)
    stubClipboard(writeText)
    const { result } = renderHook(() => useShareLink(baseOptions))
    await act(() => result.current.share())
    expect(writeText).not.toHaveBeenCalled()
    expect(result.current.phase).toBe('idle')
    expect(result.current.error).toBeNull()
  })

  it('AbortError 가 아닌 공유 실패(인앱 웹뷰 NotAllowedError)는 클립보드 복사로 폴백', async () => {
    const denied = Object.assign(new Error('denied'), { name: 'NotAllowedError' })
    stubShare(vi.fn(async () => Promise.reject(denied)))
    const writeText = vi.fn(async () => undefined)
    stubClipboard(writeText)
    const { result } = renderHook(() => useShareLink(baseOptions))
    await act(() => result.current.share())
    expect(writeText).toHaveBeenCalledWith(URL_OK)
    expect(result.current.phase).toBe('copied')
  })
})

describe('useShareLink — 클립보드 폴백', () => {
  it('share 미지원이면 복사 → copied, 2초 뒤 idle', async () => {
    vi.useFakeTimers()
    const writeText = vi.fn(async () => undefined)
    stubClipboard(writeText)
    const { result } = renderHook(() => useShareLink(baseOptions))
    await act(() => result.current.share())
    expect(writeText).toHaveBeenCalledWith(URL_OK)
    expect(result.current.phase).toBe('copied')
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(result.current.phase).toBe('idle')
  })

  it('인앱 웹뷰: navigator.clipboard 가 없으면 execCommand 로 복사한다', async () => {
    execCommand.mockReturnValue(true)
    const { result } = renderHook(() => useShareLink(baseOptions))
    await act(() => result.current.share())
    expect(execCommand).toHaveBeenCalledWith('copy')
    expect(result.current.phase).toBe('copied')
    expect(result.current.error).toBeNull()
  })

  it('writeText 가 거부되면 execCommand 로 한 번 더 시도한다', async () => {
    stubClipboard(vi.fn(async () => Promise.reject(new Error('insecure'))))
    execCommand.mockReturnValue(true)
    const { result } = renderHook(() => useShareLink(baseOptions))
    await act(() => result.current.share())
    expect(execCommand).toHaveBeenCalledWith('copy')
    expect(result.current.phase).toBe('copied')
  })

  it('복사가 모두 실패하면 링크를 에러 줄에 보여 준다(수동 복사)', async () => {
    stubClipboard(vi.fn(async () => Promise.reject(new Error('nope'))))
    const { result } = renderHook(() => useShareLink(baseOptions))
    await act(() => result.current.share())
    expect(result.current.phase).toBe('idle')
    expect(result.current.error).toBe(`링크: ${URL_OK}`)
  })

  it('en 기본 문구 + 호출부 문구 덮어쓰기', async () => {
    const { result, rerender } = renderHook((opts: UseShareLinkOptions) => useShareLink(opts), {
      initialProps: { ...baseOptions, isKo: false },
    })
    await act(() => result.current.share())
    expect(result.current.error).toBe(`Link: ${URL_OK}`)

    rerender({
      ...baseOptions,
      isKo: false,
      messages: { manualCopy: (u: string) => `Invite link: ${u}` },
    })
    await act(() => result.current.share())
    expect(result.current.error).toBe(`Invite link: ${URL_OK}`)
  })
})

describe('useShareLink — 실패', () => {
  it('응답이 !ok 이거나 url 이 없으면 "링크를 만들지 못했어요"', async () => {
    apiFetch.mockResolvedValueOnce(okResponse({ url: URL_OK }, 500))
    const { result } = renderHook(() => useShareLink(baseOptions))
    await act(() => result.current.share())
    expect(result.current.error).toBe('링크를 만들지 못했어요.')
    expect(result.current.phase).toBe('idle')

    apiFetch.mockResolvedValueOnce(okResponse({}))
    await act(() => result.current.share())
    expect(result.current.error).toBe('링크를 만들지 못했어요.')
  })

  it('JSON 파싱이 실패해도 생성 실패로 처리한다', async () => {
    apiFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError('bad json')
      },
    })
    const { result } = renderHook(() => useShareLink({ ...baseOptions, isKo: false }))
    await act(() => result.current.share())
    expect(result.current.error).toBe('Could not create a link.')
  })

  it('401 은 unauthorized 문구가 있으면 그걸, 없으면 생성 실패 문구', async () => {
    apiFetch.mockResolvedValue(okResponse({}, 401))
    const { result, rerender } = renderHook((opts: UseShareLinkOptions) => useShareLink(opts), {
      initialProps: baseOptions,
    })
    await act(() => result.current.share())
    expect(result.current.error).toBe('링크를 만들지 못했어요.')

    rerender({ ...baseOptions, messages: { unauthorized: '로그인 후 링크 공유가 가능해요.' } })
    await act(() => result.current.share())
    expect(result.current.error).toBe('로그인 후 링크 공유가 가능해요.')
  })

  it('네트워크 예외 → 네트워크 문구 + logger.error(태그)', async () => {
    apiFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    const { result } = renderHook(() => useShareLink({ ...baseOptions, logTag: '[ShareDay]' }))
    await act(() => result.current.share())
    expect(result.current.error).toBe('네트워크 오류가 발생했어요.')
    expect(result.current.phase).toBe('idle')
    expect(logError).toHaveBeenCalledWith('[ShareDay] link create failed', expect.any(TypeError))
  })

  it('다음 시도에서 이전 에러를 지운다', async () => {
    apiFetch.mockResolvedValueOnce(okResponse({}, 500))
    stubClipboard(vi.fn(async () => undefined))
    const { result } = renderHook(() => useShareLink(baseOptions))
    await act(() => result.current.share())
    expect(result.current.error).not.toBeNull()
    await act(() => result.current.share())
    expect(result.current.error).toBeNull()
    expect(result.current.phase).toBe('copied')
  })

  it('reset() 은 copied/에러를 idle 로 되돌린다', async () => {
    stubClipboard(vi.fn(async () => undefined))
    const { result } = renderHook(() => useShareLink(baseOptions))
    await act(() => result.current.share())
    expect(result.current.phase).toBe('copied')
    act(() => result.current.reset())
    expect(result.current.phase).toBe('idle')
    expect(result.current.error).toBeNull()
  })
})
