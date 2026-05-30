import { NextRequest, NextResponse } from 'next/server'
import { cacheGet } from '@/lib/cache/redis-cache'
import { counselorTurnResultKey } from '../route'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * 끊긴 턴 복원 — 모바일에서 다른 앱 갔다 와 스트림이 끊겼을 때, 클라가
 * 이 엔드포인트를 turnId 로 폴링한다. 서버는 연결이 끊겨도 끝까지 생성해
 * 완성 답안을 캐시에 넣어두므로(realtime route 의 onComplete), 여기서 그
 * 완성본을 돌려준다. 아직 생성 중이면 ready=false.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const turnId = req.nextUrl.searchParams.get('turnId')?.slice(0, 80) || ''
  if (!turnId) {
    return NextResponse.json({ error: 'turnId_required' }, { status: 400 })
  }
  const content = await cacheGet<string>(counselorTurnResultKey(turnId))
  if (typeof content === 'string' && content.length > 0) {
    return NextResponse.json({ ready: true, content })
  }
  return NextResponse.json({ ready: false })
}
