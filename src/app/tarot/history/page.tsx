'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useI18n } from '@/i18n/I18nProvider'
import BackButton from '@/components/ui/BackButton'
import { EmptyState } from '@/components/ui/EmptyState'
import {
  getSavedReadings,
  deleteReading,
  formatRelativeTime,
  SavedTarotReading,
  mapServerReadingToSavedReading,
  storeReadingRestorePayload,
} from '@/lib/Tarot/tarot-storage'
import { apiFetch } from '@/lib/api'
import styles from './history.module.css'

type SortOption = 'newest' | 'oldest'
type FilterOption = 'all' | 'love' | 'career' | 'daily' | 'general'
type QuestionTypeFilter =
  | 'all'
  | 'other_response'
  | 'emotion_read'
  | 'flow_read'
  | 'decision'
  | 'open_read'

interface CardFrequency {
  name: string
  nameKo?: string
  count: number
  reversedCount: number
}

function truncateText(text: string | null | undefined, maxLength = 110): string {
  const normalized = (text || '').trim()
  if (!normalized) return ''
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, maxLength - 1).trim()}…`
}

function getQuestionProfileLabels(reading: SavedTarotReading): string[] {
  const profile = reading.questionAnalysis?.question_profile
  if (!profile) return []

  return [profile.type, profile.subject, profile.focus, profile.timeframe, profile.tone]
    .map((field) => field?.label?.trim() || '')
    .filter(Boolean)
}

function getQuestionTypeCode(reading: SavedTarotReading): string {
  return reading.questionAnalysis?.question_profile?.type?.code?.trim() || 'open_read'
}

export default function TarotHistoryPage() {
  const { language } = useI18n()
  const router = useRouter()
  const { data: session, status } = useSession()
  const isKo = language === 'ko'

  const [readings, setReadings] = useState<SavedTarotReading[]>([])
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [filterBy, setFilterBy] = useState<FilterOption>('all')
  const [questionTypeFilter, setQuestionTypeFilter] = useState<QuestionTypeFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedReading, setSelectedReading] = useState<SavedTarotReading | null>(null)
  const [showStats, setShowStats] = useState(false)
  const [isLoadingReadings, setIsLoadingReadings] = useState(true)

  const loadReadings = useCallback(async () => {
    if (session?.user?.id) {
      try {
        const response = await apiFetch('/api/tarot/save?limit=100')
        if (response.ok) {
          const payload = (await response.json()) as {
            readings?: Array<Parameters<typeof mapServerReadingToSavedReading>[0]>
          }
          const serverReadings = Array.isArray(payload.readings)
            ? payload.readings.map((reading) => mapServerReadingToSavedReading(reading))
            : []
          setReadings(serverReadings)
          return
        }
      } catch {
        // Fall back to local history when server history is unavailable.
      }
    }

    setReadings(getSavedReadings())
  }, [session?.user?.id])

  useEffect(() => {
    if (status === 'loading') {
      return
    }

    let cancelled = false
    setIsLoadingReadings(true)

    void loadReadings().finally(() => {
      if (!cancelled) {
        setIsLoadingReadings(false)
      }
    })

    return () => {
      cancelled = true
    }
  }, [loadReadings, status])

  // Filter and sort readings
  const filteredReadings = useMemo(() => {
    let result = [...readings]

    // Filter by category
    if (filterBy !== 'all') {
      result = result.filter((r) => {
        const category = r.categoryId.toLowerCase()
        switch (filterBy) {
          case 'love':
            return category.includes('love') || category.includes('relationship')
          case 'career':
            return category.includes('career') || category.includes('work')
          case 'daily':
            return category.includes('daily') || category.includes('today')
          case 'general':
            return (
              !category.includes('love') &&
              !category.includes('relationship') &&
              !category.includes('career') &&
              !category.includes('work') &&
              !category.includes('daily') &&
              !category.includes('today')
            )
          default:
            return true
        }
      })
    }

    if (questionTypeFilter !== 'all') {
      result = result.filter((r) => getQuestionTypeCode(r) === questionTypeFilter)
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (r) =>
          r.question.toLowerCase().includes(query) ||
          (r.questionAnalysis?.question_summary || '').toLowerCase().includes(query) ||
          (r.questionAnalysis?.direct_answer || '').toLowerCase().includes(query) ||
          r.cards.some(
            (c) => c.name.toLowerCase().includes(query) || c.nameKo?.toLowerCase().includes(query)
          )
      )
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'newest') {
        return b.timestamp - a.timestamp
      }
      return a.timestamp - b.timestamp
    })

    return result
  }, [readings, sortBy, filterBy, questionTypeFilter, searchQuery])

  // Card frequency statistics
  const cardStats = useMemo((): CardFrequency[] => {
    const freqMap = new Map<string, CardFrequency>()

    readings.forEach((reading) => {
      reading.cards.forEach((card) => {
        const existing = freqMap.get(card.name) || {
          name: card.name,
          nameKo: card.nameKo,
          count: 0,
          reversedCount: 0,
        }
        existing.count++
        if (card.isReversed) {
          existing.reversedCount++
        }
        freqMap.set(card.name, existing)
      })
    })

    return Array.from(freqMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }, [readings])

  const handleDelete = async (reading: SavedTarotReading, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm(isKo ? '이 리딩을 삭제하시겠습니까?' : 'Delete this reading?')) {
      if (reading.storageOrigin === 'server' && session?.user?.id) {
        const response = await apiFetch(`/api/tarot/save/${reading.id}`, {
          method: 'DELETE',
        })
        if (response.ok) {
          setReadings((prev) => prev.filter((item) => item.id !== reading.id))
        }
      } else {
        deleteReading(reading.id)
        setReadings(getSavedReadings())
      }
      if (selectedReading?.id === reading.id) {
        setSelectedReading(null)
      }
    }
  }

  const handleViewReading = (reading: SavedTarotReading) => {
    setSelectedReading(reading)
  }

  const handleResumeReading = useCallback(
    (reading: SavedTarotReading) => {
      const restoreKey = storeReadingRestorePayload(reading)
      const question = (reading.question || '').trim()
      const params = new URLSearchParams()
      if (question) {
        params.set('question', question)
      }
      if (restoreKey) {
        params.set('restoreKey', restoreKey)
      }
      router.push(`/tarot/${reading.categoryId}/${reading.spreadId}?${params.toString()}`)
    },
    [router]
  )

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <BackButton />
        <h1 className={styles.title}>{isKo ? '타로 리딩 기록' : 'Tarot Reading History'}</h1>
        <button
          className={`${styles.statsToggle} ${showStats ? styles.active : ''}`}
          onClick={() => setShowStats(!showStats)}
          aria-label={
            isKo
              ? showStats
                ? '통계 숨기기'
                : '통계 보기'
              : showStats
                ? 'Hide statistics'
                : 'Show statistics'
          }
          aria-expanded={showStats}
        >
          📊
        </button>
      </div>

      {/* Stats Panel */}
      {showStats && (
        <div className={`${styles.statsPanel} ${styles.statsPanelVisible}`}>
          <h3 className={styles.statsSectionTitle}>
            {isKo ? '자주 나온 카드 TOP 10' : 'Most Frequent Cards TOP 10'}
          </h3>
          {cardStats.length > 0 ? (
            <div className={styles.statsGrid}>
              {cardStats.map((stat, idx) => (
                <div key={stat.name} className={styles.statCard}>
                  <span className={styles.statRank}>#{idx + 1}</span>
                  <span className={styles.statName}>
                    {isKo ? stat.nameKo || stat.name : stat.name}
                  </span>
                  <span className={styles.statCount}>
                    {stat.count}
                    {isKo ? '회' : 'x'}
                    {stat.reversedCount > 0 && (
                      <span className={styles.reversedCount}>
                        ({stat.reversedCount} {isKo ? '역방향' : 'reversed'})
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className={styles.emptyStats}>{isKo ? '아직 데이터가 없습니다' : 'No data yet'}</p>
          )}
          <div className={styles.totalReadings}>
            {isKo ? `총 ${readings.length}개의 리딩` : `${readings.length} total readings`}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className={styles.controls}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder={isKo ? '질문 또는 카드 검색...' : 'Search questions or cards...'}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <select
          className={styles.select}
          value={filterBy}
          onChange={(e) => setFilterBy(e.target.value as FilterOption)}
        >
          <option value="all">{isKo ? '전체' : 'All'}</option>
          <option value="love">{isKo ? '연애' : 'Love'}</option>
          <option value="career">{isKo ? '커리어' : 'Career'}</option>
          <option value="daily">{isKo ? '오늘의 운세' : 'Daily'}</option>
          <option value="general">{isKo ? '일반' : 'General'}</option>
        </select>
        <select
          className={styles.select}
          value={questionTypeFilter}
          onChange={(e) => setQuestionTypeFilter(e.target.value as QuestionTypeFilter)}
        >
          <option value="all">{isKo ? '질문 유형 전체' : 'All question types'}</option>
          <option value="other_response">{isKo ? '상대 반응' : 'Other response'}</option>
          <option value="emotion_read">{isKo ? '감정 해석' : 'Emotion reading'}</option>
          <option value="flow_read">{isKo ? '흐름 해석' : 'Flow reading'}</option>
          <option value="decision">{isKo ? '선택/조언' : 'Decision/advice'}</option>
          <option value="open_read">{isKo ? '열린 질문' : 'Open reading'}</option>
        </select>
        <select
          className={styles.select}
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
        >
          <option value="newest">{isKo ? '최신순' : 'Newest'}</option>
          <option value="oldest">{isKo ? '오래된순' : 'Oldest'}</option>
        </select>
      </div>

      {/* Reading List */}
      <div className={styles.readingList}>
        {isLoadingReadings ? (
          <EmptyState
            icon="🔮"
            title={isKo ? '기록을 불러오는 중...' : 'Loading readings...'}
            description={isKo ? '저장된 리딩을 확인하고 있습니다.' : 'Fetching your saved readings.'}
          />
        ) : filteredReadings.length > 0 ? (
          filteredReadings.map((reading) => {
            const summary = reading.questionAnalysis?.question_summary?.trim()
            const directAnswer = reading.questionAnalysis?.direct_answer?.trim()
            const profileLabels = getQuestionProfileLabels(reading)

            return (
              <div
                key={reading.id}
                className={styles.readingCard}
                role="button"
                tabIndex={0}
                onClick={() => handleViewReading(reading)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleViewReading(reading)
                  }
                }}
                aria-label={`View ${reading.spread.title} reading from ${new Date(reading.timestamp).toLocaleDateString()}`}
              >
                <div className={styles.readingHeader}>
                  <span className={styles.readingTime}>
                    {formatRelativeTime(reading.timestamp, isKo)}
                  </span>
                  <button
                    className={styles.deleteBtn}
                    onClick={(e) => void handleDelete(reading, e)}
                  >
                    ✕
                  </button>
                </div>
                <p className={styles.readingQuestion}>{reading.question}</p>
                {summary && <p className={styles.readingSummary}>{summary}</p>}
                {directAnswer && (
                  <div className={styles.directAnswerPreview}>
                    <span className={styles.previewLabel}>
                      {isKo ? 'AI 선해석' : 'Pre-read Answer'}
                    </span>
                    <p>{truncateText(directAnswer, 120)}</p>
                  </div>
                )}
                {profileLabels.length > 0 && (
                  <div className={styles.profileChips}>
                    {profileLabels.slice(0, 4).map((label: string) => (
                      <span key={`${reading.id}-${label}`} className={styles.profileChip}>
                        {label}
                      </span>
                    ))}
                  </div>
                )}
                <div className={styles.readingMeta}>
                  <span className={styles.spreadName}>
                    {isKo ? reading.spread.titleKo || reading.spread.title : reading.spread.title}
                  </span>
                  <span className={styles.cardCount}>🃏 {reading.cards.length}</span>
                </div>
                <div className={styles.cardPreview}>
                  {reading.cards.slice(0, 5).map((card, idx) => (
                    <span
                      key={idx}
                      className={`${styles.cardChip} ${card.isReversed ? styles.reversed : ''}`}
                      title={isKo ? card.nameKo || card.name : card.name}
                    >
                      {(isKo ? card.nameKo || card.name : card.name).substring(0, 8)}
                      {card.isReversed && ' ↓'}
                    </span>
                  ))}
                  {reading.cards.length > 5 && (
                    <span className={styles.moreCards}>+{reading.cards.length - 5}</span>
                  )}
                </div>
              </div>
            )
          })
        ) : (
          <EmptyState
            icon="🔮"
            title={
              searchQuery || filterBy !== 'all' || questionTypeFilter !== 'all'
                ? isKo
                  ? '검색 결과가 없습니다'
                  : 'No results found'
                : isKo
                  ? '저장된 리딩이 없습니다'
                  : 'No saved readings yet'
            }
            description={
              searchQuery || filterBy !== 'all' || questionTypeFilter !== 'all'
                ? isKo
                  ? '다른 검색어나 필터를 시도해보세요'
                  : 'Try different keywords or filters'
                : isKo
                  ? '타로 카드로 미래를 예측해보세요'
                  : 'Start your first tarot reading'
            }
            actionButton={
              !searchQuery && filterBy === 'all' && questionTypeFilter === 'all'
                ? {
                    text: isKo ? '타로 시작하기' : 'Start a Reading',
                    onClick: () => router.push('/tarot'),
                  }
                : undefined
            }
          />
        )}
      </div>

      {/* Reading Detail Modal */}
      {selectedReading && (
        <div
          className={`${styles.modalOverlay} ${styles.modalOverlayVisible}`}
          onClick={() => setSelectedReading(null)}
        >
          <div
            className={`${styles.modalContent} ${styles.modalContentVisible}`}
            onClick={(e) => e.stopPropagation()}
          >
            <button className={styles.modalClose} onClick={() => setSelectedReading(null)}>
              ✕
            </button>
            <h2 className={styles.modalTitle}>
              {isKo
                ? selectedReading.spread.titleKo || selectedReading.spread.title
                : selectedReading.spread.title}
            </h2>
            <p className={styles.modalTime}>
              {formatRelativeTime(selectedReading.timestamp, isKo)}
            </p>
            <div className={styles.modalQuestion}>
              <strong>{isKo ? '질문:' : 'Question:'}</strong> {selectedReading.question}
            </div>

            {(() => {
              const summary = selectedReading.questionAnalysis?.question_summary?.trim()
              const directAnswer = selectedReading.questionAnalysis?.direct_answer?.trim()
              const profile = selectedReading.questionAnalysis?.question_profile
              const profileRows = [
                { key: 'type', title: isKo ? '질문 종류' : 'Type', value: profile?.type?.label?.trim() },
                { key: 'subject', title: isKo ? '주체' : 'Subject', value: profile?.subject?.label?.trim() },
                { key: 'focus', title: isKo ? '핵심 포커스' : 'Focus', value: profile?.focus?.label?.trim() },
                {
                  key: 'timeframe',
                  title: isKo ? '시간축' : 'Timeframe',
                  value: profile?.timeframe?.label?.trim(),
                },
                { key: 'tone', title: isKo ? '질문 톤' : 'Tone', value: profile?.tone?.label?.trim() },
              ].filter((row) => row.value)

              if (!summary && !directAnswer && profileRows.length === 0) {
                return null
              }

              return (
                <div className={styles.modalAnalysis}>
                  <h4 className={styles.modalSectionTitle}>
                    {isKo ? '질문 이해' : 'Question Understanding'}
                  </h4>
                  {summary && (
                    <div className={styles.modalSummary}>
                      <strong>{isKo ? '질문 요약' : 'Summary'}</strong>
                      <p>{summary}</p>
                    </div>
                  )}
                  {profileRows.length > 0 && (
                    <div className={styles.modalProfileGrid}>
                      {profileRows.map((row) => (
                        <div key={row.key} className={styles.modalProfileItem}>
                          <span>{row.title}</span>
                          <strong>{row.value}</strong>
                        </div>
                      ))}
                    </div>
                  )}
                  {directAnswer && (
                    <div className={styles.modalDirectAnswer}>
                      <strong>{isKo ? 'AI 선해석' : 'Pre-read Answer'}</strong>
                      <p>{directAnswer}</p>
                    </div>
                  )}
                </div>
              )
            })()}

            <div className={styles.modalCards}>
              <h4>{isKo ? '뽑은 카드' : 'Drawn Cards'}</h4>
              {selectedReading.cards.map((card, idx) => (
                <div key={idx} className={styles.modalCardItem}>
                  <span className={styles.modalCardPosition}>
                    {isKo ? card.positionKo || card.position : card.position}
                  </span>
                  <span
                    className={`${styles.modalCardName} ${card.isReversed ? styles.reversed : ''}`}
                  >
                    {isKo ? card.nameKo || card.name : card.name}
                    {card.isReversed && (isKo ? ' (역방향)' : ' (Reversed)')}
                  </span>
                </div>
              ))}
            </div>

            {selectedReading.interpretation.overallMessage && (
              <div className={styles.modalInterpretation}>
                <h4>{isKo ? '해석' : 'Interpretation'}</h4>
                <p>{selectedReading.interpretation.overallMessage}</p>
                {selectedReading.interpretation.guidance && (
                  <div className={styles.modalGuidance}>
                    <strong>{isKo ? '조언:' : 'Guidance:'}</strong>{' '}
                    {selectedReading.interpretation.guidance}
                  </div>
                )}
              </div>
            )}

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.resumeButton}
                onClick={() => handleResumeReading(selectedReading)}
              >
                {isKo ? '이 리딩 다시 열기' : 'Open this reading again'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
