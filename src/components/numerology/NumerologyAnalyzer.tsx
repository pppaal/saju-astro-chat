// components/numerology/NumerologyAnalyzer.tsx
/**
 * 수비학 분석 폼 컴포넌트
 * 생년월일과 이름을 입력받아 수비학 분석 요청
 */
'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import styles from './NumerologyAnalyzer.module.css';

interface NumerologyResult {
  lifePath: { number: number; meaning: string; description: string };
  expression: { number: number; meaning: string; description: string };
  soulUrge: { number: number; meaning: string; description: string };
  personality: { number: number; meaning: string; description: string };
  personalYear?: { number: number; theme: string };
  koreanName?: { strokes: number; meaning: string };
}

interface NumerologyAnalyzerProps {
  onAnalysisComplete?: (result: NumerologyResult) => void;
}

export default function NumerologyAnalyzer({ onAnalysisComplete }: NumerologyAnalyzerProps) {
  const [birthDate, setBirthDate] = useState('');
  const [englishName, setEnglishName] = useState('');
  const [koreanName, setKoreanName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<NumerologyResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!birthDate) {
      setError('생년월일을 입력해주세요.');
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
          locale: 'ko',
        }),
      });

      if (!response.ok) {
        throw new Error('분석 요청에 실패했습니다.');
      }

      const data = await response.json();
      setResult(data);
      onAnalysisComplete?.(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <h2 className={styles.title}>수비학 분석</h2>
        <p className={styles.subtitle}>
          생년월일과 이름을 입력하여 당신의 수비학 프로필을 확인하세요
        </p>

        <div className={styles.inputGroup}>
          <label htmlFor="birthDate" className={styles.label}>
            생년월일 <span className={styles.required}>*</span>
          </label>
          <input
            type="date"
            id="birthDate"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            className={styles.input}
            required
          />
        </div>

        <div className={styles.inputGroup}>
          <label htmlFor="englishName" className={styles.label}>
            영문 이름 (선택)
          </label>
          <input
            type="text"
            id="englishName"
            value={englishName}
            onChange={(e) => setEnglishName(e.target.value)}
            placeholder="Full Name in English"
            className={styles.input}
          />
          <span className={styles.hint}>Expression, Soul Urge 계산에 사용됩니다</span>
        </div>

        <div className={styles.inputGroup}>
          <label htmlFor="koreanName" className={styles.label}>
            한글 이름 (선택)
          </label>
          <input
            type="text"
            id="koreanName"
            value={koreanName}
            onChange={(e) => setKoreanName(e.target.value)}
            placeholder="홍길동"
            className={styles.input}
          />
          <span className={styles.hint}>획수 분석에 사용됩니다</span>
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
            <span className={styles.loading}>분석 중...</span>
          ) : (
            '분석하기'
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
          <h3 className={styles.resultsTitle}>분석 결과</h3>

          <div className={styles.numberGrid}>
            <NumberCard
              title="Life Path"
              korean="인생 경로"
              number={result.lifePath.number}
              meaning={result.lifePath.meaning}
              description={result.lifePath.description}
            />
            <NumberCard
              title="Expression"
              korean="표현수"
              number={result.expression.number}
              meaning={result.expression.meaning}
              description={result.expression.description}
            />
            <NumberCard
              title="Soul Urge"
              korean="영혼의 욕구"
              number={result.soulUrge.number}
              meaning={result.soulUrge.meaning}
              description={result.soulUrge.description}
            />
            <NumberCard
              title="Personality"
              korean="인격수"
              number={result.personality.number}
              meaning={result.personality.meaning}
              description={result.personality.description}
            />
          </div>

          {result.personalYear && (
            <div className={styles.personalYear}>
              <h4>올해의 개인년도수</h4>
              <div className={styles.personalYearContent}>
                <span className={styles.yearNumber}>{result.personalYear.number}</span>
                <span className={styles.yearTheme}>{result.personalYear.theme}</span>
              </div>
            </div>
          )}

          {result.koreanName && (
            <div className={styles.koreanNameResult}>
              <h4>한글 이름 획수</h4>
              <div className={styles.strokeInfo}>
                <span className={styles.strokeNumber}>{result.koreanName.strokes}획</span>
                <span className={styles.strokeMeaning}>{result.koreanName.meaning}</span>
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
}

function NumberCard({ title, korean, number, meaning, description }: NumberCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const isMasterNumber = number === 11 || number === 22 || number === 33;

  return (
    <motion.div
      className={`${styles.numberCard} ${isMasterNumber ? styles.masterNumber : ''}`}
      onClick={() => setIsExpanded(!isExpanded)}
      layout
    >
      <div className={styles.numberHeader}>
        <span className={styles.numberValue}>{number}</span>
        {isMasterNumber && <span className={styles.masterBadge}>마스터</span>}
      </div>
      <h4 className={styles.numberTitle}>{title}</h4>
      <span className={styles.numberKorean}>{korean}</span>
      <p className={styles.numberMeaning}>{meaning}</p>

      {isExpanded && (
        <motion.p
          className={styles.numberDescription}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {description}
        </motion.p>
      )}

      <span className={styles.expandHint}>
        {isExpanded ? '접기' : '더보기'}
      </span>
    </motion.div>
  );
}
