'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import styles from './WeeklyFortuneCard.module.css';

interface WeeklyFortuneData {
  imageUrl: string;
  generatedAt: string;
  weekNumber: number;
  theme: string;
}

export default function WeeklyFortuneCard() {
  const [data, setData] = useState<WeeklyFortuneData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchWeeklyFortune() {
      try {
        const res = await fetch('/api/weekly-fortune');
        if (!res.ok) throw new Error('Failed to fetch');
        const json = await res.json();
        if (json.imageUrl) {
          setData(json);
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    fetchWeeklyFortune();
  }, []);

  if (loading) {
    return (
      <div className={styles.card}>
        <div className={styles.skeleton} />
      </div>
    );
  }

  if (error || !data) {
    return null; // 에러 시 컴포넌트 숨김
  }

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.badge}>✨ 이번 주 운세</span>
        <span className={styles.week}>Week {data.weekNumber}</span>
      </div>
      <div className={styles.imageWrapper}>
        <Image
          src={data.imageUrl}
          alt="이번 주 운세 이미지"
          fill
          className={styles.image}
          sizes="(max-width: 768px) 100vw, 400px"
          priority
        />
        <div className={styles.overlay}>
          <p className={styles.theme}>{data.theme}</p>
        </div>
      </div>
      <div className={styles.footer}>
        <p className={styles.message}>
          이번 주의 에너지를 느껴보세요
        </p>
      </div>
    </div>
  );
}
