'use client'

import styles from './QuickActions.module.css'

interface QuickActionsProps {
  onSave?: () => void
  onReset: () => void
  onShare?: () => void
  canSave: boolean
  isSaved: boolean
  saveStatus: 'idle' | 'saving' | 'saved' | 'error'
  isLoggedIn: boolean
}

export function QuickActions({
  onSave,
  onReset,
  onShare,
  canSave,
  isSaved,
  saveStatus,
  isLoggedIn,
}: QuickActionsProps) {
  return (
    <div className={styles.quickActions}>
      <div className={styles.actionsGroup}>
        {isLoggedIn ? (
          <button
            onClick={onSave}
            className={`${styles.actionBtn} ${styles.saveBtn} ${isSaved ? styles.saved : ''}`}
            disabled={!canSave || saveStatus === 'saving' || saveStatus === 'saved'}
            title={
              !canSave
                ? 'Waiting for AI interpretation...'
                : saveStatus === 'saved'
                  ? 'Reading saved'
                  : 'Save this reading'
            }
          >
            <span className={styles.btnIcon} aria-hidden="true">
              {saveStatus === 'saving' ? '⏳' : saveStatus === 'saved' ? '✓' : '💾'}
            </span>
            <span className={styles.btnLabel}>
              {saveStatus === 'saving'
                ? 'Saving...'
                : saveStatus === 'saved'
                  ? 'Saved'
                  : saveStatus === 'error'
                    ? 'Error'
                    : !canSave
                      ? 'Wait...'
                      : 'Save'}
            </span>
          </button>
        ) : (
          <div className={styles.loginHint}>
            <span className={styles.loginIcon}>🔒</span>
            <span className={styles.loginText}>Log in to save</span>
          </div>
        )}

        <button
          onClick={onReset}
          className={`${styles.actionBtn} ${styles.resetBtn}`}
          title="Cast again"
        >
          <span className={styles.btnIcon} aria-hidden="true">
            🔄
          </span>
          <span className={styles.btnLabel}>Cast Again</span>
        </button>

        {onShare && (
          <button
            onClick={onShare}
            className={`${styles.actionBtn} ${styles.shareBtn}`}
            title="Share reading"
          >
            <span className={styles.btnIcon} aria-hidden="true">
              📤
            </span>
            <span className={styles.btnLabel}>Share</span>
          </button>
        )}
      </div>
    </div>
  )
}
