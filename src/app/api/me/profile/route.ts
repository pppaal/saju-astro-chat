import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/authOptions"
import { prisma } from "@/lib/db/prisma"

const isNonEmptyString = (val: unknown, max = 120) =>
  typeof val === "string" && val.trim().length > 0 && val.trim().length <= max

const isValidUrl = (val: unknown) => {
  if (typeof val !== "string" || !val.trim()) return false
  try {
    const url = new URL(val)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        birthDate: true,
        birthTime: true,
        gender: true,
        birthCity: true,
        tzId: true,
        createdAt: true,
        emailNotifications: true,
        preferences: {
          select: {
            preferredLanguage: true,
            notificationSettings: true,
            tonePreference: true,
            readingLength: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error("Error fetching profile:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const {
      name,
      image,
      emailNotifications,
      preferredLanguage,
      notificationSettings,
      tonePreference,
      readingLength,
    } = body || {}

    const data: any = {}
    if (isNonEmptyString(name, 64)) data.name = name.trim()
    if (typeof emailNotifications === "boolean") data.emailNotifications = emailNotifications
    if (image === null) {
      data.image = null
    } else if (isValidUrl(image)) {
      data.image = image.trim()
    }

    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data,
      select: { id: true },
    })

    // Upsert user preferences if any preference fields provided
    const hasPrefs =
      isNonEmptyString(preferredLanguage, 8) ||
      notificationSettings ||
      isNonEmptyString(tonePreference, 32) ||
      isNonEmptyString(readingLength, 32)

    if (hasPrefs) {
      await prisma.userPreferences.upsert({
        where: { userId: session.user.id },
        update: {
          ...(isNonEmptyString(preferredLanguage, 8) && { preferredLanguage: preferredLanguage.trim() }),
          ...(notificationSettings && { notificationSettings }),
          ...(isNonEmptyString(tonePreference, 32) && { tonePreference: tonePreference.trim() }),
          ...(isNonEmptyString(readingLength, 32) && { readingLength: readingLength.trim() }),
        },
        create: {
          userId: session.user.id,
          preferredLanguage: isNonEmptyString(preferredLanguage, 8) ? preferredLanguage.trim() : "en",
          notificationSettings: notificationSettings || null,
          tonePreference: isNonEmptyString(tonePreference, 32) ? tonePreference.trim() : "casual",
          readingLength: isNonEmptyString(readingLength, 32) ? readingLength.trim() : "medium",
        },
      })
    }

    return NextResponse.json({ success: true, userId: updated.id })
  } catch (error) {
    console.error("Error updating profile:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
