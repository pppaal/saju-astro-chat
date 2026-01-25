// components/dream/DreamTabs.tsx
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useI18n } from '@/i18n/I18nProvider';
import styles from './DreamTabs.module.css';

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
    labelKey: 'dream.tabs.reading',
    labelDefault: 'Dream Interpretation',
    icon: '🌙',
    descKey: 'dream.tabs.readingDesc',
    descDefault: 'Discover the hidden meanings in your dreams'
  },
  {
    id: 'about',
    labelKey: 'dream.tabs.about',
    labelDefault: 'About Dreams',
    icon: '📖',
    descKey: 'dream.tabs.aboutDesc',
    descDefault: 'Learn about dream interpretation and symbolism'
  }
];

interface DreamTabsProps {
  onStartReading: () => void;
}

export default function DreamTabs({ onStartReading }: DreamTabsProps) {
  const { t, locale } = useI18n();
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
                layoutId="activeTabDream"
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
          {activeTab === 'reading' && <DreamReadingIntro onStart={onStartReading} locale={locale} t={t} />}
          {activeTab === 'about' && <AboutDreams t={t} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function DreamReadingIntro({ onStart, locale, t }: { onStart: () => void; locale: string; t: (key: string, fallback: string) => string }) {
  return (
    <div className={styles.introContainer}>
      <div className={styles.introIcon}>🌙</div>
      <h2 className={styles.introTitle}>
        {t('dream.intro.title', 'What did you dream?')}
      </h2>
      <p className={styles.introText}>
        {t('dream.intro.text', 'Share your dream and discover its hidden meanings through ancient wisdom and modern psychology. Our AI combines Eastern dream interpretation with Western symbolism for deep insights.')}
      </p>
      <motion.button
        className={styles.startButton}
        onClick={onStart}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {locale === 'ko' ? '꿈 해석 시작하기' : 'Start Dream Interpretation'}
      </motion.button>
    </div>
  );
}

function AboutDreams({ t }: { t: (key: string, fallback: string) => string }) {
  return (
    <div className={styles.aboutContainer}>
      <div className={styles.aboutSection}>
        <h3 className={styles.aboutTitle}>
          <span className={styles.aboutIcon}>🌌</span>
          {t('dream.about.whatIsTitle', 'What is Dream Interpretation?')}
        </h3>
        <p className={styles.aboutText}>
          {t('dream.about.whatIsText', 'Dream interpretation is the process of discovering hidden meanings in dreams. Throughout history, cultures worldwide have believed dreams carry messages from the subconscious mind or spiritual realms.')}
        </p>
      </div>

      <div className={styles.aboutSection}>
        <h3 className={styles.aboutTitle}>
          <span className={styles.aboutIcon}>🏮</span>
          {t('dream.about.easternTitle', 'Eastern Dream Wisdom')}
        </h3>
        <p className={styles.aboutText}>
          {t('dream.about.easternText', 'In Korean and Chinese traditions, dreams are seen as omens and messages. Certain symbols like dragons, water, or ancestors carry specific meanings related to fortune, relationships, and life paths.')}
        </p>
      </div>

      <div className={styles.aboutSection}>
        <h3 className={styles.aboutTitle}>
          <span className={styles.aboutIcon}>🧠</span>
          {t('dream.about.psychologyTitle', 'Dream Psychology')}
        </h3>
        <p className={styles.aboutText}>
          {t('dream.about.psychologyText', 'Modern psychology views dreams as windows to the unconscious mind. Carl Jung believed dreams reveal archetypes and shadow aspects of our psyche, helping us understand ourselves more deeply.')}
        </p>
      </div>

      <div className={styles.aboutSection}>
        <h3 className={styles.aboutTitle}>
          <span className={styles.aboutIcon}>✨</span>
          {t('dream.about.symbolsTitle', 'Common Dream Symbols')}
        </h3>
        <p className={styles.aboutText}>
          {t('dream.about.symbolsText', 'Flying often represents freedom and ambition. Water reflects emotions and the unconscious. Teeth falling out may indicate anxiety about appearance or communication. Each symbol gains meaning from your personal context.')}
        </p>
      </div>
    </div>
  );
}
