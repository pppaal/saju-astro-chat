"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { buildSignInUrl } from "@/lib/auth/signInUrl";

type AuthGateProps = {
  children: ReactNode;
  title?: string;
  description?: string;
  ctaLabel?: string;
  callbackUrl?: string;
  fallback?: ReactNode;
  loadingFallback?: ReactNode;
  statusOverride?: "loading" | "authenticated" | "unauthenticated";
  className?: string;
};

export default function AuthGate({
  children,
  title = "Sign in required",
  description = "Please sign in to continue.",
  ctaLabel = "Sign in",
  callbackUrl,
  fallback,
  loadingFallback,
  statusOverride,
  className,
}: AuthGateProps) {
  const { status } = useSession();
  const resolvedStatus = statusOverride ?? status;
  const signInUrl = buildSignInUrl(callbackUrl);

  if (resolvedStatus === "loading") {
    return loadingFallback ?? null;
  }

  if (resolvedStatus === "unauthenticated") {
    if (fallback) return <>{fallback}</>;
    return (
      <div className={className}>
        <h2>{title}</h2>
        <p>{description}</p>
        <Link href={signInUrl}>{ctaLabel}</Link>
      </div>
    );
  }

  return <>{children}</>;
}
