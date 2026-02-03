'use client'

import React from 'react'
import styles from '../../tarot-reading.module.css'

interface InsightCardProps {
  icon: string
  title: string
  children: React.ReactNode
  className?: string
}

/**
 * Reusable insight section component
 * Used for AI interpretation, spirit animal, chakra, shadow work, etc.
 */
export function InsightCard({ icon, title, children, className }: InsightCardProps) {
  return (
    <div className={`${styles.insightSection} ${className || ''}`}>
      <h4 className={styles.insightTitle}>
        {icon} {title}
      </h4>
      {children}
    </div>
  )
}
