'use client'

import React from 'react'
import styles from './GenderSelector.module.css'

interface GenderSelectorProps {
  value: 'M' | 'F' | 'Male' | 'Female'
  onChange: (gender: 'M' | 'F' | 'Male' | 'Female') => void
  locale?: 'ko' | 'en'
  readOnly?: boolean
  outputFormat?: 'short' | 'long' // 'M'/'F' or 'Male'/'Female'
}

export function GenderSelector({
  value,
  onChange,
  locale = 'ko',
  readOnly = false,
  outputFormat = 'short',
}: GenderSelectorProps) {
  // Normalize value to short format for internal logic
  const normalizedValue = value === 'Male' ? 'M' : value === 'Female' ? 'F' : value

  const handleClick = (gender: 'M' | 'F') => {
    if (readOnly) return

    if (outputFormat === 'long') {
      onChange(gender === 'M' ? 'Male' : 'Female')
    } else {
      onChange(gender)
    }
  }

  return (
    <div className={styles.container}>
      <label className={styles.label}>
        {locale === 'ko' ? '성별' : 'Gender'}
        <span className={styles.required}>*</span>
      </label>
      <div
        className={styles.genderButtons}
        role="group"
        aria-label={locale === 'ko' ? '성별' : 'Gender'}
      >
        <button
          type="button"
          className={`${styles.genderBtn} ${normalizedValue === 'M' ? styles.active : ''}`}
          onClick={() => handleClick('M')}
          disabled={readOnly}
          aria-pressed={normalizedValue === 'M'}
          aria-label={locale === 'ko' ? '남성' : 'Male'}
        >
          <span aria-hidden="true">👨</span>
          <span>{locale === 'ko' ? '남성' : 'Male'}</span>
        </button>
        <button
          type="button"
          className={`${styles.genderBtn} ${normalizedValue === 'F' ? styles.active : ''}`}
          onClick={() => handleClick('F')}
          disabled={readOnly}
          aria-pressed={normalizedValue === 'F'}
          aria-label={locale === 'ko' ? '여성' : 'Female'}
        >
          <span aria-hidden="true">👩</span>
          <span>{locale === 'ko' ? '여성' : 'Female'}</span>
        </button>
      </div>
    </div>
  )
}
