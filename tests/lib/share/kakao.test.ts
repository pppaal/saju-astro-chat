// tests/lib/share/kakao.test.ts
//
// 카카오 공유 래퍼의 계약 검증: 키 미설정이면 조용히 비활성(false 폴백),
// 이미 SDK 가 있으면 init 후 sendDefault 를 올바른 피드 페이로드로 호출.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const KEY = 'test-kakao-js-key'

// window.Kakao 목 — sendDefault 호출 인자를 캡처한다.
function installKakaoMock() {
  const sendDefault = vi.fn()
  let initialized = false
  const kakao = {
    isInitialized: () => initialized,
    init: vi.fn((_key: string) => {
      initialized = true
    }),
    Share: { sendDefault },
  }
  ;(window as unknown as { Kakao?: typeof kakao }).Kakao = kakao
  return { kakao, sendDefault }
}

async function freshImport() {
  // 모듈 내부 loadPromise 캐시를 매 테스트 초기화.
  vi.resetModules()
  return import('@/lib/share/kakao')
}

describe('share/kakao', () => {
  beforeEach(() => {
    delete (window as unknown as { Kakao?: unknown }).Kakao
    delete process.env.NEXT_PUBLIC_KAKAO_JS_KEY
  })
  afterEach(() => {
    vi.restoreAllMocks()
    delete (window as unknown as { Kakao?: unknown }).Kakao
    delete process.env.NEXT_PUBLIC_KAKAO_JS_KEY
  })

  it('isKakaoConfigured: 키가 없으면 false, 있으면 true', async () => {
    const mod = await freshImport()
    expect(mod.isKakaoConfigured()).toBe(false)
    process.env.NEXT_PUBLIC_KAKAO_JS_KEY = KEY
    expect(mod.isKakaoConfigured()).toBe(true)
  })

  it('shareToKakao: 키 미설정이면 SDK 로드 없이 false 로 폴백', async () => {
    const mod = await freshImport()
    const ok = await mod.shareToKakao({
      title: 't',
      description: 'd',
      imageUrl: 'https://x/og',
      link: 'https://x',
      buttonTitle: 'b',
    })
    expect(ok).toBe(false)
  })

  it('shareToKakao: SDK 존재 시 init 후 feed 페이로드로 sendDefault 호출', async () => {
    process.env.NEXT_PUBLIC_KAKAO_JS_KEY = KEY
    const { kakao, sendDefault } = installKakaoMock()
    const mod = await freshImport()

    const ok = await mod.shareToKakao({
      title: 'DestinyPal 궁합',
      description: '두 사람은 잘 맞아요',
      imageUrl: 'https://destinypal.com/r/tok/opengraph-image',
      link: 'https://destinypal.com/r/tok',
      buttonTitle: '나도 궁합 보기',
    })

    expect(ok).toBe(true)
    expect(kakao.init).toHaveBeenCalledWith(KEY)
    expect(sendDefault).toHaveBeenCalledTimes(1)
    const payload = sendDefault.mock.calls[0][0]
    expect(payload.objectType).toBe('feed')
    expect(payload.content.imageUrl).toBe('https://destinypal.com/r/tok/opengraph-image')
    expect(payload.content.link.webUrl).toBe('https://destinypal.com/r/tok')
    expect(payload.buttons[0].title).toBe('나도 궁합 보기')
  })

  it('shareToKakao: sendDefault 가 throw 하면 false 로 폴백', async () => {
    process.env.NEXT_PUBLIC_KAKAO_JS_KEY = KEY
    const { sendDefault } = installKakaoMock()
    sendDefault.mockImplementation(() => {
      throw new Error('kakao boom')
    })
    const mod = await freshImport()
    const ok = await mod.shareToKakao({
      title: 't',
      description: 'd',
      imageUrl: 'https://x/og',
      link: 'https://x',
      buttonTitle: 'b',
    })
    expect(ok).toBe(false)
  })
})
