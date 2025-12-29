"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useI18n } from "@/i18n/I18nProvider";
import Link from "next/link";
import styles from "./CreditBadge.module.css";

interface CreditData {
  isLoggedIn: boolean;
  plan: string;
  credits: {
    monthly: number;
    used: number;
    bonus: number;
    remaining: number;
    total?: number;
  };
}

interface CreditBadgeProps {
  variant?: "default" | "compact" | "minimal";
  showPlan?: boolean;
  className?: string;
}

export default function CreditBadge({
  variant = "default",
  showPlan = false,
  className = "",
}: CreditBadgeProps) {
  const { data: session, status } = useSession();
  const { t } = useI18n();
  const [creditData, setCreditData] = useState<CreditData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchCredits = useCallback(async () => {
    if (status === "loading") return;

    if (!session?.user) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/me/credits");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setCreditData(data);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [session, status]);

  useEffect(() => {
    fetchCredits();
  }, [fetchCredits]);

  // Listen for credit updates (custom event)
  useEffect(() => {
    const handleCreditUpdate = () => {
      fetchCredits();
    };

    window.addEventListener("credit-update", handleCreditUpdate);
    return () => window.removeEventListener("credit-update", handleCreditUpdate);
  }, [fetchCredits]);

  // Not logged in - show login prompt
  if (!session?.user) {
    if (variant === "minimal") return null;
    return (
      <Link href="/auth/signin" className={`${styles.badge} ${styles.login} ${className}`}>
        <span className={styles.icon}>🔑</span>
        <span className={styles.loginText}>{t("common.login") || "Login"}</span>
      </Link>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className={`${styles.badge} ${styles.loading} ${className}`}>
        <span className={styles.spinner} />
      </div>
    );
  }

  // Error state
  if (error || !creditData) {
    return (
      <div className={`${styles.badge} ${styles.error} ${className}`}>
        <span className={styles.icon}>⚠️</span>
      </div>
    );
  }

  const { credits, plan } = creditData;
  // API에서 total을 반환하면 사용, 아니면 fallback으로 monthly + bonus
  const totalCredits = credits.total ?? (credits.monthly + credits.bonus);
  const remaining = credits.remaining;
  const percentage = totalCredits > 0 ? (remaining / totalCredits) * 100 : 0;

  // Determine color based on remaining percentage
  const getColorClass = () => {
    if (percentage > 50) return styles.good;
    if (percentage > 20) return styles.warning;
    return styles.low;
  };

  // 결제 후 돌아올 URL을 저장하면서 pricing 페이지로 이동
  const handleClick = () => {
    if (typeof window !== "undefined") {
      // 현재 페이지 경로 저장 (pricing 페이지 제외)
      const currentPath = window.location.pathname;
      if (currentPath !== "/pricing" && currentPath !== "/success") {
        localStorage.setItem("checkout_return_url", currentPath);
      }
    }
  };

  if (variant === "minimal") {
    return (
      <Link href="/pricing" onClick={handleClick} className={`${styles.badgeMinimal} ${getColorClass()} ${className}`}>
        <span className={styles.creditIcon}>✦</span>
        <span className={styles.creditCount}>{remaining}</span>
      </Link>
    );
  }

  if (variant === "compact") {
    return (
      <Link href="/pricing" onClick={handleClick} className={`${styles.badge} ${styles.compact} ${getColorClass()} ${className}`}>
        <span className={styles.creditIcon}>✦</span>
        <span className={styles.creditText}>
          {remaining}/{totalCredits}
        </span>
      </Link>
    );
  }

  return (
    <Link href="/pricing" onClick={handleClick} className={`${styles.badge} ${getColorClass()} ${className}`}>
      <div className={styles.content}>
        {showPlan && (
          <span className={styles.planBadge}>{plan.toUpperCase()}</span>
        )}
        <div className={styles.creditInfo}>
          <span className={styles.creditIcon}>✦</span>
          <span className={styles.creditText}>
            <strong>{remaining}</strong>
            <span className={styles.divider}>/</span>
            <span className={styles.total}>{totalCredits}</span>
          </span>
        </div>
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </Link>
  );
}

// Helper function to trigger credit update across components
export function triggerCreditUpdate() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("credit-update"));
  }
}
