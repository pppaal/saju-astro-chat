/**
 * 이메일 발송 헬퍼 — Resend 래퍼.
 *
 * webPush 와 같은 철학: 환경변수(RESEND_API_KEY / EMAIL_FROM)가 없으면
 * 클라이언트를 만들지 않고 `{ sent: false, reason: 'not_configured' }` 를
 * 돌려준다 — 절대 throw 하지 않아 빌드/기동/cron 이 깨지지 않는다.
 *
 * 현재는 운영 알림(ops-report, 이상징후) 전용. 사용자 대상 대량 발송은 이
 * 레이어 위에 별도 동의/세그먼트 게이트를 두고 올린다.
 *
 * 발송 점검: `node scripts/send-test-email.mjs you@example.com`
 */

import { logger } from '@/lib/logger'

function readEnv(name: string): string | null {
  const value = process.env[name]
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed || trimmed.toLowerCase() === 'replace_me') return null
  return trimmed
}

export interface SendEmailInput {
  to: string | string[]
  subject: string
  html?: string
  text?: string
  /** 미설정 시 EMAIL_FROM 환경변수를 사용 */
  from?: string
}

export type SendEmailResult =
  | { sent: true; id: string | null }
  | { sent: false; reason: 'not_configured' | 'no_recipients' | 'error' }

function getConfig(): { apiKey: string; from: string } | null {
  // 현재 wired 된 provider 는 resend 뿐 (env: EMAIL_PROVIDER). 다른 값이면
  // 명시적으로 미설정 취급해 잘못된 키로 silent 실패하는 일을 막는다.
  const provider = (readEnv('EMAIL_PROVIDER') ?? 'resend').toLowerCase()
  if (provider !== 'resend') {
    logger.warn('[notify/email] EMAIL_PROVIDER not "resend" — email disabled', { provider })
    return null
  }
  const apiKey = readEnv('RESEND_API_KEY')
  const from = readEnv('EMAIL_FROM')
  if (!apiKey || !from) return null
  return { apiKey, from }
}

/** 운영 알림용 이메일 발송. 미설정/실패해도 throw 하지 않는다. */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const recipients = (Array.isArray(input.to) ? input.to : [input.to])
    .map((r) => r.trim())
    .filter(Boolean)
  if (recipients.length === 0) return { sent: false, reason: 'no_recipients' }

  const config = getConfig()
  if (!config) {
    logger.warn('[notify/email] not configured — skipping send', { subject: input.subject })
    return { sent: false, reason: 'not_configured' }
  }

  try {
    // 동적 import — resend 패키지를 미설정 환경/번들에서 강제로 끌어오지 않는다.
    const { Resend } = await import('resend')
    const resend = new Resend(config.apiKey)
    const { data, error } = await resend.emails.send({
      from: input.from ?? config.from,
      to: recipients,
      subject: input.subject,
      // resend 타입은 html|text 중 하나 이상을 요구 — 최소 text 보장.
      html: input.html,
      text: input.text ?? (input.html ? undefined : input.subject),
    } as Parameters<typeof resend.emails.send>[0])

    if (error) {
      logger.error('[notify/email] send failed', { error, subject: input.subject })
      return { sent: false, reason: 'error' }
    }
    return { sent: true, id: data?.id ?? null }
  } catch (err) {
    logger.error('[notify/email] send threw', err)
    return { sent: false, reason: 'error' }
  }
}

/** ADMIN_EMAILS / OPS_REPORT_RECIPIENTS 를 파싱해 중복 없는 수신자 목록 반환. */
export function resolveOpsRecipients(): string[] {
  // OPS_REPORT_RECIPIENTS 가 있으면 우선, 없으면 ADMIN_EMAILS 재사용.
  const raw = readEnv('OPS_REPORT_RECIPIENTS') ?? readEnv('ADMIN_EMAILS') ?? ''
  const list = raw
    .split(/[,\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.includes('@'))
  return [...new Set(list)]
}
