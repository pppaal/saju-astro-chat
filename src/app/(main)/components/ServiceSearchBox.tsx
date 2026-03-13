'use client'

import React, { useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTypingAnimation } from '@/hooks/useTypingAnimation'
import { HOME_CORE_SERVICE_OPTIONS } from '@/lib/coreServices'

type CSSModule = Record<string, string>

interface ServiceSearchBoxProps {
  translate: (key: string, fallback: string) => string
  styles: CSSModule
}

type ServiceCopy = {
  description: string
  placeholder: string
}

export default function ServiceSearchBox({ translate, styles }: ServiceSearchBoxProps) {
  const router = useRouter()
  const defaultService = HOME_CORE_SERVICE_OPTIONS[0]

  const [lifeQuestion, setLifeQuestion] = useState('')
  const [selectedService, setSelectedService] = useState<string | null>(defaultService?.key ?? null)

  const selectedServiceOption =
    HOME_CORE_SERVICE_OPTIONS.find((service) => service.key === selectedService) || defaultService

  const serviceCopy = useMemo<Record<string, ServiceCopy>>(
    () => ({
      destinyMap: {
        description: translate(
          'landing.serviceDestinyCounselorDesc',
          'Ask a question and get a direct guided reading.'
        ),
        placeholder: translate(
          'landing.serviceDestinyCounselorPlaceholder',
          'Ask about a decision, relationship, or worry you want clarity on.'
        ),
      },
      tarot: {
        description: translate(
          'landing.serviceTarotDesc',
          'Check the current flow and your options quickly.'
        ),
        placeholder: translate(
          'landing.serviceTarotPlaceholder',
          'Ask what the cards say about this situation right now.'
        ),
      },
      calendar: {
        description: translate(
          'landing.serviceCalendarDesc',
          'See better timing, caution windows, and date-based flow.'
        ),
        placeholder: translate(
          'landing.serviceCalendarPlaceholder',
          'Ask when to act, schedule, launch, or have an important talk.'
        ),
      },
      report: {
        description: translate(
          'landing.serviceReportDesc',
          'Generate a deeper summary you can review in detail.'
        ),
        placeholder: translate(
          'landing.serviceReportPlaceholder',
          'Ask what topic you want a more detailed report on.'
        ),
      },
    }),
    [translate]
  )

  const selectedServiceCopy = serviceCopy[selectedServiceOption.key] || {
    description: translate(
      'landing.aiRoutingText',
      'Choose a reading first, then ask one clear question.'
    ),
    placeholder: translate('landing.searchPlaceholder', 'Ask the one thing you need clarity on.'),
  }

  const placeholders = useMemo(
    () => [
      translate('landing.hint1', "Today's flow"),
      translate('landing.hint2', 'Love timing'),
      translate('landing.hint3', 'Career move'),
      selectedServiceCopy.placeholder,
    ],
    [selectedServiceCopy.placeholder, translate]
  )

  const typingPlaceholder = useTypingAnimation(placeholders, 1000)

  const handleQuestionSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()

      if (lifeQuestion.trim()) {
        router.push(`${selectedServiceOption.path}?q=${encodeURIComponent(lifeQuestion.trim())}`)
      } else {
        router.push(selectedServiceOption.path)
      }
    },
    [lifeQuestion, router, selectedServiceOption.path]
  )

  const handleHintClick = useCallback(
    (hint: string) => {
      setLifeQuestion(hint)
      router.push(`${selectedServiceOption.path}?q=${encodeURIComponent(hint)}`)
    },
    [router, selectedServiceOption.path]
  )

  return (
    <div className={styles.questionSearchContainer}>
      <form onSubmit={handleQuestionSubmit} className={styles.questionSearchForm}>
        <div className={styles.searchPanelHeader}>
          <div className={styles.serviceChoiceIntro}>
            <p className={styles.serviceSelectCaption}>
              {translate('landing.selectService', 'Select service')}
            </p>
            <h2 className={styles.serviceSelectTitle}>
              {translate(
                'landing.serviceSelectTitle',
                'Choose the reading you want, then type your question.'
              )}
            </h2>
          </div>

          <p className={styles.aiRoutingText}>
            <span className={styles.aiRoutingIcon}>✦</span>
            {selectedServiceCopy.description}
          </p>
        </div>

        <div className={styles.serviceChoiceGrid}>
          {HOME_CORE_SERVICE_OPTIONS.map((service) => {
            const copy = serviceCopy[service.key]
            const isActive = selectedService === service.key

            return (
              <button
                key={service.key}
                type="button"
                className={`${styles.serviceChoiceCard} ${isActive ? styles.serviceChoiceCardActive : ''}`}
                onClick={() => setSelectedService(service.key)}
                aria-pressed={isActive}
              >
                <span className={styles.serviceChoiceHead}>
                  <span className={styles.serviceChoiceIcon}>{service.icon}</span>
                  <span className={styles.serviceChoiceMeta}>
                    <span className={styles.serviceChoiceName}>
                      {translate(service.labelKey, service.labelFallback)}
                    </span>
                    <span className={styles.serviceChoiceDesc}>
                      {copy?.description || selectedServiceCopy.description}
                    </span>
                  </span>
                </span>
                {isActive ? (
                  <span className={styles.serviceChoiceStatus}>
                    {translate('landing.serviceSelected', 'Selected')}
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>

        <div className={styles.selectedServiceRow}>
          <span className={styles.selectedServiceBadge}>
            <span className={styles.selectedServiceBadgeIcon}>{selectedServiceOption.icon}</span>
            <span>
              {translate(selectedServiceOption.labelKey, selectedServiceOption.labelFallback)}
            </span>
          </span>
          <span className={styles.selectedServiceNote}>
            {translate(
              'landing.selectedServiceNote',
              'Your question will go straight into this reading.'
            )}
          </span>
        </div>

        <div className={styles.questionSearchWrapper}>
          <label htmlFor="destiny-question" className={styles.srOnly}>
            {translate('landing.searchPlaceholder', 'What would you like to know today?')}
          </label>
          <input
            id="destiny-question"
            type="text"
            className={styles.questionSearchInput}
            placeholder={typingPlaceholder || selectedServiceCopy.placeholder}
            value={lifeQuestion}
            onChange={(e) => setLifeQuestion(e.target.value)}
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
            onClick={() => handleHintClick(translate('landing.hint1', "Today's flow"))}
          >
            {translate('landing.hint1', "Today's flow")}
          </button>
          <button
            type="button"
            className={styles.questionHint}
            onClick={() => handleHintClick(translate('landing.hint2', 'Love timing'))}
          >
            {translate('landing.hint2', 'Love timing')}
          </button>
          <button
            type="button"
            className={styles.questionHint}
            onClick={() => handleHintClick(translate('landing.hint3', 'Career move'))}
          >
            {translate('landing.hint3', 'Career move')}
          </button>
        </div>
      </form>
    </div>
  )
}
