// 경로: src/components/ui/StarrySky.tsx (전체 교체)
"use client";
import { useState, useEffect } from 'react';
import styles from './StarrySky.module.css'; // 자신만의 전용 스타일 파일을 import

interface Star {
  id: number;
  style: React.CSSProperties;
}

export default function StarrySky() {
  const [stars, setStars] = useState<Star[]>([]);

  useEffect(() => {
    const generatedStars: Star[] = Array.from({ length: 100 }).map((_, i) => {
      const size = Math.random() * 2 + 1;
      return {
        id: i,
        style: {
          '--size': `${size}px`,
          '--left': `${Math.random() * 100}vw`,
          '--fall-duration': `${Math.random() * 5 + 5}s`,
          '--fall-delay': `${Math.random() * 10}s`,
          '--twinkle-duration': `${Math.random() * 3 + 2}s`,
        } as React.CSSProperties,
      };
    });
    setStars(generatedStars);
  }, []);

  return (
    <div className={styles.starlightContainer}>
      {stars.map(star => (
        <div key={star.id} className={styles.star} style={star.style}></div>
      ))}
    </div>
  );
}