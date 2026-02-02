import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/authOptions"
import { HTTP_STATUS } from '@/lib/constants/http';

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    const name = session?.user?.name || session?.user?.email || null
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: HTTP_STATUS.UNAUTHORIZED })
    }
    return NextResponse.json({ name });
  } catch {
    // If decryption fails or secret is missing, return 401 instead of throwing
    return NextResponse.json({ error: "Unauthorized" }, { status: HTTP_STATUS.UNAUTHORIZED })
  }
}
