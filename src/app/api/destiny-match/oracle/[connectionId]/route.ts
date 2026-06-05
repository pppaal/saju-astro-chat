// 데스티니매치 oracle 타로 비활성화 — 현재 미사용. destiny-match 자체가 이미
// 홈으로 redirect 되어 도달 불가였고 호출처도 없었다. 404 로 응답한다.
// 원본 핸들러(3장 관계 스프레드 + 길일 계산)와 oracle 라이브러리는 git 이력에
// 보존되어 있으니 재활성화 시 복원하면 된다.
import { NextResponse } from 'next/server'

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ error: 'oracle_disabled' }, { status: 404 })
}
