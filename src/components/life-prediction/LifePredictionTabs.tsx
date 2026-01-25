// components/life-prediction/LifePredictionTabs.tsx
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useI18n } from '@/i18n/I18nProvider';
import styles from './LifePredictionTabs.module.css';

type TabType = 'prediction' | 'about';

interface Tab {
  id: TabType;
  labelKey: string;
  labelDefault: string;
  icon: string;
  descKey: string;
  descDefault: string;
}

const tabsConfig: Tab[] = [
  {
    id: 'prediction',
    labelKey: 'lifePrediction.tabs.prediction',
    labelDefault: 'Life Prediction',
    icon: '🔮',
    descKey: 'lifePrediction.tabs.predictionDesc',
    descDefault: 'Discover the best timing for your life decisions'
  },
  {
    id: 'about',
    labelKey: 'lifePrediction.tabs.about',
    labelDefault: 'About',
    icon: '📖',
    descKey: 'lifePrediction.tabs.aboutDesc',
    descDefault: 'Learn about life timing analysis and auspicious periods'
  }
];

interface LifePredictionTabsProps {
  onStartPrediction: () => void;
}

export default function LifePredictionTabs({ onStartPrediction }: LifePredictionTabsProps) {
  const { t, locale } = useI18n();
  const [activeTab, setActiveTab] = useState<TabType>('prediction');

  const activeTabConfig = tabsConfig.find(tab => tab.id === activeTab);

  return (
    <div className={styles.container}>
      {/* Tab Headers */}
      <div className={styles.tabHeaders}>
        {tabsConfig.map((tab) => (
          <motion.button
            key={tab.id}
            className={`${styles.tabButton} ${activeTab === tab.id ? styles.active : ''}`}
            onClick={() => setActiveTab(tab.id)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className={styles.tabIcon}>{tab.icon}</span>
            <span className={styles.tabLabel}>{t(tab.labelKey, tab.labelDefault)}</span>
            {activeTab === tab.id && (
              <motion.div
                className={styles.activeIndicator}
                layoutId="activeTabLifePrediction"
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
            )}
          </motion.button>
        ))}
      </div>

      {/* Tab Description */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          className={styles.tabDescription}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTabConfig && t(activeTabConfig.descKey, activeTabConfig.descDefault)}
        </motion.div>
      </AnimatePresence>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          className={styles.tabContent}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'prediction' && <LifePredictionIntro onStart={onStartPrediction} locale={locale} t={t} />}
          {activeTab === 'about' && <AboutLifePrediction t={t} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function LifePredictionIntro({ onStart, locale, t }: { onStart: () => void; locale: string; t: (key: string, fallback: string) => string }) {
  return (
    <div className={styles.introContainer}>
      <div className={styles.introIcon}>🔮</div>
      <h2 className={styles.introTitle}>
        {t('lifePrediction.intro.title', 'When is the Right Time?')}
      </h2>
      <p className={styles.introText}>
        {t('lifePrediction.intro.text', 'From marriage and career moves to investments and major life changes, discover the most auspicious timing based on your personal astrology. Get personalized predictions for the next 12 months.')}
      </p>
      <motion.button
        className={styles.startButton}
        onClick={onStart}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {locale === 'ko' ? '인생운 분석 시작하기' : 'Start Life Prediction'}
      </motion.button>
    </div>
  );
}

function AboutLifePrediction({ t }: { t: (key: string, fallback: string) => string }) {
  return (
    <div className={styles.aboutContainer}>
      <div className={styles.aboutSection}>
        <h3 className={styles.aboutTitle}>
          <span className={styles.aboutIcon}>⏰</span>
          {t('lifePrediction.about.whatIsTitle', 'What is Life Timing Analysis?')}
        </h3>
        <p className={styles.aboutText}>
          {t('lifePrediction.about.whatIsText', 'Life timing analysis uses your birth chart to identify favorable and challenging periods for different activities. It helps you make decisions aligned with cosmic rhythms.')}
        </p>
      </div>

      <div className={styles.aboutSection}>
        <h3 className={styles.aboutTitle}>
          <span className={styles.aboutIcon}>📅</span>
          {t('lifePrediction.about.luckyDaysTitle', 'Understanding Auspicious Days')}
        </h3>
        <p className={styles.aboutText}>
          {t('lifePrediction.about.luckyDaysText', 'In Korean astrology, certain days align better with your personal energy based on the interaction between your birth pillars and the current day\'s energy. We analyze these patterns to find optimal timing.')}
        </p>
      </div>

      <div className={styles.aboutSection}>
        <h3 className={styles.aboutTitle}>
          <span className={styles.aboutIcon}>🎯</span>
          {t('lifePrediction.about.eventTypesTitle', 'Types of Life Events')}
        </h3>
        <p className={styles.aboutText}>
          {t('lifePrediction.about.eventTypesText', 'We provide timing analysis for marriage, career changes, starting a business, investments, travel, moving, health initiatives, and more. Each event type has different astrological considerations.')}
        </p>
      </div>

      <div className={styles.aboutSection}>
        <h3 className={styles.aboutTitle}>
          <span className={styles.aboutIcon}>💡</span>
          {t('lifePrediction.about.howToUseTitle', 'How to Use Predictions')}
        </h3>
        <p className={styles.aboutText}>
          {t('lifePrediction.about.howToUseText', 'Use our predictions as guidance, not absolute rules. Consider practical factors alongside timing recommendations. The best results come from combining good timing with thoughtful planning and effort.')}
        </p>
      </div>
    </div>
  );
}
