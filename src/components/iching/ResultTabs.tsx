'use client'

import { useState } from 'react'
import styles from './ResultTabs.module.css'

type TabId = 'overview' | 'traditional' | 'practical' | 'advanced'

interface Tab {
  id: TabId
  label: string
  icon: string
}

interface ResultTabsProps {
  activeTab: TabId
  onTabChange: (tabId: TabId) => void
}

const TABS: Tab[] = [
  { id: 'overview', label: 'Overview', icon: '✨' },
  { id: 'traditional', label: 'Traditional', icon: '📜' },
  { id: 'practical', label: 'Practical', icon: '💡' },
  { id: 'advanced', label: 'Advanced', icon: '🔮' },
]

export function ResultTabs({ activeTab, onTabChange }: ResultTabsProps) {
  return (
    <div className={styles.tabsContainer}>
      <div className={styles.tabsList} role="tablist" aria-label="Result sections">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`tabpanel-${tab.id}`}
            id={`tab-${tab.id}`}
            className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            <span className={styles.tabIcon} aria-hidden="true">
              {tab.icon}
            </span>
            <span className={styles.tabLabel}>{tab.label}</span>
          </button>
        ))}
      </div>
      <div className={styles.tabIndicator} />
    </div>
  )
}

export type { TabId }
