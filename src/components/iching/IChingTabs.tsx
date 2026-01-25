// components/iching/IChingTabs.tsx
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import IChingReader from './IChingReader';
import { useI18n } from '@/i18n/I18nProvider';
import styles from './IChingTabs.module.css';

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
    labelKey: 'iching.tabs.reading',
    labelDefault: 'I Ching Reading',
    icon: '☯️',
    descKey: 'iching.tabs.readingDesc',
    descDefault: 'Cast the oracle and receive ancient wisdom'
  },
  {
    id: 'about',
    labelKey: 'iching.tabs.about',
    labelDefault: 'About I Ching',
    icon: '📖',
    descKey: 'iching.tabs.aboutDesc',
    descDefault: 'Learn about the Book of Changes'
  }
];

export default function IChingTabs() {
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
                layoutId="activeTabIChing"
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
          {activeTab === 'reading' && <IChingReader />}
          {activeTab === 'about' && <AboutIChing />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function AboutIChing() {
  const { t } = useI18n();

  return (
    <div className={styles.aboutContainer}>
      <div className={styles.aboutSection}>
        <h3 className={styles.aboutTitle}>
          <span className={styles.aboutIcon}>📜</span>
          {t('iching.about.whatIsTitle', 'What is I Ching?')}
        </h3>
        <p className={styles.aboutText}>
          {t('iching.about.whatIsText', 'The I Ching, or Book of Changes, is one of the oldest and most profound wisdom texts in human history. Dating back over 3,000 years, it has guided emperors, scholars, and seekers of truth through life\'s complexities.')}
        </p>
      </div>

      <div className={styles.aboutSection}>
        <h3 className={styles.aboutTitle}>
          <span className={styles.aboutIcon}>☯️</span>
          {t('iching.about.hexagramsTitle', 'The 64 Hexagrams')}
        </h3>
        <p className={styles.aboutText}>
          {t('iching.about.hexagramsText', 'The I Ching consists of 64 hexagrams, each made of six lines that can be solid (Yang) or broken (Yin). These hexagrams represent all possible situations and transformations in the universe.')}
        </p>
      </div>

      <div className={styles.aboutSection}>
        <h3 className={styles.aboutTitle}>
          <span className={styles.aboutIcon}>🪙</span>
          {t('iching.about.castingTitle', 'How It Works')}
        </h3>
        <p className={styles.aboutText}>
          {t('iching.about.castingText', 'Traditionally cast with yarrow stalks or three coins, the I Ching responds to your sincere questions. The resulting hexagram offers wisdom about your current situation and potential changes ahead.')}
        </p>
      </div>

      <div className={styles.aboutSection}>
        <h3 className={styles.aboutTitle}>
          <span className={styles.aboutIcon}>🔄</span>
          {t('iching.about.changingTitle', 'Changing Lines')}
        </h3>
        <p className={styles.aboutText}>
          {t('iching.about.changingText', 'Some lines may be "changing" - transforming from Yin to Yang or vice versa. These changing lines reveal the dynamic nature of your situation and point toward future developments.')}
        </p>
      </div>
    </div>
  );
}
