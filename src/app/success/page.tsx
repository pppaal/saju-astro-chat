"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useI18n } from "@/i18n/I18nProvider";
import BackButton from "@/components/ui/BackButton";
import styles from "./success.module.css";

// 크레딧 팩별 충전 크레딧 수 — Stripe metadata 의 creditPack 값으로 lookup.
// pricing 페이지의 PACK_DETAILS 와 동일 (단일 출처 분리 작업은 별도).
const PACK_CREDITS: Record<string, number> = {
  mini: 5,
  standard: 15,
  plus: 40,
  mega: 100,
  ultimate: 250,
};

// 주문번호 표시용 — Stripe session id (cs_live_...) 그대로 노출하면 길고
// 내부 식별자 느낌이라, 끝 12자만 대문자로 잘라서 사용자가 CS 문의 시 우리
// 측에서 검색 가능한 정도로 단축.
function formatOrderRef(sessionId: string): string {
  const tail = sessionId.slice(-12).toUpperCase();
  return tail.match(/.{1,4}/g)?.join("-") ?? tail;
}

function SuccessContent() {
  const { t } = useI18n();
  const { status, update } = useSession();
  const searchParams = useSearchParams();
  const sessionId = searchParams?.get("session_id") ?? null;
  const pack = searchParams?.get("pack") ?? null;
  const credits = pack ? PACK_CREDITS[pack] : null;
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

  // 크레딧 부족 모달에서 결제로 넘어온 경우만 "리딩으로 돌아가기" 버튼을
  // 띄운다. 홈/요금제에서 그냥 결제한 경우는 돌아갈 곳이 없어 버튼이 노이즈.
  const showReturnButton = Boolean(returnUrl);
  const packLabel = pack ? t(`success.packs.${pack}`) : null;
  const creditsLine = credits ? t("success.creditsAdded").replace("{credits}", String(credits)) : null;

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

        {packLabel && (
          <p className={styles.message}>
            {t("success.packLabel")}: <strong>{packLabel}</strong>
          </p>
        )}
        {creditsLine && !packLabel && (
          <p className={styles.message}>{creditsLine}</p>
        )}

        {sessionId && (
          <p className={styles.sessionInfo}>
            {t("success.orderRef")}: {formatOrderRef(sessionId)}
          </p>
        )}

        <div className={styles.actions}>
          {returnUrl && (
            <Link href={returnUrl} className={styles.primaryButton}>
              {t("success.startReading")}
            </Link>
          )}
          <Link
            href="/"
            className={showReturnButton ? styles.secondaryButton : styles.primaryButton}
          >
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
