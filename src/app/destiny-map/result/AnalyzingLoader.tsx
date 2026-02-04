'use client'

import { useState, useEffect, useMemo } from 'react'
import styles from './result.module.css'
import { useI18n } from '@/i18n/I18nProvider'
import BackButton from '@/components/ui/BackButton'

export function LifePredictionSkeleton() {
  return (
    <div className={styles.skeletonContainer}>
      <div className={styles.skeletonFlex}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className={styles.skeletonItem} />
        ))}
      </div>
    </div>
  )
}

const LOADER_STEP_ICONS = ['☯', '☉', '✨', '📜'] as const
const STEP_COUNT = LOADER_STEP_ICONS.length

export default function AnalyzingLoader() {
  const { t } = useI18n()
  const [progress, setProgress] = useState(0)
  const [step, setStep] = useState(0)

  const steps = useMemo(
    () => [
      {
        label: t('destinyMap.result.step1', 'Eastern Fortune Analysis...'),
        icon: LOADER_STEP_ICONS[0],
      },
      {
        label: t('destinyMap.result.step2', 'Western Fortune Analysis...'),
        icon: LOADER_STEP_ICONS[1],
      },
      {
        label: t('destinyMap.result.step3', 'Generating AI Interpretation...'),
        icon: LOADER_STEP_ICONS[2],
      },
      { label: t('destinyMap.result.step4', 'Finalizing Report...'), icon: LOADER_STEP_ICONS[3] },
    ],
    [t]
  )

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) {
          return prev
        }
        const increment = prev < 30 ? 3 : prev < 60 ? 2 : prev < 80 ? 1 : 0.5
        return Math.min(prev + increment, 95)
      })
    }, 500)

    const stepInterval = setInterval(() => {
      setStep((prev) => (prev < STEP_COUNT - 1 ? prev + 1 : prev))
    }, 10000)

    return () => {
      clearInterval(interval)
      clearInterval(stepInterval)
    }
  }, [])

  return (
    <main className={styles.loaderMain} aria-busy="true" aria-live="polite">
      <BackButton />
      <div className={styles.loaderCard} role="status">
        <div className={styles.loaderIcon} aria-hidden="true">
          <span className={styles.loaderIconSpin}>☯</span>
        </div>

        <h2 className={styles.loaderTitle}>
          {t('destinyMap.result.analyzingTitle', 'Analyzing Your Destiny')}
        </h2>
        <p className={styles.loaderSubtitle}>
          {t('destinyMap.result.analyzingSubtitle', 'Analyzing Your Destiny Chart')}
        </p>

        <div
          className={styles.progressBar}
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className={styles.progressFill} style={{ width: `${progress}%` }} />
        </div>

        <div className={styles.progressPercent} aria-live="polite">
          {Math.round(progress)}%
        </div>

        <div className={styles.stepList}>
          {steps.map((s, i) => (
            <div
              key={i}
              className={`${styles.stepItem} ${i === step ? styles.stepItemActive : ''}`}
            >
              <span
                className={`${styles.stepIcon} ${
                  i < step
                    ? styles.stepIconCompleted
                    : i === step
                      ? styles.stepIconActive
                      : styles.stepIconPending
                }`}
              >
                {i < step ? '✓' : s.icon}
              </span>
              <span
                className={`${styles.stepLabel} ${
                  i <= step ? styles.stepLabelActive : styles.stepLabelInactive
                }`}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>

        <p className={styles.loaderFunFact}>
          {t('destinyMap.result.dataNodes', 'Analysis based on 71,000+ data nodes')}
        </p>
      </div>
    </main>
  )
}
