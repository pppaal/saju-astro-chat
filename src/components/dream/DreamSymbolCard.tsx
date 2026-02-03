'use client';

import React, { useState, useMemo, useCallback, memo } from 'react';
import { motion } from 'framer-motion';
import styles from './DreamSymbolCard.module.css';

export interface SymbolInterpretation {
  jung?: string;
  stoic?: string;
  tarot?: string;
}

export interface DreamSymbolCardProps {
  symbol: string;
  meaning: string;
  interpretations?: SymbolInterpretation;
  color?: string;
  locale?: 'ko' | 'en';
}

const DreamSymbolCard = memo(function DreamSymbolCard({
  symbol,
  meaning,
  interpretations,
  color = '#6366f1',
  locale = 'ko',
}: DreamSymbolCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  const handleFlip = useCallback(() => {
    setIsFlipped((prev) => !prev);
  }, []);

  // Gradient 스타일 메모이제이션
  const frontGradient = useMemo(
    () => `linear-gradient(135deg, ${color}20, ${color}40)`,
    [color]
  );
  const backGradient = useMemo(
    () => `linear-gradient(135deg, ${color}30, ${color}50)`,
    [color]
  );
  const glowGradient = useMemo(
    () => `radial-gradient(circle, ${color}30, transparent)`,
    [color]
  );
  const borderColor = useMemo(() => `${color}60`, [color]);
  const borderColorBack = useMemo(() => `${color}70`, [color]);

  return (
    <div className={styles.cardContainer}>
      <motion.div
        className={styles.card}
        onClick={handleFlip}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, type: 'spring', stiffness: 100 }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Front Side */}
        <div
          className={styles.cardFront}
          style={{
            background: frontGradient,
            borderColor: borderColor,
          }}
        >
          <div className={styles.frontContent}>
            <div className={styles.symbolIcon}>✨</div>
            <h3 className={styles.symbolName}>{symbol}</h3>
            <p className={styles.symbolMeaning}>{meaning}</p>
            <div className={styles.flipHint}>
              <span className={styles.flipIcon}>🔄</span>
              <span className={styles.flipText}>
                {locale === 'ko' ? '뒤집어보기' : 'Flip'}
              </span>
            </div>
          </div>
          <div
            className={styles.cardGlow}
            style={{ background: glowGradient }}
          />
        </div>

        {/* Back Side */}
        <div
          className={styles.cardBack}
          style={{
            background: backGradient,
            borderColor: borderColorBack,
          }}
        >
          <div className={styles.backContent}>
            <div className={styles.backHeader}>
              <div className={styles.backIcon}>🔮</div>
              <h4 className={styles.backTitle}>{symbol}</h4>
            </div>

            {interpretations && (
              <div className={styles.interpretations}>
                {interpretations.jung && (
                  <div className={styles.interpretation}>
                    <div className={styles.interpretationHeader}>
                      <span className={styles.interpretationIcon}>👤</span>
                      <span className={styles.interpretationLabel}>
                        {locale === 'ko' ? '융 심리학' : 'Jungian'}
                      </span>
                    </div>
                    <p className={styles.interpretationText}>{interpretations.jung}</p>
                  </div>
                )}

                {interpretations.stoic && (
                  <div className={styles.interpretation}>
                    <div className={styles.interpretationHeader}>
                      <span className={styles.interpretationIcon}>🏛️</span>
                      <span className={styles.interpretationLabel}>
                        {locale === 'ko' ? '스토아 철학' : 'Stoic'}
                      </span>
                    </div>
                    <p className={styles.interpretationText}>{interpretations.stoic}</p>
                  </div>
                )}

                {interpretations.tarot && (
                  <div className={styles.interpretation}>
                    <div className={styles.interpretationHeader}>
                      <span className={styles.interpretationIcon}>🃏</span>
                      <span className={styles.interpretationLabel}>
                        {locale === 'ko' ? '타로' : 'Tarot'}
                      </span>
                    </div>
                    <p className={styles.interpretationText}>{interpretations.tarot}</p>
                  </div>
                )}
              </div>
            )}

            <div className={styles.flipBackHint}>
              <span className={styles.flipIcon}>🔄</span>
              <span className={styles.flipText}>
                {locale === 'ko' ? '앞으로 돌아가기' : 'Flip Back'}
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
});

export default DreamSymbolCard;
