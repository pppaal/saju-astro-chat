'use client'

import { useState } from 'react'
import DestinyCalendar from './DestinyCalendar'
import MatrixPeaksCalendar from './peaks/MatrixPeaksCalendar'
import styles from './DestinyCalendar.module.css'

type CalendarTab = 'daily' | 'peaks'

export default function CalendarTabs() {
  const [activeTab, setActiveTab] = useState<CalendarTab>('daily')

  return (
    <div className={styles.container}>
      <div className={styles.viewTabs} role="tablist" aria-label="Calendar Views">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'daily'}
          className={`${styles.viewTab} ${activeTab === 'daily' ? styles.viewTabActive : ''}`}
          onClick={() => setActiveTab('daily')}
        >
          Daily
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'peaks'}
          className={`${styles.viewTab} ${activeTab === 'peaks' ? styles.viewTabActive : ''}`}
          onClick={() => setActiveTab('peaks')}
        >
          Peaks
        </button>
      </div>

      {activeTab === 'daily' ? <DestinyCalendar /> : <MatrixPeaksCalendar />}
    </div>
  )
}
