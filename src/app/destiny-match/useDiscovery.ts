import { useState, useRef, useEffect, useCallback } from 'react'
import type { Session } from 'next-auth'
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import { logger } from '@/lib/logger'
import type { UserProfile, ViewMode, Filters } from './types'
import { convertToUserProfile } from './convertProfile'

export interface UseDiscoveryParams {
  session: Session | null
  status: 'loading' | 'authenticated' | 'unauthenticated'
  router: AppRouterInstance
  signInUrl: string
}

export interface UseDiscoveryReturn {
  // View state
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void

  // Profile state
  profiles: UserProfile[]
  currentIndex: number
  likedProfiles: string[]
  selectedProfile: UserProfile | null
  setSelectedProfile: (profile: UserProfile | null) => void

  // Filter state
  showFilters: boolean
  setShowFilters: (show: boolean) => void
  filters: Filters
  setFilters: (filters: Filters) => void

  // Loading/error state
  isLoading: boolean
  error: string | null
  needsSetup: boolean
  hasMore: boolean

  // Drag state
  cardRef: React.RefObject<HTMLDivElement | null>
  dragOffset: { x: number; y: number }
  isDragging: boolean

  // Computed
  currentProfile: UserProfile | undefined
  hasMoreProfiles: boolean
  rotation: number
  opacity: number

  // Undo
  canUndo: boolean
  handleUndo: () => Promise<void>

  // Match celebration (oracle modal on match success)
  matchCelebration: { partner: UserProfile; connectionId: string } | null
  dismissMatchCelebration: () => void

  // Callbacks
  loadProfiles: () => Promise<void>
  handleDragStart: (clientX: number, clientY: number) => void
  handleDragMove: (clientX: number, clientY: number) => void
  handleDragEnd: () => void
  handleLike: () => Promise<void>
  handlePass: () => Promise<void>
  handleSuperLike: () => Promise<void>
}

