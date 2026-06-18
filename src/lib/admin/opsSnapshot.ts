/**
 * 운영 다이제스트 스냅샷 — "프로젝트가 알아서 도는지" 한 장 요약.
 *
 * /api/admin/overview 와 /api/admin/anomalies 가 화면에서 보여주는 핵심
 * 숫자들을 cron 에서도 그대로 모아 이메일/웹훅으로 밀어주기 위한 모듈.
 *   - collectOpsSnapshot(now): DB 집계 (impure) — overview/anomalies 와 동일
 *     기준(realUserWhere, 실결제 stripePaymentId, tarot+counselor) 을 쓴다.
 *   - formatOpsDigest(snapshot, opts): 순수 포맷터 — 테스트 가능. subject/
 *     html/text 를 만든다.
 *
 * 이상징후 임계값은 env(OPS_ANOMALY_*) 로 조정. 초과 행에 flagged=true 를
 * 달아 다이제스트가 강조한다.
 */

import { prisma } from '@/lib/db/prisma'
import { realUserWhere } from '@/lib/admin/realUser'

export type OpsPeriod = 'daily' | 'weekly'

interface AnomalyRow {
  userId: string
  email: string | null
  name: string | null
  amount: number
  flagged: boolean
}

export interface OpsSnapshot {
  generatedAt: string
  period: OpsPeriod
  windowDays: number
  users: {
    total: number
    today: number
    last7d: number
    last30d: number
    activeToday: number
    paying: number
  }
  readings: { total: number; today: number }
  purchases: { total: number; today: number; last7d: number; last30d: number }
  credits: { outstanding: number }
  anomalies: {
    windowDays: number
    consumeThreshold: number
    grantThreshold: number
    topConsumers: AnomalyRow[]
    topGranted: AnomalyRow[]
    flaggedCount: number
  }
}

function readIntEnv(name: string, fallback: number): number {
  const raw = process.env[name]
  if (!raw) return fallback
  const n = Number.parseInt(raw.trim(), 10)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

const TOP_N = 10

async function anomalyEmailMap(
  userIds: string[]
): Promise<Map<string, { email: string | null; name: string | null }>> {
  if (userIds.length === 0) return new Map()
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, email: true, name: true },
  })
  return new Map(users.map((u) => [u.id, { email: u.email, name: u.name }]))
}

/**
 * 운영 스냅샷 수집. now 주입(기본 new Date())으로 테스트가 시점을 고정한다.
 */
