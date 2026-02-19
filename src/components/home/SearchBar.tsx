import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react'
import styles from './SearchBar.module.css'

interface ServiceOption {
  key: string
  icon: string
  path: string
}

interface SearchBarProps {
  lifeQuestion: string
  typingPlaceholder: string
  showServiceSelector: boolean
  selectedService: string | null
  serviceOptions: ServiceOption[]
  onQuestionChange: (value: string) => void
  onSubmit: (e: React.FormEvent) => void
  onServiceSelect: (serviceKey: string) => void
  onToggleSelector: () => void
  onFocus: () => void
  onHintClick: (hint: string) => void
  hints: string[]
  t: (key: string) => string
  translate: (key: string, fallback: string) => string
  containerRef: React.RefObject<HTMLDivElement | null>
  onCloseSelector?: () => void
}

export const SearchBar = React.memo(function SearchBar({
  lifeQuestion,
  typingPlaceholder,
  showServiceSelector,
  selectedService,
  serviceOptions,
  onQuestionChange,
  onSubmit,
  onServiceSelect,
  onToggleSelector,
  onFocus,
  onHintClick,
  hints,
  t,
  translate,
  containerRef,
  onCloseSelector,
}: SearchBarProps) {
  // Arrow key navigation state
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([])
  const serviceCount = serviceOptions.length

  // Memoize selected service icon to avoid recalculation on every render
  const selectedIcon = useMemo(
    () => serviceOptions.find((s) => s.key === selectedService)?.icon || '🌟',
    [serviceOptions, selectedService]
  )
  const selectServiceLabel = translate('landing.selectService', 'Select service')

  // Reset focused index when dropdown closes
  useEffect(() => {
    if (!showServiceSelector) {
      setFocusedIndex(-1)
    } else {
      // Focus current selection when opening
      const currentIndex = serviceOptions.findIndex((s) => s.key === selectedService)
      setFocusedIndex(currentIndex >= 0 ? currentIndex : 0)
    }
  }, [showServiceSelector, selectedService, serviceOptions])

  // Focus the option when focusedIndex changes
  useEffect(() => {
    if (showServiceSelector && focusedIndex >= 0 && optionRefs.current[focusedIndex]) {
      optionRefs.current[focusedIndex]?.focus()
    }
  }, [showServiceSelector, focusedIndex])

  // Keyboard navigation handler
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!showServiceSelector) {
        // Open dropdown on arrow down when trigger is focused
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault()
          onToggleSelector()
        }
        return
      }

      switch (e.key) {
        case 'Escape':
          e.preventDefault()
          if (onCloseSelector) {
            onCloseSelector()
          } else {
            onToggleSelector()
          }
          setFocusedIndex(-1)
          triggerRef.current?.focus()
          break
        case 'ArrowDown':
          e.preventDefault()
          setFocusedIndex((prev) => (prev + 1) % serviceCount)
          break
        case 'ArrowUp':
          e.preventDefault()
          setFocusedIndex((prev) => (prev - 1 + serviceCount) % serviceCount)
          break
        case 'Home':
          e.preventDefault()
          setFocusedIndex(0)
          break
        case 'End':
          e.preventDefault()
          setFocusedIndex(serviceCount - 1)
          break
        case 'Enter':
        case ' ':
          if (focusedIndex >= 0) {
            e.preventDefault()
            onServiceSelect(serviceOptions[focusedIndex].key)
            setFocusedIndex(-1)
            triggerRef.current?.focus()
          }
          break
        case 'Tab':
          // Allow normal tab behavior but close dropdown
          if (onCloseSelector) {
            onCloseSelector()
          } else {
            onToggleSelector()
          }
          setFocusedIndex(-1)
          break
      }
    },
    [
      showServiceSelector,
      focusedIndex,
      serviceCount,
      serviceOptions,
      onServiceSelect,
      onToggleSelector,
      onCloseSelector,
    ]
  )

  return (
    <div className={styles.questionSearchContainer} ref={containerRef} onKeyDown={handleKeyDown}>
      <form onSubmit={onSubmit} className={styles.questionSearchForm}>
        <div className={styles.questionSearchWrapper}>
          {/* Service Selector Button */}
          <button
            ref={triggerRef}
            type="button"
            className={styles.serviceSelectBtn}
            onClick={onToggleSelector}
            title={selectServiceLabel}
            aria-label={selectServiceLabel}
            aria-expanded={showServiceSelector}
            aria-haspopup="listbox"
            aria-controls="service-dropdown"
          >
            <span className={styles.serviceSelectIcon} aria-hidden="true">
              {selectedIcon}
            </span>
            <span className={styles.serviceSelectArrow} aria-hidden="true">
              ▼
            </span>
          </button>

          {/* Service Dropdown */}
          {showServiceSelector && (
            <div
              id="service-dropdown"
              className={styles.serviceDropdown}
              role="listbox"
              aria-label={selectServiceLabel}
            >
              {serviceOptions.map((service, index) => {
                const isSelected = selectedService === service.key
                const isFocused = index === focusedIndex
                return (
                  <button
                    key={service.key}
                    ref={(el) => {
                      optionRefs.current[index] = el
                    }}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    tabIndex={isFocused ? 0 : -1}
                    className={`${styles.serviceDropdownItem} ${isSelected ? styles.selected : ''} ${isFocused ? styles.focused : ''}`}
                    onClick={() => {
                      onServiceSelect(service.key)
                      setFocusedIndex(-1)
                      triggerRef.current?.focus()
                    }}
                  >
                    <span className={styles.serviceDropdownIcon} aria-hidden="true">
                      {service.icon}
                    </span>
                    <span className={styles.serviceDropdownLabel}>{t(`menu.${service.key}`)}</span>
                  </button>
                )
              })}
            </div>
          )}

          <input
            type="text"
            className={styles.questionSearchInput}
            placeholder={
              typingPlaceholder ||
              translate('landing.searchPlaceholder', 'What would you like to know today?')
            }
            value={lifeQuestion}
            onChange={(e) => onQuestionChange(e.target.value)}
            onFocus={onFocus}
            autoComplete="off"
          />
          <button type="submit" className={styles.questionSearchBtn} aria-label="Search">
            &#10148;
          </button>
        </div>
        <div className={styles.questionHints}>
          {hints.map((hint, index) => (
            <button
              key={index}
              type="button"
              className={styles.questionHint}
              onClick={() => onHintClick(hint)}
            >
              {hint}
            </button>
          ))}
        </div>
      </form>

      {/* AI Routing Guide */}
      <div className={styles.aiRoutingGuide}>
        <p className={styles.aiRoutingText}>
          {translate('landing.aiRoutingText', 'Select a service and ask your question')}
        </p>
        <div className={styles.serviceIconsRow}>
          {serviceOptions.map((service) => (
            <span key={service.key} className={styles.serviceIcon} title={t(`menu.${service.key}`)}>
              {service.icon}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
})
