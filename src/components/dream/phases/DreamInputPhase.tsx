import { motion } from 'framer-motion';
import { useI18n } from '@/i18n/I18nProvider';
import { MessageBox } from '../MessageBox';
import type { UserProfile, GuestBirthInfo } from '@/lib/dream/types';
import styles from './DreamInputPhase.module.css';

interface DreamInputPhaseProps {
  locale: string;
  userProfile: UserProfile | null;
  guestBirthInfo: GuestBirthInfo | null;
  dreamText: string;
  setDreamText: (value: string) => void;
  isLoading: boolean;
  error: string | null;
  onChangeBirthInfo: () => void;
  onSubmit: () => void;
}

const pageTransitionVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.3 } },
};

export function DreamInputPhase({
  locale,
  userProfile,
  guestBirthInfo,
  dreamText,
  setDreamText,
  isLoading,
  error,
  onChangeBirthInfo,
  onSubmit,
}: DreamInputPhaseProps) {
  const { t } = useI18n();

  return (
    <motion.div
      key="dream-input"
      variants={pageTransitionVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={styles.phaseContainer}
    >
      <div className={styles.pageHeader}>
        <div className={styles.iconWrapper}>
          <span className={styles.icon}>🌙</span>
        </div>
        <h1 className={styles.pageTitle}>
          {t('dream.title')}
        </h1>
        <p className={styles.pageSubtitle}>
          {t('dream.subtitle')}
        </p>
      </div>

      {/* Birth Info Display */}
      {(userProfile?.birthDate || guestBirthInfo?.birthDate) && (
        <div className={styles.birthInfoDisplay}>
          <span className={styles.birthInfoIcon}>🎂</span>
          <span className={styles.birthInfoText}>
            {userProfile?.birthDate || guestBirthInfo?.birthDate}
            {(userProfile?.gender || guestBirthInfo?.gender) === 'M' ? ' 👨' : ' 👩'}
          </span>
          <button className={styles.changeBirthBtn} onClick={onChangeBirthInfo}>
            {t('common.change')}
          </button>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <MessageBox type="error" icon="⚠️" message={error} />
      )}

      {/* Dream Input Card */}
      <div className={styles.dreamInputCard}>
        <div className={styles.dreamInputHeader}>
          <span className={styles.dreamInputIcon}>✍️</span>
          <div>
            <h3 className={styles.dreamInputTitle}>
              {t('dream.labelDream')}
            </h3>
            <p className={styles.dreamInputHint}>
              {t('dream.hintDream')}
            </p>
          </div>
        </div>

        <div className={styles.textareaWrapper}>
          <textarea
            className={styles.dreamTextarea}
            value={dreamText}
            onChange={(e) => setDreamText(e.target.value)}
            placeholder={t('dream.placeholderDream')}
            rows={6}
            maxLength={1000}
          />
          <div className={styles.textareaGlow}></div>
          <div className={`${styles.charCounter} ${dreamText.length >= 900 ? styles.charCounterWarning : ''} ${dreamText.length >= 1000 ? styles.charCounterError : ''}`}>
            {dreamText.length} / 1000
          </div>
        </div>

        <button
          type="button"
          className={styles.analyzeButton}
          onClick={onSubmit}
          disabled={!dreamText.trim() || dreamText.trim().length < 10 || isLoading}
        >
          {isLoading ? (
            <>
              <div className={styles.buttonSpinner} />
              <span>{t('dream.buttonAnalyzing')}</span>
            </>
          ) : (
            <>
              <span>🔮</span>
              <span>{t('dream.buttonAnalyze')}</span>
            </>
          )}
        </button>
      </div>

      {/* Quick Tips */}
      <div className={styles.quickTips}>
        <h4>💡 {locale === 'ko' ? '작성 팁' : 'Writing Tips'}</h4>
        <ul>
          <li>{locale === 'ko' ? '등장인물이나 장소를 구체적으로' : 'Be specific about people and places'}</li>
          <li>{locale === 'ko' ? '느꼈던 감정도 함께 적어주세요' : 'Include emotions you felt'}</li>
          <li>{locale === 'ko' ? '반복되는 꿈이면 그것도 알려주세요' : 'Mention if it\'s a recurring dream'}</li>
        </ul>
      </div>
    </motion.div>
  );
}
