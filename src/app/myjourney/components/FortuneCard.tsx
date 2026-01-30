import type { Fortune, Profile } from '../types'

interface FortuneCardProps {
  styles: Record<string, string>
  fortune: Fortune | null
  fortuneLoading: boolean
  profile: Profile
  onSetupProfile: () => void
  t: (key: string, fallback?: string) => string
}

export function FortuneCard({
  styles,
  fortune,
  fortuneLoading,
  profile,
  onSetupProfile,
  t,
}: FortuneCardProps) {
  return (
    <div className={styles.fortuneCard}>
      <h3>{t('myjourney.fortune.title', "Today's Fortune")}</h3>
      {fortune ? (
        <>
          <div className={styles.fortuneGrid}>
            <div className={styles.fortuneItem}>
              <span className={styles.fortuneEmoji}>{'\u2764\uFE0F'}</span>
              <span className={styles.fortuneScore}>{fortune.love}</span>
              <small>{t('myjourney.fortune.love', 'Love')}</small>
            </div>
            <div className={styles.fortuneItem}>
              <span className={styles.fortuneEmoji}>{'\uD83D\uDCBC'}</span>
              <span className={styles.fortuneScore}>{fortune.career}</span>
              <small>{t('myjourney.fortune.career', 'Career')}</small>
            </div>
            <div className={styles.fortuneItem}>
              <span className={styles.fortuneEmoji}>{'\uD83D\uDCB0'}</span>
              <span className={styles.fortuneScore}>{fortune.wealth}</span>
              <small>{t('myjourney.fortune.wealth', 'Wealth')}</small>
            </div>
            <div className={styles.fortuneItem}>
              <span className={styles.fortuneEmoji}>{'\uD83C\uDFE5'}</span>
              <span className={styles.fortuneScore}>{fortune.health}</span>
              <small>{t('myjourney.fortune.health', 'Health')}</small>
            </div>
          </div>
          {(fortune.luckyColor || fortune.luckyNumber) && (
            <div className={styles.luckyItems}>
              {fortune.luckyColor && (
                <div className={styles.luckyItem}>
                  <span className={styles.luckyIcon}>{'\uD83C\uDFA8'}</span>
                  <span className={styles.luckyText}>{fortune.luckyColor}</span>
                </div>
              )}
              {fortune.luckyNumber && (
                <div className={styles.luckyItem}>
                  <span className={styles.luckyIcon}>{'\uD83D\uDD22'}</span>
                  <span className={styles.luckyText}>{fortune.luckyNumber}</span>
                </div>
              )}
            </div>
          )}
        </>
      ) : !profile.birthDate ? (
        <div className={styles.fortuneSetup}>
          <p>{t('myjourney.fortune.setup', 'Set your birth date first')}</p>
          <button onClick={onSetupProfile} className={styles.fortuneSetupLink}>
            {t('myjourney.fortune.setupLink', 'Setup Profile')}
          </button>
        </div>
      ) : fortuneLoading ? (
        <div className={styles.fortuneLoading}>
          <div className={styles.smallSpinner}></div>
        </div>
      ) : (
        <div className={styles.fortuneSetup}>
          <p>{t('myjourney.fortune.error', 'Failed to load fortune. Please try again later.')}</p>
        </div>
      )}
    </div>
  )
}
