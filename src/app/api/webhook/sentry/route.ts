// src/app/api/webhook/sentry/route.ts
//
// Sentry 웹훅 → GitHub 이슈 자동생성. 라벨이 붙은 이슈를 Claude Code(web)가
// 받아 바로 고칠 수 있게 하는 "에러 자동수정" 루프의 진입점.
//
// 보안: raw body 를 Client Secret 으로 HMAC 검증(skipCsrf — 머신 콜러).
// 멱등: 같은 Sentry 이슈는 한 번만 GitHub 이슈를 만든다(Redis dedupe).
// 게이트: 시크릿/토큰 미설정이면 조용히 비활성(200, skipped) — Sentry 재시도
// 폭주를 막기 위해 4xx/5xx 대신 200 으로 응답.

import { NextRequest, NextResponse } from 'next/server'
import { withApiMiddleware } from '@/lib/api/middleware'
import { logger } from '@/lib/logger'
import { recordCounter } from '@/lib/metrics/index'
import { cacheGet, cacheSet } from '@/lib/cache/redis-cache'
import {
  verifySentrySignature,
  sentryClientSecret,
  parseSentryIssue,
  buildIssueBody,
} from '@/lib/ops/sentryWebhook'
import { createGithubIssue, isGithubAutofixConfigured } from '@/lib/ops/githubIssue'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// 같은 Sentry 이슈로 GitHub 이슈를 한 번만 — 7일 dedupe (재알림이 반복돼도
// 새 이슈를 또 만들지 않는다). 처리 완료 후 마킹.
const DEDUPE_TTL_SECONDS = 7 * 24 * 60 * 60
const dedupeKey = (id: string) => `autofix:sentry:${id}`

export const POST = withApiMiddleware(
  async (request: NextRequest) => {
    // 미설정이면 조용히 비활성 — Sentry 가 재시도하지 않게 200.
    if (!sentryClientSecret() || !isGithubAutofixConfigured()) {
      return NextResponse.json({ ok: true, skipped: 'not_configured' })
    }

    const rawBody = await request.text()
    const signature = request.headers.get('sentry-hook-signature')
    if (!verifySentrySignature(rawBody, signature)) {
      recordCounter('autofix.sentry.auth_error', 1)
      // 서명 불일치는 진짜 거부 — 401.
      return NextResponse.json({ error: 'invalid_signature' }, { status: 401 })
    }

    let payload: unknown
    try {
      payload = JSON.parse(rawBody)
    } catch {
      return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
    }

    const action = String((payload as { action?: unknown })?.action ?? '')
    const summary = parseSentryIssue(payload)
    if (!summary) {
      // 처리할 이슈가 없는 훅(예: 설치/검증 핑) — 정상 200.
      return NextResponse.json({ ok: true, skipped: 'no_issue' })
    }

    // 멱등 — 이미 이슈를 만들었으면 다시 만들지 않는다.
    const key = dedupeKey(summary.dedupeId)
    if (await cacheGet<string>(key)) {
      return NextResponse.json({ ok: true, skipped: 'duplicate' })
    }

    try {
      const issue = await createGithubIssue({
        title: `[Sentry] ${summary.title}`,
        body: buildIssueBody(summary, action),
      })
      // 만든 직후(또는 미설정 null) dedupe 마킹 — 같은 이슈 재진입 차단.
      await cacheSet(key, issue ? String(issue.number) : 'skipped', DEDUPE_TTL_SECONDS)
      recordCounter('autofix.sentry.issue_created', 1, { level: summary.level })
      logger.info('[autofix/sentry] processed', {
        dedupeId: summary.dedupeId,
        issue: issue?.number,
      })
      return NextResponse.json({ ok: true, issue: issue?.htmlUrl ?? null })
    } catch (error) {
      // GitHub 생성 실패는 throw → Sentry 가 재시도하도록 5xx. dedupe 는
      // 마킹하지 않아(위 try 안에서만 마킹) 재시도 때 다시 시도된다.
      logger.error('[autofix/sentry] github issue creation failed', { error })
      recordCounter('autofix.sentry.issue_error', 1)
      return NextResponse.json({ error: 'issue_create_failed' }, { status: 502 })
    }
  },
  { route: 'webhook/sentry', skipCsrf: true }
)
