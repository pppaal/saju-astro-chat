import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react'

// --- mocks ------------------------------------------------------------------

// apiFetch is the share-link creation entry point.
const apiFetch = vi.fn()
vi.mock('@/lib/api', () => ({
  apiFetch: (...args: unknown[]) => apiFetch(...args),
}))

vi.mock('@/lib/logger', () => ({
  tarotLogger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}))

// html-to-image — control capture success/failure deterministically.
const toBlob = vi.fn()
vi.mock('html-to-image', () => ({
  toBlob: (...args: unknown[]) => toBlob(...args),
}))

// Stub the off-screen capture card so we don't pull in TarotShareCard deps.
vi.mock('@/components/tarot/TarotShareCard', () => {
  const Card = React.forwardRef<HTMLDivElement>((_props, ref) => (
    <div ref={ref} data-testid="share-card" />
  ))
  Card.displayName = 'TarotShareCard'
  return { SHARE_CARD_SIZE: 1080, TarotShareCard: Card }
})

import { ShareTarotButton } from '@/components/tarot/ShareTarotButton'
import type { ShareCardData } from '@/components/tarot/TarotShareCard'

const shareData: ShareCardData = {
  question: '이직해도 될까요?',
  spreadTitle: 'Three Card',
  cards: [
    { image: '/images/tarot/fool.webp', name: 'The Fool', isReversed: false },
    { image: '/images/tarot/sun.webp', name: 'The Sun', isReversed: true },
  ],
  keyMessage: '새로운 시작이 다가옵니다',
  isKo: true,
} as ShareCardData

function makeRes(
  over: Partial<{ ok: boolean; status: number; json: () => Promise<unknown> }> = {}
) {
  return {
    ok: over.ok ?? true,
    status: over.status ?? 200,
    json: over.json ?? (async () => ({ data: { url: 'https://destinypal.app/r/abc' } })),
  }
}

// Open the preview modal by clicking the entry button and resolving capture.
async function openPreview() {
  fireEvent.click(screen.getByRole('button', { name: /결과 공유하기|Share result/ }))
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: /링크로 공유|Share link|링크 복사됨|Link copied/ })
    ).toBeInTheDocument()
  )
}

