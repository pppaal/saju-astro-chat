// components/icp/ICPStyleCard.tsx
/**
 * ICP 스타일 카드 컴포넌트
 * 개별 옥탄트 스타일의 상세 정보를 표시
 */
'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './ICPStyleCard.module.css';

interface ICPStyleCardProps {
  code: string;
  name: string;
  korean: string;
  traits: string[];
  shadow: string;
  score: number;
  isPrimary?: boolean;
  isSecondary?: boolean;
  description?: string;
  growthTips?: string[];
}

export default function ICPStyleCard({
  code,
  name,
  korean,
  traits,
  shadow,
  score,
  isPrimary = false,
  isSecondary = false,
  description,
  growthTips = [],
}: ICPStyleCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const cardClass = `${styles.card} ${isPrimary ? styles.primary : ''} ${isSecondary ? styles.secondary : ''}`;

  return (
    <motion.div
      className={cardClass}
      onClick={() => setIsExpanded(!isExpanded)}
      whileHover={{ scale: 1.02 }}
      layout
    >
      <div className={styles.header}>
        <div className={styles.codeWrapper}>
          <span className={styles.code}>{code}</span>
          {isPrimary && <span className={styles.badge}>주요</span>}
          {isSecondary && <span className={styles.badgeSecondary}>부가</span>}
        </div>
        <div className={styles.scoreBar}>
          <motion.div
            className={styles.scoreFill}
            initial={{ width: 0 }}
            animate={{ width: `${score * 100}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
        <span className={styles.scoreLabel}>{Math.round(score * 100)}%</span>
      </div>

      <h3 className={styles.title}>
        {korean}
        <span className={styles.subtitle}>{name}</span>
      </h3>

      <div className={styles.traits}>
        {traits.map((trait, idx) => (
          <span key={idx} className={styles.trait}>
            {trait}
          </span>
        ))}
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            className={styles.expanded}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            {description && (
              <p className={styles.description}>{description}</p>
            )}

            <div className={styles.shadowSection}>
              <span className={styles.shadowLabel}>그림자 측면:</span>
              <span className={styles.shadowText}>{shadow}</span>
            </div>

            {growthTips.length > 0 && (
              <div className={styles.growthSection}>
                <h4 className={styles.growthTitle}>성장 포인트</h4>
                <ul className={styles.growthList}>
                  {growthTips.map((tip, idx) => (
                    <li key={idx}>{tip}</li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <button className={styles.toggleBtn}>
        {isExpanded ? '접기 ▲' : '더보기 ▼'}
      </button>
    </motion.div>
  );
}
