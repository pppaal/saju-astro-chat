// /api/cron/keyday-push — "오늘의 큰 날" 개인화 푸시.
//
// 구독자 중 본명(생년월일+시간+좌표+tz)이 완비된 사람만 대상으로, 캘린더
// 엔진으로 오늘이 그 사람의 큰 날인지 판정해(buildKeyDayPayload) 해당될 때만
// 보낸다. 엔진 빌드는 CPU 비용이 크므로 동시성 제한 + 동일 본명 1회 계산 +
// 처리 상한으로 cron 시간을 가둔다.
//
// 본명은 웹 캘린더(loadTierData.loadSessionBirth)와 같은 profileToCalendarBirth 로
// 만든다 — 시간 미상 프로필은 정오 앵커 + birthTimeUnknown(삼주·placeUnreliable)이라
// 푸시와 웹이 같은 본명·같은 birthKey 를 본다(엔진 감사 F1).
//
// 보안은 다른 cron 과 동일(withCronAuth): IP 레이트리밋 → timing-safe CRON_SECRET.
// Vercel cron: 매일 22:10 UTC (= 한국 아침 07:10 KST, 데일리 운세 직후).

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { withCronAuth } from '@/lib/api/middleware/cronGuard'
import { sendPushToTargets, type PushPayload, type PushTarget } from '@/lib/push/sender'
import { buildKeyDayPayload, type KeyDayBirth } from '@/lib/push/keyDay'
import { profileToCalendarBirth } from '@/lib/calendar-engine/profileBirth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

// 한 번에 엔진을 돌릴 동시 수 — Swiss Ephemeris 가 CPU 바운드라 작게.
const CONCURRENCY = 3
// cron 시간을 가두기 위한 처리 상한(본명 기준). 넘으면 다음 날 처리.
const MAX_BIRTHS = 400

async function handle(): Promise<NextResponse> {
  // 요청 시각 — cron 경계에서 한 번 읽어 모든 본명의 '오늘' 판정에 주입한다.
  const now = new Date()
  const subs = await prisma.pushSubscription.findMany({
    select: {
      id: true,
      endpoint: true,
      p256dh: true,
      auth: true,
      failCount: true,
      locale: true,
      user: {
        select: {
          profile: {
            select: {
              birthDate: true,
              birthTime: true,
              birthTimeUnknown: true,
              gender: true,
              latitude: true,
              longitude: true,
              tzId: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  // 본명 완비 구독만(웹 캘린더와 같은 규칙), 그리고 동일 본명은 한 번만 계산하도록 그룹화.
  type Sub = (typeof subs)[number]
  const birthOf = new Map<string, KeyDayBirth>()
  const complete: Sub[] = []
  for (const s of subs) {
    const birth = profileToCalendarBirth(s.user?.profile)
    if (!birth) continue
    birthOf.set(s.id, birth)
    complete.push(s)
  }

  // 해석된 본명(정오 앵커·미상 플래그 포함) 기준 그룹 키 — 같은 원시 시각이라도
  // 미상 여부가 다르면 다른 본명이다.
  const groupKey = (b: KeyDayBirth) =>
    `${b.birthDate}|${b.birthTime}|${b.latitude}|${b.longitude}|${b.timeZone}|${b.gender}|${b.birthTimeUnknown ? 'tu' : ''}`

  // 본명 → 그 본명을 쓰는 구독들. (한 사람 여러 기기)
  const byBirth = new Map<string, Sub[]>()
  for (const s of complete) {
    const k = groupKey(birthOf.get(s.id)!)
    const arr = byBirth.get(k)
    if (arr) arr.push(s)
    else byBirth.set(k, [s])
  }

  const births = [...byBirth.entries()].slice(0, MAX_BIRTHS)

  // 본명별로 payload(ko/en) 를 계산 — 동시성 제한.
  const payloadBySubId = new Map<string, PushPayload>()
  let computed = 0
  for (let i = 0; i < births.length; i += CONCURRENCY) {
    const chunk = births.slice(i, i + CONCURRENCY)
    await Promise.all(
      chunk.map(async ([, group]) => {
        const birth = birthOf.get(group[0].id)!
        // 로케일이 섞일 수 있어 ko/en 각각 필요 시 계산(보통 한 종류).
        const wantKo = group.some((g) => g.locale !== 'en')
        const wantEn = group.some((g) => g.locale === 'en')
        try {
          const [koPayload, enPayload] = await Promise.all([
            wantKo ? buildKeyDayPayload(birth, 'ko', now) : Promise.resolve(null),
            wantEn ? buildKeyDayPayload(birth, 'en', now) : Promise.resolve(null),
          ])
          computed += 1
          for (const g of group) {
            const payload = g.locale === 'en' ? enPayload : koPayload
            if (payload) payloadBySubId.set(g.id, payload)
          }
        } catch (err) {
          logger.warn('[Cron keyday-push] build failed for a birth — skipping', err)
        }
      })
    )
  }

  const targets: PushTarget[] = complete.map((s) => ({
    id: s.id,
    endpoint: s.endpoint,
    p256dh: s.p256dh,
    auth: s.auth,
    failCount: s.failCount,
  }))

  const summary = await sendPushToTargets(targets, (t) => payloadBySubId.get(t.id) ?? null, {
    ttlSeconds: 12 * 60 * 60,
    label: 'keyday',
  })

  logger.warn('[Cron keyday-push] completed', {
    ...summary,
    births: births.length,
    computed,
    matched: payloadBySubId.size,
  })
  return NextResponse.json({ success: true, ...summary, matched: payloadBySubId.size })
}

export const GET = withCronAuth('keyday-push', handle)
export const POST = GET
