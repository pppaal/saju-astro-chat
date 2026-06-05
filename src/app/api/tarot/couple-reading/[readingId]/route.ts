// 커플 타로 상세 조회 비활성화 — 현재 미사용 기능. 404 로 응답.
// 원본 핸들러는 git 이력에 보존. 재활성화 시 복원.
import { NextResponse } from 'next/server'

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ error: 'couple_tarot_disabled' }, { status: 404 })
}
