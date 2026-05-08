import React from 'react'
import styles from '../../../tarot-reading.module.css'
import type { AdviceItem } from '../../../types'

interface GuidanceSectionProps {
  guidance: string | AdviceItem[]
  language: string
}

function flattenGuidance(guidance: string | AdviceItem[]): string {
  if (Array.isArray(guidance)) {
    return guidance
      .map((item) => {
        const title = (item?.title || '').trim()
        const detail = (item?.detail || '').trim()
        if (title && detail) return `${title} ${detail}`
        return title || detail
      })
      .filter(Boolean)
      .join(' ')
  }
  return guidance.trim()
}

export function GuidanceSection({ guidance, language }: GuidanceSectionProps) {
  const text = flattenGuidance(guidance)
  if (!text) return null

  return (
    <div className={styles.counselorChat}>
      <div className={styles.chatMessage}>
        <div className={styles.chatAvatar}>💡</div>
        <div className={styles.chatContent}>
          <div className={styles.chatName}>{language === 'ko' ? '실천 조언' : 'Action Advice'}</div>
          <div className={`${styles.chatBubble} ${styles.adviceBubble}`}>
            <p className={styles.adviceText}>{text}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
