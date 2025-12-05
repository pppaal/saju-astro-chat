'use client';
import Link from 'next/link';
import AuraRingVisual from '@/components/aura/AuraRingVisual';
import styles from './Personality.module.css';

export default function PersonalityHomePage() {
  const defaultColors = ['hsl(220, 90%, 65%)', 'hsl(300, 90%, 65%)', 'hsl(180, 90%, 65%)'];

  return (
    <>
      <AuraRingVisual colors={defaultColors} />

      {/* Background Orbs */}
      <div className={styles.orbs}>
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className={styles.orb}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${150 + Math.random() * 200}px`,
              height: `${150 + Math.random() * 200}px`,
              background: `radial-gradient(circle, ${
                i % 3 === 0
                  ? 'rgba(167, 139, 250, 0.4)'
                  : i % 3 === 1
                  ? 'rgba(236, 72, 153, 0.4)'
                  : 'rgba(245, 158, 11, 0.4)'
              }, transparent)`,
              animationDelay: `${Math.random() * 8}s`,
              animationDuration: `${6 + Math.random() * 6}s`,
            }}
          />
        ))}
      </div>

      <main className={styles.page}>
        <div className={`${styles.hero} ${styles.fadeIn}`}>
          <div className={styles.heroIcon}>✨</div>
          <h1 className={styles.heroTitle}>
            Discover Your True Aura
          </h1>
          <p className={styles.heroSubtitle}>
            A next-generation personality test to reveal your unique energy, core motivations, and hidden potential.
          </p>
          <Link href="/personality/quiz">
            <button className={styles.heroButton}>
              <span className={styles.buttonGlow} />
              Start the Free Discovery Test
            </button>
          </Link>
        </div>
      </main>
    </>
  );
}
