'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useI18n } from '@/i18n/I18nProvider'
import BackButton from '@/components/ui/BackButton'
import styles from './Personality.module.css'

export default function PersonalityHomePage() {
  const { t } = useI18n()
  const router = useRouter()
  const [gender, setGender] = useState<'male' | 'female' | null>(null)

  const handleStart = () => {
    if (gender) {
      localStorage.setItem('personaGender', gender)
      router.push('/personality/quiz')
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.backButton}>
        <BackButton />
      </div>

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

      <div className={`${styles.card} ${styles.fadeIn}`}>
        <div className={styles.header}>
          <div className={styles.icon}>AI</div>
          <h1 className={styles.title}>
            {t('personality.discoverAura', 'Map Your Core Personality Pattern')}
          </h1>
          <p className={styles.subtitle}>
            {t(
              'personality.discoverDesc',
              'A focused personality reading that maps how you think, decide, and respond under pressure.'
            )}
          </p>
        </div>

        <div className={styles.testInfo}>
          <div className={styles.infoItem}>
            <span className={styles.infoIcon}>Q</span>
            <span className={styles.infoText}>
              {t('personality.questionCount', '40 Questions')}
            </span>
          </div>
          <div className={styles.infoDivider} />
          <div className={styles.infoItem}>
            <span className={styles.infoIcon}>5m</span>
            <span className={styles.infoText}>{t('personality.estimatedTime', '~5 Minutes')}</span>
          </div>
        </div>

        <div className={styles.features}>
          <div className={styles.featureItem}>
            <span className={styles.featureIcon}>1</span>
            <div>
              <h3>{t('personality.feature1Title', 'Decision Pattern')}</h3>
              <p>
                {t(
                  'personality.feature1Desc',
                  'See whether you move fast, verify carefully, or adapt as you go'
                )}
              </p>
            </div>
          </div>
          <div className={styles.featureItem}>
            <span className={styles.featureIcon}>2</span>
            <div>
              <h3>{t('personality.feature2Title', 'Thinking Style')}</h3>
              <p>
                {t(
                  'personality.feature2Desc',
                  'Understand how you frame problems and process ambiguity'
                )}
              </p>
            </div>
          </div>
          <div className={styles.featureItem}>
            <span className={styles.featureIcon}>3</span>
            <div>
              <h3>{t('personality.feature3Title', 'Pressure Response')}</h3>
              <p>
                {t(
                  'personality.feature3Desc',
                  'Identify your blind spots, strengths, and recovery style'
                )}
              </p>
            </div>
          </div>
        </div>

        <div className={styles.genderSection}>
          <p className={styles.genderLabel}>
            {t('personality.selectGender', 'Select Your Character')}
          </p>
          <div className={styles.genderButtons}>
            <button
              type="button"
              onClick={() => setGender('male')}
              className={`${styles.genderButton} ${gender === 'male' ? styles.genderButtonSelected : ''}`}
            >
              <span className={styles.genderIcon}>M</span>
              <span className={styles.genderText}>{t('personality.male', 'Male')}</span>
            </button>
            <button
              type="button"
              onClick={() => setGender('female')}
              className={`${styles.genderButton} ${gender === 'female' ? styles.genderButtonSelected : ''}`}
            >
              <span className={styles.genderIcon}>F</span>
              <span className={styles.genderText}>{t('personality.female', 'Female')}</span>
            </button>
          </div>
        </div>

        <button onClick={handleStart} disabled={!gender} className={styles.submitButton}>
          {t('personality.startTest', 'Start the Free Discovery Test')}
        </button>
      </div>
    </main>
  )
}
