/**
 * Records List Component
 *
 * Displays filtered list of service records grouped by date
 */

import React from 'react'
import { EmptyState } from '@/components/ui/EmptyState'
import type { DailyHistory, ServiceRecord } from '../lib'
import { SERVICE_CONFIG, INITIAL_DISPLAY_COUNT, formatDate } from '../lib'
import styles from '../history.module.css'

export interface RecordsListProps {
  filteredHistory: DailyHistory[]
  filteredRecordsCount: number
  showAllRecords: boolean
  onToggleShowAll: () => void
  onRecordClick: (record: ServiceRecord) => void
  onBackClick: () => void
  translate: (key: string) => string
}

export function RecordsList({
  filteredHistory,
  filteredRecordsCount,
  showAllRecords,
  onToggleShowAll,
  onRecordClick,
  onBackClick,
  translate,
}: RecordsListProps) {
  if (filteredHistory.length === 0) {
    return (
      <EmptyState
        icon="📜"
        title="이 서비스에 대한 기록이 없습니다"
        description="이 서비스를 사용한 기록이 아직 없어요"
        actionButton={{
          text: '돌아가기',
          onClick: onBackClick,
        }}
      />
    )
  }

  // Limit displayed history based on showAllRecords
  const displayedHistory = showAllRecords
    ? filteredHistory
    : (() => {
        let count = 0
        const limited: DailyHistory[] = []
        for (const day of filteredHistory) {
          if (count >= INITIAL_DISPLAY_COUNT) {
            break
          }
          const remaining = INITIAL_DISPLAY_COUNT - count
          if (day.records.length <= remaining) {
            limited.push(day)
            count += day.records.length
          } else {
            limited.push({ ...day, records: day.records.slice(0, remaining) })
            count += remaining
          }
        }
        return limited
      })()

  const isRecordClickable = (record: ServiceRecord): boolean => {
    return (
      (record.service === 'iching' && record.type === 'reading') ||
      (record.service === 'tarot' &&
        (record.type === 'reading' || record.type === 'tarot-reading')) ||
      (record.service === 'destiny-map' && record.type === 'consultation') ||
      (record.service === 'destiny-calendar' && record.type === 'calendar') ||
      (record.service === 'personality-icp' && record.type === 'icp-result') ||
      ((record.service === 'personality-compatibility' || record.service === 'compatibility') &&
        record.type === 'compatibility-result') ||
      ((record.service === 'destiny-matrix' || record.service === 'premium-reports') &&
        record.type === 'destiny-matrix-report')
    )
  }

  const getServiceTitle = (service: string): string => {
    const titleKey = SERVICE_CONFIG[service]?.titleKey
    if (titleKey) {
      return translate(titleKey)
    }
    // Convert camelCase or kebab-case to Title Case
    return service
      .replace(/([A-Z])/g, ' $1')
      .split(/[-\s]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
      .trim()
  }

  return (
    <div className={styles.recordsSection}>
      <div className={styles.historyList}>
        {displayedHistory.map((day) => (
          <div key={day.date} className={styles.dayGroup}>
            <div className={styles.dayHeader}>
              <span className={styles.dayDate}>{formatDate(day.date)}</span>
              <span className={styles.dayCount}>{day.records.length}개</span>
            </div>
            <div className={styles.dayRecords}>
              {day.records.map((record) => {
                const isClickable = isRecordClickable(record)
                return (
                  <div
                    key={record.id}
                    className={`${styles.recordCard} ${isClickable ? styles.clickable : ''}`}
                    onClick={() => isClickable && onRecordClick(record)}
                    style={
                      {
                        '--service-color': SERVICE_CONFIG[record.service]?.color || '#8b5cf6',
                      } as React.CSSProperties
                    }
                  >
                    <span className={styles.recordIcon}>
                      {SERVICE_CONFIG[record.service]?.icon || '📖'}
                    </span>
                    <div className={styles.recordContent}>
                      <div className={styles.recordTitle}>
                        <span className={styles.serviceName}>
                          {getServiceTitle(record.service)}
                        </span>
                        {isClickable && (
                          <span className={styles.viewDetail}>
                            {translate('history.viewDetail')}
                          </span>
                        )}
                      </div>
                      {record.summary && <p className={styles.recordSummary}>{record.summary}</p>}
                    </div>
                    <span className={styles.recordArrow}>→</span>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
      {!showAllRecords && filteredRecordsCount > INITIAL_DISPLAY_COUNT && (
        <button className={styles.showMoreButton} onClick={onToggleShowAll}>
          더보기 ({filteredRecordsCount - INITIAL_DISPLAY_COUNT}개 더)
        </button>
      )}
      {showAllRecords && filteredRecordsCount > INITIAL_DISPLAY_COUNT && (
        <button className={styles.showMoreButton} onClick={onToggleShowAll}>
          접기
        </button>
      )}
    </div>
  )
}
