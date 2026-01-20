import React from 'react';
import styles from './HeroSection.module.css';

interface HeroSectionProps {
  title: string;
  subtitle: string;
  scrollDownText: string;
}

export function HeroSection({ title, subtitle, scrollDownText }: HeroSectionProps) {
  return (
    <section className={styles.fullscreenHero}>
      <div className={styles.heroContent}>
        <h1 className={styles.heroTitle}>{title}</h1>
        <p className={styles.heroSub}>{subtitle}</p>
      </div>

      <div className={styles.scrollIndicator}>
        <span className={styles.scrollText}>{scrollDownText}</span>
        <div className={styles.scrollArrow}>
          <span>↓</span>
        </div>
      </div>
    </section>
  );
}
