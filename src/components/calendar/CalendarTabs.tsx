'use client'

import { useI18n } from '@/i18n/I18nProvider'
import DestinyCalendar from './DestinyCalendar'
import MatrixPeaksCalendar from './peaks/MatrixPeaksCalendar'
import styles from './DestinyCalendar.module.css'

export default function CalendarTabs() {
  const { locale } = useI18n()

  return (
    <div className={`${styles.container} ${styles.largeTextMode}`}>
      <div className={styles.tabPanel}>
        <DestinyCalendar />
      </div>

      <p className={styles.tabHelperText}>
        {locale === 'ko'
          ? '일간 캘린더 결과 아래에 피크 윈도우가 자동 연동되어 함께 표시됩니다.'
          : 'Peak windows are now auto-linked and shown together under the daily calendar results.'}
      </p>

      <div className={styles.tabPanel}>
        <MatrixPeaksCalendar embedded />
      </div>
    </div>
  )
}
