// components/past-life/PastLifeResults.tsx
'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useI18n } from '@/i18n/I18nProvider';
import styles from './PastLifeResults.module.css';
import type { PastLifeResult } from './PastLifeAnalyzer';

type TabId = 'overview' | 'pastLife' | 'journey' | 'karma' | 'mission';

interface Tab {
  id: TabId;
  labelKey: string;
  labelDefault: string;
  icon: string;
}

const tabsConfig: Tab[] = [
  { id: 'overview', labelKey: 'pastLife.results.overview', labelDefault: 'Overview', icon: '🌌' },
  { id: 'pastLife', labelKey: 'pastLife.results.pastLife', labelDefault: 'Past Life', icon: '🔮' },
  { id: 'journey', labelKey: 'pastLife.results.journey', labelDefault: 'Soul Journey', icon: '☊' },
  { id: 'karma', labelKey: 'pastLife.results.karma', labelDefault: 'Karmic Debts', icon: '⚖️' },
  { id: 'mission', labelKey: 'pastLife.results.mission', labelDefault: 'This Life', icon: '🌟' },
];

interface Props {
  result: PastLifeResult;
  onReset: () => void;
}

export default function PastLifeResults({ result, onReset }: Props) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  return (
    <div className={styles.container}>
      {/* Header with Score */}
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <motion.button
            className={styles.resetBtn}
            onClick={onReset}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            ← {t('pastLife.results.newReading', 'New Reading')}
          </motion.button>
        </div>

        <div className={styles.scoreCard}>
          <div className={styles.scoreEmoji}>{result.soulPattern.emoji}</div>
          <h2 className={styles.scoreTitle}>{result.soulPattern.title}</h2>
          <p className={styles.scoreType}>{result.soulPattern.type}</p>
          <div className={styles.scoreBar}>
            <div className={styles.scoreLabel}>
              {t('pastLife.results.karmaScore', 'Karma Exploration Index')}
            </div>
            <div className={styles.scoreTrack}>
              <motion.div
                className={styles.scoreFill}
                initial={{ width: 0 }}
                animate={{ width: `${result.karmaScore}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </div>
            <div className={styles.scoreValue}>{result.karmaScore}/100</div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className={styles.tabNav}>
        {tabsConfig.map((tab) => (
          <button
            key={tab.id}
            className={`${styles.tabBtn} ${activeTab === tab.id ? styles.active : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className={styles.tabIcon}>{tab.icon}</span>
            <span className={styles.tabLabel}>{t(tab.labelKey, tab.labelDefault)}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className={styles.tabContent}
        >
          {activeTab === 'overview' && <OverviewTab result={result} />}
          {activeTab === 'pastLife' && <PastLifeTab result={result} />}
          {activeTab === 'journey' && <JourneyTab result={result} />}
          {activeTab === 'karma' && <KarmaTab result={result} />}
          {activeTab === 'mission' && <MissionTab result={result} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function OverviewTab({ result }: { result: PastLifeResult }) {
  const { t } = useI18n();

  return (
    <div className={styles.overviewGrid}>
      {/* Soul Pattern Card */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardIcon}>{result.soulPattern.emoji}</span>
          <h3>{t('pastLife.overview.soulPattern', 'Soul Pattern')}</h3>
        </div>
        <p className={styles.cardDescription}>{result.soulPattern.description}</p>
        <div className={styles.traits}>
          {result.soulPattern.traits.map((trait, i) => (
            <span key={i} className={styles.trait}>{trait}</span>
          ))}
        </div>
      </div>

      {/* Quick Summary */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardIcon}>📜</span>
          <h3>{t('pastLife.overview.quickSummary', 'Quick Summary')}</h3>
        </div>
        <div className={styles.summaryList}>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>{t('pastLife.overview.pastRole', 'Past Life Role')}</span>
            <span className={styles.summaryValue}>{result.pastLife.likely.split('.')[0]}</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>{t('pastLife.overview.coreLesson', 'Core Lesson')}</span>
            <span className={styles.summaryValue}>{result.soulJourney.lessonToLearn}</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>{t('pastLife.overview.lifeDirection', 'Life Direction')}</span>
            <span className={styles.summaryValue}>{result.soulJourney.currentDirection}</span>
          </div>
        </div>
      </div>

      {/* Talents Carried */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardIcon}>✨</span>
          <h3>{t('pastLife.overview.talentsCarried', 'Talents From Past Lives')}</h3>
        </div>
        <div className={styles.talentList}>
          {result.talentsCarried.map((talent, i) => (
            <div key={i} className={styles.talentItem}>
              <span className={styles.talentIcon}>💫</span>
              {talent}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PastLifeTab({ result }: { result: PastLifeResult }) {
  const { t } = useI18n();

  return (
    <div className={styles.pastLifeContent}>
      {/* Past Life Story */}
      <div className={styles.storyCard}>
        <div className={styles.storyHeader}>
          <span className={styles.storyIcon}>🔮</span>
          <h3>{t('pastLife.pastLife.likelyRole', 'Your Likely Past Life')}</h3>
        </div>
        <p className={styles.storyText}>{result.pastLife.likely}</p>
        {result.pastLife.era && (
          <div className={styles.eraTag}>
            <span className={styles.eraIcon}>⏳</span>
            {result.pastLife.era}
          </div>
        )}
      </div>

      {/* Talents & Lessons Grid */}
      <div className={styles.tlGrid}>
        <div className={styles.tlCard}>
          <div className={styles.tlHeader}>
            <span className={styles.tlIcon}>🎁</span>
            <h4>{t('pastLife.pastLife.talentsBrought', 'Talents Brought')}</h4>
          </div>
          <p className={styles.tlText}>{result.pastLife.talents}</p>
        </div>

        <div className={styles.tlCard}>
          <div className={styles.tlHeader}>
            <span className={styles.tlIcon}>📚</span>
            <h4>{t('pastLife.pastLife.lessonsRemaining', 'Lessons Remaining')}</h4>
          </div>
          <p className={styles.tlText}>{result.pastLife.lessons}</p>
        </div>
      </div>
    </div>
  );
}

function JourneyTab({ result }: { result: PastLifeResult }) {
  const { t } = useI18n();

  return (
    <div className={styles.journeyContent}>
      {/* Timeline */}
      <div className={styles.timeline}>
        {/* Past (South Node) */}
        <div className={styles.timelineItem}>
          <div className={styles.timelineMarker} data-type="past">☋</div>
          <div className={styles.timelineCard} data-type="past">
            <h4>{t('pastLife.journey.pastPattern', 'Past Life Pattern')}</h4>
            <p>{result.soulJourney.pastPattern}</p>
            <div className={styles.releaseNote}>
              <span className={styles.releaseIcon}>🔻</span>
              <span>{t('pastLife.journey.toRelease', 'To Release')}: {result.soulJourney.releasePattern}</span>
            </div>
          </div>
        </div>

        {/* Arrow */}
        <div className={styles.timelineArrow}>
          <span>→</span>
        </div>

        {/* Future (North Node) */}
        <div className={styles.timelineItem}>
          <div className={styles.timelineMarker} data-type="future">☊</div>
          <div className={styles.timelineCard} data-type="future">
            <h4>{t('pastLife.journey.currentDirection', 'This Life Direction')}</h4>
            <p>{result.soulJourney.currentDirection}</p>
            <div className={styles.learnNote}>
              <span className={styles.learnIcon}>📚</span>
              <span>{t('pastLife.journey.toLearn', 'To Learn')}: {result.soulJourney.lessonToLearn}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Saturn Lesson */}
      <div className={styles.saturnCard}>
        <div className={styles.saturnHeader}>
          <span className={styles.saturnIcon}>🪐</span>
          <h4>{t('pastLife.journey.saturnLesson', 'Saturn\'s Karmic Lesson')}</h4>
        </div>
        <div className={styles.saturnGrid}>
          <div className={styles.saturnItem}>
            <span className={styles.saturnLabel}>{t('pastLife.journey.lesson', 'Lesson')}</span>
            <p>{result.saturnLesson.lesson}</p>
          </div>
          <div className={styles.saturnItem}>
            <span className={styles.saturnLabel}>{t('pastLife.journey.challenge', 'Challenge')}</span>
            <p>{result.saturnLesson.challenge}</p>
          </div>
          <div className={styles.saturnItem}>
            <span className={styles.saturnLabel}>{t('pastLife.journey.mastery', 'Mastery')}</span>
            <p>{result.saturnLesson.mastery}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function KarmaTab({ result }: { result: PastLifeResult }) {
  const { t } = useI18n();

  return (
    <div className={styles.karmaContent}>
      <p className={styles.karmaIntro}>
        {t('pastLife.karma.intro', 'These are karmic patterns carried from past lives that offer opportunities for growth and healing in this lifetime.')}
      </p>

      <div className={styles.karmaList}>
        {result.karmicDebts.map((debt, i) => (
          <div key={i} className={styles.karmaCard}>
            <div className={styles.karmaArea}>
              <span className={styles.karmaIcon}>⚖️</span>
              <h4>{debt.area}</h4>
            </div>
            <p className={styles.karmaDescription}>{debt.description}</p>
            <div className={styles.karmaHealing}>
              <span className={styles.healingIcon}>💚</span>
              <span className={styles.healingLabel}>{t('pastLife.karma.healing', 'Healing Path')}:</span>
              <span className={styles.healingText}>{debt.healing}</span>
            </div>
          </div>
        ))}
      </div>

      {result.karmicDebts.length === 0 && (
        <div className={styles.noKarma}>
          <span className={styles.noKarmaIcon}>✨</span>
          <p>{t('pastLife.karma.noDebts', 'No significant karmic debts detected. Your soul has done great work in past lives!')}</p>
        </div>
      )}
    </div>
  );
}

function MissionTab({ result }: { result: PastLifeResult }) {
  const { t } = useI18n();

  return (
    <div className={styles.missionContent}>
      {/* Core Mission */}
      <div className={styles.missionCard}>
        <div className={styles.missionHeader}>
          <span className={styles.missionIcon}>🎯</span>
          <h3>{t('pastLife.mission.coreMission', 'Core Mission')}</h3>
        </div>
        <p className={styles.missionText}>{result.thisLifeMission.core}</p>
      </div>

      {/* Expression & Fulfillment */}
      <div className={styles.missionGrid}>
        <div className={styles.missionItem}>
          <div className={styles.missionItemHeader}>
            <span className={styles.missionItemIcon}>💫</span>
            <h4>{t('pastLife.mission.expression', 'How to Express')}</h4>
          </div>
          <p>{result.thisLifeMission.expression}</p>
        </div>

        <div className={styles.missionItem}>
          <div className={styles.missionItemHeader}>
            <span className={styles.missionItemIcon}>🏆</span>
            <h4>{t('pastLife.mission.fulfillment', 'Fulfillment')}</h4>
          </div>
          <p>{result.thisLifeMission.fulfillment}</p>
        </div>
      </div>

      {/* Talents to Use */}
      <div className={styles.talentsSection}>
        <h4 className={styles.talentsSectionTitle}>
          <span>✨</span>
          {t('pastLife.mission.talentsToUse', 'Talents to Use')}
        </h4>
        <div className={styles.talentsTags}>
          {result.talentsCarried.map((talent, i) => (
            <span key={i} className={styles.talentTag}>{talent}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
