/**
 * 커스텀 서비스워커 — @ducanh2912/next-pwa 의 customWorkerSrc 기본 경로
 * (`worker/index.js`). 빌드 시 workbox SW 에 자동 import 된다.
 *
 * 웹 푸시("매일 아침 오늘의 운세 한 줄") 처리:
 *   - push: payload(JSON { title, body, url }) 파싱 → 알림 표시
 *   - notificationclick: 알림의 url(기본 /calendar) 열기 — 이미 열린
 *     탭이 있으면 focus, 없으면 새 창
 *
 * 발송: /api/cron/daily-fortune (web-push / VAPID)
 */

/* global self, clients */

const DEFAULT_NOTIFICATION_URL = '/calendar'

self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch {
    payload = { body: event.data ? event.data.text() : '' }
  }

  const title = payload.title || 'DestinyPal'
  const options = {
    body: payload.body || '',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-96x96.png',
    // 알림 종류별 tag — 같은 tag 만 서로 교체된다. payload.tag 가 없으면
    // (레거시 데일리 운세) 'daily-fortune' 으로 본다. 큰날/윈백/테스트가
    // 데일리 운세를 덮어쓰지 않도록 종류별로 분리.
    tag: payload.tag || 'daily-fortune',
    data: { url: payload.url || DEFAULT_NOTIFICATION_URL },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || DEFAULT_NOTIFICATION_URL

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      const target = new URL(url, self.location.origin).href
      for (const client of windowClients) {
        if (client.url === target && 'focus' in client) {
          return client.focus()
        }
      }
      // 열린 탭이 있으면 캘린더로 이동시키며 focus
      for (const client of windowClients) {
        if ('focus' in client && 'navigate' in client) {
          return client.navigate(target).then((c) => (c ? c.focus() : undefined))
        }
      }
      return clients.openWindow(target)
    })
  )
})
