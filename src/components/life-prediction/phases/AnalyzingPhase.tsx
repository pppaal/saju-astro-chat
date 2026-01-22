/**
 * AnalyzingPhase Component
 *
 * Third phase: Shows loading animation while analyzing prediction.
 */

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { AnalyzingLoader } from '@/components/life-prediction/ResultCards/AnalyzingLoader';
import { EventType } from '@/components/life-prediction/PredictionChat/hooks/useEventTypeDetector';
import { pageTransitionVariants } from '@/components/life-prediction/animations/cardAnimations';
import styles from '../life-prediction.module.css';

interface AnalyzingPhaseProps {
  /** Current event type being analyzed */
  eventType?: EventType | null;
}

/**
 * Analyzing phase component
 *
 * @example
 * ```tsx
 * <AnalyzingPhase eventType="career" />
 * ```
 */
export const AnalyzingPhase = React.memo<AnalyzingPhaseProps>(
  ({ eventType }) => {
    return (
      <motion.div
        key="analyzing"
        variants={pageTransitionVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className={styles.phaseContainer}
      >
        <AnalyzingLoader eventType={eventType || undefined} />
      </motion.div>
    );
  }
);

AnalyzingPhase.displayName = 'AnalyzingPhase';