export function useDiscovery({
  session,
  status,
  router,
  signInUrl,
}: UseDiscoveryParams): UseDiscoveryReturn {
  const [viewMode, setViewMode] = useState<ViewMode>('swipe')
  const [profiles, setProfiles] = useState<UserProfile[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [likedProfiles, setLikedProfiles] = useState<string[]>([])
  const [_passedProfiles, setPassedProfiles] = useState<string[]>([])
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<Filters>({
    zodiacSign: 'all',
    sajuElement: 'all',
    minAge: 18,
    maxAge: 99,
    maxDistance: 50,
  })

  // 로딩/에러 상태
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [needsSetup, setNeedsSetup] = useState(false)
  const [hasMore, setHasMore] = useState(true)

  // Undo 상태
  const [lastSwipeId, setLastSwipeId] = useState<string | null>(null)
  const [lastSwipeTime, setLastSwipeTime] = useState<number>(0)
  const canUndo = !!lastSwipeId && Date.now() - lastSwipeTime < 5 * 60 * 1000

  // 매치 셀러브레이션 (오라클 모달)
  const [matchCelebration, setMatchCelebration] = useState<
    { partner: UserProfile; connectionId: string } | null
  >(null)
  const dismissMatchCelebration = useCallback(() => setMatchCelebration(null), [])

  const cardRef = useRef<HTMLDivElement>(null)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)

  const currentProfile = profiles[currentIndex]
  const hasMoreProfiles = currentIndex < profiles.length

  // 프로필 로딩 함수
  const loadProfiles = useCallback(async () => {
    if (!session?.user) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      params.set('limit', '20')
      if (filters.zodiacSign !== 'all') {
        params.set('zodiac', filters.zodiacSign)
      }
      if (filters.sajuElement !== 'all') {
        params.set('element', filters.sajuElement)
      }
      if (filters.minAge !== 18) {
        params.set('ageMin', String(filters.minAge))
      }
      if (filters.maxAge !== 99) {
        params.set('ageMax', String(filters.maxAge))
      }

      const res = await fetch(`/api/destiny-match/discover?${params.toString()}`)
      const data = await res.json()

      if (!res.ok) {
        if (res.status === 400 && typeof data.error === 'string' && data.error.includes('프로필')) {
          setNeedsSetup(true)
          return
        }
        const errorMsg =
          typeof data.error === 'string' ? data.error : '프로필을 불러오는데 실패했습니다'
        throw new Error(errorMsg)
      }

      const convertedProfiles = (data.profiles || []).map(convertToUserProfile)
      setProfiles(convertedProfiles)
      setHasMore(data.hasMore)
      setCurrentIndex(0)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : typeof err === 'string' ? err : '오류가 발생했습니다'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [session?.user, filters.zodiacSign, filters.sajuElement, filters.minAge, filters.maxAge])

  // 세션 변경 시 프로필 로딩
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      loadProfiles()
    }
  }, [status, session?.user, loadProfiles])

  // 스와이프 API 호출
  const handleSwipeApi = useCallback(
    async (
      partner: UserProfile,
      action: 'like' | 'pass' | 'super_like',
      compatibilityScore?: number
    ) => {
      try {
        const res = await fetch('/api/destiny-match/swipe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetProfileId: partner.id,
            action,
            compatibilityScore,
          }),
        })

        const data = await res.json()

        if (!res.ok) {
          logger.error('Swipe failed:', data.error)
          return null
        }

        // Undo를 위해 swipeId 저장 (매칭되지 않은 경우만)
        if (!data.isMatch && data.swipeId) {
          setLastSwipeId(data.swipeId)
          setLastSwipeTime(Date.now())
        } else {
          setLastSwipeId(null)
        }

        // 매치 성사 시 셀러브레이션 모달 (오라클 포함) 띄우기
        if (data.isMatch && data.connectionId) {
          setMatchCelebration({ partner, connectionId: data.connectionId })
        }

        return data
      } catch (err) {
        logger.error('Swipe error:', err)
        return null
      }
    },
    []
  )

  // Undo 처리
  const handleUndo = useCallback(async () => {
    if (!lastSwipeId || !canUndo) return

    try {
      const res = await fetch('/api/destiny-match/swipe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ swipeId: lastSwipeId }),
      })

      if (!res.ok) {
        const data = await res.json()
        logger.error('Undo failed:', data.error)
        return
      }

      // 이전 프로필로 되돌리기
      setCurrentIndex((prev) => Math.max(0, prev - 1))
      setLikedProfiles((prev) => prev.slice(0, -1))
      setPassedProfiles((prev) => prev.slice(0, -1))
      setLastSwipeId(null)
    } catch (err) {
      logger.error('Undo error:', err)
    }
  }, [lastSwipeId, canUndo])

  // Swipe handlers
  const handleDragStart = (clientX: number, clientY: number) => {
    if (!session) {
      router.push(signInUrl)
      return
    }
    setIsDragging(true)
    setDragStart({ x: clientX, y: clientY })
  }

  const handleDragMove = (clientX: number, clientY: number) => {
    if (!isDragging) {
      return
    }
    const offsetX = clientX - dragStart.x
    const offsetY = clientY - dragStart.y
    setDragOffset({ x: offsetX, y: offsetY })
  }

  const handleDragEnd = () => {
    if (!isDragging) {
      return
    }
    setIsDragging(false)

    const threshold = 100
    if (Math.abs(dragOffset.x) > threshold) {
      if (dragOffset.x > 0) {
        handleLike()
      } else {
        handlePass()
      }
    }
    setDragOffset({ x: 0, y: 0 })
  }

  const handleLike = useCallback(async () => {
    if (!session) {
      router.push(signInUrl)
      return
    }
    if (currentProfile) {
      // API 호출
      await handleSwipeApi(currentProfile, 'like', currentProfile.compatibility)
      setLikedProfiles((prev) => [...prev, currentProfile.id])
      setCurrentIndex((prev) => prev + 1)
    }
  }, [session, router, signInUrl, currentProfile, handleSwipeApi])

  const handlePass = useCallback(async () => {
    if (!session) {
      router.push(signInUrl)
      return
    }
    if (currentProfile) {
      // API 호출
      await handleSwipeApi(currentProfile, 'pass')
      setPassedProfiles((prev) => [...prev, currentProfile.id])
      setCurrentIndex((prev) => prev + 1)
    }
  }, [session, router, signInUrl, currentProfile, handleSwipeApi])

  const handleSuperLike = useCallback(async () => {
    if (!session) {
      router.push(signInUrl)
      return
    }
    if (currentProfile) {
      // API 호출
      await handleSwipeApi(currentProfile, 'super_like', currentProfile.compatibility)
      setLikedProfiles((prev) => [...prev, currentProfile.id])
      setCurrentIndex((prev) => prev + 1)
    }
  }, [session, router, signInUrl, currentProfile, handleSwipeApi])

  const rotation = dragOffset.x * 0.1
  const opacity = 1 - Math.abs(dragOffset.x) / 300

  // Keyboard shortcuts
  useEffect(() => {
    if (viewMode !== 'swipe' || !currentProfile || selectedProfile) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          handlePass()
          break
        case 'ArrowRight':
          e.preventDefault()
          handleLike()
          break
        case 'ArrowUp':
          e.preventDefault()
          handleSuperLike()
          break
        case 'z':
        case 'Z':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            if (canUndo) handleUndo()
          }
          break
        case 'i':
        case 'I':
          e.preventDefault()
          if (currentProfile) setSelectedProfile(currentProfile)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    viewMode,
    currentProfile,
    selectedProfile,
    canUndo,
    handlePass,
    handleLike,
    handleSuperLike,
    handleUndo,
  ])

  return {
    viewMode,
    setViewMode,
    profiles,
    currentIndex,
    likedProfiles,
    selectedProfile,
    setSelectedProfile,
    showFilters,
    setShowFilters,
    filters,
    setFilters,
    isLoading,
    error,
    needsSetup,
    hasMore,
    cardRef,
    dragOffset,
    isDragging,
    currentProfile,
    hasMoreProfiles,
    rotation,
    opacity,
    canUndo,
    handleUndo,
    matchCelebration,
    dismissMatchCelebration,
    loadProfiles,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    handleLike,
    handlePass,
    handleSuperLike,
  }
}
