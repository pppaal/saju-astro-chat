// components/numerology/NumerologyAnalyzer.tsx
'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import DateTimePicker from '@/components/ui/DateTimePicker';
import { useI18n } from '@/i18n/I18nProvider';
import styles from './NumerologyAnalyzer.module.css';
import { logger } from '@/lib/logger';

interface NumerologyResult {
  lifePath: { number: number; meaning: string; description: string };
  expression?: { number: number; meaning: string; description: string };
  soulUrge?: { number: number; meaning: string; description: string };
  personality?: { number: number; meaning: string; description: string };
  personalYear?: { number: number; theme: string };
  personalMonth?: { number: number; theme?: string };
  personalDay?: { number: number; theme?: string };
  koreanName?: { number: number; strokes: number; meaning: string };
}

interface NumerologyAnalyzerProps {
  onAnalysisComplete?: (result: NumerologyResult) => void;
}

export default function NumerologyAnalyzer({ onAnalysisComplete }: NumerologyAnalyzerProps) {
  const { t, locale } = useI18n();
  const [birthDate, setBirthDate] = useState('');
  const [englishName, setEnglishName] = useState('');
  const [koreanName, setKoreanName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<NumerologyResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const apiLocale = locale === 'ko' ? 'ko' : 'en';
  const isKo = locale === 'ko';
  const masterBadgeLabel = t('numerology.masterBadge', 'Master');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!birthDate) {
      setError(t('numerology.errors.birthdate', 'Please enter your birth date.'));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/numerology', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'analyze',
          birthDate,
          englishName: englishName || undefined,
          koreanName: koreanName || undefined,
          locale: apiLocale,
        }),
      });

      if (!response.ok) {
        throw new Error(t('numerology.errors.generate', 'An error occurred. Please try again.'));
      }

      const data = await response.json();

      // Validate the response structure
      if (!data.lifePath) {
        logger.error('[NumerologyAnalyzer] Invalid numerology response structure:', data);
        throw new Error(t('numerology.errors.generate', 'An error occurred. Please try again.'));
      }

      setResult(data);
      onAnalysisComplete?.(data);

      // Save to readings history
      try {
        const displayName = englishName || koreanName || t('numerology.title', 'Numerology');
        await fetch('/api/readings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'numerology',
            title: `${displayName} - ${t('numerology.title', 'Numerology')}`,
            content: JSON.stringify({
              birthDate,
              englishName,
              koreanName,
              lifePath: data.lifePath?.number,
              expression: data.expression?.number,
              soulUrge: data.soulUrge?.number,
              personality: data.personality?.number,
              personalYear: data.personalYear?.number,
              date: new Date().toISOString(),
            }),
          }),
        });
      } catch (saveErr) {
        logger.error('[NumerologyAnalyzer] Failed to save reading:', saveErr);
        // Don't show error to user, just log it
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('numerology.errors.generate', 'An error occurred. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.inputGroup}>
          <DateTimePicker
            value={birthDate}
            onChange={setBirthDate}
            label={t('numerology.birthdateLabel', 'Birthdate')}
            required
            locale={apiLocale}
          />
        </div>

        <div className={styles.inputGroup}>
          <label htmlFor="englishName" className={styles.label}>
            {t('numerology.englishNameLabel', 'English Name (Optional)')}
          </label>
          <input
            type="text"
            id="englishName"
            value={englishName}
            onChange={(e) => setEnglishName(e.target.value)}
            placeholder="John Smith"
            className={styles.input}
          />
          <span className={styles.hint}>{t('numerology.englishNameHint', 'Enter your English name to calculate Expression, Soul Urge, Personality numbers')}</span>
        </div>

        <div className={styles.inputGroup}>
          <label htmlFor="koreanName" className={styles.label}>
            {t('numerology.koreanNameLabel', 'Korean Name (Optional)')}
          </label>
          <input
            type="text"
            id="koreanName"
            value={koreanName}
            onChange={(e) => setKoreanName(e.target.value)}
            placeholder={isKo ? '홍길동' : 'Hong Gil-dong'}
            className={styles.input}
          />
          <span className={styles.hint}>{t('numerology.koreanNameHint', 'Korean name stroke analysis will be provided')}</span>
        </div>

        {error && (
          <div className={styles.error}>
            {error}
          </div>
        )}

        <motion.button
          type="submit"
          className={styles.submitBtn}
          disabled={isLoading}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {isLoading ? (
            <span className={styles.loading}>{t('common.loading', 'Loading...')}</span>
          ) : (
            t('numerology.buttonCalculate', 'Generate Reading')
          )}
        </motion.button>
      </form>

      {result && (
        <motion.div
          className={styles.results}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h3 className={styles.resultsTitle}>{t('numerology.resultsTitle', 'Numerology Profile')}</h3>

          <div className={styles.numberGrid}>
            {result.lifePath && (
              <NumberCard
                title="Life Path"
                korean={isKo ? t('numerology.coreNumbers.lifePath', 'Life Path') : ''}
                masterLabel={masterBadgeLabel}
                number={result.lifePath.number}
                meaning={result.lifePath.meaning}
                description={result.lifePath.description}
              />
            )}
            {result.expression && (
              <NumberCard
                title="Expression"
                korean={isKo ? t('numerology.coreNumbers.expression', 'Expression') : ''}
                masterLabel={masterBadgeLabel}
                number={result.expression.number}
                meaning={result.expression.meaning}
                description={result.expression.description}
              />
            )}
            {result.soulUrge && (
              <NumberCard
                title="Soul Urge"
                korean={isKo ? t('numerology.coreNumbers.soulUrge', 'Soul Urge') : ''}
                masterLabel={masterBadgeLabel}
                number={result.soulUrge.number}
                meaning={result.soulUrge.meaning}
                description={result.soulUrge.description}
              />
            )}
            {result.personality && (
              <NumberCard
                title="Personality"
                korean={isKo ? t('numerology.coreNumbers.personality', 'Personality') : ''}
                masterLabel={masterBadgeLabel}
                number={result.personality.number}
                meaning={result.personality.meaning}
                description={result.personality.description}
              />
            )}
          </div>

          {/* Personal Cycles */}
          {(result.personalYear || result.personalMonth || result.personalDay) && (
            <div className={styles.personalCycles}>
              <h4 className={styles.cyclesTitle}>📅 {t('numerology.currentCycles', 'Current Cycles')}</h4>
              <div className={styles.cyclesGrid}>
                {result.personalYear && (
                  <div className={styles.cycleCard}>
                    <div className={styles.cycleLabel}>Personal Year</div>
                    <div className={styles.cycleNumber}>{result.personalYear.number}</div>
                    {result.personalYear.theme && (
                      <div className={styles.cycleTheme}>{result.personalYear.theme}</div>
                    )}
                  </div>
                )}
                {result.personalMonth && (
                  <div className={styles.cycleCard}>
                    <div className={styles.cycleLabel}>Personal Month</div>
                    <div className={styles.cycleNumber}>{result.personalMonth.number}</div>
                    {result.personalMonth.theme && (
                      <div className={styles.cycleTheme}>{result.personalMonth.theme}</div>
                    )}
                  </div>
                )}
                {result.personalDay && (
                  <div className={styles.cycleCard}>
                    <div className={styles.cycleLabel}>Personal Day</div>
                    <div className={styles.cycleNumber}>{result.personalDay.number}</div>
                    {result.personalDay.theme && (
                      <div className={styles.cycleTheme}>{result.personalDay.theme}</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Korean Name Analysis */}
          {result.koreanName && (
            <div className={styles.koreanNameSection}>
              <h4 className={styles.koreanTitle}>🇰🇷 {t('numerology.koreanNameAnalysis', 'Korean Name Analysis')}</h4>
              <div className={styles.koreanContent}>
                <div className={styles.koreanNumber}>
                  <span className={styles.koreanLabel}>{t('numerology.nameNumber', 'Name Number')}</span>
                  <span className={styles.koreanValue}>{result.koreanName.number}</span>
                </div>
                <div className={styles.koreanStrokes}>
                  <span className={styles.koreanLabel}>{t('numerology.totalStrokes', 'Total Strokes')}</span>
                  <span className={styles.koreanValue}>{result.koreanName.strokes}{isKo ? '획' : ''}</span>
                </div>
                {result.koreanName.meaning && (
                  <p className={styles.koreanMeaning}>{result.koreanName.meaning}</p>
                )}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

// Number Card sub-component
interface NumberCardProps {
  title: string;
  korean: string;
  number: number;
  meaning: string;
  description: string;
  masterLabel: string;
}

function NumberCard({ title, korean, number, meaning, description, masterLabel }: NumberCardProps) {
  const isMasterNumber = number === 11 || number === 22 || number === 33;

  return (
    <div className={`${styles.numberCard} ${isMasterNumber ? styles.masterNumber : ''}`}>
      <div className={styles.numberHeader}>
        <span className={styles.numberValue}>{number}</span>
        {isMasterNumber && <span className={styles.masterBadge}>{masterLabel}</span>}
      </div>
      <h4 className={styles.numberTitle}>{title}</h4>
      {korean && <span className={styles.numberKorean}>{korean}</span>}
      <p className={styles.numberMeaning}>{meaning}</p>
      <p className={styles.numberDescription}>{description}</p>
    </div>
  );
}
