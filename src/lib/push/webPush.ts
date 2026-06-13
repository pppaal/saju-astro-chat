/**
 * Web Push (VAPID) 서버 헬퍼 — `web-push` 래퍼.
 *
 * 환경변수(VAPID_PUBLIC_KEY 또는 NEXT_PUBLIC_VAPID_PUBLIC_KEY /
 * VAPID_PRIVATE_KEY / VAPID_SUBJECT)가 없으면 null 을 돌려준다 —
 * 절대 throw 하지 않아 빌드/기동이 깨지지 않는다. cron 라우트는
 * null 이면 503 'not_configured' 로 응답한다.
 *
 * 키 생성: `npx web-push generate-vapid-keys` (.env.example 참고)
 */

import webpush from 'web-push'

function readEnv(name: string): string | null {
  const value = process.env[name]
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed || trimmed.toLowerCase() === 'replace_me') return null
  return trimmed
}

interface WebPushConfig {
  publicKey: string
  privateKey: string
  subject: string
}

function getWebPushConfig(): WebPushConfig | null {
  // 서버 전용 키가 우선, 없으면 클라이언트와 공유하는 NEXT_PUBLIC 키.
  const publicKey = readEnv('VAPID_PUBLIC_KEY') ?? readEnv('NEXT_PUBLIC_VAPID_PUBLIC_KEY')
  const privateKey = readEnv('VAPID_PRIVATE_KEY')
  const subject = readEnv('VAPID_SUBJECT')
  if (!publicKey || !privateKey || !subject) return null
  if (!subject.startsWith('mailto:') && !subject.startsWith('https://')) return null
  return { publicKey, privateKey, subject }
}

/**
 * VAPID 설정이 완료된 web-push 모듈을 돌려준다. 미설정 시 null.
 * (전역 모듈 상태에 setVapidDetails 를 매 호출 적용 — 멱등이라 안전.)
 */
export function getWebPush(): typeof webpush | null {
  const config = getWebPushConfig()
  if (!config) return null
  webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey)
  return webpush
}
