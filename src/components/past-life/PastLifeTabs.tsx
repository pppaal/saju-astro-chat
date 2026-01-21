// components/past-life/PastLifeTabs.tsx
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PastLifeAnalyzer from './PastLifeAnalyzer';
import { useI18n } from '@/i18n/I18nProvider';
import styles from './PastLifeTabs.module.css';

type TabType = 'reading' | 'about';

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
    id: 'reading',
    labelKey: 'pastLife.tabs.reading',
    labelDefault: 'Past Life Reading',
    icon: '🔮',
    descKey: 'pastLife.tabs.readingDesc',
    descDefault: 'Discover your past lives based on your birth data'
  },
  {
    id: 'about',
    labelKey: 'pastLife.tabs.about',
    labelDefault: 'About Past Lives',
    icon: '📖',
    descKey: 'pastLife.tabs.aboutDesc',
    descDefault: 'Learn about past life readings and karmic patterns'
  }
];

export default function PastLifeTabs() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<TabType>('reading');

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
                layoutId="activeTab"
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
          {activeTab === 'reading' && <PastLifeAnalyzer />}
          {activeTab === 'about' && <AboutPastLife />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function AboutPastLife() {
  const { t } = useI18n();

  return (
    <div className={styles.aboutContainer}>
      <div className={styles.aboutSection}>
        <h3 className={styles.aboutTitle}>
          <span className={styles.aboutIcon}>🌀</span>
          {t('pastLife.about.whatIsTitle', 'What is Past Life Reading?')}
        </h3>
        <p className={styles.aboutText}>
          {t('pastLife.about.whatIsText', 'Past life reading explores your soul\'s journey through previous incarnations. Using the ancient wisdom of Eastern Saju (Four Pillars) and Western Astrology, we uncover karmic patterns, soul missions, and talents carried from past lives.')}
        </p>
      </div>

      <div className={styles.aboutSection}>
        <h3 className={styles.aboutTitle}>
          <span className={styles.aboutIcon}>☯️</span>
          {t('pastLife.about.sajuTitle', 'Saju & Past Lives')}
        </h3>
        <p className={styles.aboutText}>
          {t('pastLife.about.sajuText', 'In Saju, your Geokguk (personality type) and certain Shinsal (spiritual stars) reveal echoes of past life experiences. The Day Master shows your soul\'s essential nature that persists across lifetimes.')}
        </p>
      </div>

      <div className={styles.aboutSection}>
        <h3 className={styles.aboutTitle}>
          <span className={styles.aboutIcon}>☊</span>
          {t('pastLife.about.nodesTitle', 'Lunar Nodes & Karma')}
        </h3>
        <p className={styles.aboutText}>
          {t('pastLife.about.nodesText', 'The South Node represents your past life patterns and comfort zone, while the North Node shows your soul\'s growth direction in this lifetime. Saturn reveals karmic lessons you\'re here to master.')}
        </p>
      </div>

      <div className={styles.aboutSection}>
        <h3 className={styles.aboutTitle}>
          <span className={styles.aboutIcon}>💫</span>
          {t('pastLife.about.purposeTitle', 'Why Explore Past Lives?')}
        </h3>
        <p className={styles.aboutText}>
          {t('pastLife.about.purposeText', 'Understanding your past life patterns helps explain recurring themes in relationships, careers, and life challenges. It illuminates your soul\'s purpose and the gifts you\'ve developed over many lifetimes.')}
        </p>
      </div>
    </div>
  );
}
