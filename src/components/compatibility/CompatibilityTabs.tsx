// components/compatibility/CompatibilityTabs.tsx
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useI18n } from '@/i18n/I18nProvider';
import styles from './CompatibilityTabs.module.css';

type TabType = 'analysis' | 'about';

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
    id: 'analysis',
    labelKey: 'compatibility.tabs.analysis',
    labelDefault: 'Compatibility',
    icon: '💕',
    descKey: 'compatibility.tabs.analysisDesc',
    descDefault: 'Analyze relationship compatibility through astrological birth data'
  },
  {
    id: 'about',
    labelKey: 'compatibility.tabs.about',
    labelDefault: 'About',
    icon: '📖',
    descKey: 'compatibility.tabs.aboutDesc',
    descDefault: 'Learn about compatibility analysis and relationship astrology'
  }
];

interface CompatibilityTabsProps {
  onStartAnalysis: () => void;
}

export default function CompatibilityTabs({ onStartAnalysis }: CompatibilityTabsProps) {
  const { t, locale } = useI18n();
  const [activeTab, setActiveTab] = useState<TabType>('analysis');

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
                layoutId="activeTabCompatibility"
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
          {activeTab === 'analysis' && <CompatibilityIntro onStart={onStartAnalysis} locale={locale} t={t} />}
          {activeTab === 'about' && <AboutCompatibility t={t} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function CompatibilityIntro({ onStart, locale, t }: { onStart: () => void; locale: string; t: (key: string, fallback: string) => string }) {
  return (
    <div className={styles.introContainer}>
      <div className={styles.introIcon}>💕</div>
      <h2 className={styles.introTitle}>
        {t('compatibility.intro.title', 'Discover Your Connection')}
      </h2>
      <p className={styles.introText}>
        {t('compatibility.intro.text', 'Explore the cosmic bonds between hearts. Our analysis combines Eastern astrology traditions with modern relationship psychology to reveal your compatibility patterns.')}
      </p>
      <motion.button
        className={styles.startButton}
        onClick={onStart}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {locale === 'ko' ? '궁합 분석 시작하기' : 'Start Compatibility Analysis'}
      </motion.button>
    </div>
  );
}

function AboutCompatibility({ t }: { t: (key: string, fallback: string) => string }) {
  return (
    <div className={styles.aboutContainer}>
      <div className={styles.aboutSection}>
        <h3 className={styles.aboutTitle}>
          <span className={styles.aboutIcon}>💫</span>
          {t('compatibility.about.whatIsTitle', 'What is Compatibility Analysis?')}
        </h3>
        <p className={styles.aboutText}>
          {t('compatibility.about.whatIsText', 'Compatibility analysis examines how two or more people\'s astrological charts interact. By comparing birth charts, we can identify harmonious and challenging aspects in relationships.')}
        </p>
      </div>

      <div className={styles.aboutSection}>
        <h3 className={styles.aboutTitle}>
          <span className={styles.aboutIcon}>🏮</span>
          {t('compatibility.about.easternTitle', 'Eastern Compatibility Traditions')}
        </h3>
        <p className={styles.aboutText}>
          {t('compatibility.about.easternText', 'In Korean and Chinese traditions, compatibility is analyzed through the Four Pillars (Saju/BaZi). The interaction between year, month, day, and hour pillars reveals relationship dynamics, challenges, and potential.')}
        </p>
      </div>

      <div className={styles.aboutSection}>
        <h3 className={styles.aboutTitle}>
          <span className={styles.aboutIcon}>⚖️</span>
          {t('compatibility.about.elementsTitle', 'Elemental Harmony')}
        </h3>
        <p className={styles.aboutText}>
          {t('compatibility.about.elementsText', 'The Five Elements (Wood, Fire, Earth, Metal, Water) play a crucial role. Some element combinations naturally support each other, while others create tension. Understanding these dynamics helps navigate relationships.')}
        </p>
      </div>

      <div className={styles.aboutSection}>
        <h3 className={styles.aboutTitle}>
          <span className={styles.aboutIcon}>💝</span>
          {t('compatibility.about.useTitle', 'How to Use This Analysis')}
        </h3>
        <p className={styles.aboutText}>
          {t('compatibility.about.useText', 'Compatibility analysis is a guide, not a verdict. High compatibility doesn\'t guarantee success, and lower scores don\'t mean failure. Use insights to understand patterns, improve communication, and grow together.')}
        </p>
      </div>
    </div>
  );
}
