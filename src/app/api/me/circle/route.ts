import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/authOptions"
import { prisma } from "@/lib/db/prisma"

// GET - List all saved people
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const people = await prisma.savedPerson.findMany({
      where: { userId: session.user.id },
      orderBy: [{ relation: "asc" }, { name: "asc" }],
    })

    return NextResponse.json({ people })
  } catch (error) {
    console.error("Error fetching circle:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Add a new person
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { name, relation, birthDate, birthTime, gender, birthCity, latitude, longitude, tzId, note } = body

    if (!name || !relation) {
      return NextResponse.json({ error: "Name and relation are required" }, { status: 400 })
    }

    const person = await prisma.savedPerson.create({
      data: {
        userId: session.user.id,
        name,
        relation,
        birthDate: birthDate || null,
        birthTime: birthTime || null,
        gender: gender || null,
        birthCity: birthCity || null,
        latitude: latitude != null ? latitude : null,
        longitude: longitude != null ? longitude : null,
        tzId: tzId || null,
        note: note || null,
      },
    })

    return NextResponse.json({ person })
  } catch (error) {
    console.error("Error adding person:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE - Remove a person
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 })
    }

    // Verify ownership
    const person = await prisma.savedPerson.findUnique({
      where: { id },
    })

    if (!person || person.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    await prisma.savedPerson.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting person:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
