/**
 * 운명상담사 컨텍스트 워밍 — 진입 시 fire-and-forget 으로 호출.
 *
 * realtime 답변 경로와 *동일한* ensureCounselorContext 를 미리 돌려 본명(stable)
 * + 일진(daily) 컨텍스트를 캐시에 채운다. daily 캐시는 1일이라 워밍 없으면
 * "그날 첫 답변"마다 무거운 천체력 빌드가 답변 critical path 에서 돌아 느렸다.
 * 진입하자마자 워밍해 두면, 사용자가 질문을 보낼 즈음엔 캐시 hit → 첫 답변 빠름.
 *
 * 부수효과: Redis 캐시 쓰기뿐 (크레딧 차감·LLM 호출 없음). 실패해도 무해
 * (답변 경로가 다시 빌드하면 됨) → 항상 200 으로 조용히 응답.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth/session'
import { csrfGuard } from '@/lib/security/csrf'
import { rateLimit } from '@/lib/rateLimit'
import { logger } from '@/lib/logger'
import {
  ensureCounselorContext,
  type CounselorBirthInput,
} from '@/lib/destiny/counselorContextCache'
import { counselorWarmRequestSchema } from '@/lib/api/zodValidation'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const csrfError = csrfGuard(req.headers)
  if (csrfError) return csrfError

  const session = await getServerSession()
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 })

  const rl = await rateLimit(`counselor:warm:${userId}`, { limit: 12, windowSeconds: 60 })
  if (!rl.allowed) {
    return NextResponse.json({ ok: false, rateLimited: true }, { status: 429, headers: rl.headers })
  }

  let body: (CounselorBirthInput & { lang?: string }) | null
  try {
    body = (await req.json()) as CounselorBirthInput & { lang?: string }
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }
  if (!body?.birthDate) return NextResponse.json({ ok: false }, { status: 400 })
  // 코어(birthDate) 타입 위반만 422 — 누락은 위에서 기존대로 400.
  // passthrough 스키마라 클라가 싣는 부가 필드는 그대로 통과.
  const parsed = counselorWarmRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'validation_failed' }, { status: 422 })
  }

  // lang 도출은 realtime 라우트와 동일해야 한다 — body.lang 우선, 없으면 locale
  // 쿠키 폴백. 안 그러면 쿠키-EN 사용자는 warm 이 ko 로 빌드/키잉해 realtime(en)
  // 과 키가 어긋나 워밍이 통째로 빗나간다.
  const cookieLocale = req.cookies.get('locale')?.value
  const lang: 'ko' | 'en' =
    body.lang === 'en' || body.lang === 'ko' ? body.lang : cookieLocale === 'en' ? 'en' : 'ko'
  try {
    await ensureCounselorContext(body, userId, lang)
    return NextResponse.json({ ok: true })
  } catch (err) {
    logger.warn('[counselor/warm] failed', {
      err: err instanceof Error ? err.message : String(err),
    })
    // 워밍 실패는 무해 — 답변 경로가 다시 빌드한다.
    return NextResponse.json({ ok: false }, { status: 200 })
  }
}
