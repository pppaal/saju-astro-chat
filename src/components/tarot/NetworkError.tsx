"use client";

import { useI18n } from "@/i18n/I18nProvider";
import styles from "./NetworkError.module.css";

interface NetworkErrorProps {
  onRetry?: () => void;
  message?: string;
  className?: string;
}

export default function NetworkError({ onRetry, message, className }: NetworkErrorProps) {
  const { language } = useI18n();
  const isKo = language === "ko";

  const defaultMessage = isKo
    ? "연결에 문제가 발생했습니다"
    : "Connection error occurred";

  const retryText = isKo ? "다시 시도" : "Try Again";
  const helpText = isKo
    ? "인터넷 연결을 확인하고 다시 시도해주세요"
    : "Please check your internet connection and try again";

  return (
    <div className={`${styles.container} ${className || ""}`} role="alert">
      <div className={styles.iconWrapper}>
        <span className={styles.icon}>⚠️</span>
      </div>
      <h3 className={styles.title}>{message || defaultMessage}</h3>
      <p className={styles.helpText}>{helpText}</p>
      {onRetry && (
        <button className={styles.retryButton} onClick={onRetry}>
          <span className={styles.retryIcon}>↻</span>
          {retryText}
        </button>
      )}
    </div>
  );
}
