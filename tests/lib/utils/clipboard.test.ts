import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { copyToClipboard } from '@/lib/utils/clipboard'

function stubClipboard(writeText: ((text: string) => Promise<void>) | undefined) {
  Object.defineProperty(navigator, 'clipboard', {
    value: writeText ? { writeText } : undefined,
    configurable: true,
    writable: true,
  })
}

describe('copyToClipboard', () => {
  let execCommandMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    // execCommand 가 throw 한 케이스에서 잔류한 textarea 정리 (테스트 간 격리)
    document.querySelectorAll('textarea').forEach((ta) => ta.remove())
    execCommandMock = vi.fn()
    // happy-dom 은 execCommand 를 구현하지 않으므로 직접 주입한다.
    Object.defineProperty(document, 'execCommand', {
      value: execCommandMock,
      configurable: true,
      writable: true,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('navigator.clipboard.writeText 성공 시 true 를 반환한다', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    stubClipboard(writeText)

    await expect(copyToClipboard('hello')).resolves.toBe(true)
    expect(writeText).toHaveBeenCalledWith('hello')
    expect(execCommandMock).not.toHaveBeenCalled() // fallback 불필요
  })

  it('writeText 가 reject 되면 execCommand fallback 으로 복사한다', async () => {
    stubClipboard(vi.fn().mockRejectedValue(new Error('not allowed')))
    execCommandMock.mockReturnValue(true)

    await expect(copyToClipboard('fallback text')).resolves.toBe(true)
    expect(execCommandMock).toHaveBeenCalledWith('copy')
  })

  it('clipboard API 가 아예 없으면 곧장 execCommand 경로를 탄다', async () => {
    stubClipboard(undefined)
    execCommandMock.mockReturnValue(true)

    await expect(copyToClipboard('legacy')).resolves.toBe(true)
    expect(execCommandMock).toHaveBeenCalledWith('copy')
  })

  it('execCommand 가 false 를 반환하면 false 를 반환한다', async () => {
    stubClipboard(undefined)
    execCommandMock.mockReturnValue(false)

    await expect(copyToClipboard('nope')).resolves.toBe(false)
  })

  it('execCommand 가 throw 해도 false 로 흡수한다 (throw 전파 금지)', async () => {
    stubClipboard(undefined)
    execCommandMock.mockImplementation(() => {
      throw new Error('SecurityError')
    })

    await expect(copyToClipboard('boom')).resolves.toBe(false)
  })

  it('fallback 경로는 임시 textarea 를 body 에 남기지 않는다', async () => {
    stubClipboard(undefined)
    execCommandMock.mockReturnValue(true)

    const before = document.querySelectorAll('textarea').length
    await copyToClipboard('clean up')
    expect(document.querySelectorAll('textarea').length).toBe(before)
  })

  it('fallback textarea 에 복사 대상 텍스트가 들어간다', async () => {
    stubClipboard(undefined)
    let valueAtCopy: string | null = null
    execCommandMock.mockImplementation(() => {
      valueAtCopy = document.querySelector('textarea')?.value ?? null
      return true
    })

    await copyToClipboard('payload-123')
    expect(valueAtCopy).toBe('payload-123')
  })
})
