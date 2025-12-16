"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import BackButton from "@/components/ui/BackButton";
import styles from "./success.module.css";

function SuccessContent() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const sessionId = searchParams?.get("session_id") ?? null;

  return (
    <div className={styles.page}>
      <BackButton />
      <div className={styles.container}>
        <div className={styles.iconWrapper}>
          <div className={styles.successIcon}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        <h1 className={styles.title}>{t("success.title")}</h1>
        <p className={styles.message}>{t("success.message")}</p>

        {sessionId && (
          <p className={styles.sessionInfo}>
            {t("success.orderRef")}: {sessionId.slice(0, 20)}...
          </p>
        )}

        <div className={styles.actions}>
          <Link href="/destiny-map" className={styles.primaryButton}>
            {t("success.startReading")}
          </Link>
          <Link href="/" className={styles.secondaryButton}>
            {t("success.goHome")}
          </Link>
        </div>

        <p className={styles.note}>{t("success.emailNote")}</p>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className={styles.loading}>Loading...</div>}>
      <SuccessContent />
    </Suspense>
  );
}
