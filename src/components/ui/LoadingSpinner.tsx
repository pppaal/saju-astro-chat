"use client";

import styles from "./LoadingSpinner.module.css";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  message?: string;
  variant?: "cosmic" | "stars" | "orbit" | "pulse";
}

export default function LoadingSpinner({
  size = "md",
  message = "Reading the stars...",
  variant = "cosmic",
}: LoadingSpinnerProps) {
  return (
    <div className={styles.container}>
      {variant === "cosmic" && (
        <div className={`${styles.cosmic} ${styles[size]}`}>
          <div className={styles.cosmicRing}></div>
          <div className={styles.cosmicRing}></div>
          <div className={styles.cosmicRing}></div>
          <div className={styles.cosmicCore}></div>
        </div>
      )}

      {variant === "stars" && (
        <div className={`${styles.stars} ${styles[size]}`}>
          <div className={styles.star}></div>
          <div className={styles.star}></div>
          <div className={styles.star}></div>
          <div className={styles.star}></div>
        </div>
      )}

      {variant === "orbit" && (
        <div className={`${styles.orbit} ${styles[size]}`}>
          <div className={styles.orbitPath}>
            <div className={styles.planet}></div>
          </div>
          <div className={styles.orbitPath}>
            <div className={styles.planet}></div>
          </div>
          <div className={styles.sun}></div>
        </div>
      )}

      {variant === "pulse" && (
        <div className={`${styles.pulse} ${styles[size]}`}>
          <div className={styles.pulseRing}></div>
          <div className={styles.pulseRing}></div>
          <div className={styles.pulseCore}></div>
        </div>
      )}

      {message && <p className={styles.message}>{message}</p>}
    </div>
  );
}
