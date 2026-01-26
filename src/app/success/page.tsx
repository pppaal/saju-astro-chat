"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useI18n } from "@/i18n/I18nProvider";
import BackButton from "@/components/ui/BackButton";
import styles from "./success.module.css";

function SuccessContent() {
  const { t } = useI18n();
  const { data: session, status, update } = useSession();
  const searchParams = useSearchParams();
  const sessionId = searchParams?.get("session_id") ?? null;
  const [returnUrl, setReturnUrl] = useState<string | null>(null);
  const [sessionRefreshed, setSessionRefreshed] = useState(false);

  // Stripe 결제 후 돌아왔을 때 세션 새로고침
  useEffect(() => {
    if (status === "loading") {return;}

    // 세션이 없거나 첫 로드시 세션 업데이트 시도
    if (!sessionRefreshed) {
      update().then(() => {
        setSessionRefreshed(true);
      }).catch(() => {
        setSessionRefreshed(true);
      });
    }
  }, [status, sessionRefreshed, update]);

  // localStorage에서 returnUrl 가져오기
  useEffect(() => {
    const savedReturnUrl = localStorage.getItem("checkout_return_url");
    if (savedReturnUrl) {
      setReturnUrl(savedReturnUrl);
      // 사용 후 삭제
      localStorage.removeItem("checkout_return_url");
    }
  }, []);

  // 크레딧 업데이트 이벤트 발생
  useEffect(() => {
    if (sessionId && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("credit-update"));
    }
  }, [sessionId]);

  const goToReadingUrl = returnUrl || "/destiny-map";

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
          <Link href={goToReadingUrl} className={styles.primaryButton}>
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
