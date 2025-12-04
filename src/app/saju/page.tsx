//src/app/saju/page.tsx

'use client';

import SajuAnalyzer from "@/components/saju/SajuAnalyzer";
import BackButton from "@/components/ui/BackButton";
import styles from "./saju.module.css";

export default function SajuPage() {
  return (
    <div className={styles.wrapper}>
      <BackButton />
      <main className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Eastern Astrology Analysis</h1>
          <p className={styles.subtitle}>
            Enter your birth information to discover your Four Pillars chart.
          </p>
        </div>
        <div className={styles.form}>
          <SajuAnalyzer />
        </div>
      </main>
    </div>
  );
}
