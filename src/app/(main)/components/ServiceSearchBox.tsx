'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTypingAnimation } from '@/hooks/useTypingAnimation'
import { HOME_CORE_SERVICE_OPTIONS } from '@/lib/coreServices'

type CSSModule = Record<string, string>

interface ServiceSearchBoxProps {
  translate: (key: string, fallback: string) => string
  styles: CSSModule
}

const SERVICE_PAGE_SIZE = 7

export default function ServiceSearchBox({ translate, styles }: ServiceSearchBoxProps) {
  const router = useRouter()

  const [lifeQuestion, setLifeQuestion] = useState('')
  const [showServiceSelector, setShowServiceSelector] = useState(false)
  const [selectedService, setSelectedService] = useState<string | null>(null)
  const [servicePage, setServicePage] = useState(0)
  const searchContainerRef = useRef<HTMLDivElement>(null)

  const servicePageCount = Math.max(
    1,
    Math.ceil(HOME_CORE_SERVICE_OPTIONS.length / SERVICE_PAGE_SIZE)
  )
  const maxServicePage = servicePageCount - 1

  // Memoized placeholders for typing animation
  const placeholders = React.useMemo(
    () => [
      translate('landing.hint1', 'How is my fortune today?'),
      translate('landing.hint2', 'How is my love luck?'),
      translate('landing.hint3', 'Should I change jobs?'),
      translate('landing.searchPlaceholder', 'What would you like to know today?'),
    ],
    [translate]
  )

  const typingPlaceholder = useTypingAnimation(placeholders, 1000)

  const closeServiceSelector = useCallback(() => {
    setShowServiceSelector(false)
    setServicePage(0)
  }, [])
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        closeServiceSelector()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [closeServiceSelector])

  // Close dropdown when scrolling
  useEffect(() => {
    if (!showServiceSelector) {
      return
    }

    const handleScroll = () => {
      closeServiceSelector()
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [showServiceSelector, closeServiceSelector])

  // Prevent body scroll when dropdown is open on mobile
  useEffect(() => {
    if (showServiceSelector) {
      const originalStyle = window.getComputedStyle(document.body).overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = originalStyle
      }
    }
  }, [showServiceSelector])

  useEffect(() => {
    if (servicePage > maxServicePage) {
      setServicePage(maxServicePage)
    }
  }, [servicePage, maxServicePage])

  // Handle question submission - navigate to selected service with the question
  const handleQuestionSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      const service =
        HOME_CORE_SERVICE_OPTIONS.find((s) => s.key === selectedService) ||
        HOME_CORE_SERVICE_OPTIONS[0]
      if (lifeQuestion.trim()) {
        router.push(`${service.path}?q=${encodeURIComponent(lifeQuestion.trim())}`)
      } else {
        router.push(service.path)
      }
      setShowServiceSelector(false)
    },
    [lifeQuestion, router, selectedService]
  )

  // Handle service selection
  const handleServiceSelect = useCallback((serviceKey: string) => {
    setSelectedService(serviceKey)
    setShowServiceSelector(false)
  }, [])

  const handleHintClick = useCallback(
    (hint: string) => {
      setLifeQuestion(hint)
      const service =
        HOME_CORE_SERVICE_OPTIONS.find((s) => s.key === selectedService) ||
        HOME_CORE_SERVICE_OPTIONS[0]
      router.push(`${service.path}?q=${encodeURIComponent(hint)}`)
    },
    [router, selectedService]
  )

  return (
    <div className={styles.questionSearchContainer} ref={searchContainerRef}>
      <form onSubmit={handleQuestionSubmit} className={styles.questionSearchForm}>
        <div className={styles.questionSearchWrapper}>
          {/* Service Selector Button */}
          <button
            type="button"
            className={styles.serviceSelectBtn}
            onClick={() => setShowServiceSelector(!showServiceSelector)}
            title={translate('landing.selectService', '서비스 선택')}
          >
            <span className={styles.serviceSelectIcon}>
              {HOME_CORE_SERVICE_OPTIONS.find((s) => s.key === selectedService)?.icon || '🌟'}
            </span>
            <span className={styles.serviceSelectArrow}>▼</span>
          </button>

          {/* Service Dropdown - Paginated (7 per page) */}
          {showServiceSelector && (
            <div className={styles.serviceDropdown}>
              <div className={styles.serviceDropdownGrid}>
                {HOME_CORE_SERVICE_OPTIONS.slice(
                  servicePage * SERVICE_PAGE_SIZE,
                  (servicePage + 1) * SERVICE_PAGE_SIZE
                ).map((service) => (
                  <button
                    key={service.key}
                    type="button"
                    className={`${styles.serviceDropdownItem} ${selectedService === service.key ? styles.selected : ''}`}
                    onClick={() => handleServiceSelect(service.key)}
                  >
                    <span className={styles.serviceDropdownIcon}>{service.icon}</span>
                    <span className={styles.serviceDropdownLabel}>
                      {translate(service.labelKey, service.labelFallback)}
                    </span>
                  </button>
                ))}
              </div>

              {/* Page navigation */}
              {servicePageCount > 1 && (
                <div className={styles.serviceDropdownNav}>
                  <button
                    type="button"
                    className={`${styles.serviceDropdownNavBtn} ${servicePage === 0 ? styles.disabled : ''}`}
                    onClick={() => setServicePage((prev) => Math.max(0, prev - 1))}
                    disabled={servicePage === 0}
                    aria-label="Previous page"
                  >
                    &#8249;
                  </button>
                  <div className={styles.serviceDropdownDots}>
                    {Array.from({ length: servicePageCount }).map((_, idx) => (
                      <span
                        key={`service-dot-${idx}`}
                        className={`${styles.serviceDropdownDot} ${servicePage === idx ? styles.active : ''}`}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    className={`${styles.serviceDropdownNavBtn} ${servicePage === maxServicePage ? styles.disabled : ''}`}
                    onClick={() => setServicePage((prev) => Math.min(maxServicePage, prev + 1))}
                    disabled={servicePage === maxServicePage}
                    aria-label="Next page"
                  >
                    &#8250;
                  </button>
                </div>
              )}
            </div>
          )}

          <label htmlFor="destiny-question" className={styles.srOnly}>
            {translate('landing.searchPlaceholder', '오늘 무엇이 궁금하세요?')}
          </label>
          <input
            id="destiny-question"
            type="text"
            className={styles.questionSearchInput}
            placeholder={
              typingPlaceholder || translate('landing.searchPlaceholder', '오늘 무엇이 궁금하세요?')
            }
            value={lifeQuestion}
            onChange={(e) => setLifeQuestion(e.target.value)}
            onFocus={() => setShowServiceSelector(false)}
            autoComplete="off"
          />
          <button type="submit" className={styles.questionSearchBtn} aria-label="Search">
            &#10148;
          </button>
        </div>
        <div className={styles.questionHints}>
          <button
            type="button"
            className={styles.questionHint}
            onClick={() => handleHintClick(translate('landing.hint1', '오늘의 운세가 궁금해요'))}
          >
            {translate('landing.hint1', '오늘의 운세가 궁금해요')}
          </button>
          <button
            type="button"
            className={styles.questionHint}
            onClick={() => handleHintClick(translate('landing.hint2', '연애운이 어떨까요?'))}
          >
            {translate('landing.hint2', '연애운이 어떨까요?')}
          </button>
          <button
            type="button"
            className={styles.questionHint}
            onClick={() => handleHintClick(translate('landing.hint3', '이직해도 될까요?'))}
          >
            {translate('landing.hint3', '이직해도 될까요?')}
          </button>
        </div>
      </form>

      {/* AI Routing Guide */}
      <div className={styles.aiRoutingGuide}>
        <p className={styles.aiRoutingText}>
          <span className={styles.aiRoutingIcon}>💡</span>
          {translate('landing.aiRoutingText', '서비스를 선택하거나 바로 질문하세요')}
        </p>
        <div className={styles.serviceIconsRow}>
          {HOME_CORE_SERVICE_OPTIONS.map((service) => (
            <button
              key={service.key}
              type="button"
              className={`${styles.serviceIcon} ${selectedService === service.key ? styles.serviceIconActive : ''}`}
              title={translate(service.labelKey, service.labelFallback)}
              onClick={() => handleServiceSelect(service.key)}
            >
              {service.icon}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
