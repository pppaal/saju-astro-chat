// components/numerology/LuckyNumbers.tsx
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import DateTimePicker from '@/components/ui/DateTimePicker';
import { useI18n } from '@/i18n/I18nProvider';
import styles from './LuckyNumbers.module.css';

interface LuckyNumbersResult {
  lifePath: number;
  expression?: number;
  soulUrge?: number;
  personality?: number;
  luckyNumbers: number[];
  interpretation: string;
}

export default function LuckyNumbers() {
  const { t, locale } = useI18n();
  const [birthDate, setBirthDate] = useState('');
  const [name, setName] = useState('');
  const [count, setCount] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<LuckyNumbersResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const apiLocale = locale === 'ko' ? 'ko' : 'en';

  const generateLuckyNumbers = (lifePath: number, expression?: number, soulUrge?: number, personality?: number, targetCount: number = 10) => {
    const numbers = new Set<number>();

    // Core numbers
    numbers.add(lifePath);
    if (expression) numbers.add(expression);
    if (soulUrge) numbers.add(soulUrge);
    if (personality) numbers.add(personality);

    // Multiples and combinations
    const coreNums = [lifePath, expression, soulUrge, personality].filter(n => n) as number[];

    coreNums.forEach(num => {
      // Multiples within 1-45
      for (let i = 1; i <= 4; i++) {
        const multiple = num * i;
        if (multiple <= 45) numbers.add(multiple);
      }

      // Sum combinations
      coreNums.forEach(other => {
        const sum = num + other;
        if (sum <= 45 && sum > 0) numbers.add(sum);
      });
    });

    // Ensure we have enough numbers
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);

    while (numbers.size < targetCount + 5) {
      const derived = ((lifePath + dayOfYear + numbers.size) % 45) + 1;
      numbers.add(derived);
    }

    return Array.from(numbers).sort((a, b) => a - b).slice(0, targetCount);
  };

  const handleGenerate = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!birthDate) {
      setError(t('numerology.lucky.errorBirthdate', 'Please enter your birth date.'));
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
          englishName: name || undefined,
          locale: apiLocale
        }),
      });

      if (!response.ok) {
        throw new Error(t('numerology.lucky.errorRequest', 'Failed to analyze.'));
      }

      const data = await response.json();

      const luckyNums = generateLuckyNumbers(
        data.lifePath?.number,
        data.expression?.number,
        data.soulUrge?.number,
        data.personality?.number,
        count
      );

      setResult({
        lifePath: data.lifePath?.number,
        expression: data.expression?.number,
        soulUrge: data.soulUrge?.number,
        personality: data.personality?.number,
        luckyNumbers: luckyNums,
        interpretation: t('numerology.lucky.interpretation', `Lucky numbers generated based on your Life Path ${data.lifePath?.number}. These numbers resonate with your energy.`)
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : t('numerology.lucky.errorGeneral', 'An error occurred. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (numbers: number[]) => {
    const text = numbers.join(', ');
    navigator.clipboard.writeText(text);
    // Show toast notification
    const toast = document.createElement('div');
    toast.textContent = t('numerology.lucky.copied', 'Numbers copied!');
    toast.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 16px 24px;
      border-radius: 8px;
      z-index: 9999;
      animation: fadeOut 2s ease-out forwards;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  };

  return (
    <div className={styles.container}>
      <form onSubmit={handleGenerate} className={styles.form}>
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
          <label htmlFor="name" className={styles.label}>
            {t('numerology.lucky.nameLabel', 'Name (English, Optional)')}
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Smith"
            className={styles.input}
          />
          <span className={styles.hint}>{t('numerology.lucky.nameHint', 'Enter your name for more accurate lucky numbers')}</span>
        </div>

        <div className={styles.inputGroup}>
          <label htmlFor="count" className={styles.label}>
            {t('numerology.lucky.countLabel', 'Number of lucky numbers to generate')}
          </label>
          <input
            type="number"
            id="count"
            value={count}
            onChange={(e) => setCount(Math.min(15, Math.max(1, parseInt(e.target.value) || 10)))}
            min="1"
            max="15"
            className={styles.input}
          />
          <span className={styles.hint}>{t('numerology.lucky.countHint', 'Select up to 15 numbers')}</span>
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
            t('numerology.lucky.generateButton', 'Generate Lucky Numbers')
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
          <div className={styles.resultsHeader}>
            <h3 className={styles.resultsTitle}>✨ {t('numerology.lucky.yourNumbers', 'Your Lucky Numbers')}</h3>
            <p className={styles.interpretation}>{result.interpretation}</p>
          </div>

          {/* Core Numbers Display */}
          <div className={styles.coreNumbers}>
            <div className={styles.coreNumberItem}>
              <span className={styles.coreLabel}>Life Path</span>
              <span className={styles.coreValue}>{result.lifePath}</span>
            </div>
            {result.expression && (
              <div className={styles.coreNumberItem}>
                <span className={styles.coreLabel}>Expression</span>
                <span className={styles.coreValue}>{result.expression}</span>
              </div>
            )}
            {result.soulUrge && (
              <div className={styles.coreNumberItem}>
                <span className={styles.coreLabel}>Soul Urge</span>
                <span className={styles.coreValue}>{result.soulUrge}</span>
              </div>
            )}
            {result.personality && (
              <div className={styles.coreNumberItem}>
                <span className={styles.coreLabel}>Personality</span>
                <span className={styles.coreValue}>{result.personality}</span>
              </div>
            )}
          </div>

          {/* Lucky Numbers Grid */}
          <div className={styles.numbersGrid}>
            {result.luckyNumbers.map((num, index) => (
              <motion.div
                key={num}
                className={styles.numberBall}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1, type: 'spring' }}
              >
                {num}
              </motion.div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className={styles.actions}>
            <motion.button
              className={styles.actionBtn}
              onClick={() => copyToClipboard(result.luckyNumbers)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              📋 {t('numerology.lucky.copy', 'Copy Numbers')}
            </motion.button>
            <motion.button
              className={styles.actionBtn}
              onClick={handleGenerate}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              🔄 {t('numerology.lucky.regenerate', 'Regenerate')}
            </motion.button>
          </div>

          {/* Lotto Info */}
          <div className={styles.infoCard}>
            <h4 className={styles.infoTitle}>💡 {t('numerology.lucky.tipsTitle', 'Tips')}</h4>
            <ul className={styles.infoList}>
              <li>{t('numerology.lucky.tip1', 'These numbers are derived from your birth date and name numerology energy')}</li>
              <li>{t('numerology.lucky.tip2', 'Select 6 for Lotto 6/45 or use for other number games')}</li>
              <li>{t('numerology.lucky.tip3', 'You can combine numbers or create patterns')}</li>
              <li>{t('numerology.lucky.tip4', 'Generate new numbers regularly for variety')}</li>
            </ul>
          </div>
        </motion.div>
      )}
    </div>
  );
}
