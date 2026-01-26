"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/I18nProvider";
import styles from "./CreditDepletedModal.module.css";

interface CreditDepletedModalProps {
  isOpen: boolean;
  onClose: () => void;
  remainingCredits?: number;
  type?: "depleted" | "low";
}

export default function CreditDepletedModal({
  isOpen,
  onClose,
  remainingCredits = 0,
  type = "depleted",
}: CreditDepletedModalProps) {
  const router = useRouter();
  const { t } = useI18n();
  const [isAnimating, setIsAnimating] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      requestAnimationFrame(() => {
        setIsAnimating(true);
      });
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handlePurchase = useCallback(() => {
    // 결제 후 돌아올 URL 저장
    if (typeof window !== "undefined") {
      const currentPath = window.location.pathname;
      if (currentPath !== "/pricing" && currentPath !== "/success") {
        localStorage.setItem("checkout_return_url", currentPath);
      }
    }
    onClose();
    router.push("/pricing");
  }, [onClose, router]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleKeyDown]);

  if (!isVisible) {return null;}

  const isDepleted = type === "depleted";

  return (
    <div
      className={`${styles.overlay} ${isAnimating ? styles.overlayVisible : ""}`}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="credit-modal-title"
    >
      <div
        className={`${styles.modal} ${isAnimating ? styles.modalVisible : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Animated Icon */}
        <div className={styles.iconContainer}>
          <div className={`${styles.iconRing} ${styles.ring1}`} />
          <div className={`${styles.iconRing} ${styles.ring2}`} />
          <div className={`${styles.iconRing} ${styles.ring3}`} />
          <div className={styles.iconInner}>
            {isDepleted ? (
              <span className={styles.emptyIcon}>✦</span>
            ) : (
              <span className={styles.warningIcon}>⚠</span>
            )}
          </div>
        </div>

        {/* Title */}
        <h2 id="credit-modal-title" className={styles.title}>
          {isDepleted
            ? t("credits.depleted.title", "크레딧이 소진되었습니다")
            : t("credits.low.title", "크레딧이 부족합니다")}
        </h2>

        {/* Description */}
        <p className={styles.description}>
          {isDepleted
            ? t(
                "credits.depleted.description",
                "모든 크레딧을 사용하셨습니다. 크레딧을 충전하시면 더 많은 상담을 받아보실 수 있습니다."
              )
            : t(
                "credits.low.description",
                `잔여 크레딧이 ${remainingCredits}개 남았습니다. 서비스 이용을 위해 충전을 권장합니다.`
              )}
        </p>

        {/* Credit Display */}
        <div className={styles.creditDisplay}>
          <div className={styles.creditIcon}>✦</div>
          <div className={styles.creditInfo}>
            <span className={styles.creditLabel}>
              {t("credits.remaining", "잔여 크레딧")}
            </span>
            <span className={`${styles.creditValue} ${isDepleted ? styles.empty : styles.low}`}>
              {remainingCredits}
              <span className={styles.creditUnit}>{t("credits.unit", "개")}</span>
            </span>
          </div>
        </div>

        {/* Buttons */}
        <div className={styles.buttons}>
          <button
            className={styles.purchaseButton}
            onClick={handlePurchase}
            autoFocus
          >
            <span className={styles.buttonIcon}>✦</span>
            {t("credits.purchase", "크레딧 구매하기")}
          </button>
          <button className={styles.laterButton} onClick={onClose}>
            {t("common.later", "나중에")}
          </button>
        </div>

        {/* Close Button */}
        <button
          className={styles.closeButton}
          onClick={onClose}
          aria-label={t("common.close", "닫기")}
        >
          ✕
        </button>
      </div>
    </div>
  );
}

// Hook for managing credit modal state
export function useCreditModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [modalType, setModalType] = useState<"depleted" | "low">("depleted");
  const [remainingCredits, setRemainingCredits] = useState(0);

  const showDepleted = useCallback(() => {
    setModalType("depleted");
    setRemainingCredits(0);
    setIsOpen(true);
  }, []);

  const showLowCredits = useCallback((remaining: number) => {
    setModalType("low");
    setRemainingCredits(remaining);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  return {
    isOpen,
    modalType,
    remainingCredits,
    showDepleted,
    showLowCredits,
    close,
  };
}
