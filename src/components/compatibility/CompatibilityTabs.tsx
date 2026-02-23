// components/compatibility/CompatibilityTabs.tsx
'use client';

import { useState, useMemo, memo, useCallback } from 'react';
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
    icon: '\u{1F495}',
    descKey: 'compatibility.tabs.analysisDesc',
    descDefault: 'Analyze relationship compatibility through astrological birth data',
  },
  {
    id: 'about',
    labelKey: 'compatibility.tabs.about',
    labelDefault: 'About',
    icon: '\u{1F4D6}',
    descKey: 'compatibility.tabs.aboutDesc',
    descDefault: 'Learn about compatibility analysis and relationship astrology',
  },
];

interface CompatibilityTabsProps {
  onStartAnalysis: () => void;
  t?: (key: string, fallback: string) => string;
  locale?: 'ko' | 'en';
}

const KO_TAB_FALLBACKS: Record<string, string> = {
  'compatibility.tabs.analysis': '궁합',
  'compatibility.tabs.analysisDesc': '출생 데이터를 바탕으로 관계 궁합을 분석합니다',
  'compatibility.tabs.about': '안내',
  'compatibility.tabs.aboutDesc': '궁합 분석 방식과 해석 기준을 소개합니다',
  'compatibility.intro.title': '우리의 연결 살펴보기',
  'compatibility.intro.text': '동양 사주와 서양 점성을 함께 분석해 관계 패턴과 실천 포인트를 알려드립니다.',
  'compatibility.intro.start': '궁합 분석 시작하기',
  'compatibility.about.whatIsTitle': '궁합 분석이란?',
  'compatibility.about.whatIsText': '궁합 분석은 두 사람의 출생 정보를 비교해 조화 신호와 갈등 가능성을 함께 읽는 과정입니다.',
  'compatibility.about.easternTitle': '동양 궁합 관점',
  'compatibility.about.easternText': '사주(사주팔자)의 구조와 오행 흐름을 통해 관계의 기본 리듬을 확인합니다.',
  'compatibility.about.elementsTitle': '원소/오행 균형',
  'compatibility.about.elementsText': '원소와 오행의 균형으로 관계의 안정 구간과 마찰 구간을 파악할 수 있습니다.',
  'compatibility.about.useTitle': '활용 방법',
  'compatibility.about.useText': '점수는 판정이 아니라 가이드입니다. 강점은 유지하고 약점은 대화로 조율하세요.',
};

