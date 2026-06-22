// src/app/api/admin/automation-status/route.ts
//
// 자동화 통합 상태 — 각 자동화가 "지금 운영에서 켜졌는지"를 런타임 설정으로
// 판정해 한 번에 돌려준다. 비밀값 자체는 절대 노출하지 않고 boolean 만.
// /admin/automation 페이지가 이걸 표로 보여준다.

import { NextRequest } from 'next/server'
import {
  withApiMiddleware,
  createAdminGuard,
  apiSuccess,
  type ApiContext,
} from '@/lib/api/middleware'
import { prisma } from '@/lib/db/prisma'
import { getWebPush } from '@/lib/push/webPush'
import { isClaudeAvailable } from '@/lib/llm/claude'
import { configuredPlatforms } from '@/lib/social/publish'
import { isGithubAutofixConfigured } from '@/lib/ops/githubIssue'
import { sentryClientSecret } from '@/lib/ops/sentryWebhook'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type Health = 'on' | 'partial' | 'off'

interface AutomationStatus {
  id: string
  label: string
  kind: 'cron' | 'webhook' | 'manual'
  schedule?: string
  health: Health
  detail: string
}

export const GET = withApiMiddleware(
  async (_req: NextRequest, _context: ApiContext) => {
    const cronSecret = Boolean(process.env.CRON_SECRET)
    const vapid = getWebPush() !== null
    const claude = isClaudeAvailable()
    const platforms = configuredPlatforms() // [] | ['threads'] | ['instagram', ...]
    const githubAutofix = isGithubAutofixConfigured()
    const sentry = sentryClientSecret() !== null

    // 푸시 구독 수 — 0이면 보낼 대상이 없어 사실상 꺼진 것.
    const activeSubs = await prisma.pushSubscription.count({ where: { failCount: { lt: 5 } } })

    // 크론 게이트(공통): CRON_SECRET 없으면 모든 크론이 401 로 거부된다.
    const cronGate = (extra: boolean, onDetail: string, offDetail: string): [Health, string] => {
      if (!cronSecret) return ['off', 'CRON_SECRET 미설정 — 크론 자체가 실행 거부']
      if (!extra) return ['off', offDetail]
      return ['on', onDetail]
    }

    const pushHealth = (): [Health, string] => {
      if (!cronSecret) return ['off', 'CRON_SECRET 미설정 — 크론 거부']
      if (!vapid) return ['off', 'VAPID 키 미설정 — 발송 불가']
      if (activeSubs === 0) return ['partial', '설정 OK이나 활성 구독 0 — 보낼 대상 없음']
      return ['on', `발송 가능 · 활성 구독 ${activeSubs}개`]
    }

    const [pushH, pushD] = pushHealth()
    const [draftH, draftD] = cronGate(
      claude,
      '소셜 초안 자동 생성 중',
      'Claude(ANTHROPIC) 키 미설정 — 초안 생성 불가'
    )
    const [keydayH, keydayD] = pushHealth()
    const [winbackH, winbackD] = pushHealth()

    const automations: AutomationStatus[] = [
      {
        id: 'daily-fortune',
        label: '데일리 운세 푸시',
        kind: 'cron',
        schedule: '매일 07:00 KST',
        health: pushH,
        detail: pushD,
      },
      {
        id: 'keyday-push',
        label: '오늘의 큰 날 푸시',
        kind: 'cron',
        schedule: '매일 07:10 KST',
        health: keydayH,
        detail: keydayD,
      },
      {
        id: 'winback-push',
        label: '휴면 윈백 푸시',
        kind: 'cron',
        schedule: '매일 13:00 KST',
        health: winbackH,
        detail: winbackD,
      },
      {
        id: 'social-drafts',
        label: '소셜 초안 생성',
        kind: 'cron',
        schedule: '매일 06:00 KST',
        health: draftH,
        detail: draftD,
      },
      {
        id: 'social-publish',
        label: '소셜 자동 발행',
        kind: 'manual',
        health: platforms.length > 0 ? 'on' : 'off',
        detail:
          platforms.length > 0
            ? `발행 가능: ${platforms.join(', ')}`
            : 'THREADS_*/IG_* 키 미설정 — 복사→수동 게시만',
      },
      {
        id: 'anomaly-check',
        label: '이상징후 자동 경보',
        kind: 'cron',
        schedule: '매시간',
        health: !cronSecret ? 'off' : githubAutofix ? 'on' : 'partial',
        detail: !cronSecret
          ? 'CRON_SECRET 미설정 — 크론 거부'
          : githubAutofix
            ? '감지 + GitHub 이슈 생성'
            : '감지·로그만 (GitHub 키 없어 이슈 미생성)',
      },
      {
        id: 'error-autofix',
        label: '에러 → GitHub 이슈',
        kind: 'webhook',
        health: sentry && githubAutofix ? 'on' : sentry || githubAutofix ? 'partial' : 'off',
        detail:
          sentry && githubAutofix
            ? 'Sentry 웹훅 → 이슈 자동 생성'
            : !sentry && !githubAutofix
              ? 'SENTRY_CLIENT_SECRET + AUTOFIX_GITHUB_* 미설정'
              : !sentry
                ? 'SENTRY_CLIENT_SECRET 미설정'
                : 'AUTOFIX_GITHUB_* 미설정',
      },
      {
        id: 'reset-credits',
        label: '크레딧 리셋·만료',
        kind: 'cron',
        schedule: '매일 00:00 KST',
        health: cronSecret ? 'on' : 'off',
        detail: cronSecret ? '무료 리셋 + 보너스 만료 처리' : 'CRON_SECRET 미설정 — 크론 거부',
      },
      {
        id: 'reconcile',
        label: '결제·활동 재정합',
        kind: 'cron',
        schedule: '매일 02:00 KST',
        health: cronSecret ? 'on' : 'off',
        detail: cronSecret ? 'Stripe·크레딧 정합성 점검' : 'CRON_SECRET 미설정 — 크론 거부',
      },
    ]

    return apiSuccess({
      gates: {
        cronSecret,
        vapid,
        claude,
        socialPlatforms: platforms,
        githubAutofix,
        sentry,
        activeSubscriptions: activeSubs,
      },
      automations,
    })
  },
  createAdminGuard({ route: 'admin/automation-status' })
)
