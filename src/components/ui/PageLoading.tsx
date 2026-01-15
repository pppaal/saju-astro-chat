"use client";

import styles from "./PageLoading.module.css";

interface PageLoadingProps {
  variant?: "default" | "minimal" | "card" | "chat" | "calendar" | "form";
  message?: string;
}

export default function PageLoading({ variant = "default", message }: PageLoadingProps) {
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

  if (variant === "chat") {
    return (
      <div className={styles.container}>
        <div className={styles.chatContainer}>
          <div className={styles.chatHeader}>
            <div className={styles.chatAvatar} />
            <div className={styles.chatHeaderText} />
          </div>
          <div className={styles.chatMessages}>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={`${styles.chatMessage} ${i % 2 === 0 ? styles.sent : styles.received}`}
              />
            ))}
          </div>
          <div className={styles.chatInput} />
        </div>
      </div>
    );
  }

  if (variant === "calendar") {
    return (
      <div className={styles.container}>
        <div className={styles.calendarContainer}>
          <div className={styles.calendarHeader}>
            <div className={styles.calendarNav} />
            <div className={styles.calendarTitle} />
            <div className={styles.calendarNav} />
          </div>
          <div className={styles.calendarGrid}>
            {[...Array(7)].map((_, i) => (
              <div key={`h-${i}`} className={styles.calendarDayHeader} />
            ))}
            {[...Array(35)].map((_, i) => (
              <div key={i} className={styles.calendarDay} />
            ))}
          </div>
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
