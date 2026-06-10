export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { handlers } from '@/lib/auth/nextAuth'

// 구조분해 export(const { GET, POST } = handlers)는 docs:sync 의 라우트
// 메서드 스캐너가 인식하지 못해 명시적 개별 export 로 둔다.
export const GET = handlers.GET
export const POST = handlers.POST
