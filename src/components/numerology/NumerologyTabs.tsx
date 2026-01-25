// components/numerology/NumerologyTabs.tsx
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import NumerologyAnalyzer from './NumerologyAnalyzer';
import CompatibilityAnalyzer from './CompatibilityAnalyzer';
import LuckyNumbers from './LuckyNumbers';
import { useI18n } from '@/i18n/I18nProvider';
import styles from './NumerologyTabs.module.css';

type TabType = 'personal' | 'compatibility' | 'lucky' | 'about';

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
    id: 'personal',
    labelKey: 'numerology.tabs.personal',
    labelDefault: 'Personal Analysis',
    icon: '👤',
    descKey: 'numerology.tabs.personalDesc',
    descDefault: 'Analyze your life path with your birth date and name'
  },
  {
    id: 'compatibility',
    labelKey: 'numerology.tabs.compatibility',
    labelDefault: 'Compatibility',
    icon: '💑',
    descKey: 'numerology.tabs.compatibilityDesc',
    descDefault: 'Check the numerology compatibility between two people'
  },
  {
    id: 'lucky',
    labelKey: 'numerology.tabs.lucky',
    labelDefault: 'Lucky Numbers',
    icon: '🍀',
    descKey: 'numerology.tabs.luckyDesc',
    descDefault: 'Find your lucky numbers'
  },
  {
    id: 'about',
    labelKey: 'numerology.tabs.about',
    labelDefault: 'About',
    icon: '📖',
    descKey: 'numerology.tabs.aboutDesc',
    descDefault: 'Learn about numerology and its meanings'
  }
];

export default function NumerologyTabs() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<TabType>('personal');

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
          {activeTab === 'personal' && <NumerologyAnalyzer />}
          {activeTab === 'compatibility' && <CompatibilityAnalyzer />}
          {activeTab === 'lucky' && <LuckyNumbers />}
          {activeTab === 'about' && <AboutNumerology />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function AboutNumerology() {
  const { t } = useI18n();

  return (
    <div className={styles.aboutContainer}>
      <div className={styles.aboutSection}>
        <h3 className={styles.aboutTitle}>
          <span className={styles.aboutIcon}>🔢</span>
          {t('numerology.about.whatIsTitle', 'What is Numerology?')}
        </h3>
        <p className={styles.aboutText}>
          {t('numerology.about.whatIsText', 'Numerology is an ancient practice that reveals the hidden meanings in numbers. By analyzing your birth date and name, we can uncover your life path, personality traits, and destiny.')}
        </p>
      </div>

      <div className={styles.aboutSection}>
        <h3 className={styles.aboutTitle}>
          <span className={styles.aboutIcon}>🛤️</span>
          {t('numerology.about.lifePathTitle', 'Life Path Number')}
        </h3>
        <p className={styles.aboutText}>
          {t('numerology.about.lifePathText', 'Your Life Path Number is the most important number in numerology. Derived from your birth date, it reveals your life purpose, natural talents, and the opportunities you\'ll encounter on your journey.')}
        </p>
      </div>

      <div className={styles.aboutSection}>
        <h3 className={styles.aboutTitle}>
          <span className={styles.aboutIcon}>✨</span>
          {t('numerology.about.masterTitle', 'Master Numbers')}
        </h3>
        <p className={styles.aboutText}>
          {t('numerology.about.masterText', 'Master Numbers (11, 22, 33) carry powerful vibrations and greater potential. They indicate souls with special missions and heightened spiritual awareness in this lifetime.')}
        </p>
      </div>

      <div className={styles.aboutSection}>
        <h3 className={styles.aboutTitle}>
          <span className={styles.aboutIcon}>📅</span>
          {t('numerology.about.cyclesTitle', 'Personal Year Cycles')}
        </h3>
        <p className={styles.aboutText}>
          {t('numerology.about.cyclesText', 'Numerology follows 9-year cycles. Your Personal Year number reveals the theme and energy of each year, helping you align with natural rhythms and make better decisions.')}
        </p>
      </div>
    </div>
  );
}
