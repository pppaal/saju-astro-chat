import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const body = await req.json()
  return NextResponse.json({ ok: true, data: body })
}

// 또는 다른 메서드들 예시로 추가 가능:
export async function GET() {
  return NextResponse.json({ message: 'Dream API alive!' })
}