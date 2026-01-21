// components/past-life/PastLifeAnalyzer.tsx
'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DateTimePicker from '@/components/ui/DateTimePicker';
import TimePicker from '@/components/ui/TimePicker';
import CityAutocomplete from '@/components/ui/CityAutocomplete';
import { useI18n } from '@/i18n/I18nProvider';
import styles from './PastLifeAnalyzer.module.css';
import { logger } from '@/lib/logger';
import PastLifeResults from './PastLifeResults';
import type { PastLifeResult } from '@/lib/past-life/types';

export type { PastLifeResult } from '@/lib/past-life/types';

export default function PastLifeAnalyzer() {
  const { t, locale } = useI18n();
  const [birthDate, setBirthDate] = useState('');
  const [birthTime, setBirthTime] = useState('12:00');
  const [birthCity, setBirthCity] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [timezone, setTimezone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<PastLifeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isKo = locale === 'ko';

  const handleCitySelect = (city: {
    name: string;
    lat: number;
    lon: number;
    timezone: string;
  }) => {
    setBirthCity(city.name);
    setLatitude(city.lat);
    setLongitude(city.lon);
    setTimezone(city.timezone);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!birthDate) {
      setError(t('pastLife.errors.birthdate', 'Please enter your birth date.'));
      return;
    }
    if (!birthCity || latitude === null || longitude === null) {
      setError(t('pastLife.errors.city', 'Please select your birth city.'));
      return;
    }

    setIsLoading(true);
    setError(null);

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
              birthCity,
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
    setBirthDate('');
    setBirthTime('12:00');
    setBirthCity('');
    setLatitude(null);
    setLongitude(null);
    setTimezone('');
  };

  if (result) {
    return <PastLifeResults result={result} onReset={handleReset} />;
  }

  return (
    <div className={styles.container}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.inputGroup}>
          <DateTimePicker
            value={birthDate}
            onChange={setBirthDate}
            label={t('pastLife.birthdateLabel', 'Birth Date')}
            required
            locale={isKo ? 'ko' : 'en'}
          />
        </div>

        <div className={styles.inputGroup}>
          <TimePicker
            value={birthTime}
            onChange={setBirthTime}
            label={t('pastLife.birthtimeLabel', 'Birth Time')}
            locale={isKo ? 'ko' : 'en'}
          />
          <span className={styles.hint}>
            {t('pastLife.birthtimeHint', 'If unknown, 12:00 will be used')}
          </span>
        </div>

        <div className={styles.inputGroup}>
          <label className={styles.label}>
            {t('pastLife.birthcityLabel', 'Birth City')}
            <span className={styles.required}>*</span>
          </label>
          <CityAutocomplete
            value={birthCity}
            onChange={setBirthCity}
            onSelect={handleCitySelect}
            placeholder={t('pastLife.birthcityPlaceholder', 'Search for your birth city...')}
          />
          <span className={styles.hint}>
            {t('pastLife.birthcityHint', 'Birth city is needed for accurate astrology calculations')}
          </span>
        </div>

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

        <motion.button
          type="submit"
          className={styles.submitBtn}
          disabled={isLoading}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {isLoading ? (
            <span className={styles.loading}>
              <span className={styles.spinner} />
              {t('pastLife.analyzing', 'Exploring past lives...')}
            </span>
          ) : (
            <>
              <span className={styles.btnIcon}>🔮</span>
              {t('pastLife.buttonStart', 'Discover My Past Lives')}
            </>
          )}
        </motion.button>
      </form>

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
