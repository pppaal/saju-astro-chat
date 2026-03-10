import React from 'react'
import styles from '../../../tarot-reading.module.css'
import type { AdviceItem } from '../../../types'

interface GuidanceSectionProps {
  guidance: string | AdviceItem[]
  language: string
}

function normalizeGuidanceItems(guidance: string | AdviceItem[], language: string): AdviceItem[] {
  if (Array.isArray(guidance)) {
    return guidance
      .map((item) => ({
        title: (item?.title || '').trim(),
        detail: (item?.detail || '').trim(),
      }))
      .filter((item) => item.title.length > 0 || item.detail.length > 0)
  }

  const text = guidance.trim()
  if (!text) return []

  const lines = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length < 2) return []

  return lines.map((line, idx) => {
    const withoutBullet = line.replace(/^\d+\s*[\).:-]?\s*/, '').trim()
    const colonMatch = withoutBullet.match(/^([^:：]{1,28})\s*[:：]\s*(.+)$/)
    if (colonMatch) {
      return { title: colonMatch[1].trim(), detail: colonMatch[2].trim() }
    }

    return {
      title: language === 'ko' ? `실행 포인트 ${idx + 1}` : `Action Point ${idx + 1}`,
      detail: withoutBullet,
    }
  })
}

export function GuidanceSection({ guidance, language }: GuidanceSectionProps) {
  const guidanceItems = normalizeGuidanceItems(guidance, language)
  const renderAsCards = guidanceItems.length > 0

  return (
    <div className={styles.counselorChat}>
      <div className={styles.chatMessage}>
        <div className={styles.chatAvatar}>💡</div>
        <div className={styles.chatContent}>
          <div className={styles.chatName}>{language === 'ko' ? '실천 조언' : 'Action Advice'}</div>
          {renderAsCards ? (
            <div className={styles.adviceListContainer}>
              {guidanceItems.map((advice, idx) => (
                <div
                  key={idx}
                  className={`${styles.chatBubble} ${styles.adviceBubble} ${styles.adviceCard}`}
                >
                  <div className={styles.adviceCardHeader}>
                    <span className={styles.adviceCardNumber}>{idx + 1}</span>
                    <span className={styles.adviceCardTitle}>{advice.title}</span>
                  </div>
                  <p className={styles.adviceCardDetail}>{advice.detail}</p>
                </div>
              ))}
            </div>
          ) : (
            typeof guidance === 'string' &&
            guidance.trim() && (
              <div className={`${styles.chatBubble} ${styles.adviceBubble}`}>
                <p className={styles.adviceText}>{guidance}</p>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}
