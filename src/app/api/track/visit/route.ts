/**
 * Anonymous Visit Beacon
 *
 * POST /api/track/visit  { path, referrer }
 *
 * 비로그인 방문자까지 포함한 1st-party 트래픽 로그. 클라이언트(VisitorBeacon)가
 * 페이지 전환마다 호출한다. visitorId 는 "일별 회전 해시"
 * (sha256(UTC날짜 + ip + userAgent + salt)) — 원본 IP/UA 를 저장하지 않고
 * 같은 날 같은 방문자만 묶을 수 있어 개인 식별 불가 + 쿠키 불필요.
 * 동의 배너와 무관한 익명 집계.
 */

import { NextRequest } from 'next/server'
import { createHash } from 'crypto'
import { z } from 'zod'
import {
  withApiMiddleware,
  createSimpleGuard,
  apiSuccess,
  apiError,
  ErrorCodes,
  type ApiContext,
} from '@/lib/api/middleware'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

// 비콘 바디 — { path?, referrer? } 둘 다 선택. 핸들러가 sanitizePath /
// referrerHost 로 한 번 더 정제하므로 여기선 타입만 검증하고, 형식이 어긋나면
// 조용히 skip(200) 으로 흡수한다(기존 best-effort 동작 유지).
const visitBeaconSchema = z
  .object({
    path: z.string().optional(),
    referrer: z.string().optional(),
  })
  .partial()

const SALT = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || 'destinypal-pageview-salt'

// 일별 회전 익명 해시 — 날짜가 바뀌면 같은 사람도 다른 해시가 된다.
function dailyVisitorHash(ip: string, userAgent: string): string {
  const dayUtc = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  return createHash('sha256')
    .update(`${dayUtc}|${ip}|${userAgent}|${SALT}`)
    .digest('hex')
    .slice(0, 32)
}

function coarseDevice(ua: string): string {
  const s = ua.toLowerCase()
  if (/bot|crawl|spider|slurp|bingpreview|facebookexternalhit/.test(s)) return 'bot'
  if (/ipad|tablet|kindle|playbook/.test(s)) return 'tablet'
  if (/mobi|iphone|android.*mobile|phone/.test(s)) return 'mobile'
  return 'desktop'
}

// pathname 만 보관 — 쿼리스트링/해시 제거, 길이 제한. /api·/admin·정적 자원 제외.
function sanitizePath(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw.startsWith('/')) return null
  const path = raw.split('?')[0].split('#')[0].slice(0, 200)
  if (path.startsWith('/api/') || path.startsWith('/admin')) return null
  if (/\.(png|jpg|jpeg|svg|ico|css|js|map|woff2?|txt|xml|json)$/i.test(path)) return null
  return path
}

function referrerHost(raw: unknown, selfHost: string | null): string | null {
  if (typeof raw !== 'string' || !raw) return null
  try {
    const host = new URL(raw).hostname
    if (selfHost && host === selfHost) return null // 내부 이동은 외부 유입 아님
    return host.slice(0, 120)
  } catch {
    return null
  }
}

export const POST = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    try {
      const rawBody = await req.json().catch(() => ({}))
      const parsed = visitBeaconSchema.safeParse(rawBody)
      // 형식 불일치(예: path 가 숫자)도 사용자 페이지에 영향 주면 안 되므로
      // 422 대신 skip(200) 으로 흡수 — 기존 best-effort 비콘 동작 유지.
      if (!parsed.success) return apiSuccess({ skipped: true } as Record<string, unknown>)
      const body = parsed.data
      const path = sanitizePath(body.path)
      if (!path) return apiSuccess({ skipped: true } as Record<string, unknown>)

      const ua = req.headers.get('user-agent') || ''
      const device = coarseDevice(ua)
      if (device === 'bot') return apiSuccess({ skipped: true } as Record<string, unknown>)

      const visitorId = dailyVisitorHash(context.ip || 'unknown', ua)
      const country = req.headers.get('x-vercel-ip-country') || null
      const selfHost = (() => {
        try {
          return new URL(req.url).hostname
        } catch {
          return null
        }
      })()

      // 트래킹은 best-effort. DB 쓰기 실패(예: 배포 직후 PageView 테이블 부재)
      // 해도 사용자 페이지에 영향 주면 안 되므로 삼키고 200 으로 응답한다.
      try {
        await prisma.pageView.create({
          data: {
            visitorId,
            path,
            referrerHost: referrerHost(body.referrer, selfHost),
            isLoggedIn: Boolean(context.userId),
            userId: context.userId ?? null,
            country: country ? country.slice(0, 8) : null,
            device,
          },
        })
      } catch (dbErr) {
        logger.warn('[track/visit] db write skipped', {
          code: (dbErr as { code?: string })?.code,
        })
        return apiSuccess({ skipped: true } as Record<string, unknown>)
      }

      return apiSuccess({ ok: true } as Record<string, unknown>)
    } catch (err) {
      logger.warn('[track/visit] failed', { err })
      return apiError(ErrorCodes.INTERNAL_ERROR, 'track_failed')
    }
  },
  createSimpleGuard({ route: '/api/track/visit', limit: 240, windowSeconds: 60 })
)