function CompatibilityTabs({ onStartAnalysis, t: externalT, locale: externalLocale }: CompatibilityTabsProps) {
  const { t: i18nT, locale: i18nLocale } = useI18n();
  const locale: 'ko' | 'en' = (externalLocale || i18nLocale).toLowerCase().startsWith('ko') ? 'ko' : 'en';
  const t = externalT || i18nT;
  const [activeTab, setActiveTab] = useState<TabType>('analysis');

  const tt = useCallback(
    (key: string, fallback: string) =>
      locale === 'ko' ? t(key, KO_TAB_FALLBACKS[key] || fallback) : t(key, fallback),
    [locale, t]
  );

  const activeTabConfig = useMemo(
    () => tabsConfig.find((tab) => tab.id === activeTab),
    [activeTab]
  );

  const handleTabChange = useCallback((tabId: TabType) => {
    setActiveTab(tabId);
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.tabHeaders}>
        {tabsConfig.map((tab) => (
          <motion.button
            key={tab.id}
            className={`${styles.tabButton} ${activeTab === tab.id ? styles.active : ''}`}
            onClick={() => handleTabChange(tab.id)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className={styles.tabIcon}>{tab.icon}</span>
            <span className={styles.tabLabel}>{tt(tab.labelKey, tab.labelDefault)}</span>
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

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          className={styles.tabDescription}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTabConfig && tt(activeTabConfig.descKey, activeTabConfig.descDefault)}
        </motion.div>
      </AnimatePresence>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          className={styles.tabContent}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'analysis' && <CompatibilityIntro onStart={onStartAnalysis} locale={locale} t={tt} />}
          {activeTab === 'about' && <AboutCompatibility t={tt} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

const CompatibilityIntro = memo(
  ({ onStart, locale, t }: { onStart: () => void; locale: 'ko' | 'en'; t: (key: string, fallback: string) => string }) => {
    const buttonText = useMemo(
      () => t('compatibility.intro.start', locale === 'ko' ? '궁합 분석 시작하기' : 'Start Compatibility Analysis'),
      [locale, t]
    );

    return (
      <div className={styles.introContainer}>
        <div className={styles.introIcon}>{'\u{1F495}'}</div>
        <h2 className={styles.introTitle}>{t('compatibility.intro.title', 'Discover Your Connection')}</h2>
        <p className={styles.introText}>
          {t(
            'compatibility.intro.text',
            'Explore the cosmic bonds between hearts. Our analysis combines Eastern astrology traditions with modern relationship psychology to reveal your compatibility patterns.'
          )}
        </p>
        <motion.button
          className={styles.startButton}
          onClick={onStart}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {buttonText}
        </motion.button>
      </div>
    );
  }
);
CompatibilityIntro.displayName = 'CompatibilityIntro';

const AboutCompatibility = memo(({ t }: { t: (key: string, fallback: string) => string }) => {
  return (
    <div className={styles.aboutContainer}>
      <div className={styles.aboutSection}>
        <h3 className={styles.aboutTitle}>
          <span className={styles.aboutIcon}>{'\u{1F4AB}'}</span>
          {t('compatibility.about.whatIsTitle', 'What is Compatibility Analysis?')}
        </h3>
        <p className={styles.aboutText}>
          {t(
            'compatibility.about.whatIsText',
            "Compatibility analysis examines how two or more people's astrological charts interact. By comparing birth charts, we can identify harmonious and challenging aspects in relationships."
          )}
        </p>
      </div>

      <div className={styles.aboutSection}>
        <h3 className={styles.aboutTitle}>
          <span className={styles.aboutIcon}>{'\u{1F3EE}'}</span>
          {t('compatibility.about.easternTitle', 'Eastern Compatibility Traditions')}
        </h3>
        <p className={styles.aboutText}>
          {t(
            'compatibility.about.easternText',
            'In Korean and Chinese traditions, compatibility is analyzed through the Four Pillars (Saju/BaZi). The interaction between year, month, day, and hour pillars reveals relationship dynamics, challenges, and potential.'
          )}
        </p>
      </div>

      <div className={styles.aboutSection}>
        <h3 className={styles.aboutTitle}>
          <span className={styles.aboutIcon}>{'\u2696\uFE0F'}</span>
          {t('compatibility.about.elementsTitle', 'Elemental Harmony')}
        </h3>
        <p className={styles.aboutText}>
          {t(
            'compatibility.about.elementsText',
            'The Five Elements (Wood, Fire, Earth, Metal, Water) play a crucial role. Some element combinations naturally support each other, while others create tension. Understanding these dynamics helps navigate relationships.'
          )}
        </p>
      </div>

      <div className={styles.aboutSection}>
        <h3 className={styles.aboutTitle}>
          <span className={styles.aboutIcon}>{'\u{1F49D}'}</span>
          {t('compatibility.about.useTitle', 'How to Use This Analysis')}
        </h3>
        <p className={styles.aboutText}>
          {t(
            'compatibility.about.useText',
            "Compatibility analysis is a guide, not a verdict. High compatibility doesn't guarantee success, and lower scores don't mean failure. Use insights to understand patterns, improve communication, and grow together."
          )}
        </p>
      </div>
    </div>
  );
});
AboutCompatibility.displayName = 'AboutCompatibility';

export default CompatibilityTabs;
