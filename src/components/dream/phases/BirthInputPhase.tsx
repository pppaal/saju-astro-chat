import { motion } from 'framer-motion';
import { useI18n } from '@/i18n/I18nProvider';
import { MessageBox } from '../MessageBox';
import { buildSignInUrl } from '@/lib/auth/signInUrl';
import DateTimePicker from '@/components/ui/DateTimePicker';
import TimePicker from '@/components/ui/TimePicker';
import styles from './BirthInputPhase.module.css';

interface BirthInputPhaseProps {
  locale: string;
  status: string;
  birthDate: string;
  setBirthDate: (value: string) => void;
  birthTime: string;
  setBirthTime: (value: string) => void;
  gender: 'M' | 'F';
  setGender: (value: 'M' | 'F') => void;
  birthCity: string;
  setBirthCity: (value: string) => void;
  showTimeInput: boolean;
  setShowTimeInput: (value: boolean) => void;
  showCityInput: boolean;
  setShowCityInput: (value: boolean) => void;
  loadingProfileBtn: boolean;
  profileLoadedMsg: boolean;
  profileLoadError: string | null;
  onLoadProfile: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onSkip: () => void;
}

const pageTransitionVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.3 } },
};

export function BirthInputPhase({
  locale,
  status,
  birthDate,
  setBirthDate,
  birthTime,
  setBirthTime,
  gender,
  setGender,
  birthCity,
  setBirthCity,
  showTimeInput,
  setShowTimeInput,
  showCityInput,
  setShowCityInput,
  loadingProfileBtn,
  profileLoadedMsg,
  profileLoadError,
  onLoadProfile,
  onSubmit,
  onSkip,
}: BirthInputPhaseProps) {
  const signInUrl = buildSignInUrl();
  const { t } = useI18n();

  return (
    <motion.div
      key="birth-input"
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

      <div className={styles.birthFormCard}>
        <div className={styles.formHeader}>
          <span className={styles.formIcon}>🎂</span>
          <h3 className={styles.formTitle}>
            {t('dream.birthInfo')}
          </h3>
          <p className={styles.formSubtitle}>
            {t('dream.birthInfoHint')}
          </p>
        </div>

        {/* Load Profile Button */}
        {status === 'authenticated' && !profileLoadedMsg && (
          <button
            type="button"
            className={styles.loadProfileButton}
            onClick={onLoadProfile}
            disabled={loadingProfileBtn}
          >
            <span className={styles.loadProfileIcon}>
              {loadingProfileBtn ? '⏳' : '👤'}
            </span>
            <span>
              {loadingProfileBtn
                ? t('common.loading')
                : t('common.loadMyProfile')}
            </span>
            <span className={styles.loadProfileArrow}>→</span>
          </button>
        )}

        {/* Profile loaded success message */}
        {status === 'authenticated' && profileLoadedMsg && (
          <MessageBox
            type="success"
            icon="✓"
            message={t('common.profileLoaded')}
          />
        )}

        {/* Error message */}
        {profileLoadError && (
          <MessageBox
            type="error"
            icon="⚠️"
            message={profileLoadError}
          />
        )}

        <form onSubmit={onSubmit} className={styles.form}>
          {/* Birth Date */}
          <div className={styles.fieldGroup}>
            <DateTimePicker
              value={birthDate}
              onChange={setBirthDate}
              label={isKo ? '생년월일' : 'Birth Date'}
              required
              locale={locale}
            />
          </div>

          {/* Gender */}
          <div className={styles.fieldGroup}>
            <label className={styles.label}>
              {isKo ? '성별' : 'Gender'}
              <span className={styles.required}>*</span>
            </label>
            <div className={styles.genderButtons}>
              <button
                type="button"
                className={`${styles.genderBtn} ${gender === 'M' ? styles.active : ''}`}
                onClick={() => setGender('M')}
              >
                <span>👨</span>
                <span>{isKo ? '남성' : 'Male'}</span>
              </button>
              <button
                type="button"
                className={`${styles.genderBtn} ${gender === 'F' ? styles.active : ''}`}
                onClick={() => setGender('F')}
              >
                <span>👩</span>
                <span>{isKo ? '여성' : 'Female'}</span>
              </button>
            </div>
          </div>

          {/* Birth Time Toggle */}
          <div className={styles.fieldGroup}>
            <button
              type="button"
              className={styles.toggleBtn}
              onClick={() => setShowTimeInput(!showTimeInput)}
            >
              <span className={styles.toggleIcon}>{showTimeInput ? '▼' : '▶'}</span>
              <span>{isKo ? '태어난 시간 입력 (선택)' : 'Birth Time (Optional)'}</span>
            </button>

            {showTimeInput && (
              <div className={styles.timeInputWrapper}>
                <TimePicker
                  value={birthTime}
                  onChange={setBirthTime}
                  label=""
                  locale={locale}
                />
                <p className={styles.timeHint}>
                  {isKo
                    ? '모르시면 12:00(정오)로 자동 설정됩니다'
                    : 'Defaults to 12:00 PM if unknown'}
                </p>
              </div>
            )}
          </div>

          {/* Birth City Toggle */}
          <div className={styles.fieldGroup}>
            <button
              type="button"
              className={styles.toggleBtn}
              onClick={() => setShowCityInput(!showCityInput)}
            >
              <span className={styles.toggleIcon}>{showCityInput ? '▼' : '▶'}</span>
              <span>{isKo ? '태어난 도시 입력 (선택)' : 'Birth City (Optional)'}</span>
            </button>

            {showCityInput && (
              <div className={styles.timeInputWrapper}>
                <input
                  type="text"
                  value={birthCity}
                  onChange={(e) => setBirthCity(e.target.value)}
                  className={styles.input}
                  placeholder={isKo ? '예: 서울, 부산, Seoul' : 'e.g., Seoul, New York'}
                />
                <p className={styles.timeHint}>
                  {isKo
                    ? '더 정확한 분석을 위해 입력해주세요'
                    : 'For more accurate analysis'}
                </p>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className={styles.submitButton}
            disabled={!birthDate}
          >
            <span>✨</span>
            <span>{isKo ? '다음으로' : 'Continue'}</span>
          </button>
        </form>

        <div className={styles.skipBirthRow}>
          <button
            type="button"
            className={styles.skipBirthButton}
            onClick={onSkip}
          >
            {isKo ? '생년월일 없이 진행' : 'Skip for now'}
          </button>
          <p className={styles.skipBirthHint}>
            {isKo
              ? '생년월일 없이도 기본적인 해석은 가능합니다'
              : 'You can continue without birth info, but accuracy may drop.'}
          </p>
        </div>

        {status === 'unauthenticated' && (
          <div className={styles.loginHint}>
            <p>
              {isKo
                ? '로그인하면 정보가 저장되어 더 편리하게 이용할 수 있어요'
                : 'Log in to save your info for a better experience'}
            </p>
            <a href={signInUrl} className={styles.loginLink}>
              {isKo ? '로그인하기' : 'Log in'}
            </a>
          </div>
        )}
      </div>
    </motion.div>
  );
}
