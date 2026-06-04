'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  BarChart3,
  ChevronDown,
  ChevronUp,
  MoonStar,
  Search,
  X,
  RotateCcw,
  Sparkles,
} from 'lucide-react'
import { useI18n } from '@/i18n/I18nProvider'
import { apiFetch } from '@/lib/api'
import { CosmicBackdrop } from '@/components/ui/CosmicBackdrop'
import { findCardBySavedName } from '@/lib/tarot/findCardByName'

import {
  deleteReading,
  formatRelativeTime,
  getSavedReadings,
  mapServerReadingToSavedReading,
  migrateLocalReadingsToServer,
  type SavedTarotReading,
  storeReadingRestorePayload,
} from './historyClientUtils'

type SortOption = 'newest' | 'oldest'

type CardFrequency = {
  name: string
  nameKo?: string
  count: number
  reversedCount: number
}

function truncate(text: string | null | undefined, maxLength = 140): string {
  const normalized = (text || '').trim()
  if (!normalized) return ''
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, maxLength - 1).trim()}…`
}

/**
 * 저장 origin 별 배지 라벨 — 어디서 뽑은 리딩인지 한눈에 보이게.
 * 운명/궁합 상담사 안에서 본 인라인 타로 vs 단독 /tarot 페이지 구분.
 * source 없으면(=구버전 데이터 / standalone) null 반환해 배지 미표시.
 */
function getSourceBadge(
  source: string | undefined | null,
  isKo: boolean
): { label: string; color: string; bg: string; border: string } | null {
  switch (source) {
    case 'counselor-destiny':
      return {
        label: isKo ? '🌙 운명 안에서' : '🌙 From Destiny',
        color: '#e8cc8a',
        bg: 'rgba(212, 181, 114, 0.12)',
        border: 'rgba(212, 181, 114, 0.32)',
      }
    case 'counselor-compat':
      return {
        label: isKo ? '💞 궁합 안에서' : '💞 From Compatibility',
        color: '#fbcfe8',
        bg: 'rgba(236, 72, 153, 0.12)',
        border: 'rgba(236, 72, 153, 0.32)',
      }
    case 'counselor':
      return {
        label: isKo ? '💬 상담 안에서' : '💬 From Counselor',
        color: '#bae6fd',
        bg: 'rgba(56, 189, 248, 0.12)',
        border: 'rgba(56, 189, 248, 0.32)',
      }
    default:
      return null
  }
}

function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: { text: string; onClick: () => void }
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-3">
      <div
        className="p-4 rounded-full border"
        style={{
          background: 'rgba(212, 181, 114, 0.08)',
          borderColor: 'var(--ds-gold-line)',
          boxShadow: '0 0 32px rgba(212, 181, 114, 0.18)',
        }}
      >
        <MoonStar className="w-8 h-8" style={{ color: 'var(--ds-gold-on-dark)' }} />
      </div>
      <h2 className="text-lg font-semibold text-slate-100 mt-2">{title}</h2>
      <p className="text-sm max-w-xs" style={{ color: 'var(--ds-dark-text-muted)' }}>
        {description}
      </p>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-3 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
          style={{
            background: 'var(--ds-gold-on-dark)',
            color: 'var(--ds-dark-bg)',
            boxShadow: '0 0 24px rgba(212, 181, 114, 0.25)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--ds-gold-on-dark-soft)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--ds-gold-on-dark)'
          }}
        >
          {action.text}
        </button>
      )}
    </div>
  )
}

// 한 페이지 크기. 직전엔 limit=100 으로 한 번만 받고 멈춰서, 리딩이 100 개를
// 넘는 사용자는 오래된 리딩이 히스토리·통계에서 조용히 누락됐다. offset 기반
// "더 보기" 로 전부 접근 가능하게 한다.
const HISTORY_PAGE_SIZE = 50

type RawHistoryResponse = {
  readings?: Array<Parameters<typeof mapServerReadingToSavedReading>[0]>
  hasMore?: boolean
  data?: {
    readings?: Array<Parameters<typeof mapServerReadingToSavedReading>[0]>
    hasMore?: boolean
  }
}

// API 는 { success, data: { readings, hasMore } } 로 감싸므로 nested 우선,
// flat 도 호환. readings 매핑 + 다음 페이지 존재 여부 반환.
function parseHistoryPage(raw: RawHistoryResponse): {
  readings: SavedTarotReading[]
  hasMore: boolean
} {
  const list = raw.data?.readings ?? raw.readings
  const hasMore = raw.data?.hasMore ?? raw.hasMore ?? false
  const readings = Array.isArray(list) ? list.map((r) => mapServerReadingToSavedReading(r)) : []
  return { readings, hasMore }
}

export default function TarotHistoryClient() {
  const router = useRouter()
  const { language } = useI18n()
  const isKo = language === 'ko'

  const [readings, setReadings] = useState<SavedTarotReading[]>([])
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedReading, setSelectedReading] = useState<SavedTarotReading | null>(null)
  // 카드별 해석을 펼친 카드 인덱스 (한 번에 하나만). 모달이 닫히거나 다른
  // 리딩을 열면 reset.
  const [expandedCardIdx, setExpandedCardIdx] = useState<number | null>(null)
  const [showStats, setShowStats] = useState(false)
  const [isLoadingReadings, setIsLoadingReadings] = useState(true)
  const [deleteNotice, setDeleteNotice] = useState('')
  // 페이지네이션 — 서버에 더 받을 리딩이 남았는지 + 다음 조회 offset.
  const [hasMore, setHasMore] = useState(false)
  const [nextOffset, setNextOffset] = useState(0)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  const loadReadings = useCallback(async () => {
    try {
      // apiFetch (credentials:'include' + x-api-token) — native fetch 의
      // 'same-origin' 은 모바일 인앱 브라우저(카카오톡 등)에서 세션 쿠키가
      // 누락돼 GET 이 401 로 떨어지고, catch 가 로컬(getSavedReadings) 로만
      // 폴백해 서버에 저장된 리딩이 히스토리에 안 뜨던 회귀 차단 (#1037 의
      // 인라인 save 와 동일 수정).
      const firstPageUrl = `/api/tarot/save?limit=${HISTORY_PAGE_SIZE}&offset=0`
      const response = await apiFetch(firstPageUrl)
      if (response.ok) {
        // 로그인 사용자임을 확인 — 게스트 시절 localStorage 에 쌓인 리딩이 있으면 서버로 1회 이전.
        // flag 로 한 번만 실행되고, 실패 시 다음 방문에 재시도하지 않으려고 flag 안 박음.
        const migration = await migrateLocalReadingsToServer()
        const raw = (await (migration.migrated > 0
          ? apiFetch(firstPageUrl).then((r) => r.json())
          : response.json())) as RawHistoryResponse
        const page = parseHistoryPage(raw)
        setReadings(page.readings)
        setNextOffset(page.readings.length)
        setHasMore(page.hasMore)
        if (migration.migrated > 0) {
          setDeleteNotice(
            isKo
              ? `이전 ${migration.migrated}개의 리딩을 계정으로 옮겼어요.`
              : `Imported ${migration.migrated} guest reading${migration.migrated > 1 ? 's' : ''}.`
          )
        }
        return
      }
    } catch {
      // Fall back to local storage when server history is unavailable.
    }
    setReadings(getSavedReadings())
    setHasMore(false)
  }, [isKo])

  // "더 보기" — 다음 페이지를 받아 기존 목록에 append. id 중복은 제거(혹시
  // 모를 동시 저장/경계 케이스 방어). 실패해도 조용히 — 버튼은 남아 재시도 가능.
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return
    setIsLoadingMore(true)
    try {
      const response = await apiFetch(
        `/api/tarot/save?limit=${HISTORY_PAGE_SIZE}&offset=${nextOffset}`
      )
      if (response.ok) {
        const page = parseHistoryPage((await response.json()) as RawHistoryResponse)
        setReadings((prev) => {
          const seen = new Set(prev.map((r) => r.id))
          return [...prev, ...page.readings.filter((r) => !seen.has(r.id))]
        })
        setNextOffset((prev) => prev + page.readings.length)
        setHasMore(page.hasMore)
      }
    } catch {
      // 무시 — 사용자가 버튼으로 다시 시도 가능.
    } finally {
      setIsLoadingMore(false)
    }
  }, [isLoadingMore, hasMore, nextOffset])

  useEffect(() => {
    let cancelled = false
    setIsLoadingReadings(true)
    void loadReadings().finally(() => {
      if (!cancelled) setIsLoadingReadings(false)
    })
    return () => {
      cancelled = true
    }
  }, [loadReadings])

  useEffect(() => {
    if (!deleteNotice) return
    const id = window.setTimeout(() => setDeleteNotice(''), 2500)
    return () => window.clearTimeout(id)
  }, [deleteNotice])

  // 모달이 닫히거나 다른 리딩을 열 때 카드 펼침 상태 reset — 옛 리딩에서
  // 4번 카드를 펴놓고 새 리딩을 열면 4번 카드가 자동 펴진 채로 뜨는
  // 버그 방지.
  useEffect(() => {
    setExpandedCardIdx(null)
  }, [selectedReading?.id])

  const filteredReadings = useMemo(() => {
    let result = [...readings]
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (reading) =>
          reading.question.toLowerCase().includes(q) ||
          reading.cards.some(
            (card) => card.name.toLowerCase().includes(q) || card.nameKo?.toLowerCase().includes(q)
          )
      )
    }
    result.sort((a, b) =>
      sortBy === 'newest' ? b.timestamp - a.timestamp : a.timestamp - b.timestamp
    )
    return result
  }, [readings, searchQuery, sortBy])

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
        existing.count += 1
        if (card.isReversed) existing.reversedCount += 1
        freqMap.set(card.name, existing)
      })
    })
    return Array.from(freqMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }, [readings])

  const handleDelete = async (
    reading: SavedTarotReading,
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    event.stopPropagation()
    if (!window.confirm(isKo ? '이 리딩을 삭제하시겠습니까?' : 'Delete this reading?')) return

    if (reading.storageOrigin === 'server') {
      try {
        const response = await apiFetch(`/api/tarot/save/${reading.id}`, {
          method: 'DELETE',
        })
        if (response.ok) {
          setReadings((prev) => prev.filter((item) => item.id !== reading.id))
          // 서버 행이 하나 줄었으니 다음 페이지 offset 도 보정 — 안 하면 다음
          // "더 보기" 가 한 줄을 건너뛴다.
          setNextOffset((prev) => Math.max(0, prev - 1))
          setDeleteNotice(isKo ? '리딩을 삭제했습니다.' : 'Reading deleted.')
        } else {
          setDeleteNotice(
            isKo ? '삭제하지 못했어요. 잠시 후 다시 시도해 주세요.' : 'Delete failed.'
          )
        }
      } catch {
        setDeleteNotice(isKo ? '삭제하지 못했어요. 잠시 후 다시 시도해 주세요.' : 'Delete failed.')
      }
    } else {
      if (deleteReading(reading.id)) {
        setReadings(getSavedReadings())
        setDeleteNotice(isKo ? '리딩을 삭제했습니다.' : 'Reading deleted.')
      } else {
        setDeleteNotice(isKo ? '삭제하지 못했어요.' : 'Delete failed.')
      }
    }

    if (selectedReading?.id === reading.id) setSelectedReading(null)
  }

  const handleResumeReading = useCallback(
    (reading: SavedTarotReading) => {
      const restoreKey = storeReadingRestorePayload(reading)
      const params = new URLSearchParams()
      const question = (reading.question || '').trim()
      if (question) params.set('question', question)
      if (restoreKey) params.set('restoreKey', restoreKey)
      router.push(`/tarot/${reading.categoryId}/${reading.spreadId}?${params.toString()}`)
    },
    [router]
  )

  const hasFilters = Boolean(searchQuery.trim())

  return (
    <div
      className="min-h-screen text-slate-100 relative"
      style={{ background: 'var(--ds-dark-bg)' }}
    >
      {/* 공용 cosmic gradient backdrop — 메인/타로 entry 와 같은 톤. */}
      <CosmicBackdrop />
      {/* 글로벌 헤더 (☰ / EN) 와 안 겹치게 상단 여백 충분히.
          About/FAQ/Pricing 과 같은 max-w + padding 으로 통일. */}
      <div className="max-w-2xl mx-auto px-4 pt-20 pb-16 relative z-10">
        {/* 페이지 헤더 */}
        <header className="flex items-center gap-3 mb-8">
          <button
            type="button"
            onClick={() => router.push('/tarot')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm transition-colors"
            style={{
              background: 'var(--ds-dark-surface)',
              borderColor: 'var(--ds-dark-border)',
              color: 'var(--ds-dark-text-muted)',
            }}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{isKo ? '돌아가기' : 'Back'}</span>
          </button>
          <h1
            className="flex-1 text-xl md:text-2xl font-semibold"
            style={{
              color: 'var(--ds-dark-text)',
              fontFamily: 'var(--font-cinzel), Georgia, serif',
              letterSpacing: '-0.01em',
            }}
          >
            {isKo ? '타로 기록' : 'Tarot History'}
          </h1>
          <button
            type="button"
            onClick={() => setShowStats((prev) => !prev)}
            aria-expanded={showStats}
            aria-label={isKo ? '통계 보기 전환' : 'Toggle statistics'}
            className="p-2 rounded-xl border transition-colors"
            style={{
              background: showStats ? 'rgba(212, 181, 114, 0.15)' : 'var(--ds-dark-surface)',
              borderColor: showStats ? 'var(--ds-gold-line)' : 'var(--ds-dark-border)',
              color: showStats ? 'var(--ds-gold-on-dark-soft)' : 'var(--ds-dark-text-muted)',
            }}
          >
            <BarChart3 className="w-4 h-4" />
          </button>
        </header>

        {/* 삭제 알림 — gold 톤 통일 */}
        {deleteNotice && (
          <div
            role="status"
            aria-live="polite"
            className="mb-4 px-4 py-3 rounded-xl border text-sm"
            style={{
              background: 'rgba(212, 181, 114, 0.08)',
              borderColor: 'var(--ds-gold-line)',
              color: 'var(--ds-gold-on-dark-soft)',
            }}
          >
            {deleteNotice}
          </div>
        )}

        {/* 통계 패널 — glass surface + gold accent */}
        {showStats && (
          <section
            className="mb-6 rounded-2xl border p-5"
            style={{
              background: 'rgba(17, 24, 39, 0.42)',
              borderColor: 'var(--ds-dark-border)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
            }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4" style={{ color: 'var(--ds-gold-on-dark)' }} />
              <h3
                className="text-xs uppercase tracking-wider font-medium"
                style={{ color: 'var(--ds-gold-on-dark)' }}
              >
                {isKo ? '자주 나온 카드 TOP 10' : 'Most Frequent Cards TOP 10'}
              </h3>
            </div>
            {cardStats.length > 0 ? (
              <ul className="space-y-2">
                {cardStats.map((stat, idx) => (
                  <li
                    key={stat.name}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg border"
                    style={{
                      background: 'var(--ds-dark-surface)',
                      borderColor: 'var(--ds-dark-border)',
                    }}
                  >
                    <span
                      className="text-xs font-semibold w-6"
                      style={{ color: 'var(--ds-gold-on-dark)' }}
                    >
                      #{idx + 1}
                    </span>
                    <span className="flex-1 text-sm text-slate-200 truncate">
                      {isKo ? stat.nameKo || stat.name : stat.name}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--ds-dark-text-muted)' }}>
                      {stat.count}
                      {isKo ? '회' : 'x'}
                      {stat.reversedCount > 0 && (
                        <span className="ml-1.5 text-rose-300/80">
                          ({stat.reversedCount} {isKo ? '역방향' : 'rev'})
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm italic" style={{ color: 'var(--ds-dark-text-subtle)' }}>
                {isKo ? '아직 데이터가 없어요' : 'No data yet'}
              </p>
            )}
            <div
              className="mt-4 text-xs text-center"
              style={{ color: 'var(--ds-dark-text-subtle)' }}
            >
              {isKo ? `총 ${readings.length}개의 리딩` : `${readings.length} total readings`}
            </div>
          </section>
        )}

        {/* 컨트롤 — 검색 + 정렬 chip */}
        <div className="mb-5 space-y-3">
          <div className="relative">
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4"
              style={{ color: 'var(--ds-dark-text-subtle)' }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={isKo ? '질문 또는 카드 검색…' : 'Search questions or cards…'}
              className="w-full pl-10 pr-4 py-3 rounded-xl border text-sm text-slate-100 focus:outline-none transition-colors"
              style={{
                background: 'var(--ds-dark-surface)',
                borderColor: 'var(--ds-dark-border)',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--ds-gold-line)'
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--ds-dark-border)'
              }}
            />
          </div>
          <div className="flex gap-2">
            {(['newest', 'oldest'] as SortOption[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setSortBy(option)}
                className="px-3.5 py-1.5 rounded-full text-xs font-medium border transition-colors"
                style={{
                  background:
                    sortBy === option ? 'rgba(212, 181, 114, 0.18)' : 'var(--ds-dark-surface)',
                  borderColor: sortBy === option ? 'var(--ds-gold-line)' : 'var(--ds-dark-border)',
                  color:
                    sortBy === option ? 'var(--ds-gold-on-dark-soft)' : 'var(--ds-dark-text-muted)',
                }}
              >
                {option === 'newest' ? (isKo ? '최신순' : 'Newest') : isKo ? '오래된순' : 'Oldest'}
              </button>
            ))}
          </div>
        </div>

        {/* 리딩 리스트 */}
        <div className="space-y-3">
          {isLoadingReadings ? (
            <EmptyState
              title={isKo ? '기록을 불러오는 중…' : 'Loading readings…'}
              description={
                isKo ? '저장된 리딩을 확인하고 있어요.' : 'Fetching your saved readings.'
              }
            />
          ) : filteredReadings.length > 0 ? (
            filteredReadings.map((reading) => (
              <article
                key={reading.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedReading(reading)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    setSelectedReading(reading)
                  }
                }}
                className="group cursor-pointer rounded-2xl border p-5 focus:outline-none transition-colors"
                style={{
                  background: 'rgba(17, 24, 39, 0.42)',
                  borderColor: 'var(--ds-dark-border)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--ds-gold-line)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--ds-dark-border)'
                }}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs" style={{ color: 'var(--ds-dark-text-subtle)' }}>
                      {formatRelativeTime(reading.timestamp, isKo)}
                    </span>
                    {(() => {
                      const badge = getSourceBadge(reading.source, isKo)
                      if (!badge) return null
                      return (
                        <span
                          className="px-2 py-0.5 text-[10px] rounded-full border font-medium"
                          style={{
                            color: badge.color,
                            background: badge.bg,
                            borderColor: badge.border,
                          }}
                        >
                          {badge.label}
                        </span>
                      )
                    })()}
                  </div>
                  <button
                    type="button"
                    onClick={(event) => void handleDelete(reading, event)}
                    aria-label={isKo ? '삭제' : 'Delete'}
                    className="hover:text-rose-300 transition-colors"
                    style={{ color: 'var(--ds-dark-text-subtle)' }}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-base md:text-[17px] text-slate-100 font-medium leading-snug mb-3">
                  {reading.question}
                </p>
                <div
                  className="flex items-center gap-3 text-xs mb-3"
                  style={{ color: 'var(--ds-dark-text-muted)' }}
                >
                  <span style={{ color: 'var(--ds-gold-on-dark)' }}>
                    {isKo ? reading.spread.titleKo || reading.spread.title : reading.spread.title}
                  </span>
                  <span style={{ color: 'var(--ds-dark-text-subtle)' }}>·</span>
                  <span>
                    {isKo ? `카드 ${reading.cards.length}장` : `${reading.cards.length} cards`}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {reading.cards.slice(0, 5).map((card, idx) => (
                    <span
                      key={`${reading.id}-card-${idx}`}
                      className="px-2.5 py-0.5 text-[11px] rounded-full border"
                      style={
                        card.isReversed
                          ? {
                              background: 'rgba(244, 63, 94, 0.10)',
                              borderColor: 'rgba(244, 63, 94, 0.30)',
                              color: '#fecdd3',
                            }
                          : {
                              background: 'var(--ds-dark-surface-strong)',
                              borderColor: 'var(--ds-dark-border)',
                              color: 'var(--ds-dark-text-muted)',
                            }
                      }
                      title={isKo ? card.nameKo || card.name : card.name}
                    >
                      {(isKo ? card.nameKo || card.name : card.name).slice(0, 8)}
                      {card.isReversed && ' ↓'}
                    </span>
                  ))}
                  {reading.cards.length > 5 && (
                    <span
                      className="px-2.5 py-0.5 text-[11px] rounded-full border"
                      style={{
                        borderColor: 'var(--ds-dark-border)',
                        color: 'var(--ds-dark-text-subtle)',
                      }}
                    >
                      +{reading.cards.length - 5}
                    </span>
                  )}
                </div>
              </article>
            ))
          ) : (
            <EmptyState
              title={
                hasFilters
                  ? isKo
                    ? '검색 결과가 없어요'
                    : 'No results found'
                  : isKo
                    ? '저장된 리딩이 없어요'
                    : 'No saved readings yet'
              }
              description={
                hasFilters
                  ? isKo
                    ? '다른 키워드로 시도해보세요'
                    : 'Try different keywords'
                  : isKo
                    ? '첫 번째 타로 리딩을 시작해보세요'
                    : 'Start your first tarot reading'
              }
              action={
                hasFilters
                  ? undefined
                  : {
                      text: isKo ? '타로 시작하기' : 'Start a Reading',
                      onClick: () => router.push('/tarot'),
                    }
              }
            />
          )}

          {/* 더 보기 — 서버에 남은 리딩이 있을 때만. 페이지당 50 개씩 append. */}
          {hasMore && !isLoadingReadings && (
            <button
              type="button"
              onClick={loadMore}
              disabled={isLoadingMore}
              className="w-full rounded-2xl border p-4 text-sm font-medium transition-colors disabled:opacity-60"
              style={{
                background: 'rgba(17, 24, 39, 0.42)',
                borderColor: 'var(--ds-dark-border)',
                color: 'var(--ds-dark-text)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
              }}
            >
              {isLoadingMore
                ? isKo
                  ? '불러오는 중…'
                  : 'Loading…'
                : isKo
                  ? '더 보기'
                  : 'Load more'}
            </button>
          )}
        </div>
      </div>

      {/* 상세 모달 — navy 글래스 + gold 액센트 통일 */}
      {selectedReading && (
        <div
          className="fixed inset-0 z-50 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-6"
          style={{ background: 'rgba(7, 9, 26, 0.85)' }}
          onClick={() => setSelectedReading(null)}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="relative w-full md:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-3xl md:rounded-2xl border p-6"
            style={{
              background: 'rgba(17, 24, 39, 0.92)',
              borderColor: 'var(--ds-gold-line)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
            }}
          >
            <button
              type="button"
              onClick={() => setSelectedReading(null)}
              aria-label={isKo ? '닫기' : 'Close'}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-700 transition-colors"
              style={{
                background: 'var(--ds-dark-surface-strong)',
                color: 'var(--ds-dark-text)',
              }}
            >
              <X className="w-4 h-4" />
            </button>

            <div
              className="text-xs uppercase tracking-wider mb-1"
              style={{ color: 'var(--ds-gold-on-dark)' }}
            >
              {isKo
                ? selectedReading.spread.titleKo || selectedReading.spread.title
                : selectedReading.spread.title}
            </div>
            <h2
              className="text-xl md:text-2xl font-semibold text-slate-100 leading-snug mb-1"
              style={{
                fontFamily: 'var(--font-cinzel), Georgia, serif',
                letterSpacing: '-0.01em',
              }}
            >
              {selectedReading.question}
            </h2>
            <div className="flex items-center gap-2 mb-5 flex-wrap">
              <p className="text-xs" style={{ color: 'var(--ds-dark-text-subtle)' }}>
                {formatRelativeTime(selectedReading.timestamp, isKo)}
              </p>
              {(() => {
                const badge = getSourceBadge(selectedReading.source, isKo)
                if (!badge) return null
                return (
                  <span
                    className="px-2 py-0.5 text-[10px] rounded-full border font-medium"
                    style={{
                      color: badge.color,
                      background: badge.bg,
                      borderColor: badge.border,
                    }}
                  >
                    {badge.label}
                  </span>
                )
              })()}
            </div>

            {/* 카드 리스트 — 카드 그림 + 자리/이름/(역방향)/더보기로 펼치는
                카드별 해석 (사용자 피드백: "타로 그림도 안 보이고 더보기
                없어서 카드별 해석 못 봄"). */}
            <section className="mb-5">
              <h4
                className="text-xs uppercase tracking-wider mb-2"
                style={{ color: 'var(--ds-dark-text-subtle)' }}
              >
                {isKo ? '뽑은 카드' : 'Drawn Cards'}
              </h4>
              <ul className="space-y-2">
                {selectedReading.cards.map((card, idx) => {
                  const fullCard = findCardBySavedName(card, idx)
                  const expanded = expandedCardIdx === idx
                  const cardInterp = selectedReading.interpretation.cardInsights?.[idx]
                  const hasInterp = !!(cardInterp?.interpretation || '').trim()
                  return (
                    <li
                      key={`${selectedReading.id}-detail-${idx}`}
                      className="rounded-lg border overflow-hidden"
                      style={{
                        background: 'var(--ds-dark-surface)',
                        borderColor: 'var(--ds-dark-border)',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => hasInterp && setExpandedCardIdx(expanded ? null : idx)}
                        disabled={!hasInterp}
                        className={`w-full flex items-start gap-3 px-3 py-2 text-left ${
                          hasInterp ? 'hover:bg-white/5 cursor-pointer' : 'cursor-default'
                        }`}
                      >
                        {/* 카드 그림 (48x80 thumbnail) */}
                        <div
                          className={`relative w-12 h-20 shrink-0 rounded overflow-hidden ${
                            card.isReversed ? 'rotate-180' : ''
                          }`}
                          style={{ boxShadow: '0 0 0 1px var(--ds-dark-border)' }}
                        >
                          <Image
                            src={fullCard.image}
                            alt={fullCard.name}
                            fill
                            sizes="48px"
                            className="object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div
                            className="text-xs mb-0.5"
                            style={{ color: 'var(--ds-gold-on-dark)' }}
                          >
                            {isKo ? card.positionKo || card.position : card.position}
                          </div>
                          <div
                            className={`text-sm font-medium ${
                              card.isReversed ? 'text-rose-200' : 'text-slate-100'
                            }`}
                          >
                            {isKo ? card.nameKo || card.name : card.name}
                            {card.isReversed && (isKo ? ' (역방향)' : ' (Reversed)')}
                          </div>
                          {hasInterp && !expanded && (
                            <div
                              className="flex items-center gap-1 mt-1 text-[11px]"
                              style={{ color: 'var(--ds-gold-on-dark)' }}
                            >
                              <span>{isKo ? '더보기' : 'See more'}</span>
                              <ChevronDown className="w-3 h-3" />
                            </div>
                          )}
                          {hasInterp && expanded && (
                            <div
                              className="flex items-center gap-1 mt-1 text-[11px]"
                              style={{ color: 'var(--ds-gold-on-dark)' }}
                            >
                              <span>{isKo ? '접기' : 'Collapse'}</span>
                              <ChevronUp className="w-3 h-3" />
                            </div>
                          )}
                        </div>
                      </button>
                      {hasInterp && expanded && (
                        <div
                          className="px-3 pb-3 pt-2 text-sm text-slate-200 leading-relaxed whitespace-pre-wrap border-t ml-15"
                          style={{ borderColor: 'var(--ds-dark-border)' }}
                        >
                          {cardInterp?.interpretation}
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            </section>

            {/* 전체 해석 — glass + gold accent (보라 그라데이션 박멸) */}
            {selectedReading.interpretation.overallMessage && (
              <section
                className="mb-5 rounded-xl border p-4"
                style={{
                  background: 'rgba(212, 181, 114, 0.05)',
                  borderColor: 'var(--ds-gold-line)',
                }}
              >
                <h4
                  className="text-xs uppercase tracking-wider font-medium mb-2"
                  style={{ color: 'var(--ds-gold-on-dark-soft)' }}
                >
                  {isKo ? '해석' : 'Interpretation'}
                </h4>
                <p className="text-sm md:text-[15px] text-slate-100 leading-relaxed whitespace-pre-wrap">
                  {selectedReading.interpretation.overallMessage}
                </p>
                {selectedReading.interpretation.guidance && (
                  <div
                    className="mt-3 pt-3 border-t text-sm text-slate-200"
                    style={{ borderColor: 'rgba(212, 181, 114, 0.2)' }}
                  >
                    <strong style={{ color: 'var(--ds-gold-on-dark-soft)' }}>
                      {isKo ? '조언: ' : 'Guidance: '}
                    </strong>
                    {selectedReading.interpretation.guidance}
                  </div>
                )}
              </section>
            )}

            {/* 보충 카드 (클래리파이어) — gold 통일 (옛 purple 제거). */}
            {selectedReading.clarifierCard && (
              <section
                className="mb-5 rounded-xl border p-4"
                style={{
                  background: 'var(--ds-dark-surface)',
                  borderColor: 'var(--ds-dark-border)',
                }}
              >
                <h4
                  className="text-xs uppercase tracking-wider font-medium mb-2"
                  style={{ color: 'var(--ds-gold-on-dark)' }}
                >
                  {isKo ? '보충 카드' : 'Clarifier Card'}
                </h4>
                <div className="text-sm font-medium text-slate-100">
                  {isKo
                    ? selectedReading.clarifierCard.nameKo || selectedReading.clarifierCard.name
                    : selectedReading.clarifierCard.name}
                  {selectedReading.clarifierCard.isReversed && (isKo ? ' (역방향)' : ' (Reversed)')}
                </div>
              </section>
            )}

            {/* followup 채팅 — gold 통일 (옛 cyan/violet 제거). */}
            {selectedReading.followupTurns && selectedReading.followupTurns.length > 0 && (
              <section
                className="mb-5 rounded-xl border p-4"
                style={{
                  background: 'var(--ds-dark-surface)',
                  borderColor: 'var(--ds-dark-border)',
                }}
              >
                <h4
                  className="text-xs uppercase tracking-wider font-medium mb-3"
                  style={{ color: 'var(--ds-gold-on-dark)' }}
                >
                  {isKo ? '이어진 대화' : 'Follow-up Chat'}
                </h4>
                <div className="space-y-3">
                  {selectedReading.followupTurns.map((turn, idx) => (
                    <div
                      key={`${selectedReading.id}-turn-${idx}`}
                      className="text-sm leading-relaxed whitespace-pre-wrap pl-3 border-l-2"
                      style={{
                        borderColor:
                          turn.role === 'user'
                            ? 'var(--ds-gold-line)'
                            : 'var(--ds-dark-border-strong)',
                        color:
                          turn.role === 'user'
                            ? 'var(--ds-dark-text)'
                            : 'var(--ds-dark-text-muted)',
                      }}
                    >
                      <div
                        className="text-[10px] uppercase tracking-wider mb-1"
                        style={{ color: 'var(--ds-dark-text-subtle)' }}
                      >
                        {turn.role === 'user' ? (isKo ? '나' : 'You') : 'AI'}
                      </div>
                      {turn.content}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 액션 — gold 솔리드 (보라 그라데이션 박멸) */}
            <button
              type="button"
              onClick={() => handleResumeReading(selectedReading)}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-colors"
              style={{
                background: 'var(--ds-gold-on-dark)',
                color: 'var(--ds-dark-bg)',
                boxShadow: '0 0 24px rgba(212, 181, 114, 0.25)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--ds-gold-on-dark-soft)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--ds-gold-on-dark)'
              }}
            >
              <RotateCcw className="w-4 h-4" />
              {truncate(isKo ? '이 리딩 다시 열기' : 'Open this reading again', 40)}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
