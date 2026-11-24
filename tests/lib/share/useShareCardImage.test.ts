// tests/lib/share/useShareCardImage.test.ts
//
// 이미지 카드 공유 훅 — render() → (카드 마운트 한 틱 뒤) html-to-image 로 PNG 캡처 →
// object URL 미리보기 → 파일 공유(Web Share level 2) 또는 저장. object URL 은 교체·닫기·
// 언마운트 때 반드시 revoke 한다.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

const toBlob = vi.fn()
vi.mock('html-to-image', () => ({
  toBlob: (...a: unknown[]) => toBlob(...a),
}))

const logError = vi.fn()
vi.mock('@/lib/logger', () => ({
  logger: { error: (...a: unknown[]) => logError(...a), warn: vi.fn(), info: vi.fn() },
}))

import { useShareCardImage, type UseShareCardImageOptions } from '@/lib/share/useShareCardImage'

const origCreate = URL.createObjectURL
const origRevoke = URL.revokeObjectURL
let createObjectURL: ReturnType<typeof vi.fn>
let revokeObjectURL: ReturnType<typeof vi.fn>
let urlSeq = 0

function stubShare(
  share: ((d: ShareData) => Promise<void>) | undefined,
  canShare?: (d?: ShareData) => boolean
) {
  Object.defineProperty(navigator, 'share', { value: share, configurable: true, writable: true })
  Object.defineProperty(navigator, 'canShare', {
    value: canShare,
    configurable: true,
    writable: true,
  })
}

const baseOptions: UseShareCardImageOptions = {
  width: 1080,
  backgroundColor: '#070a1a',
  filename: 'destinypal-test.png',
  title: 'DestinyPal 공유',
  text: '한 줄',
  isKo: true,
}

function setup(options: UseShareCardImageOptions = baseOptions, node: HTMLElement | null = null) {
  const el = node ?? document.createElement('div')
  const ref = { current: el as HTMLElement | null }
  const hook = renderHook((opts: UseShareCardImageOptions) => useShareCardImage(ref, opts), {
    initialProps: options,
  })
  return { ref, el, ...hook }
}

async function renderToPreview(result: { current: ReturnType<typeof useShareCardImage> }) {
  act(() => result.current.render())
  await waitFor(() => expect(result.current.phase).toBe('preview'))
}

beforeEach(() => {
  toBlob.mockReset()
  logError.mockReset()
  toBlob.mockImplementation(async () => new Blob(['png'], { type: 'image/png' }))
  urlSeq = 0
  createObjectURL = vi.fn(() => `blob:preview-${++urlSeq}`)
  revokeObjectURL = vi.fn()
  URL.createObjectURL = createObjectURL as unknown as typeof URL.createObjectURL
  URL.revokeObjectURL = revokeObjectURL as unknown as typeof URL.revokeObjectURL
  stubShare(undefined, undefined)
})

