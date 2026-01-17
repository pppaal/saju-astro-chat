"use client";

import styles from "./PageLoading.module.css";
import { ChatSkeleton } from "./ChatSkeleton";
import { CalendarSkeleton } from "./CalendarSkeleton";
import { TarotPageSkeleton } from "./TarotPageSkeleton";
import { DestinyMapSkeleton } from "./DestinyMapSkeleton";

interface PageLoadingProps {
  variant?: "default" | "minimal" | "card" | "chat" | "calendar" | "form" | "tarot" | "destiny";
  message?: string;
}

export default function PageLoading({ variant = "default", message }: PageLoadingProps) {
  // 새로운 스켈레톤들
  if (variant === "chat") {
    return <ChatSkeleton />;
  }

  if (variant === "calendar") {
    return <CalendarSkeleton />;
  }

  if (variant === "tarot") {
    return <TarotPageSkeleton />;
  }

  if (variant === "destiny") {
    return <DestinyMapSkeleton />;
  }

  if (variant === "minimal") {
    return (
      <div className={styles.minimalContainer}>
        <div className={styles.spinner} />
      </div>
    );
  }

  if (variant === "card") {
    return (
      <div className={styles.container}>
        <div className={styles.cardGrid}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={styles.cardSkeleton}>
              <div className={styles.cardIcon} />
              <div className={styles.cardTitle} />
              <div className={styles.cardDesc} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === "form") {
    return (
      <div className={styles.container}>
        <div className={styles.formContainer}>
          <div className={styles.formTitle} />
          <div className={styles.formField} />
          <div className={styles.formField} />
          <div className={styles.formField} style={{ height: "100px" }} />
          <div className={styles.formButton} />
        </div>
      </div>
    );
  }

  // Default variant
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.iconPulse}>
          <span className={styles.icon}>✦</span>
        </div>
        <div className={styles.spinner} />
        {message && <p className={styles.message}>{message}</p>}
      </div>
    </div>
  );
}
