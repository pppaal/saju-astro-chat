'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/i18n/I18nProvider';
import BackButton from '@/components/ui/BackButton';
import styles from './Personality.module.css';

export default function PersonalityHomePage() {
  const { t } = useI18n();
  const router = useRouter();
  const [gender, setGender] = useState<'male' | 'female' | null>(null);

  const handleStart = () => {
    if (gender) {
      localStorage.setItem('personaGender', gender);
      router.push('/personality/quiz');
    }
  };

  return (
    <main className={styles.page}>
      {/* Back Button */}
      <div className={styles.backButton}>
        <BackButton />
      </div>

      {/* Animated Stars Background - deterministic positions */}
      <div className={styles.stars}>
        {[...Array(60)].map((_, i) => (
          <div
            key={i}
            className={styles.star}
            style={{
              left: `${(i * 37 + 13) % 100}%`,
              top: `${(i * 53 + 7) % 100}%`,
              animationDelay: `${(i * 0.08) % 4}s`,
              width: `${2 + (i % 3)}px`,
              height: `${2 + (i % 3)}px`,
            }}
          />
        ))}
      </div>

      {/* Hero Card */}
      <div className={`${styles.card} ${styles.fadeIn}`}>
        <div className={styles.header}>
          <div className={styles.icon}>✨</div>
          <h1 className={styles.title}>
            {t('personality.discoverAura', 'Discover Your True Aura')}
          </h1>
          <p className={styles.subtitle}>
            {t('personality.discoverDesc', 'A next-generation personality test to reveal your unique energy, core motivations, and hidden potential.')}
          </p>
        </div>

        {/* Test Info */}
        <div className={styles.testInfo}>
          <div className={styles.infoItem}>
            <span className={styles.infoIcon}>📝</span>
            <span className={styles.infoText}>{t('personality.questionCount', '40 Questions')}</span>
          </div>
          <div className={styles.infoDivider} />
          <div className={styles.infoItem}>
            <span className={styles.infoIcon}>⏱️</span>
            <span className={styles.infoText}>{t('personality.estimatedTime', '~5 Minutes')}</span>
          </div>
        </div>

        {/* Features */}
        <div className={styles.features}>
          <div className={styles.featureItem}>
            <span className={styles.featureIcon}>🌈</span>
            <div>
              <h3>{t('personality.feature1Title', 'Energy Profile')}</h3>
              <p>{t('personality.feature1Desc', 'Discover if you are radiant or grounded')}</p>
            </div>
          </div>
          <div className={styles.featureItem}>
            <span className={styles.featureIcon}>🧠</span>
            <div>
              <h3>{t('personality.feature2Title', 'Thinking Style')}</h3>
              <p>{t('personality.feature2Desc', 'Visionary vs structured approach')}</p>
            </div>
          </div>
          <div className={styles.featureItem}>
            <span className={styles.featureIcon}>💫</span>
            <div>
              <h3>{t('personality.feature3Title', 'Hidden Potential')}</h3>
              <p>{t('personality.feature3Desc', 'Unlock your unique strengths')}</p>
            </div>
          </div>
        </div>

        {/* Gender Selection */}
        <div className={styles.genderSection}>
          <p className={styles.genderLabel}>{t('personality.selectGender', 'Select Your Character')}</p>
          <div className={styles.genderButtons}>
            <button
              type="button"
              onClick={() => setGender('male')}
              className={`${styles.genderButton} ${gender === 'male' ? styles.genderButtonSelected : ''}`}
            >
              <span className={styles.genderIcon}>👨</span>
              <span className={styles.genderText}>{t('personality.male', 'Male')}</span>
            </button>
            <button
              type="button"
              onClick={() => setGender('female')}
              className={`${styles.genderButton} ${gender === 'female' ? styles.genderButtonSelected : ''}`}
            >
              <span className={styles.genderIcon}>👩</span>
              <span className={styles.genderText}>{t('personality.female', 'Female')}</span>
            </button>
          </div>
        </div>

        {/* CTA Button */}
        <button
          onClick={handleStart}
          disabled={!gender}
          className={styles.submitButton}
        >
          {t('personality.startTest', 'Start the Free Discovery Test')}
        </button>
      </div>
    </main>
  );
}
