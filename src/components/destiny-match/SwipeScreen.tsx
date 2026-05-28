'use client'

import * as React from 'react'
import { useI18n } from '@/i18n/I18nProvider'
import { logger } from '@/lib/logger'
import { pickDMCopy } from './destiny-match-i18n'
import type { DiscoverCard, DiscoverResponse, SwipeAction, SwipeResponse } from './types'
import { SwipeCard, CardActionButtons, type SwipeCardHandle } from './SwipeCard'
import { MatchModal } from './MatchModal'
import { ProfileGateCard } from './ProfileGateCard'
import { EmptyDeck } from './EmptyDeck'

// 한 batch 카드 수. 너무 작으면 자주 fetch (네트워크 spike), 너무 크면 첫 응답
// 늦음. 5 면 swipe 3 후 prefetch 가 자연스럽다.
const PAGE_SIZE = 5
// 남은 카드가 이 수 이하면 다음 batch prefetch.
const PREFETCH_THRESHOLD = 2

type Phase = 'loading' | 'profile_gate' | 'deck' | 'empty' | 'error'

interface MatchState {
  open: boolean
  otherName: string
  otherPhoto: string | null
  connectionId: string | null
}

export function SwipeScreen() {
  const { locale } = useI18n()
  const copy = React.useMemo(() => pickDMCopy(locale), [locale])

  const [phase, setPhase] = React.useState<Phase>('loading')
  const [deck, setDeck] = React.useState<DiscoverCard[]>([])
  const hasMoreRef = React.useRef(true)
  const offsetRef = React.useRef(0)
  const fetchingRef = React.useRef(false)
  const [swiping, setSwiping] = React.useState(false)
  const [matchState, setMatchState] = React.useState<MatchState>({
    open: false,
    otherName: '',
    otherPhoto: null,
    connectionId: null,
  })
  const [superToast, setSuperToast] = React.useState<string | null>(null)

  // top SwipeCard 의 imperative handle — 버튼 클릭으로 flyOut 호출.
  const topCardRef = React.useRef<SwipeCardHandle | null>(null)

  const fetchNextBatch = React.useCallback(async (opts: { initial?: boolean } = {}) => {
    if (fetchingRef.current) return
    if (!opts.initial && !hasMoreRef.current) return
    fetchingRef.current = true
    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(offsetRef.current),
      })
      const res = await fetch(`/api/destiny-match/discover?${params.toString()}`)
      if (!res.ok) {
        if (res.status === 400) {
          // 가장 흔한 케이스: 프로필 미설정.
          setPhase('profile_gate')
          return
        }
        throw new Error(`discover_status_${res.status}`)
      }
      const data = (await res.json()) as DiscoverResponse
      hasMoreRef.current = data.hasMore
      offsetRef.current += data.profiles.length
      setDeck((prev) => [...prev, ...data.profiles])
      if (opts.initial) {
        setPhase(data.profiles.length > 0 || data.hasMore ? 'deck' : 'empty')
      }
    } catch (err) {
      logger.warn('[destiny-match] discover failed', {
        err: err instanceof Error ? err.message : String(err),
      })
      if (opts.initial) {
        setPhase('error')
      }
      // prefetch 실패는 silent — 다음 swipe 에서 또 시도된다.
    } finally {
      fetchingRef.current = false
    }
  }, [])

  // 초기 phase 결정 — profile 확인 후 첫 batch fetch.
  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const profileRes = await fetch('/api/destiny-match/profile')
        if (!profileRes.ok) {
          if (profileRes.status === 401) {
            // 미인증 — 페이지 wrapper 가 가드. 여기 도달했다면 cookie 만료 등.
            if (!cancelled) setPhase('error')
            return
          }
          throw new Error(`profile_status_${profileRes.status}`)
        }
        const profileData = (await profileRes.json()) as {
          profile: unknown
          needsSetup: boolean
        }
        if (cancelled) return
        if (profileData.needsSetup || !profileData.profile) {
          setPhase('profile_gate')
          return
        }
        await fetchNextBatch({ initial: true })
      } catch (err) {
        logger.warn('[destiny-match] initial load failed', {
          err: err instanceof Error ? err.message : String(err),
        })
        if (!cancelled) setPhase('error')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [fetchNextBatch])

  // deck 에서 top 한 장 pop + 필요 시 prefetch.
  const popTop = React.useCallback(() => {
    setDeck((prev) => {
      const next = prev.slice(1)
      if (next.length === 0 && !hasMoreRef.current) {
        setPhase('empty')
      } else if (next.length <= PREFETCH_THRESHOLD && hasMoreRef.current) {
        void fetchNextBatch()
      }
      return next
    })
    // top 카드 unmount 되니 ref 도 null 로 재설정 — 다음 render 에서 새 top 이
    // ref callback 으로 자기를 등록.
    topCardRef.current = null
  }, [fetchNextBatch])

  // 실제 API 호출 + match modal — 카드 exit animation 종료 후 호출.
  const submitSwipe = React.useCallback(
    async (action: SwipeAction, target: DiscoverCard) => {
      try {
        const res = await fetch('/api/destiny-match/swipe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetProfileId: target.id,
            action,
            compatibilityScore: target.compatibilityScore,
          }),
        })
        if (!res.ok) {
          if (res.status === 400 && action === 'super_like') {
            // 슈퍼 라이크 일일 한도 소진.
            setSuperToast(copy.superLikeExhausted)
            window.setTimeout(() => setSuperToast(null), 2400)
          }
          if (res.status === 401) {
            setPhase('error')
          }
          return
        }
        const data = (await res.json()) as SwipeResponse
        if (data.isMatch) {
          setMatchState({
            open: true,
            otherName: target.displayName,
            otherPhoto: target.photos?.[0] ?? null,
            connectionId: data.connectionId,
          })
        }
      } catch (err) {
        logger.warn('[destiny-match] swipe failed', {
          err: err instanceof Error ? err.message : String(err),
        })
      }
    },
    [copy]
  )

  // 드래그로 결정난 경우 — 카드가 이미 화면 밖으로 날아간 상태이므로 즉시 pop +
  // API 호출.
  const handleDragDecide = React.useCallback(
    (action: 'like' | 'pass', target: DiscoverCard) => {
      if (swiping) return
      setSwiping(true)
      popTop()
      void submitSwipe(action, target).finally(() => setSwiping(false))
    },
    [swiping, popTop, submitSwipe]
  )

  // 버튼 클릭으로 trigger — top card 에 imperative flyOut → 끝나면 pop + API.
  const handleButton = React.useCallback(
    async (action: SwipeAction) => {
      if (swiping) return
      const target = deck[0]
      if (!target) return
      const handle = topCardRef.current
      setSwiping(true)
      try {
        if (handle) {
          const dir: 'left' | 'right' | 'up' =
            action === 'pass' ? 'left' : action === 'super_like' ? 'up' : 'right'
          await handle.flyOut(dir)
        }
        popTop()
        await submitSwipe(action, target)
      } finally {
        setSwiping(false)
      }
    },
    [swiping, deck, popTop, submitSwipe]
  )

  const top = deck[0]

  return (
    <main className="relative flex min-h-[100dvh] flex-col bg-gradient-to-br from-[#0f0a1e] via-[#1a1035] to-[#0d1b2a] text-white">
      <header className="flex items-center justify-between px-5 pt-5 pb-3">
        <h1 className="font-serif text-lg font-semibold tracking-wide text-white/95">
          {copy.pageTitle}
        </h1>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center px-4 pb-6">
        {phase === 'loading' && (
          <p className="text-sm text-white/70" role="status">
            {copy.loading}
          </p>
        )}

        {phase === 'profile_gate' && <ProfileGateCard copy={copy} />}

        {phase === 'empty' && <EmptyDeck copy={copy} />}

        {phase === 'error' && (
          <div className="text-center">
            <p className="text-base font-medium">{copy.errorTitle}</p>
            <button
              type="button"
              onClick={() => {
                setPhase('loading')
                offsetRef.current = 0
                hasMoreRef.current = true
                setDeck([])
                void fetchNextBatch({ initial: true })
              }}
              className="mt-4 rounded-full bg-white/10 px-5 py-2 text-sm font-medium hover:bg-white/15"
            >
              {copy.errorRetry}
            </button>
          </div>
        )}

        {phase === 'deck' && (
          <>
            <div className="relative h-[560px] w-full max-w-[400px]">
              {/* Render top + next 2 as a stack. 카드의 mount/unmount 자체가
                  드래그/버튼 결정 후 자연스럽게 새 top 등장 — AnimatePresence
                  없이도 imperative flyOut 으로 매끈한 swipe out 가능.
                  top card 에만 ref 부여해 버튼 클릭으로 imperative 제어. */}
              {deck.slice(0, 3).map((card, idx) => (
                <SwipeCard
                  key={card.id}
                  ref={idx === 0 ? topCardRef : undefined}
                  card={card}
                  copy={copy}
                  isTop={idx === 0}
                  depth={idx}
                  onDecide={(action) => handleDragDecide(action, card)}
                />
              ))}
            </div>

            <CardActionButtons
              copy={copy}
              disabled={swiping || !top}
              onPass={() => void handleButton('pass')}
              onSuperLike={() => void handleButton('super_like')}
              onLike={() => void handleButton('like')}
            />
          </>
        )}
      </div>

      {/* Super-like 한도 소진 toast — fixed, auto-dismiss */}
      {superToast && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed inset-x-0 bottom-24 mx-auto w-fit max-w-[90%] rounded-full bg-sky-500/95 px-5 py-2.5 text-sm font-medium text-white shadow-xl"
        >
          {superToast}
        </div>
      )}

      <MatchModal
        copy={copy}
        open={matchState.open}
        otherName={matchState.otherName}
        otherPhoto={matchState.otherPhoto}
        connectionId={matchState.connectionId}
        onClose={() =>
          setMatchState((s) => ({
            ...s,
            open: false,
          }))
        }
      />
    </main>
  )
}
