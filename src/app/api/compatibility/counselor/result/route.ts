import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { cacheGet } from '@/lib/cache/redis-cache'
import { compatTurnResultKey } from '../route'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * 끊긴 턴 복원 — 모바일에서 다른 앱 갔다 와 스트림이 끊겼을 때, 클라가
 * 이 엔드포인트를 turnId 로 폴링한다. 서버는 연결이 끊겨도 끝까지 생성해
 * 완성 답안을 캐시에 넣어두므로(counselor route 의 onComplete), 여기서 그
 * 완성본을 돌려준다. 아직 생성 중이면 ready=false.
 *
 * 보안: 로그인 사용자만 조회 가능. 자기 userId 의 캐시 키로만 lookup
 * 하므로 turnId 를 알아도 다른 사용자 결과 못 본다. 게스트는 끊김 복구
 * 미지원 (counselor route 가 게스트 결과는 캐시에 저장 안 함).
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const turnId = req.nextUrl.searchParams.get('turnId')?.slice(0, 80) || ''
  if (!turnId) {
    return NextResponse.json({ error: 'turnId_required' }, { status: 400 })
  }
  const content = await cacheGet<string>(compatTurnResultKey(userId, turnId))
  if (typeof content === 'string' && content.length > 0) {
    return NextResponse.json({ ready: true, content })
  }
  return NextResponse.json({ ready: false })
}