afterEach(() => {
  URL.createObjectURL = origCreate
  URL.revokeObjectURL = origRevoke
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('useShareCardImage — 캡처', () => {
  it('render() → rendering → 캡처 → preview + object URL', async () => {
    const { result, el } = setup()
    expect(result.current.phase).toBe('idle')
    expect(result.current.previewUrl).toBeNull()

    act(() => result.current.render())
    expect(result.current.phase).toBe('rendering')
    await waitFor(() => expect(result.current.phase).toBe('preview'))

    expect(toBlob).toHaveBeenCalledTimes(1)
    expect(toBlob).toHaveBeenCalledWith(el, {
      width: 1080,
      height: 1080,
      pixelRatio: 1,
      cacheBust: true,
      backgroundColor: '#070a1a',
    })
    expect(result.current.previewUrl).toBe('blob:preview-1')
    expect(result.current.error).toBeNull()
  })

  it('height 를 주면 직사각 캡처', async () => {
    const { result } = setup({ ...baseOptions, width: 1080, height: 1920 })
    await renderToPreview(result)
    expect(toBlob.mock.calls[0][1]).toMatchObject({ width: 1080, height: 1920 })
  })

  it('캡처 전에 preload 이미지를 디코드한다', async () => {
    const loaded: string[] = []
    class FakeImage {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      set src(v: string) {
        setTimeout(() => {
          loaded.push(v)
          this.onload?.()
        }, 0)
      }
    }
    vi.stubGlobal('Image', FakeImage)
    toBlob.mockImplementation(async () => {
      // 캡처 시점엔 이미 전부 로드돼 있어야 한다.
      expect(loaded).toEqual(['/logo/logo.png', '/cards/sun.png'])
      return new Blob(['png'], { type: 'image/png' })
    })
    const { result } = setup({ ...baseOptions, preload: ['/logo/logo.png', '/cards/sun.png'] })
    await renderToPreview(result)
    expect(toBlob).toHaveBeenCalledTimes(1)
  })

  it('toBlob 이 null 이면 에러 문구 + idle, URL 을 만들지 않는다', async () => {
    toBlob.mockResolvedValueOnce(null)
    const { result } = setup({ ...baseOptions, logTag: '[ShareTest]' })
    act(() => result.current.render())
    await waitFor(() => expect(result.current.error).not.toBeNull())
    expect(result.current.error).toBe('이미지를 만들지 못했어요. 다시 시도해 주세요.')
    expect(result.current.phase).toBe('idle')
    expect(result.current.previewUrl).toBeNull()
    expect(createObjectURL).not.toHaveBeenCalled()
    expect(logError).toHaveBeenCalledWith('[ShareTest] capture failed', expect.any(Error))
  })

  it('캡처 대상 노드가 없으면 실패로 처리한다(무한 rendering 금지)', async () => {
    const { result, ref } = setup({ ...baseOptions, isKo: false })
    ref.current = null
    act(() => result.current.render())
    await waitFor(() => expect(result.current.phase).toBe('idle'))
    expect(result.current.error).toBe('Could not create the image. Please try again.')
    expect(toBlob).not.toHaveBeenCalled()
  })

  it('캡처 도중 언마운트되면 URL 을 만들지 않는다', async () => {
    let resolveBlob: (b: Blob) => void = () => {}
    toBlob.mockImplementationOnce(() => new Promise<Blob>((r) => (resolveBlob = r)))
    const { result, unmount } = setup()
    act(() => result.current.render())
    await waitFor(() => expect(toBlob).toHaveBeenCalled())
    unmount()
    resolveBlob(new Blob(['png']))
    await new Promise((r) => setTimeout(r, 0))
    expect(createObjectURL).not.toHaveBeenCalled()
  })
})

describe('useShareCardImage — object URL 수명', () => {
  it('다시 캡처하면 이전 URL 을 revoke 한다', async () => {
    const { result } = setup()
    await renderToPreview(result)
    expect(result.current.previewUrl).toBe('blob:preview-1')

    act(() => result.current.render())
    await waitFor(() => expect(result.current.previewUrl).toBe('blob:preview-2'))
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:preview-1')
    expect(revokeObjectURL).not.toHaveBeenCalledWith('blob:preview-2')
  })

  it('close() 는 idle 로 되돌리고 URL 을 revoke 한다', async () => {
    const { result } = setup()
    await renderToPreview(result)
    act(() => result.current.close())
    expect(result.current.phase).toBe('idle')
    expect(result.current.previewUrl).toBeNull()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:preview-1')
  })

  it('언마운트하면 현재 URL 을 revoke 한다', async () => {
    const { result, unmount } = setup()
    await renderToPreview(result)
    unmount()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:preview-1')
  })
})

describe('useShareCardImage — 공유/저장', () => {
  it('canNativeShare 는 navigator.share 유무를 따른다', () => {
    const a = setup()
    expect(a.result.current.canNativeShare).toBe(false)
    a.unmount()
    stubShare(
      vi.fn(async () => undefined),
      () => true
    )
    const b = setup()
    expect(b.result.current.canNativeShare).toBe(true)
  })

  it('파일 공유가 되면 PNG File 로 share 를 연다(저장 안 함)', async () => {
    const share = vi.fn(async (_d: ShareData) => undefined)
    stubShare(share, () => true)
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const { result } = setup()
    await renderToPreview(result)
    await act(() => result.current.nativeShare())
    expect(share).toHaveBeenCalledTimes(1)
    const data = share.mock.calls[0][0]
    expect(data.title).toBe('DestinyPal 공유')
    expect(data.text).toBe('한 줄')
    const file = data.files?.[0] as File
    expect(file.name).toBe('destinypal-test.png')
    expect(file.type).toBe('image/png')
    expect(click).not.toHaveBeenCalled()
  })

  it('사용자가 시트를 닫으면(AbortError) 저장으로 넘어가지 않는다', async () => {
    const abort = Object.assign(new Error('x'), { name: 'AbortError' })
    stubShare(
      vi.fn(async () => Promise.reject(abort)),
      () => true
    )
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const { result } = setup()
    await renderToPreview(result)
    await act(() => result.current.nativeShare())
    expect(click).not.toHaveBeenCalled()
    expect(logError).not.toHaveBeenCalled()
  })

  it('파일 공유 미지원(canShare false)이면 저장으로 폴백', async () => {
    const share = vi.fn(async () => undefined)
    stubShare(share, () => false)
    let anchor: HTMLAnchorElement | null = null
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement
    ) {
      anchor = this
    })
    const { result } = setup()
    await renderToPreview(result)
    await act(() => result.current.nativeShare())
    expect(share).not.toHaveBeenCalled()
    expect(anchor).not.toBeNull()
    expect(anchor!.getAttribute('href')).toBe('blob:preview-1')
    expect(anchor!.download).toBe('destinypal-test.png')
    // 임시 <a> 는 문서에 남기지 않는다.
    expect(document.querySelectorAll('a[download]').length).toBe(0)
  })

  it('공유가 다른 이유로 실패하면 로그 후 저장으로 폴백', async () => {
    stubShare(
      vi.fn(async () => Promise.reject(new Error('boom'))),
      () => true
    )
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const { result } = setup({ ...baseOptions, logTag: '[ShareTest]' })
    await renderToPreview(result)
    await act(() => result.current.nativeShare())
    expect(logError).toHaveBeenCalledWith('[ShareTest] native share failed', expect.any(Error))
    expect(click).toHaveBeenCalledTimes(1)
  })

  it('미리보기 전에는 공유·저장이 아무것도 하지 않는다', async () => {
    const share = vi.fn(async () => undefined)
    stubShare(share, () => true)
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const { result } = setup()
    await act(() => result.current.nativeShare())
    act(() => result.current.download())
    expect(share).not.toHaveBeenCalled()
    expect(click).not.toHaveBeenCalled()
  })
})