export async function collectOpsSnapshot(
  period: OpsPeriod = 'daily',
  now: Date = new Date()
): Promise<OpsSnapshot> {
  const windowDays = period === 'weekly' ? 7 : 1
  const startOfToday = new Date(now)
  startOfToday.setHours(0, 0, 0, 0)
  const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const anomalySince = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000)

  const consumeThreshold = readIntEnv('OPS_ANOMALY_CONSUME_THRESHOLD', 100)
  const grantThreshold = readIntEnv('OPS_ANOMALY_GRANT_THRESHOLD', 100)

  const realPurchaseWhere = { stripePaymentId: { not: null } } as const

  const [
    usersTotal,
    usersToday,
    users7d,
    users30d,
    readingsTotal,
    readingsToday,
    activeTodayIds,
    bonusOutstanding,
    purchaseCount,
    purchasesToday,
    purchases7d,
    purchases30d,
    payingUsers,
    consumeGroups,
    grantGroups,
  ] = await Promise.all([
    prisma.user.count({ where: realUserWhere }),
    prisma.user.count({ where: { AND: [realUserWhere, { createdAt: { gte: startOfToday } }] } }),
    prisma.user.count({ where: { AND: [realUserWhere, { createdAt: { gte: last7d } }] } }),
    prisma.user.count({ where: { AND: [realUserWhere, { createdAt: { gte: last30d } }] } }),
    Promise.all([prisma.tarotReading.count(), prisma.counselorChatSession.count()]).then(
      ([a, b]) => a + b
    ),
    Promise.all([
      prisma.tarotReading.count({ where: { createdAt: { gte: startOfToday } } }),
      prisma.counselorChatSession.count({ where: { createdAt: { gte: startOfToday } } }),
    ]).then(([a, b]) => a + b),
    Promise.all([
      prisma.tarotReading.groupBy({ by: ['userId'], where: { createdAt: { gte: startOfToday } } }),
      prisma.counselorChatSession.groupBy({
        by: ['userId'],
        where: { createdAt: { gte: startOfToday } },
      }),
    ]).then(([a, b]) => new Set([...a, ...b].map((r) => r.userId)).size),
    prisma.bonusCreditPurchase
      .aggregate({
        where: {
          stripePaymentId: { not: null },
          expired: false,
          expiresAt: { gt: now },
          remaining: { gt: 0 },
        },
        _sum: { remaining: true },
      })
      .then((r) => r._sum.remaining ?? 0),
    prisma.bonusCreditPurchase.count({ where: realPurchaseWhere }),
    prisma.bonusCreditPurchase.count({
      where: { ...realPurchaseWhere, createdAt: { gte: startOfToday } },
    }),
    prisma.bonusCreditPurchase.count({
      where: { ...realPurchaseWhere, createdAt: { gte: last7d } },
    }),
    prisma.bonusCreditPurchase.count({
      where: { ...realPurchaseWhere, createdAt: { gte: last30d } },
    }),
    prisma.bonusCreditPurchase
      .groupBy({ by: ['userId'], where: realPurchaseWhere })
      .then((rows) => rows.length),
    // 이상징후(anomalies 라우트와 동일 로직): CONSUME 은 음수 합 → abs.
    prisma.creditTransaction.groupBy({
      by: ['userId'],
      where: { type: 'CONSUME', createdAt: { gte: anomalySince } },
      _sum: { amount: true },
    }),
    prisma.bonusCreditPurchase.groupBy({
      by: ['userId'],
      where: { stripePaymentId: null, createdAt: { gte: anomalySince } },
      _sum: { amount: true },
    }),
  ])

  const topConsumersRaw = consumeGroups
    .map((g) => ({ userId: g.userId, amount: Math.abs(g._sum.amount ?? 0) }))
    .filter((g) => g.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, TOP_N)

  const topGrantedRaw = grantGroups
    .map((g) => ({ userId: g.userId, amount: g._sum.amount ?? 0 }))
    .filter((g) => g.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, TOP_N)

  const ids = [
    ...new Set([...topConsumersRaw.map((c) => c.userId), ...topGrantedRaw.map((g) => g.userId)]),
  ]
  const users = await anomalyEmailMap(ids)

  const decorate = (rows: { userId: string; amount: number }[], threshold: number): AnomalyRow[] =>
    rows.map((r) => ({
      userId: r.userId,
      email: users.get(r.userId)?.email ?? null,
      name: users.get(r.userId)?.name ?? null,
      amount: r.amount,
      flagged: r.amount >= threshold,
    }))

  const topConsumers = decorate(topConsumersRaw, consumeThreshold)
  const topGranted = decorate(topGrantedRaw, grantThreshold)
  const flaggedCount =
    topConsumers.filter((r) => r.flagged).length + topGranted.filter((r) => r.flagged).length

  return {
    generatedAt: now.toISOString(),
    period,
    windowDays,
    users: {
      total: usersTotal,
      today: usersToday,
      last7d: users7d,
      last30d: users30d,
      activeToday: activeTodayIds,
      paying: payingUsers,
    },
    readings: { total: readingsTotal, today: readingsToday },
    purchases: {
      total: purchaseCount,
      today: purchasesToday,
      last7d: purchases7d,
      last30d: purchases30d,
    },
    credits: { outstanding: bonusOutstanding },
    anomalies: {
      windowDays,
      consumeThreshold,
      grantThreshold,
      topConsumers,
      topGranted,
      flaggedCount,
    },
  }
}

// ── 포맷팅 (순수) ───────────────────────────────────────────────────────────

export interface DigestOptions {
  locale?: 'ko' | 'en'
  /** 대시보드 딥링크용 베이스 URL (예: https://destinypal.com) */
  baseUrl?: string | null
}

function maskEmail(email: string | null): string {
  if (!email) return '(no email)'
  const [user, domain] = email.split('@')
  if (!domain) return email
  const head = user.slice(0, 2)
  return `${head}${'*'.repeat(Math.max(1, user.length - 2))}@${domain}`
}

export interface FormattedDigest {
  subject: string
  html: string
  text: string
}

