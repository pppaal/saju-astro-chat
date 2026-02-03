/**
 * Mobile Filter Drawer
 * 모바일에 최적화된 필터 드로어 컴포넌트
 */

import React, { useEffect } from 'react'
import { bodyScrollLock } from '@/utils/mobileHelpers'
import styles from './MobileFilterDrawer.module.css'

interface FilterOption {
  id: string
  label: string
  value: any
}

interface FilterGroup {
  id: string
  label: string
  options: FilterOption[]
  selectedValue?: any
}

interface MobileFilterDrawerProps {
  isOpen: boolean
  onClose: () => void
  filterGroups: FilterGroup[]
  onApply: (filters: Record<string, any>) => void
  onReset: () => void
}

export function MobileFilterDrawer({
  isOpen,
  onClose,
  filterGroups,
  onApply,
  onReset,
}: MobileFilterDrawerProps) {
  const [selectedFilters, setSelectedFilters] = React.useState<Record<string, any>>({})

  useEffect(() => {
    // Initialize with current values
    const initial: Record<string, any> = {}
    filterGroups.forEach((group) => {
      if (group.selectedValue !== undefined) {
        initial[group.id] = group.selectedValue
      }
    })
    setSelectedFilters(initial)
  }, [filterGroups])

  useEffect(() => {
    if (isOpen) {
      bodyScrollLock.lock()
    } else {
      bodyScrollLock.unlock()
    }

    return () => bodyScrollLock.unlock()
  }, [isOpen])

  const handleFilterChange = (groupId: string, value: any) => {
    setSelectedFilters((prev) => ({
      ...prev,
      [groupId]: value,
    }))
  }

  const handleApply = () => {
    onApply(selectedFilters)
    onClose()
  }

  const handleReset = () => {
    setSelectedFilters({})
    onReset()
  }

  const activeFilterCount = Object.keys(selectedFilters).filter(
    (key) => selectedFilters[key] !== undefined && selectedFilters[key] !== ''
  ).length

  if (!isOpen) return null

  return (
    <>
      {/* Overlay */}
      <div className={styles.overlay} onClick={onClose} />

      {/* Drawer */}
      <div className={styles.drawer}>
        {/* Handle */}
        <div className={styles.handle} />

        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>필터 {activeFilterCount > 0 && `(${activeFilterCount})`}</h2>
          <button className={styles.closeButton} onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {filterGroups.map((group) => (
            <div key={group.id} className={styles.filterGroup}>
              <label className={styles.filterLabel}>{group.label}</label>
              <div className={styles.optionList}>
                {group.options.map((option) => (
                  <button
                    key={option.id}
                    className={`${styles.optionButton} ${
                      selectedFilters[group.id] === option.value ? styles.optionButtonActive : ''
                    }`}
                    onClick={() => handleFilterChange(group.id, option.value)}
                  >
                    {option.label}
                    {selectedFilters[group.id] === option.value && (
                      <span className={styles.checkIcon}>✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button className={styles.resetButton} onClick={handleReset}>
            초기화
          </button>
          <button className={styles.applyButton} onClick={handleApply}>
            적용하기
          </button>
        </div>
      </div>
    </>
  )
}
