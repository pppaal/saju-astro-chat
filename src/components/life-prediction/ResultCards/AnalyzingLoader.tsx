'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import styles from './ResultCards.module.css';
import { loaderVariants } from '../animations/cardAnimations';

interface AnalyzingLoaderProps {
  eventType?: string;
  message?: string;
}

// 분석 중 표시 메시지들
const ANALYZING_MESSAGES = [
  '사주를 분석하고 있어요...',
  '운세의 흐름을 읽고 있어요...',
  '최적의 시기를 찾고 있어요...',
  '천간과 지지를 계산 중...',
  '대운과 세운을 확인 중...',
] as const;

// 이벤트 타입별 아이콘
const EVENT_ICONS: Record<string, string> = {
  marriage: '💍',
  career: '💼',
  investment: '📈',
  move: '🏠',
  study: '📚',
  health: '💪',
  relationship: '💕',
};

// 이벤트 타입별 타이틀
const EVENT_TITLES: Record<string, string> = {
  marriage: '결혼 최적 시기',
  career: '취업/이직 최적 시기',
  investment: '투자 최적 시기',
  move: '이사 최적 시기',
  study: '시험/학업 최적 시기',
  health: '건강 관리 시기',
  relationship: '연애 최적 시기',
};

// 분석 단계 데이터
const ANALYSIS_STEPS = [
  { delay: 0, text: 'TIER 1: 기본 사주 분석' },
  { delay: 0.8, text: 'TIER 2: 대운/세운 분석' },
  { delay: 1.6, text: 'TIER 3: 월운/일진 분석' },
  { delay: 2.4, text: 'TIER 4: 충/합/형 관계 분석' },
  { delay: 3.2, text: 'TIER 5: 정밀 시간 분석' },
] as const;

export function AnalyzingLoader({ eventType, message }: AnalyzingLoaderProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  // 진행률 자동 업데이트
  useEffect(() => {
    const stepInterval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev < ANALYSIS_STEPS.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 1200);

    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev < 95) {
          return prev + Math.random() * 3 + 1;
        }
        return prev;
      });
    }, 200);

    return () => {
      clearInterval(stepInterval);
      clearInterval(progressInterval);
    };
  }, []);

  // 랜덤 메시지 선택 (컴포넌트 마운트 시 한 번만)
  const displayMessage = useMemo(
    () => message || ANALYZING_MESSAGES[Math.floor(Math.random() * ANALYZING_MESSAGES.length)],
    [message]
  );

  const icon = EVENT_ICONS[eventType ?? ''] ?? '🔮';
  const title = EVENT_TITLES[eventType ?? ''] ?? '인생 타이밍';

  return (
    <motion.div
      className={styles.analyzerContainer}
      variants={loaderVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {/* 아이콘 */}
      <motion.div
        className={styles.analyzerIcon}
        animate={{
          scale: [1, 1.1, 1],
          rotate: [0, 5, -5, 0],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        {icon}
      </motion.div>

      {/* 타이틀 */}
      <h2 className={styles.analyzerTitle}>
        {title}을 분석 중입니다
      </h2>

      {/* 서브타이틀 */}
      <p className={styles.analyzerSubtitle}>
        {displayMessage}
      </p>

      {/* 진행률 바 */}
      <div className={styles.progressContainer}>
        <div className={styles.progressBar}>
          <motion.div
            className={styles.progressFill}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(progress, 95)}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
        </div>
        <span className={styles.progressText}>{Math.round(Math.min(progress, 95))}%</span>
      </div>

      {/* 분석 단계 표시 */}
      <motion.div
        className={styles.analysisStepsContainer}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        {ANALYSIS_STEPS.map((step, index) => (
          <AnalysisStepWithStatus
            key={step.text}
            text={step.text}
            status={index < currentStep ? 'done' : index === currentStep ? 'active' : 'pending'}
          />
        ))}
      </motion.div>
    </motion.div>
  );
}

function AnalysisStepWithStatus({ text, status }: { text: string; status: 'done' | 'active' | 'pending' }) {
  const statusIcon = status === 'done' ? '✓' : status === 'active' ? '◈' : '○';
  const statusClass = status === 'done' ? styles.stepDone : status === 'active' ? styles.stepActive : styles.stepPending;

  return (
    <motion.div
      className={`${styles.analysisStep} ${statusClass}`}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.span
        className={styles.stepIcon}
        animate={status === 'active' ? { opacity: [0.5, 1, 0.5], scale: [1, 1.2, 1] } : {}}
        transition={{ duration: 1, repeat: Infinity }}
      >
        {statusIcon}
      </motion.span>
      {text}
    </motion.div>
  );
}

export default AnalyzingLoader;
