'use client'

import React from 'react'
import styles from '../tarot-reading.module.css'

interface ActionButtonsProps {
  language: string
  isSaved: boolean
  isSaving: boolean
  onSave: () => void
  onReset: () => void
}

export function ActionButtons({
  language,
  isSaved,
  isSaving,
  onSave,
  onReset,
}: ActionButtonsProps) {
  return (
    <>
      <p className={styles.saveHint}>
        {language === 'ko'
          ? '저장하면 나중에 리딩 변화 흐름을 비교할 수 있어요.'
          : 'Save this reading to compare your pattern over time.'}
      </p>
      <div className={styles.actionButtons}>
        <button
          onClick={onSave}
          className={`${styles.saveButton} ${isSaved ? styles.saved : ''}`}
          disabled={isSaved || isSaving}
        >
          {isSaved ? '✓' : isSaving ? '⏳' : '💾'}{' '}
          {isSaved
            ? language === 'ko'
              ? '저장됨'
              : 'Saved'
            : isSaving
              ? language === 'ko'
                ? '저장 중...'
                : 'Saving...'
              : language === 'ko'
                ? '저장하기'
                : 'Save Reading'}
        </button>
        <button onClick={onReset} className={styles.resetButton}>
          {language === 'ko' ? '새로 읽기' : 'New Reading'}
        </button>
      </div>
    </>
  )
}
