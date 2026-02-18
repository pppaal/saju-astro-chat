'use client'

import { useState } from 'react'
import { useI18n } from '@/i18n/I18nProvider'
import DestinyCalendar from './DestinyCalendar'
import MatrixPeaksCalendar from './peaks/MatrixPeaksCalendar'
import styles from './DestinyCalendar.module.css'

type CalendarTab = 'daily' | 'peaks'

export default function CalendarTabs() {
  const { locale } = useI18n()
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
          {locale === 'ko' ? '일간 캘린더' : 'Daily'}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'peaks'}
          className={`${styles.viewTab} ${activeTab === 'peaks' ? styles.viewTabActive : ''}`}
          onClick={() => setActiveTab('peaks')}
        >
          {locale === 'ko' ? '피크 윈도우' : 'Peaks'}
        </button>
      </div>

      <p className={styles.tabHelperText}>
        {activeTab === 'daily'
          ? locale === 'ko'
            ? '일별 운세 캘린더입니다. 연도 선택으로 원하는 해를 바로 볼 수 있습니다.'
            : 'Daily destiny calendar. Use year selection to jump to the year you want.'
          : locale === 'ko'
            ? 'Peaks는 Destiny Matrix 기반의 집중 기간입니다. 입력한 생년정보를 자동으로 이어받습니다.'
            : 'Peaks shows concentrated windows from Destiny Matrix and reuses your latest birth info.'}
      </p>

      {activeTab === 'daily' ? (
        <div role="tabpanel" className={styles.tabPanel}>
          <DestinyCalendar />
        </div>
      ) : (
        <div role="tabpanel" className={styles.tabPanel}>
          <MatrixPeaksCalendar />
        </div>
      )}
    </div>
  )
}
