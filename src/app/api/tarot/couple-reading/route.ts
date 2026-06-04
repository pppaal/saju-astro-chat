// 커플 타로 비활성화 — 현재 미사용 기능. GET/POST/DELETE 모두 404 로 응답한다.
// 원본 핸들러(크레딧 차감·공유 리딩 생성·목록·삭제)는 git 이력에 보존되어
// 있으니 재활성화 시 복원하면 된다. 프론트(/tarot/couple)도 함께 redirect 됨.
import { NextResponse } from 'next/server'

function disabled(): NextResponse {
  return NextResponse.json({ error: 'couple_tarot_disabled' }, { status: 404 })
}

export const GET = disabled
export const POST = disabled
export const DELETE = disabled
