'use client';

import React, { useMemo } from 'react';
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

      {/* 로딩 도트 */}
      <div className={styles.analyzerDots}>
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className={styles.analyzerDot}
            animate={{
              y: [0, -15, 0],
            }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: i * 0.15,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>

      {/* 분석 단계 표시 */}
      <motion.div
        className={styles.analysisStepsContainer}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        {ANALYSIS_STEPS.map((step) => (
          <AnalysisStep key={step.text} delay={step.delay} text={step.text} />
        ))}
      </motion.div>
    </motion.div>
  );
}

function AnalysisStep({ delay, text }: { delay: number; text: string }) {
  return (
    <motion.div
      className={styles.analysisStep}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.4 }}
    >
      <motion.span
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity, delay }}
      >
        ◈
      </motion.span>
      {text}
    </motion.div>
  );
}

export default AnalyzingLoader;
