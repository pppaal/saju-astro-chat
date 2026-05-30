// 경로: src/components/ui/StarrySky.tsx (전체 교체)
"use client";
import { useState, useEffect } from 'react';
import styles from './StarrySky.module.css'; // 자신만의 전용 스타일 파일을 import
import { useLowEndDevice } from '@/hooks/useLowEndDevice';

interface Star {
  id: number;
  style: React.CSSProperties;
}

export default function StarrySky() {
  const [stars, setStars] = useState<Star[]>([]);
  const [reduceMotion, setReduceMotion] = useState(false);
  const isLowEnd = useLowEndDevice();

  useEffect(() => {
    if (typeof window === "undefined") {return;}
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const handler = () => setReduceMotion(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      setStars([]);
      return;
    }
    const width = typeof window !== "undefined" ? window.innerWidth : 1200;
    // 저사양 기기 (메모리/CPU/회선/saveData) 는 별 개수 60% 절감 → FPS 회복.
    const baseCount = width < 640 ? 50 : width < 1024 ? 70 : 100;
    const starCount = isLowEnd ? Math.round(baseCount * 0.4) : baseCount;

    const timerId = window.setTimeout(() => {
      const generatedStars: Star[] = Array.from({ length: starCount }).map((_, i) => {
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
    }, 120);

    return () => window.clearTimeout(timerId);
  }, [reduceMotion, isLowEnd]);

  return (
    <div className={styles.starlightContainer}>
      {stars.map(star => (
        <div key={star.id} className={styles.star} style={star.style}></div>
      ))}
    </div>
  );
}
