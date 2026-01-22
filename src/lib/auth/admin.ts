import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db/prisma";

function normalizeEmail(email?: string | null) {
  return (email || "").trim().toLowerCase();
}

function getAdminEmails(): Set<string> {
  const raw = process.env.ADMIN_EMAILS || "";
  const list = raw
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  return new Set(list);
}

// 🔒 이메일 기반 Admin 체크 (레거시, 마이그레이션 중)
export function isAdminEmail(email?: string | null) {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  return getAdminEmails().has(normalized);
}

// ✨ NEW: DB 기반 Role 체크 (권장 방식)
export async function isAdminUser(userId: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, email: true },
    });

    if (!user) return false;

    // DB role 우선 체크
    if (user.role === 'admin' || user.role === 'superadmin') {
      return true;
    }

    // 폴백: 환경 변수 기반 체크 (마이그레이션 기간 동안만)
    return isAdminEmail(user.email);
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

// ✨ NEW: Role과 권한 레벨 체크
export async function checkAdminRole(userId: string, requiredRole: 'admin' | 'superadmin' = 'admin'): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!user) return false;

  if (requiredRole === 'superadmin') {
    return user.role === 'superadmin';
  }

  return user.role === 'admin' || user.role === 'superadmin';
}

export async function requireAdminSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  // DB 기반 체크 사용
  const isAdmin = await isAdminUser(session.user.id);
  return isAdmin ? session : null;
}
