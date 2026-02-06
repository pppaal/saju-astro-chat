"use client";

import React from "react";
import styles from "./counselor.module.css";

interface CounselorLoadingScreenProps {
  title: string;
  loadingStep: number;
  loadingMessages: string[];
}

export function CounselorLoadingScreen({ title, loadingStep, loadingMessages }: CounselorLoadingScreenProps) {
  return (
    <main className={styles.page}>
      <div className={styles.loadingContainer}>
        {/* Animated Avatar */}
        <div className={styles.avatarWrapper}>
          <div className={styles.avatarGlow} />
          <div className={styles.avatar}>
            <span className={styles.avatarEmoji}>🔮</span>
          </div>
          <div className={styles.orbits}>
            <div className={styles.orbit1}>
              <span>✨</span>
            </div>
            <div className={styles.orbit2}>
              <span>🌙</span>
            </div>
            <div className={styles.orbit3}>
              <span>⭐</span>
            </div>
          </div>
        </div>

        {/* Loading Text */}
        <div className={styles.loadingText}>
          <h2 className={styles.counselorTitle}>{title}</h2>
          <p className={styles.loadingMessage}>{loadingMessages[loadingStep]}</p>

          {/* Progress Dots */}
          <div className={styles.progressDots}>
            {loadingMessages.map((_, idx) => (
              <div
                key={idx}
                className={`${styles.dot} ${idx <= loadingStep ? styles.dotActive : ""}`}
              />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
