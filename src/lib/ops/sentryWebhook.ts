// src/lib/ops/sentryWebhook.ts
//
// Sentry 웹훅(내부 인티그레이션) 검증 + 페이로드 → GitHub 이슈 본문 변환.
//
// 서명: Sentry 내부 인티그레이션은 raw body 를 Client Secret 으로 HMAC-SHA256
// 한 hex 를 'sentry-hook-signature' 헤더로 보낸다. SENTRY_CLIENT_SECRET 으로
// 타이밍-세이프 비교한다(미설정이면 검증 불가 → 호출부가 비활성 처리).

import { createHmac } from 'crypto'
import { timingSafeCompare } from '@/lib/security/timingSafe'

export function sentryClientSecret(): string | null {
  return (process.env.SENTRY_CLIENT_SECRET || '').trim() || null
}

/** raw body 와 헤더 서명을 Client Secret 으로 검증. */
export function verifySentrySignature(rawBody: string, signature: string | null): boolean {
  const secret = sentryClientSecret()
  if (!secret || !signature) return false
  const expected = createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex')
  return timingSafeCompare(signature, expected)
}

export interface SentryIssueSummary {
  /** 멱등 키 — 같은 Sentry 이슈로 GitHub 이슈를 한 번만 만들기 위함. */
  dedupeId: string
  title: string
  culprit: string
  level: string
  /** Sentry 콘솔 링크(있으면). */
  url: string
  shortId: string
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : ''
}

/**
 * Sentry 웹훅 페이로드에서 이슈 요약을 뽑는다. issue-alert(data.event)와
 * issue 훅(data.issue) 형태를 모두 관대하게 처리한다. 핵심 필드가 없으면 null.
 */
export function parseSentryIssue(payload: unknown): SentryIssueSummary | null {
  if (!payload || typeof payload !== 'object') return null
  const data = ((payload as Record<string, unknown>).data ?? {}) as Record<string, unknown>

  const issue = (data.issue ?? null) as Record<string, unknown> | null
  const event = (data.event ?? null) as Record<string, unknown> | null

  if (issue) {
    const id = str(issue.id) || str(issue.shortId)
    if (!id) return null
    const meta = (issue.metadata ?? {}) as Record<string, unknown>
    const title = str(issue.title) || str(meta.type) || str(meta.value) || 'Sentry issue'
    return {
      dedupeId: id,
      title,
      culprit: str(issue.culprit),
      level: str(issue.level) || 'error',
      url: str(issue.permalink) || str(issue.web_url),
      shortId: str(issue.shortId) || id,
    }
  }

  if (event) {
    const id = str(event.issue_id) || str(event.event_id)
    if (!id) return null
    const meta = (event.metadata ?? {}) as Record<string, unknown>
    const title = str(event.title) || str(meta.type) || str(meta.value) || 'Sentry event'
    return {
      dedupeId: id,
      title,
      culprit: str(event.culprit),
      level: str(event.level) || 'error',
      url: str(event.web_url) || str(event.issue_url),
      shortId: str(event.event_id).slice(0, 8) || id,
    }
  }

  return null
}

/** GitHub 이슈 본문 — Claude Code(web)가 바로 착수할 수 있게 핵심만 정리. */
export function buildIssueBody(s: SentryIssueSummary, action: string): string {
  // 조건부(없으면 생략) 줄은 null 로 두고 null 만 걸러, 의도한 빈 줄은 유지한다.
  const lines: Array<string | null> = [
    `**Sentry auto-filed issue** (action: \`${action || 'triggered'}\`)`,
    '',
    `- **Error:** ${s.title}`,
    s.culprit ? `- **Culprit:** \`${s.culprit}\`` : null,
    `- **Level:** ${s.level}`,
    s.shortId ? `- **Sentry ID:** ${s.shortId}` : null,
    s.url ? `- **Sentry link:** ${s.url}` : null,
    '',
    '---',
    '',
    'Investigate the root cause and propose a fix. Reproduce locally if possible,',
    'add a regression test, and keep the change minimal.',
  ]
  return lines.filter((l): l is string => l !== null).join('\n')
}
