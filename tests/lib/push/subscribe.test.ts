/**
 * Tests for src/lib/push/subscribe.ts
 * 클라이언트 웹 푸시 구독 헬퍼 — 권한/지원여부/구독 성공·실패 경로.
 *
 * 주의: 모듈은 로드 시점에 NEXT_PUBLIC_VAPID_PUBLIC_KEY 를 상수로 캡처한다.
 * 따라서 "설정됨" 경로는 vi.resetModules() + 환경변수 설정 후 동적 import 로,
 * "미설정" 경로는 환경변수 없이 import 로 분리해서 검증한다.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

// happy-dom 의 navigator / window 를 직접 건드리므로 원본을 보관했다가 복구.
const realNavigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator')

/** subscribe 모듈을 주어진 VAPID 키로 새로 로드한다. */
async function loadModule(vapidKey?: string) {
  vi.resetModules()
  if (vapidKey === undefined) {
    delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  } else {
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = vapidKey
  }
  return import('@/lib/push/subscribe')
}

/** 서비스워커/PushManager/Notification 지원 환경을 구성한다. */
function installPushCapableEnv(opts: {
  permission?: NotificationPermission
  requestPermission?: () => Promise<NotificationPermission>
  registration?: unknown
  getSubscription?: () => Promise<unknown>
  subscribe?: () => Promise<unknown>
}) {
  const pushManager = {
    getSubscription: opts.getSubscription ?? vi.fn(async () => null),
    subscribe: opts.subscribe ?? vi.fn(async () => makeSubscription()),
  }
  // 기본 registration 은 우리 푸시 SW(/push-sw.js)가 이미 활성화된 상태를 흉내낸다.
  // subscribe.ts 의 getRegistration() 은 active.scriptURL 이 /push-sw.js 로 끝나면
  // register() 를 건너뛰고 재사용한다.
  const registration =
    opts.registration === undefined
      ? { pushManager, active: { scriptURL: 'https://app.test/push-sw.js' } }
      : opts.registration

  const serviceWorker = {
    getRegistration: vi.fn(async () => registration),
    register: vi.fn(async () => registration),
    ready: Promise.resolve(registration),
  }

  // navigator.serviceWorker
  Object.defineProperty(globalThis.navigator, 'serviceWorker', {
    value: serviceWorker,
    configurable: true,
  })

  // window.PushManager — presence check only ('PushManager' in window)
  ;(globalThis as any).PushManager = function () {}

  // window.Notification
  const requestPermission =
    opts.requestPermission ?? vi.fn(async () => opts.permission ?? 'granted')
  ;(globalThis as any).Notification = { requestPermission }

  return { serviceWorker, pushManager, registration, requestPermission }
}

function makeSubscription(overrides?: Partial<{ endpoint: string; p256dh: string; auth: string }>) {
  const endpoint = overrides?.endpoint ?? 'https://push.example.com/abc'
  const p256dh = overrides?.p256dh ?? 'p256dh-key'
  const auth = overrides?.auth ?? 'auth-key'
  return {
    endpoint,
    toJSON: () => ({ endpoint, keys: { p256dh, auth } }),
    unsubscribe: vi.fn(async () => true),
  }
}

function removePushEnv() {
  delete (globalThis as any).PushManager
  delete (globalThis as any).Notification
  // remove serviceWorker if we added it
  try {
    Object.defineProperty(globalThis.navigator, 'serviceWorker', {
      value: undefined,
      configurable: true,
    })
  } catch {
    /* ignore */
  }
}

