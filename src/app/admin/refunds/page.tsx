import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { isAdminEmail } from "@/lib/auth/admin";
import RefundClient from "./RefundClient";

export default async function RefundsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent("/admin/refunds")}`);
  }
  if (!isAdminEmail(session.user.email)) {
    notFound();
  }

  return <RefundClient adminEmail={session.user.email} />;
}
