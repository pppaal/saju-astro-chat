'use client'

import React, { useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTypingAnimation } from '@/hooks/useTypingAnimation'
import { HOME_CORE_SERVICE_OPTIONS } from '@/lib/coreServices'

type CSSModule = Record<string, string>
type Locale = 'en' | 'ko'

interface ServiceSearchBoxProps {
  translate: (key: string, fallback: string) => string
  styles: CSSModule
  locale: Locale
}

type ServiceCopy = {
  description: string
  placeholder: string
}

export default function ServiceSearchBox({ translate, styles, locale }: ServiceSearchBoxProps) {
  const router = useRouter()
  const defaultService = HOME_CORE_SERVICE_OPTIONS[0]
  const [lifeQuestion, setLifeQuestion] = useState('')
  const [selectedService, setSelectedService] = useState<string | null>(defaultService?.key ?? null)

  const localizedFallback = useCallback(
    (ko: string, en: string) => (locale === 'ko' ? ko : en),
    [locale]
  )

  const selectedServiceOption =
    HOME_CORE_SERVICE_OPTIONS.find((service) => service.key === selectedService) || defaultService

  const serviceCopy = useMemo<Record<string, ServiceCopy>>(
    () => ({
      destinyMap: {
        description: translate(
          'landing.serviceDestinyCounselorDesc',
          localizedFallback(
            '질문을 입력하면 바로 상담형 해석으로 이어집니다.',
            'Ask a question and get a direct guided reading.'
          )
        ),
        placeholder: translate(
          'landing.serviceDestinyCounselorPlaceholder',
          localizedFallback(
            '결정, 관계, 걱정거리 중 지금 가장 답답한 내용을 적어보세요.',
            'Ask about a decision, relationship, or worry you want clarity on.'
          )
        ),
      },
      tarot: {
        description: translate(
          'landing.serviceTarotDesc',
          localizedFallback(
            '지금 흐름과 선택지를 빠르게 확인합니다.',
            'Check the current flow and your options quickly.'
          )
        ),
        placeholder: translate(
          'landing.serviceTarotPlaceholder',
          localizedFallback(
            '지금 이 상황을 타로로 보면 어떤 흐름인지 물어보세요.',
            'Ask what the cards say about this situation right now.'
          )
        ),
      },
      calendar: {
        description: translate(
          'landing.serviceCalendarDesc',
          localizedFallback(
            '좋은 타이밍과 주의 시점을 날짜 중심으로 봅니다.',
            'See better timing, caution windows, and date-based flow.'
          )
        ),
        placeholder: translate(
          'landing.serviceCalendarPlaceholder',
          localizedFallback(
            '언제 움직이는 게 좋을지, 날짜나 시점을 중심으로 물어보세요.',
            'Ask when to act, schedule, launch, or have an important talk.'
          )
        ),
      },
      report: {
        description: translate(
          'landing.serviceReportDesc',
          localizedFallback(
            '조금 더 길고 깊은 분석 결과를 정리합니다.',
            'Generate a deeper summary you can review in detail.'
          )
        ),
        placeholder: translate(
          'landing.serviceReportPlaceholder',
          localizedFallback(
            '어떤 주제를 깊게 정리한 리포트로 받고 싶은지 적어보세요.',
            'Ask what topic you want a more detailed report on.'
          )
        ),
      },
    }),
    [localizedFallback, translate]
  )

  const selectedServiceCopy = serviceCopy[selectedServiceOption.key] || {
    description: translate(
      'landing.aiRoutingText',
      localizedFallback(
        '리딩을 먼저 고르고, 질문은 한 문장으로 적어보세요.',
        'Choose a reading first, then ask one clear question.'
      )
    ),
    placeholder: translate(
      'landing.searchPlaceholder',
      localizedFallback(
        '지금 가장 알고 싶은 질문을 적어보세요.',
        'Ask the one thing you need clarity on.'
      )
    ),
  }

  const placeholders = useMemo(
    () => [
      translate('landing.hint1', localizedFallback('오늘 흐름', "Today's flow")),
      translate('landing.hint2', localizedFallback('연애 타이밍', 'Love timing')),
      translate('landing.hint3', localizedFallback('커리어 결정', 'Career move')),
      selectedServiceCopy.placeholder,
    ],
    [localizedFallback, selectedServiceCopy.placeholder, translate]
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
              {translate(
                'landing.selectService',
                localizedFallback('서비스 선택', 'Select service')
              )}
            </p>
            <h2 className={styles.serviceSelectTitle}>
              {translate(
                'landing.serviceSelectTitle',
                localizedFallback(
                  '원하는 리딩을 고르고, 질문을 입력하세요.',
                  'Choose the reading you want, then type your question.'
                )
              )}
            </h2>
          </div>
        </div>

        <div className={styles.serviceTabRow} role="tablist" aria-label="Services">
          {HOME_CORE_SERVICE_OPTIONS.map((service) => {
            const isActive = selectedService === service.key

            return (
              <button
                key={service.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setSelectedService(service.key)}
                className={`${styles.serviceTab} ${isActive ? styles.serviceTabActive : ''}`}
              >
                <span className={styles.serviceTabIcon}>{service.icon}</span>
                <span className={styles.serviceTabLabel}>
                  {translate(service.labelKey, service.labelFallback[locale])}
                </span>
              </button>
            )
          })}
        </div>

        <div className={styles.selectedServiceCard}>
          <div className={styles.selectedServiceHeading}>
            <span className={styles.selectedServiceBadgeIcon}>{selectedServiceOption.icon}</span>
            <span className={styles.selectedServiceBadge}>
              {translate(
                selectedServiceOption.labelKey,
                selectedServiceOption.labelFallback[locale]
              )}
            </span>
          </div>
          <p className={styles.selectedServiceDescription}>{selectedServiceCopy.description}</p>
        </div>

        <div className={styles.questionSearchWrapper}>
          <label htmlFor="destiny-question" className={styles.srOnly}>
            {translate(
              'landing.searchPlaceholder',
              localizedFallback('오늘 무엇이 궁금한가요?', 'What would you like to know today?')
            )}
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
          <button
            type="submit"
            className={styles.questionSearchBtn}
            aria-label={localizedFallback('질문 보내기', 'Submit question')}
          >
            &#10148;
          </button>
        </div>

        <div className={styles.questionHints}>
          <button
            type="button"
            className={styles.questionHint}
            onClick={() =>
              handleHintClick(
                translate('landing.hint1', localizedFallback('오늘 흐름', "Today's flow"))
              )
            }
          >
            {translate('landing.hint1', localizedFallback('오늘 흐름', "Today's flow"))}
          </button>
          <button
            type="button"
            className={styles.questionHint}
            onClick={() =>
              handleHintClick(
                translate('landing.hint2', localizedFallback('연애 타이밍', 'Love timing'))
              )
            }
          >
            {translate('landing.hint2', localizedFallback('연애 타이밍', 'Love timing'))}
          </button>
          <button
            type="button"
            className={styles.questionHint}
            onClick={() =>
              handleHintClick(
                translate('landing.hint3', localizedFallback('커리어 결정', 'Career move'))
              )
            }
          >
            {translate('landing.hint3', localizedFallback('커리어 결정', 'Career move'))}
          </button>
        </div>
      </form>
    </div>
  )
}
