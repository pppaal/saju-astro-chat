import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";

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

export function isAdminEmail(email?: string | null) {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  return getAdminEmails().has(normalized);
}

export async function requireAdminSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  return isAdminEmail(session.user.email) ? session : null;
}
