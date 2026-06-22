/**
 * 클라이언트 웹 푸시 구독 헬퍼 — "매일 아침 오늘의 운세" 옵트인.
 *
 * 흐름: 알림 권한 요청 → 서비스워커 registration.pushManager.subscribe
 * (applicationServerKey = NEXT_PUBLIC_VAPID_PUBLIC_KEY) → 서버 저장
 * (POST /api/me/push-subscription).
 *
 * 미지원(iOS 비설치 PWA / SW 없음 / 키 미설정)·권한 거부는 상태로
 * 반환만 하고 절대 throw 하지 않는다 — UI 는 상태에 따라 숨김/안내.
 */

export type PushSubscribeStatus =
  | 'subscribed'
  | 'unsubscribed'
  | 'denied'
  | 'unsupported'
  | 'not_configured'
  | 'error'

export interface PushSubscribeResult {
  status: PushSubscribeStatus
}

// 빌드 타임 인라인 — 미설정 빌드에서는 빈 문자열 → 옵트인 UI 숨김.
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''

export function isPushConfigured(): boolean {
  return VAPID_PUBLIC_KEY.length > 0 && VAPID_PUBLIC_KEY.toLowerCase() !== 'replace_me'
}

/** 브라우저가 웹 푸시를 지원하는가 (iOS Safari 는 홈 화면 설치 PWA 에서만). */
export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
  try {
    // next-pwa 가 등록한 SW 우선. 아직 등록 전이거나(첫 방문/이 페이지에서 누락)
    // 사용자가 SW 를 지운 경우엔 직접 등록한다 — getRegistration 만 믿으면
    // "지원 안 함"으로 오인된다(데스크톱 크롬에서도 빈 값 가능).
    let registration = await navigator.serviceWorker.getRegistration()
    if (!registration) {
      registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
    }
    // 등록 직후엔 active 가 아직 null 일 수 있다 — 활성화까지 대기(최대 10초).
    await Promise.race([
      navigator.serviceWorker.ready,
      new Promise((resolve) => setTimeout(resolve, 10_000)),
    ])
    return registration ?? (await navigator.serviceWorker.getRegistration()) ?? null
  } catch {
    return null
  }
}

/** 현재 브라우저의 기존 푸시 구독 (없으면 null). */
export async function getExistingPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null
  const registration = await getRegistration()
  if (!registration) return null
  try {
    return await registration.pushManager.getSubscription()
  } catch {
    return null
  }
}

/** 권한 요청 → 구독 → 서버 저장. */
export async function subscribeToDailyFortunePush(
  locale: 'ko' | 'en'
): Promise<PushSubscribeResult> {
  if (!isPushConfigured()) return { status: 'not_configured' }
  if (!isPushSupported()) return { status: 'unsupported' }

  let permission: NotificationPermission
  try {
    permission = await Notification.requestPermission()
  } catch {
    return { status: 'error' }
  }
  if (permission !== 'granted') return { status: 'denied' }

  const registration = await getRegistration()
  // 여기까지 왔으면 브라우저는 푸시를 지원한다(isPushSupported 통과). 등록 실패는
  // "지원 안 함"이 아니라 일시적 오류 — 새로고침 후 재시도가 맞다.
  if (!registration) return { status: 'error' }

  try {
    const subscription =
      (await registration.pushManager.getSubscription()) ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      }))

    const json = subscription.toJSON()
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
      return { status: 'error' }
    }

    const response = await fetch('/api/me/push-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
        locale,
      }),
    })
    if (!response.ok) return { status: 'error' }

    return { status: 'subscribed' }
  } catch {
    return { status: 'error' }
  }
}

/** 서버 구독 삭제 + 브라우저 구독 해제. */
export async function unsubscribeFromDailyFortunePush(): Promise<PushSubscribeResult> {
  const subscription = await getExistingPushSubscription()
  if (!subscription) return { status: 'unsubscribed' }

  try {
    await fetch('/api/me/push-subscription', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    })
  } catch {
    // 서버 삭제 실패해도 로컬 해제는 진행 — cron 이 410 으로 정리한다.
  }

  try {
    await subscription.unsubscribe()
  } catch {
    return { status: 'error' }
  }
  return { status: 'unsubscribed' }
}
