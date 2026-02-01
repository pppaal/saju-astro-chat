"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { buildSignInUrl } from "@/lib/auth/signInUrl";
import { useI18n } from "@/i18n/I18nProvider";

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
  title,
  description,
  ctaLabel,
  callbackUrl,
  fallback,
  loadingFallback,
  statusOverride,
  className,
}: AuthGateProps) {
  const { status } = useSession();
  const { t } = useI18n();
  const resolvedStatus = statusOverride ?? status;
  const signInUrl = buildSignInUrl(callbackUrl);

  const resolvedTitle = title ?? t("auth.signInRequired");
  const resolvedDesc = description ?? t("auth.signInDescription");
  const resolvedCta = ctaLabel ?? t("auth.signIn");

  if (resolvedStatus === "loading") {
    return loadingFallback ?? null;
  }

  if (resolvedStatus === "unauthenticated") {
    if (fallback) {return <>{fallback}</>;}
    return (
      <div className={className}>
        <h2>{resolvedTitle}</h2>
        <p>{resolvedDesc}</p>
        <Link href={signInUrl}>{resolvedCta}</Link>
      </div>
    );
  }

  return <>{children}</>;
}