/** 순수 포맷터 — 스냅샷을 이메일/웹훅용 subject/html/text 로 변환. */
export function formatOpsDigest(snapshot: OpsSnapshot, opts: DigestOptions = {}): FormattedDigest {
  const ko = (opts.locale ?? 'ko') === 'ko'
  const date = snapshot.generatedAt.slice(0, 10)
  const periodLabel =
    snapshot.period === 'weekly' ? (ko ? '주간' : 'Weekly') : ko ? '일간' : 'Daily'
  const flag = snapshot.anomalies.flaggedCount > 0 ? '🚨 ' : ''

  const subject = ko
    ? `${flag}[DestinyPal] ${periodLabel} 운영 리포트 · ${date}`
    : `${flag}[DestinyPal] ${periodLabel} ops report · ${date}`

  const L = ko
    ? {
        users: '회원',
        total: '전체',
        today: '오늘',
        d7: '7일',
        d30: '30일',
        active: '오늘 활성',
        paying: '결제 회원',
        readings: '이용(타로+상담)',
        purchases: '결제(크레딧팩)',
        outstanding: '미사용 크레딧(부채)',
        anomalies: '이상징후',
        consumers: '크레딧 과다 소비 상위',
        granted: '무료 크레딧 과다 수령 상위',
        none: '특이사항 없음',
        flagged: '임계 초과',
        window: '집계 구간',
      }
    : {
        users: 'Users',
        total: 'total',
        today: 'today',
        d7: '7d',
        d30: '30d',
        active: 'active today',
        paying: 'paying',
        readings: 'Usage (tarot+chat)',
        purchases: 'Purchases (credit packs)',
        outstanding: 'Outstanding credits (liability)',
        anomalies: 'Anomalies',
        consumers: 'Top credit consumers',
        granted: 'Top free-credit recipients',
        none: 'Nothing notable',
        flagged: 'over threshold',
        window: 'window',
      }

  const lines: string[] = []
  lines.push(subject.replace(flag, '').trim())
  lines.push('')
  lines.push(
    `▸ ${L.users}: ${L.total} ${snapshot.users.total} · ${L.today} +${snapshot.users.today} · ${L.d7} +${snapshot.users.last7d} · ${L.d30} +${snapshot.users.last30d}`
  )
  lines.push(`▸ ${L.active}: ${snapshot.users.activeToday} · ${L.paying}: ${snapshot.users.paying}`)
  lines.push(
    `▸ ${L.readings}: ${L.today} ${snapshot.readings.today} · ${L.total} ${snapshot.readings.total}`
  )
  lines.push(
    `▸ ${L.purchases}: ${L.today} ${snapshot.purchases.today} · ${L.d7} ${snapshot.purchases.last7d} · ${L.d30} ${snapshot.purchases.last30d} · ${L.total} ${snapshot.purchases.total}`
  )
  lines.push(`▸ ${L.outstanding}: ${snapshot.credits.outstanding}`)
  lines.push('')

  const renderAnomaly = (rows: AnomalyRow[]) =>
    rows.length === 0
      ? `   ${L.none}`
      : rows
          .map(
            (r) =>
              `   ${r.flagged ? '⚠️ ' : '   '}${maskEmail(r.email)} — ${r.amount}${r.flagged ? ` (${L.flagged})` : ''}`
          )
          .join('\n')

  lines.push(`▸ ${L.anomalies} (${L.window} ${snapshot.anomalies.windowDays}d):`)
  lines.push(`  ${L.consumers}:`)
  lines.push(renderAnomaly(snapshot.anomalies.topConsumers))
  lines.push(`  ${L.granted}:`)
  lines.push(renderAnomaly(snapshot.anomalies.topGranted))

  if (opts.baseUrl) {
    lines.push('')
    lines.push(`${opts.baseUrl.replace(/\/$/, '')}/admin/dashboard`)
  }

  const text = lines.join('\n')

  // HTML — 평문을 안전하게 escape 한 뒤 <pre> 로 감싼다 (값은 DB 유래라
  // 마스킹돼 있지만 그래도 escape).
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const html = `<div style="font-family:ui-monospace,Menlo,Consolas,monospace;font-size:13px;line-height:1.6"><pre style="white-space:pre-wrap;margin:0">${esc(text)}</pre></div>`

  return { subject, html, text }
}
