'use client'

import DestinyCalendar from './DestinyCalendar'
import styles from './DestinyCalendar.module.css'

export default function CalendarTabs() {
  return (
    <div className={styles.container}>
      <DestinyCalendar />
    </div>
  )
}