describe('subscribe.ts (web push client)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // global fetch mock (from tests/setup.ts) reset to a default OK
    ;(global.fetch as ReturnType<typeof vi.fn>).mockReset?.()
  })

  afterEach(() => {
    removePushEnv()
    if (realNavigatorDescriptor) {
      Object.defineProperty(globalThis, 'navigator', realNavigatorDescriptor)
    }
  })

  describe('isPushConfigured', () => {
    it('VAPID 키가 비어있으면 false', async () => {
      const mod = await loadModule('')
      expect(mod.isPushConfigured()).toBe(false)
    })

    it("VAPID 키가 'replace_me' 면 false (대소문자 무시)", async () => {
      const mod = await loadModule('REPLACE_ME')
      expect(mod.isPushConfigured()).toBe(false)
    })

    it('VAPID 키가 실제 값이면 true', async () => {
      const mod = await loadModule('real-vapid-public-key')
      expect(mod.isPushConfigured()).toBe(true)
    })
  })

  describe('isPushSupported', () => {
    it('SW/PushManager/Notification 가 모두 있으면 true', async () => {
      installPushCapableEnv({})
      const mod = await loadModule('key')
      expect(mod.isPushSupported()).toBe(true)
    })

    it('PushManager 가 없으면 false', async () => {
      installPushCapableEnv({})
      delete (globalThis as any).PushManager
      const mod = await loadModule('key')
      expect(mod.isPushSupported()).toBe(false)
    })

    it('Notification 이 없으면 false', async () => {
      installPushCapableEnv({})
      delete (globalThis as any).Notification
      const mod = await loadModule('key')
      expect(mod.isPushSupported()).toBe(false)
    })
  })

  describe('subscribeToDailyFortunePush', () => {
    it("미설정이면 'not_configured'", async () => {
      const mod = await loadModule('')
      const result = await mod.subscribeToDailyFortunePush('ko')
      expect(result.status).toBe('not_configured')
    })

    it("지원하지 않으면 'unsupported'", async () => {
      // configured but no push capabilities
      removePushEnv()
      const mod = await loadModule('key')
      const result = await mod.subscribeToDailyFortunePush('ko')
      expect(result.status).toBe('unsupported')
    })

    it("권한이 거부되면 'denied'", async () => {
      installPushCapableEnv({ permission: 'denied' })
      const mod = await loadModule('key')
      const result = await mod.subscribeToDailyFortunePush('ko')
      expect(result.status).toBe('denied')
    })

    it("requestPermission 이 throw 하면 'error'", async () => {
      installPushCapableEnv({
        requestPermission: vi.fn(async () => {
          throw new Error('boom')
        }),
      })
      const mod = await loadModule('key')
      const result = await mod.subscribeToDailyFortunePush('ko')
      expect(result.status).toBe('error')
    })

    it("registration 등록이 실패하면 'error' (지원은 하므로 일시 오류)", async () => {
      installPushCapableEnv({ permission: 'granted', registration: null })
      const mod = await loadModule('key')
      const result = await mod.subscribeToDailyFortunePush('ko')
      expect(result.status).toBe('error')
    })

    it("새로 구독 후 서버 저장이 성공하면 'subscribed'", async () => {
      const subscribe = vi.fn(async () => makeSubscription())
      installPushCapableEnv({
        permission: 'granted',
        getSubscription: vi.fn(async () => null),
        subscribe,
      })
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true })

      // valid base64url key so urlBase64ToUint8Array(atob) doesn't throw
      const mod = await loadModule('BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QzpDcwQ')
      const result = await mod.subscribeToDailyFortunePush('en')

      expect(subscribe).toHaveBeenCalledWith(expect.objectContaining({ userVisibleOnly: true }))
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/me/push-subscription',
        expect.objectContaining({ method: 'POST' })
      )
      expect(result.status).toBe('subscribed')
    })

    it("이미 구독되어 있으면 재구독 없이 'subscribed'", async () => {
      const subscribe = vi.fn(async () => makeSubscription())
      installPushCapableEnv({
        permission: 'granted',
        getSubscription: vi.fn(async () => makeSubscription()),
        subscribe,
      })
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true })

      const mod = await loadModule('BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QzpDcwQ')
      const result = await mod.subscribeToDailyFortunePush('ko')

      expect(subscribe).not.toHaveBeenCalled()
      expect(result.status).toBe('subscribed')
    })

    it("구독 JSON 에 endpoint/keys 가 없으면 'error'", async () => {
      const badSub = {
        endpoint: '',
        toJSON: () => ({ endpoint: '', keys: {} }),
        unsubscribe: vi.fn(),
      }
      installPushCapableEnv({
        permission: 'granted',
        getSubscription: vi.fn(async () => badSub),
      })
      const mod = await loadModule('BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QzpDcwQ')
      const result = await mod.subscribeToDailyFortunePush('ko')
      expect(result.status).toBe('error')
    })

    it("서버 저장 응답이 not-ok 면 'error'", async () => {
      installPushCapableEnv({
        permission: 'granted',
        getSubscription: vi.fn(async () => makeSubscription()),
      })
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: false })

      const mod = await loadModule('BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QzpDcwQ')
      const result = await mod.subscribeToDailyFortunePush('ko')
      expect(result.status).toBe('error')
    })

    it("subscribe 가 throw 하면 'error'", async () => {
      installPushCapableEnv({
        permission: 'granted',
        getSubscription: vi.fn(async () => null),
        subscribe: vi.fn(async () => {
          throw new Error('subscribe failed')
        }),
      })
      const mod = await loadModule('BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QzpDcwQ')
      const result = await mod.subscribeToDailyFortunePush('ko')
      expect(result.status).toBe('error')
    })
  })

  describe('getExistingPushSubscription', () => {
    it('지원하지 않으면 null', async () => {
      removePushEnv()
      const mod = await loadModule('key')
      expect(await mod.getExistingPushSubscription()).toBeNull()
    })

    it('registration 이 없으면 null', async () => {
      installPushCapableEnv({ registration: null })
      const mod = await loadModule('key')
      expect(await mod.getExistingPushSubscription()).toBeNull()
    })

    it('기존 구독을 반환한다', async () => {
      const sub = makeSubscription()
      installPushCapableEnv({ getSubscription: vi.fn(async () => sub) })
      const mod = await loadModule('key')
      expect(await mod.getExistingPushSubscription()).toBe(sub)
    })

    it('getSubscription 이 throw 하면 null', async () => {
      installPushCapableEnv({
        getSubscription: vi.fn(async () => {
          throw new Error('x')
        }),
      })
      const mod = await loadModule('key')
      expect(await mod.getExistingPushSubscription()).toBeNull()
    })
  })

  describe('unsubscribeFromDailyFortunePush', () => {
    it("구독이 없으면 'unsubscribed'", async () => {
      installPushCapableEnv({ getSubscription: vi.fn(async () => null) })
      const mod = await loadModule('key')
      const result = await mod.unsubscribeFromDailyFortunePush()
      expect(result.status).toBe('unsubscribed')
    })

    it("서버 삭제 + 로컬 해제 성공이면 'unsubscribed'", async () => {
      const sub = makeSubscription()
      installPushCapableEnv({ getSubscription: vi.fn(async () => sub) })
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true })

      const mod = await loadModule('key')
      const result = await mod.unsubscribeFromDailyFortunePush()

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/me/push-subscription',
        expect.objectContaining({ method: 'DELETE' })
      )
      expect(sub.unsubscribe).toHaveBeenCalled()
      expect(result.status).toBe('unsubscribed')
    })

    it('서버 삭제가 실패해도 로컬 해제는 진행한다', async () => {
      const sub = makeSubscription()
      installPushCapableEnv({ getSubscription: vi.fn(async () => sub) })
      ;(global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('net'))

      const mod = await loadModule('key')
      const result = await mod.unsubscribeFromDailyFortunePush()

      expect(sub.unsubscribe).toHaveBeenCalled()
      expect(result.status).toBe('unsubscribed')
    })

    it("로컬 unsubscribe 가 throw 하면 'error'", async () => {
      const sub = makeSubscription()
      sub.unsubscribe = vi.fn(async () => {
        throw new Error('cannot unsubscribe')
      })
      installPushCapableEnv({ getSubscription: vi.fn(async () => sub) })
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true })

      const mod = await loadModule('key')
      const result = await mod.unsubscribeFromDailyFortunePush()
      expect(result.status).toBe('error')
    })
  })
})
