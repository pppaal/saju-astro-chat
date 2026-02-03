import React from 'react'
import styles from '../../../tarot-reading.module.css'
import type { AdviceItem } from '../../../types'

interface GuidanceSectionProps {
  guidance: string | AdviceItem[]
  language: string
}

export function GuidanceSection({ guidance, language }: GuidanceSectionProps) {
  return (
    <div className={styles.counselorChat}>
      <div className={styles.chatMessage}>
        <div className={styles.chatAvatar}>💡</div>
        <div className={styles.chatContent}>
          <div className={styles.chatName}>{language === 'ko' ? '실천 조언' : 'Action Advice'}</div>
          {Array.isArray(guidance) ? (
            <div className={styles.adviceListContainer}>
              {guidance.map((advice, idx) => (
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
