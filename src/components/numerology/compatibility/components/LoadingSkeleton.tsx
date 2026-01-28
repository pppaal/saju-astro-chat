"use client";

import styles from '../../CompatibilityAnalyzer.module.css';

export default function LoadingSkeleton() {
  return (
    <div className={styles.results}>
      <div className={styles.skeletonCard}>
        <div className={styles.skeletonCircle} />
        <div className={styles.skeletonText} />
      </div>
      <div className={styles.skeletonCard}>
        <div className={styles.skeletonTitle} />
        <div className={styles.skeletonTextLong} />
        <div className={styles.skeletonTextLong} />
      </div>
      <div className={styles.skeletonCard}>
        <div className={styles.skeletonTitle} />
        <div className={styles.skeletonTextLong} />
      </div>
    </div>
  );
}
