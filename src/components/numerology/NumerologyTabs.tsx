// components/numerology/NumerologyTabs.tsx
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import NumerologyAnalyzer from './NumerologyAnalyzer';
import CompatibilityAnalyzer from './CompatibilityAnalyzer';
import LuckyNumbers from './LuckyNumbers';
import { useI18n } from '@/i18n/I18nProvider';
import styles from './NumerologyTabs.module.css';

type TabType = 'personal' | 'compatibility' | 'lucky';

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
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
