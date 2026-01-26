'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './ResultShare.module.css';
import { logger } from '@/lib/logger';

interface TimingResult {
  startDate: string;
  endDate: string;
  score: number;
  grade: string;
  reasons: string[];
}

interface ShareResult {
  question: string;
  eventType: string;
  topResult: {
    startDate: string;
    endDate: string;
    score: number;
    grade: string;
  };
  allResults: TimingResult[];
  totalCount: number;
  birthDate: string;
  gender: 'M' | 'F';
}

interface ResultShareProps {
  result: ShareResult;
  locale?: 'ko' | 'en';
  isLoggedIn?: boolean;
}

export function ResultShare({ result, locale = 'ko', isLoggedIn = false }: ResultShareProps) {
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // 공유 텍스트 생성
  const generateShareText = useCallback(() => {
    const gradeLabels: Record<string, string> = {
      S: '최적기',
      'A+': '매우 좋음',
      A: '좋음',
      B: '괜찮음',
      C: '보통',
      D: '주의',
    };

    const startDate = new Date(result.topResult.startDate).toLocaleDateString(
      locale === 'ko' ? 'ko-KR' : 'en-US',
      { year: 'numeric', month: 'long', day: 'numeric' }
    );
    const endDate = new Date(result.topResult.endDate).toLocaleDateString(
      locale === 'ko' ? 'ko-KR' : 'en-US',
      { year: 'numeric', month: 'long', day: 'numeric' }
    );

    return locale === 'ko'
      ? `🔮 인생 예측 결과

질문: "${result.question}"

✨ 최적 시기: ${startDate} ~ ${endDate}
📊 등급: ${result.topResult.grade} (${gradeLabels[result.topResult.grade] || ''})
💯 점수: ${result.topResult.score}점

총 ${result.totalCount}개의 추천 기간 중 1위!

#인생예측 #사주 #운세`
      : `🔮 Life Prediction Result

Question: "${result.question}"

✨ Best Period: ${startDate} ~ ${endDate}
📊 Grade: ${result.topResult.grade}
💯 Score: ${result.topResult.score}

#1 out of ${result.totalCount} recommended periods!`;
  }, [result, locale]);

  // 클립보드 복사
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(generateShareText());
      setToastMessage(locale === 'ko' ? '클립보드에 복사되었습니다!' : 'Copied to clipboard!');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    } catch (err) {
      logger.error('[ResultShare] Failed to copy:', err);
      setToastMessage(locale === 'ko' ? '복사 실패' : 'Copy failed');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    }
  }, [generateShareText, locale]);

  // 트위터 공유
  const handleTwitterShare = useCallback(() => {
    const text = encodeURIComponent(generateShareText());
    const url = encodeURIComponent(window.location.href);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
  }, [generateShareText]);

  // My Destiny에 저장
  const handleSave = useCallback(async () => {
    if (isSaving || isSaved) {return;}

    setIsSaving(true);
    try {
      const response = await fetch('/api/life-prediction/save-timing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: result.question,
          eventType: result.eventType,
          results: result.allResults,
          birthDate: result.birthDate,
          gender: result.gender,
          locale,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setIsSaved(true);
        setToastMessage(locale === 'ko' ? '✓ My Destiny에 저장되었습니다!' : '✓ Saved to My Destiny!');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2500);
      } else {
        throw new Error(data.error || 'Save failed');
      }
    } catch (err) {
      logger.error('[ResultShare] Save failed:', err);
      setToastMessage(locale === 'ko' ? '저장 실패. 다시 시도해주세요.' : 'Save failed. Please try again.');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    } finally {
      setIsSaving(false);
    }
  }, [result, locale, isSaving, isSaved]);

  return (
    <div className={styles.container}>
      <div className={styles.shareButtons}>
        <button
          className={`${styles.shareBtn} ${styles.copyBtn}`}
          onClick={handleCopy}
          title={locale === 'ko' ? '복사하기' : 'Copy'}
        >
          <span className={styles.icon}>📋</span>
          <span className={styles.label}>{locale === 'ko' ? '복사' : 'Copy'}</span>
        </button>

        <button
          className={`${styles.shareBtn} ${styles.twitterBtn}`}
          onClick={handleTwitterShare}
          title={locale === 'ko' ? '트위터 공유' : 'Share on Twitter'}
        >
          <span className={styles.icon}>🐦</span>
          <span className={styles.label}>{locale === 'ko' ? '트위터' : 'Twitter'}</span>
        </button>

        {/* 저장 버튼 (로그인 사용자만) */}
        {isLoggedIn && (
          <button
            className={`${styles.shareBtn} ${styles.saveBtn} ${isSaved ? styles.saved : ''}`}
            onClick={handleSave}
            disabled={isSaving || isSaved}
            title={locale === 'ko' ? 'My Destiny에 저장' : 'Save to My Destiny'}
          >
            <span className={styles.icon}>{isSaved ? '✓' : isSaving ? '⏳' : '💾'}</span>
            <span className={styles.label}>
              {isSaved
                ? (locale === 'ko' ? '저장됨' : 'Saved')
                : isSaving
                  ? (locale === 'ko' ? '저장중...' : 'Saving...')
                  : (locale === 'ko' ? '저장' : 'Save')}
            </span>
          </button>
        )}
      </div>

      {/* Toast Notification */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            className={styles.toast}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ResultShare;
