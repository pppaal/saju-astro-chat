/**
 * Error State Component
 *
 * 에러 상태 UI
 */

'use client';

import Link from 'next/link';
import styles from '../tarot-reading.module.css';

interface ErrorStateProps {
  title: string;
  linkText: string;
}

export default function ErrorState({ title, linkText }: ErrorStateProps) {
  return (
    <div className={styles.error}>
      <h1>😢 {title}</h1>
      <Link href="/tarot" className={styles.errorLink}>
        {linkText}
      </Link>
    </div>
  );
}
