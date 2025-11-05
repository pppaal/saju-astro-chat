import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/authOptions"
export async function GET() {
const session = await getServerSession(authOptions)
const name = session?.user?.name || session?.user?.email || null
return NextResponse.json({ name })
}
