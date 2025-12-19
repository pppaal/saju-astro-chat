import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import { generateReferralCode, linkReferrer } from "@/lib/referral";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, name, referralCode } = body || {};
    if (!email || !password) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing?.passwordHash) {
      return NextResponse.json({ error: "user_exists" }, { status: 409 });
    }

    const hash = await bcrypt.hash(password, 10);
    const newUserReferralCode = generateReferralCode();

    const user = await prisma.user.upsert({
      where: { email },
      create: {
        email,
        name,
        passwordHash: hash,
        referralCode: newUserReferralCode,
      },
      update: { name: name ?? existing?.name, passwordHash: hash },
    });

    // 추천 코드가 있으면 추천인 연결
    if (referralCode && user.id) {
      await linkReferrer(user.id, referralCode);
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[register] error", err);
    return NextResponse.json({ error: err.message ?? "server_error" }, { status: 500 });
  }
}
