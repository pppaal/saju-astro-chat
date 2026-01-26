import { motion } from 'framer-motion';
import styles from './AnalyzingPhase.module.css';

interface AnalyzingPhaseProps {
  locale: string;
  hasBirthInfo: boolean;
}

const pageTransitionVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.3 } },
};

export function AnalyzingPhase({ locale, hasBirthInfo }: AnalyzingPhaseProps) {
  return (
    <motion.div
      key="analyzing"
      variants={pageTransitionVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={styles.phaseContainer}
    >
      <div className={styles.analyzingContainer}>
        <div className={styles.analyzingOrb}>
          <span className={styles.analyzingIcon}>🌙</span>
          <div className={styles.orbRing}></div>
          <div className={styles.orbRing2}></div>
        </div>
        <h2 className={styles.analyzingTitle}>
          {locale === 'ko' ? '꿈을 해석하고 있어요' : 'Interpreting Your Dream'}
        </h2>
        <p className={styles.analyzingText}>
          {locale === 'ko'
            ? (hasBirthInfo
                ? '생년월일 정보를 바탕으로 분석 중입니다...'
                : '꿈의 상징과 의미를 분석하고 있습니다...')
            : (hasBirthInfo
                ? 'Analyzing based on your birth chart...'
                : 'Analyzing your dream details...')}
        </p>
        <div className={styles.analyzingDots}>
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </motion.div>
  );
}
