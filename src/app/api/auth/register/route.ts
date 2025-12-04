import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, name } = body || {};
    if (!email || !password) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing?.passwordHash) {
      return NextResponse.json({ error: "user_exists" }, { status: 409 });
    }

    const hash = await bcrypt.hash(password, 10);
    await prisma.user.upsert({
      where: { email },
      create: { email, name, passwordHash: hash },
      update: { name: name ?? existing?.name, passwordHash: hash },
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[register] error", err);
    return NextResponse.json({ error: err.message ?? "server_error" }, { status: 500 });
  }
}
