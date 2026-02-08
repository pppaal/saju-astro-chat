// components/past-life/PastLifeAnalyzer.tsx
'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { UnifiedBirthForm, BirthInfo } from '@/components/common/BirthForm';
import { buildSignInUrl } from '@/lib/auth/signInUrl';
import { useI18n } from '@/i18n/I18nProvider';
import styles from './PastLifeAnalyzer.module.css';
import { logger } from '@/lib/logger';
import PastLifeResults from './PastLifeResults';
import type { PastLifeResult } from '@/lib/past-life/types';

export type { PastLifeResult } from '@/lib/past-life/types';

export default function PastLifeAnalyzer() {
  const { t, locale } = useI18n();
  const { status } = useSession();
  const signInUrl = buildSignInUrl();
  const isKo = locale === 'ko';

  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<PastLifeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Store form data for results
  const [formData, setFormData] = useState<{
    birthDate: string;
    birthTime: string;
    latitude?: number;
    longitude?: number;
    timezone?: string;
  } | null>(null);

  const handleSubmit = async (birthInfo: BirthInfo) => {
    const { birthDate, birthTime, latitude, longitude, timezone } = birthInfo;

    if (!birthDate) {
      setError(t('pastLife.errors.birthdate', 'Please enter your birth date.'));
      return;
    }
    if (latitude === undefined || longitude === undefined) {
      setError(t('pastLife.errors.city', 'Please select your birth city.'));
      return;
    }

    setIsLoading(true);
    setError(null);
    setFormData({ birthDate, birthTime, latitude, longitude, timezone });

    try {
      const response = await fetch('/api/past-life', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          birthDate,
          birthTime,
          latitude,
          longitude,
          timezone,
          locale: isKo ? 'ko' : 'en',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 429) {
          throw new Error(t('pastLife.errors.rateLimit', 'Too many requests. Please wait a moment and try again.'));
        } else if (response.status === 400) {
          throw new Error(errorData.error || t('pastLife.errors.validation', 'Invalid input. Please check your information.'));
        } else if (response.status >= 500) {
          throw new Error(t('pastLife.errors.server', 'Server error. Please try again later.'));
        }
        throw new Error(errorData.error || t('pastLife.errors.generate', 'An error occurred. Please try again.'));
      }

      const data = await response.json();
      setResult(data);

      // Save to readings history
      try {
        await fetch('/api/readings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'past-life',
            title: `${t('pastLife.title', 'Past Life Reading')} - ${birthDate}`,
            content: JSON.stringify({
              birthDate,
              birthTime,
              birthCity: birthInfo.birthCity,
              soulPattern: data.soulPattern?.type,
              karmaScore: data.karmaScore,
              date: new Date().toISOString(),
            }),
          }),
        });
      } catch (saveErr) {
        logger.error('[PastLifeAnalyzer] Failed to save reading:', saveErr);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('pastLife.errors.generate', 'An error occurred. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setFormData(null);
  };

  if (result && formData) {
    return (
      <PastLifeResults
        result={result}
        onReset={handleReset}
        birthDate={formData.birthDate}
        birthTime={formData.birthTime}
        latitude={formData.latitude}
        longitude={formData.longitude}
        timezone={formData.timezone}
      />
    );
  }

  return (
    <div className={styles.container}>
      <UnifiedBirthForm
        onSubmit={handleSubmit}
        locale={isKo ? 'ko' : 'en'}
        includeProfileLoader={true}
        includeCity={true}
        includeGender={false}
        allowTimeUnknown={true}
        submitButtonText={t('pastLife.buttonStart', 'Discover My Past Lives')}
        submitButtonIcon="🔮"
        loadingButtonText={t('pastLife.analyzing', 'Exploring past lives...')}
        showHeader={true}
        headerIcon="🎂"
        headerTitle={t('pastLife.formTitle', 'Enter Your Birth Info')}
        headerSubtitle={t('pastLife.formSubtitle', 'Required for accurate past life analysis')}
      />

      {status === 'unauthenticated' && (
        <div className={styles.loginHint}>
          <p>
            {isKo
              ? '로그인하면 정보가 저장되어 더 편리하게 이용할 수 있어요'
              : 'Log in to save your info for a better experience'}
          </p>
          <a href={signInUrl} className={styles.loginLink}>
            {isKo ? '로그인하기' : 'Log in'}
          </a>
        </div>
      )}

      <AnimatePresence>
        {error && (
          <motion.div
            className={styles.error}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.loadingContent}>
            <div className={styles.spinner} />
            <p>{t('pastLife.analyzing', 'Exploring past lives...')}</p>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className={styles.infoBox}>
        <div className={styles.infoIcon}>💡</div>
        <p className={styles.infoText}>
          {t('pastLife.infoText', 'Your past life reading combines Eastern Saju (Four Pillars) analysis with Western Astrology to reveal soul patterns, karmic lessons, and talents carried from previous incarnations.')}
        </p>
      </div>
    </div>
  );
}
