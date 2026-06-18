/**
 * 운영(ops) 알림 팬아웃 — 운영자에게 한 건의 알림을 여러 채널로 보낸다.
 *
 * 채널:
 *   1. 이메일 (Resend) — OPS_REPORT_RECIPIENTS 또는 ADMIN_EMAILS 수신자.
 *   2. 인커밍 웹훅 (Slack / Discord) — OPS_WEBHOOK_URL 이 있으면 텍스트 전송.
 *      Slack 과 Discord 둘 다 `{ "text": ... }` / `{ "content": ... }` 를
 *      받으므로 두 키를 함께 보내 어느 쪽이든 동작하게 한다.
 *
 * 모든 채널이 미설정이면 조용히 no-op (throw 금지). cron 라우트는 반환된
 * 요약(summary)을 그대로 JSON 으로 돌려 운영자가 무엇이 발송됐는지 본다.
 */

import { logger } from '@/lib/logger'
import { sendEmail, resolveOpsRecipients } from '@/lib/notify/email'

function readEnv(name: string): string | null {
  const value = process.env[name]
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed || trimmed.toLowerCase() === 'replace_me') return null
  return trimmed
}

export interface OpsNotifyInput {
  subject: string
  html?: string
  /** 웹훅·이메일 폴백용 평문. 미설정 시 subject 사용. */
  text?: string
}

export interface OpsNotifyResult {
  email: { attempted: boolean; sent: boolean; recipients: number; reason?: string }
  webhook: { attempted: boolean; sent: boolean }
}

async function postWebhook(url: string, text: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      // Slack=text, Discord=content — 둘 다 넣어 한쪽이 무시해도 동작.
      body: JSON.stringify({ text, content: text }),
    })
    if (!res.ok) {
      logger.error('[notify/ops] webhook non-2xx', { status: res.status })
      return false
    }
    return true
  } catch (err) {
    logger.error('[notify/ops] webhook threw', err)
    return false
  }
}

/** 운영 알림을 가용한 모든 채널로 발송. 미설정/실패해도 throw 하지 않는다. */
export async function notifyOps(input: OpsNotifyInput): Promise<OpsNotifyResult> {
  const text = input.text ?? input.subject
  const recipients = resolveOpsRecipients()
  const webhookUrl = readEnv('OPS_WEBHOOK_URL')

  const result: OpsNotifyResult = {
    email: { attempted: recipients.length > 0, sent: false, recipients: recipients.length },
    webhook: { attempted: Boolean(webhookUrl), sent: false },
  }

  // 두 채널 독립 — 하나가 실패해도 다른 하나는 계속 시도.
  const tasks: Promise<void>[] = []

  if (recipients.length > 0) {
    tasks.push(
      sendEmail({ to: recipients, subject: input.subject, html: input.html, text }).then((r) => {
        result.email.sent = r.sent
        if (!r.sent) result.email.reason = r.reason
      })
    )
  }

  if (webhookUrl) {
    tasks.push(
      postWebhook(webhookUrl, text).then((ok) => {
        result.webhook.sent = ok
      })
    )
  }

  await Promise.all(tasks)

  if (!result.email.attempted && !result.webhook.attempted) {
    logger.warn('[notify/ops] no channel configured — ops alert dropped', {
      subject: input.subject,
    })
  }

  return result
}
