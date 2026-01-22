/**
 * Loading State Component
 *
 * 로딩 상태 UI
 */

'use client';

import styles from '../tarot-reading.module.css';

interface LoadingStateProps {
  message: string;
  submessage?: string;
}

export default function LoadingState({ message, submessage }: LoadingStateProps) {
  return (
    <div className={styles.loading}>
      <div className={styles.loadingOrb}></div>
      <p>{message}</p>
      {submessage && <p className={styles.interpretingSubtext}>{submessage}</p>}
    </div>
  );
}
