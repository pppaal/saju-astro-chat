import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import { generateReferralCode, linkReferrer } from "@/lib/referral";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/request-ip";
import { enforceBodySize } from "@/lib/http";
import { sendWelcomeEmail } from "@/lib/email";
import { logger } from '@/lib/logger';
import { sanitizeError } from '@/lib/security/errorSanitizer';
import { parseRequestBody } from '@/lib/api/requestParser';

import { PATTERNS } from '@/lib/constants/api-limits';
import { LIMITS } from '@/lib/validation/patterns';
const EMAIL_RE = PATTERNS.EMAIL;
const MAX_NAME = LIMITS.NAME;
const MAX_REFERRAL = LIMITS.REFERRAL_CODE;
const MIN_PASSWORD = 8;
const MAX_PASSWORD = LIMITS.PASSWORD;
type RegisterBody = {
  email?: string;
  password?: string;
  name?: string;
  referralCode?: string;
};

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req.headers as Headers);
    const limit = await rateLimit(`register:${ip}`, { limit: 10, windowSeconds: 300 });
    if (!limit.allowed) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: limit.headers });
    }

    const oversized = enforceBodySize(req, 32 * 1024, limit.headers);
    if (oversized) {return oversized;}

    const body = await parseRequestBody<RegisterBody>(req, {
      context: 'User registration',
    });
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const name = typeof body?.name === "string" ? body.name.trim().slice(0, MAX_NAME) : undefined;
    const referralCode = typeof body?.referralCode === "string" ? body.referralCode.trim().slice(0, MAX_REFERRAL) : undefined;

    if (!email || !password) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400, headers: limit.headers });
    }
    if (!EMAIL_RE.test(email) || email.length > 254) {
      return NextResponse.json({ error: "invalid_email" }, { status: 400, headers: limit.headers });
    }
    if (password.length < MIN_PASSWORD || password.length > MAX_PASSWORD) {
      return NextResponse.json({ error: "invalid_password" }, { status: 400, headers: limit.headers });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing?.passwordHash) {
      return NextResponse.json({ error: "user_exists" }, { status: 409, headers: limit.headers });
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

    // 환영 이메일 발송 (fire and forget)
    sendWelcomeEmail(user.id, email, name || '', 'ko', newUserReferralCode).catch((err) => {
      logger.error('[register] Failed to send welcome email:', err);
    });

    return NextResponse.json({ ok: true }, { headers: limit.headers });
  } catch (err: unknown) {
    logger.error("[register] error", err);
    const sanitized = sanitizeError(err, 'authentication');
    return NextResponse.json(sanitized, { status: 500 });
  }
}
