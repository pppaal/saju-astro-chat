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
      <div className="p-4 bg-indigo-500/10 rounded-full border border-indigo-500/20 shadow-[0_0_32px_rgba(99,102,241,0.18)]">
        <MoonStar className="w-8 h-8 text-indigo-300" />
      </div>
      <h2 className="text-lg font-semibold text-slate-100 mt-2">{title}</h2>
      <p className="text-sm text-slate-400 max-w-xs">{description}</p>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-3 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-sm font-medium hover:from-indigo-400 hover:to-violet-400 transition-colors shadow-[0_0_20px_rgba(99,102,241,0.3)]"
        >
          {action.text}
        </button>
      )}
    </div>
  )
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

  const loadReadings = useCallback(async () => {
    try {
      const response = await fetch('/api/tarot/save?limit=100', {
        credentials: 'same-origin',
      })
      if (response.ok) {
        // 로그인 사용자임을 확인 — 게스트 시절 localStorage 에 쌓인 리딩이 있으면 서버로 1회 이전.
        // flag 로 한 번만 실행되고, 실패 시 다음 방문에 재시도하지 않으려고 flag 안 박음.
        const migration = await migrateLocalReadingsToServer()
        const raw = (await (migration.migrated > 0
          ? fetch('/api/tarot/save?limit=100', { credentials: 'same-origin' }).then((r) => r.json())
          : response.json())) as {
          readings?: Array<Parameters<typeof mapServerReadingToSavedReading>[0]>
          data?: { readings?: Array<Parameters<typeof mapServerReadingToSavedReading>[0]> }
        }
        // The API wraps payloads as { success, data: { readings } }. Read the
        // nested path (tolerate a flat shape too) — reading top-level `readings`
        // returned undefined, so saved readings never showed for logged-in users.
        const list = raw.data?.readings ?? raw.readings
        const serverReadings = Array.isArray(list)
          ? list.map((reading) => mapServerReadingToSavedReading(reading))
          : []
        setReadings(serverReadings)
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
  }, [isKo])

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
        const response = await fetch(`/api/tarot/save/${reading.id}`, {
          method: 'DELETE',
          credentials: 'same-origin',
        })
        if (response.ok) {
          setReadings((prev) => prev.filter((item) => item.id !== reading.id))
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
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* 글로벌 헤더 (☰ / EN) 와 안 겹치게 상단 여백 충분히. */}
      <div className="max-w-2xl mx-auto px-4 pt-20 pb-16">
        {/* 페이지 헤더 */}
        <header className="flex items-center gap-3 mb-6">
          <button
            type="button"
            onClick={() => router.push('/tarot')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/40 text-slate-300 text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{isKo ? '돌아가기' : 'Back'}</span>
          </button>
          <h1 className="flex-1 text-lg md:text-xl font-semibold text-slate-100">
            {isKo ? '타로 리딩 기록' : 'Tarot Reading History'}
          </h1>
          <button
            type="button"
            onClick={() => setShowStats((prev) => !prev)}
            aria-expanded={showStats}
            aria-label={isKo ? '통계 보기 전환' : 'Toggle statistics'}
            className={`p-2 rounded-xl border transition-colors ${
              showStats
                ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-200'
                : 'bg-slate-900/60 border-slate-800 hover:border-indigo-500/40 text-slate-400'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
          </button>
        </header>

        {/* 삭제 알림 */}
        {deleteNotice && (
          <div
            role="status"
            aria-live="polite"
            className="mb-4 px-4 py-3 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-sm text-indigo-100"
          >
            {deleteNotice}
          </div>
        )}

        {/* 통계 패널 */}
        {showStats && (
          <section className="mb-6 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-violet-500/5 border border-indigo-500/20 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-indigo-300" />
              <h3 className="text-xs uppercase tracking-wider text-indigo-300 font-medium">
                {isKo ? '자주 나온 카드 TOP 10' : 'Most Frequent Cards TOP 10'}
              </h3>
            </div>
            {cardStats.length > 0 ? (
              <ul className="space-y-2">
                {cardStats.map((stat, idx) => (
                  <li
                    key={stat.name}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-900/40 border border-slate-800"
                  >
                    <span className="text-xs font-semibold text-indigo-300 w-6">#{idx + 1}</span>
                    <span className="flex-1 text-sm text-slate-200 truncate">
                      {isKo ? stat.nameKo || stat.name : stat.name}
                    </span>
                    <span className="text-xs text-slate-400">
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
              <p className="text-sm text-slate-500 italic">
                {isKo ? '아직 데이터가 없어요' : 'No data yet'}
              </p>
            )}
            <div className="mt-4 text-xs text-slate-500 text-center">
              {isKo ? `총 ${readings.length}개의 리딩` : `${readings.length} total readings`}
            </div>
          </section>
        )}

        {/* 컨트롤 — 검색 + 정렬 chip */}
        <div className="mb-5 space-y-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={isKo ? '질문 또는 카드 검색…' : 'Search questions or cards…'}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900/60 border border-slate-800 focus:border-indigo-500/50 focus:outline-none text-slate-100 text-sm placeholder-slate-500 transition-colors"
            />
          </div>
          <div className="flex gap-2">
            {(['newest', 'oldest'] as SortOption[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setSortBy(option)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  sortBy === option
                    ? 'bg-indigo-500/25 border-indigo-500/50 text-indigo-100'
                    : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
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
                className="group cursor-pointer rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-indigo-500/40 transition-colors p-5 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <span className="text-xs text-slate-500">
                    {formatRelativeTime(reading.timestamp, isKo)}
                  </span>
                  <button
                    type="button"
                    onClick={(event) => void handleDelete(reading, event)}
                    aria-label={isKo ? '삭제' : 'Delete'}
                    className="text-slate-500 hover:text-rose-300 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-base md:text-[17px] text-slate-100 font-medium leading-snug mb-3">
                  {reading.question}
                </p>
                <div className="flex items-center gap-3 text-xs text-slate-400 mb-3">
                  <span className="text-indigo-300/80">
                    {isKo ? reading.spread.titleKo || reading.spread.title : reading.spread.title}
                  </span>
                  <span className="text-slate-600">·</span>
                  <span>
                    {isKo ? `카드 ${reading.cards.length}장` : `${reading.cards.length} cards`}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {reading.cards.slice(0, 5).map((card, idx) => (
                    <span
                      key={`${reading.id}-card-${idx}`}
                      className={`px-2.5 py-0.5 text-[11px] rounded-full border ${
                        card.isReversed
                          ? 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                          : 'bg-slate-800 border-slate-700 text-slate-300'
                      }`}
                      title={isKo ? card.nameKo || card.name : card.name}
                    >
                      {(isKo ? card.nameKo || card.name : card.name).slice(0, 8)}
                      {card.isReversed && ' ↓'}
                    </span>
                  ))}
                  {reading.cards.length > 5 && (
                    <span className="px-2.5 py-0.5 text-[11px] rounded-full border border-slate-800 text-slate-500">
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
        </div>
      </div>

      {/* 상세 모달 */}
      {selectedReading && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-6"
          onClick={() => setSelectedReading(null)}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="relative w-full md:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-3xl md:rounded-2xl bg-slate-900 border border-indigo-500/20 shadow-[0_0_60px_rgba(99,102,241,0.18)] p-6"
          >
            <button
              type="button"
              onClick={() => setSelectedReading(null)}
              aria-label={isKo ? '닫기' : 'Close'}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-xs uppercase tracking-wider text-indigo-300/80 mb-1">
              {isKo
                ? selectedReading.spread.titleKo || selectedReading.spread.title
                : selectedReading.spread.title}
            </div>
            <h2 className="text-xl md:text-2xl font-semibold text-slate-100 leading-snug mb-1">
              {selectedReading.question}
            </h2>
            <p className="text-xs text-slate-500 mb-5">
              {formatRelativeTime(selectedReading.timestamp, isKo)}
            </p>

            {/* 카드 리스트 — 카드 그림 + 자리/이름/(역방향)/더보기로 펼치는
                카드별 해석 (사용자 피드백: "타로 그림도 안 보이고 더보기
                없어서 카드별 해석 못 봄"). */}
            <section className="mb-5">
              <h4 className="text-xs uppercase tracking-wider text-slate-500 mb-2">
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
                      className="rounded-lg bg-slate-800/60 border border-slate-700/60 overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() => hasInterp && setExpandedCardIdx(expanded ? null : idx)}
                        disabled={!hasInterp}
                        className={`w-full flex items-start gap-3 px-3 py-2 text-left ${
                          hasInterp ? 'hover:bg-slate-800/80 cursor-pointer' : 'cursor-default'
                        }`}
                      >
                        {/* 카드 그림 (48x80 thumbnail) */}
                        <div
                          className={`relative w-12 h-20 shrink-0 rounded overflow-hidden ring-1 ring-slate-700/60 ${
                            card.isReversed ? 'rotate-180' : ''
                          }`}
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
                          <div className="text-xs text-indigo-300/80 mb-0.5">
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
                            <div className="flex items-center gap-1 mt-1 text-[11px] text-indigo-300/70">
                              <span>{isKo ? '더보기' : 'See more'}</span>
                              <ChevronDown className="w-3 h-3" />
                            </div>
                          )}
                          {hasInterp && expanded && (
                            <div className="flex items-center gap-1 mt-1 text-[11px] text-indigo-300/70">
                              <span>{isKo ? '접기' : 'Collapse'}</span>
                              <ChevronUp className="w-3 h-3" />
                            </div>
                          )}
                        </div>
                      </button>
                      {hasInterp && expanded && (
                        <div className="px-3 pb-3 pt-1 text-sm text-slate-200 leading-relaxed whitespace-pre-wrap border-t border-slate-700/40 ml-15">
                          {cardInterp?.interpretation}
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            </section>

            {/* 전체 해석 */}
            {selectedReading.interpretation.overallMessage && (
              <section className="mb-5 rounded-xl bg-gradient-to-br from-indigo-500/10 to-violet-500/5 border border-indigo-500/30 p-4">
                <h4 className="text-xs uppercase tracking-wider text-indigo-300 font-medium mb-2">
                  {isKo ? '해석' : 'Interpretation'}
                </h4>
                <p className="text-sm md:text-[15px] text-slate-100 leading-relaxed whitespace-pre-wrap">
                  {selectedReading.interpretation.overallMessage}
                </p>
                {selectedReading.interpretation.guidance && (
                  <div className="mt-3 pt-3 border-t border-indigo-500/20 text-sm text-slate-200">
                    <strong className="text-indigo-200">{isKo ? '조언: ' : 'Guidance: '}</strong>
                    {selectedReading.interpretation.guidance}
                  </div>
                )}
              </section>
            )}

            {/* 액션 */}
            <button
              type="button"
              onClick={() => handleResumeReading(selectedReading)}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-400 hover:to-violet-400 text-white text-sm font-medium transition-colors shadow-[0_0_20px_rgba(99,102,241,0.3)]"
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
