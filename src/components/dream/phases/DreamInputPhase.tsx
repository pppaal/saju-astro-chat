import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageBox } from '../MessageBox'
import type { UserProfile, GuestBirthInfo } from '@/lib/dream/types'
import styles from './DreamInputPhase.module.css'

interface DreamInputPhaseProps {
  locale: string
  userProfile: UserProfile | null
  guestBirthInfo: GuestBirthInfo | null
  dreamText: string
  setDreamText: (value: string) => void
  isLoading: boolean
  error: string | null
  onChangeBirthInfo: () => void
  onSubmit: () => void
}

const pageTransitionVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.3 } },
}

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
  const isKo = locale === 'ko'
  const hasBirthInfo = !!(userProfile?.birthDate || guestBirthInfo?.birthDate)
  const [showBirthToggle, setShowBirthToggle] = useState(false);

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
        <h1 className={styles.pageTitle}>{isKo ? '꿈 해몽' : 'Dream Interpretation'}</h1>
        <p className={styles.pageSubtitle}>
          {isKo ? '어젯밤 꾼 꿈을 알려주세요' : 'Tell us about your dream'}
        </p>
      </div>

      {/* Error Display */}
      {error && <MessageBox type="error" icon="⚠️" message={error} />}

      {/* Dream Input Card */}
      <div className={styles.dreamInputCard}>
        <div className={styles.dreamInputHeader}>
          <span className={styles.dreamInputIcon}>✍️</span>
          <div>
            <h3 className={styles.dreamInputTitle}>
              {isKo ? '꿈 내용을 적어주세요' : 'Describe Your Dream'}
            </h3>
            <p className={styles.dreamInputHint}>
              {isKo
                ? '자세할수록 더 정확한 해석이 가능합니다'
                : 'More details lead to better interpretation'}
            </p>
          </div>
        </div>

        <div className={styles.textareaWrapper}>
          <textarea
            className={styles.dreamTextarea}
            value={dreamText}
            onChange={(e) => setDreamText(e.target.value)}
            placeholder={
              isKo
                ? '예: 높은 곳에서 떨어지는 꿈을 꿨어요. 처음엔 무서웠는데 나중엔 하늘을 날고 있었어요...'
                : 'Example: I dreamed of falling from a high place. It was scary at first, but then I was flying...'
            }
            rows={6}
            maxLength={1000}
            autoFocus
          />
          <div className={styles.textareaGlow}></div>
          <div
            className={`${styles.charCounter} ${dreamText.length >= 900 ? styles.charCounterWarning : ''} ${dreamText.length >= 1000 ? styles.charCounterError : ''}`}
          >
            {dreamText.length} / 1000
          </div>
        </div>

        {/* Birth Info - Collapsible optional section */}
        {hasBirthInfo ? (
          <div className={styles.birthInfoDisplay}>
            <span className={styles.birthInfoIcon}>🎂</span>
            <span className={styles.birthInfoText}>
              {userProfile?.birthDate || guestBirthInfo?.birthDate}
              {(userProfile?.gender || guestBirthInfo?.gender) === 'M' ? ' 👨' : ' 👩'}
            </span>
            <button className={styles.changeBirthBtn} onClick={onChangeBirthInfo}>
              {isKo ? '변경' : 'Change'}
            </button>
          </div>
        ) : (
          <div className={styles.birthInfoToggleArea}>
            <button
              type="button"
              className={styles.birthInfoToggleBtn}
              onClick={() => setShowBirthToggle(!showBirthToggle)}
            >
              <span>{showBirthToggle ? '▼' : '▶'}</span>
              <span>{isKo ? '🎂 생년월일 추가 (선택)' : '🎂 Add Birth Info (Optional)'}</span>
            </button>
            <AnimatePresence>
              {showBirthToggle && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ overflow: 'hidden' }}
                >
                  <p className={styles.birthInfoToggleHint}>
                    {isKo
                      ? '생년월일을 입력하면 사주 기반으로 더 정확한 해석을 받을 수 있어요'
                      : 'Adding birth info enables more accurate interpretation based on your astrology'}
                  </p>
                  <button
                    type="button"
                    className={styles.addBirthInfoBtn}
                    onClick={onChangeBirthInfo}
                  >
                    {isKo ? '생년월일 입력하기' : 'Enter Birth Info'}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        <button
          type="button"
          className={styles.analyzeButton}
          onClick={onSubmit}
          disabled={!dreamText.trim() || dreamText.trim().length < 10 || isLoading}
        >
          {isLoading ? (
            <>
              <div className={styles.buttonSpinner} />
              <span>{isKo ? '분석 중...' : 'Analyzing...'}</span>
            </>
          ) : (
            <>
              <span>🔮</span>
              <span>{isKo ? 'AI 해석 받기' : 'Get AI Interpretation'}</span>
            </>
          )}
        </button>
      </div>

      {/* Quick Tips */}
      <div className={styles.quickTips}>
        <h4>{isKo ? '💡 작성 팁' : '💡 Writing Tips'}</h4>
        <ul>
          <li>{isKo ? '등장인물이나 장소를 구체적으로' : 'Be specific about people and places'}</li>
          <li>{isKo ? '느꼈던 감정도 함께 적어주세요' : 'Include emotions you felt'}</li>
          <li>
            {isKo ? '반복되는 꿈이면 그것도 알려주세요' : "Mention if it's a recurring dream"}
          </li>
        </ul>
      </div>
    </motion.div>
  )
}
