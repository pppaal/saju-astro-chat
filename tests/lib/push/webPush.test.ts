/**
 * Tests for src/lib/push/webPush.ts
 * Web Push(VAPID) 서버 헬퍼 — 환경변수 기반 설정 게이트 테스트.
 *
 * getWebPush() 는 키 3종(public/private/subject)이 모두 유효해야 web-push
 * 모듈을 반환하고, 하나라도 비거나 'replace_me'/잘못된 subject 면 null.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest'

// Mock the `web-push` library so we never touch the network or real crypto.
// vi.mock is hoisted, so the spy must be created via vi.hoisted.
const { setVapidDetails } = vi.hoisted(() => ({ setVapidDetails: vi.fn() }))
vi.mock('web-push', () => ({
  default: {
    setVapidDetails,
    sendNotification: vi.fn(),
  },
}))

import { getWebPush } from '@/lib/push/webPush'

const ENV_KEYS = [
  'VAPID_PUBLIC_KEY',
  'NEXT_PUBLIC_VAPID_PUBLIC_KEY',
  'VAPID_PRIVATE_KEY',
  'VAPID_SUBJECT',
] as const

function clearEnv() {
  for (const key of ENV_KEYS) {
    delete process.env[key]
  }
}

describe('getWebPush', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearEnv()
  })

  it('configured 키가 모두 있으면 web-push 모듈을 반환하고 setVapidDetails 를 호출한다', () => {
    process.env.VAPID_PUBLIC_KEY = 'pub-key'
    process.env.VAPID_PRIVATE_KEY = 'priv-key'
    process.env.VAPID_SUBJECT = 'mailto:admin@example.com'

    const wp = getWebPush()

    expect(wp).not.toBeNull()
    expect(setVapidDetails).toHaveBeenCalledWith('mailto:admin@example.com', 'pub-key', 'priv-key')
  })

  it('public key 가 없으면 NEXT_PUBLIC_VAPID_PUBLIC_KEY 로 폴백한다', () => {
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'public-fallback'
    process.env.VAPID_PRIVATE_KEY = 'priv-key'
    process.env.VAPID_SUBJECT = 'https://example.com/contact'

    const wp = getWebPush()

    expect(wp).not.toBeNull()
    expect(setVapidDetails).toHaveBeenCalledWith(
      'https://example.com/contact',
      'public-fallback',
      'priv-key'
    )
  })

  it('private key 가 없으면 null', () => {
    process.env.VAPID_PUBLIC_KEY = 'pub-key'
    process.env.VAPID_SUBJECT = 'mailto:admin@example.com'

    expect(getWebPush()).toBeNull()
    expect(setVapidDetails).not.toHaveBeenCalled()
  })

  it('public/NEXT_PUBLIC 둘 다 없으면 null', () => {
    process.env.VAPID_PRIVATE_KEY = 'priv-key'
    process.env.VAPID_SUBJECT = 'mailto:admin@example.com'

    expect(getWebPush()).toBeNull()
  })

  it('subject 가 없으면 null', () => {
    process.env.VAPID_PUBLIC_KEY = 'pub-key'
    process.env.VAPID_PRIVATE_KEY = 'priv-key'

    expect(getWebPush()).toBeNull()
  })

  it('subject 가 mailto:/https:// 로 시작하지 않으면 null', () => {
    process.env.VAPID_PUBLIC_KEY = 'pub-key'
    process.env.VAPID_PRIVATE_KEY = 'priv-key'
    process.env.VAPID_SUBJECT = 'admin@example.com'

    expect(getWebPush()).toBeNull()
    expect(setVapidDetails).not.toHaveBeenCalled()
  })

  it("값이 'replace_me' 면(대소문자 무시) 미설정으로 본다", () => {
    process.env.VAPID_PUBLIC_KEY = 'REPLACE_ME'
    process.env.VAPID_PRIVATE_KEY = 'priv-key'
    process.env.VAPID_SUBJECT = 'mailto:admin@example.com'

    // public 이 placeholder 이고 NEXT_PUBLIC 폴백도 없으므로 null.
    expect(getWebPush()).toBeNull()
  })

  it('공백만 있는 값은 미설정으로 본다', () => {
    process.env.VAPID_PUBLIC_KEY = '   '
    process.env.VAPID_PRIVATE_KEY = 'priv-key'
    process.env.VAPID_SUBJECT = 'mailto:admin@example.com'

    expect(getWebPush()).toBeNull()
  })

  it('값 주변의 공백은 trim 된다', () => {
    process.env.VAPID_PUBLIC_KEY = '  pub-key  '
    process.env.VAPID_PRIVATE_KEY = '  priv-key  '
    process.env.VAPID_SUBJECT = '  mailto:admin@example.com  '

    const wp = getWebPush()

    expect(wp).not.toBeNull()
    expect(setVapidDetails).toHaveBeenCalledWith('mailto:admin@example.com', 'pub-key', 'priv-key')
  })
})