describe('ShareTarotButton', () => {
  let originalImage: typeof globalThis.Image
  let originalCreateObjectURL: typeof URL.createObjectURL
  let originalRevokeObjectURL: typeof URL.revokeObjectURL

  beforeEach(() => {
    apiFetch.mockReset()
    toBlob.mockReset()
    toBlob.mockResolvedValue(new Blob(['x'], { type: 'image/png' }))

    // Image preloading resolves immediately.
    originalImage = globalThis.Image
    class FakeImage {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      set src(_v: string) {
        if (this.onload) this.onload()
      }
    }
    // @ts-expect-error test stub
    globalThis.Image = FakeImage

    originalCreateObjectURL = URL.createObjectURL
    originalRevokeObjectURL = URL.revokeObjectURL
    URL.createObjectURL = vi.fn(() => 'blob:preview-url')
    URL.revokeObjectURL = vi.fn()

    // requestAnimationFrame may be undefined in jsdom in some setups.
    if (typeof globalThis.requestAnimationFrame !== 'function') {
      // @ts-expect-error test stub
      globalThis.requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(() => cb(0), 0)
    }
  })

  afterEach(() => {
    cleanup()
    globalThis.Image = originalImage
    URL.createObjectURL = originalCreateObjectURL
    URL.revokeObjectURL = originalRevokeObjectURL
    // Reset navigator overrides set by individual tests.
    // @ts-expect-error allow delete in tests
    delete (navigator as Navigator & { share?: unknown }).share
    // @ts-expect-error allow delete in tests
    delete (navigator as Navigator & { canShare?: unknown }).canShare
  })

  it('renders the entry share button (ko)', () => {
    render(<ShareTarotButton data={shareData} language="ko" />)
    expect(screen.getByRole('button', { name: '결과 공유하기' })).toBeInTheDocument()
  })

  it('renders the entry share button (en)', () => {
    render(<ShareTarotButton data={shareData} language="en" />)
    expect(screen.getByRole('button', { name: 'Share result' })).toBeInTheDocument()
  })

  it('captures an image and opens the preview modal on click', async () => {
    render(<ShareTarotButton data={shareData} language="ko" />)
    await openPreview()
    expect(toBlob).toHaveBeenCalled()
    expect(screen.getByAltText('공유 카드 미리보기')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '링크로 공유' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '이미지 저장' })).toBeInTheDocument()
  })

  it('shows an error and stays on idle when capture fails', async () => {
    toBlob.mockResolvedValue(null) // forces "toBlob returned null"
    render(<ShareTarotButton data={shareData} language="ko" />)
    fireEvent.click(screen.getByRole('button', { name: '결과 공유하기' }))
    await waitFor(() => expect(screen.getByText(/이미지를 만들지 못했어요/)).toBeInTheDocument())
    expect(screen.queryByAltText('공유 카드 미리보기')).not.toBeInTheDocument()
  })

  it('creates a share link and copies to clipboard when Web Share is unavailable', async () => {
    apiFetch.mockResolvedValue(makeRes())
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
      writable: true,
    })

    render(<ShareTarotButton data={shareData} language="ko" />)
    await openPreview()

    fireEvent.click(screen.getByRole('button', { name: '링크로 공유' }))

    await waitFor(() =>
      expect(screen.getByRole('button', { name: '링크 복사됨!' })).toBeInTheDocument()
    )
    expect(apiFetch).toHaveBeenCalledWith(
      '/api/tarot/share',
      expect.objectContaining({ method: 'POST' })
    )
    expect(writeText).toHaveBeenCalledWith('https://destinypal.app/r/abc')
  })

  it('uses navigator.share for the link when available', async () => {
    apiFetch.mockResolvedValue(makeRes())
    const share = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { share })

    render(<ShareTarotButton data={shareData} language="ko" />)
    await openPreview()

    fireEvent.click(screen.getByRole('button', { name: '링크로 공유' }))

    await waitFor(() => expect(share).toHaveBeenCalled())
    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'https://destinypal.app/r/abc' })
    )
  })

  it('shows a sign-in error when the share API returns 401', async () => {
    apiFetch.mockResolvedValue(makeRes({ ok: false, status: 401, json: async () => ({}) }))
    render(<ShareTarotButton data={shareData} language="ko" />)
    await openPreview()

    fireEvent.click(screen.getByRole('button', { name: '링크로 공유' }))
    await waitFor(() =>
      expect(screen.getByText('로그인 후 링크 공유가 가능해요.')).toBeInTheDocument()
    )
  })

  it('shows a generic error when the share API fails without a url', async () => {
    apiFetch.mockResolvedValue(
      makeRes({ ok: false, status: 500, json: async () => ({ data: {} }) })
    )
    render(<ShareTarotButton data={shareData} language="ko" />)
    await openPreview()

    fireEvent.click(screen.getByRole('button', { name: '링크로 공유' }))
    await waitFor(() => expect(screen.getByText('링크를 만들지 못했어요.')).toBeInTheDocument())
  })

  it('shows a network error when the share API throws', async () => {
    apiFetch.mockRejectedValue(new Error('boom'))
    render(<ShareTarotButton data={shareData} language="ko" />)
    await openPreview()

    fireEvent.click(screen.getByRole('button', { name: '링크로 공유' }))
    await waitFor(() => expect(screen.getByText('네트워크 오류가 발생했어요.')).toBeInTheDocument())
  })

  it('downloads the image when "Save image" is clicked', async () => {
    const clickSpy = vi.fn()
    const realCreate = document.createElement.bind(document)
    const createSpy = vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = realCreate(tag)
      if (tag === 'a') {
        // @ts-expect-error override click
        el.click = clickSpy
      }
      return el
    })

    render(<ShareTarotButton data={shareData} language="ko" />)
    await openPreview()

    fireEvent.click(screen.getByRole('button', { name: '이미지 저장' }))
    expect(clickSpy).toHaveBeenCalled()
    createSpy.mockRestore()
  })

  it('renders a native "Share image" button only when navigator.share exists', async () => {
    apiFetch.mockResolvedValue(makeRes())
    Object.assign(navigator, { share: vi.fn().mockResolvedValue(undefined) })
    render(<ShareTarotButton data={shareData} language="ko" />)
    await openPreview()
    expect(screen.getByRole('button', { name: '이미지 공유' })).toBeInTheDocument()
  })

  it('closes the modal via the close button', async () => {
    render(<ShareTarotButton data={shareData} language="ko" />)
    await openPreview()
    fireEvent.click(screen.getByRole('button', { name: '닫기' }))
    await waitFor(() => expect(screen.queryByAltText('공유 카드 미리보기')).not.toBeInTheDocument())
  })
})
